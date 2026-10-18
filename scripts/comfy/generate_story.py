"""Generate the "The story" film with Wan 2.2 First-Last-Frame to Video on a ComfyUI server.

Five segments (1->2, 2->3, 3->4, 4->5, 5->6) between six Behance stills, saved as PNG frames.

Usage (PowerShell):
    $env:COMFY_URL = "http://<comfy-host>:8188"
    uv run --with pillow python scripts/comfy/generate_story.py --segments 1 --width 832 --height 480   # test
    uv run --with pillow python scripts/comfy/generate_story.py                                         # all, 1280x720

Output (not committed): build/story-src/<WxH>/seg_<k>/frame_00000.png ... and render_log.json.
Splice and encode afterwards with scripts/comfy/encode_story.ps1.
"""

from __future__ import annotations

import argparse
import copy
import io
import json
import os
import time
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
WORKFLOW = Path(__file__).with_name("wan22_flf2v_api.json")
PRESETS = {
    # Stills as originally specified (two of them show a person).
    "spec": [
        "unity-matlab-simulator-1.png",
        "robot-teleoperation-1.jpg",
        "automotive-assembling-1.jpg",
        "drone-instrumentation-2.jpg",
        "antique-buildings-3.jpg",
        "vr-runner-4.jpg",
    ],
    # Same projects and order, with people-free stills for robot teleoperation and VR Runner.
    # With "spec", Wan invents human figures when morphing towards a person.
    "no-people": [
        "unity-matlab-simulator-1.png",
        "robot-teleoperation-3.jpg",
        "automotive-assembling-1.jpg",
        "drone-instrumentation-2.jpg",
        "antique-buildings-3.jpg",
        "vr-runner-2.jpg",
    ],
    # Variant with the ground-level VR Runner still (maze entrance).
    "no-people-vr1": [
        "unity-matlab-simulator-1.png",
        "robot-teleoperation-3.jpg",
        "automotive-assembling-1.jpg",
        "drone-instrumentation-2.jpg",
        "antique-buildings-3.jpg",
        "vr-runner-1.jpg",
    ],
}
# Pixels to trim (left, top, right, bottom) before fitting: editor toolbar and screen frames.
TRIM = {
    "unity-matlab-simulator-1.png": (0, 22, 0, 0),
    "robot-teleoperation-3.jpg": (14, 14, 14, 14),
}
SEED = 20261018


def comfy_url() -> str:
    return os.environ.get("COMFY_URL", "http://127.0.0.1:8188").rstrip("/")


def request(path: str, data: bytes | None = None, headers: dict | None = None) -> bytes:
    req = urllib.request.Request(comfy_url() + path, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=120) as res:
        return res.read()


def upload_image(name: str, png: bytes) -> str:
    boundary = uuid.uuid4().hex
    body = io.BytesIO()
    for field, value in (("overwrite", "true"), ("type", "input")):
        body.write(f'--{boundary}\r\nContent-Disposition: form-data; name="{field}"\r\n\r\n{value}\r\n'.encode())
    body.write(
        f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\n'
        f"Content-Type: image/png\r\n\r\n".encode()
    )
    body.write(png)
    body.write(f"\r\n--{boundary}--\r\n".encode())
    res = json.loads(
        request("/upload/image", body.getvalue(), {"Content-Type": f"multipart/form-data; boundary={boundary}"})
    )
    return res["name"]


def prepare_stills(sources: list[str], width: int, height: int, out_dir: Path) -> list[str]:
    """Center-crop each still to the target aspect ratio (no distortion), resize, upload."""
    names = []
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, src in enumerate(sources, start=1):
        img = Image.open(ROOT / "src/assets/behance" / src).convert("RGB")
        left, top, right, bottom = TRIM.get(src, (0, 0, 0, 0))
        img = img.crop((left, top, img.width - right, img.height - bottom))
        fitted = ImageOps.fit(img, (width, height), Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        local = out_dir / f"still_{i:02d}.png"
        fitted.save(local)
        names.append(upload_image(f"portfolio_story_{Path(src).stem}_{width}x{height}.png", local.read_bytes()))
    return names


def run_segment(k: int, start: str, end: str, args: argparse.Namespace, out_dir: Path) -> dict:
    wf = copy.deepcopy(json.loads(WORKFLOW.read_text(encoding="utf-8")))
    wf["11"]["inputs"]["image"] = start
    wf["12"]["inputs"]["image"] = end
    wf["13"]["inputs"].update(width=args.width, height=args.height, length=args.length)
    wf["14"]["inputs"]["noise_seed"] = args.seed
    wf["15"]["inputs"]["noise_seed"] = args.seed
    wf["17"]["inputs"]["filename_prefix"] = f"portfolio_story/{args.width}x{args.height}_seg{k}"
    if args.no_lora:
        # Plain Wan 2.2 (official template settings): skip the lightx2v LoRAs, 20 steps, cfg 3.5.
        wf["5"]["inputs"]["model"] = ["1", 0]
        wf["6"]["inputs"]["model"] = ["2", 0]
        for node in ("14", "15"):
            wf[node]["inputs"].update(steps=args.steps, cfg=args.cfg)
        wf["14"]["inputs"]["end_at_step"] = args.steps // 2
        wf["15"]["inputs"]["start_at_step"] = args.steps // 2

    t0 = time.time()
    res = json.loads(
        request("/prompt", json.dumps({"prompt": wf, "client_id": uuid.uuid4().hex}).encode(),
                {"Content-Type": "application/json"})
    )
    prompt_id = res["prompt_id"]
    while True:
        time.sleep(5)
        hist = json.loads(request(f"/history/{prompt_id}"))
        if prompt_id in hist:
            entry = hist[prompt_id]
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(f"segment {k} failed: {json.dumps(status)[:2000]}")
            if status.get("completed"):
                break
    seconds = round(time.time() - t0, 1)

    seg_dir = out_dir / f"seg_{k}"
    seg_dir.mkdir(parents=True, exist_ok=True)
    images = entry["outputs"]["17"]["images"]
    for n, im in enumerate(images):
        q = urllib.parse.urlencode({"filename": im["filename"], "subfolder": im["subfolder"], "type": im["type"]})
        (seg_dir / f"frame_{n:05d}.png").write_bytes(request(f"/view?{q}"))
    print(f"segment {k}: {len(images)} frames in {seconds} s")
    return {"segment": k, "start": start, "end": end, "frames": len(images), "seconds": seconds, "prompt_id": prompt_id}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    parser.add_argument("--length", type=int, default=65, help="frames per segment (4n+1); 65 = ~4 s at 16 fps")
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--segments", default="1,2,3,4,5", help="comma list, e.g. 1 or 1,2,3,4,5")
    parser.add_argument("--no-lora", action="store_true", help="no lightx2v LoRA (slower, more steps)")
    parser.add_argument("--steps", type=int, default=20, help="steps when --no-lora")
    parser.add_argument("--cfg", type=float, default=3.5, help="cfg when --no-lora")
    parser.add_argument("--stills", choices=sorted(PRESETS), default="no-people")
    parser.add_argument("--tag", default="", help="suffix for the output folder")
    args = parser.parse_args()

    out_dir = ROOT / "build/story-src" / f"{args.width}x{args.height}{args.tag}"
    stills = prepare_stills(PRESETS[args.stills], args.width, args.height, out_dir / "stills")
    log = {"comfy": "COMFY_URL", "stills": PRESETS[args.stills], "seed": args.seed, "width": args.width, "height": args.height,
           "length": args.length, "fps": 16, "lora": not args.no_lora,
           "steps": args.steps if args.no_lora else 4, "cfg": args.cfg if args.no_lora else 1.0, "segments": []}
    for k in [int(s) for s in args.segments.split(",")]:
        log["segments"].append(run_segment(k, stills[k - 1], stills[k], args, out_dir))
        (out_dir / "render_log.json").write_text(json.dumps(log, indent=2), encoding="utf-8")
    total = sum(s["seconds"] for s in log["segments"])
    print(f"total render time: {total} s")


if __name__ == "__main__":
    main()
