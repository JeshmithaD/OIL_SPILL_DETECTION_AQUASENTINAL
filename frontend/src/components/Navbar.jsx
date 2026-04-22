import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMenu, FiX, FiAnchor, FiGrid, FiMap, FiBell, FiBarChart2, FiCpu, FiLogOut, FiDatabase, FiFileText, FiSettings } from 'react-icons/fi';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('aquasentinel_token');
  const user = JSON.parse(localStorage.getItem('aquasentinel_user') || '{}');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('aquasentinel_token');
    localStorage.removeItem('aquasentinel_user');
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: <FiGrid />, public: false },
    { to: '/map', label: 'Map', icon: <FiMap />, public: false },
    { to: '/analytics', label: 'Analytics', icon: <FiBarChart2 />, public: false },
    { to: '/reports', label: 'Repository', icon: <FiDatabase />, public: false },
    { to: '/compare', label: 'Compare', icon: <FiCpu />, public: false },
    { to: '/alerts', label: 'Alerts', icon: <FiBell />, public: false },
    { to: '/settings', label: 'Settings', icon: <FiSettings />, public: false },
    { to: '/history', label: 'SOC History', icon: <FiFileText />, public: false },
  ];

  const filteredLinks = navLinks.filter(link => link.public || token);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-500 ${
      scrolled ? 'bg-brand-bg/90 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-8'
    }`}>
      <div className="max-w-[1600px] mx-auto px-12">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-4 group">
            <div className="w-11 h-11 bg-brand-secondary rounded-xl flex items-center justify-center rotate-45 group-hover:rotate-[225deg] transition-all duration-700 shadow-lg shadow-brand-secondary/20">
              <FiAnchor className="-rotate-45 text-white text-xl" />
            </div>
            <span className="text-2xl font-black italic tracking-tighter text-white">AQUA<span className="text-brand-accent">SENTINEL</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center space-x-12">
            {filteredLinks.map((link) => (
              <Link key={link.to} to={link.to} className={`text-[11px] uppercase tracking-[0.4em] font-black transition-all hover:text-brand-accent hover:scale-110 active:scale-95 ${
                location.pathname === link.to ? 'text-brand-accent scale-105' : 'text-white/40'
              }`}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* User / Auth */}
          <div className="hidden md:flex items-center space-x-12">
            {token ? (
              <div className="flex items-center space-x-6">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-accent">{user.full_name}</span>
                  <span className="text-[8px] text-gray-500 uppercase tracking-tighter font-bold">Standard Guardian</span>
                </div>
                <button onClick={handleLogout} className="p-3 bg-white/5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-all">
                  <FiLogOut size={16} />
                </button>
              </div>
            ) : (
              <Link to="/login" className="px-8 py-3 bg-brand-secondary text-brand-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-accent transition-all">
                Login
              </Link>
            )}
          </div>

          {/* Mobile toggle */}
          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden text-white/50 hover:text-white transition-colors">
            {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-0 left-0 w-full h-screen bg-brand-bg flex flex-col items-center justify-center p-8 z-[70]"
          >
            <button onClick={() => setIsOpen(false)} className="absolute top-8 right-8 text-white/50 hover:text-white">
              <FiX size={32} />
            </button>
            <div className="flex flex-col items-center space-y-10">
              {filteredLinks.map((link) => (
                <Link key={link.to} to={link.to} onClick={() => setIsOpen(false)} className="text-2xl font-black italic tracking-tighter text-white uppercase hover:text-brand-accent transition-all">
                  {link.label}
                </Link>
              ))}
              {token && <button onClick={() => { handleLogout(); setIsOpen(false); }} className="text-2xl font-black italic tracking-tighter text-red-500 uppercase">Logout</button>}
              {!token && <Link to="/login" onClick={() => setIsOpen(false)} className="text-2xl font-black italic tracking-tighter text-brand-accent uppercase">Login</Link>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
