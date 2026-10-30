from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
PREVIEWS = ROOT / "previews"
FONT = "/System/Library/Fonts/Hiragino Sans GB.ttc"
MONO = "/System/Library/Fonts/Menlo.ttc"

THEMES = {
    "margin": {
        "number": "01",
        "name": "页边有时",
        "en": "MARGIN & TIME",
        "description": "日期索引 + 页边注 + 当时／后来的认知对照，最安静耐看，适合长期回看。",
    },
    "grid": {
        "number": "02",
        "name": "格物手账",
        "en": "FIELD NOTES",
        "description": "方格纸 + 档案编号 + 修订留痕，工程感最强，适合技术实践与生活观察。",
    },
    "folio": {
        "number": "03",
        "name": "季候小刊",
        "en": "SEASONAL FOLIO",
        "description": "刊头 + 非对称编辑版面 + 深色随想跨页，最适合作品化与公开表达。",
    },
}


def font(size, mono=False):
    return ImageFont.truetype(MONO if mono else FONT, size)


def contain(image, width, height):
    copy = image.copy()
    copy.thumbnail((width, height), Image.Resampling.LANCZOS)
    return copy


for key, item in THEMES.items():
    canvas = Image.new("RGB", (1600, 1080), "#eeeeea")
    draw = ImageDraw.Draw(canvas)
    draw.text((48, 34), item["number"], font=font(18, True), fill="#777770")
    draw.text((98, 24), item["name"], font=font(34), fill="#20201e")
    draw.text((330, 42), item["en"], font=font(14, True), fill="#777770")
    draw.text((48, 88), "DESKTOP / 首页", font=font(12), fill="#777770")
    draw.text((1230, 88), "MOBILE / 文章", font=font(12), fill="#777770")

    desktop = contain(Image.open(PREVIEWS / f"{key}-desktop.png").convert("RGB"), 1140, 792)
    mobile = contain(Image.open(PREVIEWS / f"{key}-mobile.png").convert("RGB"), 330, 714)
    canvas.paste(desktop, (48, 122))
    canvas.paste(mobile, (1230, 122))
    draw.rectangle((47, 121, 48 + desktop.width, 122 + desktop.height), outline="#c8c8c1", width=1)
    draw.rectangle((1229, 121, 1230 + mobile.width, 122 + mobile.height), outline="#c8c8c1", width=1)

    draw.line((48, 948, 1552, 948), fill="#c8c8c1", width=1)
    draw.text((48, 978), item["description"], font=font(20), fill="#343432")
    draw.text((48, 1024), "可运行响应式主题稿 · 示例内容 · 未做 iPhone 真机验证", font=font(13), fill="#777770")
    output = PREVIEWS / f"theme-{key}.png"
    canvas.save(output, optimize=True)
    print(output.relative_to(ROOT))
