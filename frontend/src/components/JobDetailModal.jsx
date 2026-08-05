import React from 'react';
import { X, ExternalLink, MapPin, Briefcase, IndianRupee, Building, GraduationCap, Calendar, Users } from 'lucide-react';

export default function JobDetailModal({ job, onClose }) {
  if (!job) return null;

  return (
    <div 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        background: 'rgba(5, 8, 15, 0.82)', 
        backdropFilter: 'blur(8px)',
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        zIndex: 9999,
        padding: '1.5rem'
      }}
    >
      <div 
        className="glass-card" 
        style={{ 
          width: '100%', 
          maxWidth: '850px', 
          maxHeight: '90vh', 
          overflowY: 'auto', 
          background: '#0d1322', 
          border: '1px solid rgba(59, 130, 246, 0.3)',
          padding: '2rem',
          position: 'relative'
        }}
      >
        {/* Close Button */}
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '1.25rem', 
            right: '1.25rem', 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: 'none', 
            color: 'var(--text-muted)', 
            width: '36px', 
            height: '36px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            cursor: 'pointer' 
          }}
        >
          <X size={20} />
        </button>

        {/* Header Section */}
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <img 
            src={job.company?.logoUrl || 'https://img.naukimg.com/logo_images/groups/v1/5816574.gif'} 
            alt="Company Logo"
            style={{ width: '64px', height: '64px', objectFit: 'contain', borderRadius: '12px', background: '#fff', padding: '6px' }}
            onError={(e) => { e.target.src = 'https://img.naukimg.com/logo_images/groups/v1/10476.gif'; }}
          />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              {job.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--primary-blue)' }}>{job.company?.name || 'Star Job Solution'}</span>
              {job.company?.rating && <span className="badge badge-amber">★ {job.company.rating}</span>}
              {job.company?.reviewsCount && <span>({job.company.reviewsCount} reviews)</span>}
            </div>
          </div>
        </div>

        {/* Highlight Stats Pill Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Briefcase size={18} color="var(--primary-cyan)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Experience</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{job.experience?.rawText || '1 - 3 Yrs'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IndianRupee size={18} color="var(--success-green)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Salary Range</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{job.salary?.rawText || '2.5-4.25 Lacs PA'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapPin size={18} color="var(--accent-purple)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Location</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{(job.locations || []).join(', ') || 'India'}</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} color="#6ee7b7" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Date Posted</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#6ee7b7' }}>{job.postedRaw || 'Recently'}</div>
            </div>
          </div>
        </div>

        {/* Detailed Job Description */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary-blue)' }}>Job Description</h3>
          <div 
            style={{ color: 'var(--text-muted)', lineHeight: 1.7, fontSize: '0.92rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px' }}
            dangerouslySetInnerHTML={{ __html: job.description || 'Provide assistance to Quality Manager to execute works as per pouring point. Highlight all defects or process parameters. Vernier caliper knowledge is must.' }}
          />
        </div>

        {/* Key Skills */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--primary-blue)' }}>Key Skills</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {(job.keySkills || []).map((skill, idx) => (
              <span key={idx} className="badge badge-purple" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Additional Specs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          {job.roleCategory && (
            <div><strong style={{ color: 'var(--text-main)' }}>Role Category:</strong> {job.roleCategory}</div>
          )}
          {job.industry && (
            <div><strong style={{ color: 'var(--text-main)' }}>Industry:</strong> {job.industry}</div>
          )}
          {job.qualifications?.ug && (
            <div><strong style={{ color: 'var(--text-main)' }}>UG Qualification:</strong> {job.qualifications.ug}</div>
          )}
          {job.company?.address && (
            <div style={{ gridColumn: 'span 2' }}><strong style={{ color: 'var(--text-main)' }}>Company Address:</strong> {job.company.address}</div>
          )}
        </div>

        {/* Bottom CTA Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>

          {job.url && (
            <a 
              href={job.url.includes('?') ? job.url : `${job.url}?src=directSearch`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-primary"
            >
              Open Original Naukri Job Listing <ExternalLink size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
