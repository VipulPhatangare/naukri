import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Database, Search, ShieldCheck } from 'lucide-react';
import JobExplorer from './components/JobExplorer';
import JobDetailModal from './components/JobDetailModal';
import AdminDashboard from './components/AdminDashboard';

const SOCKET_URL = 'http://localhost:5000';

// Helper to load persistent state from URL query & localStorage
const getInitialState = () => {
  const urlParams = new URLSearchParams(window.location.search);
  let savedState = {};
  try {
    const savedStr = localStorage.getItem('naukri_app_state');
    if (savedStr) savedState = JSON.parse(savedStr);
  } catch (e) {}

  const activeTab = urlParams.get('tab') || savedState.activeTab || 'explorer';
  const searchParams = {
    search: urlParams.get('search') ?? savedState.searchParams?.search ?? '',
    location: urlParams.get('location') ?? savedState.searchParams?.location ?? '',
    skill: urlParams.get('skill') ?? savedState.searchParams?.skill ?? '',
    company: urlParams.get('company') ?? savedState.searchParams?.company ?? '',
    category: urlParams.get('category') ?? savedState.searchParams?.category ?? '',
    status: urlParams.get('status') ?? savedState.searchParams?.status ?? 'live',
    workType: urlParams.get('workType') ?? savedState.searchParams?.workType ?? 'all',
    sort: urlParams.get('sort') ?? savedState.searchParams?.sort ?? 'newest',
    limit: parseInt(urlParams.get('limit')) || savedState.searchParams?.limit || 12,
    page: parseInt(urlParams.get('page')) || savedState.searchParams?.page || 1
  };

  return { activeTab, searchParams };
};

export default function App() {
  const initialState = getInitialState();
  const [activeTab, setActiveTab] = useState(initialState.activeTab); // 'explorer' | 'admin'
  const [scraperStatus, setScraperStatus] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [pagination, setPagination] = useState({ page: initialState.searchParams.page, limit: initialState.searchParams.limit, total: 0, totalPages: 1 });
  const [searchParams, setSearchParams] = useState(initialState.searchParams);
  const [selectedJob, setSelectedJob] = useState(null);

  // Initialize Socket.io connection for real-time scraper progress updates
  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('[Socket.io] Connected to scraper backend');
    });

    socket.on('scraper_status', (data) => {
      setScraperStatus(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchJobs = async (params = searchParams) => {
    try {
      const query = new URLSearchParams({
        page: params.page || 1,
        limit: params.limit || 12,
        sort: params.sort || 'newest',
        status: params.status || 'live',
        workType: params.workType || 'all',
        search: params.search || '',
        location: params.location || '',
        skill: params.skill || '',
        company: params.company || '',
        category: params.category || ''
      }).toString();

      const res = await fetch(`/api/jobs?${query}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs);
        setPagination(data.pagination);
      }
    } catch (e) {
      console.error('Failed to fetch jobs:', e);
    }
  };

  // Sync state to URL parameters & localStorage on any tab/filter change
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab) params.set('tab', activeTab);
    if (searchParams.search) params.set('search', searchParams.search);
    if (searchParams.location) params.set('location', searchParams.location);
    if (searchParams.skill) params.set('skill', searchParams.skill);
    if (searchParams.company) params.set('company', searchParams.company);
    if (searchParams.category) params.set('category', searchParams.category);
    if (searchParams.status) params.set('status', searchParams.status);
    if (searchParams.workType) params.set('workType', searchParams.workType);
    if (searchParams.sort) params.set('sort', searchParams.sort);
    if (searchParams.limit) params.set('limit', searchParams.limit.toString());
    if (searchParams.page > 1) params.set('page', searchParams.page.toString());

    const newUrl = window.location.pathname + '?' + params.toString();
    window.history.replaceState(null, '', newUrl);

    try {
      localStorage.setItem('naukri_app_state', JSON.stringify({ activeTab, searchParams }));
    } catch (e) {}

    fetchJobs(searchParams);
  }, [activeTab, searchParams]);

  // Actions
  const handleStartScraper = async (mode) => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch('/api/scraper/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ mode, jobAge: 2, timeRangeText: 'Last 36 Hours' })
      });
    } catch (e) {
      console.error('Error starting scraper:', e);
    }
  };

  const handleStopScraper = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      await fetch('/api/scraper/stop', {
        method: 'POST',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
    } catch (e) {
      console.error('Error stopping scraper:', e);
    }
  };

  const handleSearchChange = (newFilters) => {
    setSearchParams(prev => ({ ...prev, ...newFilters }));
  };

  const handlePageChange = (newPage) => {
    setSearchParams(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Database size={24} />
          </div>
          <div>
            <h1 className="gradient-text" style={{ fontSize: '1.6rem', fontWeight: 800 }}>
              Naukri Job Intelligence Platform
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              43,210 Deep-Scraped Job Listings Across India
            </p>
          </div>
        </div>

        {/* Tab Switchers */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.04)', padding: '0.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setActiveTab('explorer')}
            style={{
              background: activeTab === 'explorer' ? 'var(--primary-blue)' : 'transparent',
              color: activeTab === 'explorer' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '9px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Search size={16} /> Job Explorer ({pagination.total ? pagination.total.toLocaleString() : 0})
          </button>

          <button 
            onClick={() => setActiveTab('admin')}
            style={{
              background: activeTab === 'admin' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
              color: activeTab === 'admin' ? '#fff' : 'var(--text-muted)',
              border: 'none',
              padding: '0.6rem 1.25rem',
              borderRadius: '9px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
          >
            <ShieldCheck size={16} /> Admin Control Center
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      {activeTab === 'explorer' && (
        <JobExplorer 
          jobs={jobs}
          pagination={pagination}
          searchParams={searchParams}
          onSearchChange={handleSearchChange}
          onPageChange={handlePageChange}
          onSelectJob={(job) => setSelectedJob(job)}
        />
      )}

      {activeTab === 'admin' && (
        <AdminDashboard 
          scraperStatus={scraperStatus}
          onStartScraper={handleStartScraper}
          onStopScraper={handleStopScraper}
        />
      )}

      {/* Job Detail Modal Drawer */}
      {selectedJob && (
        <JobDetailModal 
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}
