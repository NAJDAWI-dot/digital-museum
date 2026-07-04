import React, { useState, useEffect } from 'react';
import { useMuseum } from '../context/MuseumContext';
import './Navbar.css';

export default function Navbar({ revealed = true }) {
  const { isAdmin, logout, setAdminPanel, adminPanel } = useMuseum();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  const navLinks = [
    { href: '#gallery', label: 'Gallery' },
    { href: '#featured', label: 'Featured' },
    { href: '#about', label: 'About' },
  ];

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''} ${revealed ? 'navbar--in' : 'navbar--out'}`}>
      <div className="container navbar-inner">
        <a href="#" className="navbar-logo serif" aria-label="Hashem Najdawi Museum Home">
          Hashem Najdawi
        </a>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          {navLinks.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="navbar-link mono"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpen(false);
                window.dispatchEvent(new CustomEvent('liquid-nav', { detail: { target: l.href } }));
              }}
            >
              {l.label}
            </a>
          ))}
          {isAdmin ? (
            <div className="navbar-admin-group">
              <button
                className={`navbar-editor-btn ${adminPanel ? 'active' : ''}`}
                onClick={() => setAdminPanel(!adminPanel)}
              >
                Editor
              </button>
              <button className="navbar-logout-btn" onClick={logout} title="Sign Out">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            </div>
          ) : (
            <button
              className="navbar-link mono navbar-admin-link"
              onClick={() => setAdminPanel(true)}
            >
              Editor Access
            </button>
          )}
        </div>

        <button className="navbar-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span className={menuOpen ? 'open' : ''}></span>
          <span className={menuOpen ? 'open' : ''}></span>
        </button>
      </div>
    </nav>
  );
}
