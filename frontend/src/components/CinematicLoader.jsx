import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';

const loadingTexts = [
  "Initializing Ocean Intelligence...",
  "Calibrating Satellite Systems...",
  "Connecting to AIS Stream...",
  "Tracking Global Vessels...",
  "Loading ML Models...",
  "Ready."
];

export default function CinematicLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const containerRef = useRef(null);

  useEffect(() => {
    // Fake progress mixed with real elapsed time
    const duration = 4000; // 4 seconds total cinematic loading time
    const intervalTime = 50;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const p = Math.min((currentStep / steps) * 100, 100);
      setProgress(p);

      // Change text based on progress
      const currentTextIndex = Math.floor((p / 100) * (loadingTexts.length - 1));
      setTextIndex(Math.min(currentTextIndex, loadingTexts.length - 1));

      if (p >= 100) {
        clearInterval(timer);
        // Execute exit cinematic via GSAP
        gsap.to(containerRef.current, {
          scale: 1.5,
          opacity: 0,
          duration: 1.2,
          ease: "power2.inOut",
          onComplete: onComplete
        });
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#010a15] overflow-hidden"
    >
      {/* Background cinematic elements */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#010a15] via-[#02183b] to-[#010a15] opacity-50" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0,rgba(0,0,0,0)_50%)]" />
      
      <div className="relative z-10 w-full max-w-md px-6 text-center">
        {/* Glow Logo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="mb-12"
        >
          <div className="w-16 h-16 mx-auto mb-4 border border-ocean-500/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)]">
            <span className="text-2xl text-ocean-400 font-bold">AS</span>
          </div>
          <h1 className="font-display text-2xl tracking-[0.2em] text-white/90">AQUASENTINEL</h1>
        </motion.div>

        {/* Dynamic Text */}
        <div className="h-6 mb-4">
          <AnimatePresence mode="wait">
            <motion.p
              key={textIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-xs tracking-widest text-ocean-300/80 font-medium"
            >
              {loadingTexts[textIndex]}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Premium Progress Bar */}
        <div className="h-[2px] w-full bg-ocean-950/50 relative overflow-hidden rounded-full">
          <div 
            className="absolute top-0 left-0 h-full bg-ocean-400 shadow-[0_0_15px_rgba(59,130,246,0.8)] transition-all duration-75 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Progress Text */}
        <div className="mt-4 text-[10px] text-ocean-500/60 font-mono">
          {Math.floor(progress)}%
        </div>
      </div>
    </div>
  );
}
