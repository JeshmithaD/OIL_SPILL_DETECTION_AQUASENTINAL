import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiFileText, FiDownload, FiTrash2, FiExternalLink, FiSearch, FiFilter, FiCalendar } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ReportsList() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
      } else {
        toast.error('Failed to load reports');
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('Permanently delete this report?')) return;
    
    try {
      const token = localStorage.getItem('aquasentinel_token');
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Report deleted');
        setReports(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const filteredReports = reports.filter(r => 
    r.filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toString().includes(searchTerm) ||
    (r.spill ? 'spill' : 'clear').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="font-display text-4xl font-bold gradient-text">Analysis Repository</h1>
            <p className="text-gray-400 mt-2">Historical database of all satellite & SAR AI detections</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search reports..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-brand-primary/50 border border-brand-primary/30 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-secondary w-full md:w-64"
              />
            </div>
            <button onClick={fetchReports} className="glass-card p-2.5 hover:bg-brand-primary/30 text-brand-accent">
               <FiFilter />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="spinner w-12 h-12 border-brand-secondary mb-4" />
            <p className="text-gray-500 animate-pulse">Accessing secure archives...</p>
          </div>
        ) : filteredReports.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReports.map((report, idx) => (
              <motion.div
                key={report.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/reports/${report.id}`)}
                className="glass-card group hover:border-brand-secondary/40 transition-all cursor-pointer overflow-hidden flex flex-col"
              >
                {/* Image Preview */}
                <div className="aspect-video relative overflow-hidden bg-black/40">
                  <img 
                    src={`/api/reports/${report.id}/image`} 
                    alt={report.filename}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-60 group-hover:opacity-90"
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400x225?text=SAR+Data+Missing'; }}
                  />
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${
                    report.spill ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'bg-green-500 text-white'
                  }`}>
                    {report.spill ? 'Spill' : 'Clear'}
                  </div>
                </div>

                {/* Info Container */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <FiCalendar className="text-brand-accent" />
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    </span>
                    <span className="font-mono text-brand-accent">#AS-{report.id.toString().padStart(5, '0')}</span>
                  </div>
                  
                  <h3 className="text-white font-medium truncate mb-2">{report.filename}</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-brand-primary/30">
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Confidence</p>
                      <p className={`text-sm font-bold ${report.spill ? 'text-red-400' : 'text-green-400'}`}>
                        {(report.confidence * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-gray-500 font-bold mb-1">Result</p>
                      <p className="text-sm font-bold text-white uppercase">{report.severity || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Quick Actions Footer */}
                <div className="px-5 py-3 bg-brand-bg/40 flex items-center justify-between border-t border-brand-primary/10">
                   <div className="flex space-x-4">
                     {report.pdf_path && (
                       <a href={`/api/reports/${report.id}/pdf`} onClick={(e) => e.stopPropagation()} target="_blank" rel="noopener noreferrer" 
                          className="text-gray-500 hover:text-brand-accent transition-colors">
                         <FiDownload size={16} />
                       </a>
                     )}
                     <button onClick={(e) => handleDelete(report.id, e)} className="text-gray-500 hover:text-red-400 transition-colors">
                       <FiTrash2 size={16} />
                     </button>
                   </div>
                   <FiExternalLink className="text-gray-700 group-hover:text-brand-secondary transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-20 text-center">
            <FiFileText className="text-6xl text-ocean-800 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">No reports found</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              {searchTerm ? 'Try adjusting your search filters.' : 'Perform an analysis on the Dashboard or Compare page to see reports here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
