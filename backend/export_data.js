const fs = require('fs');
const path = require('path');
const mongoose = require(path.join(__dirname, 'node_modules', 'mongoose'));
const Job = require('./models/Job');
const User = require('./models/User');
const ScraperLog = require('./models/ScraperLog');

async function exportData() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/naukri_db');
    console.log('[Export] Connected to local MongoDB.');

    const jobs = await Job.find({}).lean();
    const users = await User.find({}).lean();
    const logs = await ScraperLog.find({}).lean();

    console.log(`[Export] Extracting ${jobs.length} jobs, ${users.length} users, and ${logs.length} logs...`);
    
    const exportPath = path.join(__dirname, '..', 'naukri_export.json');
    fs.writeFileSync(exportPath, JSON.stringify({ jobs, users, logs }));
    
    const stats = fs.statSync(exportPath);
    console.log(`[Export Complete] Saved file to naukri_export.json (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);

  } catch (err) {
    console.error('Export Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

exportData();
