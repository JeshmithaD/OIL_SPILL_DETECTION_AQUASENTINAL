import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiLogIn, FiAnchor, FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';
import { login } from '../services/api';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) newErrors.email = "Invalid email format";
    if (!form.password) newErrors.password = "Password is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await login(form);
      localStorage.setItem('aquasentinel_token', res.data.token);
      localStorage.setItem('aquasentinel_user', JSON.stringify(res.data.user));
      toast.success(`Welcome back, Commander.`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
      setErrors({ auth: 'Authentication failed. Please check your credentials.' });
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = (error) => `
    w-full pl-14 pr-6 py-4 bg-white/5 border rounded-2xl text-white placeholder-gray-600 
    focus:bg-white/10 transition-all outline-none font-bold shadow-inner
    ${error ? 'border-red-500/50 focus:border-red-500' : 'border-transparent focus:border-brand-secondary/50'}
  `;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-brand-bg relative overflow-hidden">

      {/* Branding Side */}
      <div className="hidden lg:flex relative items-center justify-center p-24 overflow-hidden border-r border-white/10 shadow-[20px_0_100px_rgba(0,145,255,0.2)]">
        <div className="absolute inset-0 z-0">
          <img
            src="https://4kwallpapers.com/images/walls/thumbs_3t/5677.jpg"
            className="w-full h-full object-cover contrast-[1.15] saturate-[1.25] brightness-105"
            alt="Maritime Surveillance Ship"
          />
          {/* Subtle gradient to ensure text readability without making it "blank" */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent opacity-40" />
          <div className="absolute inset-0 bg-brand-secondary/5 mix-blend-overlay" />
        </div>

        <div className="relative z-10 text-white w-full">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3 mb-16"
          >
            <FiAnchor className="text-brand-secondary text-4xl" />
            <span className="text-2xl font-black tracking-[0.3em] uppercase">AQUASENTINEL</span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-6xl font-black leading-tight mb-8"
          >
            Safeguarding <br />
            The Blue <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-accent">Horizon.</span>
          </motion.h2>

          <p className="text-xl text-black-400 font-light leading-relaxed max-w-lg">
            Access the planetary defense terminal.
            Powered by distributed AI
            and global satellite constellations for
            immediate maritime responder action.
          </p>
        </div>
      </div>

      {/* Login Side */}
      <div className="flex items-center justify-center p-8 relative bg-black/10">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-bg to-black opacity-50" />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-brand-secondary/5 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[380px] relative z-10 py-16 px-8 border-x border-white/5 bg-black/20 backdrop-blur-md"
        >
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-wider">Guardian Login</h1>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em]">Authorized Personnel Only</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence>
              {errors.auth && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center space-x-3 text-red-400 text-xs font-bold"
                >
                  <FiAlertCircle size={18} />
                  <span>{errors.auth}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="block text-[9px] uppercase tracking-[0.3em] font-black text-brand-secondary ml-1">Email Address</label>
              <div className="relative group">
                <FiMail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-brand-secondary" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClasses(errors.email)}
                  placeholder="commander@aquasentinel.gov"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] uppercase tracking-[0.3em] font-black text-brand-secondary ml-1">Access Key</label>
              <div className="relative group">
                <FiLock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 transition-colors group-focus-within:text-brand-secondary" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputClasses(errors.password)}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="btn-premium w-full py-5 rounded-2xl flex items-center justify-center space-x-3 text-sm tracking-widest"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <><span>Authenticate</span> <FiLogIn className="text-lg" /></>
                )}
              </button>
            </div>

            <div className="text-center mt-10 pt-8 border-t border-white/5">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                No access key assigned? <Link to="/register" className="text-brand-secondary hover:text-brand-accent ml-1 transition-colors">Register Guardian</Link>
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
