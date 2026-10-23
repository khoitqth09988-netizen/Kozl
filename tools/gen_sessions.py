#!/usr/bin/env python3
"""Generate a small set of original ambient / lo-fi instrumental sketches
for the Kozl demo catalogue. Pure numpy synthesis, rendered to WAV then MP3.
"""
import os
import subprocess
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 44100
OUT_DIR = os.path.join(ROOT, "music", "sessions")
TMP_DIR = os.environ.get("KOZL_TMP", "/tmp/kozl_audio")
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(TMP_DIR, exist_ok=True)

rng = np.random.default_rng(7)

NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5,
        "F#": 6, "Gb": 6, "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def midi(name):
    """'A3' -> midi number."""
    if name[-1].isdigit():
        octave = int(name[-1])
        pitch = name[:-1]
    else:
        octave = int(name[-2:])
        pitch = name[:-2]
    return 12 * (octave + 1) + NOTE[pitch]


def hz(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def t_axis(n):
    return np.arange(n, dtype=np.float32) / SR


def fade_all(n, sr=SR):
    t = t_axis(n)
    return t


def lowpass(sig, cutoff, order=2):
    spec = np.fft.rfft(sig)
    freqs = np.fft.rfftfreq(len(sig), 1 / SR)
    gain = 1.0 / (1.0 + (freqs / cutoff) ** order)
    return np.fft.irfft(spec * gain, n=len(sig)).astype(np.float32)


def highpass(sig, cutoff, order=2):
    spec = np.fft.rfft(sig)
    freqs = np.fft.rfftfreq(len(sig), 1 / SR)
    gain = 1.0 / (1.0 + (cutoff / np.maximum(freqs, 1e-6)) ** order)
    return np.fft.irfft(spec * gain, n=len(sig)).astype(np.float32)


def bandpass(sig, low, high):
    return lowpass(highpass(sig, low), high)


def reverb(sig, seconds=2.2, mix=0.25, predelay=0.02, brightness=4200):
    n_ir = int(seconds * SR)
    t = np.arange(n_ir) / SR
    ir = rng.normal(0, 1, n_ir).astype(np.float32)
    ir *= np.exp(-t * 3.1)
    ir = lowpass(ir, brightness)
    ir[: int(predelay * SR)] = 0
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    n = len(sig) + n_ir - 1
    wet = np.fft.irfft(np.fft.rfft(sig, n) * np.fft.rfft(ir, n), n)
    wet = wet[: len(sig)].astype(np.float32)
    return sig * (1 - mix) + wet * mix * 2.2


def delay(sig, time_s, feedback=0.35, taps=5, mix=0.3):
    d = int(time_s * SR)
    out = sig.copy()
    for k in range(1, taps + 1):
        if k * d >= len(sig):
            break
        out[k * d:] += sig[: len(sig) - k * d] * (feedback ** k)
    return sig * (1 - mix) + out * mix


def add(buf, sig, at):
    start = int(at)
    if start >= len(buf):
        return
    end = min(len(buf), start + len(sig))
    buf[start:end] += sig[: end - start]


def pad_note(freq, dur, detune=0.0, attack=1.0, release=1.6, amp=0.16, bright=2200):
    n = int((dur + release) * SR)
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    sig = (
        1.00 * np.sin(2 * np.pi * f * t)
        + 0.42 * np.sin(2 * np.pi * 2 * f * t + 0.3)
        + 0.20 * np.sin(2 * np.pi * 3 * f * t + 1.1)
        + 0.10 * np.sin(2 * np.pi * 4 * f * t + 2.0)
    ).astype(np.float32)
    env = np.ones(n, dtype=np.float32)
    a = min(n, int(attack * SR))
    env[:a] = np.linspace(0, 1, a) ** 1.6
    r = min(n, int(release * SR))
    env[-r:] *= np.linspace(1, 0, r) ** 1.5
    # long, slow swell
    env *= 0.86 + 0.14 * np.sin(2 * np.pi * 0.07 * t + rng.random() * 6)
    sig = lowpass(sig, bright) * env * amp
    return sig.astype(np.float32)


def pluck(freq, dur=1.2, amp=0.12):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (
        np.sin(2 * np.pi * freq * t)
        + 0.30 * np.sin(2 * np.pi * 2 * freq * t)
        + 0.10 * np.sin(2 * np.pi * 3 * freq * t)
    ).astype(np.float32)
    env = np.exp(-t * 5.0)
    atk = int(0.006 * SR)
    env[:atk] *= np.linspace(0, 1, atk)
    return (sig * env * amp).astype(np.float32)


def bell(freq, dur=2.0, amp=0.09):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (
        np.sin(2 * np.pi * freq * t)
        + 0.45 * np.sin(2 * np.pi * freq * 2.01 * t)
        + 0.22 * np.sin(2 * np.pi * freq * 3.98 * t)
    ).astype(np.float32)
    return (sig * np.exp(-t * 2.2) * amp).astype(np.float32)


def bass_note(freq, dur, amp=0.22):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sig = (np.sin(2 * np.pi * freq * t) + 0.16 * np.sin(2 * np.pi * 2 * freq * t)).astype(np.float32)
    env = np.ones(n, dtype=np.float32)
    atk = int(0.012 * SR)
    env[:atk] = np.linspace(0, 1, atk)
    env *= np.exp(-t * 1.4)
    rel = int(0.09 * SR)
    env[-rel:] *= np.linspace(1, 0, rel)
    return (sig * env * amp).astype(np.float32)


def kick(amp=0.5):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 112 * np.exp(-t * 22) + 42
    phase = 2 * np.pi * np.cumsum(f) / SR
    sig = np.sin(phase) * np.exp(-t * 10)
    click = rng.normal(0, 1, n) * np.exp(-t * 140) * 0.25
    return lowpass((sig + click) * amp, 4800).astype(np.float32)


def snare(amp=0.22):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n).astype(np.float32)
    body = bandpass(noise, 1400, 5200) * np.exp(-t * 20)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28) * 0.5
    return ((body + tone) * amp).astype(np.float32)


def hat(amp=0.06, open_=False):
    n = int((0.35 if open_ else 0.09) * SR)
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n).astype(np.float32)
    sig = highpass(noise, 6500) * np.exp(-t * (9 if open_ else 55))
    return (sig * amp).astype(np.float32)


def vinyl(n, amp=0.006):
    hiss = lowpass(rng.normal(0, 1, n).astype(np.float32), 7800) * 0.5
    crackle = np.zeros(n, dtype=np.float32)
    count = int(n / SR * 9)
    idx = rng.integers(0, n - 200, count)
    crackle[idx] = rng.normal(0, 1, count) * 1.4
    crackle = lowpass(crackle, 9000)
    return ((hiss + crackle) * amp).astype(np.float32)


def rain(n, amp=0.035):
    t = np.arange(n) / SR
    noise = rng.normal(0, 1, n).astype(np.float32)
    bed = bandpass(noise, 900, 7500) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.11 * t))
    drops = np.zeros(n, dtype=np.float32)
    count = int(n / SR * 3)
    for _ in range(count):
        at = rng.integers(0, max(1, n - int(0.25 * SR)))
        ln = int(rng.uniform(0.03, 0.12) * SR)
        tt = np.arange(ln) / SR
        f = rng.uniform(1800, 5200)
        drops[at:at + ln] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * 60) * rng.uniform(0.2, 1)
    return ((bed * 0.8 + drops * 0.35) * amp).astype(np.float32)


def stereoize(mono, width=0.0035):
    # gentle Haas-ish widening: tiny delay on one side + subtle channel decorrelation
    d = int(width * SR)
    left = mono.copy()
    right = np.pad(mono, (d, 0))[: len(mono)] * 0.97
    right += lowpass(rng.normal(0, 1, len(mono)).astype(np.float32), 6000) * 0.0004
    return np.stack([left, right], axis=1)


def render(cfg):
    bpm = cfg["bpm"]
    beat = 60 / bpm
    bar = beat * 4
    bars = cfg["bars"]
    total = bar * bars + 3
    n = int(total * SR)
    pad_bus = np.zeros(n, dtype=np.float32)
    key_bus = np.zeros(n, dtype=np.float32)
    bass_bus = np.zeros(n, dtype=np.float32)
    drum_bus = np.zeros(n, dtype=np.float32)
    perc_bus = np.zeros(n, dtype=np.float32)

    chords = cfg["chords"]
    prog = [(bar * b, chords[b % len(chords)]) for b in range(bars)]
    sections = cfg["sections"]

    def layer(bar_index, name):
        for (start, end, modes) in sections:
            if start <= bar_index < end and name in modes:
                return True
        return False

    for b, (at, chord) in enumerate(prog):
        root = chord[0]
        # pads
        if layer(b, "pad"):
            for j, m in enumerate(chord):
                amp = 0.055 if j == 0 else 0.042
                for det in (-0.0022, 0.0021):
                    note_sig = pad_note(hz(m), bar * 1.02, detune=det, amp=amp,
                                        attack=cfg.get("pad_attack", 0.9),
                                        release=cfg.get("pad_release", 1.4),
                                        bright=cfg.get("pad_bright", 2000))
                    add(pad_bus, note_sig, at * SR + (j * 0.013) * SR)
        # bass
        if layer(b, "bass"):
            pattern = cfg.get("bass_pattern", [(0, 1.7), (2.5, 1.2)])
            for offset, length in pattern:
                add(bass_bus, bass_note(hz(root - 12) if root >= 40 else hz(root), length * beat * cfg.get("bass_len", 1.0),
                                        amp=0.20), (at + offset * beat) * SR)
        # keys arpeggio
        if layer(b, "keys"):
            chord_tones = [chord[0] + 12, chord[1] + 12, chord[2] + 12, chord[3] + 12]
            pattern = cfg.get("key_pattern", [0, 2, 1, 2, 3, 2, 1, 2])
            step = beat / 2
            for i, idx in enumerate(pattern):
                if rng.random() < cfg.get("key_skip", 0.08):
                    continue
                note_m = chord_tones[idx % len(chord_tones)] + cfg.get("key_shift", 12)
                swing = 0.035 * beat if i % 2 else 0
                velocity = rng.uniform(0.65, 1.0) * cfg.get("key_amp", 0.085)
                sig = pluck(hz(note_m), dur=cfg.get("pluck_len", 1.4), amp=velocity)
                add(key_bus, sig, (at + i * step + swing) * SR)
        # sparse bell motif
        if layer(b, "bells") and b % cfg.get("bell_every", 2) == 0:
            note_m = chord[2] + 24 + (12 if rng.random() < 0.3 else 0)
            add(perc_bus, bell(hz(note_m), amp=0.05), (at + beat * 0.5) * SR)
        # drums
        if layer(b, "drums"):
            for beat_pos, a in cfg.get("kick_pattern", [(0, 0.55), (2.5, 0.4)]):
                add(drum_bus, kick(a), (at + beat_pos * beat) * SR)
            for beat_pos in cfg.get("snare_pattern", [1, 3]):
                add(drum_bus, snare(0.16), (at + beat_pos * beat) * SR)
            for i in range(8):
                swing = 0.03 * beat if i % 2 else 0
                amp = rng.uniform(0.018, 0.045)
                add(drum_bus, hat(amp), (at + i * beat / 2 + swing) * SR)
            if b % 4 == 3 and rng.random() < 0.7:
                add(drum_bus, hat(0.035, open_=True), (at + 3.5 * beat) * SR)

    # effects
    key_bus = delay(key_bus, 60 / bpm * 0.75, feedback=0.34, taps=6, mix=0.4)
    pad_bus = reverb(pad_bus, seconds=cfg.get("pad_reverb", 2.6), mix=0.34)
    key_bus = reverb(key_bus, seconds=cfg.get("key_reverb", 1.9), mix=0.26)
    perc_bus = reverb(perc_bus, seconds=3.0, mix=0.4)

    if cfg.get("vinyl", True):
        vinyl_sig = vinyl(n, amp=cfg.get("vinyl_amp", 0.005))
    else:
        vinyl_sig = np.zeros(n, dtype=np.float32)

    if cfg.get("rain"):
        rain_sig = rain(n, amp=cfg.get("rain_amp", 0.03))
    else:
        rain_sig = np.zeros(n, dtype=np.float32)

    mix = pad_bus * 1.0 + key_bus * 1.0 + bass_bus * 1.0 + drum_bus * 1.0 + perc_bus * 1.0 + vinyl_sig + rain_sig
    mix = lowpass(mix, cfg.get("master_lowpass", 12000), order=2)
    mix = np.tanh(mix * cfg.get("drive", 1.15)) / np.tanh(cfg.get("drive", 1.15))
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.92

    # fade in/out
    fi = int(1.2 * SR)
    fo = int(3.5 * SR)
    mix[:fi] *= np.linspace(0, 1, fi) ** 1.4
    mix[-fo:] *= np.linspace(1, 0, fo) ** 1.2

    st = stereoize(mix, cfg.get("width", 0.003))
    st = st / (np.max(np.abs(st)) + 1e-9) * 0.9
    return st


def write_wav(path, stereo):
    pcm = (stereo * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


TRACKS = [
    {
        "file": "neon-drift",
        "title": "Neon Drift",
        "bpm": 84,
        "bars": 32,
        "chords": [[midi("A3"), midi("C4"), midi("E4"), midi("G4")],
                   [midi("F3"), midi("A3"), midi("C4"), midi("E4")],
                   [midi("C4"), midi("E4"), midi("G4"), midi("B4")],
                   [midi("G3"), midi("B3"), midi("D4"), midi("F4")]],
        "sections": [
            (0, 4, ["pad", "keys", "bells"]),
            (4, 20, ["pad", "keys", "bass", "drums", "bells"]),
            (20, 24, ["pad", "keys", "bass"]),
            (24, 32, ["pad", "keys", "bass", "drums", "bells"]),
        ],
        "key_pattern": [0, 1, 2, 3, 2, 1, 2, 3],
        "key_amp": 0.075,
        "pad_bright": 2300,
        "width": 0.006,
        "master_lowpass": 13500,
    },
    {
        "file": "midnight-tape",
        "title": "Midnight Tape",
        "bpm": 76,
        "bars": 30,
        "chords": [[midi("D3"), midi("F3"), midi("A3"), midi("C4")],
                   [midi("A#2"), midi("D3"), midi("F3"), midi("A3")],
                   [midi("G2"), midi("A#2"), midi("D3"), midi("F3")],
                   [midi("A2"), midi("C#3"), midi("E3"), midi("G3")]],
        "sections": [
            (0, 5, ["pad", "keys", "bells"]),
            (5, 21, ["pad", "keys", "bass", "drums"]),
            (21, 25, ["pad", "keys", "bells", "bass"]),
            (25, 30, ["pad", "keys", "bass", "drums"]),
        ],
        "key_pattern": [0, 2, 1, 3, 2, 1, 0, 2],
        "key_amp": 0.07,
        "pluck_len": 1.8,
        "pad_bright": 1700,
        "pad_reverb": 3.0,
        "vinyl_amp": 0.009,
        "width": 0.004,
        "master_lowpass": 10500,
        "drive": 1.35,
    },
    {
        "file": "rooftop-rain",
        "title": "Rooftop Rain",
        "bpm": 80,
        "bars": 28,
        "chords": [[midi("C3"), midi("E3"), midi("G3"), midi("B3")],
                   [midi("A2"), midi("C3"), midi("E3"), midi("G3")],
                   [midi("F2"), midi("A2"), midi("C3"), midi("E3")],
                   [midi("G2"), midi("B2"), midi("D3"), midi("F3")]],
        "sections": [
            (0, 4, ["pad", "keys", "bells"]),
            (4, 18, ["pad", "keys", "bass", "drums", "bells"]),
            (18, 22, ["pad", "keys", "bass"]),
            (22, 28, ["pad", "keys", "bass", "drums"]),
        ],
        "key_pattern": [3, 2, 1, 2, 0, 2, 1, 2],
        "key_amp": 0.072,
        "pad_bright": 2000,
        "rain": True,
        "rain_amp": 0.028,
        "width": 0.007,
    },
    {
        "file": "afterglow",
        "title": "Afterglow",
        "bpm": 68,
        "bars": 26,
        "chords": [[midi("F3"), midi("A3"), midi("C4"), midi("E4")],
                   [midi("C3"), midi("E3"), midi("G3"), midi("B3")],
                   [midi("D3"), midi("F3"), midi("A3"), midi("C4")],
                   [midi("A2"), midi("C3"), midi("E3"), midi("G3")]],
        "sections": [
            (0, 6, ["pad", "bells"]),
            (6, 18, ["pad", "keys", "bass", "bells"]),
            (18, 22, ["pad", "keys"]),
            (22, 26, ["pad", "keys", "bass", "bells"]),
        ],
        "key_pattern": [0, 2, 3, 1, 2, 3, 1, 0],
        "key_amp": 0.06,
        "pad_attack": 1.4,
        "pad_release": 2.2,
        "pad_bright": 1600,
        "pad_reverb": 3.4,
        "key_reverb": 2.6,
        "bell_every": 1,
        "width": 0.009,
        "master_lowpass": 11000,
        "drive": 1.1,
    },
]


def main():
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    for cfg in TRACKS:
        print("rendering", cfg["title"], flush=True)
        st = render(cfg)
        wav_path = os.path.join(TMP_DIR, cfg["file"] + ".wav")
        write_wav(wav_path, st)
        mp3_path = os.path.join(OUT_DIR, cfg["file"] + ".mp3")
        subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i", wav_path,
                        "-codec:a", "libmp3lame", "-b:a", "160k", mp3_path], check=True)
        dur = len(st) / SR
        print(f"  -> {cfg['title']}: {dur:.1f}s, {os.path.getsize(mp3_path)/1e6:.1f} MB", flush=True)


if __name__ == "__main__":
    main()
