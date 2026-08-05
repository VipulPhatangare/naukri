import asyncio
import json
import re
import time
from datetime import datetime
from bs4 import BeautifulSoup
from pymongo import MongoClient
from playwright.async_api import async_playwright

MONGO_URI = "mongodb://127.0.0.1:27017/naukri_db"

async def deep_scrape_single(job_item, shared_context, semaphore, db):
    async with semaphore:
        url = job_item['url']
        job_id = job_item['jobId']
        
        full_title = job_item.get('title', 'Job Opening')
        comp_name = job_item.get('company', {}).get('name', 'Corporate Employer')
        logo_url = job_item.get('company', {}).get('logoUrl', '')
        rating = job_item.get('company', {}).get('rating', 4.1)
        exp_text = job_item.get('experience', {}).get('rawText', '0-5 Yrs')
        sal_text = job_item.get('salary', {}).get('rawText', 'Not disclosed')
        locations = job_item.get('locations', ['PAN India'])
        desc_text = ""
        skills = job_item.get('keySkills', ["Customer Support", "Operations"])
        posted_raw = job_item.get('postedRaw', 'Recently')
        posted_date_dt = job_item.get('postedDate', datetime.now())

        for attempt in range(3):
            page_tab = None
            try:
                page_tab = await shared_context.new_page()
                await page_tab.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")
                
                await page_tab.goto(url, wait_until="domcontentloaded", timeout=25000)
                await page_tab.wait_for_timeout(2500)
                
                jd_html = await page_tab.content()
                soup_jd = BeautifulSoup(jd_html, 'html.parser')
                await page_tab.close()
                page_tab = None

                # 1. DOM Job Description extraction
                jd_container = soup_jd.find(['div', 'section'], class_=re.compile(r'styles_JDC__dang-inner-html|dang-inner-html|styles_job-desc|job-desc|styles_job-desc-container'))
                if not jd_container:
                    jd_container = soup_jd.find('section', class_=re.compile(r'job-desc-container|styles_job-header'))

                if jd_container:
                    extracted_dom = jd_container.get_text(separator="\n").strip()
                    if len(extracted_dom) > len(desc_text):
                        desc_text = extracted_dom

                # 2. JSON-LD JobPosting extraction
                jp_data = None
                for js in soup_jd.find_all('script', type='application/ld+json'):
                    if js.string and 'JobPosting' in js.string:
                        try:
                            jp_data = json.loads(js.string)
                            break
                        except Exception:
                            pass

                if jp_data:
                    full_title = jp_data.get('title', full_title)
                    jp_desc = jp_data.get('description')
                    if jp_desc:
                        clean_jp_desc = BeautifulSoup(jp_desc, 'html.parser').get_text(separator="\n").strip()
                        if len(clean_jp_desc) > len(desc_text):
                            desc_text = clean_jp_desc

                    if jp_data.get('datePosted'):
                        dp = jp_data.get('datePosted')
                        posted_raw = str(dp)[:10]
                        try:
                            posted_date_dt = datetime.fromisoformat(dp.replace('Z', '+00:00'))
                        except Exception:
                            pass

                    if jp_data.get('skills'):
                        skills = jp_data.get('skills')

                    hiring_org = jp_data.get('hiringOrganization', {})
                    if isinstance(hiring_org, dict):
                        comp_name = hiring_org.get('name', comp_name)
                        logo_url = hiring_org.get('logo', logo_url)

                if len(desc_text) > 100:
                    break
            except Exception:
                if page_tab:
                    try: await page_tab.close()
                    except Exception: pass
                await asyncio.sleep(0.5)

        if len(desc_text) > 100:
            db.jobs.update_one(
                {"jobId": job_id},
                {"$set": {
                    "title": full_title,
                    "company.name": comp_name,
                    "company.logoUrl": logo_url,
                    "description": desc_text,
                    "keySkills": skills,
                    "postedRaw": posted_raw,
                    "postedDate": posted_date_dt,
                    "isDeepScraped": True,
                    "repairedAt": datetime.now()
                }}
            )
            return True
        return False

async def main():
    client = MongoClient(MONGO_URI)
    db = client.naukri_db

    unscraped_jobs = list(db.jobs.find({"isDeepScraped": False}))
    total_to_repair = len(unscraped_jobs)
    print(f"=== REPAIR DEEP-SCRAPER STARTED: Found {total_to_repair} unscraped jobs in MongoDB ===", flush=True)

    if not unscraped_jobs:
        print("All jobs in MongoDB are already 100% deep-scraped!", flush=True)
        return

    start_t = time.time()
    semaphore = asyncio.Semaphore(10)

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
        )
        shared_context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
            viewport={'width': 1920, 'height': 1080}
        )

        batch_size = 20
        repaired_count = 0

        for i in range(0, total_to_repair, batch_size):
            batch = unscraped_jobs[i:i + batch_size]
            print(f"\n[Repairing Batch {i//batch_size + 1}/{(total_to_repair + batch_size - 1)//batch_size}] Deep scraping {len(batch)} jobs...", flush=True)
            
            tasks = [
                deep_scrape_single(job_item, shared_context, semaphore, db)
                for job_item in batch
            ]
            results = await asyncio.gather(*tasks)
            successes = sum(1 for r in results if r)
            repaired_count += successes
            
            remaining = db.jobs.count_documents({"isDeepScraped": False})
            print(f"  [Batch {i//batch_size + 1} Complete] Successfully repaired {successes}/{len(batch)} jobs. (Remaining Unscraped: {remaining})", flush=True)

        await shared_context.close()
        await browser.close()

    elapsed = time.time() - start_t
    total_deep = db.jobs.count_documents({"isDeepScraped": True})
    total_jobs = db.jobs.count_documents({})
    print(f"\n=========================================================================", flush=True)
    print(f"=== COMPLETED REPAIR SCRAPE IN {round(elapsed, 2)}s ===", flush=True)
    print(f"=== Total Jobs in DB: {total_jobs} | Fully Deep Scraped: {total_deep} ({round(total_deep/total_jobs*100, 2)}%) ===", flush=True)
    print(f"=========================================================================\n", flush=True)

if __name__ == '__main__':
    asyncio.run(main())
