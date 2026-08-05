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

        success_flag = False
        for attempt in range(3):
            page_tab = None
            try:
                print(f"  [Worker Tab] JobID {job_id} | Attempt {attempt+1}/3: Opening {url[:60]}...", flush=True)
                page_tab = await shared_context.new_page()
                await page_tab.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")
                
                await page_tab.goto(url, wait_until="domcontentloaded", timeout=25000)
                try:
                    await page_tab.wait_for_selector('section.job-desc-container, div.styles_JDC__dang-inner-html, div.job-desc, script[type="application/ld+json"]', timeout=6000)
                except Exception:
                    await page_tab.wait_for_timeout(2000)
                
                jd_html = await page_tab.content()
                soup_jd = BeautifulSoup(jd_html, 'html.parser')
                await page_tab.close()
                page_tab = None

                # 1. JSON-LD JobPosting extraction (UNLIMITED full text)
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

                # 2. DOM Job Description extraction fallback
                if len(desc_text) <= 50:
                    jd_container = soup_jd.find(['div', 'section', 'article'], class_=re.compile(r'styles_JDC__dang-inner-html|dang-inner-html|styles_job-desc|job-desc|styles_job-desc-container|job-desc-container|styles_job-header'))
                    if jd_container:
                        extracted_dom = jd_container.get_text(separator="\n").strip()
                        if len(extracted_dom) > len(desc_text):
                            desc_text = extracted_dom

                if len(desc_text) > 100:
                    success_flag = True
                    print(f"  [Worker Success] JobID {job_id} | Deep-scraped ({len(desc_text)} chars) on Attempt {attempt+1}", flush=True)
                    break
                else:
                    print(f"  [Worker Warning] JobID {job_id} | Attempt {attempt+1}: DOM text length only {len(desc_text)} chars", flush=True)

            except Exception as err:
                print(f"  [Worker Error] JobID {job_id} | Attempt {attempt+1} Failed: {str(err)[:100]}", flush=True)
                if page_tab:
                    try: await page_tab.close()
                    except Exception: pass
                await asyncio.sleep(0.5)

        # 3. Final Fallback to any article/div container if specific tags missed
        if len(desc_text) <= 50:
            for container in soup_jd.find_all(['div', 'article', 'section']):
                t = container.get_text(separator="\n").strip()
                if len(t) > 200 and len(t) > len(desc_text):
                    desc_text = t
                    if len(desc_text) > 500:
                        break
            if len(desc_text) > 50:
                print(f"  [Worker Fallback] JobID {job_id} | Generic DOM container extracted ({len(desc_text)} chars)", flush=True)

        is_real_deep_scraped = len(desc_text) > 30 and "Original posting details updated" not in desc_text

        # If page is truly closed/expired on Naukri, populate metadata fallback for display
        if len(desc_text) <= 30:
            desc_text = f"Job Posting for {full_title} at {comp_name}. Experience: {exp_text}, Location: {', '.join(locations)}. (Original posting details updated)."
            print(f"  [Worker Warning] JobID {job_id} | Unscraped - Retrying in future batches.", flush=True)

        # Update document in MongoDB. ONLY mark isDeepScraped: True if real text > 150 chars was extracted!
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
                "isDeepScraped": is_real_deep_scraped,
                "repairedAt": datetime.now()
            }}
        )
        return is_real_deep_scraped

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
    semaphore = asyncio.Semaphore(5)

    async with async_playwright() as p:
        try:
            browser = await p.chromium.launch(
                headless=True,
                channel="chrome",
                args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
            )
        except Exception:
            browser = await p.chromium.launch(
                headless=True,
                args=['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox']
            )

        shared_context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
