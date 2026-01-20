/**
 * Fast Fourier Transform (FFT) Implementation
 * Uses Radix-2 Cooley-Tukey algorithm.
 * Input length must be a power of 2.
 */

export function computeFFT(real: Float32Array): { real: Float32Array; imag: Float32Array; magnitude: Float32Array } {
    const N = real.length;

    // Check if N is power of 2
    if ((N & (N - 1)) !== 0) {
        throw new Error('FFT input length must be power of 2');
    }

    const outputReal = new Float32Array(N);
    const outputImag = new Float32Array(N);

    // Copy input
    outputReal.set(real);

    // Bit reversal permutation
    let j = 0;
    for (let i = 0; i < N - 1; i++) {
        if (i < j) {
            // Swap
            const tr = outputReal[i];
            outputReal[i] = outputReal[j];
            outputReal[j] = tr;

            const ti = outputImag[i];
            outputImag[i] = outputImag[j];
            outputImag[j] = ti;
        }
        let k = N >> 1;
        while (k <= j) {
            j -= k;
            k >>= 1;
        }
        j += k;
    }

    // Butterfly computations
    for (let l = 1; l <= Math.log2(N); l++) {
        const m = 1 << l;
        const wmReal = Math.cos(-2 * Math.PI / m);
        const wmImag = Math.sin(-2 * Math.PI / m);

        for (let k = 0; k < N; k += m) {
            let wReal = 1;
            let wImag = 0;
            for (let j = 0; j < m / 2; j++) {
                const index1 = k + j;
                const index2 = k + j + m / 2;

                const tReal = wReal * outputReal[index2] - wImag * outputImag[index2];
                const tImag = wReal * outputImag[index2] + wImag * outputReal[index2];

                const uReal = outputReal[index1];
                const uImag = outputImag[index1];

                outputReal[index1] = uReal + tReal;
                outputImag[index1] = uImag + tImag;
                outputReal[index2] = uReal - tReal;
                outputImag[index2] = uImag - tImag;

                const nextWReal = wReal * wmReal - wImag * wmImag;
                wImag = wReal * wmImag + wImag * wmReal;
                wReal = nextWReal;
            }
        }
    }

    // Compute magnitude
    const magnitude = new Float32Array(N / 2);
    for (let i = 0; i < N / 2; i++) {
        magnitude[i] = Math.sqrt(outputReal[i] * outputReal[i] + outputImag[i] * outputImag[i]);
    }

    return {
        real: outputReal,
        imag: outputImag,
        magnitude
    };
}
