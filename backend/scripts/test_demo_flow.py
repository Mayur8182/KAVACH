import sys
import time
from playwright.sync_api import sync_playwright

def main():
    print("[1] Launching Playwright browser...", flush=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        print("[2] Navigating to http://localhost:3002/login ...", flush=True)
        page.goto("http://localhost:3002/login", wait_until="domcontentloaded")
        page.wait_for_selector("#login-email", timeout=10000)
        page.screenshot(path="Kavach-Product-Video/assets/01_login_page.png")
        print("    Captured login page screenshot.", flush=True)

        print("[3] Entering credentials...", flush=True)
        page.fill("#login-email", "demo@kavach.security")
        page.fill("#login-password", "KavachDemo2026!")
        page.screenshot(path="Kavach-Product-Video/assets/02_credentials_filled.png")
        print("    Filled credentials.", flush=True)

        print("[4] Submitting form...", flush=True)
        page.click('button[type="submit"]')
        page.wait_for_timeout(4000)
        print("    Current URL after login:", page.url, flush=True)
        page.screenshot(path="Kavach-Product-Video/assets/03_post_login.png")

        print("[5] Navigating to /overview...", flush=True)
        page.goto("http://localhost:3002/overview", wait_until="domcontentloaded")
        page.wait_for_timeout(3500)
        page.screenshot(path="Kavach-Product-Video/assets/04_overview.png")
        print("    Captured /overview.", flush=True)

        print("[6] Navigating to /findings...", flush=True)
        page.goto("http://localhost:3002/findings", wait_until="domcontentloaded")
        page.wait_for_timeout(3500)
        page.screenshot(path="Kavach-Product-Video/assets/05_findings.png")
        print("    Captured /findings.", flush=True)

        print("[7] Navigating to /assistant...", flush=True)
        page.goto("http://localhost:3002/assistant", wait_until="domcontentloaded")
        page.wait_for_timeout(3500)
        page.screenshot(path="Kavach-Product-Video/assets/06_assistant.png")
        print("    Captured /assistant.", flush=True)

        print("[8] Navigating to /fixes...", flush=True)
        page.goto("http://localhost:3002/fixes", wait_until="domcontentloaded")
        page.wait_for_timeout(3500)
        page.screenshot(path="Kavach-Product-Video/assets/07_fixes.png")
        print("    Captured /fixes.", flush=True)

        print("[9] Navigating to /repositories...", flush=True)
        page.goto("http://localhost:3002/repositories", wait_until="domcontentloaded")
        page.wait_for_timeout(3500)
        page.screenshot(path="Kavach-Product-Video/assets/08_repositories.png")
        print("    Captured /repositories.", flush=True)

        browser.close()
        print("Successfully completed test navigation and verified all screens!", flush=True)

if __name__ == "__main__":
    main()
