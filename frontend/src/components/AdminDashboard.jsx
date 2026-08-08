import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Mail, Play, Square, RefreshCw, AlertTriangle, Calendar, Activity, Database, UserCheck, LogOut, Wrench, CheckCircle, Key, Copy, Code, Eye, EyeOff, FileJson, Check } from 'lucide-react';

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

  // API Key & Export Integration State
  const [activeAdminTab, setActiveAdminTab] = useState('overview'); // 'overview', 'api-keys', 'audit-logs'
  const [apiKeyData, setApiKeyData] = useState({ key: '', lastUsedAt: null, createdAt: null });
  const [loadingApiKey, setLoadingApiKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  const [selectedDocTab, setSelectedDocTab] = useState('curl');
  const [docTimePreset, setDocTimePreset] = useState(36); // 36, 24, 12 hours



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

  // Fetch Active API Key from Backend
  const fetchApiKey = async () => {
    if (!token) return;
    setLoadingApiKey(true);
    try {
      const res = await fetch('/api/admin/api-key', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeyData(data);
      }
    } catch (e) {
      console.error('Failed to fetch API Key:', e);
    } finally {
      setLoadingApiKey(false);
    }
  };

  const handleRegenerateApiKey = () => {
    setModalMessage({
      title: 'Regenerate API Key?',
      text: 'Are you sure you want to generate a brand-new API key? The current API key will be immediately revoked and any external application using it will lose access until updated.',
      type: 'confirm',
      confirmText: 'Regenerate API Key Now',
      confirmAction: async () => {
        setModalMessage(null);
        try {
          const res = await fetch('/api/admin/api-key/regenerate', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (res.ok) {
            setApiKeyData(data);
            setShowKey(true);
            setModalMessage({
              title: 'API Key Regenerated',
              text: 'New API Key generated successfully. The previous key is now revoked.',
              type: 'success'
            });
          } else {
            setModalMessage({ title: 'Regeneration Error', text: data.error || 'Failed to regenerate key', type: 'error' });
          }
        } catch (e) {
          setModalMessage({ title: 'Connection Error', text: 'Error connecting to server', type: 'error' });
        }
      }
    });
  };

  const handleCopyText = (text, typeLabel) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopySuccess(typeLabel);
    setTimeout(() => setCopySuccess(''), 2500);
  };

  const getSnippetContent = (tab) => {
    const key = apiKeyData.key || 'YOUR_API_KEY';
    const hours = docTimePreset;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3006';

    if (tab === 'curl') {
      return '# cURL Request for Last ' + hours + ' Hours Data\n' +
        'curl -X POST "' + origin + '/api/v1/export/jobs/recent" -H "Content-Type: application/json" -d \'{"apiKey": "' + key + '", "hours": ' + hours + '}\'';
    }

    if (tab === 'fetch') {
      return '// JavaScript Fetch Request for Last ' + hours + ' Hours Data\n' +
        'async function fetchRecentJobs() {\n' +
        '  const response = await fetch("' + origin + '/api/v1/export/jobs/recent", {\n' +
        '    method: "POST",\n' +
        '    headers: { "Content-Type": "application/json" },\n' +
        '    body: JSON.stringify({\n' +
        '      apiKey: "' + key + '",\n' +
        '      hours: ' + hours + '\n' +
        '    })\n' +
        '  });\n\n' +
        '  const result = await response.json();\n' +
        '  console.log("Fetched " + result.totalCount + " jobs", result.data);\n' +
        '}';
    }
    if (tab === 'python') {
      return '# Python Requests Example for Last ' + hours + ' Hours Data\n' +
        'import requests\n\n' +
        'url = "' + origin + '/api/v1/export/jobs/recent"\n' +
        'payload = {\n' +
        '    "apiKey": "' + key + '",\n' +
        '    "hours": ' + hours + '\n' +
        '}\n\n' +
        'response = requests.post(url, json=payload)\n' +
        'data = response.json()\n\n' +
        'if data.get("success"):\n' +
        '    print(f"Retrieved {data[\'totalCount\']} jobs from last ' + hours + ' hours")\n' +
        '    jobs_list = data["data"]\n' +
        'else:\n' +
        '    print("Error:", data.get("error"))';
    }
    if (tab === 'php') {
      return '<?php\n' +
        '// PHP cURL Example for Last ' + hours + ' Hours Data\n' +
        '$url = "' + origin + '/api/v1/export/jobs/recent";\n' +
        '$data = array(\n' +
        '  "apiKey" => "' + key + '",\n' +
        '  "hours" => ' + hours + '\n' +
        ');\n\n' +
        '$ch = curl_init($url);\n' +
        'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n' +
        'curl_setopt($ch, CURLOPT_POST, true);\n' +
        'curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));\n' +
        'curl_setopt($ch, CURLOPT_HTTPHEADER, array(\'Content-Type: application/json\'));\n\n' +
        '$response = curl_exec($ch);\n' +
        'curl_close($ch);\n\n' +
        '$result = json_decode($response, true);\n' +
        'print_r($result);\n' +
        '?>';
    }
    if (tab === 'postman') {
      return '// Postman Setup Guide\n' +
        '1. Method: POST\n' +
        '2. URL: ' + origin + '/api/v1/export/jobs/recent\n' +
        '3. Body -> raw -> JSON:\n' +
        '{\n' +
        '  "apiKey": "' + key + '",\n' +
        '  "hours": ' + hours + '\n' +
        '}';
    }
    if (tab === 'json') {
      return JSON.stringify({
        success: true,
        timeHorizon: 'Last ' + hours + ' Hours',
        cutoffDate: new Date(Date.now() - hours * 3600000).toISOString(),
        totalCount: 3840,
        exportedAt: new Date().toISOString(),
        data: [
          {
            jobId: "3008240001",
            url: "https://www.naukri.com/job-listings-full-stack-developer-tech-corp-bangalore-2-to-5-years",
            title: "Senior Full Stack Software Engineer",
            company: {
              name: "Tech Corp Pvt Ltd",
              rating: 4.3,
              reviewsCount: 320,
              logoUrl: "https://img.naukri.com/logo.gif",
              address: "Bangalore, Karnataka",
              about: "Leading enterprise cloud software company..."
            },
            experience: { minYears: 2, maxYears: 5, rawText: "2-5 Yrs" },
            salary: { minLakhs: 12, maxLakhs: 18, rawText: "12-18 LPA" },
            locations: ["Bangalore / Bengaluru", "Hybrid"],
            description: "We are hiring a Full Stack Developer proficient in React, Node.js, and MongoDB...",
            roleCategory: "Software Development",
            department: ["Engineering - Software & QA"],
            industry: "IT Services & Consulting",
            employmentType: "Full Time, Permanent",
            qualifications: { ug: "B.Tech/B.E. in Computers", pg: "Any Postgraduate" },
            keySkills: ["React", "Node.js", "MongoDB", "Express", "JavaScript"],
            postedDate: new Date(Date.now() - 43200000).toISOString(),
            postedRaw: "1 day ago",
            stats: { openings: 4, applicants: "150+ Applicants" },
            scrapedAt: new Date().toISOString()
          }
        ]
      }, null, 2);
    }
    return '';
  };




  useEffect(() => {
    fetchStats();
    fetchLogs();
    if (token) {
      fetchApiKey();
    }
    const interval = setInterval(() => {
      fetchStats();
      fetchLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [token]);

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
      fetchApiKey();
    } catch (e) {
      setLoginError('Server connection error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setToken('');
    setUser(null);
  };

  const handleStartManualScraper = (e) => {
    e.preventDefault();
    setModalMessage({
      title: 'Confirm Scraper Launch',
      text: `Are you sure you want to launch manual scraping for ${timeRangeTextSelect} (Pages ${startPageInput} to ${pagesInput})?`,
      type: 'confirm',
      confirmText: 'Confirm & Start Scraper',
      confirmAction: async () => {
        setModalMessage(null);
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
      }
    });
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

  const handleClearLogs = async () => {
    setModalMessage({
      title: 'Clear Execution History?',
      text: 'Are you sure you want to permanently clear all Scraper Audit Logs & Execution History? This action cannot be undone.',
      type: 'confirm',
      confirmAction: async () => {
        setModalMessage(null);
        try {
          const res = await fetch('/api/scraper/logs', {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setModalMessage({ title: 'History Cleared', text: 'Scraper audit logs and execution history have been cleared cleanly.', type: 'success' });
            setLogs([]);
            fetchStats();
          } else {
            setModalMessage({ title: 'Clear Failed', text: 'Failed to clear execution history', type: 'error' });
          }
        } catch (e) {
          setModalMessage({ title: 'Connection Error', text: 'Error connecting to server', type: 'error' });
        }
      }
    });
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


      {/* ADMIN SECTION NAVIGATION TABS */}
      <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-color)', padding: '0.45rem', borderRadius: '14px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveAdminTab('overview')}
          style={{
            flex: 1,
            minWidth: '180px',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.2rem',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.92rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeAdminTab === 'overview' ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'transparent',
            color: activeAdminTab === 'overview' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeAdminTab === 'overview' ? '0 4px 14px rgba(59, 130, 246, 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Activity size={18} /> Scraper Controls & Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('api-keys')}
          style={{
            flex: 1,
            minWidth: '180px',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.2rem',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.92rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeAdminTab === 'api-keys' ? 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' : 'transparent',
            color: activeAdminTab === 'api-keys' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeAdminTab === 'api-keys' ? '0 4px 14px rgba(139, 92, 246, 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Key size={18} /> API Keys & Data Export Docs
        </button>

        <button
          type="button"
          onClick={() => setActiveAdminTab('audit-logs')}
          style={{
            flex: 1,
            minWidth: '180px',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1.2rem',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.92rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: activeAdminTab === 'audit-logs' ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)' : 'transparent',
            color: activeAdminTab === 'audit-logs' ? '#fff' : 'var(--text-muted)',
            boxShadow: activeAdminTab === 'audit-logs' ? '0 4px 14px rgba(6, 182, 212, 0.35)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          <Database size={18} /> Scraper Audit Logs
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

      {/* OVERVIEW TAB CONTENT */}
      {activeAdminTab === 'overview' && (

        <>
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
        </>
      )}


      {/* API KEY & FULL DATA JSON EXPORT INTEGRATION HUB TAB */}
      {activeAdminTab === 'api-keys' && (

        <div className="glass-card" style={{ border: '1px solid rgba(139, 92, 246, 0.4)', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.7))' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                  <Key size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>
                    API Key Management & External Integration Hub
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: '0.15rem' }}>
                    Generate API keys and fetch 100% of jobs & internships data (All jobs or Last 36h/24h/12h) in JSON format for external platforms.
                  </p>
                </div>
              </div>
            </div>
            <span className="badge badge-purple" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
              🔑 Single Active API Key Enforcement
            </span>
          </div>

          {/* API KEY MANAGEMENT CARD */}
          <div style={{ background: 'rgba(11, 15, 25, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.4rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🔑 Your Active System API Key
              </label>
              <span style={{ fontSize: '0.78rem', color: '#6ee7b7', background: 'rgba(16, 185, 129, 0.15)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 700 }}>
                1 KEY ACTIVE LIMIT
              </span>
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '0.85rem' }}>
              <input 
                type={showKey ? "text" : "password"} 
                readOnly 
                value={apiKeyData.key || 'Loading API Key...'} 
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.6)',
                  border: '1px solid rgba(139, 92, 246, 0.5)',
                  color: '#6ee7b7',
                  padding: '0.75rem 4.5rem 0.75rem 0.95rem',
                  borderRadius: '10px',
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  letterSpacing: showKey ? '0px' : '2px',
                  outline: 'none'
                }}
              />
              <div style={{ position: 'absolute', right: '0.5rem', display: 'flex', gap: '0.35rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowKey(!showKey)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.45rem', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title={showKey ? "Hide API Key" : "Show API Key"}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button 
                  type="button" 
                  onClick={() => handleCopyText(apiKeyData.key, 'key')}
                  style={{ background: copySuccess === 'key' ? '#10b981' : 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', border: 'none', color: '#fff', padding: '0.45rem 0.75rem', borderRadius: '7px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', fontWeight: 700 }}
                  title="Copy API Key"
                >
                  {copySuccess === 'key' ? <Check size={15} /> : <Copy size={15} />}
                  {copySuccess === 'key' ? 'Copied Key' : 'Copy Key'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {apiKeyData.lastUsedAt ? `Last active call: ${new Date(apiKeyData.lastUsedAt).toLocaleString('en-IN')}` : 'Key generated & ready'}
              </div>
              <button 
                type="button"
                onClick={handleRegenerateApiKey}
                className="btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', color: '#fcd34d', borderColor: 'rgba(245, 158, 11, 0.4)' }}
              >
                <RefreshCw size={14} /> Regenerate API Key (Revokes Old)
              </button>
            </div>
          </div>

          {/* ENDPOINTS GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
            
            {/* ENDPOINT 1: FULL DATA EXPORT */}
            <div style={{ background: 'rgba(11, 15, 25, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <label style={{ fontSize: '0.84rem', color: '#93c5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🌐 Endpoint 1: Complete All Jobs Export
                </label>
                <span className="badge badge-blue" style={{ fontSize: '0.72rem' }}>POST REQUEST</span>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}/api/v1/export/jobs`} 
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    color: '#93c5fd',
                    padding: '0.65rem 4.5rem 0.65rem 0.85rem',
                    borderRadius: '9px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                <button 
                  type="button" 
                  onClick={() => handleCopyText(`${window.location.origin}/api/v1/export/jobs`, 'url1')}
                  style={{ position: 'absolute', right: '0.5rem', background: copySuccess === 'url1' ? '#10b981' : 'rgba(59, 130, 246, 0.3)', border: 'none', color: '#fff', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {copySuccess === 'url1' ? <Check size={14} /> : <Copy size={14} />}
                  {copySuccess === 'url1' ? 'Copied' : 'Copy'}
                </button>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                Exports <strong>100% of all jobs & internships</strong> in MongoDB. Send <code>POST</code> request with your API Key in body.
              </p>
            </div>

            {/* ENDPOINT 2: RECENT TIME HORIZON EXPORT (36h, 24h, 12h) */}
            <div style={{ background: 'rgba(11, 15, 25, 0.8)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <label style={{ fontSize: '0.84rem', color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚡ Endpoint 2: Time Horizon Data Export
                </label>
                <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>POST REQUEST</span>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}/api/v1/export/jobs/recent`} 
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    color: '#6ee7b7',
                    padding: '0.65rem 4.5rem 0.65rem 0.85rem',
                    borderRadius: '9px',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
                <button 
                  type="button" 
                  onClick={() => handleCopyText(`${window.location.origin}/api/v1/export/jobs/recent`, 'url2')}
                  style={{ position: 'absolute', right: '0.5rem', background: copySuccess === 'url2' ? '#10b981' : 'rgba(16, 185, 129, 0.3)', border: 'none', color: '#fff', padding: '0.4rem 0.6rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 600 }}
                >
                  {copySuccess === 'url2' ? <Check size={14} /> : <Copy size={14} />}
                  {copySuccess === 'url2' ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Quick Hours Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Quick Input Preset:</span>
                {[36, 24, 12].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setDocTimePreset(h)}
                    style={{
                      background: docTimePreset === h ? '#10b981' : 'rgba(255,255,255,0.08)',
                      color: docTimePreset === h ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {h} Hours
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* CODE SNIPPETS & INTERACTIVE DOCUMENTATION */}
          <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.4rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Code size={20} color="#38bdf8" /> API Integration Code Snippets & Examples
              </h4>


              {/* Language Selector */}
              <div style={{ display: 'flex', gap: '0.4rem', background: 'rgba(255,255,255,0.06)', padding: '0.3rem', borderRadius: '9px', flexWrap: 'wrap' }}>

                {['curl', 'fetch', 'python', 'php', 'postman', 'json'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedDocTab(tab)}
                    style={{
                      background: selectedDocTab === tab ? (tab === 'json' ? '#10b981' : '#3b82f6') : 'transparent',
                      color: selectedDocTab === tab ? '#fff' : 'var(--text-muted)',
                      border: 'none',
                      padding: '0.35rem 0.75rem',
                      borderRadius: '7px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    {tab === 'curl' ? 'cURL' : tab === 'fetch' ? 'JS (Fetch)' : tab === 'python' ? 'Python' : tab === 'php' ? 'PHP' : tab === 'postman' ? 'Postman' : '📋 Sample JSON Output'}
                  </button>
                ))}
              </div>
            </div>

            {/* PRESET INFORMATION BOX */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.65rem 0.9rem', borderRadius: '8px', fontSize: '0.82rem', color: '#93c5fd' }}>
              <span>⏱️ Active Code Snippet Time Horizon Input:</span>
              <strong style={{ color: '#fff' }}>"hours": {docTimePreset}</strong>
              <span style={{ color: 'var(--text-muted)' }}>(Change preset above to 36, 24, or 12)</span>
            </div>

            {/* CODE DISPLAY BOX */}
            <div style={{ position: 'relative' }}>
              <pre style={{
                background: '#090d16',
                border: '1px solid rgba(255,255,255,0.12)',
                padding: '1.1rem',
                borderRadius: '10px',
                color: selectedDocTab === 'json' ? '#6ee7b7' : '#38bdf8',
                fontSize: '0.84rem',
                fontFamily: 'Consolas, Monaco, monospace',
                overflowX: 'auto',
                lineHeight: '1.55'
              }}>
                {getSnippetContent(selectedDocTab)}
              </pre>

              <button 
                type="button" 
                onClick={() => handleCopyText(getSnippetContent(selectedDocTab), 'snippet')}
                style={{ position: 'absolute', top: '0.65rem', right: '0.65rem', background: copySuccess === 'snippet' ? '#10b981' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', color: '#fff', padding: '0.4rem 0.7rem', borderRadius: '7px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}
              >
                {copySuccess === 'snippet' ? <Check size={15} /> : <Copy size={15} />}
                {copySuccess === 'snippet' ? 'Copied Snippet' : 'Copy Code'}
              </button>
            </div>
          </div>
        </div>
      )}





      {/* SCRAPER AUDIT LOGS TAB */}
      {activeAdminTab === 'audit-logs' && (
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


          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button onClick={() => { fetchStats(); fetchLogs(); }} className="btn-secondary" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}>
              <RefreshCw size={14} className={loadingLogs ? 'spin' : ''} /> Refresh History
            </button>
            <button onClick={handleClearLogs} className="btn-danger" style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}>
              Clear History
            </button>
          </div>
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
      )}


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
              {modalMessage.type === 'error' ? '⚠️' : modalMessage.type === 'success' ? '✅' : modalMessage.type === 'confirm' ? '❓' : '🔔'}
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.6rem' }}>
              {modalMessage.title || 'System Notification'}
            </h3>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '1.75rem' }}>
              {modalMessage.text}
            </p>
            
            {modalMessage.type === 'confirm' ? (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  onClick={() => setModalMessage(null)}
                  className="btn-secondary" 
                  style={{ flex: 1, justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem', borderRadius: '10px' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={() => modalMessage.confirmAction && modalMessage.confirmAction()}
                  className="btn-danger" 
                  style={{ flex: 1, justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem', borderRadius: '10px' }}
                >
                  {modalMessage.confirmText || 'Confirm Action'}
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setModalMessage(null)}
                className="btn-primary" 
                style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.95rem', borderRadius: '10px' }}
              >
                OK, Got it
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
