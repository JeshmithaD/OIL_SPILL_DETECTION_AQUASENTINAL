import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiDownload, FiTrash2, FiClock, FiMapPin, FiCpu, FiShield, FiAlertTriangle, FiCheckCircle, FiFileText, FiImage, FiLayers } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [id]);

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem('aquasentinel_token');
      const res = await fetch('/api/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const found = data.find(r => r.id === parseInt(id));
        if (found) {
          setReport(found);
        } else {
          toast.error('Report not found');
          navigate('/reports');
        }
      }
    } catch (err) {
      console.error('Fetch report error:', err);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      const token = localStorage.getItem('aquasentinel_token');
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Report deleted');
        navigate('/reports');
      }
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-20">
      <div className="spinner w-12 h-12 border-brand-secondary mb-4" />
      <p className="text-gray-500">Decrypting satellite data...</p>
    </div>
  );

  if (!report) return null;

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-brand-bg">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumbs / Back button */}
        <div className="mb-8 flex items-center justify-between">
          <Link to="/reports" className="flex items-center space-x-2 text-gray-500 hover:text-white transition-colors">
            <FiArrowLeft />
            <span>Back to Repository</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {report.pdf_path && (
              <a href={`/api/reports/${report.id}/pdf`} target="_blank" rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-brand-secondary/10 hover:bg-brand-secondary/20 text-brand-accent rounded-xl transition-all">
                <FiDownload />
                <span>Download Report PDF</span>
              </a>
            )}
            <button onClick={handleDelete} className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
              <FiTrash2 />
            </button>
          </div>
        </div>

        {/* Header Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 glass-card p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${
                report.spill ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'
              }`}>
                {report.spill ? <FiAlertTriangle /> : <FiCheckCircle />}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
                  {report.spill ? 'Incident Detected' : 'Clear Scan Results'}
                </h1>
                <p className="text-gray-400">Analysis ID: #AS-{report.id.toString().padStart(5, '0')}</p>
              </div>
              <div className="ml-auto text-right">
                <div className={`text-3xl font-bold ${report.spill ? 'text-red-400' : 'text-green-400'}`}>
                   {(report.confidence * 100).toFixed(1)}%
                </div>
                <p className="text-[10px] text-gray-500 tracking-widest uppercase">CNN Confidence</p>
              </div>
            </div>
            
            <div className="h-4 bg-brand-primary/80 rounded-full overflow-hidden mb-6 border border-brand-primary/20">
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${report.confidence * 100}%` }}
                 transition={{ duration: 1.5, ease: "easeOut" }}
                 className={`h-full rounded-full ${report.spill ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-gradient-to-r from-green-600 to-brand-secondary'}`}
               />
            </div>

            <div className="grid grid-cols-3 gap-4">
               {[
                 { label: 'Intensity', value: report.intensity ? report.intensity.toFixed(2) : 'N/A', icon: <FiLayers className="text-orange-400" /> },
                 { label: 'Area (%)', value: report.area ? `${report.area}%` : 'N/A', icon: <FiBarChart2 className="text-blue-400" /> },
                 { label: 'Risk Level', value: (report.severity || 'low').toUpperCase(), icon: <FiShield className="text-green-400" /> },
               ].map((item, i) => (
                 <div key={i} className="bg-brand-bg/40 p-3 rounded-xl border border-brand-primary/10">
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
                       {item.icon}
                       <span>{item.label}</span>
                    </div>
                    <div className="text-white font-bold">{item.value}</div>
                 </div>
               ))}
            </div>
          </div>

          <div className="glass-card p-6 flex flex-col justify-center">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Metadata</h3>
            <div className="space-y-4">
               <div className="flex items-center space-x-3 text-sm">
                 <FiFileText className="text-brand-accent" />
                 <span className="text-gray-300">File:</span>
                 <span className="text-white font-medium truncate">{report.filename}</span>
               </div>
               <div className="flex items-center space-x-3 text-sm">
                 <FiClock className="text-brand-accent" />
                 <span className="text-gray-300">Timestamp:</span>
                 <span className="text-white font-medium">{new Date(report.created_at).toLocaleString()}</span>
               </div>
               <div className="flex items-center space-x-3 text-sm">
                 <FiMapPin className="text-brand-accent" />
                 <span className="text-gray-300">Location:</span>
                 <span className="text-white font-medium font-mono">10.42° N, 76.31° E</span>
               </div>
               <div className="flex items-center space-x-3 text-sm">
                 <FiCpu className="text-brand-accent" />
                 <span className="text-gray-300">Algorithm:</span>
                 <span className="text-white font-medium">Hybrid V8 + EN-B0</span>
               </div>
            </div>
          </div>
        </div>

        {/* Detection Proofs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           {/* Original Image */}
           <div className="glass-card p-5 group">
             <h4 className="text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-center">Satellite RAW</h4>
             <div className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-white/5 relative">
               <img src={`/api/reports/${report.id}/image`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="Original" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
               <div className="absolute bottom-3 left-3 flex items-center space-x-2 text-[10px] text-gray-400">
                  <FiImage /> <span>SAR_1_BAND_HV</span>
               </div>
             </div>
           </div>

           {/* YOLO Overlay */}
           <div className="glass-card p-5 group">
             <h4 className="text-orange-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-center">YOLOv8 Identification</h4>
             <div className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-orange-500/10 relative flex items-center justify-center">
               {report.yolo_filename ? (
                 <img src={`/api/reports/${report.id}/yolo`} className="w-full h-full object-cover" alt="YOLO Detection" />
               ) : (
                 <div className="text-center opacity-40">
                   <FiAlertTriangle className="text-4xl mx-auto mb-2 text-gray-600" />
                   <p className="text-[10px] uppercase text-gray-600">No region detected</p>
                 </div>
               )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
               <div className="absolute bottom-3 left-3 flex items-center space-x-2 text-[10px] text-orange-400/80">
                  <FiLayers /> <span>Bounding Box Isolation</span>
               </div>
             </div>
           </div>

           {/* Grad-CAM Heatmap */}
           <div className="glass-card p-5 group">
             <h4 className="text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-center">AI Explainability Mask</h4>
             <div className="aspect-square rounded-2xl overflow-hidden bg-black/40 border border-blue-500/10 relative flex items-center justify-center">
                {report.heatmap_filename ? (
                  <img src={`/api/reports/${report.id}/heatmap`} className="w-full h-full object-cover" alt="CNN Heatmap" />
                ) : (
                  <div className="text-center p-6 bg-brand-bg/20 rounded-2xl border border-dashed border-brand-primary/20">
                    <FiCpu className="text-3xl mx-auto mb-2 text-gray-700" />
                    <p className="text-[10px] uppercase text-gray-600 font-bold tracking-widest">Legacy Analysis</p>
                    <p className="text-[9px] text-gray-700 mt-1 max-w-[120px] mx-auto uppercase">Grad-CAM available only for new reports</p>
                  </div>
                )}
               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60" />
               <div className="absolute bottom-3 left-3 flex items-center space-x-2 text-[10px] text-blue-400/80">
                  <FiCpu /> <span>Grad-CAM Activation Grid</span>
               </div>
             </div>
           </div>
        </div>

        {/* Technical Summary */}
        <div className="glass-card p-8">
           <h3 className="text-white font-semibold mb-6 flex items-center space-x-2">
             <FiFileText className="text-brand-accent" /><span>Technical Analysis Narrative</span>
           </h3>
           <div className="prose prose-invert max-w-none text-gray-400 text-sm leading-relaxed space-y-4">
              <p>
                The automated detection pipeline identified an orientation and texture pattern consistent with maritime oil discharge on SAR imagery. 
                Initial classification via **EfficientNetB0** achieved a confidence score of **{(report.confidence * 100).toFixed(1)}%**.
              </p>
              <p>
                Secondary verification using **YOLOv8** {report.yolo_filename ? `confirmed the presence of ${report.area > 0 ? report.area + '% coverage' : 'anomalous regions'}` : 'was unable to provide a high-confidence bounding box, likely due to low contrast on the SAR input.'}
              </p>
               <div className="bg-brand-bg/60 p-5 rounded-2xl border border-brand-primary/30 mt-6 box-border">
                  <h4 className="text-brand-accent font-bold text-xs uppercase mb-3">System Conclusion</h4>
                 <p className="text-white font-medium text-base">
                   {report.spill 
                     ? "🚨 CRITICAL: The hybrid analysis confirms an active oil spill incident. Deployment of containment equipment is highly recommended." 
                     : "✅ VERIFIED: The anomaly has been rejected by the deep learning validation stage. No oil spill evidence found."}
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

const FiBarChart2 = ({ className }) => <svg className={className} stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
