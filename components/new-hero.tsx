"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import DemoRequestModal from './demo-request-modal';

export default function NewHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);

  // Parallax scrolling effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      // Apply parallax effect to background elements
      if (backgroundRef.current) {
        backgroundRef.current.style.transform = `translateY(${scrollY * 0.5}px)`;
      }
      
      if (gridRef.current) {
        gridRef.current.style.transform = `translateY(${scrollY * 0.2}px)`;
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollY]);
  
  // Canvas animation for static particle connections
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles
    const particles: { x: number; y: number; vx: number; vy: number; size: number }[] = [];
    const particleCount = 80;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2.5 + 0.5
      });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw particles and connections
      particles.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Boundary check
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(147, 197, 253, 0.5)';
        ctx.fill();

        // Draw connections between nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - particle.x;
          const dy = particles[j].y - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(147, 197, 253, ${0.2 - distance / 600})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <section 
      className="relative overflow-hidden py-20 w-screen"
    >
      {/* Grid pattern background with parallax effect */}
      <div className="absolute inset-0 opacity-5 overflow-hidden" style={{ height: '120%', top: '-10%' }}>
        <div ref={gridRef} className="h-full w-full bg-[url('/images/grid-pattern.svg')]" />
      </div>
      
      {/* Gradient background with parallax effect */}
      <div 
        ref={backgroundRef}
        className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 opacity-90" 
        style={{ height: '120%', top: '-10%' }}
      />
      
      {/* Particle canvas with parallax effect */}
      <div className="absolute inset-0 overflow-hidden" style={{ height: '120%', top: '-10%' }}>
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full"
          style={{ transform: `translateY(${scrollY * 0.3}px)` }}
        />
      </div>
      
      {/* Main content container with max-width constraint */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-6 md:px-8 flex flex-col lg:flex-row items-center gap-12">
        {/* Left column: Text content */}
        <div className="lg:w-1/2 text-left">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-200">
            Build complex data models with intuitive visual tools
          </h1>
          
          <p className="text-xl text-blue-100 mb-4">
            Create, visualize, and manage entity relationships for your database architecture with precision and ease
          </p>
          
          <p className="text-lg text-blue-200 mb-8">
            Reduce development time by 30% and eliminate database design errors
          </p>
          
          <div className="flex gap-4 mb-8">
            <Link href="/security-check?redirectTo=/auth-pages/sign-up" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors">
              Get Started
            </Link>
            <button 
              onClick={() => setIsDemoModalOpen(true)} 
              className="border border-blue-400 hover:bg-blue-800/30 text-white px-6 py-3 rounded-md font-medium transition-colors"
            >
              Request a Demo
            </button>
          </div>
          
          {/* Demo Request Modal */}
          <DemoRequestModal 
            isOpen={isDemoModalOpen} 
            onClose={() => setIsDemoModalOpen(false)} 
          />
          
          {/* Social proof */}
          <div className="flex items-center space-x-2 text-sm text-blue-200">
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Used by 500+ companies
            </span>
            <span className="w-1 h-1 rounded-full bg-blue-400"></span>
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              4.8/5 average rating
            </span>
          </div>
        </div>
        
        {/* Right column: 3D Isometric Visualization */}
        <div className="lg:w-1/2 relative">
          <div className="relative w-full h-[400px] lg:h-[500px] overflow-hidden rounded-lg">
            {/* Main visualization */}
            <Image 
              src="/images/isometric-data-model.svg" 
              alt="3D Isometric Database Visualization" 
              width={800} 
              height={600} 
              className="w-full h-full object-contain" 
              priority 
            />
            
            {/* Animated code-to-visual transformation (small overlay) */}
            <div className="absolute bottom-4 right-4 w-32 h-32 bg-slate-800/80 backdrop-blur-sm rounded-lg overflow-hidden border border-blue-500/30 shadow-lg">
              <div className="animate-pulse-slow">
                <Image 
                  src="/images/code-to-visual.svg" 
                  alt="Code to Visual Model Transformation" 
                  width={128} 
                  height={128} 
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
