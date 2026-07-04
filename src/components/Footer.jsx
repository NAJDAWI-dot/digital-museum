import React, { useState } from 'react';
import { useMuseum } from '../context/MuseumContext';
import { buildShareLink } from '../utils/shareLinks';
import './Footer.css';

const SHARE_SOURCES = [
  {
    source: 'linkedin',
    label: 'LinkedIn',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3V9zm7 0h3.8v1.64h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.6c0-1.34-.03-3.06-1.87-3.06-1.87 0-2.16 1.46-2.16 2.96V21h-4V9z"/>
      </svg>
    ),
  },
  {
    source: 'github',
    label: 'GitHub',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
      </svg>
    ),
  },
  {
    source: 'copy-link',
    label: 'Copy Link',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>
    ),
  },
];

export default function Footer() {
  const { settings } = useMuseum();
  const year = new Date().getFullYear();
  const [copiedSource, setCopiedSource] = useState(null);

  const handleShare = async (source) => {
    const link = buildShareLink(source);
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedSource(source);
      setTimeout(() => {
        setCopiedSource((current) => (current === source ? null : current));
      }, 2000);
    } catch {
      // Clipboard API unavailable in this context -- nothing to gracefully fall back to.
    }
  };

  return (
    <footer id="about" className="footer">
      <div className="container footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-logo serif">Hashem Najdawi</div>
            <p className="footer-tagline">
              A digital museum of engineering,<br />
              applications & web craft.
            </p>
          </div>

          <div className="footer-links-col">
            <p className="footer-col-title mono">Navigate</p>
            <a href="#hero">Home</a>
            <a href="#featured">Featured</a>
            <a href="#gallery">Gallery</a>
          </div>

          <div className="footer-links-col">
            <p className="footer-col-title mono">Connect</p>
            {settings.social?.github && <a href={settings.social.github} target="_blank" rel="noreferrer">GitHub</a>}
            {settings.social?.linkedin && <a href={settings.social.linkedin} target="_blank" rel="noreferrer">LinkedIn</a>}
            <a href={`mailto:${settings.email}`}>Email</a>
          </div>
        </div>

        <div className="footer-share">
          <p className="footer-col-title mono">Share this page</p>
          <div className="footer-share-btns">
            {SHARE_SOURCES.map(({ source, label, icon }) => (
              <button
                key={source}
                type="button"
                className="footer-share-btn"
                onClick={() => handleShare(source)}
                aria-label={`Copy a ${label}-tagged share link`}
                title={`Copy a ${label}-tagged share link`}
              >
                {icon}
                <span className="mono">{copiedSource === source ? 'Copied!' : label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="footer-divider"></div>

        <div className="footer-bottom">
          <span className="mono footer-copy">© {year} Hashem Najdawi Museum</span>
          <span className="mono footer-copy">Crafted with precision</span>
        </div>
      </div>
    </footer>
  );
}
