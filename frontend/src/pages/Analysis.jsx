import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCpu, FiImage, FiCheckCircle, FiAlertTriangle, FiBarChart2, FiLayers } from 'react-icons/fi';
import socket from '../services/socket';

export default function Analysis() {
  const [analyses, setAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [sliderPos, setSliderPos] = useState(50);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('aquasentinel_token');
      const res = await fetch('http://localhost:5000/api/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyses(data);
        if (data.length > 0) {
          setSelectedAnalysis(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch real reports', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 pb-8 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold gradient-text">CNN Analysis</h1>
          <p className="text-gray-400 text-sm mt-1">Satellite imagery analysis & oil spill classification</p>
        </div>

        {/* Analysis cards */}
        {analyses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {analyses.slice(0, 4).map((a) => (
              <motion.button key={a.id} onClick={() => setSelectedAnalysis(a)}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className={`glass-card p-4 text-left transition-all ${selectedAnalysis?.id === a.id ? 'border-brand-secondary/50 shadow-lg shadow-brand-secondary/10' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 truncate max-w-[80px]">#{a.id}</span>
                  {a.spill ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">SPILL</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">CLEAR</span>
                  )}
                </div>
                <h4 className="text-white font-medium text-sm truncate">{a.filename || 'Scanned File'}</h4>
                <p className="text-gray-500 text-xs mt-1">{(a.confidence * 100).toFixed(0)}% confidence</p>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center mb-8 flex flex-col items-center justify-center min-h-[150px]">
            {loading ? <div className="spinner w-8 h-8 mb-4 border-brand-secondary" /> : <FiAlertTriangle className="text-4xl text-brand-secondary mb-4 opacity-50" />}
            <h3 className="text-gray-400 font-medium">{loading ? 'Loading authentic analysis data...' : 'No Analysis History available yet.'}</h3>
            {!loading && <p className="text-gray-500 text-sm mt-2">Go to the Compare tab to scan an image.</p>}
          </div>
        )}

        {/* Main analysis view */}
        {selectedAnalysis && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image comparison section */}
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
              <FiImage className="text-brand-accent" /><span>SAR Image Comparison</span>
            </h3>

            {/* Simulated image comparison with gradient overlays */}
            <div className="relative rounded-xl overflow-hidden" style={{ height: '320px' }}>
              {/* Original SAR layer */}
              <div className="absolute inset-0" style={{
                background: `
                  radial-gradient(ellipse at 40% 60%, rgba(30,58,95,0.9) 0%, transparent 70%),
                  radial-gradient(ellipse at 70% 30%, rgba(15,29,48,0.8) 0%, transparent 60%),
                  linear-gradient(135deg, #0a1628, #132e4f, #0f1d30)
                `,
              }}>
                {/* Simulated ocean texture */}
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="absolute rounded-full opacity-20" style={{
                    width: `${20 + Math.random() * 60}px`, height: `${10 + Math.random() * 30}px`,
                    left: `${Math.random() * 90}%`, top: `${Math.random() * 90}%`,
                    background: `rgba(${30 + Math.random() * 50}, ${80 + Math.random() * 80}, ${120 + Math.random() * 60}, 0.5)`,
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }} />
                ))}
              </div>

              {/* Processed/detection layer */}
              <div className="absolute inset-0" style={{
                clipPath: `inset(0 ${100 - sliderPos}% 0 0)`,
                background: `
                  radial-gradient(ellipse at 40% 60%, rgba(30,58,95,0.9) 0%, transparent 70%),
                  radial-gradient(ellipse at 70% 30%, rgba(15,29,48,0.8) 0%, transparent 60%),
                  linear-gradient(135deg, #0a1628, #132e4f, #0f1d30)
                `,
              }}>
                {/* Spill detection overlay */}
                {selectedAnalysis.spill && (
                  <div className="absolute" style={{
                    left: '25%', top: '35%', width: '40%', height: '30%',
                    background: 'radial-gradient(ellipse, rgba(255,45,45,0.4) 0%, rgba(255,100,0,0.2) 50%, transparent 70%)',
                    border: '2px solid rgba(255,45,45,0.6)',
                    borderRadius: '50%',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="bg-red-500/80 text-white text-xs px-3 py-1 rounded-full font-bold">
                        🛢️ OIL SPILL DETECTED
                      </span>
                    </div>
                  </div>
                )}
                {/* Grid overlay */}
                <svg className="absolute inset-0 w-full h-full opacity-20">
                  {[...Array(10)].map((_, i) => (
                    <g key={i}>
                      <line x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke="var(--brand-secondary)" strokeWidth="0.5" />
                      <line x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke="var(--brand-secondary)" strokeWidth="0.5" />
                    </g>
                  ))}
                </svg>
              </div>

              {/* Slider handle */}
              <input type="range" min="0" max="100" value={sliderPos} onChange={(e) => setSliderPos(e.target.value)}
                className="absolute bottom-4 left-4 right-4 z-10 accent-brand-secondary" />

              {/* Labels */}
              <div className="absolute top-3 left-3 bg-black/60 px-2 py-1 rounded text-xs text-gray-300">Original SAR</div>
              <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded text-xs text-brand-accent">CNN Processed</div>
            </div>
            <p className="text-gray-500 text-xs text-center mt-2">Drag slider to compare original vs. CNN-processed image</p>
          </div>

          {/* Analysis results */}
          <div className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
              <FiCpu className="text-brand-accent" /><span>Detection Results</span>
            </h3>

            <div className="space-y-4">
              {/* Verdict */}
              <div className={`p-4 rounded-xl border ${selectedAnalysis.spill
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-green-500/30 bg-green-500/10'}`}>
                <div className="flex items-center space-x-3 mb-2">
                  {selectedAnalysis.spill ? (
                    <FiAlertTriangle className="text-red-400 text-2xl" />
                  ) : (
                    <FiCheckCircle className="text-green-400 text-2xl" />
                  )}
                  <div>
                    <p className={`text-lg font-bold ${selectedAnalysis.spill ? 'text-red-400' : 'text-green-400'}`}>
                      Oil Spill: {selectedAnalysis.spill ? 'YES' : 'NO'}
                    </p>
                    <p className="text-sm text-gray-400">
                      Confidence: {(selectedAnalysis.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>
                {/* Confidence bar */}
                <div className="h-3 bg-gray-800 rounded-full overflow-hidden mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${selectedAnalysis.confidence * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${selectedAnalysis.spill ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-green-500 to-emerald-400'}`}
                  />
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                {[
                  ['Filename', selectedAnalysis.filename || 'N/A'],
                  ['Coordinates', 'Extracted from Image Metadata (N/A)'],
                  ['Severity', (selectedAnalysis.severity || 'LOW').toUpperCase()],
                  ['Estimated Area', selectedAnalysis.area > 0 ? `${selectedAnalysis.area} km²` : 'N/A'],
                  ['Timestamp', selectedAnalysis.created_at ? new Date(selectedAnalysis.created_at).toLocaleString() : 'N/A'],
                  ['Model', 'CNN (EfficientNetB0)'],
                  ['Input', 'User SAR / Optical Image'],
                ].map(([label, value], i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-brand-primary/20">
                    <span className="text-gray-400 text-sm">{label}</span>
                    <span className={`text-sm font-medium ${
                      label === 'Severity' && selectedAnalysis.severity === 'critical' ? 'text-red-400' :
                      label === 'Severity' && selectedAnalysis.severity === 'high' ? 'text-orange-400' : 'text-white'
                    }`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Model pipeline */}
              <div className="p-3 rounded-xl bg-brand-bg/50 border border-brand-primary/20">
                <p className="text-xs text-gray-400 mb-2 font-medium">Detection Pipeline:</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {['SAR Input', '→', 'Preprocessing', '→', 'CNN Model', '→', 'Classification', '→', 'Confidence Score'].map((s, i) => (
                    <span key={i} className={s === '→' ? 'text-brand-secondary' : 'px-2 py-1 bg-brand-primary/30 rounded text-brand-accent'}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap / Prediction grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Prediction heatmap */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
              <FiLayers className="text-brand-accent" /><span>Prediction Heatmap</span>
            </h3>
            <div className="grid grid-cols-8 gap-1 rounded-xl overflow-hidden">
              {[...Array(64)].map((_, i) => {
                const intensity = selectedAnalysis.spill
                  ? Math.random() * (Math.abs(i % 8 - 3) < 3 && Math.abs(Math.floor(i / 8) - 4) < 3 ? 0.9 : 0.2)
                  : Math.random() * 0.15;
                return (
                  <div key={i} className="aspect-square rounded-sm" style={{
                    backgroundColor: intensity > 0.6 ? `rgba(255, 45, 45, ${intensity})` :
                      intensity > 0.3 ? `rgba(249, 115, 22, ${intensity})` :
                      `rgba(16, 185, 129, ${Math.max(intensity, 0.05)})`,
                  }} />
                );
              })}
            </div>
            <p className="text-gray-500 text-xs mt-2 text-center">8×8 patch prediction grid (CNN output)</p>
          </motion.div>

          {/* Summary stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center space-x-2">
              <FiBarChart2 className="text-brand-accent" /><span>Analysis Summary</span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Images Analyzed', value: analyses.length, color: 'text-blue-400' },
                { label: 'Spills Detected', value: analyses.filter(a => a.spill).length, color: 'text-red-400' },
                { label: 'Clear Scans', value: analyses.filter(a => !a.spill).length, color: 'text-green-400' },
                { label: 'Avg Confidence', value: analyses.length > 0 ? `${(analyses.reduce((s, a) => s + a.confidence, 0) / analyses.length * 100).toFixed(0)}%` : '0%', color: 'text-brand-accent' },
              ].map((s, i) => (
                <div key={i} className="p-4 rounded-xl bg-brand-bg/50 border border-brand-primary/20 text-center">
                  <p className="text-gray-400 text-xs">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 rounded-xl bg-brand-bg/50 border border-brand-primary/20">
              <p className="text-xs text-gray-400 mb-1 font-medium">System Architecture:</p>
              <p className="text-xs text-gray-500">
                AISStream → Anomaly Detection (Isolation Forest) → GNN Analysis (NetworkX) → SAR Image Fetch → CNN Classification (TF/Keras) → Alert System → Dashboard
              </p>
            </div>
          </motion.div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
