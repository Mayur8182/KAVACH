from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        
        page.goto("http://localhost:3002/login", wait_until="domcontentloaded")
        page.fill("#login-email", "demo@kavach.security")
        page.fill("#login-password", "KavachDemo2026!")
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)
        
        links = page.eval_on_selector_all(
            "aside a, nav a",
            "els => els.map(e => ({href: e.getAttribute('href'), text: e.innerText.trim().replace(/\\n+/g, ' ')}))"
        )
        print(f"Total sidebar links: {len(links)}")
        for l in links:
            if l['href']:
                print(f"  {l['href']:<25} -> {l['text']}")
        browser.close()

if __name__ == "__main__":
    main()

