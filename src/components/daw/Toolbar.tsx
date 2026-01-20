'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Circle, Sparkles, Settings, Share2, Undo2, Redo2, SkipBack } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { usePlaybackTime } from '../../hooks/usePlaybackTime';
import { audioEngine } from '../../lib/audioEngine';
import dynamic from 'next/dynamic';
import styles from './Toolbar.module.css';
import TimeDisplay from './TimeDisplay';

const ThemeToggle = dynamic(() => import('../ThemeToggle'), { ssr: false });

// Format seconds to MM:SS:mmm
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
}

interface ToolbarProps {
  onSettingsClick: () => void;
  onWingmanClick: () => void;
  onShareClick?: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  gridDivision: number;
  setGridDivision: (val: number) => void;
}

export default function Toolbar({
  onSettingsClick,
  onWingmanClick,
  onShareClick,
  undo,
  redo,
  canUndo,
  canRedo,
  gridDivision,
  setGridDivision
}: ToolbarProps) {
  const { isPlaying, togglePlay, activeProject, setCurrentTime } = useProjectStore();
  const playbackTime = usePlaybackTime();

  const handleTogglePlay = async () => {
    if (!isPlaying) {
      await audioEngine.initialize();
      await audioEngine.resume();

      try {
        const engines = await import('../../lib/toneEngine');
        await Promise.all([
          engines.toneSynthEngine.initialize(),
          engines.toneDrumMachine.initialize(),
          engines.toneBassEngine.initialize(),
          engines.toneKeysEngine.initialize(),
          engines.toneVocalEngine.initialize(),
          engines.toneFXEngine.initialize()
        ]);
      } catch (e) {
        console.warn('Failed to start engines:', e);
      }
    } else {
      try {
        const engines = await import('../../lib/toneEngine');
        engines.toneSynthEngine.stopAll();
        engines.toneBassEngine.stopAll();
        engines.toneKeysEngine.stopAll();
        engines.toneVocalEngine.stopAll();
      } catch (e) {
        console.warn('Failed to stop engines:', e);
      }
    }
    togglePlay();
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarLeft}>
        <div className={styles.logo}>
          <Sparkles size={20} className={styles.logoIcon} />
          <span className={styles.logoText}>Drey</span>
        </div>
        <div className={styles.projectName}>{activeProject?.name || 'Untitled'}</div>

        <div className={styles.historyControls}>
          <button
            className={`${styles.historyBtn}`}
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>
          <button
            className={`${styles.historyBtn}`}
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={16} />
          </button>
        </div>

        <div className={styles.gridControls}>
          <select
            className={styles.gridSelect}
            value={gridDivision}
            onChange={(e) => setGridDivision(Number(e.target.value))}
            title="Grid Division"
          >
            <option value={1}>1/1</option>
            <option value={2}>1/2</option>
            <option value={4}>1/4</option>
            <option value={8}>1/8</option>
            <option value={16}>1/16</option>
          </select>
        </div>
      </div>

      <div className={styles.transport}>
        <button className={styles.transportBtn} onClick={() => setCurrentTime(0)}>
            <SkipBack size={16} />
        </button>
        <button className={`${styles.transportBtn} ${styles.play}`} onClick={handleTogglePlay}>
          {isPlaying ? <Square size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <button className={`${styles.transportBtn} ${styles.record}`}>
            <Circle size={16} />
        </button>
        <div className={styles.timeDisplay}><TimeDisplay /></div>
        <div className={styles.tempoDisplay}>
          <span className={styles.tempoValue}>128</span>
          <span className={styles.tempoLabel}>BPM</span>
        </div>
        <div className={styles.signature}>4/4</div>
      </div>

      <div className={styles.toolbarRight}>
        <ThemeToggle />
        <button
          className={styles.actionBtn}
          onClick={onWingmanClick}
          title="Wingman AI"
          style={{ color: '#eb459e' }}
        >
          <Sparkles size={18} />
        </button>
        <button className={styles.actionBtn} onClick={onSettingsClick}><Settings size={18} /></button>
        <button className={styles.actionBtn} onClick={onShareClick}><Share2 size={18} /></button>
      </div>
    </div>
  );
}
