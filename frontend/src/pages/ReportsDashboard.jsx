import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiMap, FiBarChart2, FiPieChart, FiActivity, FiArrowRight, FiShield, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import toast from 'react-hot-toast';

const SEVERITY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#10b981' };

export default function ReportsDashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('aquasentinel_token');
      const res = await fetch('/api/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data || []);
      }
    } catch (err) {
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // 📝 Data Processing for Charts
  const totalReports = reports.length;
  const spillReports = reports.filter(r => r.spill);
  const spillCount = spillReports.length;
  const avgConfidence = totalReports > 0 
    ? (reports.reduce((acc, r) => acc + r.confidence, 0) / totalReports * 100).toFixed(1) 
    : 0;

  // Severity Distribution
  const severityData = [
    { name: 'Critical', value: reports.filter(r => r.severity === 'critical').length, color: SEVERITY_COLORS.critical },
    { name: 'High', value: reports.filter(r => r.severity === 'high').length, color: SEVERITY_COLORS.high },
    { name: 'Medium', value: reports.filter(r => r.severity === 'medium').length, color: SEVERITY_COLORS.medium },
    { name: 'Low/Clear', value: reports.filter(r => !r.spill || r.severity === 'low').length, color: SEVERITY_COLORS.low },
  ].filter(d => d.value > 0);

  // Trend Data (Last 7 days)
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const count = reports.filter(r => new Date(r.created_at).toDateString() === d.toDateString()).length;
    const spills = reports.filter(r => r.spill && new Date(r.created_at).toDateString() === d.toDateString()).length;
    return { date: dateStr, count, spills };
  }).reverse();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center pt-20">
      <div className="spinner w-12 h-12 border-brand-secondary" />
    </div>
  );

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold text-white tracking-tight">Intelligence Repository</h1>
            <p className="text-gray-500 mt-1">Spatial analytics & historical detection metrics</p>
          </div>
          <Link to="/reports/list" className="mt-4 md:mt-0 flex items-center space-x-2 text-brand-accent hover:text-white transition-all text-sm font-bold uppercase tracking-widest">
             <span>Browse List</span>
             <FiArrowRight />
          </Link>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
           {[
             { label: 'Total Scans', value: totalReports, icon: <FiActivity />, color: 'text-blue-400' },
             { label: 'Confirmed Spills', value: spillCount, icon: <FiAlertTriangle />, color: 'text-red-400' },
             { label: 'Avg Confidence', value: `${avgConfidence}%`, icon: <FiShield />, color: 'text-green-400' },
             { label: 'Scanned Assets', value: totalReports * 12, icon: <FiBarChart2 />, color: 'text-purple-400' },
           ].map((kpi, i) => (
             <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
               className="glass-card p-5 border-white/5">
                <div className="flex items-center justify-between mb-3 text-gray-500">
                   <span className="text-xs font-bold uppercase tracking-widest">{kpi.label}</span>
                   <span className={kpi.color}>{kpi.icon}</span>
                </div>
                <div className="text-3xl font-bold text-white">{kpi.value}</div>
             </motion.div>
           ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
           {/* Spatial Distribution Map */}
           <div className="lg:col-span-2 glass-card p-5 h-[500px] flex flex-col">
              <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
                <FiMap className="text-brand-accent" /><span>Spatial Distribution</span>
              </h3>
              <div className="flex-1 rounded-2xl overflow-hidden border border-white/5">
                 <MapContainer center={[15.5, 73.0]} zoom={5} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CartoDB" />
                    {reports.map((r) => (
                      <CircleMarker 
                        key={r.id} 
                        center={[15.5 + (Math.random()-0.5)*10, 73.0 + (Math.random()-0.5)*10]} // Random variation for demo visualization
                        radius={r.spill ? 12 : 6}
                        pathOptions={{ 
                          color: r.spill ? SEVERITY_COLORS[r.severity || 'critical'] : '#10b981',
                          fillOpacity: 0.6,
                          weight: 1
                        }}
                        eventHandlers={{ click: () => navigate(`/reports/${r.id}`) }}
                      >
                        <Popup>
                          <div className="text-sm">
                            <strong>{r.filename}</strong><br />
                            Confidence: {(r.confidence * 100).toFixed(0)}%<br />
                            Status: <span className={r.spill ? 'text-red-500 font-bold' : 'text-green-500'}>
                              {r.spill ? 'SPILL' : 'CLEAR'}
                            </span>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                 </MapContainer>
              </div>
           </div>

           {/* Severity Breakdown */}
           <div className="glass-card p-5 flex flex-col h-[500px]">
              <h3 className="text-white font-semibold mb-6 flex items-center space-x-2">
                <FiPieChart className="text-brand-accent" /><span>Severity Distribution</span>
              </h3>
              <div className="flex-1">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie 
                      data={severityData} 
                      cx="50%" cy="50%" 
                      innerRadius={60} outerRadius={80} 
                      paddingAngle={5} dataKey="value"
                    >
                      {severityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: 'var(--brand-primary)', border: '1px solid rgba(50,145,255,0.1)', borderRadius: '12px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="space-y-3 mt-4">
                   {severityData.map((d, i) => (
                     <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 text-gray-400">
                           <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                           <span>{d.name}</span>
                        </div>
                        <span className="text-white font-bold">{d.value}</span>
                     </div>
                   ))}
                </div>
              </div>
           </div>
        </div>

        {/* Bottom Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Trend Analytics */}
           <div className="glass-card p-6 h-[350px] flex flex-col">
              <h3 className="text-white font-semibold mb-6 flex items-center space-x-2 text-sm uppercase tracking-widest">
                <FiActivity className="text-brand-accent" /><span>Incident Trends (7D)</span>
              </h3>
              <div className="flex-1">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={last7Days}>
                       <defs>
                          <linearGradient id="colorSpills" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                             <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <XAxis dataKey="date" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                       <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} />
                       <Tooltip 
                         contentStyle={{ background: 'var(--brand-primary)', border: '1px solid rgba(50,145,255,0.1)', borderRadius: '12px' }}
                         itemStyle={{ color: '#fff' }}
                       />
                       <Area type="monotone" dataKey="spills" stroke="#ef4444" fillOpacity={1} fill="url(#colorSpills)" strokeWidth={3} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Recent Intelligence Feed */}
           <div className="glass-card p-6 h-[350px] flex flex-col">
              <h3 className="text-white font-semibold mb-6 flex items-center space-x-2 text-sm uppercase tracking-widest">
                <FiCheckCircle className="text-brand-accent" /><span>Recent Feed</span>
              </h3>
              <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                 {reports.slice(0, 5).map((r, i) => (
                    <div key={i} onClick={() => navigate(`/reports/${r.id}`)}
                      className="group p-3 rounded-xl bg-brand-primary/40 border border-white/5 hover:border-brand-secondary/30 transition-all cursor-pointer flex items-center justify-between">
                       <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs ${r.spill ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                             {r.spill ? '!' : '✓'}
                          </div>
                          <div>
                             <p className="text-xs text-white font-medium truncate max-w-[150px]">{r.filename}</p>
                             <p className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleString()}</p>
                          </div>
                       </div>
                       <div className="text-right">
                          <p className={`text-[10px] font-bold ${r.spill ? 'text-red-400' : 'text-green-400'}`}>
                            {(r.confidence * 100).toFixed(0)}%
                          </p>
                           <FiArrowRight className="text-gray-700 group-hover:text-brand-accent ml-auto mt-1" size={12} />
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
