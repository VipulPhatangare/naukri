const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  jobId: { type: String, required: true, unique: true, index: true },
  url: { type: String, required: true },
  title: { type: String, required: true, index: true },
  company: {
    name: { type: String, index: true },
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    logoUrl: { type: String, default: '' },
    address: { type: String, default: '' },
    about: { type: String, default: '' }
  },
  experience: {
    minYears: { type: Number, default: 0, index: true },
    maxYears: { type: Number, default: 0, index: true },
    rawText: { type: String, default: '' }
  },
  salary: {
    minLakhs: { type: Number, default: 0 },
    maxLakhs: { type: Number, default: 0 },
    rawText: { type: String, default: '' }
  },
  locations: [{ type: String, index: true }],
  description: { type: String, default: '' },
  roleCategory: { type: String, default: '' },
  department: [{ type: String }],
  industry: { type: String, default: '' },
  employmentType: { type: String, default: '' },
  qualifications: {
    ug: { type: String, default: '' },
    pg: { type: String, default: '' }
  },
  keySkills: [{ type: String, index: true }],
  postedDate: { type: Date, default: Date.now, index: true },
  postedRaw: { type: String, default: '' },
  stats: {
    openings: { type: Number, default: 1 },
    applicants: { type: String, default: '' }
  },
  scrapedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Compound text index for fast search
JobSchema.index({ 
  title: 'text', 
  'company.name': 'text', 
  keySkills: 'text',
  description: 'text'
});

module.exports = mongoose.model('Job', JobSchema);
