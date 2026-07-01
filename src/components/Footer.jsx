import React from 'react';
import { useMuseum } from '../context/MuseumContext';
import './Footer.css';

export default function Footer() {
  const { settings } = useMuseum();
  const year = new Date().getFullYear();
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

        <div className="footer-divider"></div>

        <div className="footer-bottom">
          <span className="mono footer-copy">© {year} Hashem Najdawi Museum</span>
          <span className="mono footer-copy">Crafted with precision</span>
        </div>
      </div>
    </footer>
  );
}
