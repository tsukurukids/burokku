// ========================================
// 音声システム
// ========================================

let isSoundEnabled = true;
let isBGMEnabled = false;
let bgmSynth = null;
let bgmLoop = null;
let audioContext = null;

/**
 * オーディオコンテキストを初期化
 */
function initAudio() {
    if (!audioContext) {
        try {
            if (Tone.context.state !== 'running') Tone.start();
            audioContext = Tone.context;
        } catch (e) {
            console.error('Audio initialization failed:', e);
        }
    }
}

/**
 * 効果音を再生
 * @param {number} frequency - 周波数（Hz）
 * @param {number} duration - 持続時間（秒）
 * @param {string} type - オシレータータイプ（'sine', 'square', 'triangle', 'sawtooth'）
 */
function playSound(frequency, duration, type = 'sine') {
    if (!isSoundEnabled || !audioContext) return;

    const synth = new Tone.Synth({
        oscillator: { type: type },
        envelope: {
            attack: 0.005,
            decay: 0.1,
            sustain: 0.01,
            release: duration
        },
        volume: -5
    }).toDestination();

    synth.triggerAttackRelease(frequency, duration);
}

/**
 * BGMを初期化
 */
function initBGM() {
    if (bgmSynth) {
        Tone.Transport.stop();
        bgmLoop.dispose();
        bgmSynth.dispose();
    }

    bgmSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: {
            attack: 0.05,
            decay: 0.2,
            sustain: 0.4,
            release: 1
        }
    }).toDestination();

    bgmSynth.volume.value = -12;

    const melody = [
        ["C5", "E5", "G5", "E5"],
        ["F5", "A5", "C6", "A5"],
        ["G5", "B5", "D6", "B5"],
        ["C5", "G4", "E4", "C4"]
    ];

    let m = 0;
    bgmLoop = new Tone.Loop(time => {
        melody[m % melody.length].forEach((note, i) => {
            bgmSynth.triggerAttackRelease(note, "8n", time + i * 0.25);
        });
        m++;
    }, "1m").start(0);

    Tone.Transport.bpm.value = 140;
    Tone.Transport.stop();
}

/**
 * BGMのオン/オフを切り替え
 */
function toggleBGM() {
    initAudio();
    initBGM();
    isBGMEnabled = !isBGMEnabled;

    if (isBGMEnabled) {
        Tone.Transport.start();
    } else {
        Tone.Transport.stop();
    }
}

/**
 * 効果音のオン/オフを切り替え
 */
function toggleSound() {
    initAudio();
    isSoundEnabled = !isSoundEnabled;

    if (isSoundEnabled) {
        playSound(600, 0.1);
    }
}
