'use client';

import { audioEngine } from './audioEngine';
import type { MidiNote } from './types';

interface ConversionProgress {
    stage: string;
    progress: number;
}

interface ConversionResult {
    notes: MidiNote[];
    tempo?: number;
    key?: string;
}

type ConversionMode = 'melody' | 'harmony' | 'drums';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Shared Memory Constants
const INDEX_STATE = 0;
const INDEX_SAMPLE_RATE = 1;
const INDEX_LENGTH = 2;
const INDEX_MODE = 3;

const STATE_IDLE = 0;
const STATE_PROCESS = 1;

class AudioToMidiConverter {
    private worker: Worker | null = null;
    private sharedControlBuffer: SharedArrayBuffer | null = null;
    private sharedAudioBuffer: SharedArrayBuffer | null = null;
    private sharedControl: Int32Array | null = null;
    private sharedAudio: Float32Array | null = null;
    private isInitialized = false;

    async initialize() {
        if (this.isInitialized) return;

        await audioEngine.initialize();

        // Initialize Worker
        if (typeof window !== 'undefined') {
            this.worker = new Worker(new URL('./worker/audioAnalysis.worker.ts', import.meta.url));

            // Allocate initial buffers (start with 10MB audio buffer ~ 1 min stereo / 2 min mono)
            // We will resize if needed
            this.allocateBuffers(1024 * 1024 * 10);
        }

        this.isInitialized = true;
    }

    private allocateBuffers(sizeInFloats: number) {
        // Control Buffer: Fixed small size
        if (!this.sharedControlBuffer) {
            this.sharedControlBuffer = new SharedArrayBuffer(1024); // 256 Int32s
            this.sharedControl = new Int32Array(this.sharedControlBuffer);
        }

        // Audio Buffer
        this.sharedAudioBuffer = new SharedArrayBuffer(sizeInFloats * 4);
        this.sharedAudio = new Float32Array(this.sharedAudioBuffer);

        // Send to worker
        this.worker?.postMessage({
            type: 'init',
            controlBuffer: this.sharedControlBuffer,
            audioBuffer: this.sharedAudioBuffer
        });
    }

    private getContext(): AudioContext {
        return audioEngine.getContext();
    }

    async convert(
        audioFile: File | Blob | AudioBuffer,
        mode: ConversionMode = 'melody',
        onProgress?: (progress: ConversionProgress) => void
    ): Promise<ConversionResult> {
        await this.initialize();

        onProgress?.({ stage: 'Loading audio...', progress: 0 });

        let audioBuffer: AudioBuffer;
        if (audioFile instanceof AudioBuffer) {
            audioBuffer = audioFile;
        } else {
            const arrayBuffer = await audioFile.arrayBuffer();
            audioBuffer = await this.getContext().decodeAudioData(arrayBuffer);
        }

        const channelData = audioBuffer.getChannelData(0); // Use first channel

        // Check buffer size
        if (!this.sharedAudio || this.sharedAudio.length < channelData.length) {
            // Reallocate with 20% headroom
            this.allocateBuffers(Math.ceil(channelData.length * 1.2));
        }

        if (!this.sharedAudio || !this.sharedControl) {
            throw new Error('Failed to allocate shared memory');
        }

        onProgress?.({ stage: 'Transferring data...', progress: 10 });

        // Zero-copy attempt? No, we have to copy into SAB.
        this.sharedAudio.set(channelData);

        // Set Control Data
        this.sharedControl[INDEX_SAMPLE_RATE] = audioBuffer.sampleRate;
        this.sharedControl[INDEX_LENGTH] = channelData.length;
        this.sharedControl[INDEX_MODE] = mode === 'drums' ? 2 : (mode === 'harmony' ? 1 : 0);

        return new Promise((resolve, reject) => {
            if (!this.worker) return reject('Worker not initialized');

            const handler = (e: MessageEvent) => {
                const { type, result, progress, stage, error } = e.data;

                if (type === 'progress') {
                    onProgress?.({ stage, progress });
                } else if (type === 'complete') {
                    this.worker?.removeEventListener('message', handler);

                    onProgress?.({ stage: 'Processing results...', progress: 90 });

                    try {
                        let notes: MidiNote[] = [];
                        if (result.type === 'melody') {
                            notes = this.groupPitchesToNotes(result.data);
                        } else if (result.type === 'harmony') {
                            notes = this.groupChordsToNotes(result.data);
                        } else if (result.type === 'drums') {
                            notes = this.processDrumTransients(result.data);
                        }

                        onProgress?.({ stage: 'Complete', progress: 100 });
                        resolve({ notes });
                    } catch (err) {
                        reject(err);
                    }
                } else if (type === 'error') {
                    this.worker?.removeEventListener('message', handler);
                    reject(error);
                }
            };

            this.worker.addEventListener('message', handler);

            // Signal Worker to Start
            // First ensure state is IDLE (should be)
            // Then set to PROCESS
            Atomics.store(this.sharedControl!, INDEX_STATE, STATE_PROCESS);
            Atomics.notify(this.sharedControl!, INDEX_STATE);
        });
    }

    // --- Post-Processing Logic (Main Thread) ---

    private groupPitchesToNotes(
        pitchResults: Array<{ time: number; pitch: number; confidence: number }>
    ): MidiNote[] {
        if (pitchResults.length === 0) return [];

        const notes: MidiNote[] = [];
        let currentNote: { pitch: number; startTime: number; endTime: number } | null = null;
        const minNoteDuration = 0.05; // 50ms minimum

        for (const result of pitchResults) {
            if (!currentNote) {
                currentNote = { pitch: result.pitch, startTime: result.time, endTime: result.time };
            } else if (Math.abs(result.pitch - currentNote.pitch) <= 1) {
                currentNote.endTime = result.time;
            } else {
                const duration = currentNote.endTime - currentNote.startTime;
                if (duration >= minNoteDuration) {
                    notes.push({
                        id: `note-${notes.length}`,
                        pitch: currentNote.pitch,
                        start: currentNote.startTime * 4,
                        duration: Math.max(0.25, duration * 4),
                        velocity: 0.8
                    });
                }
                currentNote = { pitch: result.pitch, startTime: result.time, endTime: result.time };
            }
        }

        if (currentNote) {
            const duration = currentNote.endTime - currentNote.startTime;
            if (duration >= minNoteDuration) {
                notes.push({
                    id: `note-${notes.length}`,
                    pitch: currentNote.pitch,
                    start: currentNote.startTime * 4,
                    duration: Math.max(0.25, duration * 4),
                    velocity: 0.8
                });
            }
        }

        return notes;
    }

    private groupChordsToNotes(
        chordResults: Array<{ time: number; pitches: number[] }>
    ): MidiNote[] {
        if (chordResults.length === 0) return [];

        const notes: MidiNote[] = [];
        let currentChord: { pitches: number[]; startTime: number; endTime: number } | null = null;

        for (const result of chordResults) {
            const pitchesKey = result.pitches.sort().join(',');
            const currentKey = currentChord?.pitches.sort().join(',');

            if (!currentChord || pitchesKey !== currentKey) {
                if (currentChord) {
                    const duration = currentChord.endTime - currentChord.startTime;
                    for (const pitch of currentChord.pitches) {
                        notes.push({
                            id: `chord-${notes.length}`,
                            pitch,
                            start: currentChord.startTime * 4,
                            duration: Math.max(0.5, duration * 4),
                            velocity: 0.75
                        });
                    }
                }
                currentChord = { pitches: result.pitches, startTime: result.time, endTime: result.time };
            } else {
                currentChord.endTime = result.time;
            }
        }

        if (currentChord) {
            const duration = currentChord.endTime - currentChord.startTime;
            for (const pitch of currentChord.pitches) {
                notes.push({
                    id: `chord-${notes.length}`,
                    pitch,
                    start: currentChord.startTime * 4,
                    duration: Math.max(0.5, duration * 4),
                    velocity: 0.75
                });
            }
        }

        return notes;
    }

    private processDrumTransients(
        transients: Array<{ time: number; velocity: number; type: 'kick' | 'snare' | 'hat' }>
    ): MidiNote[] {
        const drumMap = { kick: 36, snare: 38, hat: 42 };
        return transients.map((t, i) => ({
            id: `drum-${i}`,
            pitch: drumMap[t.type],
            start: t.time * 4,
            duration: 0.25,
            velocity: t.velocity
        }));
    }

    getNoteName(midiNote: number): string {
        const octave = Math.floor(midiNote / 12) - 1;
        const note = NOTE_NAMES[midiNote % 12];
        return `${note}${octave}`;
    }
}

export const audioToMidiConverter = new AudioToMidiConverter();
export type { ConversionMode, ConversionProgress, ConversionResult };
