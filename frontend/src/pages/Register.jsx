import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUserPlus, FiAnchor, FiUser, FiLock, FiMail, FiPhone, FiAlertCircle } from 'react-icons/fi';
import { register } from '../services/api';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    phone: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    if (form.full_name.length < 2) newErrors.full_name = "Full name is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) newErrors.email = "Please enter a valid email address";
    if (form.password.length < 6 || form.password.length > 12) {
      newErrors.password = "Password must be 6-12 characters";
    }
    if (form.password !== form.confirm_password) {
      newErrors.confirm_password = "Passwords do not match";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const res = await register(form);
      localStorage.setItem('aquasentinel_token', res.data.token);
      localStorage.setItem('aquasentinel_user', JSON.stringify(res.data.user));
      toast.success('Access Granted. Welcome to the Fleet.');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      toast.error(msg);
      if (msg.includes('Email')) setErrors({ email: 'Email already registered' });
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

      {/* Visual Side */}
      <div className="hidden lg:flex relative items-center justify-center p-24 overflow-hidden border-r border-white/10 shadow-[20px_0_100px_rgba(30,215,255,0.2)]">
        <div className="absolute inset-0 z-0">
          <img
            src="https://4kwallpapers.com/images/walls/thumbs_3t/5677.jpg"
            className="w-full h-full object-cover contrast-[1.15] saturate-[1.1] brightness-110"
            alt="Ocean Satellite"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent opacity-40" />
          <div className="absolute inset-0 bg-brand-accent/5 mix-blend-overlay" />
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
            Monitor. <br />
            Protect. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-brand-accent">Preserve.</span>
          </motion.h2>

          <p className="text-xl text-black-400 font-light leading-relaxed max-w-lg">
            Join the elite circle of maritime guardians. Access global AIS anomalies
            and real-time satellite spill detection in a single unified system.
          </p>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex items-center justify-center p-8 relative bg-black/10">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-bg to-black opacity-50" />
        <div className="absolute top-[10%] right-[10%] w-[30%] h-[30%] bg-brand-secondary/10 rounded-full blur-[100px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[440px] relative z-10 py-16 px-10 border-x border-white/5 bg-black/20 backdrop-blur-md"
        >
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-wider">Guardian Registration</h1>
            <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.3em]">Initialize Single-User Mission Access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-[9px] uppercase tracking-[0.3em] font-black text-brand-secondary ml-1">Full Name</label>
              <div className="relative group">
                <FiUser className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className={inputClasses(errors.full_name)}
                  placeholder="Commander Shepard"
                />
                <AnimatePresence>
                  {errors.full_name && (
                    <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-5 left-1 text-[9px] text-red-400 font-bold uppercase">{errors.full_name}</motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] uppercase tracking-[0.3em] font-black text-brand-secondary ml-1">Phone (Optional)</label>
              <div className="relative group">
                <FiPhone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className={inputClasses()}
                  placeholder="+1 555-0199"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] uppercase tracking-[0.3em] font-black text-brand-secondary ml-1">Email Address</label>
              <div className="relative group">
                <FiMail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClasses(errors.email)}
                  placeholder="guardian@aquasentinel.gov"
                />
                <AnimatePresence>
                  {errors.email && (
                    <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-5 left-1 text-[9px] text-red-400 font-bold uppercase">{errors.email}</motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] uppercase tracking-[0.3em] font-black text-brand-secondary ml-1">Password</label>
              <div className="relative group">
                <FiLock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputClasses(errors.password)}
                  placeholder="••••••••"
                />
                <AnimatePresence>
                  {errors.password && (
                    <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-5 left-1 text-[9px] text-red-400 font-bold uppercase">{errors.password}</motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[9px] uppercase tracking-[0.3em] font-black text-brand-secondary ml-1">Confirm Access Key</label>
              <div className="relative group">
                <FiLock className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                  className={inputClasses(errors.confirm_password)}
                  placeholder="••••••••"
                />
                <AnimatePresence>
                  {errors.confirm_password && (
                    <motion.span initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-5 left-1 text-[9px] text-red-400 font-bold uppercase">{errors.confirm_password}</motion.span>
                  )}
                </AnimatePresence>
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
                  <><span>Initialize access</span> <FiUserPlus className="text-lg" /></>
                )}
              </button>
            </div>

            <div className="text-center mt-8">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Already a guardian? <Link to="/login" className="text-brand-secondary hover:text-brand-accent ml-1 transition-colors">Sign in here</Link>
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
