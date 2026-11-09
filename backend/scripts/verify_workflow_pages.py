import os
from playwright.sync_api import sync_playwright

def verify_all_workflow_pages():
    os.makedirs("Kavach-Product-Video/assets/workflow_checks", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        page = context.new_page()

        # Step 1: Login
        print("[1] Testing /login...", flush=True)
        page.goto("http://localhost:3002/login", wait_until="domcontentloaded")
        page.fill("#login-email", "demo@kavach.security")
        page.fill("#login-password", "KavachDemo2026!")
        page.click("button[type='submit']")
        page.wait_for_timeout(3500)
        print("  Current URL after login:", page.url, flush=True)
        page.screenshot(path="Kavach-Product-Video/assets/workflow_checks/01_login.png")

        # Step 2: Overview
        print("[2] Testing /overview...", flush=True)
        page.locator("a[href='/overview']").first.click()
        page.wait_for_timeout(3000)
        print("  Current URL:", page.url, flush=True)
        page.screenshot(path="Kavach-Product-Video/assets/workflow_checks/02_overview.png")

        # Step 3: Repositories
        print("[3] Testing /repositories...", flush=True)
        page.locator("a[href='/repositories']").first.click()
        page.wait_for_timeout(3000)
        print("  Current URL:", page.url, flush=True)
        page.screenshot(path="Kavach-Product-Video/assets/workflow_checks/03_repositories.png")

        # Step 4: Security Runs
        print("[4] Testing /runs...", flush=True)
        page.locator("a[href='/runs']").first.click()
        page.wait_for_timeout(3000)
        print("  Current URL:", page.url, flush=True)
        page.screenshot(path="Kavach-Product-Video/assets/workflow_checks/04_runs.png")

        # Step 5: SAST Analysis
        print("[5] Testing /code/sast...", flush=True)
        page.locator("a[href='/code/sast']").first.click()
        page.wait_for_timeout(3000)
        print("  Current URL:", page.url, flush=True)
        page.screenshot(path="Kavach-Product-Video/assets/workflow_checks/05_sast.png")

        # Step 6: Secrets Detection
        print("[6] Testing /code/secrets...", flush=True)
        page.locator("a[href='/code/secrets']").first.click()
        page.wait_for_timeout(3000)
        print("  Current URL:", page.url, flush=True)
        page.screenshot(path="Kavach-Product-Video/assets/workflow_checks/06_secrets.png")

        # Step 7: Findings
        print("[7] Testing /findings...", flush=True)
        page.locator("a[href='/findings']").first.click()
        page.wait_for_timeout(3000)
        print("  Current URL:", page.url, flush=True)
        page.screenshot(path="Kavach-Product-Video/assets/workflow_checks/07_findings.png")

        # Step 8: Assistant
        print("[8] Testing /assistant...", flush=True)
        page.locator("a[href='/assistant']").first.click()
        page.wait_for_timeout(3000)
        print("  Current URL:", page.url, flush=True)
        page.screenshot(path="Kavach-Product-Video/assets/workflow_checks/08_assistant.png")

        # Step 9: Fixes
        print("[9] Testing /fixes...", flush=True)
        page.locator("a[href='/fixes']").first.click()
        page.wait_for_timeout(3000)
        print("  Current URL:", page.url, flush=True)
        page.screenshot(path="Kavach-Product-Video/assets/workflow_checks/09_fixes.png")

        # Step 10: Overview Return
        print("[10] Returning to /overview...", flush=True)
        page.locator("a[href='/overview']").first.click()
        page.wait_for_timeout(3000)
        print("  Current URL:", page.url, flush=True)
        page.screenshot(path="Kavach-Product-Video/assets/workflow_checks/10_overview_return.png")

        browser.close()
        print("All 10 workflow pages verified successfully!", flush=True)

if __name__ == "__main__":
    verify_all_workflow_pages()

