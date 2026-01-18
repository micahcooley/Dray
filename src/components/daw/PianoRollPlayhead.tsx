'use client';

import React, { useRef } from 'react';
import { usePlaybackCallback } from '../../hooks/usePlaybackTime';
import styles from './pianoroll.module.css';

interface PianoRollPlayheadProps {
    pixelsPerBeat: number;
    beatsVisible: number;
}

export default function PianoRollPlayhead({ pixelsPerBeat, beatsVisible }: PianoRollPlayheadProps) {
    const playheadRef = useRef<HTMLDivElement>(null);

    usePlaybackCallback((time, beat) => {
        if (playheadRef.current) {
            const pos = (beat % beatsVisible) * pixelsPerBeat;
            playheadRef.current.style.transform = `translateX(${pos}px)`;
        }
    });

    return (
        <div
            ref={playheadRef}
            className={styles.playhead}
            style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '2px',
                backgroundColor: '#fff',
                zIndex: 20,
                pointerEvents: 'none',
                transform: 'translateX(0px)',
                willChange: 'transform'
            }}
        />
    );
}
