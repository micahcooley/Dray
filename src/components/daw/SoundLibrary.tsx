'use client';

import React from 'react';
import { Folder, ChevronDown, ChevronRight, Volume2 } from 'lucide-react';
import type { SoundCategory } from '../../lib/types';
import styles from './soundlibrary.module.css';

interface SoundLibraryProps {
    library: Record<string, string[]>;
    expandedCategory: string | null;
    onCategoryToggle: (category: string) => void;
    onSoundClick: (category: SoundCategory, sound: string) => void;
    onSoundDoubleClick: (category: SoundCategory, sound: string) => void;
}

export default function SoundLibrary({
    library,
    expandedCategory,
    onCategoryToggle,
    onSoundClick,
    onSoundDoubleClick
}: SoundLibraryProps) {
    const totalSounds = Object.values(library).reduce((sum, arr) => sum + arr.length, 0);

    return (
        <aside className={styles.browser}>
            <div className={styles.header}>
                <Folder size={16} />
                <span>Sounds</span>
                <span className={styles.count}>{totalSounds}+</span>
            </div>
            <div className={styles.hint}>Double-click to apply to track</div>
            <div className={styles.categories}>
                {(Object.entries(library) as [SoundCategory, string[]][]).map(([category, sounds]) => (
                    <div key={category} className={styles.category}>
                        <button
                            className={styles.categoryHeader}
                            onClick={() => onCategoryToggle(category)}
                        >
                            {expandedCategory === category ? (
                                <ChevronDown size={14} />
                            ) : (
                                <ChevronRight size={14} />
                            )}
                            <span>{category}</span>
                            <span className={styles.categoryCount}>{sounds.length}</span>
                        </button>
                        {expandedCategory === category && (
                            <div className={styles.soundsList}>
                                {sounds.map(sound => (
                                    <div
                                        key={sound}
                                        className={styles.soundItem}
                                        draggable
                                        onClick={() => onSoundClick(category, sound)}
                                        onDoubleClick={() => onSoundDoubleClick(category, sound)}
                                    >
                                        <Volume2 size={12} />
                                        <span>{sound}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </aside>
    );
}
