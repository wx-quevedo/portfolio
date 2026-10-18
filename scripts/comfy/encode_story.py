"""Splice the five rendered segments and encode the web versions of the story film.

    uv run --with pillow python scripts/comfy/encode_story.py [--src build/story-src/1280x720]

- Joins seg_1..seg_5 without repeating the shared frame (the last frame of one segment is the
  first of the next): 65 + 4 x 64 = 321 frames, ~20 s at 16 fps.
- Segment 5 (heritage -> VR Runner) always ends in a hard cut with Wan 2.2, so its last
  CROSSFADE frames are blended into its final frame (an editorial dissolve).
- Encodes MP4 (H.264) and WebM (VP9), 1280 and 720 wide, no audio, short GOP for scrubbing,
  raising CRF until each file is <= MAX_MB. Writes the first frame as the poster JPG.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "public/media/story"
POSTER = ROOT / "src/assets/story/poster.jpg"
FPS = 16
CROSSFADE = 24  # frames (1.5 s) at the end of segment 5
MAX_MB = 6.0


def smoothstep(x: float) -> float:
    return x * x * (3 - 2 * x)


def join(src: Path) -> Path:
    joined = src / "joined"
    shutil.rmtree(joined, ignore_errors=True)
    joined.mkdir(parents=True)
    n = 0
    for k in range(1, 6):
        frames = sorted((src / f"seg_{k}").glob("frame_*.png"))
        if k > 1:
            frames = frames[1:]
        last = Image.open(frames[-1]).convert("RGB")
        fade_from = len(frames) - 1 - CROSSFADE
        for i, f in enumerate(frames):
            img = Image.open(f).convert("RGB")
            if k == 5 and fade_from <= i < len(frames) - 1:
                alpha = smoothstep((i - fade_from + 1) / (CROSSFADE + 1))
                img = Image.blend(img, last, alpha)
            img.save(joined / f"f_{n:05d}.png")
            n += 1
    print(f"joined {n} frames ({n / FPS:.2f} s)")
    return joined


def ffmpeg(args: list[str]) -> None:
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *args], check=True)


def encode(joined: Path, width: int, codec: str, gop: int, crf: int, out: Path) -> float:
    common = ["-framerate", str(FPS), "-i", str(joined / "f_%05d.png"), "-vf", f"scale={width}:-2:flags=lanczos", "-an"]
    if codec == "mp4":
        ffmpeg([*common, "-c:v", "libx264", "-preset", "slow", "-profile:v", "high", "-pix_fmt", "yuv420p",
                "-crf", str(crf), "-g", str(gop), "-keyint_min", str(gop), "-sc_threshold", "0",
                "-movflags", "+faststart", str(out)])
    else:
        ffmpeg([*common, "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-b:v", "0", "-crf", str(crf),
                "-g", str(gop), "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", str(out)])
    return out.stat().st_size / 1_000_000


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", default="build/story-src/1280x720")
    args = parser.parse_args()
    src = ROOT / args.src
    joined = join(src)

    OUT.mkdir(parents=True, exist_ok=True)
    POSTER.parent.mkdir(parents=True, exist_ok=True)
    Image.open(joined / "f_00000.png").convert("RGB").save(POSTER, quality=88, optimize=True, progressive=True)

    report = {"frames": len(list(joined.glob("f_*.png"))), "fps": FPS, "crossfade_frames_seg5": CROSSFADE, "files": []}
    # (gop, crf) attempts from best to smallest; the first one under MAX_MB wins.
    # H.264 stays all-intra (every frame a keyframe). VP9 all-intra cannot reach 6 MB at 1280,
    # so it falls back to a keyframe every 4 or 8 frames (0.25-0.5 s), still smooth to scrub.
    attempts = {
        "mp4": [(1, c) for c in range(20, 35, 2)],
        "webm": [(1, c) for c in (32, 36)] + [(4, c) for c in (32, 36, 40)] + [(8, c) for c in (36, 40, 44)],
    }
    for width in (1280, 720):
        for codec in ("mp4", "webm"):
            out = OUT / f"story-{width}.{codec}"
            for gop, crf in attempts[codec]:
                mb = encode(joined, width, codec, gop, crf, out)
                if mb <= MAX_MB:
                    break
            report["files"].append({"file": out.name, "mb": round(mb, 2), "crf": crf, "gop": gop})
            print(f"{out.name}: {mb:.2f} MB (crf {crf}, gop {gop})")
    (src / "encode_report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
