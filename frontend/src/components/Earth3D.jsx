import React, { useRef, useMemo, useState, useEffect } from 'react';
import Globe from 'react-globe.gl';
import { motion } from 'framer-motion';

export default function Earth3D() {
  const globeRef = useRef();
  
  useEffect(() => {
    if (globeRef.current) {
      // Slow auto-rotation
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
    }
  }, []);

  // Optimized textures for 60fps cinematic feel
  const globeConfig = useMemo(() => ({
    globeImageUrl: "//unpkg.com/three-globe/example/img/earth-night.jpg",
    bumpImageUrl: "//unpkg.com/three-globe/example/img/earth-topology.png",
    backgroundImageUrl: "//unpkg.com/three-globe/example/img/night-sky.png", // Starfield
    showAtmosphere: true,
    atmosphereColor: "#3291ff",
    atmosphereAltitude: 0.15,
  }), []);

  return (
    <div className="fixed inset-0 w-full h-full flex items-center justify-center bg-black overflow-hidden z-0">
      <div className="w-full h-full flex items-center justify-center">
        <Globe
          ref={globeRef}
          {...globeConfig}
          width={window.innerWidth}
          height={window.innerHeight}
          backgroundColor="rgba(0,0,0,0)"
          enablePointerInteraction={false}
          animateIn={true}
        />
      </div>

      {/* Orbital Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#010a15]/20 via-transparent to-[#010a15] pointer-events-none" />
      <div className="absolute inset-0 bg-radial-gradient(circle at center, transparent 30%, rgba(1, 10, 21, 0.4) 100%) pointer-events-none" />
    </div>
  );
}

