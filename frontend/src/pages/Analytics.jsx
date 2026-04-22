import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiBarChart2, FiTrendingUp, FiPieChart } from 'react-icons/fi';
import { getStats, getVessels, getAnomalies, getSpills } from '../services/api';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PIE_COLORS = ['#10b981', '#f59e0b', '#ff2d2d', 'var(--brand-secondary)'];

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [vessels, setVessels] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [spills, setSpills] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [st, v, a, s] = await Promise.all([getStats(), getVessels(), getAnomalies(), getSpills()]);
        setStats(st.data);
        setVessels(v.data);
        setAnomalies(a.data);
        setSpills(s.data);
      } catch (err) { console.error(err); }
    };
    load();
  }, []);

  // Vessel status distribution
  const statusData = vessels.reduce((acc, v) => {
    const existing = acc.find(d => d.name === v.status);
    if (existing) existing.value++;
    else acc.push({ name: v.status, value: 1 });
    return acc;
  }, []);

  // Anomaly type distribution
  const anomalyTypes = anomalies.reduce((acc, a) => {
    const existing = acc.find(d => d.type === a.anomaly_type);
    if (existing) existing.count++;
    else acc.push({ type: a.anomaly_type, count: 1 });
    return acc;
  }, []);

  // Spill confidence distribution
  const confidenceBuckets = [
    { range: '50-60%', count: 0 }, { range: '60-70%', count: 0 },
    { range: '70-80%', count: 0 }, { range: '80-90%', count: 0 },
    { range: '90-100%', count: 0 },
  ];
  spills.forEach(s => {
    const pct = (s.confidence || 0) * 100;
    if (pct >= 90) confidenceBuckets[4].count++;
    else if (pct >= 80) confidenceBuckets[3].count++;
    else if (pct >= 70) confidenceBuckets[2].count++;
    else if (pct >= 60) confidenceBuckets[1].count++;
    else confidenceBuckets[0].count++;
  });

  const tooltipStyle = {
    contentStyle: { background: 'var(--brand-primary)', border: '1px solid rgba(50,145,255,0.3)', borderRadius: '12px', color: '#e2e8f0' },
  };

  return (
    <div className="min-h-screen pt-20 px-4 pb-8 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold gradient-text">Analytics</h1>
          <p className="text-gray-400 text-sm mt-1">Detection trends, statistics, and insights</p>
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Vessels', value: stats?.total_vessels || 0, color: 'text-blue-400' },
            { label: 'Satellite Scans', value: stats?.total_satellite_reports || 0, color: 'text-indigo-400' },
            { label: 'Total Spills', value: stats?.total_spills || 0, color: 'text-red-400' },
            { label: 'Alert Events', value: stats?.total_alerts || 0, color: 'text-purple-400' },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="glass-card p-5 text-center">
              <p className="text-gray-400 text-sm">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend chart */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
              <FiTrendingUp className="text-brand-accent" /><span>Detection Trends (7 Days)</span>
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={stats?.trend_data || []}>
                <defs>
                  <linearGradient id="colorAnomalies" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSpills" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff2d2d" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ff2d2d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip {...tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="anomalies" stroke="#f59e0b" fill="url(#colorAnomalies)" strokeWidth={2} />
                <Area type="monotone" dataKey="spills" stroke="#ff2d2d" fill="url(#colorSpills)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Vessel Status Pie */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
              <FiPieChart className="text-brand-accent" /><span>Vessel Status Distribution</span>
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Anomaly Types Bar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
              <FiBarChart2 className="text-brand-accent" /><span>Anomaly Type Distribution</span>
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={anomalyTypes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="type" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" fill="var(--brand-secondary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Spill Confidence */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
              <FiBarChart2 className="text-brand-accent" /><span>Spill Confidence Distribution</span>
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={confidenceBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                <XAxis dataKey="range" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {confidenceBuckets.map((_, i) => (
                    <Cell key={i} fill={i >= 3 ? '#ff2d2d' : i >= 2 ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
