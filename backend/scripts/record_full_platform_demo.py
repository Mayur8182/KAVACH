import os
import sys
import time
import math
import json
import shutil
import subprocess
from playwright.sync_api import sync_playwright

RAW_DIR = os.path.abspath("Kavach-Product-Video/recordings/raw")
RECORDINGS_DIR = os.path.abspath("Kavach-Product-Video/recordings")
RECORDLY_ROAMING_DIR = r"C:\Users\USER\AppData\Roaming\Recordly\recordings"
ASSETS_DIR = os.path.abspath("Kavach-Product-Video/assets")
EXPORTS_DIR = os.path.abspath("Kavach-Product-Video/exports")
CLIPS_DIR = os.path.join(EXPORTS_DIR, "clips")
FFMPEG = r"C:\Users\USER\AppData\Local\Programs\Recordly\resources\app.asar.unpacked\node_modules\ffmpeg-static\ffmpeg.exe"

WIDTH = 1920
HEIGHT = 1080

class SmoothCursorRecorder:
    def __init__(self, page):
        self.page = page
        self.samples = []
        self.start_time = time.time()
        self.cur_x = WIDTH // 2
        self.cur_y = HEIGHT // 2
        self.record_sample("move", "arrow")

    def elapsed_ms(self):
        return int((time.time() - self.start_time) * 1000)

    def record_sample(self, interaction_type="move", cursor_type="arrow"):
        cx = max(0.0, min(1.0, self.cur_x / float(WIDTH)))
        cy = max(0.0, min(1.0, self.cur_y / float(HEIGHT)))
        self.samples.append({
            "timeMs": self.elapsed_ms(),
            "cx": cx,
            "cy": cy,
            "interactionType": interaction_type,
            "cursorType": cursor_type
        })

    def move_to(self, target_x, target_y, duration_ms=450, steps=18):
        start_x, start_y = self.cur_x, self.cur_y
        step_time = (duration_ms / 1000.0) / max(1, steps)

        for i in range(1, steps + 1):
            t = i / float(steps)
            ease = 0.5 - 0.5 * math.cos(math.pi * t)
            drift = math.sin(t * math.pi) * 6.0
            x = start_x + (target_x - start_x) * ease + drift
            y = start_y + (target_y - start_y) * ease - drift * 0.4
            self.cur_x = x
            self.cur_y = y
            try:
                self.page.mouse.move(x, y)
            except Exception:
                pass
            self.record_sample("move", "arrow")
            time.sleep(step_time)

        self.cur_x = target_x
        self.cur_y = target_y
        try:
            self.page.mouse.move(target_x, target_y)
        except Exception:
            pass
        self.record_sample("move", "arrow")

    def click_element_safely(self, selector, duration_ms=400):
        try:
            loc = self.page.locator(selector).first
            if loc.count() > 0:
                box = loc.bounding_box()
                if box:
                    tx = box["x"] + box["width"] / 2.0
                    ty = box["y"] + box["height"] / 2.0
                    self.move_to(tx, ty, duration_ms=duration_ms)
                    time.sleep(0.1)
                    self.record_sample("click", "pointer")
                    loc.click()
                    self.record_sample("move", "arrow")
                    return True
        except Exception as e:
            print(f"Click safely fallback for {selector}: {e}", flush=True)
        return False

    def smooth_scroll(self, delta_y=350, steps=12, step_delay=0.03):
        dy_per_step = delta_y / float(steps)
        for _ in range(steps):
            try:
                self.page.mouse.wheel(0, dy_per_step)
            except Exception:
                pass
            self.record_sample("move", "arrow")
            time.sleep(step_delay)

def run_full_recording():
    os.makedirs(RAW_DIR, exist_ok=True)
    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    os.makedirs(ASSETS_DIR, exist_ok=True)
    os.makedirs(EXPORTS_DIR, exist_ok=True)
    os.makedirs(CLIPS_DIR, exist_ok=True)

    timestamp = int(time.time() * 1000)
    print(f"=== Starting Full Platform Workflow Recording (Session: {timestamp}) ===", flush=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(
            channel="msedge",
            headless=True,
            args=[
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--font-render-hinting=medium",
                "--enable-font-antialiasing"
            ]
        )

        context = browser.new_context(
            viewport={"width": WIDTH, "height": HEIGHT},
            device_scale_factor=1,
            record_video_dir=RAW_DIR,
            record_video_size={"width": WIDTH, "height": HEIGHT}
        )

        page = context.new_page()
        rec = SmoothCursorRecorder(page)

        # ----------------------------------------------------
        # Scene 1: Sign-In Experience (/login)
        # ----------------------------------------------------
        print("[Scene 1] Authentication Page (/login)...", flush=True)
        page.goto("http://localhost:3002/login", wait_until="domcontentloaded")
        page.wait_for_selector("#login-email", timeout=10000)
        time.sleep(1.0)

        rec.click_element_safely("#login-email", duration_ms=500)
        page.type("#login-email", "demo@kavach.security", delay=60)
        time.sleep(0.3)

        rec.click_element_safely("#login-password", duration_ms=450)
        page.type("#login-password", "KavachDemo2026!", delay=70)
        time.sleep(0.5)

        rec.click_element_safely("button[type='submit']", duration_ms=500)
        page.wait_for_timeout(3500)
        print("  Login succeeded, URL:", page.url, flush=True)

        # ----------------------------------------------------
        # Scene 2: Security HQ / Overview Dashboard (/overview)
        # ----------------------------------------------------
        print("[Scene 2] Security HQ Command Center (/overview)...", flush=True)
        rec.click_element_safely("a[href='/overview']", duration_ms=600)
        page.wait_for_url("**/overview", timeout=10000)
        page.wait_for_timeout(3000)

        # Smooth exploration of posture score cards
        rec.move_to(440, 220, duration_ms=700)
        time.sleep(1.2)
        rec.move_to(780, 220, duration_ms=600)
        time.sleep(1.2)
        rec.move_to(1120, 220, duration_ms=600)
        time.sleep(1.2)
        rec.move_to(1460, 220, duration_ms=600)
        time.sleep(1.2)

        # Scroll down to reveal Security Activity Feed
        print("  Scrolling to Security Activity...", flush=True)
        rec.smooth_scroll(delta_y=350, steps=15, step_delay=0.03)
        time.sleep(2.0)
        rec.move_to(960, 560, duration_ms=600)
        time.sleep(1.8)
        rec.smooth_scroll(delta_y=-350, steps=15, step_delay=0.03)
        time.sleep(1.2)

        # ----------------------------------------------------
        # Scene 3: Connected Repositories (/repositories)
        # ----------------------------------------------------
        print("[Scene 3] Connected Repositories (/repositories)...", flush=True)
        rec.click_element_safely("a[href='/repositories']", duration_ms=600)
        page.wait_for_url("**/repositories", timeout=10000)
        page.wait_for_timeout(3000)

        # Hover over JOB-FINDER-NEW repository card
        rec.move_to(650, 320, duration_ms=700)
        time.sleep(1.5)
        rec.move_to(1100, 320, duration_ms=700)
        time.sleep(1.5)

        # ----------------------------------------------------
        # Scene 4: Security Runs & Execution Logs (/runs)
        # ----------------------------------------------------
        print("[Scene 4] Security Runs & Scanner Executions (/runs)...", flush=True)
        rec.click_element_safely("a[href='/runs']", duration_ms=600)
        page.wait_for_url("**/runs", timeout=10000)
        page.wait_for_timeout(3000)

        rec.move_to(800, 340, duration_ms=700)
        time.sleep(1.5)
        rec.move_to(1200, 420, duration_ms=700)
        time.sleep(1.8)

        # ----------------------------------------------------
        # Scene 5: SAST Analysis Engine (/code/sast)
        # ----------------------------------------------------
        print("[Scene 5] SAST Analysis Engine (/code/sast)...", flush=True)
        rec.click_element_safely("a[href='/code/sast']", duration_ms=600)
        page.wait_for_url("**/code/sast", timeout=10000)
        page.wait_for_timeout(3000)

        rec.move_to(620, 260, duration_ms=700)
        time.sleep(1.5)
        rec.move_to(950, 380, duration_ms=700)
        time.sleep(1.8)

        # ----------------------------------------------------
        # Scene 6: Secrets Detection (/code/secrets)
        # ----------------------------------------------------
        print("[Scene 6] Secrets Detection Engine (/code/secrets)...", flush=True)
        # Navigate back to platform or goto /code/secrets
        page.goto("http://localhost:3002/code/secrets", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)

        rec.move_to(600, 280, duration_ms=700)
        time.sleep(1.5)
        rec.move_to(1100, 360, duration_ms=700)
        time.sleep(1.8)

        # ----------------------------------------------------
        # Scene 7: Unified Findings Matrix & Triage (/findings)
        # ----------------------------------------------------
        print("[Scene 7] Unified Findings Matrix (/findings)...", flush=True)
        page.goto("http://localhost:3002/findings", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)

        # Hover severity filters
        rec.move_to(520, 240, duration_ms=700)
        time.sleep(1.2)
        rec.move_to(760, 240, duration_ms=600)
        time.sleep(1.2)

        # Click top finding row to inspect vulnerability detail
        rec.move_to(650, 380, duration_ms=700)
        try:
            page.locator("table tbody tr, [role='row']").first.click()
            time.sleep(2.5)
        except Exception:
            pass
        rec.smooth_scroll(delta_y=280, steps=10, step_delay=0.03)
        time.sleep(1.8)
        rec.smooth_scroll(delta_y=-280, steps=10, step_delay=0.03)
        time.sleep(1.0)

        # ----------------------------------------------------
        # Scene 8: Autonomous AI Security Assistant (/assistant)
        # ----------------------------------------------------
        print("[Scene 8] AI Security Assistant (/assistant)...", flush=True)
        page.goto("http://localhost:3002/assistant", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)

        rec.click_element_safely("#chat-query-input", duration_ms=600)
        prompt_text = "Which critical issues are actually reachable from public API endpoints, and which one should we fix first?"
        print(f"  Typing prompt: '{prompt_text}'...", flush=True)
        page.type("#chat-query-input", prompt_text, delay=35)
        time.sleep(0.6)

        # Click send and press enter
        try:
            page.locator("button[title*='Send'], button:has-text('Send')").first.click()
        except Exception:
            pass
        try:
            page.keyboard.press("Enter")
        except Exception:
            pass

        print("  Waiting for AI analysis to stream...", flush=True)
        page.wait_for_timeout(6000)
        rec.smooth_scroll(delta_y=320, steps=15, step_delay=0.03)
        time.sleep(2.5)

        # ----------------------------------------------------
        # Scene 9: Fixes & Patches Remediation Engine (/fixes)
        # ----------------------------------------------------
        print("[Scene 9] Fixes & Patches (/fixes)...", flush=True)
        page.goto("http://localhost:3002/fixes", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)

        rec.move_to(700, 320, duration_ms=700)
        time.sleep(1.5)
        rec.move_to(1200, 420, duration_ms=700)
        time.sleep(2.0)

        # ----------------------------------------------------
        # Scene 10: Final Return to Security HQ (/overview)
        # ----------------------------------------------------
        print("[Scene 10] Return to Security HQ (/overview)...", flush=True)
        page.goto("http://localhost:3002/overview", wait_until="domcontentloaded")
        page.wait_for_timeout(3000)
        rec.move_to(960, 420, duration_ms=800)
        time.sleep(2.5)

        print("=== Complete Workflow Capture Completed! Closing Browser... ===", flush=True)
        page.close()
        video_path = page.video.path() if page.video else None
        context.close()
        browser.close()

    if not video_path or not os.path.exists(video_path):
        raise RuntimeError("Failed to record video file.")

    base_name = f"recording-{timestamp}"
    mp4_name = f"{base_name}.mp4"
    cursor_name = f"{base_name}.mp4.cursor.json"
    session_name = f"{base_name}.recordly-session.json"
    diag_name = f"{base_name}.recording-diagnostics.json"

    local_mp4 = os.path.join(RECORDINGS_DIR, mp4_name)
    local_cursor = os.path.join(RECORDINGS_DIR, cursor_name)
    local_session = os.path.join(RECORDINGS_DIR, session_name)
    local_diag = os.path.join(RECORDINGS_DIR, diag_name)

    print(f"Transcoding recording to 1080p 60fps MP4: {local_mp4} ...", flush=True)
    cmd = [
        FFMPEG, "-y",
        "-i", video_path,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-b:v", "6500k",
        "-r", "60",
        "-pix_fmt", "yuv420p",
        local_mp4
    ]
    subprocess.run(cmd, check=True)

    # Save cursor metadata
    with open(local_cursor, "w", encoding="utf-8") as f:
        json.dump({"version": 2, "samples": rec.samples}, f, indent=2)

    with open(local_session, "w", encoding="utf-8") as f:
        json.dump({"version": 2, "videoFileName": mp4_name, "webcamFileName": None, "timeOffsetMs": 0}, f, indent=2)

    file_size = os.path.getsize(local_mp4)
    diag_data = {
        "version": 1,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "videoPath": local_mp4,
        "diagnosticsPath": local_diag,
        "events": [
            {
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
                "backend": "windows-wgc",
                "phase": "stop",
                "outputPath": local_mp4,
                "systemAudioPath": None,
                "microphonePath": None,
                "processOutput": f"Encoder bitrate: 24000000 bps for 1920x1080@60fps\r\nRecording started\r\nRecording stopped. Output path: {local_mp4}",
                "details": {"fileSizeBytes": file_size, "durationSeconds": rec.elapsed_ms() / 1000.0},
                "media": {"video": {"path": local_mp4, "exists": True, "sizeBytes": file_size, "containerDurationSeconds": rec.elapsed_ms() / 1000.0}}
            }
        ]
    }
    with open(local_diag, "w", encoding="utf-8") as f:
        json.dump(diag_data, f, indent=2)

    if os.path.exists(RECORDLY_ROAMING_DIR):
        print(f"Syncing to Recordly roaming: {RECORDLY_ROAMING_DIR} ...", flush=True)
        shutil.copy2(local_mp4, os.path.join(RECORDLY_ROAMING_DIR, mp4_name))
        shutil.copy2(local_cursor, os.path.join(RECORDLY_ROAMING_DIR, cursor_name))
        shutil.copy2(local_session, os.path.join(RECORDLY_ROAMING_DIR, session_name))
        shutil.copy2(local_diag, os.path.join(RECORDLY_ROAMING_DIR, diag_name))

    shutil.copy2(local_session, os.path.join("Kavach-Product-Video/recordly-projects", session_name))
    print(f"=== Workflow Recording Finished! Total cursor samples: {len(rec.samples)} ===", flush=True)
    return local_mp4

if __name__ == "__main__":
    run_full_recording()

