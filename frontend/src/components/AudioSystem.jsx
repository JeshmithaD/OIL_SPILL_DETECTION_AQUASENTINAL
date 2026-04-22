import React, { useEffect, useRef, useState } from 'react';
import { FiVolume2, FiVolumeX } from 'react-icons/fi';

const AMBIENT_SOUNDS = {
  ocean: "https://ia800901.us.archive.org/17/items/tv-static-noise/Ocean-Waves.mp3",
  space: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
  wind: "https://ia800203.us.archive.org/30/items/WindHowling/WindHowling.mp3"
};

const UI_SFX = {
  click: "https://assets.mixkit.co/sfx/preview/mixkit-modern-technology-select-3124.mp3",
  alert: "https://assets.mixkit.co/sfx/preview/mixkit-software-interface-back-button-2511.mp3"
};

export default function AudioSystem() {
  const [isMuted, setIsMuted] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const [activeAmbient, setActiveAmbient] = useState('ocean');
  
  const bgAudioRef = useRef(null);
  const sfxAudioRef = useRef(null);

  // 1. Browser restriction unlocker & Constant Start
  useEffect(() => {
    const handleFirstInteraction = () => {
      if (!userInteracted) {
        setUserInteracted(true);
        console.log("🔊 Audio System: Unlocked and Starting Constant Stream");
        
        // Force start background audio immediately on unlock
        if (bgAudioRef.current && !isMuted) {
          bgAudioRef.current.volume = 0.3; // Immediate low volume
          bgAudioRef.current.play().catch(e => console.error("Initial Play failed:", e));
        }
      }
    };
    
    // Listen for any interaction to unlock
    window.addEventListener('mousedown', handleFirstInteraction);
    window.addEventListener('touchstart', handleFirstInteraction);
    window.addEventListener('keydown', handleFirstInteraction);
    
    return () => {
      window.removeEventListener('mousedown', handleFirstInteraction);
      window.removeEventListener('touchstart', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [userInteracted, isMuted]);

  // 2. Continuous Background Ambience Control & Source Sync
  useEffect(() => {
    if (!bgAudioRef.current) return;

    if (userInteracted && !isMuted) {
      // If source changed or not playing, restart
      if (bgAudioRef.current.paused) {
        bgAudioRef.current.volume = 0;
        bgAudioRef.current.play()
          .then(() => {
            // Smooth fade in
            let vol = 0;
            const interval = setInterval(() => {
              vol += 0.05;
              if (vol >= 0.3) {
                if (bgAudioRef.current) bgAudioRef.current.volume = 0.3;
                clearInterval(interval);
              } else {
                if (bgAudioRef.current) bgAudioRef.current.volume = vol;
              }
            }, 100);
          })
          .catch(err => console.error("Playback interrupted:", err));
      }
    } else if (isMuted) {
      bgAudioRef.current.pause();
    }
  }, [activeAmbient, isMuted, userInteracted]);

  // 3. Global Interaction SFX Listener
  useEffect(() => {
    const playInteractionSound = (e) => {
      // Find closest clickable element
      const target = e.target.closest('button, a, .clickable-item, [role="button"], input, select');
      if (target && !isMuted && userInteracted && sfxAudioRef.current) {
        sfxAudioRef.current.currentTime = 0;
        sfxAudioRef.current.volume = 0.5;
        sfxAudioRef.current.play().catch(e => console.log("SFX Playback Failed:", e));
      }
    };

    window.addEventListener('click', playInteractionSound);
    return () => window.removeEventListener('click', playInteractionSound);
  }, [isMuted, userInteracted]);

  // 4. Manual Logic Events (External trigger)
  useEffect(() => {
    const switchAmbient = (e) => {
      const type = e.type.split('-')[1];
      if (AMBIENT_SOUNDS[type]) setActiveAmbient(type);
    };

    const events = ['play-space', 'play-wind', 'play-ocean'];
    events.forEach(ev => window.addEventListener(ev, switchAmbient));
    return () => events.forEach(ev => window.removeEventListener(ev, switchAmbient));
  }, []);

  const toggleMute = (e) => {
    e.stopPropagation();
    setIsMuted(!isMuted);
  };

  return (
    <>
      {/* Background Ambience Track */}
      <audio
        ref={bgAudioRef}
        key={activeAmbient}
        loop
        src={AMBIENT_SOUNDS[activeAmbient]}
        preload="auto"
      />
      
      {/* Short Interaction SFX Track */}
      <audio
        ref={sfxAudioRef}
        src={UI_SFX.click}
        preload="auto"
      />
      
      {/* Small, subtle mute toggle */}
      <button
        id="audio-toggle-btn"
        onClick={toggleMute}
        className="fixed bottom-6 left-6 z-[100] w-10 h-10 flex items-center justify-center rounded-xl bg-ocean-500/10 backdrop-blur-md border border-ocean-500/20 text-ocean-400 hover:bg-ocean-500/20 transition-all hover:scale-110 shadow-lg group"
        title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
      >
        {isMuted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
        
        {/* Status Tooltip */}
        <span className="absolute left-14 bg-ocean-950/90 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-ocean-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
          {isMuted ? 'Muted' : 'Audio Active'}
        </span>
      </button>
    </>
  );
}
