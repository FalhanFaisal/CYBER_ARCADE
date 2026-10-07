// Sound Synthesizer using Web Audio API
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.init();
    }

    init() {
        const initAudio = () => {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) {
                    this.ctx = new AudioContext();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            window.removeEventListener('keydown', initAudio);
            window.removeEventListener('click', initAudio);
        };
        window.addEventListener('keydown', initAudio);
        window.addEventListener('click', initAudio);
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    playTone(freq, type = 'sine', duration = 0.1, startVol = 0.3, endVol = 0) {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(startVol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, endVol), this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.destination || this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { }
    }

    playSweep(startFreq, endFreq, type = 'sawtooth', duration = 0.15, vol = 0.3) {
        if (this.muted || !this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(Math.max(10, endFreq), this.ctx.currentTime + duration);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) { }
    }

    click() { this.playTone(600, 'sine', 0.04, 0.15); }
    pop() { this.playSweep(300, 800, 'sine', 0.08, 0.25); }
    shoot() { this.playSweep(900, 150, 'sawtooth', 0.12, 0.2); }
    hit() { this.playSweep(150, 40, 'square', 0.15, 0.3); }
    score() {
        this.playTone(523.25, 'triangle', 0.08, 0.2);
        setTimeout(() => this.playTone(659.25, 'triangle', 0.12, 0.25), 80);
    }
    match() {
        this.playTone(440, 'sine', 0.1, 0.2);
        setTimeout(() => this.playTone(554.37, 'sine', 0.1, 0.2), 90);
        setTimeout(() => this.playTone(659.25, 'sine', 0.15, 0.25), 180);
    }
    win() {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((n, i) => {
            setTimeout(() => this.playTone(n, 'triangle', 0.15, 0.3), i * 110);
        });
    }
    lose() {
        const notes = [400, 350, 300, 220];
        notes.forEach((n, i) => {
            setTimeout(() => this.playTone(n, 'sawtooth', 0.15, 0.25), i * 120);
        });
    }
    bounce() { this.playTone(240, 'sine', 0.05, 0.2); }
}

window.arcadeAudio = new SoundEngine();
