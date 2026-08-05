import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Mail, Play, Square, RefreshCw, AlertTriangle, Calendar, Activity, Database, UserCheck, LogOut, Wrench, CheckCircle } from 'lucide-react';

export default function AdminDashboard({ scraperStatus, onStartScraper, onStopScraper }) {
  const [token, setToken] = useState(localStorage.getItem('adminToken') || '');
  const [user, setUser] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Numerical Stats Overview State (No Graphs)
  const [stats, setStats] = useState({
    totalJobs: 0,
    deepScrapedJobs: 0,
    unscrapedJobs: 0,
    addedLastRun: 0,
    autoCronCount: 0,
    manualCount: 0
  });

  // Scraper Controls State
  const [jobAgeSelect, setJobAgeSelect] = useState('2');
  const [timeRangeTextSelect, setTimeRangeTextSelect] = useState('Last 36 Hours');
  const [startPageInput, setStartPageInput] = useState(1);
  const [pagesInput, setPagesInput] = useState(150);

  // Audit Logs State
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);

  // Verify Admin Token on Mount
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Token invalid');
        })
        .then(data => setUser(data.user))
        .catch(() => {
          localStorage.removeItem('adminToken');
          setToken('');
          setUser(null);
        });
    }
  }, [token]);

  // Fetch Numerical Stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch admin stats:', e);
    }
  };

  // Fetch Audit Logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/scraper/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLogs();
    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || 'Authentication failed');
        return;
      }

      localStorage.setItem('adminToken', data.token);
      setToken(data.token);
      setUser(data.user);
      setLoginEmail('');
      setLoginPassword('');
      fetchStats();
      fetchLogs();
    } catch (e) {
      setLoginError('Server connection error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken('');
    setUser(null);
  };

  const handleStartManualScraper = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/scraper/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobAge: parseInt(jobAgeSelect),
          startPage: parseInt(startPageInput),
          pages: parseInt(pagesInput),
          timeRangeText: timeRangeTextSelect
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setModalMessage({ title: 'Engine Error', text: data.error || 'Failed to start scraper process', type: 'error' });
      } else {
        setModalMessage({ title: 'Scraper Launched', text: `Scraper engine started for ${timeRangeTextSelect} (Pages ${startPageInput}..${pagesInput})`, type: 'success' });
        fetchStats();
        fetchLogs();
      }
    } catch (e) {
      setModalMessage({ title: 'Connection Error', text: 'Error connecting to backend API', type: 'error' });
    }
  };

  const handleStopManualScraper = async () => {
    try {
      await fetch('/api/scraper/stop', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setModalMessage({ title: 'Engine Stopped', text: 'Scraper engine manually stopped', type: 'info' });
      fetchStats();
      fetchLogs();
    } catch (e) {
      console.error('Error stopping scraper:', e);
    }
  };

  const handleRunTargetedRepair = async () => {
    setRepairing(true);
    try {
      const res = await fetch('/api/scraper/repair', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setModalMessage({ title: 'Targeted Deep Repair', text: data.message || 'Targeted deep scraping launched successfully!', type: 'success' });
      fetchStats();
      fetchLogs();
    } catch (e) {
      setModalMessage({ title: 'Repair Error', text: 'Error connecting to repair API', type: 'error' });
    } finally {
      setRepairing(false);
    }
  };

  const handleTimeSelectChange = (e) => {
    const val = e.target.value;
    setJobAgeSelect(val);
    const textMap = {
      '0': 'Last 5-10 Hours',
      '1': 'Last 24 Hours',
      '2': 'Last 36 Hours',
      '5': 'Last 5 Days',
      '10': 'Last 10 Days',
      '15': 'Last 15 Days'
    };
    setTimeRangeTextSelect(textMap[val] || `Last ${val} Days`);
  };

  // If Not Authenticated: Render Admin Login Form
  if (!user) {
    return (
      <div style={{ maxWidth: '440px', margin: '4rem auto' }} className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)', width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', margin: '0 auto 1rem' }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }} className="gradient-text">
            Admin Authentication
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Enter Admin Credentials to access Scraper Control Center
          </p>
        </div>

        {loginError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={16} /> {loginError}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Admin Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="email" 
                required 
                placeholder="vipulphatangare3@gmail.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600 }}>
              Admin Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}>
            <ShieldCheck size={18} /> Authenticate Admin
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          Secured with JWT Token Authentication & BCrypt Hashing
        </div>
      </div>
    );
  }

  // Admin Authenticated View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem' }}>
      
      {/* Admin Profile Bar */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6ee7b7' }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{user.name}</h3>
              <span className="badge badge-green">Authenticated Admin</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.15rem' }}>
              {user.email}
            </p>
          </div>
        </div>

        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
          <LogOut size={15} /> Admin Logout
        </button>
      </div>

      {/* PURE NUMERICAL STATS OVERVIEW CARDS (NO GRAPHS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        
        {/* Total Database Jobs */}
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Database Jobs
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#93c5fd', marginTop: '0.35rem' }}>
            {(stats.totalJobs || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            Stored in MongoDB
          </div>
        </div>

        {/* Live / Active Jobs */}
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.82rem', color: '#6ee7b7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🟢 Live / Active Jobs
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#6ee7b7', marginTop: '0.35rem' }}>
            {(stats.liveJobs || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#6ee7b7', marginTop: '0.25rem', fontWeight: 600 }}>
            {stats.totalJobs > 0 ? `${(((stats.liveJobs || 0) / stats.totalJobs) * 100).toFixed(1)}% Active & Open` : '100%'}
          </div>
        </div>

        {/* Expired / Ended Jobs */}
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.82rem', color: '#f87171', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🔴 Expired / Ended Jobs
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#f87171', marginTop: '0.35rem' }}>
            {(stats.expiredJobs || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.25rem' }}>
            {stats.totalJobs > 0 ? `${(((stats.expiredJobs || 0) / stats.totalJobs) * 100).toFixed(1)}% Inactive` : '0%'}
          </div>
        </div>

        {/* Internships Breakdown */}
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem', borderLeft: '4px solid #a855f7' }}>
          <div style={{ fontSize: '0.82rem', color: '#c084fc', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            🎓 Internships Breakdown
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#c084fc', marginTop: '0.35rem' }}>
            {(stats.internshipsCount || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', marginTop: '0.35rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <span style={{ color: '#6ee7b7' }}>🟢 Live: {(stats.internshipsLive || 0).toLocaleString()}</span>
            <span style={{ color: '#f87171' }}>🔴 Expired: {(stats.internshipsExpired || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Full-Time Jobs Breakdown */}
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ fontSize: '0.82rem', color: '#93c5fd', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            💼 Full-Time Jobs Breakdown
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#93c5fd', marginTop: '0.35rem' }}>
            {(stats.fullTimeCount || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', marginTop: '0.35rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', fontWeight: 600 }}>
            <span style={{ color: '#6ee7b7' }}>🟢 Live: {(stats.fullTimeLive || 0).toLocaleString()}</span>
            <span style={{ color: '#f87171' }}>🔴 Expired: {(stats.fullTimeExpired || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Deep Scraped Jobs */}
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Deep-Scraped (Full Specs)
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.35rem' }}>
            {(stats.deepScrapedJobs || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#38bdf8', marginTop: '0.25rem', fontWeight: 600 }}>
            {stats.totalJobs > 0 ? `${(((stats.deepScrapedJobs || 0) / stats.totalJobs) * 100).toFixed(1)}% Complete` : '100%'}
          </div>
        </div>

        {/* Non-Deep Scraped / Fallback Jobs */}
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Unscraped / Fallback Jobs
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: stats.unscrapedJobs > 0 ? '#fcd34d' : '#9ca3af', marginTop: '0.35rem' }}>
            {stats.unscrapedJobs || 0}
          </div>
          <div style={{ fontSize: '0.78rem', color: stats.unscrapedJobs > 0 ? '#fcd34d' : 'var(--text-dim)', marginTop: '0.25rem' }}>
            {stats.unscrapedJobs > 0 ? 'Action Needed: Run Repair' : '0 Pending Jobs'}
          </div>
        </div>

        {/* New Jobs Added Last Run */}
        <div className="glass-card" style={{ textAlign: 'center', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            New Jobs Added Last Run
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#c4b5fd', marginTop: '0.35rem' }}>
            +{(stats.addedLastRun || 0)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.25rem' }}>
            Cron: {stats.autoCronCount || 0} | Manual: {stats.manualCount || 0}
          </div>
        </div>

      </div>

      {/* Targeted Deep-Scraping Action Panel for Unscraped Jobs */}
      <div className="glass-card" style={{ background: stats.unscrapedJobs > 0 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(16, 185, 129, 0.08)', border: stats.unscrapedJobs > 0 ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wrench size={20} color={stats.unscrapedJobs > 0 ? '#fcd34d' : '#6ee7b7'} /> Targeted Deep-Scraping Engine
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Currently <strong style={{ color: stats.unscrapedJobs > 0 ? '#fcd34d' : '#6ee7b7' }}>{stats.unscrapedJobs} jobs</strong> require targeted deep-scraping. Clicking below will fetch full specifications ONLY for non-deep-scraped jobs.
            </p>
          </div>

          <button 
            onClick={handleRunTargetedRepair}
            disabled={repairing || stats.unscrapedJobs === 0 || scraperStatus?.isRunning}
            className="btn-primary"
            style={{ 
              background: stats.unscrapedJobs > 0 ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(255,255,255,0.05)',
              color: stats.unscrapedJobs > 0 ? '#fff' : 'var(--text-muted)',
              border: stats.unscrapedJobs > 0 ? 'none' : '1px solid var(--border-color)',
              opacity: (repairing || stats.unscrapedJobs === 0 || scraperStatus?.isRunning) ? 0.5 : 1,
              cursor: (stats.unscrapedJobs === 0 || scraperStatus?.isRunning) ? 'not-allowed' : 'pointer'
            }}
          >
            <Wrench size={16} /> Run Targeted Deep-Scraping ({stats.unscrapedJobs} Unscraped Jobs)
          </button>
        </div>
      </div>

      {/* Overview Grid: Auto Schedule vs Manual Trigger Controls */}
      <div className="grid-cols-2">
        
        {/* Auto Cron Scheduler Status Card */}
        <div className="glass-card">
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Automated Daily Cron Scheduler</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>Runs automatically twice daily (Node-Cron Engine)</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Daily Schedule Times:</span>
              <strong style={{ color: '#c4b5fd' }}>5:00 AM IST & 2:00 PM IST</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Target Time Horizon:</span>
              <strong style={{ color: '#6ee7b7' }}>Last 36 Hours Jobs (jobAge=2)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Step A Deduplication:</span>
              <strong style={{ color: '#93c5fd' }}>100% DB Checked (Skips existing)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cron Service Status:</span>
              <span style={{ color: '#6ee7b7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span className="pulse-dot"></span> ACTIVE & SCHEDULED
              </span>
            </div>
          </div>
        </div>

        {/* Manual Scraper Trigger Controls Card */}
        <div className="glass-card">
          <div style={{ marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>Manual Scraper Trigger Controls</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.2rem' }}>Configure time horizon and pages for custom scraping runs</p>
          </div>

          <form onSubmit={handleStartManualScraper} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>
                Select Time Horizon (Last N Hours / Days)
              </label>
              <select 
                value={jobAgeSelect} 
                onChange={handleTimeSelectChange}
                style={{ width: '100%', background: 'rgba(11, 15, 25, 0.8)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.65rem 0.85rem', borderRadius: '9px', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
              >
                <option value="0">Last 5 - 10 Hours (Fresh Real-time)</option>
                <option value="1">Last 24 Hours (1 Day)</option>
                <option value="2">Last 36 Hours (1.5 Days)</option>
                <option value="5">Last 5 Days</option>
                <option value="10">Last 10 Days</option>
                <option value="15">Last 15 Days</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>Start Page</label>
                <input 
                  type="number" 
                  min="1"
                  value={startPageInput}
                  onChange={(e) => setStartPageInput(e.target.value)}
                  style={{ width: '100%', background: 'rgba(11, 15, 25, 0.8)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 600 }}>End Page</label>
                <input 
                  type="number" 
                  min="1"
                  max="2000"
                  value={pagesInput}
                  onChange={(e) => setPagesInput(e.target.value)}
                  style={{ width: '100%', background: 'rgba(11, 15, 25, 0.8)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem 0.85rem', borderRadius: '8px', fontSize: '0.88rem', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
              <button 
                type="submit"
                disabled={scraperStatus?.isRunning}
                className="btn-primary" 
                style={{ flex: 1, justifyContent: 'center', opacity: scraperStatus?.isRunning ? 0.5 : 1 }}
              >
                <Play size={16} /> Trigger {timeRangeTextSelect} Scrape
              </button>

              {scraperStatus?.isRunning && (
                <button 
                  type="button" 
                  onClick={handleStopManualScraper}
                  className="btn-danger" 
                  style={{ padding: '0.65rem 1rem' }}
                >
                  <Square size={16} /> Stop
                </button>
              )}
            </div>
          </form>
        </div>

      </div>

      {/* Scraper Audit Logs & Execution History Table */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
              Scraper Audit Logs & Execution History
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Execution history of Automated Cron runs (5 AM / 2 PM IST) and Manual Scraper triggers.
            </p>
          </div>

          <button onClick={() => { fetchStats(); fetchLogs(); }} className="btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}>
            <RefreshCw size={14} className={loadingLogs ? 'spin' : ''} /> Refresh History
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                <th style={{ padding: '0.75rem 1rem' }}>Time Range Parameter</th>
                <th style={{ padding: '0.75rem 1rem' }}>Pages Scraped</th>
                <th style={{ padding: '0.75rem 1rem' }}>New Jobs Added</th>
                <th style={{ padding: '0.75rem 1rem' }}>Total DB Jobs</th>
                <th style={{ padding: '0.75rem 1rem' }}>Duration</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Triggered By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: '#fff' }}>
                    {new Date(log.startTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {log.triggerType === 'AUTO_CRON' ? (
                      <span className="badge badge-purple">AUTO CRON</span>
                    ) : (
                      <span className="badge badge-blue">MANUAL</span>
                    )}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#93c5fd', fontWeight: 600 }}>
                    {log.timeRangeText || `Last ${log.jobAge * 24} Hours`}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                    Pages {log.startPage}..{log.endPage}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: log.newJobsAdded > 0 ? '#6ee7b7' : 'var(--text-muted)' }}>
                    +{log.newJobsAdded || 0} NEW
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: '#fff' }}>
                    {log.totalJobsInDb ? log.totalJobsInDb.toLocaleString() : '43,210'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                    {log.durationSeconds ? `${log.durationSeconds}s` : 'Running...'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    {log.status === 'SUCCESS' && <span className="badge badge-green">SUCCESS</span>}
                    {log.status === 'RUNNING' && <span className="badge badge-amber">RUNNING</span>}
                    {log.status === 'FAILED' && <span className="badge badge-purple">FAILED</span>}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                    {log.triggeredBy}
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No audit logs recorded yet. Trigger a manual scrape or wait for the 5 AM / 2 PM IST cron run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODERN GLASSMORPHIC MODAL POPUP FOR NOTIFICATIONS & CONFIRMATIONS */}
      {modalMessage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div className="glass-card" style={{
            width: '90%',
            maxWidth: '440px',
            padding: '2rem',
            borderRadius: '20px',
            textAlign: 'center',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(11, 15, 25, 0.98))'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>
              {modalMessage.type === 'error' ? '⚠️' : modalMessage.type === 'success' ? '✅' : '🔔'}
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.6rem' }}>
              {modalMessage.title || 'System Notification'}
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.75rem' }}>
              {modalMessage.text}
            </p>
            <button 
              onClick={() => setModalMessage(null)}
              className="btn-primary" 
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem', borderRadius: '10px' }}
            >
              OK, Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
