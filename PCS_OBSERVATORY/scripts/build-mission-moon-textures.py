"""Build deployable Cesium moon textures from archived official source downloads.

Only deterministic crop, longitude rotation, conservative resizing, RGB conversion,
and neutral fill of unobserved pixels are used. No terrain is synthesized.
"""

from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1] / "assets" / "moons"
Image.MAX_IMAGE_PIXELS = None


def neutral_fill_unobserved(image, threshold=10, top=(102, 102, 102), bottom=(122, 122, 122)):
    """Replace only near-black data gaps with a low-frequency neutral gradient."""
    rgb = image.convert("RGB")
    luminance = rgb.convert("L")
    mask = luminance.point(lambda value: 255 if value <= threshold else 0).filter(ImageFilter.GaussianBlur(2))
    fill = Image.new("RGB", rgb.size)
    draw = ImageDraw.Draw(fill)
    for y in range(rgb.height):
        t = y / max(1, rgb.height - 1)
        color = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
        draw.line((0, y, rgb.width, y), fill=color)
    return Image.composite(fill, rgb, mask)


def remove_vertical_guide(image, center, half_width=3):
    """Remove a cartographic page guide by interpolating only across that guide."""
    rgb = image.convert("RGB")
    left = rgb.crop((center - half_width - 1, 0, center - half_width, rgb.height)).resize((half_width, rgb.height))
    right = rgb.crop((center + half_width, 0, center + half_width + 1, rgb.height)).resize((half_width, rgb.height))
    bridge = Image.blend(left, right, 0.5).resize((half_width * 2, rgb.height))
    rgb.paste(bridge, (center - half_width, 0))
    return rgb


def build(body_id, source_name, output_name, size=None, crop=None, rotate_half=False, neutral_fill=None, remove_center_guide=False):
    source = ROOT / body_id / source_name
    output = ROOT / body_id / output_name
    with Image.open(source) as opened:
        image = opened.convert("RGB")
        if crop:
            image = image.crop(crop)
        if rotate_half:
            half = image.width // 2
            image = ImageChops.offset(image, half, 0)
        if remove_center_guide:
            image = remove_vertical_guide(image, image.width // 2)
        if neutral_fill:
            image = neutral_fill_unobserved(image, **neutral_fill)
        if size and image.size != size:
            image = image.resize(size, Image.Resampling.LANCZOS)
        output.parent.mkdir(parents=True, exist_ok=True)
        image.save(output, "JPEG", quality=92, subsampling=0, optimize=True, progressive=True)
        print(f"{body_id}: {source.name} {opened.size} -> {output.name} {image.size}")


for body in ("phobos", "deimos", "io", "europa", "ganymede", "callisto"):
    build(body, "source.tif", f"{body}-global-1440.jpg")

build("titan", "source.jpg", "titan-global-2048.jpg", size=(2048, 1024),
      crop=(170, 216, 3974, 2118), rotate_half=True, remove_center_guide=True)
build("enceladus", "source.tif", "enceladus-global-4096.jpg", size=(4096, 2048))
build("titania", "source.tif", "titania-global-1440.jpg",
      neutral_fill={"threshold": 10, "top": (92, 94, 96), "bottom": (112, 114, 116)})
build("triton", "source.jpg", "triton-global-4096.jpg", size=(4096, 2048),
      neutral_fill={"threshold": 7, "top": (176, 165, 160), "bottom": (196, 181, 173)})
