import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiNavigation, FiAlertTriangle, FiDroplet, FiBell, FiPlayCircle, FiShield, FiRadio, FiWifi, FiX } from 'react-icons/fi';
import { getStats, getAlerts, runDetection, fetchLiveData, detectAnomalies, runSatelliteAnalysis } from '../services/api';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, useMap } from 'react-leaflet';
import toast from 'react-hot-toast';
import socket from '../services/socket';
import { FiSearch, FiLayers, FiCpu, FiExternalLink, FiLoader, FiGrid } from 'react-icons/fi';

const statusColors = { normal: '#10b981', anomaly: '#f59e0b', spill: '#ff2d2d' };

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [liveVessels, setLiveVessels] = useState([]);
  const [detecting, setDetecting] = useState(false);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [spillAlert, setSpillAlert] = useState(null);     // RED ALERT MODAL
  const [anomalies, setAnomalies] = useState([]);         // INTERACTIVE MODAL DATA
  const [analyzingMmsi, setAnalyzingMmsi] = useState(null); 
  const vesselRef = useRef({});
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();

    // ── REAL-TIME ONLY: WebSocket listeners ──
    socket.on('vessel_update', (vessel) => {
      vesselRef.current[vessel.mmsi] = vessel;
      setLiveVessels(Object.values(vesselRef.current));
    });

    socket.on('vessel_batch', (allVessels) => {
      const map = {};
      allVessels.forEach(v => { map[v.mmsi] = v; });
      vesselRef.current = map;
      setLiveVessels(allVessels);
    });

    // ── AUTO-ROUTING LISTENER ──
    socket.on('pipeline_complete', (data) => {
      if (data.report_id) {
        toast.success('Pipeline finished! Redirecting to Compare dashboard...', { duration: 3000 });
        setTimeout(() => {
          navigate(`/compare?report_id=${data.report_id}`);
        }, 1500);
      }
    });

    // ── ALERT POPUP (RED MODAL) ──
    socket.on('alert', (data) => {
      setSpillAlert(data);
      toast.error(`🛢️ Spill at (${data.lat?.toFixed(3)}, ${data.lon?.toFixed(3)}) — ${(data.confidence * 100).toFixed(0)}%`, { duration: 10000 });
      setAlerts(prev => [{
        id: Date.now(),
        title: data.title,
        message: data.message,
        severity: data.severity || 'critical',
        created_at: new Date().toISOString(),
      }, ...prev]);
    });

    socket.on('new_alert', (alert) => {
      setAlerts(prev => [alert, ...prev]);
    });

    socket.on('disconnect', () => {
      toast.error('📴 Disconnected from live data stream. Attempting to reconnect...', { id: 'socket-status' });
    });

    socket.on('connect', () => {
      toast.success('📡 Live data stream restored', { id: 'socket-status' });
    });

    // Fetch initial live data
    fetchLiveData().then(res => {
      if (res.data.vessels?.length) {
        const map = {};
        res.data.vessels.forEach(v => { map[v.mmsi] = v; });
        vesselRef.current = map;
        setLiveVessels(res.data.vessels);
      }
    }).catch(() => {});

    return () => {
      socket.off('vessel_update');
      socket.off('vessel_batch');
      socket.off('alert');
      socket.off('new_alert');
      socket.off('pipeline_complete');
    };
  }, []);

  const loadStats = async () => {
    try {
      const [s, a] = await Promise.all([getStats(), getAlerts()]);
      setStats(s.data);
      setAlerts(a.data.slice(0, 10));
    } catch (err) { console.error('Stats load error'); }
  };

  const handleDetect = async () => {
    setDetecting(true);
    const tid = toast.loading('Screening live AIS for anomalies...', { id: 'detect' });
    try {
      const res = await detectAnomalies();
      if (res.data.count > 0) {
        setAnomalies(res.data.anomalies);
        toast.success(`Found ${res.data.count} anomalies! Please review candidates.`, { id: 'detect' });
      } else {
        toast.success('No anomalies detected in the current region.', { id: 'detect' });
      }
      loadStats();
    } catch (err) { 
      toast.error('Maritime anomaly screening failed', { id: 'detect' }); 
    } finally { 
      setDetecting(false); 
    }
  };

  const handleDeepVerify = async (vessel) => {
    setAnalyzingMmsi(vessel.mmsi);
    const tid = toast.loading(`Initiating Satellite Scan for ${vessel.mmsi}...`, { id: 'deep-verify' });
    try {
      const res = await runSatelliteAnalysis({
        mmsi: vessel.mmsi,
        lat: vessel.lat,
        lon: vessel.lon
      });

      if (res.data.report_id) {
        toast.success(res.data.spill ? '🚨 Oil Spill Confirmed!' : '✅ Environment Clear', { id: 'deep-verify' });
        setTimeout(() => navigate(`/reports/${res.data.report_id}`), 1000);
      }
    } catch (err) {
      toast.error('Satellite deep analysis failed. Check GEE key.', { id: 'deep-verify' });
    } finally {
      setAnalyzingMmsi(null);
    }
  };

  // Live data only (no DB fallback)
  const vessels = liveVessels;
  const liveCount = vessels.length;
  const anomalyCount = vessels.filter(v => v.status === 'anomaly').length;
  const spillCount = vessels.filter(v => v.spill).length;

  const kpis = [
    { label: 'Live Vessels', value: liveCount, icon: <FiRadio />, color: 'from-blue-500 to-cyan-500', pulse: liveCount > 0 },
    { label: 'Anomalies', value: anomalyCount, icon: <FiAlertTriangle />, color: 'from-yellow-500 to-orange-500' },
    { label: 'Oil Spills', value: spillCount, icon: <FiDroplet />, color: 'from-red-500 to-pink-500' },
    { label: 'Active Alerts', value: stats?.active_alerts || alerts.length, icon: <FiBell />, color: 'from-purple-500 to-indigo-500' },
  ];

  return (
    <div className="min-h-screen pt-20 px-4 pb-8 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1 flex items-center space-x-2">
              <FiWifi className={liveCount > 0 ? 'text-green-400 animate-pulse' : 'text-gray-600'} />
              <span>{liveCount > 0 ? `${liveCount} vessels streaming live via AISStream` : 'Connecting to AISStream...'}</span>
            </p>
          </div>
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <button onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${showHeatmap ? 'bg-orange-500/20 border-orange-500/30 text-orange-400' : 'border-brand-primary/30 text-gray-400 hover:bg-brand-primary/30'}`}>
              🔥 Heatmap
            </button>
            <Link to="/reports" className="px-4 py-2 rounded-lg text-sm font-medium border border-brand-secondary/30 text-brand-secondary hover:bg-brand-secondary/10 transition-all flex items-center space-x-2">
               <FiGrid />
               <span>Repository AI</span>
            </Link>
            <button id="run-detection-btn" onClick={handleDetect} disabled={detecting}
              className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-brand-secondary to-brand-secondary text-white rounded-xl font-medium hover:shadow-lg hover:shadow-brand-secondary/30 transition-all disabled:opacity-50">
              {detecting ? <div className="spinner w-5 h-5" /> : <FiPlayCircle />}
              <span>{detecting ? 'Detecting...' : 'Run Detection'}</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass-card p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm font-medium">{kpi.label}</span>
                <div className={`w-10 h-10 bg-gradient-to-br ${kpi.color} rounded-lg flex items-center justify-center text-white text-lg ${kpi.pulse ? 'animate-pulse' : ''}`}>
                  {kpi.icon}
                </div>
              </div>
              <p className="text-3xl font-bold text-white">{kpi.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Map + Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2 glass-card p-4" style={{ minHeight: '450px' }}>
            <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
              <FiShield className="text-brand-accent" />
              <span>Live Vessel Map (Real-Time AISStream)</span>
              {liveCount > 0 && <span className="ml-2 w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>}
            </h3>
            <div className="rounded-xl overflow-hidden" style={{ height: '400px' }}>
              <MapContainer center={[15.5, 73.0]} zoom={5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CartoDB' />
                {vessels.map((v) => (
                  <CircleMarker key={v.mmsi} center={[v.lat, v.lon]}
                    radius={v.spill ? 14 : v.status === 'anomaly' ? 10 : 7}
                    pathOptions={{ color: v.spill ? '#ff2d2d' : statusColors[v.status] || '#10b981', fillColor: v.spill ? '#ff2d2d' : statusColors[v.status] || '#10b981', fillOpacity: 0.7, weight: 2 }}
                    eventHandlers={{ click: () => setSelectedVessel(v) }}>
                    <Popup>
                      <div className="text-sm"><strong>{v.name || v.mmsi}</strong><br />Speed: {v.sog?.toFixed(1)} kn<br />Status: {v.status}{v.spill && <><br /><span style={{color:'red'}}>🛢️ SPILL ({(v.confidence*100).toFixed(0)}%)</span></>}</div>
                    </Popup>
                  </CircleMarker>
                ))}
                {/* Anomaly cluster */}
                {(() => {
                  const anoms = vessels.filter(v => v.status === 'anomaly' || v.spill);
                  if (anoms.length < 2) return null;
                  const cLat = anoms.reduce((s, v) => s + v.lat, 0) / anoms.length;
                  const cLon = anoms.reduce((s, v) => s + v.lon, 0) / anoms.length;
                  return <Circle center={[cLat, cLon]} radius={15000} pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.06, weight: 1, dashArray: '8,4' }} />;
                })()}
              </MapContainer>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-green-500"></span><span>Normal</span></span>
              <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-yellow-500"></span><span>Anomaly</span></span>
              <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded-full bg-red-500"></span><span>Oil Spill</span></span>
            </div>
          </div>

          {/* Alerts Panel */}
          <div className="glass-card p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
              <FiBell className="text-brand-accent" /><span>Recent Alerts</span>
            </h3>
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {alerts.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No alerts yet</p>
              ) : alerts.map((alert, i) => (
                <div key={alert.id || i} className={`p-3 rounded-xl border ${
                  alert.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' :
                  alert.severity === 'high' ? 'border-orange-500/30 bg-orange-500/5' :
                  'border-brand-secondary/20 bg-brand-secondary/5'}`}>
                  <p className="text-sm text-white font-medium">{alert.title}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{alert.created_at ? new Date(alert.created_at).toLocaleString() : 'Just now'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── ANOMALY VERIFICATION MODAL (Phase 12: Interactive) ─── */}
        <AnimatePresence>
          {anomalies.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-brand-bg/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                className="glass-card max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border-brand-secondary/30">
                <div className="p-6 border-b border-brand-primary/30 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                       <FiAlertTriangle className="text-yellow-500" />
                       <span>Potential Spills Detected ({anomalies.length})</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">Found via Isolation Forest on live AIS data</p>
                  </div>
                  <button onClick={() => setAnomalies([])} className="text-gray-500 hover:text-white transition-colors">
                    <FiX size={24} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {anomalies.map((v, i) => (
                    <div key={v.mmsi} className="bg-brand-primary/40 border border-brand-primary/20 rounded-2xl p-5 hover:border-brand-secondary/20 transition-all flex items-center justify-between group">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:animate-pulse">
                          <FiNavigation />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{v.name || 'Unknown Vessel'}</h4>
                          <p className="text-xs text-gray-500 font-mono">MMSI: {v.mmsi} • {v.lat?.toFixed(3)}°N, {v.lon?.toFixed(3)}°E</p>
                          <div className="flex items-center space-x-2 mt-1">
                             <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 font-bold uppercase tracking-wider">
                               Anomaly: {v.anomaly_reason || 'Deviation'}
                             </span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDeepVerify(v)}
                        disabled={analyzingMmsi !== null}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                          analyzingMmsi === v.mmsi 
                            ? 'bg-brand-secondary/20 text-brand-secondary cursor-not-allowed'
                            : 'bg-brand-secondary hover:bg-brand-secondary text-white shadow-lg shadow-brand-secondary/20'
                        }`}
                      >
                        {analyzingMmsi === v.mmsi ? (
                          <>
                            <FiLoader className="animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <FiLayers />
                            <span>Verify with Satellite</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-brand-bg/60 border-t border-brand-primary/20 text-center">
                   <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                     Satellite Deep Scan involves YOLOv8 Region Search & EfficientNet Classification
                   </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── RED ALERT MODAL (Oil Spill Popup) ─── */}
        <AnimatePresence>
          {spillAlert && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-red-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSpillAlert(null)}>
              <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 30 }}
                className="bg-gradient-to-br from-red-950 to-red-900 border-2 border-red-500 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-red-500/30"
                onClick={e => e.stopPropagation()}>
                <div className="text-center mb-4">
                  <div className="w-16 h-16 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-3 animate-pulse">
                    <span className="text-4xl">🛢️</span>
                  </div>
                  <h3 className="text-2xl font-bold text-red-400">OIL SPILL DETECTED!</h3>
                </div>
                <div className="space-y-2 bg-black/30 rounded-xl p-4">
                  {[
                    ['Location', `${spillAlert.lat?.toFixed(4)}°N, ${spillAlert.lon?.toFixed(4)}°E`],
                    ['Vessel', spillAlert.mmsi || 'Unknown'],
                    ['Confidence', `${(spillAlert.confidence * 100).toFixed(0)}%`],
                    ['Severity', spillAlert.severity?.toUpperCase() || 'CRITICAL'],
                    ['Email Sent', spillAlert.email_sent ? '✅ Yes' : '⚠️ Not configured'],
                    ['SMS Sent', spillAlert.sms_sent ? '✅ Yes' : '⚠️ Not configured'],
                  ].map(([label, value], i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-red-800/30">
                      <span className="text-red-300 text-sm">{label}</span>
                      <span className="text-white text-sm font-medium">{value}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setSpillAlert(null)}
                  className="w-full mt-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors">
                  Acknowledge
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vessel Detail Modal */}
        <AnimatePresence>
          {selectedVessel && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedVessel(null)}>
              <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                className="glass-card p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl font-bold text-white">{selectedVessel.name || 'Unknown Vessel'}</h3>
                  <button onClick={() => setSelectedVessel(null)} className="text-gray-400 hover:text-white"><FiX size={20} /></button>
                </div>
                <div className="space-y-3">
                  {[
                    ['MMSI', selectedVessel.mmsi],
                    ['Latitude', selectedVessel.lat?.toFixed(5)],
                    ['Longitude', selectedVessel.lon?.toFixed(5)],
                    ['Speed (SOG)', `${selectedVessel.sog?.toFixed(1) || 0} knots`],
                    ['Course (COG)', `${selectedVessel.cog?.toFixed(1) || 0}°`],
                    ['Heading', `${selectedVessel.heading || 0}°`],
                    ['Type', selectedVessel.type || 'Unknown'],
                    ['Status', selectedVessel.status?.toUpperCase()],
                    ['Spill', selectedVessel.spill ? `YES (${(selectedVessel.confidence * 100).toFixed(0)}%)` : 'No'],
                    ['Source', selectedVessel.source || 'aisstream'],
                  ].map(([label, value], i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-brand-primary/20">
                      <span className="text-gray-400 text-sm">{label}</span>
                      <span className={`text-sm font-medium ${
                        label === 'Status' && selectedVessel.status === 'anomaly' ? 'text-yellow-400' :
                        label === 'Spill' && selectedVessel.spill ? 'text-red-400' : 'text-white'
                      }`}>{value}</span>
                    </div>
                  ))}
                </div>
                {selectedVessel.anomaly_reason && (
                  <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-yellow-400 text-sm font-medium">⚠️ {selectedVessel.anomaly_reason}</p>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
