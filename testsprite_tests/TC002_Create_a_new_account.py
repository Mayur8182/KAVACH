import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> Enter valid details in the full name, work email, company name, and password fields.
        # Enter your full name text field
        elem = page.get_by_role("textbox", name="Full Name *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Taylor Example")
        
        # -> Enter valid details in the full name, work email, company name, and password fields.
        # you@company.com email field
        elem = page.get_by_role("textbox", name="Work Email *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("taylor.example@acme.com")
        
        # -> Enter valid details in the full name, work email, company name, and password fields.
        # Your company name text field
        elem = page.get_by_role("textbox", name="Company Name *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Acme")
        
        # -> Enter valid details in the full name, work email, company name, and password fields.
        # Create a password password field
        elem = page.get_by_role("textbox", name="Password *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("SecurePass1!")
        
        # -> Accept the terms and submit the account registration using the 'Create Account' button.
        # checkbox
        elem = page.get_by_role("checkbox", name="I agree to the Terms of")
        await elem.click(timeout=10000)
        
        # -> Accept the terms and submit the account registration using the 'Create Account' button.
        # Create Account button
        elem = page.get_by_role("button", name="Create Account")
        await elem.click(timeout=10000)
        
        # -> Fill the required Full Name, Work Email, Company Name, and Password fields with valid registration details.
        # Enter your full name text field
        elem = page.get_by_role("textbox", name="Full Name *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Taylor Example")
        
        # -> Fill the required Full Name, Work Email, Company Name, and Password fields with valid registration details.
        # you@company.com email field
        elem = page.get_by_role("textbox", name="Work Email *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("taylor.example@acme.com")
        
        # -> Fill the required Full Name, Work Email, Company Name, and Password fields with valid registration details.
        # Your company name text field
        elem = page.get_by_role("textbox", name="Company Name *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("Acme")
        
        # -> Fill the required Full Name, Work Email, Company Name, and Password fields with valid registration details.
        # Create a password password field
        elem = page.get_by_role("textbox", name="Password *")
        await elem.wait_for(state="visible", timeout=10000)
        await elem.fill("SecurePass1!")
        
        # -> Dismiss the cookie notice by choosing “Essential Only” so the registration form can be submitted.
        # Essential Only button
        elem = page.get_by_role("button", name="Essential Only")
        await elem.click(timeout=10000)
        
        # -> Accept the unchecked terms agreement on the signup form.
        # checkbox
        elem = page.get_by_role("checkbox", name="I agree to the Terms of")
        await elem.click(timeout=10000)
        
        # -> Submit the registration form with the “Create Account” button and verify the next onboarding screen.
        # Create Account button
        elem = page.get_by_role("button", name="Create Account")
        await elem.click(timeout=10000)
        
        # --> Assertions to verify final state
        
        # --> Account registration advances to the onboarding email-verification step.
        # Assert-outcome: not verified — the export-time check could not be evaluated
        # Assert: The account advances to the onboarding email-verification step.
        await expect(page).to_have_url(re.compile("/verify\\-email"), timeout=15000), "The account advances to the onboarding email-verification step."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    