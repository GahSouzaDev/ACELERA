// js/gameConfig.js
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

export const gameConfig = {
    playerId: null,
    playerName: "Player", // Default name
    opponentName: "Oponente", // Default opponent name
    roomId: null,
    isOffline: false,
    status: 'waiting', // 'waiting', 'connecting', 'playing', 'finished'
    gear: 'N',
    speed: 0, // km/h
    accelerationInput: 0, // 0 to 1 (throttle input)
    steeringInput: 0, // -1 to 1 (steering input)
    currentTorque: 0, // For UI display
    position: new THREE.Vector3(100, 0.5, 0), // Initial car position
    rotation: 0, // Car rotation in radians
    lap: 0,
    lastCheckpoint: 0, // Used for lap completion logic
    upgrades: {
        torque: 0, // Level of torque upgrade
        speed: 0,  // Level of speed upgrade
        gears: 0   // Level of gear/transmission upgrade
    },
    money: 500, // Initial money
    betAmount: 0,
    selectedCarId: 'basicSportsCar', // ID of the initially selected car
    selectedTrackId: 'ovalTrack', // ID of the initially selected track
};

export const gearSettings = {
    'R': { minSpeed: -20, maxSpeed: 0, optimalMin: -14, optimalMax: -7, torqueMultiplier: 0.7, frictionMultiplier: 1.0 },
    'N': { minSpeed: -10, maxSpeed: 10, optimalMin: 0, optimalMax: 0, torqueMultiplier: 0.1, frictionMultiplier: 0.8 },            
    '1': { minSpeed: 0, maxSpeed: 60, optimalMin: 15, optimalMax: 40, torqueMultiplier: 1.0, frictionMultiplier: 1.0 },
    '2': { minSpeed: 0, maxSpeed: 100, optimalMin: 35, optimalMax: 70, torqueMultiplier: 0.9, frictionMultiplier: 1.0 },
    '3': { minSpeed: 0, maxSpeed: 140, optimalMin: 60, optimalMax: 100, torqueMultiplier: 0.8, frictionMultiplier: 1.0 },
    '4': { minSpeed: 0, maxSpeed: 180, optimalMin: 90, optimalMax: 130, torqueMultiplier: 0.7, frictionMultiplier: 1.0 },
    '5': { minSpeed: 0, maxSpeed: 220, optimalMin: 120, optimalMax: 170, torqueMultiplier: 0.6, frictionMultiplier: 1.0 }
};

export const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
            urls: 'turn:turn.speed.cloudflare.com:50000',
            username: 'd1a7f09155fb30285724a3a056ca2edf17956674aff12909ff133dcec42994b2614cdd0a380a1b65124def1e3d0208543050d14b77d1a7533f9da35893ee2ed9',
            credential: 'aba9b169546eb6dcc7bfb1cdf34544cf95b5161d602e3b5fa7c8342b2e9802fb'
        },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

export const SERVER_URL = 'wss://heroic-hope-production-bbdc.up.railway.app'; // Seu servidor WebSocket