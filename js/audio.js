/**
 * ROAD DASH: OVERDRIVE - Procedural Audio Engine
 * Zero external audio files required - pure Web Audio API synthesis!
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.sfxGain = null;
        this.musicGain = null;
        this.initialized = false;
        this.muted = false;

        // Music sequencer state
        this.musicPlaying = false;
        this.musicStep = 0;
        this.musicTimer = null;
        this.bpm = 126;

        // Engine sound nodes
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineFilter = null;
        this.engineGain = null;
        this.engineNoise = null;
        this.engineNoiseGain = null;
        this.engineRunning = false;

        // Siren node
        this.sirenOsc = null;
        this.sirenGain = null;
        this.sirenRunning = false;

        // Saved settings
        this.sfxVolume = 0.8;
        this.musicVolume = 0.5;
        this.loadSettings();
    }

    init() {
        if (this.initialized) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();

            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
            this.musicGain.connect(this.masterGain);

            this.initEngineSynth();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported or blocked:', e);
        }
    }

    ensureContext() {
        if (!this.initialized) {
            this.init();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('roaddash_audio');
            if (saved) {
                const data = JSON.parse(saved);
                this.muted = !!data.muted;
                if (data.sfxVolume !== undefined) this.sfxVolume = data.sfxVolume;
                if (data.musicVolume !== undefined) this.musicVolume = data.musicVolume;
            }
        } catch (e) {}
    }

    saveSettings() {
        try {
            localStorage.setItem('roaddash_audio', JSON.stringify({
                muted: this.muted,
                sfxVolume: this.sfxVolume,
                musicVolume: this.musicVolume
            }));
        } catch (e) {}
    }

    setMuted(muted) {
        this.muted = muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(muted ? 0 : 1, this.ctx.currentTime);
        }
        this.saveSettings();
    }

    setSfxVolume(val) {
        this.sfxVolume = Math.max(0, Math.min(1, val));
        if (this.sfxGain && this.ctx) {
            this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        }
        this.saveSettings();
    }

    setMusicVolume(val) {
        this.musicVolume = Math.max(0, Math.min(1, val));
        if (this.musicGain && this.ctx) {
            this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        }
        this.saveSettings();
    }

    // -------------------------------------------------------------
    // CONTINUOUS ENGINE SYNTHESIS
    // -------------------------------------------------------------
    initEngineSynth() {
        if (!this.ctx) return;

        // Two oscillators for rich mechanical harmonics (sawtooth + triangle)
        this.engineOsc1 = this.ctx.createOscillator();
        this.engineOsc1.type = 'sawtooth';
        this.engineOsc1.frequency.setValueAtTime(45, this.ctx.currentTime);

        this.engineOsc2 = this.ctx.createOscillator();
        this.engineOsc2.type = 'triangle';
        this.engineOsc2.frequency.setValueAtTime(90, this.ctx.currentTime);

        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
        this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

        this.engineOsc1.connect(this.engineFilter);
        this.engineOsc2.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.sfxGain);

        this.engineOsc1.start();
        this.engineOsc2.start();

        // Noise buffer for engine exhaust rumble
        const bufferSize = this.ctx.sampleRate * 2;
        const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        noise.loop = true;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(160, this.ctx.currentTime);
        noiseFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

        this.engineNoiseGain = this.ctx.createGain();
        this.engineNoiseGain.gain.setValueAtTime(0, this.ctx.currentTime);

        noise.connect(noiseFilter);
        noiseFilter.connect(this.engineNoiseGain);
        this.engineNoiseGain.connect(this.sfxGain);
        noise.start();

        this.engineRunning = true;
    }

    updateEngine(speedRatio, isBoosting, isBraking) {
        if (!this.initialized || !this.engineRunning) return;
        const now = this.ctx.currentTime;

        // Base frequency 40Hz at idle, up to 180Hz at top speed
        const targetPitch = 40 + (speedRatio * 130) + (isBoosting ? 35 : 0);
        const filterCutoff = 180 + (speedRatio * 900) + (isBoosting ? 600 : 0);

        this.engineOsc1.frequency.setTargetAtTime(targetPitch, now, 0.08);
        this.engineOsc2.frequency.setTargetAtTime(targetPitch * 1.5, now, 0.08);
        this.engineFilter.frequency.setTargetAtTime(filterCutoff, now, 0.1);

        const volume = 0.08 + (speedRatio * 0.18) + (isBoosting ? 0.08 : 0);
        this.engineGain.gain.setTargetAtTime(volume, now, 0.08);
        this.engineNoiseGain.gain.setTargetAtTime(volume * 0.5, now, 0.08);
    }

    stopEngine() {
        if (!this.initialized || !this.engineGain) return;
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        if (this.engineNoiseGain) {
            this.engineNoiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        }
    }

    // -------------------------------------------------------------
    // PROCEDURAL SOUND EFFECTS (SFX)
    // -------------------------------------------------------------

    playTireScreech(intensity = 1.0) {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800 + Math.random() * 200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.25);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.Q.setValueAtTime(8.0, now);

        gain.gain.setValueAtTime(0.12 * intensity, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    playNitro() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;

        // Sub bass explosion + rising futuristic whoosh
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sine';
        subOsc.frequency.setValueAtTime(140, now);
        subOsc.frequency.exponentialRampToValueAtTime(45, now + 0.6);

        subGain.gain.setValueAtTime(0.35, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        subOsc.connect(subGain);
        subGain.connect(this.sfxGain);
        subOsc.start(now);
        subOsc.stop(now + 0.6);

        // High whoosh noise
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.2));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(2400, now + 0.4);
        filter.Q.setValueAtTime(4.0, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.25, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        noise.start(now);
    }

    playNearMiss(combo = 1) {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;

        // Doppler swoosh + ascending synth chime based on combo
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const baseFreq = 587.33; // D5
        const semitoneMultiplier = Math.pow(2, (Math.min(combo, 10) * 2) / 12);
        const pitch = baseFreq * semitoneMultiplier;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch * 0.8, now);
        osc.frequency.linearRampToValueAtTime(pitch, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(pitch * 1.25, now + 0.22);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.3);
    }

    playCoin() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;

        // Bright retro two-tone coin ping (B5 -> E6)
        [987.77, 1318.51].forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.07);

            gain.gain.setValueAtTime(0.18, now + idx * 0.07);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + idx * 0.07);
            osc.stop(now + idx * 0.07 + 0.2);
        });
    }

    playCrash() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;

        // 1. Heavy low impact thud
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);

        oscGain.gain.setValueAtTime(0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(oscGain);
        oscGain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.4);

        // 2. White noise metal crunch
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.15));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.35);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.35, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        noise.start(now);
    }

    playLevelVictory() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.12);

            gain.gain.setValueAtTime(0.2, now + idx * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.4);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + idx * 0.12);
            osc.stop(now + idx * 0.12 + 0.4);
        });
    }

    playUiClick() {
        if (!this.initialized || this.muted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    // -------------------------------------------------------------
    // PROCEDURAL ARCADE SYNTHWAVE MUSIC
    // -------------------------------------------------------------
    startMusic() {
        if (this.musicPlaying) return;
        this.ensureContext();
        this.musicPlaying = true;
        this.musicStep = 0;

        const stepTimeMs = (60 / this.bpm / 4) * 1000; // 16th notes
        this.musicTimer = setInterval(() => {
            if (!this.musicPlaying || this.muted) return;
            this.playMusicStep(this.musicStep);
            this.musicStep = (this.musicStep + 1) % 64; // 4 bar loop
        }, stepTimeMs);
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    }

    playMusicStep(step) {
        if (!this.ctx || this.ctx.state === 'suspended') return;
        const now = this.ctx.currentTime;

        // 1. Kick Drum: on steps 0, 4, 8, 12... (quarter notes)
        if (step % 4 === 0) {
            this.synthKick(now);
        }

        // 2. Snare: on steps 4, 12, 20, 28... (backbeats 2 and 4)
        if (step % 8 === 4) {
            this.synthSnare(now);
        }

        // 3. Hi-Hat: 16th notes with accent on offbeats
        if (step % 2 === 0) {
            this.synthHiHat(now, step % 4 === 2 ? 0.06 : 0.025);
        }

        // 4. Synthwave Bassline: Driving rolling 16th notes
        // Chord progression: Am (bars 1-2: steps 0-31), F (bar 3: steps 32-47), G (bar 4: steps 48-63)
        let rootFreq = 55.0; // A1
        if (step >= 32 && step < 48) rootFreq = 43.65; // F1
        if (step >= 48) rootFreq = 49.00; // G1

        // Octave bounce pattern
        const isOctave = (step % 2 === 1);
        const bassFreq = isOctave ? rootFreq * 2 : rootFreq;
        this.synthBass(now, bassFreq);

        // 5. Arpeggiated Melody Lead: on specific steps
        const barStep = step % 16;
        if (barStep === 0 || barStep === 3 || barStep === 6 || barStep === 10 || barStep === 12 || barStep === 14) {
            const chords = [
                [220.00, 261.63, 329.63, 440.00], // Am (A3, C4, E4, A4)
                [220.00, 261.63, 329.63, 440.00],
                [174.61, 220.00, 261.63, 349.23], // F  (F3, A3, C4, F4)
                [196.00, 246.94, 293.66, 392.00]  // G  (G3, B3, D4, G4)
            ];
            const currentChord = chords[Math.floor(step / 16)];
            const noteIndex = Math.floor(Math.random() * currentChord.length);
            const leadFreq = currentChord[noteIndex] * (step > 32 ? 2 : 1);
            this.synthLead(now, leadFreq);
        }
    }

    synthKick(now) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(42, now + 0.08);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.14);
    }

    synthSnare(now) {
        // Noise + body tone
        const bufferSize = this.ctx.sampleRate * 0.12;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.04));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(800, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);
        noise.start(now);
    }

    synthHiHat(now, vol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'square';
        osc.frequency.setValueAtTime(6500, now);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(7000, now);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + 0.04);
    }

    synthBass(now, freq) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(320, now);
        filter.Q.setValueAtTime(3.0, now);

        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + 0.11);
    }

    synthLead(now, freq) {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1400, now);

        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(now);
        osc.stop(now + 0.22);
    }
}

// Global sound manager instance
window.soundEngine = new SoundEngine();
