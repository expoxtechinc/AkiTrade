from pathlib import Path

from PIL import Image


ASSETS = [
    "icon.png",
    "splash-icon.png",
    "favicon.png",
    "android-icon-foreground.png",
]

base = Path(__file__).resolve().parents[1] / "assets" / "images"
for filename in ASSETS:
    path = base / filename
    image = Image.open(path).convert("RGBA")
    image.thumbnail((512, 512), Image.Resampling.LANCZOS)
    image.save(path, format="PNG", optimize=True, compress_level=9)
    print(f"optimized {filename}: {path.stat().st_size} bytes")
