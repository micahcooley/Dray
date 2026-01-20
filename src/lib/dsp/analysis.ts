import { computeFFT } from './fft';

/**
 * Pure DSP Analysis Functions
 * Decoupled from AudioContext and DOM
 */

export function calculateRMS(buffer: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
        sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
}

/**
 * Autocorrelation-based pitch detection (YIN-like)
 */
export function detectPitchAutocorrelation(
    buffer: Float32Array,
    sampleRate: number
): { frequency: number; midiNote: number; confidence: number } | null {
    const minFreq = 60;   // ~B1
    const maxFreq = 1200; // ~D6
    const minPeriod = Math.floor(sampleRate / maxFreq);
    const maxPeriod = Math.floor(sampleRate / minFreq);

    if (buffer.length < maxPeriod) return null;

    // Calculate normalized difference function
    const yinBuffer = new Float32Array(maxPeriod);

    for (let tau = minPeriod; tau < maxPeriod; tau++) {
        let sum = 0;
        // Optimization: Don't check every single sample if not needed, but for accuracy we do
        for (let j = 0; j < buffer.length - tau; j++) {
            const diff = buffer[j] - buffer[j + tau];
            sum += diff * diff;
        }
        yinBuffer[tau] = sum;
    }

    // Cumulative mean normalized difference
    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < maxPeriod; tau++) {
        runningSum += yinBuffer[tau];
        yinBuffer[tau] = yinBuffer[tau] * tau / (runningSum + 0.00001); // Avoid div by zero
    }

    // Find first minimum below threshold
    const threshold = 0.15;
    let bestPeriod = -1;
    let bestValue = 1;

    for (let tau = minPeriod; tau < maxPeriod - 1; tau++) {
        if (yinBuffer[tau] < threshold && yinBuffer[tau] < yinBuffer[tau - 1] && yinBuffer[tau] < yinBuffer[tau + 1]) {
            if (yinBuffer[tau] < bestValue) {
                bestValue = yinBuffer[tau];
                bestPeriod = tau;
            }
        }
    }

    if (bestPeriod < 0) return null;

    // Parabolic interpolation
    const prev = yinBuffer[bestPeriod - 1];
    const curr = yinBuffer[bestPeriod];
    const next = yinBuffer[bestPeriod + 1];
    const offset = (prev - next) / (2 * (prev - 2 * curr + next));
    const refinedPeriod = bestPeriod + offset;

    const frequency = sampleRate / refinedPeriod;
    const midiNote = Math.round(12 * Math.log2(frequency / 440) + 69);
    const confidence = 1 - bestValue;

    return { frequency, midiNote, confidence };
}

/**
 * Detect multiple pitches using FFT peak detection
 */
export function detectMultiplePitches(buffer: Float32Array, sampleRate: number): number[] {
    const { magnitude } = computeFFT(buffer);
    const peaks = findSpectralPeaks(magnitude, sampleRate);

    // Convert frequencies to MIDI notes
    const midiNotes = peaks
        .filter(f => f > 60 && f < 2000)
        .map(f => Math.round(12 * Math.log2(f / 440) + 69))
        .filter((v, i, a) => a.indexOf(v) === i) // Unique
        .slice(0, 4); // Max 4 notes per chord

    return midiNotes;
}

/**
 * Find peaks in spectrum
 */
export function findSpectralPeaks(spectrum: Float32Array, sampleRate: number): number[] {
    const peaks: number[] = [];
    const binWidth = sampleRate / (spectrum.length * 2);

    for (let i = 2; i < spectrum.length - 2; i++) {
        if (spectrum[i] > spectrum[i - 1] &&
            spectrum[i] > spectrum[i + 1] &&
            spectrum[i] > spectrum[i - 2] &&
            spectrum[i] > spectrum[i + 2] &&
            spectrum[i] > 0.1) {
            peaks.push(i * binWidth);
        }
    }

    // Sort by magnitude (spectrum[i]) - currently we just push frequency.
    // To sort by magnitude we'd need to store indices.
    // For now we assume the order of detection or filtering is acceptable
    // (though higher freq usually comes later).
    // The original code returned detection order slice(0, 10).
    return peaks.slice(0, 10);
}

/**
 * Calculate spectral centroid for drum classification
 */
export function calculateSpectralCentroid(buffer: Float32Array, sampleRate: number): number {
    const { magnitude } = computeFFT(buffer);
    const binWidth = sampleRate / (buffer.length);

    let weightedSum = 0;
    let sum = 0;

    for (let i = 0; i < magnitude.length; i++) {
        weightedSum += i * binWidth * magnitude[i];
        sum += magnitude[i];
    }

    return sum > 0 ? weightedSum / sum : 0;
}
