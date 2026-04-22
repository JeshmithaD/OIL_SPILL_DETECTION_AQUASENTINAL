import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FiAnchor, FiMap, FiCpu, FiBarChart2, FiBell, FiLayers, FiCheckCircle, FiShield, FiGlobe, FiDatabase } from 'react-icons/fi';
import Earth3D from '../components/Earth3D';
import OceanSurface from '../components/OceanSurface';

gsap.registerPlugin(ScrollTrigger);

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?auto=format&fit=crop&q=80&w=2000",
    title: "Ocean Frontiers",
    sub: "Real-time surveillance across 71% of Earth's surface."
  },
  {
    url: "https://images.unsplash.com/photo-1498307833015-e7b400441eb8?auto=format&fit=crop&q=80&w=2000",
    title: "Maritime Security",
    sub: "Neutralizing threats before they reach our shores."
  },
  {
    url: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2000",
    title: "Orbital Intelligence",
    sub: "Trillion-pixel scale detection powered by Sentinel-1."
  },
  {
    url: "https://images.unsplash.com/photo-1518457227546-5e0031835941?auto=format&fit=crop&q=80&w=2000",
    title: "Clean Horizons",
    sub: "Zero false positives. Maximum environmental impact."
  }
];

export default function Home() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const containerRef = useRef(null);
  const earthContainerRef = useRef(null);
  const oceanContainerRef = useRef(null);
  const navigate = useNavigate();

  // Slider Logic
  useEffect(() => {
    if (hasStarted) {
      const timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % SLIDES.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [hasStarted]);

  const handleBegin = () => {
    setIsTransitioning(true);
    window.dispatchEvent(new CustomEvent('play-space'));

    const tl = gsap.timeline({
      onComplete: () => {
        setHasStarted(true);
        setIsTransitioning(false);
        window.dispatchEvent(new CustomEvent('play-ocean'));
      }
    });

    tl.to(earthContainerRef.current, {
      scale: 30,
      y: "100%",
      z: 500,
      opacity: 0,
      duration: 3.5,
      ease: "expo.in",
      onStart: () => {
        setTimeout(() => window.dispatchEvent(new CustomEvent('play-wind')), 500);
      }
    }, 0);

    tl.to(".landing-overlay", { 
      opacity: 0, 
      y: 100, 
      scale: 0.8,
      filter: "blur(20px)",
      duration: 1.5,
      ease: "power4.in"
    }, 0);

    tl.fromTo(oceanContainerRef.current, {
      opacity: 0, scale: 1.2, filter: "blur(40px)"
    }, {
      opacity: 1, scale: 1, filter: "blur(0px)",
      duration: 2.5, ease: "expo.out"
    }, 2);
  };

  const stats = [
    { label: "Vessels Tracked", value: "10K+", sub: "Real-time AIS Data" },
    { label: "Expert AI Models", value: "500+", sub: "Trained Detectors" },
    { label: "Response Availability", value: "24/7", sub: "Global Monitoring" },
    { label: "Confidence Rating", value: "4.8★", sub: "Zero False Positives" },
  ];

  const features = [
    { title: "SAR Pipeline", desc: "Automated Sentinel-1 SAR fetching for all-weather monitoring.", icon: <FiGlobe /> },
    { title: "Hybrid AI Logic", desc: "Collaborative YOLO + CNN validation for industrial precision.", icon: <FiCpu /> },
    { title: "Real-time Alerts", desc: "Immediate SOS and spill breach notifications via WebSocket.", icon: <FiBell /> },
    { title: "Deep Analytics", desc: "GNN-based predictive modeling for future spill risk.", icon: <FiBarChart2 /> },
  ];

  return (
    <div ref={containerRef} className="relative bg-brand-bg text-white overflow-x-hidden min-h-screen font-outfit">
      

      {/* LAYER: EARTH ZOOM */}
      <AnimatePresence>
        {!hasStarted && (
          <div ref={earthContainerRef} className="fixed inset-0 z-10 flex items-center justify-center bg-brand-bg">
            <Earth3D />
            <div className="absolute inset-0 bg-radial-gradient(circle, transparent 20%, #020C1B 100%) pointer-events-none" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center landing-overlay text-center px-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, delay: 0.5 }}
                className="mb-8"
              >
                <div className="w-20 h-20 bg-brand-secondary rounded-3xl mx-auto mb-10 flex items-center justify-center rotate-45 shadow-2xl shadow-brand-secondary/50">
                    <FiAnchor size={40} className="-rotate-45" />
                </div>
                <h1 className="text-8xl md:text-9xl font-black tracking-tighter italic mb-4 uppercase leading-none">
                  AQUA<span className="text-brand-accent">SENTINEL</span>
                </h1>
                <p className="text-brand-accent/40 uppercase tracking-[1.5em] text-[10px] font-black translate-x-2">
                  Autonomous Global Surveillance
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 2 }}
                className="max-w-xl"
              >
                <p className="text-xl text-gray-400 mb-12 font-light leading-relaxed">
                  Safeguarding biodiversity from space to sea level. <br/>
                  Experience the digital frontline of ocean protection.
                </p>
                
                <button 
                  onClick={handleBegin}
                  className="px-16 py-6 bg-brand-secondary text-brand-primary rounded-full text-lg font-black uppercase tracking-widest hover:bg-brand-accent transition-all shadow-2xl shadow-brand-secondary/40 relative group overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    Begin Journey <FiAnchor className="ml-4" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </button>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* LAYER: SLIDER BACKGROUND */}
      <AnimatePresence>
        {hasStarted && (
          <div ref={oceanContainerRef} className="fixed inset-0 z-0 bg-brand-bg overflow-hidden">
            {SLIDES.map((slide, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: currentSlide === index ? 1 : 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center scale-110"
                  style={{ backgroundImage: `url(${slide.url})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/90 via-transparent to-brand-bg" />
              </motion.div>
            ))}
            {/* Removed Ship Visual as per user request */}
          </div>
        )}
      </AnimatePresence>

      {/* LAYER: LANDING CONTENT */}
      {hasStarted && (
        <div className="relative z-10 pt-48">
          
          {/* HERO SLIDER CAPTIONS */}
          <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                transition={{ duration: 0.8 }}
                className="flex flex-col items-center"
              >
                <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 border border-white/10 text-brand-highlight text-[10px] font-black uppercase tracking-widest mb-10 backdrop-blur-sm">
                  <FiShield className="mr-2" /> {SLIDES[currentSlide].title}
                </div>

                <h2 className="text-7xl md:text-9xl font-black italic tracking-tighter mb-10 leading-[0.9] uppercase">
                  Protecting <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-highlight">The Blue Planet</span>
                </h2>

                <p className="text-xl text-gray-300 max-w-2xl mb-16 leading-relaxed font-light">
                  {SLIDES[currentSlide].sub}
                </p>

                <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
                  <button 
                    onClick={() => navigate('/register')}
                    className="px-10 py-5 bg-gradient-to-r from-brand-secondary to-brand-accent text-brand-primary rounded-2xl text-base font-black uppercase tracking-widest hover:shadow-2xl hover:shadow-brand-accent/30 transition-all"
                  >
                    Start Free Monitoring →
                  </button>
                  <button 
                    onClick={() => navigate('/login')}
                    className="px-10 py-5 bg-white/5 border border-white/10 rounded-2xl text-base font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    I already have an account
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* STATS MOSAIC */}
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="mt-32 grid grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl px-6"
            >
              {stats.map((s, i) => (
                <div key={i} className="glass-card p-10 text-left-force border-white/5 group hover:border-brand-accent/30 transition-all duration-500 backdrop-blur-xl">
                  <div className="text-4xl font-black text-brand-accent mb-2">{s.value}</div>
                  <div className="text-sm font-black uppercase tracking-widest text-white/80">{s.label}</div>
                  <div className="text-[10px] text-gray-500 mt-2 font-black uppercase tracking-widest">{s.sub}</div>
                </div>
              ))}
            </motion.div>
          </section>

          {/* FEATURES SECTION */}
          <section className="py-48 px-6 relative">
             <div className="max-w-6xl mx-auto text-center">
                <h2 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-6 uppercase leading-none">Everything <br/> <span className="text-brand-accent">You Need</span></h2>
                <p className="text-gray-500 text-lg mb-24 max-w-xl mx-auto">A complete maritime protection platform designed for agencies, ports, and planet guardians alike.</p>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {features.map((f, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ y: -10 }}
                      className="p-12 rounded-[40px] bg-brand-primary/40 backdrop-blur-3xl border border-white/5 text-center group transition-all"
                    >
                      <div className="w-16 h-16 bg-brand-secondary/10 rounded-2xl flex items-center justify-center text-brand-accent mx-auto mb-8 group-hover:bg-brand-secondary group-hover:text-brand-primary transition-all duration-500">
                        {f.icon}
                      </div>
                      <h4 className="text-xl font-black uppercase italic tracking-tighter mb-4">{f.title}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed font-medium">{f.desc}</p>
                    </motion.div>
                  ))}
                </div>
             </div>
          </section>

          {/* DETECTION PIPELINE SECTION */}
          <section className="py-48 px-6 bg-white/2">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between mb-24">
                <div className="max-w-xl text-left-force">
                  <h2 className="text-5xl md:text-6xl font-black italic tracking-tighter mb-6 uppercase leading-none">The Detection <br/> <span className="text-brand-accent">Pipeline</span></h2>
                  <p className="text-gray-400 text-lg">Our autonomous surveillance loop ensures trillion-pixel scale monitoring with zero human intervention.</p>
                </div>
                <div className="hidden md:flex space-x-4">
                   <div className="px-6 py-3 rounded-full bg-brand-secondary/10 border border-brand-secondary/20 text-brand-accent text-[10px] font-black uppercase tracking-widest">Autonomous</div>
                   <div className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-gray-500 text-[10px] font-black uppercase tracking-widest">End-to-End</div>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4 relative">
                <div className="hidden md:block absolute top-[60px] left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-brand-secondary/0 via-brand-secondary/40 to-brand-secondary/0 z-0" />

                {[
                  { step: "01", title: "AIS Tracking", label: "Anomaly Scan", icon: <FiGlobe />, color: "from-brand-primary to-brand-secondary" },
                  { step: "02", title: "Satellite Sync", label: "SAR/Optical", icon: <FiDatabase />, color: "from-brand-secondary to-brand-accent" },
                  { step: "03", title: "Hybrid AI", label: "Dual Consensus", icon: <FiCpu />, color: "from-brand-accent to-brand-highlight" },
                  { step: "04", title: "Intelligence", label: "Alerts & SOS", icon: <FiCheckCircle />, color: "from-brand-highlight to-emerald-400" }
                ].map((p, i) => (
                  <div key={i} className="relative z-10 flex flex-col items-center text-center group cursor-default">
                    <div className={`w-32 h-32 rounded-[40px] bg-gradient-to-br ${p.color} p-[1px] mb-8 group-hover:scale-110 transition-all duration-500 shadow-2xl shadow-brand-secondary/20`}>
                       <div className="w-full h-full bg-[#020C1B] rounded-[39px] flex items-center justify-center text-white">
                          {p.icon}
                       </div>
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-accent mb-2">{p.label}</div>
                    <h4 className="text-xl font-bold text-white mb-2">{p.title}</h4>
                    <div className="text-[40px] font-black text-white/5 absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none group-hover:text-brand-secondary/10 transition-colors uppercase">{p.step}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FOOTER SECTION */}
          <section className="py-24 border-t border-white/5 bg-black/20">
             <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0 text-gray-500">
                <div className="flex items-center space-x-3 grayscale hover:grayscale-0 transition-all cursor-pointer">
                  <FiAnchor className="text-brand-secondary" />
                  <span className="text-lg font-black italic tracking-tighter text-white">AQUA<span className="text-brand-accent">SENTINEL</span></span>
                </div>
                <div className="flex space-x-12 text-[10px] uppercase font-black tracking-[0.3em]">
                  <a href="#" className="hover:text-white transition-colors">Satellite Ops</a>
                  <a href="#" className="hover:text-white transition-colors">Legal</a>
                  <a href="#" className="hover:text-white transition-colors">Press</a>
                </div>
                <div className="text-[10px] font-black uppercase tracking-widest">© 2026 AQUA SENTINEL COMMAND. ALL RIGHTS RESERVED.</div>
             </div>
          </section>

        </div>
      )}
    </div>
  );
}
