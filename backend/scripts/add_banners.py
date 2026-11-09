import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = os.path.abspath("Kavach-Product-Video/assets")

def create_lower_third(tag, headline, filename):
    w, h = 640, 100
    img = Image.new("RGBA", (w, h), (15, 23, 42, 230))
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, 8, h], fill=(59, 130, 246, 255))
    draw.rectangle([0, 0, w - 1, h - 1], outline=(51, 65, 85, 200), width=1)

    try:
        font_tag = ImageFont.truetype("arialbd.ttf", 16)
        font_head = ImageFont.truetype("arialbd.ttf", 24)
    except Exception:
        font_tag = font_head = ImageFont.load_default()

    draw.text((28, 26), tag.upper(), font=font_tag, fill=(96, 165, 250, 255))
    draw.text((28, 54), headline, font=font_head, fill=(241, 245, 249, 255))

    out_path = os.path.join(ASSETS_DIR, filename)
    img.save(out_path, "PNG")
    print(f"Created banner: {out_path}", flush=True)

if __name__ == "__main__":
    create_lower_third("Scanner Executions", "Security Runs & Live Pipeline Logs", "banner_runs.png")
    create_lower_third("Static Analysis", "SAST Engine & AST Taint Analysis", "banner_sast.png")
    create_lower_third("Secret Detection", "High-Entropy Keys & Credential Leaks", "banner_secrets.png")

