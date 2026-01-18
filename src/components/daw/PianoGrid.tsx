import React, { useRef, useEffect } from 'react';

interface PianoGridProps {
    width: number;
    height: number;
    pixelsPerBeat: number;
    beatCount: number;
    visiblePitches: number[];
    noteHeight: number;
    trackType: 'midi' | 'drums' | 'audio';
    gridSize: number; // Grid subdivision (1, 0.5, 0.25, 0.125, etc.)
}

const PianoGrid: React.FC<PianoGridProps> = ({
    width,
    height,
    pixelsPerBeat,
    beatCount,
    visiblePitches,
    noteHeight,
    trackType,
    gridSize
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        // Handle High DPI displays
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        ctx.scale(dpr, dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        // Clear
        ctx.fillStyle = '#0c0c12';
        ctx.fillRect(0, 0, width, height);

        // Draw Rows
        visiblePitches.forEach((pitch, i) => {
            const y = i * noteHeight;
            let isBlack = false;
            let isC = false;

            if (trackType !== 'drums') {
                const noteIndex = pitch % 12;
                isBlack = [1, 3, 6, 8, 10].includes(noteIndex);
                isC = noteIndex === 0;
            }

            // Row Background
            if (trackType === 'drums') {
                ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.1)';
            } else {
                ctx.fillStyle = isBlack ? 'rgba(0,0,0,0.2)' : 'transparent';
                if (isC) ctx.fillStyle = 'rgba(255,255,255,0.02)';
            }

            if (ctx.fillStyle !== 'transparent') {
                ctx.fillRect(0, y, width, noteHeight);
            }

            // Horizontal line
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(0, y + noteHeight - 1, width, 1);
        });

        // Vertical Grid Lines - use gridSize for sub-divisions
        // Draw grid lines based on current grid size
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        for (let beat = 0; beat < beatCount; beat += gridSize) {
            const x = beat * pixelsPerBeat;
            if (x > width) break;
            // Skip beat and bar lines (they'll be drawn separately)
            if (beat % 1 !== 0) {
                ctx.moveTo(Math.floor(x) + 0.5, 0);
                ctx.lineTo(Math.floor(x) + 0.5, height);
            }
        }
        ctx.stroke();

        // Draw Beats (quarter notes)
        ctx.beginPath();
        for (let beat = 0; beat < beatCount; beat++) {
            const x = beat * pixelsPerBeat;
            if (x > width) break;
            const isBar = beat % 4 === 0;
            if (!isBar) {
                ctx.moveTo(Math.floor(x) + 0.5, 0);
                ctx.lineTo(Math.floor(x) + 0.5, height);
            }
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.stroke();

        // Draw Bars (every 4 beats)
        ctx.beginPath();
        for (let beat = 0; beat < beatCount; beat += 4) {
            const x = beat * pixelsPerBeat;
            if (x > width) break;
            ctx.moveTo(Math.floor(x) + 0.5, 0);
            ctx.lineTo(Math.floor(x) + 0.5, height);
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

    }, [width, height, pixelsPerBeat, beatCount, visiblePitches, noteHeight, trackType, gridSize]);

    return (
        <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ width, height }}
        />
    );
};

export default React.memo(PianoGrid);

