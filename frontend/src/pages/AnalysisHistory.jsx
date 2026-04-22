import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiFileText, FiDownload, FiTrash2, FiExternalLink, FiSearch, 
  FiFilter, FiCalendar, FiTrendingUp, FiAlertTriangle, FiCheckCircle,
  FiActivity, FiPieChart, FiBarChart2, FiInfo, FiArrowRight
} from 'react-icons/fi';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import toast from 'react-hot-toast';

const SEVERITY_COLORS = {
  low: 'text-green-400 bg-green-500/10 border-green-500/20',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  critical: 'text-red-400 bg-red-500/10 border-red-500/20'
};

const PIE_COLORS = ['#ef4444', '#10b981'];

export default function AnalysisHistory() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState('all'); // all, spill, clear
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
      console.error('Fetch error:', err);
      toast.error('Search engine offline');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Securely wipe this record?')) return;
    try {
      const token = localStorage.getItem('aquasentinel_token');
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Record purged');
        setReports(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      toast.error('Purge failed');
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch = r.filename?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.id.toString().includes(searchTerm) ||
                          r.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterResult === 'all' || 
                          (filterResult === 'spill' && r.spill) || 
                          (filterResult === 'clear' && !r.spill);
    
    return matchesSearch && matchesFilter;
  });

  // Stats Logic
  const totalScans = reports.length;
  const spillsCount = reports.filter(r => r.spill).length;
  const avgConfidence = reports.length > 0 
    ? (reports.reduce((acc, r) => acc + (r.confidence || 0), 0) / reports.length * 100).toFixed(1)
    : 0;

  const chartData = reports.slice(-10).map(r => ({
    name: `#${r.id}`,
    confidence: (r.confidence * 100).toFixed(0),
    spill: r.spill ? 1 : 0
  }));

  const pieData = [
    { name: 'Spills', value: spillsCount },
    { name: 'Clear', value: totalScans - spillsCount }
  ];

  if (loading) return (
    <div className="min-h-screen pt-24 bg-brand-bg flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-t-brand-secondary border-brand-primary rounded-full animate-spin mb-4" />
      <p className="text-brand-accent font-display tracking-widest animate-pulse uppercase text-xs">Accessing Secure Archives</p>
    </div>
  );

  return (
    <div className="min-h-screen pt-24 pb-20 px-6 bg-brand-bg">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-2 h-2 bg-brand-secondary rounded-full animate-ping" />
              <span className="text-brand-accent font-display text-[10px] tracking-[0.3em] uppercase">Security Operations Center</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-white tracking-tight">Analysis History</h1>
            <p className="text-gray-500 mt-2 max-w-xl">
              Complete chronological audit of all AI-driven satellite scans, including anomaly detection and authority alerts.
            </p>
          </div>

          <div className="flex items-center space-x-4">
             <div className="glass-card px-6 py-4 flex flex-col items-center justify-center min-w-[120px]">
                <span className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-1">Total Logs</span>
                <span className="text-2xl font-bold text-white">{totalScans}</span>
             </div>
             <div className="glass-card px-6 py-4 flex flex-col items-center justify-center min-w-[120px] border-l-red-500/40">
                <span className="text-red-400/60 text-[10px] uppercase font-bold tracking-widest mb-1">Detections</span>
                <span className="text-2xl font-bold text-red-500">{spillsCount}</span>
             </div>
             <div className="glass-card px-6 py-4 flex flex-col items-center justify-center min-w-[120px]">
                 <span className="text-brand-accent/60 text-[10px] uppercase font-bold tracking-widest mb-1">Avg Score</span>
                 <span className="text-2xl font-bold text-brand-accent">{avgConfidence}%</span>
             </div>
          </div>
        </div>

        {/* Visualization Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            <div className="lg:col-span-2 glass-card p-6">
                <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-6 flex items-center space-x-2">
                    <FiTrendingUp className="text-brand-accent" />
                    <span>Inference Confidence Trend (Recent Scans)</span>
                </h3>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--brand-secondary)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="var(--brand-secondary)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                            <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip 
                                contentStyle={{ background: '#010a15', border: '1px solid #ffffff10', borderRadius: '12px' }}
                                itemStyle={{ fontSize: '12px', color: '#fff' }}
                            />
                            <Area type="monotone" dataKey="confidence" stroke="var(--brand-secondary)" fillOpacity={1} fill="url(#colorConf)" strokeWidth={2} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="glass-card p-6 flex flex-col">
                <h3 className="text-white text-xs font-bold uppercase tracking-widest mb-6 flex items-center space-x-2">
                    <FiPieChart className="text-red-400" />
                    <span>Incidents vs Clear Scans</span>
                </h3>
                <div className="flex-1 flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%" cy="50%"
                                innerRadius={45} outerRadius={70}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ background: '#010a15', border: '1px solid #ffffff10', borderRadius: '12px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-white leading-none">{((spillsCount / totalScans) * 100).toFixed(0)}%</span>
                        <span className="text-[8px] text-gray-500 uppercase font-black mt-1">Spill Ratio</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Interactive Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="relative w-full md:w-96">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Search by Filename, ID, or Authority Email..."
                    className="w-full bg-brand-primary/50 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-brand-secondary/50 transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex items-center bg-brand-bg border border-white/5 p-1 rounded-2xl">
                {['all', 'spill', 'clear'].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setFilterResult(tab)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                            filterResult === tab ? 'bg-brand-secondary text-white shadow-lg' : 'text-gray-500 hover:text-white'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
        </div>

        {/* Data Table */}
        <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#ffffff02] border-b border-white/5">
                        <tr>
                            <th className="px-6 py-5 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">ID</th>
                            <th className="px-6 py-5 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">File Matrix</th>
                            <th className="px-6 py-5 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Analysis</th>
                            <th className="px-6 py-5 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Confidence</th>
                            <th className="px-6 py-5 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Severity</th>
                            <th className="px-6 py-5 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Authority Destination</th>
                            <th className="px-6 py-5 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Timestamp</th>
                            <th className="px-6 py-5 text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">PDF</th>
                            <th className="px-6 py-5 text-right text-[10px] uppercase font-black text-gray-500 tracking-[0.2em]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <AnimatePresence mode="popLayout">
                            {filteredReports.map((report) => (
                                <motion.tr 
                                    key={report.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => navigate(`/reports/${report.id}`)}
                                    className="group hover:bg-white/[0.02] cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-6 font-mono text-xs text-brand-accent font-bold">
                                        #AS-{report.id.toString().padStart(5, '0')}
                                    </td>
                                    <td className="px-6 py-6 max-w-[200px]">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 overflow-hidden flex-shrink-0">
                                                <img src={`/api/reports/${report.id}/image`} className="w-full h-full object-cover opacity-60" />
                                            </div>
                                            <div className="flex flex-col overflow-hidden">
                                                <span className="text-white text-xs font-medium truncate">{report.filename}</span>
                                                <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest mt-0.5">SAR_H1_DENSE</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                                            report.spill ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                                        }`}>
                                            {report.spill ? <FiAlertTriangle className="mr-1.5" /> : <FiCheckCircle className="mr-1.5" />}
                                            {report.spill ? 'Spill Detected' : 'Clear Scan'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col">
                                            <span className={`text-sm font-black ${report.spill ? 'text-red-400' : 'text-green-400'}`}>
                                                {(report.confidence * 100).toFixed(0)}%
                                            </span>
                                            <div className="w-16 h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                                                <div className={`h-full ${report.spill ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${report.confidence * 100}%` }} />
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${SEVERITY_COLORS[report.severity || 'low']}`}>
                                            {report.severity || 'low'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-gray-300 text-xs truncate max-w-[150px]">{report.email || '—'}</span>
                                            {report.email_sent && <span className="text-[8px] text-brand-accent font-bold uppercase tracking-widest mt-1 italic">✔️ Notification Sent</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-white text-xs font-medium">{new Date(report.created_at).toLocaleDateString()}</span>
                                            <span className="text-[9px] text-gray-600 uppercase font-black tracking-widest mt-0.5">{new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        {report.pdf_path ? (
                                            <a 
                                                href={`/api/reports/${report.id}/pdf`} 
                                                onClick={(e) => e.stopPropagation()} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-brand-secondary/10 text-brand-accent border border-brand-secondary/20 hover:bg-brand-secondary hover:text-white transition-all shadow-lg hover:shadow-brand-secondary/20"
                                            >
                                                <FiFileText size={18} />
                                            </a>
                                        ) : '—'}
                                    </td>
                                    <td className="px-6 py-6 text-right">
                                        <div className="flex items-center justify-end space-x-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); navigate(`/reports/${report.id}`); }}
                                                className="p-2 text-gray-500 hover:text-brand-accent hover:bg-brand-secondary/10 rounded-lg transition-all"
                                                title="View Details"
                                            >
                                                <FiInfo size={18} />
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(report.id, e)}
                                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                                title="Purge Record"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </AnimatePresence>
                    </tbody>
                </table>
            </div>
            
            {filteredReports.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center">
                     <div className="w-16 h-16 bg-white/[0.02] rounded-full flex items-center justify-center mb-4 border border-white/5">
                        <FiFileText className="text-gray-700 text-2xl" />
                     </div>
                     <h4 className="text-white font-medium">No results found in data matrix</h4>
                     <p className="text-gray-500 text-xs mt-1">Try adjusting your filters or performing new satellite analysis.</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
