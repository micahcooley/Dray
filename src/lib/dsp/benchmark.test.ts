import { detectPitchAutocorrelation, detectMultiplePitches } from './analysis';
import { computeFFT } from './fft';

describe('DSP Benchmark', () => {
    // Generate synthetic sine wave
    const sampleRate = 44100;
    const duration = 1.0; // 1 second
    const bufferSize = sampleRate * duration;
    const buffer = new Float32Array(bufferSize);
    const frequency = 440; // A4

    for (let i = 0; i < bufferSize; i++) {
        buffer[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate);
    }

    // FFT Buffer (power of 2)
    const fftSize = 4096;
    const fftBuffer = buffer.slice(0, fftSize);

    test('FFT Performance', () => {
        const iterations = 1000;
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            computeFFT(fftBuffer);
        }

        const end = performance.now();
        const totalTime = end - start;
        const avgTime = totalTime / iterations;

        console.log(`[Benchmark] FFT (N=${fftSize}): Total ${totalTime.toFixed(2)}ms for ${iterations} ops. Avg: ${avgTime.toFixed(4)}ms/op`);
        expect(avgTime).toBeLessThan(5); // Expect < 5ms per FFT (generous for JS)
    });

    test('Pitch Detection Performance', () => {
        const iterations = 100;
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            // Use a slice to simulate a frame
            const frame = buffer.slice(0, 2048);
            detectPitchAutocorrelation(frame, sampleRate);
        }

        const end = performance.now();
        const totalTime = end - start;
        const avgTime = totalTime / iterations;

        console.log(`[Benchmark] Pitch (YIN, N=2048): Total ${totalTime.toFixed(2)}ms for ${iterations} ops. Avg: ${avgTime.toFixed(4)}ms/op`);
        expect(avgTime).toBeLessThan(10); // Expect < 10ms per detection
    });

    test('Polyphonic Detection Performance', () => {
        const iterations = 100;
        const start = performance.now();

        for (let i = 0; i < iterations; i++) {
            const frame = buffer.slice(0, 4096);
            detectMultiplePitches(frame, sampleRate);
        }

        const end = performance.now();
        const totalTime = end - start;
        const avgTime = totalTime / iterations;

        console.log(`[Benchmark] Polyphonic (FFT+Peak, N=4096): Total ${totalTime.toFixed(2)}ms for ${iterations} ops. Avg: ${avgTime.toFixed(4)}ms/op`);
        expect(avgTime).toBeLessThan(15);
    });
});
