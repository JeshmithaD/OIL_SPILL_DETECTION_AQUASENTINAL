import { FiAnchor, FiGithub, FiMail, FiMapPin, FiTwitter, FiLinkedin } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="relative mt-auto bg-[#010a15] border-t border-white/5 py-24 overflow-hidden">
      {/* Cinematic Background Glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-gradient-to-t from-ocean-500/10 to-transparent opacity-50 blur-3xl pointer-events-none" />
      
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-8">
          {/* Brand & Mission */}
          <div className="md:col-span-5">
            <Link to="/" className="flex items-center space-x-3 mb-8 group">
              <div className="w-8 h-8 border border-white/20 rounded-full flex items-center justify-center group-hover:border-white transition-colors">
                <FiAnchor className="text-white text-xs" />
              </div>
              <span className="font-display font-medium text-sm tracking-[0.4em] text-white">AQUASENTINEL</span>
            </Link>
            <p className="text-gray-500 text-sm max-w-sm leading-relaxed mb-8">
              The digital architecture of maritime protection. Harnessing multi-layer AI and orbital imaging 
              to preserve the world's most vital ecosystem.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-gray-600 hover:text-white transition-colors"><FiTwitter size={18} /></a>
              <a href="#" className="text-gray-600 hover:text-white transition-colors"><FiGithub size={18} /></a>
              <a href="#" className="text-gray-600 hover:text-white transition-colors"><FiLinkedin size={18} /></a>
            </div>
          </div>

          {/* Navigation Segments */}
          <div className="md:col-span-2">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white mb-8">SYSTEM</h4>
            <ul className="space-y-4">
              {['Dashboard', 'Live Map', 'Alerts', 'Analytics', 'Analysis'].map((label) => (
                <li key={label}>
                  <Link to={`/${label.toLowerCase().replace(' ', '')}`} className="text-xs text-gray-500 hover:text-white transition-colors tracking-wide">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white mb-8">COMPANY</h4>
            <ul className="space-y-4">
              {['About Mission', 'Technology', 'API Access', 'Global Reach'].map((label) => (
                <li key={label}>
                  <a href="#" className="text-xs text-gray-500 hover:text-white transition-colors tracking-wide">{label}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Command Center */}
          <div className="md:col-span-3">
            <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white mb-8">COMMAND CENTER</h4>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <FiMail className="text-ocean-500 mt-1" size={14} />
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Inquiries</p>
                  <p className="text-xs text-gray-400">hq@aquasentinel.ai</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <FiMapPin className="text-ocean-500 mt-1" size={14} />
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Headquarters</p>
                  <p className="text-xs text-gray-400">Maritime Intelligence District,<br/>Mumbai, 400001</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Global Footer Bottom */}
        <div className="mt-32 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-gray-600 font-bold">
            © 2026 AQUASENTINEL INTEL · ALL SYSTEM ORBITALS ACTIVE
          </p>
          <div className="flex items-center space-x-8 text-[9px] uppercase tracking-[0.1em] font-medium text-gray-500">
            <span className="text-ocean-500/50">SATELLITE SYNC: 99.9%</span>
            <span>PRIVACY PROTOCOL</span>
            <span>TERMS OF ENGAGEMENT</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
