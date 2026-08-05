const fs = require('fs');
const path = require('path');
const mongoose = require(path.join(__dirname, 'node_modules', 'mongoose'));
const Job = require('./models/Job');
const User = require('./models/User');
const ScraperLog = require('./models/ScraperLog');

async function importData() {
  try {
    const exportPath = path.join(__dirname, '..', 'naukri_export.json');
    if (!fs.existsSync(exportPath)) {
      console.error('[Error] File naukri_export.json not found in root directory!');
      return;
    }

    console.log('[Import] Reading naukri_export.json file...');
    const rawData = fs.readFileSync(exportPath, 'utf8');
    const { jobs, users, logs } = JSON.parse(rawData);

    await mongoose.connect('mongodb://127.0.0.1:27017/naukri_db');
    console.log('[Import] Connected to target MongoDB.');

    console.log('[Import] Clearing target collections...');
    await Job.deleteMany({});
    await User.deleteMany({});
    await ScraperLog.deleteMany({});

    console.log(`[Import] Inserting ${jobs.length} jobs into MongoDB...`);
    const BATCH_SIZE = 2000;
    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      await Job.insertMany(batch, { ordered: false }).catch(() => {});
      console.log(`[Import Progress] Inserted ${Math.min(i + BATCH_SIZE, jobs.length)} / ${jobs.length} jobs`);
    }

    if (users && users.length > 0) {
      await User.insertMany(users).catch(() => {});
    }
    if (logs && logs.length > 0) {
      await ScraperLog.insertMany(logs).catch(() => {});
    }

    console.log('[Import Complete] MongoDB sync completed successfully!');
  } catch (err) {
    console.error('[Import Failed]', err);
  } finally {
    await mongoose.disconnect();
  }
}

importData();
