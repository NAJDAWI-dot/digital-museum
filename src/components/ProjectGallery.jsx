import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { projects } from '../data/projects';
import ProjectCard from './ProjectCard';
import './ProjectGallery.css';

const categories = ['All', 'Engineering', 'Web Application', 'Website', 'Application'];

export default function ProjectGallery() {
  const [filter, setFilter] = useState('All');

  const filteredProjects = projects.filter(
    proj => filter === 'All' || proj.category === filter
  );

  return (
    <section id="exhibitions" className="gallery-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">
            Featured <span className="text-gradient">Exhibitions</span>
          </h2>
          <p className="section-subtitle">
            Browse through a curated selection of advanced engineering systems, 
            beautiful web interfaces, and robust applications.
          </p>
        </div>

        <div className="filter-container">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`filter-btn ${filter === cat ? 'active' : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <motion.div 
          layout
          className="gallery-grid"
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
