'use client';

import React, { useRef, useEffect } from 'react';
import { usePlaybackCallback, getPlaybackTime } from '../../hooks/usePlaybackTime';

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
};

export default function TimeDisplay({ className = 'time' }: { className?: string }) {
    const spanRef = useRef<HTMLSpanElement>(null);

    // Set initial value on mount
    useEffect(() => {
        if (spanRef.current) {
            spanRef.current.textContent = formatTime(getPlaybackTime());
        }
    }, []);

    usePlaybackCallback((time) => {
        if (spanRef.current) {
            spanRef.current.textContent = formatTime(time);
        }
    });

    return <span ref={spanRef} className={className}>00:00:000</span>;
}
