import React from 'react';
import { motion } from 'framer-motion';

export default function OceanSurface() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Deep Sea Base Color */}
      <div className="absolute inset-0 bg-[#02183b]" />

      {/* Animated Water Texture Layers */}
      <motion.div 
        className="absolute inset-0 opacity-40 mix-blend-screen"
        animate={{ 
          backgroundPosition: ["0% 0%", "100% 100%"] 
        }}
        transition={{ 
          duration: 60, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        style={{
          backgroundImage: `url('https://www.transparenttextures.com/patterns/water.png')`,
          backgroundSize: '1000px',
        }}
      />
      
      <motion.div 
        className="absolute inset-0 opacity-20 mix-blend-overlay"
        animate={{ 
          backgroundPosition: ["100% 0%", "0% 100%"] 
        }}
        transition={{ 
          duration: 45, 
          repeat: Infinity, 
          ease: "linear" 
        }}
        style={{
          backgroundImage: `url('https://www.transparenttextures.com/patterns/water.png')`,
          backgroundSize: '800px',
          filter: 'hue-rotate(180deg)',
        }}
      />

      {/* Cinematic Fog / Mist Layer */}
      <div className="absolute inset-0 bg-gradient-to-t from-ocean-deep via-transparent to-transparent opacity-60" />
      
      {/* Dynamic Sun Reflection / Caustics */}
      <motion.div 
        className="absolute inset-0 opacity-10"
        style={{
          background: 'radial-gradient(circle at 50% 50%, #fff 0%, transparent 60%)',
          mixBlendMode: 'soft-light'
        }}
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />
    </div>
  );
}
