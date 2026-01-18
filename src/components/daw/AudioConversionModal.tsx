'use client';

import { useState } from 'react';
import { X, Music, Layers, Drum, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { audioToMidiConverter, ConversionMode, ConversionProgress } from '../../lib/audioToMidiConverter';
import type { MidiNote } from '../../lib/types';
import styles from './audioconversionmodal.module.css';

interface AudioConversionModalProps {
    audioFile: File | Blob;
    onConversionComplete: (notes: MidiNote[]) => void;
    onClose: () => void;
}

export default function AudioConversionModal({
    audioFile,
    onConversionComplete,
    onClose
}: AudioConversionModalProps) {
    const [selectedMode, setSelectedMode] = useState<ConversionMode>('melody');
    const [isConverting, setIsConverting] = useState(false);
    const [progress, setProgress] = useState<ConversionProgress>({ stage: '', progress: 0 });
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<MidiNote[] | null>(null);

    const handleConvert = async () => {
        setIsConverting(true);
        setError(null);
        setResult(null);

        try {
            const conversionResult = await audioToMidiConverter.convert(
                audioFile,
                selectedMode,
                (p) => setProgress(p)
            );

            if (conversionResult.notes.length === 0) {
                setError('No notes detected. Try a different conversion mode or audio file.');
            } else {
                setResult(conversionResult.notes);
            }
        } catch (err) {
            setError(`Conversion failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsConverting(false);
        }
    };

    const handleApply = () => {
        if (result) {
            onConversionComplete(result);
        }
    };

    const modes = [
        {
            id: 'melody' as ConversionMode,
            icon: <Music size={24} />,
            title: 'Melody',
            description: 'Extract single-note melodies from vocals or lead instruments'
        },
        {
            id: 'harmony' as ConversionMode,
            icon: <Layers size={24} />,
            title: 'Harmony',
            description: 'Extract chords and multiple notes from polyphonic audio'
        },
        {
            id: 'drums' as ConversionMode,
            icon: <Drum size={24} />,
            title: 'Drums',
            description: 'Convert drum hits to MIDI using transient detection'
        }
    ];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={20} />
                </button>

                <h2 className={styles.title}>Convert Audio to MIDI</h2>
                <p className={styles.subtitle}>
                    {audioFile instanceof File ? audioFile.name : 'Audio clip'}
                </p>

                {/* Mode Selection */}
                <div className={styles.modeGrid}>
                    {modes.map((mode) => (
                        <button
                            key={mode.id}
                            className={`${styles.modeCard} ${selectedMode === mode.id ? styles.selected : ''}`}
                            onClick={() => setSelectedMode(mode.id)}
                            disabled={isConverting}
                        >
                            <div className={styles.modeIcon}>{mode.icon}</div>
                            <div className={styles.modeTitle}>{mode.title}</div>
                            <div className={styles.modeDescription}>{mode.description}</div>
                        </button>
                    ))}
                </div>

                {/* Progress / Result */}
                {isConverting && (
                    <div className={styles.progressContainer}>
                        <Loader2 className={styles.spinner} size={24} />
                        <div className={styles.progressText}>{progress.stage}</div>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={{ width: `${progress.progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className={styles.errorBox}>
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {result && !isConverting && (
                    <div className={styles.resultBox}>
                        <CheckCircle size={18} />
                        Detected {result.length} MIDI notes
                    </div>
                )}

                {/* Actions */}
                <div className={styles.actions}>
                    <button className={styles.cancelButton} onClick={onClose}>
                        Cancel
                    </button>

                    {result ? (
                        <button className={styles.applyButton} onClick={handleApply}>
                            Apply to Track
                        </button>
                    ) : (
                        <button
                            className={styles.convertButton}
                            onClick={handleConvert}
                            disabled={isConverting}
                        >
                            {isConverting ? 'Converting...' : 'Convert'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
