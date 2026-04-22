import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiNavigation, FiX, FiWifi } from 'react-icons/fi';
import { MapContainer, TileLayer, CircleMarker, Popup, Circle } from 'react-leaflet';
import { fetchLiveData } from '../services/api';
import socket from '../services/socket';

const statusColors = { normal: '#10b981', anomaly: '#f59e0b', spill: '#ff2d2d' };

export default function MapView() {
  const [vessels, setVessels] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [spillAlert, setSpillAlert] = useState(null);
  const vesselMap = useRef({});

  useEffect(() => {
    // Initial fetch
    fetchLiveData().then(res => {
      if (res.data.vessels?.length) {
        res.data.vessels.forEach(v => { vesselMap.current[v.mmsi] = v; });
        setVessels(res.data.vessels);
      }
    }).catch(() => {});

    // Real-time only
    socket.on('vessel_update', (vessel) => {
      vesselMap.current[vessel.mmsi] = vessel;
      setVessels(Object.values(vesselMap.current));
    });
    socket.on('vessel_batch', (batch) => {
      batch.forEach(v => { vesselMap.current[v.mmsi] = v; });
      setVessels(Object.values(vesselMap.current));
    });
    socket.on('alert', (data) => {
      setSpillAlert(data);
    });

    return () => { socket.off('vessel_update'); socket.off('vessel_batch'); socket.off('alert'); };
  }, []);

  const filteredVessels = filter === 'all' ? vessels :
    filter === 'spill' ? vessels.filter(v => v.spill || v.status === 'spill') :
    vessels.filter(v => v.status === filter);

  const anomalies = vessels.filter(v => v.status === 'anomaly' || v.spill);
  const clusterCenter = anomalies.length >= 2 ? {
    lat: anomalies.reduce((s, v) => s + (v.lat || 0), 0) / anomalies.length,
    lon: anomalies.reduce((s, v) => s + (v.lon || 0), 0) / anomalies.length
  } : null;

  return (
    <div className="min-h-screen pt-20 px-4 pb-8 bg-brand-bg">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold gradient-text">Live Map</h1>
            <p className="text-gray-400 text-sm mt-1 flex items-center space-x-2">
              <FiWifi className={vessels.length > 0 ? 'text-green-400 animate-pulse' : 'text-gray-600'} />
              <span>{vessels.length} vessels (AISStream real-time)</span>
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0 flex-wrap gap-y-2">
            {['all', 'normal', 'anomaly', 'spill'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'bg-brand-secondary text-white' : 'text-gray-400 hover:bg-brand-primary/50 border border-brand-primary/30'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-4">
          <div className="rounded-xl overflow-hidden" style={{ height: '70vh' }}>
            <MapContainer center={[15.5, 73.0]} zoom={5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CartoDB' />
              {filteredVessels.map(v => (
                <CircleMarker key={v.mmsi} center={[v.lat, v.lon]}
                  radius={v.spill ? 14 : v.status === 'anomaly' ? 10 : 7}
                  pathOptions={{ color: v.spill ? '#ff2d2d' : statusColors[v.status] || '#10b981', fillColor: v.spill ? '#ff2d2d' : statusColors[v.status] || '#10b981', fillOpacity: 0.7, weight: 2 }}
                  eventHandlers={{ click: () => setSelectedVessel(v) }}>
                  <Popup>
                    <div className="text-sm min-w-[180px]">
                      <strong>{v.name || v.mmsi}</strong><hr className="my-1" />
                      <p>MMSI: {v.mmsi}</p>
                      <p>Speed: {v.sog?.toFixed(1) || 0} kn</p>
                      <p>Type: {v.type}</p>
                      <p style={{ color: statusColors[v.status] }}>Status: {v.status?.toUpperCase()}</p>
                      {v.spill && <p style={{color:'red'}}>🛢️ SPILL ({(v.confidence*100).toFixed(0)}%)</p>}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
              {clusterCenter && <Circle center={[clusterCenter.lat, clusterCenter.lon]} radius={15000}
                pathOptions={{ color: '#f97316', fillColor: '#f97316', fillOpacity: 0.06, weight: 1, dashArray: '10,5' }} />}
            </MapContainer>
          </div>
          <div className="flex flex-wrap items-center gap-6 mt-4 text-sm text-gray-400">
            <span className="flex items-center space-x-2"><span className="w-4 h-4 rounded-full bg-green-500"></span><span>Normal</span></span>
            <span className="flex items-center space-x-2"><span className="w-4 h-4 rounded-full bg-yellow-500"></span><span>Anomaly</span></span>
            <span className="flex items-center space-x-2"><span className="w-4 h-4 rounded-full bg-red-500"></span><span>Spill</span></span>
            <span className="flex items-center space-x-2"><span className="w-4 h-4 border-2 border-dashed border-orange-500 rounded-full"></span><span>Cluster</span></span>
          </div>
        </motion.div>

        {/* Vessel table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-4 mt-6 overflow-x-auto">
          <h3 className="text-white font-semibold mb-3 flex items-center space-x-2"><FiNavigation className="text-brand-accent" /><span>Vessels ({filteredVessels.length})</span></h3>
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-brand-primary/30">
              <th className="text-left pb-2 pr-4">Name</th><th className="text-left pb-2 pr-4">MMSI</th><th className="text-left pb-2 pr-4">Type</th><th className="text-left pb-2 pr-4">Speed</th><th className="text-left pb-2 pr-4">Status</th><th className="text-left pb-2 pr-4">Spill</th>
            </tr></thead>
            <tbody>{filteredVessels.map(v => (
              <tr key={v.mmsi} className="border-b border-brand-primary/10 hover:bg-brand-primary/20 cursor-pointer" onClick={() => setSelectedVessel(v)}>
                <td className="py-2 pr-4 text-white">{v.name || '—'}</td>
                <td className="py-2 pr-4 text-gray-400">{v.mmsi}</td>
                <td className="py-2 pr-4 text-gray-400">{v.type}</td>
                <td className="py-2 pr-4 text-gray-400">{v.sog?.toFixed(1) || 0} kn</td>
                <td className="py-2 pr-4"><span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${statusColors[v.status]}20`, color: statusColors[v.status] }}>{v.status}</span></td>
                <td className="py-2 pr-4">{v.spill ? <span className="text-red-400 text-xs font-bold">🛢️ {(v.confidence*100).toFixed(0)}%</span> : <span className="text-gray-600">—</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </motion.div>
      </div>

      {/* RED ALERT MODAL */}
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
                <div className="flex justify-between py-1 border-b border-red-800/30"><span className="text-red-300 text-sm">Location</span><span className="text-white text-sm">{spillAlert.lat?.toFixed(4)}°N, {spillAlert.lon?.toFixed(4)}°E</span></div>
                <div className="flex justify-between py-1 border-b border-red-800/30"><span className="text-red-300 text-sm">MMSI</span><span className="text-white text-sm">{spillAlert.mmsi}</span></div>
                <div className="flex justify-between py-1 border-b border-red-800/30"><span className="text-red-300 text-sm">Confidence</span><span className="text-white text-sm font-bold">{(spillAlert.confidence * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between py-1"><span className="text-red-300 text-sm">Severity</span><span className="text-red-400 text-sm font-bold">CRITICAL</span></div>
              </div>
              <button onClick={() => setSpillAlert(null)} className="w-full mt-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors">
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
                <h3 className="font-display text-xl font-bold text-white">{selectedVessel.name || 'Unknown'}</h3>
                <button onClick={() => setSelectedVessel(null)} className="text-gray-400 hover:text-white"><FiX size={20} /></button>
              </div>
              <div className="space-y-2.5">
                {[
                  ['MMSI', selectedVessel.mmsi],
                  ['Latitude', selectedVessel.lat?.toFixed(5)],
                  ['Longitude', selectedVessel.lon?.toFixed(5)],
                  ['Speed', `${selectedVessel.sog?.toFixed(1) || 0} knots`],
                  ['Course', `${selectedVessel.cog?.toFixed(1) || 0}°`],
                  ['Heading', `${selectedVessel.heading || 0}°`],
                  ['Type', selectedVessel.type || 'Unknown'],
                  ['Status', selectedVessel.status?.toUpperCase()],
                  ['Spill', selectedVessel.spill ? `YES (${(selectedVessel.confidence * 100).toFixed(0)}%)` : 'No'],
                ].map(([l, v], i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-brand-primary/20">
                    <span className="text-gray-400 text-sm">{l}</span>
                    <span className={`text-sm font-medium ${l === 'Status' && selectedVessel.status === 'anomaly' ? 'text-yellow-400' : l === 'Spill' && selectedVessel.spill ? 'text-red-400' : 'text-white'}`}>{v}</span>
                  </div>
                ))}
              </div>
              {selectedVessel.anomaly_reason && (
                <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <p className="text-yellow-400 text-sm">⚠️ {selectedVessel.anomaly_reason}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
