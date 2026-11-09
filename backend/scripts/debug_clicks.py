from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto("http://localhost:3002/login", wait_until="domcontentloaded")
        page.fill("#login-email", "demo@kavach.security")
        page.fill("#login-password", "KavachDemo2026!")
        page.click("button[type='submit']")
        page.wait_for_timeout(3500)
        print("After login url:", page.url)

        routes_to_test = [
            "/overview",
            "/repositories",
            "/findings",
            "/assistant",
            "/fixes",
            "/runs",
            "/code/sast",
            "/code/secrets"
        ]

        for route in routes_to_test:
            sel = f"a[href='{route}']"
            loc = page.locator(sel).first
            cnt = loc.count()
            print(f"Selector {sel}: found={cnt}")
            if cnt > 0:
                box = loc.bounding_box()
                print(f"  Box for {sel}: {box}")
                loc.click()
                page.wait_for_timeout(2500)
                print(f"  URL after click: {page.url}")
            else:
                # If not found via exact selector, let's see why
                pass
        browser.close()

if __name__ == "__main__":
    main()

