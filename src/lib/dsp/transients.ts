import { calculateRMS, calculateSpectralCentroid } from './analysis';

export interface TransientResult {
    isTransient: boolean;
    energy: number;
    type?: 'kick' | 'snare' | 'hat';
}

export function analyzeTransientFrame(
    frame: Float32Array,
    prevEnergy: number,
    sampleRate: number
): TransientResult {
    const energy = calculateRMS(frame);
    const onset = energy - prevEnergy;

    // Detect sharp energy increase (transient)
    if (onset > 0.1 && energy > 0.05) {
        const spectralCentroid = calculateSpectralCentroid(frame, sampleRate);
        let type: 'kick' | 'snare' | 'hat' = 'snare';

        // Classify by spectral centroid
        if (spectralCentroid < 200) type = 'kick';
        else if (spectralCentroid > 4000) type = 'hat';

        return {
            isTransient: true,
            energy,
            type
        };
    }

    return {
        isTransient: false,
        energy
    };
}
