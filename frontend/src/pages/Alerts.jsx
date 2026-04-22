import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBell, FiCheck, FiAlertTriangle, FiRadio, FiDownload } from 'react-icons/fi';
import { getAlerts, acknowledgeAlert, triggerSOS, downloadReport, getSpills } from '../services/api';
import toast from 'react-hot-toast';
import socket from '../services/socket';

const severityConfig = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
  low: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', badge: 'bg-green-500/20 text-green-400' },
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [spills, setSpills] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadAlerts();
    socket.on('new_alert', (alert) => {
      setAlerts((prev) => [alert, ...prev]);
      toast.error(`🚨 ${alert.title}`);
    });
    return () => socket.off('new_alert');
  }, []);

  const loadAlerts = async () => {
    try {
      const [a, s] = await Promise.all([getAlerts(), getSpills()]);
      setAlerts(a.data);
      setSpills(s.data);
    } catch (err) { console.error(err); }
  };

  const handleAck = async (id) => {
    try {
      await acknowledgeAlert(id);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, acknowledged: true } : a));
      toast.success('Alert acknowledged');
    } catch (err) { toast.error('Failed to acknowledge'); }
  };

  const handleSOS = async () => {
    if (!confirm('⚠️ This will trigger an emergency SOS alert to all authorities. Continue?')) return;
    try {
      await triggerSOS({ message: 'Emergency SOS triggered from dashboard' });
      toast.success('🚨 SOS Alert sent!');
      loadAlerts();
    } catch (err) { toast.error('SOS failed'); }
  };

  const handleDownloadReport = async (spillId) => {
    try {
      const res = await downloadReport(spillId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `aquasentinel_report_spill_${spillId}.pdf`;
      link.click();
      toast.success('Report downloaded');
    } catch (err) { toast.error('Download failed'); }
  };

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

  return (
    <div className="min-h-screen pt-20 px-4 pb-8 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">Alert Center</h1>
            <p className="text-gray-400 text-sm mt-1">Monitor and manage all system alerts</p>
          </div>
          {/* SOS Button */}
          <button
            id="sos-button"
            onClick={handleSOS}
            className="mt-4 sm:mt-0 px-8 py-3 bg-red-600 text-white rounded-xl font-bold text-lg sos-pulse hover:bg-red-700 transition-colors"
          >
            🚨 SOS
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['all', 'critical', 'high', 'medium', 'low'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f ? 'bg-brand-secondary text-white' : 'text-gray-400 hover:bg-brand-primary/50 border border-brand-primary/30'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Spill Reports */}
        {spills.length > 0 && (
          <div className="glass-card p-4 mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
              <FiDownload className="text-brand-accent" /><span>Spill Reports</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {spills.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleDownloadReport(s.id)}
                  className="p-3 rounded-xl border border-brand-primary/30 hover:border-brand-secondary/30 hover:bg-brand-secondary/5 transition-all text-left text-sm"
                >
                  <p className="text-white font-medium">Spill #{s.id}</p>
                  <p className="text-gray-400 text-xs">Confidence: {(s.confidence * 100).toFixed(1)}%</p>
                  <p className="text-brand-accent text-xs flex items-center space-x-1 mt-1"><FiDownload size={12} /><span>Download PDF</span></p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alert list */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <FiBell className="text-4xl text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500">No alerts found</p>
            </div>
          ) : (
            filtered.map((alert, i) => {
              const cfg = severityConfig[alert.severity] || severityConfig.medium;
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`p-4 rounded-xl border ${cfg.border} ${cfg.bg} ${alert.acknowledged ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.badge}`}>{alert.severity}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-secondary/20 text-brand-accent">{alert.alert_type}</span>
                        {alert.acknowledged && <span className="text-xs text-green-400 flex items-center space-x-1"><FiCheck size={12} /><span>Acknowledged</span></span>}
                      </div>
                      <h4 className="text-white font-medium">{alert.title}</h4>
                      <p className="text-gray-400 text-sm mt-1">{alert.message}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{new Date(alert.created_at).toLocaleString()}</span>
                        {alert.email_sent && <span>📧 Email sent</span>}
                        {alert.sms_sent && <span>📱 SMS sent</span>}
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAck(alert.id)}
                        className="ml-4 px-3 py-1.5 text-sm border border-brand-secondary/30 text-brand-accent rounded-lg hover:bg-brand-secondary/10 transition-colors flex items-center space-x-1"
                      >
                        <FiCheck /><span>Ack</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
