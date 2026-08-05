const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');

const Job = require('./models/Job');
const User = require('./models/User');
const ScraperLog = require('./models/ScraperLog');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/naukri_db';
const JWT_SECRET = 'NAUKRI_SECRET_KEY_2026_VIPUL';

let activeScraperProcess = null;
let currentScraperLogId = null;
let initialJobCount = 0;

let scraperStatus = {
  isRunning: false,
  startTime: null,
  processedCount: 0,
  speedJobsPerSec: 0,
  activeWorkers: 0,
  lastLog: 'Idle',
  timeRangeText: 'Last 36 Hours',
  triggeredBy: 'Manual Admin'
};

// Database Connection & Auto Admin Seeder
mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log(`[MongoDB] Connected successfully to ${MONGO_URI}`);
    await seedAdminUser();
  })
  .catch(err => console.error('[MongoDB] Connection error:', err));

async function seedAdminUser() {
  try {
    const adminEmail = 'vipulphatangare3@gmail.com';
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      const hashedPassword = await bcrypt.hash('0831', 10);
      await User.create({
        email: adminEmail,
        password: hashedPassword,
        name: 'Vipul Phatangare',
        role: 'admin'
      });
      console.log(`[Auth Seeder] Created Admin user: ${adminEmail} (password: 0831)`);
    } else {
      console.log(`[Auth Seeder] Admin user ${adminEmail} ready.`);
    }
  } catch (e) {
    console.error('[Auth Seeder Error]', e);
  }
}

// Auth Middleware
function verifyAdminToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Access token missing' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired access token' });
  }
}

// Helper to launch scraper child process
async function launchScraperProcess({ jobAge = 2, startPage = 1, pages = 150, triggerType = 'MANUAL', timeRangeText = 'Last 36 Hours', triggeredBy = 'System Admin' }) {
  if (activeScraperProcess) {
    throw new Error('A scraper process is already currently running');
  }

  initialJobCount = await Job.countDocuments({});
  const pythonScript = path.join(__dirname, '..', 'scraper', 'scraper.py');
  const args = [
    pythonScript,
    '--start-page', startPage.toString(),
    '--pages', pages.toString(),
    '--job-age', jobAge.toString(),
    '--batch-size', '10',
    '--srp-workers', '10',
    '--detail-workers', '10'
  ];

  console.log(`[Scraper Engine] Launching python ${args.join(' ')}`);

  // Create Scraper Audit Log entry
  const logDoc = await ScraperLog.create({
    triggerType,
    startTime: new Date(),
    jobAge,
    timeRangeText,
    startPage,
    endPage: pages,
    status: 'RUNNING',
    triggeredBy,
    logMessage: `Scraper started for ${timeRangeText} (Pages ${startPage}..${pages})`
  });
  currentScraperLogId = logDoc._id;

  activeScraperProcess = spawn('python', args, { cwd: path.join(__dirname, '..') });
  scraperStatus.isRunning = true;
  scraperStatus.startTime = new Date();
  scraperStatus.timeRangeText = timeRangeText;
  scraperStatus.triggeredBy = triggeredBy;
  scraperStatus.lastLog = `Started scraper for ${timeRangeText}`;

  activeScraperProcess.stdout.on('data', async (data) => {
    const text = data.toString().trim();
    console.log(`[Scraper Out] ${text}`);
    scraperStatus.lastLog = text;

    if (currentScraperLogId) {
      await ScraperLog.findByIdAndUpdate(currentScraperLogId, { logMessage: text }).catch(() => {});
    }
  });

  activeScraperProcess.stderr.on('data', (data) => {
    console.error(`[Scraper Err] ${data.toString()}`);
  });

  activeScraperProcess.on('close', async (code) => {
    console.log(`[Scraper Engine] Exited with code ${code}`);
    activeScraperProcess = null;
    scraperStatus.isRunning = false;
    scraperStatus.lastLog = `Scraper completed with exit code ${code}`;

    const finalJobCount = await Job.countDocuments({});
    const addedCount = Math.max(0, finalJobCount - initialJobCount);

    if (currentScraperLogId) {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - logDoc.startTime.getTime()) / 1000);
      await ScraperLog.findByIdAndUpdate(currentScraperLogId, {
        endTime,
        durationSeconds: duration,
        newJobsAdded: addedCount,
        totalJobsInDb: finalJobCount,
        status: code === 0 ? 'SUCCESS' : 'FAILED',
        logMessage: `Scraper finished cleanly. Added ${addedCount} new jobs.`
      }).catch(() => {});
      currentScraperLogId = null;
    }
  });
}

// Helper to launch repair scraper child process
async function launchRepairProcess({ triggerType = 'MANUAL', triggeredBy = 'System Admin' }) {
  if (activeScraperProcess) {
    throw new Error('A scraper process is already currently running');
  }

  const unscrapedCount = await Job.countDocuments({ isDeepScraped: false });
  if (unscrapedCount === 0) {
    return { message: 'All jobs in database are already 100% deep-scraped!', unscrapedCount: 0 };
  }

  initialJobCount = await Job.countDocuments({});
  const pythonScript = path.join(__dirname, '..', 'scraper', 'repair_unscraped.py');

  const logDoc = await ScraperLog.create({
    triggerType,
    startTime: new Date(),
    jobAge: 0,
    timeRangeText: `Targeted Repair (${unscrapedCount} Unscraped Jobs)`,
    startPage: 1,
    endPage: 1,
    status: 'RUNNING',
    triggeredBy,
    logMessage: `Repairing ${unscrapedCount} non-deep-scraped jobs`
  });
  currentScraperLogId = logDoc._id;

  activeScraperProcess = spawn('python', [pythonScript], { cwd: path.join(__dirname, '..') });
  scraperStatus.isRunning = true;
  scraperStatus.startTime = new Date();
  scraperStatus.timeRangeText = `Repairing ${unscrapedCount} Jobs`;
  scraperStatus.triggeredBy = triggeredBy;
  scraperStatus.lastLog = `Started repair deep scrape for ${unscrapedCount} jobs`;

  activeScraperProcess.stdout.on('data', async (data) => {
    const text = data.toString().trim();
    console.log(`[Repair Out] ${text}`);
    scraperStatus.lastLog = text;
    if (currentScraperLogId) {
      await ScraperLog.findByIdAndUpdate(currentScraperLogId, { logMessage: text }).catch(() => {});
    }
  });

  activeScraperProcess.on('close', async (code) => {
    activeScraperProcess = null;
    scraperStatus.isRunning = false;
    scraperStatus.lastLog = `Repair pass completed`;
    if (currentScraperLogId) {
      const endTime = new Date();
      const duration = Math.round((endTime.getTime() - logDoc.startTime.getTime()) / 1000);
      await ScraperLog.findByIdAndUpdate(currentScraperLogId, {
        endTime,
        durationSeconds: duration,
        status: code === 0 ? 'SUCCESS' : 'FAILED',
        logMessage: `Repaired non-deep-scraped jobs.`
      }).catch(() => {});
      currentScraperLogId = null;
    }
  });

  return { message: `Targeted deep-scraping started for ${unscrapedCount} jobs`, unscrapedCount };
}

// --- AUTOMATED CRON SCHEDULER ---

// 1. General Fresh Scraper Schedule: IST 5:00 AM (23:30 UTC previous day) & IST 2:00 PM (08:30 UTC)
// Target: Last 36 Hours (jobAge = 2)
cron.schedule('30 23,8 * * *', async () => {
  console.log('[Cron Scheduler] Triggering Automated 36-Hour Job Scrape at 5:00 AM / 2:00 PM IST...');
  try {
    await launchScraperProcess({
      jobAge: 2,
      startPage: 1,
      pages: 150,
      triggerType: 'AUTO_CRON',
      timeRangeText: 'Last 36 Hours (5 AM / 2 PM IST Schedule)',
      triggeredBy: 'Automated System Cron'
    });
  } catch (e) {
    console.error('[Cron Scheduler Failed to Launch]', e.message);
  }
});

// 2. Targeted Deep-Scraping Repair Schedule: IST 7:00 AM (01:30 UTC) & IST 4:00 PM (10:30 UTC)
// Checks if any non-deep-scraped jobs exist in MongoDB and repairs them automatically
cron.schedule('30 1,10 * * *', async () => {
  console.log('[Cron Scheduler] Triggering Automated Targeted Deep-Scraping Repair at 7:00 AM / 4:00 PM IST...');
  try {
    const unscrapedCount = await Job.countDocuments({ isDeepScraped: false });
    if (unscrapedCount > 0) {
      await launchRepairProcess({
        triggerType: 'AUTO_CRON',
        triggeredBy: 'Automated Repair Cron (7 AM / 4 PM IST Schedule)'
      });
      console.log(`[Cron Repair] Launched targeted repair for ${unscrapedCount} unscraped jobs.`);
    } else {
      console.log('[Cron Repair] 100% of jobs in DB are already deep-scraped. Skipping repair pass.');
    }
  } catch (e) {
    console.error('[Cron Repair Failed to Launch]', e.message);
  }
});

// Websocket Connection
io.on('connection', (socket) => {
  console.log('[Socket.io] Client connected:', socket.id);
  socket.emit('scraper_status', scraperStatus);
});

// Periodic status broadcasting via WebSockets
setInterval(async () => {
  try {
    const totalCount = await Job.countDocuments();
    const statusPayload = {
      ...scraperStatus,
      totalScrapedJobs: totalCount
    };
    io.emit('scraper_status', statusPayload);
  } catch (e) {}
}, 2000);

// --- REST API ENDPOINTS ---

// 1. Admin Authentication Login Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Verify Current Token User
app.get('/api/auth/me', verifyAdminToken, (req, res) => {
  res.json({ user: req.user });
});

// 2. Categories & Industry Aggregation API
app.get('/api/jobs/categories', async (req, res) => {
  try {
    const rawCategories = await Job.aggregate([
      { $match: { industry: { $exists: true, $ne: "" } } },
      { $group: { _id: "$industry", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 }
    ]);

    const categories = rawCategories.map(c => ({
      name: c._id,
      count: c.count
    }));

    res.json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// 3. Scraper Logs & Execution History API
app.get('/api/scraper/logs', async (req, res) => {
  try {
    const logs = await ScraperLog.find().sort({ startTime: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scraper audit logs' });
  }
});

// 4. Admin Numerical Stats Overview API (No graphs, pure numbers)
app.get('/api/admin/stats', async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments();
    const ago30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const liveJobs = await Job.countDocuments({
      postedDate: { $gte: ago30Days },
      description: { $not: /expired|closed|no longer accepting applications/i }
    });
    const expiredJobs = totalJobs - liveJobs;

    const internshipFilter = {
      $or: [
        { title: { $regex: /internship|intern/i } },
        { employmentType: { $regex: /internship|intern/i } },
        { keySkills: { $regex: /internship|intern/i } }
      ]
    };

    const internshipsTotal = await Job.countDocuments(internshipFilter);
    const internshipsLive = await Job.countDocuments({
      ...internshipFilter,
      postedDate: { $gte: ago30Days },
      description: { $not: /expired|closed|no longer accepting applications/i }
    });
    const internshipsExpired = internshipsTotal - internshipsLive;

    const fullTimeTotal = totalJobs - internshipsTotal;
    const fullTimeLive = await Job.countDocuments({
      title: { $not: /internship|intern/i },
      employmentType: { $not: /internship|intern/i },
      postedDate: { $gte: ago30Days },
      description: { $not: /expired|closed|no longer accepting applications/i }
    });
    const fullTimeExpired = fullTimeTotal - fullTimeLive;

    const deepScrapedJobs = await Job.countDocuments({ isDeepScraped: true });
    const unscrapedJobs = await Job.countDocuments({ isDeepScraped: false });
    
    const latestLog = await ScraperLog.findOne().sort({ startTime: -1 });
    const autoCronCount = await ScraperLog.countDocuments({ triggerType: 'AUTO_CRON' });
    const manualCount = await ScraperLog.countDocuments({ triggerType: 'MANUAL' });

    res.json({
      totalJobs,
      liveJobs,
      expiredJobs,
      internshipsCount: internshipsTotal,
      internshipsLive,
      internshipsExpired,
      fullTimeCount: fullTimeTotal,
      fullTimeLive,
      fullTimeExpired,
      deepScrapedJobs,
      unscrapedJobs,
      addedLastRun: latestLog ? latestLog.newJobsAdded : 0,
      autoCronCount,
      manualCount,
      lastRunTime: latestLog ? latestLog.startTime : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

// 5. Targeted Deep Scraping for Unscraped Jobs API
app.post('/api/scraper/repair', verifyAdminToken, async (req, res) => {
  try {
    const result = await launchRepairProcess({
      triggerType: 'MANUAL',
      triggeredBy: `Admin: ${req.user.email}`
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to start repair scraper' });
  }
});

// 6. Get Scraper Status
app.get('/api/scraper/status', async (req, res) => {
  const totalCount = await Job.countDocuments();
  res.json({
    ...scraperStatus,
    totalScrapedJobs: totalCount
  });
});

// 5. Start Manual Scraper with Custom Time & Parameters
app.post('/api/scraper/start', verifyAdminToken, async (req, res) => {
  try {
    if (activeScraperProcess) {
      return res.status(400).json({ error: 'Scraper process is already running' });
    }

    const jobAge = parseInt(req.body.jobAge) || 2;
    const startPage = parseInt(req.body.startPage) || 1;
    const pages = parseInt(req.body.pages) || 150;
    const timeRangeText = req.body.timeRangeText || `Last ${jobAge * 24} Hours`;

    await launchScraperProcess({
      jobAge,
      startPage,
      pages,
      triggerType: 'MANUAL',
      timeRangeText,
      triggeredBy: `Admin: ${req.user.email}`
    });

    res.json({ message: 'Manual scraper process started successfully', status: scraperStatus });
  } catch (err) {
    console.error('Error starting scraper:', err);
    res.status(500).json({ error: err.message || 'Failed to start scraper process' });
  }
});

// 6. Stop Scraper Process
app.post('/api/scraper/stop', verifyAdminToken, (req, res) => {
  if (!activeScraperProcess) {
    return res.status(400).json({ error: 'No scraper process currently running' });
  }

  activeScraperProcess.kill('SIGTERM');
  activeScraperProcess = null;
  scraperStatus.isRunning = false;
  scraperStatus.lastLog = 'Scraper manually stopped by admin';

  res.json({ message: 'Scraper process stopped', status: scraperStatus });
});

// 7. Jobs Explorer - Paginated Search & Multi-Filter API
app.get('/api/jobs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 12, 200);
    const search = req.query.search || '';
    const location = req.query.location || '';
    const minExp = req.query.minExp ? parseInt(req.query.minExp) : null;
    const skill = req.query.skill || '';
    const company = req.query.company || '';
    const category = req.query.category || '';
    const sortParam = req.query.sort || 'newest';
    const statusParam = req.query.status || 'live'; // 'live' (default), 'expired', 'all'
    const workType = req.query.workType || 'all'; // 'all', 'internship', 'fulltime'

    const filter = {};

    // Live Jobs Filter: Posted within 30 days & actively accepting applications
    if (statusParam === 'live') {
      const ago30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filter.postedDate = { $gte: ago30Days };
      filter.description = { $not: /expired|closed|no longer accepting applications/i };
    } else if (statusParam === 'expired') {
      const ago30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      filter.$or = [
        { postedDate: { $lt: ago30Days } },
        { description: { $regex: /expired|closed|no longer accepting applications/i } }
      ];
    }

    // Work Type Filter: Internships vs Full-time Jobs
    if (workType === 'internship') {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: { $regex: /internship|intern/i } },
          { employmentType: { $regex: /internship|intern/i } },
          { keySkills: { $regex: /internship|intern/i } }
        ]
      });
    } else if (workType === 'fulltime') {
      filter.$and = filter.$and || [];
      filter.$and.push({
        title: { $not: /internship|intern/i },
        employmentType: { $not: /internship|intern/i }
      });
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (filter.$or) {
        // combine search with existing $or
        filter.$and = [
          { $or: filter.$or },
          {
            $or: [
              { title: searchRegex },
              { 'company.name': searchRegex },
              { keySkills: searchRegex },
              { description: searchRegex }
            ]
          }
        ];
        delete filter.$or;
      } else {
        filter.$or = [
          { title: searchRegex },
          { 'company.name': searchRegex },
          { keySkills: searchRegex },
          { description: searchRegex }
        ];
      }
    }

    if (location) {
      filter.locations = { $regex: location, $options: 'i' };
    }

    if (skill) {
      filter.keySkills = { $regex: skill, $options: 'i' };
    }

    if (company) {
      filter['company.name'] = { $regex: company, $options: 'i' };
    }

    if (category) {
      filter.industry = { $regex: category, $options: 'i' };
    }

    if (minExp !== null && !isNaN(minExp)) {
      filter['experience.minYears'] = { $lte: minExp };
      filter['experience.maxYears'] = { $gte: minExp };
    }

    let sortOptions = { postedDate: -1, _id: -1 };
    if (sortParam === 'oldest') {
      sortOptions = { postedDate: 1, _id: 1 };
    } else if (sortParam === 'title') {
      sortOptions = { title: 1 };
    } else if (sortParam === 'company') {
      sortOptions = { 'company.name': 1 };
    }

    const total = await Job.countDocuments(filter);
    const jobs = await Job.find(filter)
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      jobs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ error: 'Failed to retrieve jobs' });
  }
});

// 8. Single Job Detail API
app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findOne({ $or: [{ _id: req.params.id }, { jobId: req.params.id }] });
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
  } catch (err) {
    res.status(500).json({ error: 'Error fetching job detail' });
  }
});

// 9. Analytics Aggregation API
app.get('/api/jobs/analytics', async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments();

    // Top Skills Aggregation
    const topSkills = await Job.aggregate([
      { $unwind: '$keySkills' },
      { $group: { _id: '$keySkills', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Top Hiring Companies
    const topCompanies = await Job.aggregate([
      { $group: { _id: '$company.name', count: { $sum: 1 }, rating: { $first: '$company.rating' } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    // Location Distribution
    const locationStats = await Job.aggregate([
      { $unwind: '$locations' },
      { $group: { _id: '$locations', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 }
    ]);

    res.json({
      totalJobs,
      topSkills: topSkills.map(s => ({ name: s._id, count: s.count })),
      topCompanies: topCompanies.map(c => ({ name: c._id || 'Direct Employer', count: c.count, rating: c.rating })),
      locationStats: locationStats.map(l => ({ name: l._id, count: l.count }))
    });
  } catch (err) {
    console.error('Analytics aggregation error:', err);
    res.status(500).json({ error: 'Failed to compute analytics' });
  }
});

server.listen(PORT, () => {
  console.log(`[Express Backend] Listening on http://localhost:${PORT}`);
});
