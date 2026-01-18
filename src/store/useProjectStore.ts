import { create } from 'zustand';
import { audioScheduler } from '../lib/scheduler';
import { audioEngine } from '../lib/audioEngine';
import type { Track, Project } from '../lib/types';

// Re-export types for backwards compatibility with db.ts
export type { Track, Project };

interface ProjectState {
    activeProject: Project | null;
    tracks: Track[];
    isPlaying: boolean;

    // currentTime is exposed for backwards compatibility but should NOT be used for UI
    // that needs 60fps updates - use usePlaybackTime hook instead
    currentTime: number;
    _currentTime: number;

    // Actions
    setActiveProject: (project: Project | null) => void;
    setTracks: (tracks: Track[]) => void;
    updateTrack: (trackId: number, updates: Partial<Track>) => void;
    togglePlay: () => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentTime: (time: number) => void;
    updateProject: (updates: Partial<Project>) => Promise<void>;

    // DB Actions
    loadProject: (id: number) => Promise<void>;
    createProject: (name: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
    activeProject: null,
    tracks: [],
    isPlaying: false,
    _currentTime: 0,
    // Getter property for backwards compatibility
    get currentTime() { return get()._currentTime; },

    setActiveProject: (project) => set({ activeProject: project }),
    setTracks: (tracks) => set({ tracks }),

    updateTrack: (trackId, updates) => set((state) => ({
        tracks: state.tracks.map(t =>
            t.id === trackId ? { ...t, ...updates } : t
        )
    })),

    // Legacy setter - updates are now batched and debounced
    setCurrentTime: (time) => {
        // Update audio scheduler instantly
        // This ensures back button, seeking, and playhead jumps are synced with audio
        audioScheduler.setTime(time);

        // Only update if significant change to reduce unnecessary state updates
        const current = get()._currentTime;
        if (Math.abs(time - current) > 0.001) { // Tighter tolerance
            set({ _currentTime: time });
        }
    },

    setIsPlaying: (isPlaying) => set({ isPlaying }),

    togglePlay: () => {
        set((state) => {
            const nextIsPlaying = !state.isPlaying;
            if (nextIsPlaying) {
                audioScheduler.start();
            } else {
                audioScheduler.stop();
            }
            return { isPlaying: nextIsPlaying };
        });
    },

    loadProject: async (id) => {
        // Dynamic import to avoid circular dependency
        const { db } = await import('../lib/db');
        const project = await db.projects.get(id);
        if (project) {
            const tracks = await db.tracks.where('projectId').equals(id).toArray();
            set({ activeProject: project, tracks: tracks as Track[] });
        }
    },

    createProject: async (name) => {
        const { db } = await import('../lib/db');
        const id = await db.projects.add({
            name,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            tempo: 120,
            timeSignature: '4/4'
        });
        const project = await db.projects.get(id);
        if (project) {
            set({ activeProject: project, tracks: [] });
        }
    },

    updateProject: async (updates: Partial<Project>) => {
        const { activeProject } = get();
        if (!activeProject) return;

        const updatedProject = { ...activeProject, ...updates, updatedAt: Date.now() };
        set({ activeProject: updatedProject });

        // Update DB
        const { db } = await import('../lib/db');
        await db.projects.update(activeProject.id, updates);
    }
}));

// Setup AudioEngine state listener to sync playback state
if (typeof window !== 'undefined') {
    // Register callback once on client side
    setTimeout(() => {
        audioEngine.onStateChange((state) => {
            const store = useProjectStore.getState();
            // If audio context suspends while we think we're playing, stop
            if (state === 'suspended' && store.isPlaying) {
                console.log('AudioContext suspended - stopping playback');
                store.setIsPlaying(false);
                audioScheduler.stop();
            }
        });
    }, 0);
}

// Backwards compatibility: getter for currentTime
// Components should migrate to usePlaybackTime hook instead
Object.defineProperty(useProjectStore.getState(), 'currentTime', {
    get() {
        return this._currentTime;
    }
});
