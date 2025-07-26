// js/tracks/trackFactory.js
import { OvalTrack } from './ovalTrack.js';
import { CircuitTrack } from './circuitTrack.js';

// Central repository for all track definitions
export const TRACKS = {
    ovalTrack: new OvalTrack(),
    circuitTrack: new CircuitTrack(),
};

// Function to get a track instance by ID
export function getTrackById(id) {
    return TRACKS[id] || null;
}