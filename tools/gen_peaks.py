#!/usr/bin/env python3
"""Tính waveform (1000 mốc) cho một hoặc nhiều tệp mp3.

    python3 tools/gen_peaks.py music/ten-bai.mp3
    python3 tools/gen_peaks.py music/*.mp3 > peaks.json

Cần: numpy, imageio-ffmpeg  (pip install numpy imageio-ffmpeg)
Kết quả in ra JSON đúng định dạng dùng trong assets/js/peaks.js
(dán object in ra vào window.KOZL_PEAKS).
"""
import json
import os
import subprocess
import sys

import numpy as np

ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
N = 1000


def ffmpeg_path():
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return "ffmpeg"


def peaks_for(path, bins=N):
    raw = subprocess.run(
        [ffmpeg_path(), "-v", "error", "-i", path, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
        capture_output=True,
    ).stdout
    if not raw:
        raise SystemExit("Không đọc được tệp: " + path)
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0
    duration = len(a) / 8000.0
    buckets = np.array_split(a, bins)
    rms = np.array([np.sqrt(np.mean(x ** 2)) if len(x) else 0 for x in buckets])
    peak = np.array([np.percentile(np.abs(x), 99.5) if len(x) else 0 for x in buckets])
    db = 20 * np.log10(rms + 1e-6)
    lo, hi = np.percentile(db, 8), np.percentile(db, 97)
    if hi - lo < 4:
        hi = lo + 4
    level = np.clip((db - lo) / (hi - lo), 0, 1) ** 0.85
    crest = np.clip(peak / (rms + 1e-6) / 3.2, 0, 1)
    vals = np.clip(level * 0.82 + crest * 0.22, 0, 1)
    k = np.array([0.12, 0.18, 0.24, 0.18, 0.12])
    vals = np.convolve(vals, k / k.sum(), mode="same")
    vals = (vals - vals.min()) / (vals.max() - vals.min() + 1e-9)
    vals = vals ** 1.5
    q = np.clip((vals * 63).round().astype(int), 0, 63)
    return {"duration": round(duration, 3), "peaks": "".join(ALPHA[i] for i in q)}


def main():
    files = sys.argv[1:]
    if not files:
        raise SystemExit(__doc__)
    out = {}
    for f in files:
        out[os.path.splitext(os.path.basename(f))[0]] = peaks_for(f)
        print("· " + f, file=sys.stderr)
    print(json.dumps(out, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
