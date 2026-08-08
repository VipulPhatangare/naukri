import asyncio
import json
import re
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup

async def main():
    url = "https://www.naukri.com/job-listings-motor-underwriter-icici-lombard-050826036962"
    print(f"Testing Detail URL with Chrome Channel: {url}")
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            channel="chrome",
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )
        page = await context.new_page()
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")

        res = await page.goto(url, wait_until="domcontentloaded", timeout=25000)
        await page.wait_for_timeout(2000)

        content = await page.content()
        soup = BeautifulSoup(content, 'html.parser')

        print(f"Status: {res.status if res else 'None'} | HTML Length: {len(content)} bytes")
        print(f"Title: {soup.title.text.strip() if soup.title else 'No Title'}")

        # Extract JSON-LD
        desc_text = ""
        for js in soup.find_all('script', type='application/ld+json'):
            if js.string and 'JobPosting' in js.string:
                try:
                    jp_data = json.loads(js.string)
                    jp_desc = jp_data.get('description', '')
                    if jp_desc:
                        desc_text = BeautifulSoup(jp_desc, 'html.parser').get_text(separator="\n").strip()
                        print(f"JSON-LD Extracted! Length: {len(desc_text)} chars")
                        print(f"Content: {desc_text}")
                        break
                except Exception:
                    pass

        await context.close()
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
