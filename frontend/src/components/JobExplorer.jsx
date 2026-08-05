import React, { useState } from 'react';
import { Search, MapPin, Briefcase, IndianRupee, Clock, ChevronLeft, ChevronRight, Filter, ArrowUpDown, Sparkles, Building2, SlidersHorizontal } from 'lucide-react';

export default function JobExplorer({ jobs, pagination, searchParams, onSearchChange, onPageChange, onSelectJob }) {
  const [searchInput, setSearchInput] = useState(searchParams?.search || '');
  const [locFilter, setLocFilter] = useState(searchParams?.location || '');
  const [skillFilter, setSkillFilter] = useState(searchParams?.skill || '');
  const [companyFilter, setCompanyFilter] = useState(searchParams?.company || '');
  const [categoryFilter, setCategoryFilter] = useState(searchParams?.category || '');
  const [statusFilter, setStatusFilter] = useState(searchParams?.status || 'live');
  const [workTypeFilter, setWorkTypeFilter] = useState(searchParams?.workType || 'all');
  const [sortOption, setSortOption] = useState(searchParams?.sort || 'newest');
  const [limitOption, setLimitOption] = useState(searchParams?.limit || 12);
  const [jumpPage, setJumpPage] = useState('');
  const [activeQuickFilter, setActiveQuickFilter] = useState('live');
  const [categoriesList, setCategoriesList] = useState([]);

  React.useEffect(() => {
    fetch('/api/jobs/categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCategoriesList(data);
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (searchParams) {
      setSearchInput(searchParams.search || '');
      setLocFilter(searchParams.location || '');
      setSkillFilter(searchParams.skill || '');
      setCompanyFilter(searchParams.company || '');
      setCategoryFilter(searchParams.category || '');
      setStatusFilter(searchParams.status || 'live');
      setWorkTypeFilter(searchParams.workType || 'all');
      setSortOption(searchParams.sort || 'newest');
      setLimitOption(searchParams.limit || 12);
    }
  }, [searchParams]);

  const formatPostedTime = (job) => {
    if (job.postedDate) {
      const posted = new Date(job.postedDate);
      const now = new Date();
      const diffMs = now - posted;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffHours < 1) return 'Posted Just now';
      if (diffHours < 24) return `Posted ${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays === 1) return 'Posted 1 day ago';
      if (diffDays < 30) return `Posted ${diffDays} days ago`;
      return `Posted on ${posted.toLocaleDateString()}`;
    }
    return job.postedRaw ? `Posted ${job.postedRaw}` : 'Posted Recently';
  };

  const isInternship = (job) => {
    const text = `${job.title || ''} ${job.employmentType || ''} ${(job.keySkills || []).join(' ')}`;
    return /internship|intern/i.test(text);
  };

  const isLiveJob = (job) => {
    if (job.description && /expired|closed|no longer accepting/i.test(job.description)) return false;
    if (job.postedDate) {
      const diffDays = (new Date() - new Date(job.postedDate)) / (1000 * 60 * 60 * 24);
      return diffDays <= 30;
    }
    return true;
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    onSearchChange({ 
      search: searchInput, 
      location: locFilter, 
      skill: skillFilter, 
      company: companyFilter,
      category: categoryFilter,
      status: statusFilter,
      workType: workTypeFilter,
      sort: sortOption,
      limit: limitOption,
      page: 1
    });
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    onSearchChange({
      search: searchInput,
      location: locFilter,
      skill: skillFilter,
      company: companyFilter,
      category: categoryFilter,
      status: newStatus,
      workType: workTypeFilter,
      sort: sortOption,
      limit: limitOption,
      page: 1
    });
  };

  const handleWorkTypeChange = (newWorkType) => {
    setWorkTypeFilter(newWorkType);
    onSearchChange({
      search: searchInput,
      location: locFilter,
      skill: skillFilter,
      company: companyFilter,
      category: categoryFilter,
      status: statusFilter,
      workType: newWorkType,
      sort: sortOption,
      limit: limitOption,
      page: 1
    });
  };

  const handleQuickFilter = (filterKey, filterObj) => {
    setActiveQuickFilter(filterKey);
    const newFilters = {
      search: searchInput,
      location: locFilter,
      skill: skillFilter,
      company: companyFilter,
      category: categoryFilter,
      status: statusFilter,
      sort: sortOption,
      limit: limitOption,
      page: 1,
      ...filterObj
    };
    if (filterObj.location !== undefined) setLocFilter(filterObj.location);
    if (filterObj.skill !== undefined) setSkillFilter(filterObj.skill);
    if (filterObj.search !== undefined) setSearchInput(filterObj.search);
    if (filterObj.category !== undefined) setCategoryFilter(filterObj.category);
    if (filterObj.status !== undefined) setStatusFilter(filterObj.status);
    onSearchChange(newFilters);
  };

  const handleLimitChange = (newLimit) => {
    setLimitOption(newLimit);
    onSearchChange({
      search: searchInput,
      location: locFilter,
      skill: skillFilter,
      company: companyFilter,
      category: categoryFilter,
      sort: sortOption,
      limit: newLimit,
      page: 1
    });
  };

  const handleSortChange = (newSort) => {
    setSortOption(newSort);
    onSearchChange({
      search: searchInput,
      location: locFilter,
      skill: skillFilter,
      company: companyFilter,
      category: categoryFilter,
      sort: newSort,
      limit: limitOption,
      page: 1
    });
  };

  const handleCategoryChange = (newCategory) => {
    setCategoryFilter(newCategory);
    onSearchChange({
      search: searchInput,
      location: locFilter,
      skill: skillFilter,
      company: companyFilter,
      category: newCategory,
      sort: sortOption,
      limit: limitOption,
      page: 1
    });
  };

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const p = parseInt(jumpPage);
    if (p && p >= 1 && p <= (pagination?.totalPages || 1)) {
      onPageChange(p);
      setJumpPage('');
    }
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
      {/* Quick Filter Presets */}
      <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1.25rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', marginRight: '0.25rem' }}>
          <Sparkles size={15} color="var(--primary-cyan)" /> Quick Filters:
        </span>

        <button 
          onClick={() => handleQuickFilter('internship', { workType: 'internship' })}
          className={`badge ${activeQuickFilter === 'internship' ? 'badge-purple' : 'badge-secondary'}`}
          style={{ cursor: 'pointer', padding: '0.45rem 0.9rem', fontSize: '0.82rem', background: activeQuickFilter === 'internship' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(255,255,255,0.05)', borderColor: activeQuickFilter === 'internship' ? '#a855f7' : 'transparent', color: activeQuickFilter === 'internship' ? '#c084fc' : '#e2e8f0', fontWeight: 700 }}
        >
          🎓 Internships (3,578)
        </button>

        <button 
          onClick={() => handleQuickFilter('fulltime', { workType: 'fulltime' })}
          className={`badge ${activeQuickFilter === 'fulltime' ? 'badge-blue' : 'badge-secondary'}`}
          style={{ cursor: 'pointer', padding: '0.45rem 0.9rem', fontSize: '0.82rem', background: activeQuickFilter === 'fulltime' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.05)', borderColor: activeQuickFilter === 'fulltime' ? '#3b82f6' : 'transparent', color: activeQuickFilter === 'fulltime' ? '#93c5fd' : '#e2e8f0', fontWeight: 700 }}
        >
          💼 Full-Time Jobs
        </button>

        <button 
          onClick={() => handleQuickFilter('live', { status: 'live', workType: 'all' })}
          className={`badge ${activeQuickFilter === 'live' ? 'badge-green' : 'badge-secondary'}`}
          style={{ cursor: 'pointer', padding: '0.45rem 0.9rem', fontSize: '0.82rem', background: activeQuickFilter === 'live' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.05)', borderColor: activeQuickFilter === 'live' ? '#10b981' : 'transparent', color: activeQuickFilter === 'live' ? '#6ee7b7' : '#e2e8f0', fontWeight: 700 }}
        >
          🟢 Live / Active
        </button>

        <button 
          onClick={() => handleQuickFilter('all', { status: 'all', workType: 'all', search: '', location: '', skill: '', company: '' })}
          className={`badge ${activeQuickFilter === 'all' ? 'badge-blue' : 'badge-secondary'}`}
          style={{ cursor: 'pointer', padding: '0.4rem 0.85rem', fontSize: '0.82rem', background: activeQuickFilter === 'all' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.05)' }}
        >
          ⚡ All DB Jobs
        </button>

        <button 
          onClick={() => handleQuickFilter('expired', { status: 'expired' })}
          className={`badge ${activeQuickFilter === 'expired' ? 'badge-amber' : 'badge-secondary'}`}
          style={{ cursor: 'pointer', padding: '0.4rem 0.85rem', fontSize: '0.82rem', background: activeQuickFilter === 'expired' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255,255,255,0.05)' }}
        >
          🔴 Expired / Ended
        </button>

        <button 
          onClick={() => handleQuickFilter('remote', { location: 'Pan India' })}
          className={`badge ${activeQuickFilter === 'remote' ? 'badge-green' : 'badge-secondary'}`}
          style={{ cursor: 'pointer', padding: '0.4rem 0.85rem', fontSize: '0.82rem', background: activeQuickFilter === 'remote' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.05)' }}
        >
          📍 PAN India / Remote
        </button>

        <button 
          onClick={() => handleQuickFilter('freshers', { search: 'Fresher' })}
          className={`badge ${activeQuickFilter === 'freshers' ? 'badge-purple' : 'badge-secondary'}`}
          style={{ cursor: 'pointer', padding: '0.4rem 0.85rem', fontSize: '0.82rem', background: activeQuickFilter === 'freshers' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255,255,255,0.05)' }}
        >
          🎓 Freshers (0-2 Yrs)
        </button>
      </div>

      {/* Search & Filter Bar */}
      <form onSubmit={handleSearchSubmit} className="glass-card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search title, company, description..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input"
            />
          </div>

          <div style={{ position: 'relative' }}>
            <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Location (e.g. Pune, Mumbai)"
              value={locFilter}
              onChange={(e) => setLocFilter(e.target.value)}
              className="search-input"
            />
          </div>

          <div style={{ position: 'relative' }}>
            <Filter size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Skill (e.g. Python, React)"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="search-input"
            />
          </div>

          <div style={{ position: 'relative' }}>
            <select 
              value={workTypeFilter} 
              onChange={(e) => handleWorkTypeChange(e.target.value)}
              className="search-input"
              style={{ appearance: 'none', cursor: 'pointer', color: workTypeFilter === 'internship' ? '#c084fc' : '#93c5fd', fontWeight: 600 }}
            >
              <option value="all" style={{ background: '#0b0f19', color: '#93c5fd' }}>💼 All Work Types</option>
              <option value="internship" style={{ background: '#0b0f19', color: '#c084fc' }}>🎓 Internships Only (3,578)</option>
              <option value="fulltime" style={{ background: '#0b0f19', color: '#6ee7b7' }}>💼 Full-Time Jobs (51,250)</option>
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <select 
              value={statusFilter} 
              onChange={(e) => handleStatusChange(e.target.value)}
              className="search-input"
              style={{ appearance: 'none', cursor: 'pointer', color: '#6ee7b7', fontWeight: 600 }}
            >
              <option value="live" style={{ background: '#0b0f19', color: '#6ee7b7' }}>🟢 Live / Active (30 Days)</option>
              <option value="expired" style={{ background: '#0b0f19', color: '#f87171' }}>🔴 Expired / Ended Jobs</option>
              <option value="all" style={{ background: '#0b0f19', color: '#93c5fd' }}>⚡ All Jobs in Database</option>
            </select>
          </div>

          <div style={{ position: 'relative' }}>
            <select 
              value={categoryFilter} 
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="search-input"
              style={{ appearance: 'none', cursor: 'pointer', color: categoryFilter ? '#fff' : 'var(--text-muted)' }}
            >
              <option value="">📁 All Categories ({categoriesList.reduce((acc, c) => acc + c.count, 0)})</option>
              {categoriesList.map((cat, idx) => (
                <option key={idx} value={cat.name} style={{ background: '#0b0f19', color: '#fff' }}>
                  {cat.name} ({cat.count.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem', justifyContent: 'center' }}>
            Search Jobs
          </button>
        </div>
      </form>

      {/* Sorting & Grid Configuration Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Showing <strong style={{ color: '#93c5fd' }}>{jobs.length}</strong> of <strong style={{ color: '#fff' }}>{pagination?.total || 0}</strong> {statusFilter === 'live' ? 'Live Active' : statusFilter === 'expired' ? 'Expired' : 'Total'} Jobs (Page {pagination?.page || 1} of {pagination?.totalPages || 1})
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <ArrowUpDown size={15} /> Sort:
            <select 
              value={sortOption} 
              onChange={(e) => handleSortChange(e.target.value)}
              style={{ background: 'rgba(11, 15, 25, 0.8)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value="newest">Newest Posted First</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Job Title (A-Z)</option>
              <option value="company">Company Name (A-Z)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <SlidersHorizontal size={15} /> Per Page:
            <select 
              value={limitOption} 
              onChange={(e) => handleLimitChange(parseInt(e.target.value))}
              style={{ background: 'rgba(11, 15, 25, 0.8)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.4rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer' }}
            >
              <option value={12}>12 Jobs</option>
              <option value={24}>24 Jobs</option>
              <option value={48}>48 Jobs</option>
              <option value={96}>96 Jobs</option>
              <option value={192}>192 Jobs</option>
            </select>
          </div>
        </div>
      </div>

      {/* Responsive Jobs Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        {jobs.map((job) => {
          const live = isLiveJob(job);
          const internship = isInternship(job);
          const postedTimeStr = formatPostedTime(job);

          return (
            <div 
              key={job._id || job.jobId} 
              className="glass-card" 
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden', borderLeft: live ? '4px solid #10b981' : '4px solid #ef4444' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    padding: '0.2rem 0.55rem', 
                    borderRadius: '6px', 
                    background: live ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                    color: live ? '#6ee7b7' : '#f87171',
                    border: live ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    {live ? '🟢 Live & Open' : '🔴 Expired / Closed'}
                  </span>

                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    padding: '0.2rem 0.55rem', 
                    borderRadius: '6px', 
                    background: internship ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)', 
                    color: internship ? '#c084fc' : '#93c5fd',
                    border: internship ? '1px solid rgba(168, 85, 247, 0.4)' : '1px solid rgba(59, 130, 246, 0.4)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    {internship ? '🎓 Internship' : '💼 Full-Time Job'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <img 
                    src={job.company?.logoUrl || 'https://static.naukimg.com/s/0/0/i/naukri-identity/naukri_gnb_logo.svg'} 
                    alt="Company Logo"
                    style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '10px', background: '#fff', padding: '4px', border: '1px solid rgba(255,255,255,0.1)' }}
                    onError={(e) => { e.target.src = 'https://img.naukimg.com/logo_images/groups/v1/10476.gif'; }}
                  />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <h4 
                      onClick={() => onSelectJob(job)} 
                      style={{ fontSize: '1.05rem', fontWeight: 700, color: '#93c5fd', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                      title={job.title}
                    >
                      {job.title}
                    </h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{job.company?.name || 'Corporate Employer'}</span>
                      {job.company?.rating ? <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', padding: '0.1rem 0.4rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>★ {job.company.rating}</span> : null}
                    </div>
                  </div>
                </div>

                {/* Job Details Meta Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '7px' }}>
                    <Briefcase size={14} color="var(--primary-cyan)" />
                    {job.experience?.rawText || '0-5 Yrs'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '7px' }}>
                    <IndianRupee size={14} color="var(--success-green)" />
                    {job.salary?.rawText || 'Not disclosed'}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: 'rgba(255,255,255,0.04)', padding: '0.3rem 0.6rem', borderRadius: '7px' }}>
                    <MapPin size={14} color="var(--accent-purple)" />
                    {job.locations?.[0] || 'PAN India'}
                  </span>
                </div>

                {/* Description Snippet */}
                <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '1rem', lineHeight: 1.5 }}>
                  {job.description?.replace(/<[^>]*>?/gm, '') || 'Full job description available.'}
                </p>

                {/* Key Skill Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                  {(job.keySkills || []).slice(0, 4).map((skill, idx) => (
                    <span key={idx} className="badge badge-blue" style={{ fontSize: '0.73rem' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.85rem', borderTop: '1px solid var(--border-color)', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.8rem', color: live ? '#6ee7b7' : '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                  <Clock size={14} color={live ? '#34d399' : '#94a3b8'} />
                  {postedTimeStr}
                </span>
                <button 
                  onClick={() => onSelectJob(job)} 
                  className="btn-secondary" 
                  style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem', background: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)', color: '#93c5fd' }}
                >
                  View Spec
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {jobs.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>No job listings found matching your search filters.</h3>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>Try searching with a broader keyword or click "All Jobs" above to reset filters.</p>
        </div>
      )}

      {/* Advanced Responsive Pagination Bar */}
      {pagination && pagination.totalPages > 1 && (
        <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.5rem' }}>
          
          {/* Prev / Next Buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="btn-secondary"
              style={{ opacity: pagination.page <= 1 ? 0.4 : 1, cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={16} /> Prev
            </button>

            <button 
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="btn-secondary"
              style={{ opacity: pagination.page >= pagination.totalPages ? 0.4 : 1, cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>

          {/* Page Info */}
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Page <strong style={{ color: '#93c5fd' }}>{pagination.page}</strong> of <strong style={{ color: '#fff' }}>{pagination.totalPages}</strong> ({pagination.total.toLocaleString()} total jobs)
          </div>

          {/* Direct Page Jump Form */}
          <form onSubmit={handleJumpSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Jump to page:</span>
            <input 
              type="number" 
              min="1" 
              max={pagination.totalPages}
              placeholder={pagination.page.toString()}
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              style={{ width: '70px', background: 'rgba(11, 15, 25, 0.8)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.4rem 0.6rem', borderRadius: '8px', fontSize: '0.85rem', outline: 'none', textAlign: 'center' }}
            />
            <button type="submit" className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}>
              Go
            </button>
          </form>

        </div>
      )}
    </div>
  );
}

