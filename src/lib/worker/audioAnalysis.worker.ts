import { detectPitchAutocorrelation, detectMultiplePitches } from '../dsp/analysis';
import { analyzeTransientFrame } from '../dsp/transients';

// Shared Memory Constants
const INDEX_STATE = 0;
const INDEX_SAMPLE_RATE = 1;
const INDEX_LENGTH = 2;
const INDEX_MODE = 3; // 0=Melody, 1=Harmony, 2=Drums

const STATE_IDLE = 0;
const STATE_PROCESS = 1;

let sharedControl: Int32Array | null = null;
let sharedAudio: Float32Array | null = null;

self.onmessage = (e: MessageEvent) => {
    const { type, controlBuffer, audioBuffer } = e.data;

    if (type === 'init') {
        sharedControl = new Int32Array(controlBuffer);
        sharedAudio = new Float32Array(audioBuffer);

        // Start the processing loop
        processLoop();
    }
};

function processLoop() {
    if (!sharedControl || !sharedAudio) return;

    // Notify main thread we are ready (optional, but good for debugging)
    // self.postMessage({ type: 'ready' });

    while (true) {
        // Wait for the state to change from IDLE.
        // This blocks the thread efficiently until the main thread notifies.
        Atomics.wait(sharedControl, INDEX_STATE, STATE_IDLE);

        const state = Atomics.load(sharedControl, INDEX_STATE);

        if (state === STATE_PROCESS) {
            runAnalysis();

            // Reset to IDLE
            Atomics.store(sharedControl, INDEX_STATE, STATE_IDLE);
        }
    }
}

function runAnalysis() {
    if (!sharedControl || !sharedAudio) return;

    const sampleRate = sharedControl[INDEX_SAMPLE_RATE];
    const length = sharedControl[INDEX_LENGTH];
    const mode = sharedControl[INDEX_MODE]; // 0=Melody, 1=Harmony, 2=Drums

    // Use a view of the valid audio data
    const audioData = sharedAudio.subarray(0, length);

    try {
        let result: any;
        if (mode === 2) { // Drums
            result = analyzeDrums(audioData, sampleRate);
        } else if (mode === 1) { // Harmony
            result = analyzeHarmony(audioData, sampleRate);
        } else { // Melody (Default)
            result = analyzeMelody(audioData, sampleRate);
        }

        self.postMessage({ type: 'complete', result });

    } catch (error) {
        console.error('Worker Analysis Error:', error);
        self.postMessage({ type: 'error', error: String(error) });
    }
}

// --- Analysis Implementations (Mirrors original logic but using pure DSP) ---

function analyzeMelody(channelData: Float32Array, sampleRate: number) {
    const frameSize = 2048;
    const hopSize = 512;
    const totalFrames = Math.floor((channelData.length - frameSize) / hopSize);

    const pitchResults = [];
    const reportInterval = Math.floor(totalFrames / 20); // 20 updates total

    for (let i = 0; i < totalFrames; i++) {
        if (i % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                progress: 20 + (i / totalFrames) * 60,
                stage: 'Detecting pitch...'
            });
        }

        const startSample = i * hopSize;
        const frame = channelData.subarray(startSample, startSample + frameSize);

        // Simple RMS check (inline for speed or use imported)
        let sum = 0;
        for (let k = 0; k < frame.length; k++) sum += frame[k] * frame[k];
        const rms = Math.sqrt(sum / frame.length);

        if (rms < 0.01) continue;

        const pitch = detectPitchAutocorrelation(frame, sampleRate);
        if (pitch && pitch.confidence > 0.8) {
            pitchResults.push({
                time: startSample / sampleRate,
                pitch: pitch.midiNote,
                confidence: pitch.confidence
            });
        }
    }

    return { type: 'melody', data: pitchResults };
}

function analyzeHarmony(channelData: Float32Array, sampleRate: number) {
    const frameSize = 4096;
    const hopSize = 2048;
    const totalFrames = Math.floor((channelData.length - frameSize) / hopSize);

    const chordResults = [];
    const reportInterval = Math.max(1, Math.floor(totalFrames / 20));

    for (let i = 0; i < totalFrames; i++) {
        if (i % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                progress: 20 + (i / totalFrames) * 60,
                stage: 'Analyzing harmony...'
            });
        }

        const startSample = i * hopSize;
        const frame = channelData.subarray(startSample, startSample + frameSize);

        let sum = 0;
        for (let k = 0; k < frame.length; k++) sum += frame[k] * frame[k];
        const rms = Math.sqrt(sum / frame.length);

        if (rms < 0.01) continue;

        const pitches = detectMultiplePitches(frame, sampleRate);
        if (pitches.length > 0) {
            chordResults.push({
                time: startSample / sampleRate,
                pitches
            });
        }
    }

    return { type: 'harmony', data: chordResults };
}

function analyzeDrums(channelData: Float32Array, sampleRate: number) {
    const frameSize = 1024;
    const hopSize = 256;
    const totalFrames = Math.floor((channelData.length - frameSize) / hopSize);

    const transients = [];
    let prevEnergy = 0;
    const reportInterval = Math.max(1, Math.floor(totalFrames / 20));

    for (let i = 0; i < totalFrames; i++) {
         if (i % reportInterval === 0) {
            self.postMessage({
                type: 'progress',
                progress: 20 + (i / totalFrames) * 60,
                stage: 'Detecting transients...'
            });
        }

        const startSample = i * hopSize;
        const frame = channelData.subarray(startSample, startSample + frameSize);

        const result = analyzeTransientFrame(frame, prevEnergy, sampleRate);
        prevEnergy = result.energy;

        if (result.isTransient) {
            transients.push({
                time: startSample / sampleRate,
                velocity: Math.min(1, result.energy * 2),
                type: result.type
            });
        }
    }

    return { type: 'drums', data: transients };
}
