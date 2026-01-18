import Dexie, { Table } from 'dexie';

export interface Project {
    id?: number;
    name: string;
    createdAt: number;
    updatedAt: number;
    tempo: number;
    timeSignature: string;
}

export interface MidiNote {
    pitch: number;
    start: number;
    duration: number;
    velocity: number;
}

export interface Clip {
    start: number;
    duration: number;
    name: string;
    notes?: MidiNote[];
}

export interface Track {
    id?: number;
    projectId?: number; // Optional for local UI state before DB save
    name: string;
    type: 'audio' | 'midi' | 'drums';
    muted: boolean;
    soloed: boolean;
    volume: number;
    pan: number;
    color?: string;
    instrument?: string;
    clips: Clip[];
    meterL?: number;
    meterR?: number;
}

export interface AudioSample {
    id?: number;
    name: string;
    data: ArrayBuffer;
    type: string;
    duration: number;
}

export class DreyDB extends Dexie {
    projects!: Table<Project>;
    tracks!: Table<Track>;
    samples!: Table<AudioSample>;

    constructor() {
        super('DreyDB');
        this.version(1).stores({
            projects: '++id, name, updatedAt',
            tracks: '++id, projectId, type',
            samples: '++id, name'
        });
    }
}

export const db = new DreyDB();
