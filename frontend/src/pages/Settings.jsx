import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSettings, FiMail, FiLock, FiServer, FiSave, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { getSettings, updateSettings, testSmtpConnection } from '../services/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [settings, setSettings] = useState({
    smtp_user: '',
    smtp_pass: '',
    alert_recipient: '',
    smtp_server: 'smtp.gmail.com',
    smtp_port: '587'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getSettings();
      setSettings({
        smtp_user: res.data.SMTP_USER || '',
        smtp_pass: res.data.SMTP_PASSWORD || '',
        alert_recipient: res.data.ALERT_EMAIL_TO || '',
        smtp_server: res.data.SMTP_SERVER || 'smtp.gmail.com',
        smtp_port: res.data.SMTP_PORT ? String(res.data.SMTP_PORT) : '587'
      });
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setMessage(null);

    const dataToSave = {
      SMTP_USER: settings.smtp_user,
      SMTP_PASSWORD: settings.smtp_pass,
      ALERT_EMAIL_TO: settings.alert_recipient,
      SMTP_SERVER: settings.smtp_server,
      SMTP_PORT: parseInt(settings.smtp_port, 10)
    };

    if (dataToSave.SMTP_PASSWORD === '********') {
        delete dataToSave.SMTP_PASSWORD;
    }

    try {
      await updateSettings(dataToSave);
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      toast.success('Settings saved successfully!');
      loadSettings();
    } catch (err) {
      console.error('Failed to update settings:', err);
      setMessage({ type: 'error', text: 'Failed to update settings.' });
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const dataToTest = {
        SMTP_USER: settings.smtp_user,
        SMTP_PASSWORD: settings.smtp_pass,
        ALERT_EMAIL_TO: settings.alert_recipient,
        SMTP_SERVER: settings.smtp_server,
        SMTP_PORT: parseInt(settings.smtp_port, 10)
      };
      
      if (dataToTest.SMTP_PASSWORD === '********') {
          delete dataToTest.SMTP_PASSWORD;
      }

      const res = await testSmtpConnection(dataToTest);
      if (res.data.success) {
        setMessage({ type: 'success', text: res.data.message });
        toast.success('SMTP Test Success!');
      } else {
        setMessage({ type: 'error', text: `SMTP Test failed: ${res.data.error}` });
        toast.error('SMTP Test Failed');
      }
    } catch (err) {
      console.error('Failed to test SMTP connection:', err);
      setMessage({ type: 'error', text: 'Failed to test SMTP connection.' });
      toast.error('Connection test error');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-brand-bg">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
          <div className="bg-gradient-to-r from-brand-primary to-blue-900/50 p-6 border-b border-white/10">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FiSettings className="text-brand-accent animate-spin-slow" />
              System Configuration
            </h1>
            <p className="text-blue-200/70 text-sm mt-1">Manage SMTP credentials and alert recipients</p>
          </div>

          <form onSubmit={handleSave} className="p-8 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiMail className="text-brand-accent" /> SMTP User (Email)
                </label>
                <input type="email" value={settings.smtp_user} onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                  placeholder="your-email@gmail.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-accent transition-all" required />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiLock className="text-brand-accent" /> App Password
                </label>
                <input type="password" value={settings.smtp_pass} onChange={(e) => setSettings({ ...settings, smtp_pass: e.target.value })}
                  placeholder="Enter 16-character app password" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-accent transition-all" />
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Use a Gmail App Password, not your login password.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <FiCheckCircle className="text-brand-accent" /> Alert Recipient (Authority Email)
                </label>
                <input type="email" value={settings.alert_recipient} onChange={(e) => setSettings({ ...settings, alert_recipient: e.target.value })}
                  placeholder="authority@example.com" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-accent transition-all" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <FiServer className="text-brand-accent" /> SMTP Server
                  </label>
                  <input type="text" value={settings.smtp_server} onChange={(e) => setSettings({ ...settings, smtp_server: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-accent text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Port</label>
                  <input type="number" value={settings.smtp_port} onChange={(e) => setSettings({ ...settings, smtp_port: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand-accent text-sm" />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
                  <span className="text-sm">{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex space-x-4 pt-4">
              <button type="submit" disabled={saving || testing}
                className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-xl font-bold transition-all shadow-lg ${saving ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-brand-secondary to-brand-accent hover:scale-[1.02] active:scale-[0.98]'}`}>
                {saving ? <div className="spinner w-5 h-5 border-2" /> : <FiSave size={20} />}
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>

              <button type="button" onClick={handleTestSmtp} disabled={testing || saving}
                className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-xl font-bold border-2 transition-all ${testing ? 'bg-gray-700 border-gray-600 cursor-not-allowed' : 'border-brand-secondary/50 text-brand-secondary hover:bg-brand-secondary/10'}`}>
                {testing ? <div className="spinner w-5 h-5 border-2 border-brand-secondary" /> : <FiMail size={20} />}
                <span>{testing ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
