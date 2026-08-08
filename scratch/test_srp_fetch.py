import asyncio
import re
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

async def main():
    async with async_playwright() as p:
        print("--- Testing Chromium with Chrome Channel & NetworkIdle ---")
        try:
            browser = await p.chromium.launch(
                headless=True,
                channel="chrome",
                args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
            )
        except Exception as e:
            print(f"Channel chrome failed: {e}")
            browser = await p.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
            )

        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")

        print("Navigating to https://www.naukri.com/jobs-in-india-1 ...")
        res = await page.goto("https://www.naukri.com/jobs-in-india-1", wait_until="networkidle", timeout=30000)
        await page.evaluate("window.scrollTo(0, 1500)")
        await page.wait_for_timeout(2000)

        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')

        status = res.status if res else 'None'
        title = soup.title.text.strip() if soup.title else 'No Title'
        tuples = soup.find_all(['div', 'article'], class_=re.compile(r'srp-jobtuple-wrapper|cust-job-tuple|jobTuple|tuple'))
        matches = re.findall(r'(\d{10,12})', content)

        print(f"Status: {status} | Length: {len(content)} bytes | Title: {title}")
        print(f"DOM Tuples Found: {len(tuples)}")
        print(f"Unique 10-12 Digit Job IDs: {len(set(matches))}")

        await context.close()
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
