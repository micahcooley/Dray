export class FFT {
    private size: number;
    private reverseTable: Uint32Array;
    private sinTable: Float32Array;
    private cosTable: Float32Array;

    // Pre-allocated buffers to reduce GC
    private real: Float32Array;
    private imag: Float32Array;

    constructor(size: number) {
        if (!isPowerOfTwo(size)) {
            throw new Error("FFT size must be a power of two");
        }
        this.size = size;
        this.reverseTable = new Uint32Array(size);
        this.sinTable = new Float32Array(size);
        this.cosTable = new Float32Array(size);
        this.real = new Float32Array(size);
        this.imag = new Float32Array(size);
        this.initializeTables();
    }

    private initializeTables() {
        const size = this.size;

        // Precompute bit reversal table
        let limit = 1;
        let bit = size >> 1;

        while (limit < size) {
            for (let i = 0; i < limit; i++) {
                this.reverseTable[i + limit] = this.reverseTable[i] + bit;
            }
            limit = limit << 1;
            bit = bit >> 1;
        }

        // Precompute trig tables
        for (let i = 0; i < size; i++) {
            const angle = -2 * Math.PI * i / size;
            this.sinTable[i] = Math.sin(angle);
            this.cosTable[i] = Math.cos(angle);
        }
    }

    public transform(input: Float32Array): { real: Float32Array, imag: Float32Array } {
        if (input.length > this.size) {
            throw new Error(`Input size ${input.length} exceeds FFT size ${this.size}`);
        }

        const size = this.size;
        const real = this.real;
        const imag = this.imag;

        // Bit-reversed copy with zero-padding support
        for (let i = 0; i < size; i++) {
            const rev = this.reverseTable[i];
            if (rev < input.length) {
                real[i] = input[rev];
            } else {
                real[i] = 0;
            }
            imag[i] = 0;
        }

        // Cooley-Tukey butterfly operations
        for (let halfSize = 1; halfSize < size; halfSize *= 2) {
            const step = halfSize * 2;
            const sizeOverStep = size / step;

            for (let j = 0; j < size; j += step) {
                for (let i = 0; i < halfSize; i++) {
                    const k = j + i + halfSize;
                    const idx = j + i;

                    const tableIdx = i * sizeOverStep;
                    const wReal = this.cosTable[tableIdx];
                    const wImag = this.sinTable[tableIdx];

                    const tReal = wReal * real[k] - wImag * imag[k];
                    const tImag = wReal * imag[k] + wImag * real[k];

                    real[k] = real[idx] - tReal;
                    imag[k] = imag[idx] - tImag;
                    real[idx] = real[idx] + tReal;
                    imag[idx] = imag[idx] + tImag;
                }
            }
        }

        return { real, imag };
    }

    public getMagnitude(input: Float32Array): Float32Array {
        const { real, imag } = this.transform(input);
        const halfSize = this.size / 2;
        const result = new Float32Array(halfSize);

        for (let i = 0; i < halfSize; i++) {
            result[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        }
        return result;
    }
}

function isPowerOfTwo(n: number): boolean {
    return n > 0 && (n & (n - 1)) === 0;
}
