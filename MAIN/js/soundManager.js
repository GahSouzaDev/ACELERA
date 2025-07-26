// js/soundManager.js
export class SoundManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {}; // Stores decoded audio buffers
        this.engineSoundSource = null;
        this.engineGain = null;
        this.enginePanner = null; // For stereo panning (left/right engine sound)
        this.engineFilter = null; // For simulating engine tone changes
        this.enginePlaying = false;
        this.isReady = false; // Flag to check if AudioContext is active
    }

    // Must be called after a user gesture (e.g., button click)
    async init() {
        if (this.isReady) return;

        // Create engine sound nodes
        this.engineGain = this.audioContext.createGain();
        this.enginePanner = this.audioContext.createStereoPanner();
        this.engineFilter = this.audioContext.createBiquadFilter(); // CORRECTED: Now 'this.engineFilter'

        this.engineFilter.type = 'lowpass'; // Low-pass filter for engine sound
        this.engineFilter.frequency.value = 5000; // Initial cutoff frequency

        this.engineGain.connect(this.engineFilter);
        this.engineFilter.connect(this.enginePanner);
        this.enginePanner.connect(this.audioContext.destination);
        this.engineGain.gain.value = 0.0; // Start muted

        // Synthesize gear shift and skid sounds
        this.generateSyntheticSounds();
        this.isReady = true;
    }

    async loadSound(name, url) {
        if (!this.isReady) await this.init(); // Ensure context is ready
        return new Promise((resolve, reject) => {
            fetch(url)
                .then(response => response.arrayBuffer())
                .then(data => this.audioContext.decodeAudioData(data))
                .then(buffer => {
                    this.sounds[name] = buffer;
                    resolve();
                })
                .catch(error => {
                    console.error(`Error loading sound ${name}:`, error);
                    reject(error);
                });
        });
    }

    playSound(name, loop = false, volume = 1.0) {
        if (!this.isReady || !this.sounds[name]) return null;

        const source = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();

        source.buffer = this.sounds[name];
        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        gainNode.gain.value = volume;
        source.loop = loop;
        source.start();

        return source;
    }

    generateSyntheticSounds() {
        const sampleRate = this.audioContext.sampleRate;

        // Gear Shift Sound
        const gearShiftDuration = 0.2;
        const gearShiftBuffer = this.audioContext.createBuffer(1, sampleRate * gearShiftDuration, sampleRate);
        const gearShiftData = gearShiftBuffer.getChannelData(0);
        for (let i = 0; i < gearShiftData.length; i++) {
            const t = i / sampleRate;
            gearShiftData[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-25 * t); // Short click/thump
        }
        this.sounds['gear_shift'] = gearShiftBuffer;

        // Skid Sound (short burst of white noise)
        const skidDuration = 0.5;
        const skidBuffer = this.audioContext.createBuffer(1, sampleRate * skidDuration, sampleRate);
        const skidData = skidBuffer.getChannelData(0);
        for (let i = 0; i < skidData.length; i++) {
            skidData[i] = (Math.random() * 2 - 1) * Math.exp(-4 * (i / skidData.length)); // Fading white noise
        }
        this.sounds['skid'] = skidBuffer;
    }

    startEngineSound() {
        if (!this.isReady || this.enginePlaying) return;

        this.engineSoundSource = this.audioContext.createOscillator();
        this.engineSoundSource.type = 'sawtooth'; // Or 'square', 'triangle' for different engine tones
        this.engineSoundSource.frequency.value = 80; // Base idle frequency

        this.engineSoundSource.connect(this.engineGain);
        this.engineSoundSource.start(0);
        this.enginePlaying = true;
        this.engineGain.gain.setValueAtTime(0.0, this.audioContext.currentTime);
        this.engineGain.gain.linearRampToValueAtTime(0.2, this.audioContext.currentTime + 0.5); // Fade in volume
    }

    updateEngineSound(speed, currentGear, maxSpeed, engineRPM) {
        if (!this.enginePlaying) return;

        // Engine frequency based on RPM
        const minFreq = 80;  // Idle frequency
        const maxFreq = 600; // High RPM frequency
        const rpmRatio = Math.min(1.0, Math.max(0.0, engineRPM / 8000)); // Normalize RPM (e.g., max 8000 RPM)
        this.engineSoundSource.frequency.value = minFreq + (maxFreq - minFreq) * rpmRatio;

        // Volume based on acceleration/speed and rpm
        const minVolume = 0.1;
        const maxVolume = 0.6;
        this.engineGain.gain.value = minVolume + (maxVolume - minVolume) * rpmRatio;

        // Filter cutoff for tone change (brighter at higher RPMs)
        const minCutoff = 800;
        const maxCutoff = 4000;
        this.engineFilter.frequency.value = minCutoff + (maxCutoff - minCutoff) * rpmRatio; // CORRECTED LINE

        // Stereo panning (slight variation for immersion)
        this.enginePanner.pan.value = Math.sin(this.audioContext.currentTime * 0.5) * 0.1; // Subtle pan
    }

    stopEngineSound() {
        if (this.engineSoundSource && this.enginePlaying) {
            this.engineGain.gain.linearRampToValueAtTime(0.0, this.audioContext.currentTime + 0.3); // Fade out
            setTimeout(() => {
                if (this.engineSoundSource) {
                    this.engineSoundSource.stop();
                    this.engineSoundSource.disconnect();
                    this.engineSoundSource = null;
                }
            }, 300); // Stop after fade out
            this.enginePlaying = false;
        }
    }

    playGearShift() {
        if (this.isReady) {
            this.playSound('gear_shift', false, 0.6);
        }
    }

    playSkid() {
        if (this.isReady) {
            // Only play if not already playing a very recent skid sound to avoid overlap
            if (!this._lastSkidPlayTime || (this.audioContext.currentTime - this._lastSkidPlayTime > 0.1)) {
                this.playSound('skid', false, 0.4);
                this._lastSkidPlayTime = this.audioContext.currentTime;
            }
        }
    }
}