from pymongo import MongoClient

MONGO_URI = "mongodb://127.0.0.1:27017/naukri_db"

def reset_fallbacks():
    client = MongoClient(MONGO_URI)
    db = client.naukri_db
    
    query = {"description": {"$regex": "Original posting details updated"}}
    count_before = db.jobs.count_documents(query)
    
    print(f"Found {count_before} jobs with fallback text.")
    
    if count_before > 0:
        res = db.jobs.update_many(
            query,
            {"$set": {"isDeepScraped": False}}
        )
        print(f"Successfully reset {res.modified_count} jobs to isDeepScraped: False!")
    else:
        print("No fallback jobs found. Everything is clean!")
        
    client.close()

if __name__ == "__main__":
    reset_fallbacks()
