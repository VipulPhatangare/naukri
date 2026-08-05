const mongoose = require('mongoose');

const ScraperLogSchema = new mongoose.Schema({
  triggerType: {
    type: String,
    enum: ['AUTO_CRON', 'MANUAL'],
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  jobAge: {
    type: Number,
    default: 2
  },
  timeRangeText: {
    type: String,
    default: 'Last 36 Hours'
  },
  startPage: {
    type: Number,
    default: 1
  },
  endPage: {
    type: Number,
    default: 150
  },
  newJobsAdded: {
    type: Number,
    default: 0
  },
  totalJobsInDb: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['RUNNING', 'SUCCESS', 'FAILED'],
    default: 'RUNNING'
  },
  triggeredBy: {
    type: String,
    default: 'System'
  },
  logMessage: {
    type: String,
    default: 'Scraper started'
  }
});

module.exports = mongoose.model('ScraperLog', ScraperLogSchema);
