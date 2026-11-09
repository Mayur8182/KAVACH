import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = os.path.abspath("Kavach-Product-Video/assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

WIDTH = 1920
HEIGHT = 1080

def create_title_card(title, subtitle, filename, badge="KAVACH PLATFORM"):
    img = Image.new("RGBA", (WIDTH, HEIGHT), (10, 15, 29, 255))
    draw = ImageDraw.Draw(img)

    # Subtle radial/linear glow in center
    for r in range(400, 0, -20):
        alpha = int((1 - r / 400.0) * 45)
        draw.ellipse([WIDTH//2 - r, HEIGHT//2 - r, WIDTH//2 + r, HEIGHT//2 + r], fill=(59, 130, 246, alpha))

    # Try default fonts or system font
    try:
        font_badge = ImageFont.truetype("arialbd.ttf", 22)
        font_title = ImageFont.truetype("arialbd.ttf", 64)
        font_sub = ImageFont.truetype("arial.ttf", 32)
    except Exception:
        font_badge = font_title = font_sub = ImageFont.load_default()

    # Draw Badge
    badge_w = 260
    badge_h = 42
    bx = (WIDTH - badge_w) // 2
    by = HEIGHT // 2 - 160
    draw.rounded_rectangle([bx, by, bx + badge_w, by + badge_h], radius=21, fill=(30, 41, 59, 220), outline=(59, 130, 246, 200), width=2)
    draw.text((WIDTH // 2, by + badge_h // 2), badge, font=font_badge, fill=(96, 165, 250, 255), anchor="mm")

    # Draw Title
    draw.text((WIDTH // 2, HEIGHT // 2 - 50), title, font=font_title, fill=(255, 255, 255, 255), anchor="mm")

    # Draw Subtitle
    draw.text((WIDTH // 2, HEIGHT // 2 + 50), subtitle, font=font_sub, fill=(148, 163, 184, 255), anchor="mm")

    out_path = os.path.join(ASSETS_DIR, filename)
    img.save(out_path, "PNG")
    print(f"Created title card: {out_path}", flush=True)

def create_lower_third(tag, headline, filename):
    w, h = 640, 100
    img = Image.new("RGBA", (w, h), (15, 23, 42, 230))
    draw = ImageDraw.Draw(img)

    # Left colored accent bar
    draw.rectangle([0, 0, 8, h], fill=(59, 130, 246, 255))
    # Border
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
    print(f"Created lower-third banner: {out_path}", flush=True)

def main():
    print("=== Generating Title Cards & Lower-Third Badges ===", flush=True)
    create_title_card(
        "KAVACH SECURITY CONTROL PLANE",
        "Autonomous DevSecOps & AI Security Engineering",
        "intro_title_card.png",
        badge="ENTERPRISE LAUNCH 2026"
    )
    create_title_card(
        "DETERMINISTIC SECURITY. ZERO FALSE POSITIVES.",
        "LLMs Propose • Policy Engines Decide • Runtime Evidence Proves",
        "outro_title_card.png",
        badge="KAVACH DEFENSE"
    )

    create_lower_third("Live Posture Engine", "Security HQ & Multi-Surface Risk", "banner_01_hq.png")
    create_lower_third("Connected Repositories", "Deep AST Ingestion & Secret Scan", "banner_02_repos.png")
    create_lower_third("Findings Intelligence", "Correlated Triage & Reachability", "banner_03_findings.png")
    create_lower_third("Agentic Security", "AI Assistant Attack Path Analysis", "banner_04_assistant.png")
    create_lower_third("Remediation Engine", "Deterministic Patch & Sandbox Proof", "banner_05_remediation.png")
    print("=== Assets Generation Finished! ===", flush=True)

if __name__ == "__main__":
    main()

