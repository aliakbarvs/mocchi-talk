#!/usr/bin/env python3
"""Generate Mocchi Talk narration clips with Qwen3-TTS Pip-style VoiceDesign."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import soundfile as sf
import torch
from qwen_tts import Qwen3TTSModel

PIP_INSTRUCT = (
    "Distinctly original young-adult female comic-adventure heroine. Bold, cheeky, "
    "confident and theatrical, with punchy rhythm, expressive emphasis, quick reactions "
    "and fearless playful attitude. Clear natural English, not overly high-pitched. "
    "Do not imitate or resemble any existing actor, anime character, celebrity, or "
    "copyrighted voice. Do not sound like a child."
)

CLIPS = {
    "hello": "Hi hi! I'm Mocchi. Let's learn softly today.",
    "feel": "I feel warm and ready. How is your heart today?",
    "word": "Konnichiwa means hello in Japanese.",
    "joke": "Why did the tea leaf smile? It found its perfect matcha.",
    "tap-hello": "Squish! Mocchi is listening.",
    "tap-feel": "That tickles. Tell me a tiny thought.",
    "tap-word": "Small steps make big language magic.",
    "tap-joke": "You're doing great, one word at a time.",
    "practice-complete": "Mocchi heard a brave practice voice.",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("public/audio/mocchi"))
    parser.add_argument("--model", default="Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    model = Qwen3TTSModel.from_pretrained(
        args.model,
        device_map="cpu",
        dtype=torch.bfloat16,
    )
    manifest: dict[str, object] = {
        "engine": "Qwen3-TTS",
        "model": args.model,
        "voice": "Pip-style original VoiceDesign",
        "language": "English",
        "instruction": PIP_INSTRUCT,
        "clips": {},
    }

    for clip_id, text in CLIPS.items():
        output_path = args.output / f"{clip_id}.wav"
        started = time.perf_counter()
        print(f"Generating {clip_id}: {text}", flush=True)
        wavs, sample_rate = model.generate_voice_design(
            text=text,
            language="English",
            instruct=PIP_INSTRUCT,
        )
        sf.write(output_path, wavs[0], sample_rate, subtype="PCM_16")
        info = sf.info(output_path)
        elapsed = time.perf_counter() - started
        manifest["clips"][clip_id] = {
            "text": text,
            "path": f"/audio/mocchi/{output_path.name}",
            "sample_rate": info.samplerate,
            "channels": info.channels,
            "duration_seconds": round(info.duration, 3),
            "generation_seconds": round(elapsed, 3),
            "realtime_factor": round(elapsed / max(info.duration, 0.001), 3),
        }
        print(
            f"Wrote {output_path} ({info.duration:.2f}s, {elapsed:.1f}s generation)",
            flush=True,
        )

    manifest_path = args.output / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {manifest_path}")


if __name__ == "__main__":
    main()
