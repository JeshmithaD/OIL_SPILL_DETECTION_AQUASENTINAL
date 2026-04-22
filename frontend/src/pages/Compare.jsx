import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiMail, FiCheckCircle, FiAlertTriangle, FiCpu, FiFileText, FiDownload, FiX, FiImage, FiTrash2, FiArrowLeft, FiShield, FiZap } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function Compare() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [email, setEmail] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [forceAnalysis, setForceAnalysis] = useState(false);
  const [result, setResult] = useState(null);
  const [reports, setReports] = useState([]);
  const [pipelineStep, setPipelineStep] = useState(0);
  const fileInputRef = useRef(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const reportId = searchParams.get('report_id');
  const navigate = useNavigate();

  useEffect(() => {
    fetchReports().then(data => {
      if (reportId && data) {
        const matchingReport = data.find(r => r.id === parseInt(reportId));
        if (matchingReport) {
          setResult(matchingReport);
          setPreview(`/api/reports/${matchingReport.id}/image`);
          setPipelineStep(6);
          toast.success("Loaded automated detection results.", { duration: 3000 });
        }
      }
    });
  }, [reportId]);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('aquasentinel_token');
      const res = await fetch(`/api/reports?_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data || []);
        return data;
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to fetch reports:', errorData);
      }
    } catch (err) {
      console.error('Fetch reports error:', err);
    }
    return null;
  };

  const handleDeleteReport = async (id) => {
    if (!window.confirm('Are you sure you want to completely delete this report? Both the uploaded image and PDF will be erased from the server.')) return;
    try {
      const token = localStorage.getItem('aquasentinel_token');
      const res = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Report deleted successfully');
        if (result && result.report_id === id) setResult(null);
        fetchReports();
      } else {
        toast.error('Failed to delete report');
      }
    } catch (err) {
      toast.error('Connection error');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setResult(null);
    setPipelineStep(0);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setImage(file);
      setResult(null);
      setPipelineStep(0);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) { toast.error('Please upload an image first'); return; }
    setAnalyzing(true);
    setResult(null);

    // Animate pipeline steps
    setPipelineStep(1); // Upload
    await new Promise(r => setTimeout(r, 600));
    setPipelineStep(2); // CNN Analysis
    await new Promise(r => setTimeout(r, 800));

    try {
      const formData = new FormData();
      formData.append('file', image);
      formData.append('email', email);
      formData.append('force', forceAnalysis ? 'true' : 'false');

      const token = localStorage.getItem('aquasentinel_token');
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      setPipelineStep(3); // Generating PDF
      await new Promise(r => setTimeout(r, 500));

      const data = await res.json();

      setPipelineStep(4); // Storing in DB
      await new Promise(r => setTimeout(r, 400));

      if (data.spill && email) {
        setPipelineStep(5); // Sending Email
        await new Promise(r => setTimeout(r, 500));
      }

      setPipelineStep(6); // Complete
      setResult(data);

      if (data.spill) {
        toast.error(`🛢️ Oil Spill Detected! Confidence: ${(data.confidence * 100).toFixed(0)}%`, { duration: 6000 });
      } else {
        toast.success(`✅ No Oil Spill Detected — Confidence: ${((1 - data.confidence) * 100).toFixed(0)}%`, { duration: 4000 });
      }

      fetchReports();
    } catch (err) {
      toast.error('Analysis failed. Check backend connection.');
    } finally {
      setAnalyzing(false);
    }
  };

  const pipelineSteps = [
    { label: 'CNN Identification', icon: '🧠' },
    { label: 'Grad-CAM Explainability', icon: '🔥' },
    { label: 'Generate PDF', icon: '📄' },
    { label: 'Store in DB', icon: '🗄️' },
    { label: 'Send Email', icon: '📩' },
    { label: 'Complete', icon: '✅' },
  ];

  return (
    <div className="min-h-screen pt-24 px-4 pb-8 bg-brand-bg">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold gradient-text">Compare — Oil Spill Detector</h1>
          <p className="text-gray-400 text-sm mt-1">Upload SAR/satellite images to detect oil spills with CNN analysis</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Upload + Email */}
          <div className="space-y-5">
            {/* Upload zone */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 border-2 border-dashed border-brand-primary/40 hover:border-brand-secondary/60 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

              {preview ? (
                <div className="relative">
                  {/* Show YOLO annotated image if available, else show preview */}
                  {result?.yolo?.annotated_image_b64 ? (
                    <img src={result.yolo.annotated_image_b64} alt="YOLO Detection Overlay" className="w-full rounded-xl max-h-[300px] object-contain mx-auto" />
                  ) : (
                    <img src={preview} alt="Uploaded" className="w-full rounded-xl max-h-[300px] object-contain mx-auto" />
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setImage(null); setPreview(null); setResult(null); setPipelineStep(0); }}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500/80 hover:bg-red-600 rounded-full flex items-center justify-center text-white">
                    <FiX size={16} />
                  </button>
                  <p className="text-center text-gray-400 text-sm mt-3">
                    {image?.name} {result?.yolo?.annotated_image_b64 && <span className="text-brand-accent font-medium ml-2">(YOLO Overlay Active)</span>}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-10 text-gray-400">
                   <FiUploadCloud className="text-5xl text-brand-secondary mb-4" />
                  <p className="text-lg font-medium text-white">Drop image here or click to upload</p>
                  <p className="text-sm text-gray-500 mt-1">SAR, satellite imagery, or ocean photos</p>
                  <p className="text-xs text-gray-600 mt-3">Supports JPG, PNG, TIFF</p>
                </div>
              )}
            </motion.div>

            {/* Email input */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="glass-card p-5">
              <label className="text-gray-300 text-sm font-medium flex items-center space-x-2 mb-3">
                 <FiMail className="text-brand-accent" />
                <span>Authority Email (auto-alert on spill)</span>
              </label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="coastguard@example.com"
                 className="w-full bg-brand-bg/80 border border-brand-primary/30 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:border-brand-secondary focus:outline-none transition-colors" />
              <p className="text-xs text-gray-500 mt-2">If spill detected → PDF report auto-sent to this email</p>
            </motion.div>

            {/* Advanced: Force Analysis */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className={`glass-card p-4 border-l-4 transition-all ${forceAnalysis ? 'border-orange-500 bg-orange-500/5' : 'border-transparent'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FiZap className={forceAnalysis ? 'text-orange-400' : 'text-gray-500'} />
                  <div>
                    <h4 className="text-sm font-semibold text-white">Manual Sensor Override</h4>
                    <p className="text-[10px] text-gray-500">Bypass SAR-only filter for optical photos</p>
                  </div>
                </div>
                <button 
                  onClick={() => setForceAnalysis(!forceAnalysis)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${forceAnalysis ? 'bg-orange-600' : 'bg-gray-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${forceAnalysis ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
              {forceAnalysis && (
                <p className="mt-2 text-[10px] text-orange-400/80 leading-tight">
                  ⚠️ Warning: Relaxing the filter may cause false positives on clouds, waves, or coastal vegetation.
                </p>
              )}
            </motion.div>

            {/* Analyze button */}
            <motion.button
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              onClick={handleAnalyze}
              disabled={!image || analyzing}
              className={`w-full py-4 rounded-xl font-semibold text-lg flex items-center justify-center space-x-3 transition-all ${
                !image || analyzing
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                   : 'bg-gradient-to-r from-brand-secondary to-brand-accent text-white hover:shadow-lg hover:shadow-brand-secondary/30'
              }`}>
              {analyzing ? (
                <>
                  <div className="spinner w-6 h-6" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <FiCpu className="text-xl" />
                  <span>Analyze Image</span>
                </>
              )}
            </motion.button>

            {/* Pipeline progress */}
            {pipelineStep > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5">
                <h4 className="text-white font-semibold text-sm mb-3">Pipeline Progress</h4>
                <div className="space-y-2.5">
                  {pipelineSteps.map((step, i) => {
                    const stepNum = i + 1;
                    const isActive = pipelineStep === stepNum;
                    const isDone = pipelineStep > stepNum;
                    const isPending = pipelineStep < stepNum;
                    // Skip email step if no email provided
                    if (stepNum === 5 && !email) return null;
                    return (
                      <div key={i} className={`flex items-center space-x-3 py-1.5 px-3 rounded-lg transition-all ${
                        isDone ? 'bg-green-500/10' : isActive ? 'bg-brand-secondary/10' : 'opacity-40'
                      }`}>
                        <span className="text-lg">{isDone ? '✅' : isActive ? step.icon : '⬜'}</span>
                         <span className={`text-sm ${isDone ? 'text-green-400' : isActive ? 'text-brand-accent animate-pulse' : 'text-gray-500'}`}>
                          {step.label}
                        </span>
                        {isActive && <div className="ml-auto spinner w-4 h-4" />}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right: Results */}
          <div className="space-y-5">
            <AnimatePresence mode="wait">
              {result ? (
                <motion.div key="results" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="space-y-5">

                  {/* Verdict */}
                  <div className={`glass-card p-6 border-2 ${result.spill ? 'border-red-500/40 bg-red-500/5' : 'border-green-500/40 bg-green-500/5'}`}>
                    <div className="flex items-center space-x-4 mb-4">
                      {result.spill ? (
                        <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center animate-pulse">
                          <FiAlertTriangle className="text-red-400 text-3xl" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center">
                          <FiCheckCircle className="text-green-400 text-3xl" />
                        </div>
                      )}
                      <div>
                        <h3 className={`text-2xl font-bold ${result.spill ? 'text-red-400' : 'text-green-400'}`}>
                          {result.spill ? '🛢️ OIL SPILL DETECTED' : '✅ NO SPILL DETECTED'}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1 mb-2">
                          {result.message || 'Analysis complete'}
                        </p>
                        <table className="w-full">
                          <tbody>
                            <tr>
                              <td className="py-2 text-gray-500 text-xs">Email Alerting</td>
                              <td className="py-2 text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  result.email_status?.includes('✔️') ? 'bg-green-500/20 text-green-400' : 
                                  result.email_status?.includes('🟢') ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/10 text-red-400'
                                }`}>
                                  {result.email_status || 'Not Sent'}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Confidence bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Confidence</span>
                        <span className={`font-bold ${result.spill ? 'text-red-400' : 'text-green-400'}`}>
                          {(result.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${result.confidence * 100}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            result.spill
                              ? 'bg-gradient-to-r from-orange-500 to-red-500'
                              : 'bg-gradient-to-r from-green-500 to-emerald-400'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Details table */}
                  <div className="glass-card p-5">
                    <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                       <FiFileText className="text-brand-accent" /><span>Validation Summary</span>
                    </h4>
                    <div className="space-y-2.5">
                      {[
                        ['File', result.filename || image?.name],
                        ['Hybrid Decision', result.spill ? '🚨 SPILL CONFIRMED' : '✅ CLEAR'],
                        ['YOLO Identification', result.yolo_filename || result.yolo?.count > 0 ? '✔️ Detected' : '❌ No Region Found'],
                        ['Sensor Validation', result.is_sar ? '✔️ Radar/SAR' : '⚠️ Optical/Color'],
                        ['CNN Classification', `${(result.confidence * 100).toFixed(1)}% Confidence`],
                        ['Explainable AI', result.heatmap_filename ? '✔️ Heatmap Generated' : '❌ N/A'],
                        ['Affected Area', result.area > 0 ? `${result.area}%` : 'N/A'],
                        ['Intensity Score', result.intensity > 0 ? result.intensity.toFixed(2) : 'N/A'],
                        ['Risk Severity', (result.severity || 'N/A').toUpperCase()],
                        ['Report ID', `#${result.report_id || 'N/A'}`],
                        ['Logic Protocol', 'YOLOv8 && EfficientNetB0'],
                      ].map(([label, value], i) => (
                         <div key={i} className="flex items-center justify-between py-2 border-b border-brand-primary/20">
                          <span className="text-gray-400 text-sm">{label}</span>
                          <span className={`text-sm font-medium ${
                            label === 'Hybrid Decision' && result.spill ? 'text-red-400' :
                            label === 'Hybrid Decision' && !result.spill ? 'text-green-400' :
                             label === 'YOLO Identification' && (result.yolo_filename || result.yolo?.count > 0) ? 'text-brand-accent' :
                            'text-white'
                          }`}>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Triple Validation Proof-of-Work */}
                  <div className="glass-card p-5">
                    <h4 className="text-white font-semibold mb-4 flex items-center space-x-2">
                       <FiShield className="text-brand-accent" /><span>AI Triple Validation Proof</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* 1. Original */}
                      <div className="space-y-2">
                        <p className="text-xs text-center text-gray-500 font-medium uppercase tracking-wider">Raw Image</p>
                        <div className="aspect-square rounded-lg overflow-hidden border border-white/10 bg-black/20">
                          <img 
                            src={result.report_id ? `/api/reports/${result.report_id}/image` : preview} 
                            className="w-full h-full object-cover" 
                            alt="Original Satellite" 
                          />
                        </div>
                      </div>
                      
                      {/* 2. YOLO Identification */}
                      <div className="space-y-2">
                        <p className="text-xs text-center text-orange-400/80 font-medium uppercase tracking-wider">YOLO Discovery</p>
                        <div className="aspect-square rounded-lg overflow-hidden border border-orange-500/20 bg-black/20 flex items-center justify-center">
                          {result.report_id && result.yolo_filename ? (
                            <img src={`/api/reports/${result.report_id}/yolo`} className="w-full h-full object-cover" alt="YOLO Detection" />
                          ) : result.yolo?.annotated_image_b64 ? (
                            <img src={result.yolo.annotated_image_b64} className="w-full h-full object-cover" alt="YOLO Detection" />
                          ) : (
                            <div className="text-center p-4">
                              <FiAlertTriangle className="text-gray-600 text-2xl mx-auto mb-2" />
                              <p className="text-[10px] text-gray-600">No Bounding Box</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 3. Grad-CAM Explainable AI */}
                      <div className="space-y-2">
                        <p className="text-xs text-center text-blue-400/80 font-medium uppercase tracking-wider">Explainable AI</p>
                        <div className="aspect-square rounded-lg overflow-hidden border border-blue-500/20 bg-black/20 flex items-center justify-center">
                          {result.report_id && result.heatmap_filename ? (
                            <img src={`/api/reports/${result.report_id}/heatmap`} className="w-full h-full object-cover" alt="CNN Heatmap" />
                          ) : (
                            <div className="text-center p-4">
                              <FiCpu className="text-gray-600 text-2xl mx-auto mb-2" />
                              <p className="text-[10px] text-gray-600">Heatmap N/A</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Matplotlib Visualization */}
                  {result.chart_base64 && (
                    <div className="glass-card p-5">
                      <h4 className="text-white font-semibold mb-3 flex items-center space-x-2">
                         <FiImage className="text-brand-accent" /><span>Detection Metrics Visualization</span>
                      </h4>
                      <div className="rounded-xl overflow-hidden bg-white/5 p-4 flex justify-center">
                        <img src={result.chart_base64} alt="CNN Metrics Chart" className="max-w-full h-auto rounded-lg shadow-lg" />
                      </div>
                    </div>
                  )}

                  {/* Download PDF */}
                  {result.pdf_generated && result.report_id && (
                    <a href={`/api/reports/${result.report_id}/pdf`}
                      target="_blank" rel="noopener noreferrer"
                       className="glass-card p-4 flex items-center justify-center space-x-3 text-brand-accent hover:text-white hover:bg-brand-secondary/10 transition-all cursor-pointer">
                      <FiDownload className="text-xl" />
                      <span className="font-medium">Download PDF Report</span>
                    </a>
                  )}

                  {/* Pipeline summary */}
                  <div className="glass-card p-4">
                    <p className="text-xs text-gray-400 mb-2 font-medium">Automated Pipeline:</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {['Upload', '→', 'CNN Analysis', '→', 'PDF Report', '→', 'Store DB', '→', 'Email Alert'].map((s, i) => (
                         <span key={i} className={s === '→' ? 'text-brand-secondary' : 'px-2 py-1 bg-brand-primary/30 rounded text-brand-accent'}>{s}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="glass-card p-8 flex flex-col items-center justify-center text-center" style={{ minHeight: '400px' }}>
                   <FiImage className="text-6xl text-brand-primary/50 mb-4" />
                  <h3 className="text-gray-500 text-lg font-medium">Upload an image to begin</h3>
                  <p className="text-gray-600 text-sm mt-2 max-w-xs">
                    The system will automatically analyze the image, detect if oil is spilled,
                    generate a PDF report, and email the authority.
                  </p>
                   <div className="mt-6 p-4 bg-brand-bg/50 rounded-xl border border-brand-primary/20 text-left w-full max-w-xs">
                    <p className="text-xs text-gray-400 mb-2 font-medium">Flow:</p>
                    <div className="space-y-1 text-xs text-gray-500">
                      <p>📤 Upload Image</p>
                      <p>🧠 CNN Analysis</p>
                      <p>📄 Generate PDF</p>
                      <p>🗄️ Store in Database</p>
                      <p>📩 Auto-email Authority</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Report History */}
        {reports.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-card p-5 mt-8">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
               <FiFileText className="text-brand-accent" /><span>Analysis History ({reports.length})</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                 <thead><tr className="text-gray-400 border-b border-brand-primary/30">
                  <th className="text-left pb-2 pr-4">ID</th>
                  <th className="text-left pb-2 pr-4">File</th>
                  <th className="text-left pb-2 pr-4">Result</th>
                  <th className="text-left pb-2 pr-4">Confidence</th>
                  <th className="text-left pb-2 pr-4">Severity</th>
                  <th className="text-left pb-2 pr-4">Email</th>
                  <th className="text-left pb-2 pr-4">Date</th>
                  <th className="text-left pb-2 pr-4">PDF</th>
                  <th className="text-left pb-2">Actions</th>
                </tr></thead>
                <tbody>
                  {reports.map(r => (
                     <tr key={r.id} className="border-b border-brand-primary/10 hover:bg-brand-primary/20">
                      <td className="py-2 pr-4 text-gray-400">#{r.id}</td>
                      <td className="py-2 pr-4 text-white text-xs max-w-[120px] truncate">{r.filename}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${r.spill ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                          {r.spill ? 'SPILL' : 'CLEAR'}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-300">{(r.confidence * 100).toFixed(0)}%</td>
                      <td className="py-2 pr-4">
                        <span className={`text-xs font-medium ${r.severity === 'critical' ? 'text-red-400' : r.severity === 'high' ? 'text-orange-400' : 'text-yellow-400'}`}>
                          {r.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-gray-400 text-xs max-w-[100px] truncate">{r.email || '—'}</td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">
                        {r.created_at ? (
                          <div className="flex flex-col">
                            <span>{new Date(r.created_at).toLocaleDateString()}</span>
                            <span className="text-[10px] opacity-60">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="py-2 pr-4">
                        {r.pdf_path ? (
                          <a href={`/api/reports/${r.id}/pdf`} target="_blank" rel="noopener noreferrer"
                             className="text-brand-accent hover:text-white text-xs"><FiDownload /></a>
                        ) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="py-2">
                        <button onClick={() => handleDeleteReport(r.id)} title="Delete Report"
                          className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-red-500/10">
                          <FiTrash2 className="text-sm" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
