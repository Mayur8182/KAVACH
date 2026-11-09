from playwright.sync_api import sync_playwright

def inspect():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        page.goto("http://localhost:3002/login", wait_until="domcontentloaded")
        page.fill("#login-email", "demo@kavach.security")
        page.fill("#login-password", "KavachDemo2026!")
        page.click("button[type='submit']")
        page.wait_for_timeout(3000)

        page.goto("http://localhost:3002/code/sast", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        
        all_links = page.eval_on_selector_all("a", "els => els.map(e => ({href: e.getAttribute('href'), text: e.innerText.trim()}))")
        print(f"Total links on /code/sast: {len(all_links)}")
        for l in all_links:
            if l['href'] and any(k in l['href'] for k in ['code', 'secrets', 'findings', 'fixes', 'assistant', 'overview', 'runs', 'repo']):
                print(f"  {l['href']} -> {l['text']}")
        browser.close()

if __name__ == "__main__":
    inspect()

