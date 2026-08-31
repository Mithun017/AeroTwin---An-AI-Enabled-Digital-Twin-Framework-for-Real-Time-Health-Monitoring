import { useState, useEffect, useRef, Component } from 'react';
import Editor from '@monaco-editor/react';

class SafeMonacoEditor extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('Monaco Editor load error, falling back to textarea:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <textarea
          value={this.props.value}
          onChange={(e) => this.props.onChange(e.target.value)}
          placeholder="Enter DAX or SQL query..."
          style={{
            width: '100%',
            height: '100%',
            background: 'var(--bg-primary, #090d16)',
            color: 'var(--text-primary, #fff)',
            border: 'none',
            padding: '12px',
            fontFamily: 'var(--font-mono, monospace)',
            fontSize: '13px',
            resize: 'none',
            outline: 'none'
          }}
        />
      );
    }

    return (
      <Editor
        height="100%"
        defaultLanguage="sql"
        theme={document.body.classList.contains('light-theme') ? "vs" : "vs-dark"}
        value={this.props.value}
        onChange={(val) => this.props.onChange(val || '')}
        loading={
          <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            Loading Editor...
          </div>
        }
        options={{ minimap: { enabled: false }, fontSize: 13 }}
      />
    );
  }
}

const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000';

const QUICK_QUERIES = [
  { label: 'Live Leak Rate', query: 'DIVIDE(COUNTX(FILTER(SensorReadings,[LeakZone]>0),1),COUNTX(SensorReadings,1),0)*100' },
  { label: 'Avg MAF (Live)', query: 'AVERAGEX(SensorReadings,[MAF])' },
  { label: 'Max Boost (Live)', query: 'MAXX(SensorReadings,[Boost])' },
  { label: 'Zone 2 Leak Count', query: 'COUNTROWS(FILTER(SensorReadings,[LeakZone]=2))' },
  { label: 'Avg Health Score', query: 'AVERAGEX(SensorReadings,[HealthScore])' },
];

// ─── Custom Zero-Dependency SVG Line Chart ──────────────────────────
function ResultLineChart({ data, columns }) {
  const numericCol = columns.find(col => data.some(row => typeof row[col] === 'number' && col !== 'LeakZone' && col !== 'LeakZone_idx'));
  if (!numericCol) return <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '10px 0' }}>No numeric columns available for charting.</div>;

  const values = data.map(row => Number(row[numericCol] || 0));
  const maxVal = Math.max(...values, 1.0);
  const minVal = Math.min(...values, 0.0);
  const range = maxVal - minVal || 1.0;

  const width = 600;
  const height = 180;
  const padding = 20;

  const points = values.map((val, idx) => {
    const x = padding + (idx / (values.length - 1 || 1)) * (width - 2 * padding);
    const y = height - padding - ((val - minVal) / range) * (height - 2 * padding);
    return { x, y };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = points.length > 0 ? [
    `${points[0].x},${height - padding}`,
    ...points.map(p => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${height - padding}`
  ].join(' ') : '';

  return (
    <div style={{ marginTop: '15px', padding: '15px', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--accent-yellow)' }}>
          📈 TELEMETRY TREND: {numericCol.toUpperCase()}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Min: {minVal.toFixed(1)} · Max: {maxVal.toFixed(1)}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '180px', display: 'block' }}>
        <defs>
          <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-yellow)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent-yellow)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {/* Horizontal grid lines */}
        <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" />
        <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.05)" />
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.15)" />

        {/* Shaded Area */}
        {points.length > 1 && (
          <polygon points={areaPoints} fill="url(#chartGrad)" />
        )}
        {/* Line Path */}
        {points.length > 1 && (
          <polyline points={polylinePoints} fill="none" stroke="var(--accent-yellow)" strokeWidth="2.5" strokeLinecap="round" />
        )}
        {/* Render Circles for small lists */}
        {points.length <= 30 && points.map((p, idx) => (
          <circle key={idx} cx={p.x} cy={p.y} r="3" fill="#ffffff" stroke="var(--accent-yellow)" strokeWidth="1.5" />
        ))}
      </svg>
    </div>
  );
}

// ─── Custom SVG Circular Gauge ──────────────────────────────────────
function CircularGauge({ value, min, max, unit, title, color }) {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const pct = Math.min(100, Math.max(0, ((safeValue - min) / (max - min)) * 100));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="sensor-item" style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-glass)' }}>
      <div className="sensor-label" style={{ fontSize: '0.65rem', marginBottom: '6px' }}>{title}</div>
      <div style={{ position: 'relative', width: '84px', height: '84px', margin: '0 auto' }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={color || 'var(--accent-yellow)'}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          fontSize: '0.95rem', fontWeight: '800', fontFamily: 'var(--font-mono)'
        }}>
          {Math.round(safeValue)}
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', display: 'block', fontWeight: 'normal' }}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

export default function DAXConsole() {
  const [query, setQuery] = useState('AVERAGEX(SensorReadings, [MAF])');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'chart'

  // DAQ states
  const [daqStatus, setDaqStatus] = useState('Disconnected');
  const [connectionType, setConnectionType] = useState('Simulated DAQ Data');
  const [deviceName, setDeviceName] = useState('Simulated Aero Engine Telemetry');
  const [samplingRate, setSamplingRate] = useState(1);
  const [packetsReceived, setPacketsReceived] = useState(0);
  const [sensorCount, setSensorCount] = useState(11);
  const [lastUpdate, setLastUpdate] = useState('-');
  const [simulationState, setSimulationState] = useState('Healthy');
  const [recording, setRecording] = useState(false);
  const [, setRecordedCount] = useState(0);
  const [telemetryBuffer, setTelemetryBuffer] = useState([]); // Local buffer for recording

  const [latestPacket, setLatestPacket] = useState({
    RPM: 0, MAF: 0, Boost: 0, CoolantTemp: 0, OilTemp: 0, OilPressure: 0, ThrottlePosition: 0, AFR: 0, LeakZone: 0, HealthScore: 100
  });

  const [aiPrediction, setAiPrediction] = useState({
    leak_risk: 0.0, turbo_failure: 0.0, injector_failure: 0.0, sensor_drift: 0.0, engine_health: 100.0
  });

  const [liveSensorList, setLiveSensorList] = useState([]);
  const [liveQueryMode, setLiveQueryMode] = useState(false);

  const wsRef = useRef(null);
  const liveQueryIntervalRef = useRef(null);

  // Load current DAQ status on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/dax/daq/status`)
      .then(res => res.json())
      .then(data => {
        setDaqStatus(data.status || 'Disconnected');
        setConnectionType(data.connection_type || 'Simulated DAQ Data');
        setDeviceName(data.device_name || 'Simulated Aero Engine Telemetry');
        setSamplingRate(data.sampling_rate || 1);
        setPacketsReceived(data.packets_received || 0);
        setSensorCount(data.sensor_count || 11);
        setLastUpdate(data.last_update || '-');
        setSimulationState(data.simulation_state || 'Healthy');
        setRecording(Boolean(data.recording));
        setRecordedCount(data.recorded_count || 0);
        if (data.ai_prediction) setAiPrediction(data.ai_prediction);
      })
      .catch(err => console.error('Error fetching DAQ status:', err));

    // Connect to WebSocket
    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (liveQueryIntervalRef.current) clearInterval(liveQueryIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up live query execution interval
  useEffect(() => {
    if (liveQueryMode && daqStatus === 'Connected') {
      liveQueryIntervalRef.current = setInterval(() => {
        runQuery();
      }, 1000);
    } else {
      if (liveQueryIntervalRef.current) {
        clearInterval(liveQueryIntervalRef.current);
        liveQueryIntervalRef.current = null;
      }
    }
    return () => {
      if (liveQueryIntervalRef.current) clearInterval(liveQueryIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveQueryMode, query, daqStatus]);

  function connectWebSocket() {
    if (wsRef.current) wsRef.current.close();

    const ws = new WebSocket(`${WS_BASE}/ws/daq`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'daq_packet') {
        if (msg.status) setDaqStatus(msg.status);
        if (msg.packets_received !== undefined) setPacketsReceived(msg.packets_received);
        if (msg.last_update) setLastUpdate(msg.last_update);
        if (msg.recording !== undefined) setRecording(Boolean(msg.recording));
        if (msg.recorded_count !== undefined) setRecordedCount(msg.recorded_count);
        if (msg.packet) setLatestPacket(msg.packet);
        if (msg.ai_prediction) setAiPrediction(msg.ai_prediction);

        // If recording is active, add to local buffer
        if (msg.recording) {
          setTelemetryBuffer(prev => [...prev, {
            ...msg.packet,
            timestamp: msg.last_update || new Date().toISOString()
          }]);
        }

        // Append to live sensor grid table (max 12 rows)
        setLiveSensorList(prev => {
          const updated = [msg.packet, ...prev];
          return updated.slice(0, 12);
        });
      }
    };
    ws.onclose = () => {
      // Reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };
    wsRef.current = ws;
  };

  const handleConnect = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dax/daq/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_type: connectionType,
          device_name: deviceName,
          sampling_rate: Number(samplingRate),
          simulation_state: simulationState
        })
      });
      const data = await res.json();
      if (data.success) {
        setDaqStatus(data.status);
      }
    } catch (err) {
      console.error('Connection error:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/dax/daq/disconnect`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDaqStatus(data.status);
        setLatestPacket({
          RPM: 0, MAF: 0, Boost: 0, CoolantTemp: 0, OilTemp: 0, OilPressure: 0, ThrottlePosition: 0, AFR: 0, LeakZone: 0, HealthScore: 100
        });
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      // STOP recording
      setRecording(false);
      setRecordedCount(telemetryBuffer.length);

      // Show success message
      if (telemetryBuffer.length > 0) {
        console.log(`✅ Recording stopped. ${telemetryBuffer.length} packets captured. Click download buttons below.`);
      }

      // Also call backend if available
      try {
        await fetch(`${API_BASE}/api/dax/daq/record/stop`, { method: 'POST' });
      } catch (err) {
        console.log('Backend recording stop (optional):', err.message);
      }
    } else {
      // START recording - clear buffer
      setRecording(true);
      setTelemetryBuffer([]);
      setRecordedCount(0);

      console.log('🔴 Recording started...');

      // Also call backend if available
      try {
        await fetch(`${API_BASE}/api/dax/daq/record/start`, { method: 'POST' });
      } catch (err) {
        console.log('Backend recording start (optional):', err.message);
      }
    }
  };

  const exportRecording = (format) => {
    if (telemetryBuffer.length === 0) {
      alert('No data recorded yet!');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `AeroTwin_Telemetry_${timestamp}.${format}`;

    if (format === 'csv') {
      // Generate CSV
      const headers = ['Timestamp', 'RPM', 'MAF', 'Boost', 'CoolantTemp', 'OilTemp', 'OilPressure', 'ThrottlePosition', 'AFR', 'LeakZone', 'HealthScore'];
      const rows = telemetryBuffer.map(row => [
        row.timestamp || '',
        row.RPM || 0,
        row.MAF || 0,
        row.Boost || 0,
        row.CoolantTemp || 0,
        row.OilTemp || 0,
        row.OilPressure || 0,
        row.ThrottlePosition || 0,
        row.AFR || 0,
        row.LeakZone || 'Healthy',
        row.HealthScore || 100
      ]);
      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } else if (format === 'json') {
      // Generate JSON
      const json = JSON.stringify({
        metadata: {
          export_time: new Date().toISOString(),
          total_packets: telemetryBuffer.length,
          engine: 'Aero Engine',
          system: 'AeroTwin DAQ'
        },
        telemetry: telemetryBuffer
      }, null, 2);

      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  async function runQuery(q) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/dax/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: q || query }),
      });
      const data = await res.json();
      if (data.result?.success) {
        setResult(data.result);
      } else {
        setError(data.result?.error || 'Query failed');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const getStatusColor = () => {
    if (daqStatus === 'Connected') return 'var(--accent-emerald)';
    if (daqStatus === 'Connecting') return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  return (
    <div className="card" style={{ gridColumn: '1 / -1', minHeight: '800px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* ─── TITLE & CONNECTION BADGE ─────────────────────────────────── */}
      <div className="card-header" style={{ marginBottom: '5px' }}>
        <span className="card-title" style={{ fontSize: '1.1rem', fontWeight: '800', background: 'linear-gradient(135deg, var(--accent-yellow) 0%, #ff9800 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          ⚙️ REAL-TIME DAQ ANALYTICS SUITE
        </span>
        <span className="header-badge" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', padding: '5px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="status-dot" style={{ background: getStatusColor(), boxShadow: `0 0 10px ${getStatusColor()}`, width: '8px', height: '8px' }}></span>
          <span style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>{daqStatus}</span>
        </span>
      </div>

      {/* ─── GRID: CONTROLS & DIAGNOSTIC GAUGES ─────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>

        {/* PANEL A: CONNECTION MANAGER */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-accent)', textTransform: 'uppercase', marginBottom: '12px' }}>
            🔌 DAQ Connection Manager
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label className="sensor-label" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>Interface Bus</label>
              <select className="demo-select" style={{ width: '100%', padding: '6px' }} value={connectionType} onChange={e => setConnectionType(e.target.value)} disabled={daqStatus === 'Connected'}>
                <option value="Simulated DAQ Data">Simulated DAQ Data</option>
                <option value="CAN Bus">CAN Bus (SAE J1939)</option>
                <option value="OBD-II">OBD-II Standard</option>
                <option value="USB DAQ">USB DAQ Device</option>
                <option value="Ethernet DAQ">Ethernet TCP/IP Stream</option>
                <option value="MQTT Streams">MQTT Stream Broker</option>
              </select>
            </div>

            <div>
              <label className="sensor-label" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>Device / Address</label>
              <input type="text" className="chatbot-input" style={{ width: '100%', margin: '0', borderRadius: '4px', padding: '6px 12px' }} value={deviceName} onChange={e => setDeviceName(e.target.value)} disabled={daqStatus === 'Connected'} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label className="sensor-label" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>Sampling Rate</label>
                <select className="demo-select" style={{ width: '100%', padding: '6px' }} value={samplingRate} onChange={e => setSamplingRate(Number(e.target.value))} disabled={daqStatus === 'Connected'}>
                  <option value={1}>1 Hz</option>
                  <option value={5}>5 Hz</option>
                  <option value={10}>10 Hz</option>
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="sensor-label" style={{ fontSize: '0.65rem', marginBottom: '4px', display: 'block' }}>Simulator Mode</label>
                <select className="demo-select" style={{ width: '100%', padding: '6px' }} value={simulationState} onChange={e => setSimulationState(e.target.value)}>
                  <option value="Healthy">Healthy State</option>
                  <option value="Minor Leak">Minor Air Leak</option>
                  <option value="Boost Leak">Boost Leak (Critical)</option>
                  <option value="Sensor Failure">Sensor Drift/Failure</option>
                  <option value="Injector Fault">Injector Fault</option>
                </select>
              </div>
            </div>

            <div style={{ marginTop: '5px' }}>
              {daqStatus === 'Connected' ? (
                <button className="demo-btn danger" style={{ width: '100%', justifyContent: 'center', padding: '8px' }} onClick={handleDisconnect}>
                  🛑 DISCONNECT STREAM
                </button>
              ) : (
                <button className="demo-btn active" style={{ width: '100%', justifyContent: 'center', padding: '8px' }} onClick={handleConnect} disabled={daqStatus === 'Connecting'}>
                  {daqStatus === 'Connecting' ? 'Establishing link...' : '⚡ INITIALIZE DAQ LINK'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* PANEL B: REAL-TIME GAUGES */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-accent)', textTransform: 'uppercase', marginBottom: '12px' }}>
            Real-Time Engine Visualizer
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            <CircularGauge value={latestPacket.RPM} min={0} max={3000} unit="rpm" title="Engine RPM" color="var(--accent-yellow)" />
            <CircularGauge value={latestPacket.Boost} min={100} max={350} unit="kPa" title="Boost Pressure" color="var(--accent-yellow)" />
            <CircularGauge value={latestPacket.CoolantTemp} min={0} max={120} unit="°C" title="Coolant Temp" color="var(--status-go)" />
            <CircularGauge value={latestPacket.OilPressure} min={0} max={600} unit="kPa" title="Oil Pressure" color="var(--status-go)" />
          </div>
          <div style={{ display: 'flex', gap: '15px', marginTop: '12px', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            <div>Packets: <strong>{packetsReceived}</strong></div>
            <div>Sensors: <strong>{sensorCount} ch</strong></div>
            <div>Sync Clock: <strong>{lastUpdate}</strong></div>
            <div>Mode: <strong style={{ color: 'var(--accent-yellow)' }}>{(simulationState || 'Healthy').toUpperCase()}</strong></div>
          </div>
        </div>
      </div>

      {/* ─── GRID: RECORDING CONTROL & AI PREDICTION ────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr', gap: '20px' }}>

        {/* PANEL C: AI PREDICTIVE HEALTH SYSTEM */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-accent)', textTransform: 'uppercase', marginBottom: '12px' }}>
            🔴 Real-Time AI Diagnostics Layer
          </div>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>

            {/* Global health dial */}
            <div style={{ textAlign: 'center', width: '100px', flexShrink: 0 }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Engine Health</div>
              <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="8" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={aiPrediction.engine_health > 75 ? 'var(--status-go)' : aiPrediction.engine_health > 45 ? 'var(--accent-yellow)' : 'var(--accent-red)'}
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 - (aiPrediction.engine_health / 100) * (2 * Math.PI * 40)}
                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                  />
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.2rem', fontWeight: '900', color: '#fff' }}>
                  {(aiPrediction?.engine_health ?? 100)}%
                </div>
              </div>
            </div>

            {/* AI Failure Probability bars */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'leak_risk', label: 'Leak Risk probability', color: 'var(--accent-red)' },
                { key: 'turbo_failure', label: 'Turbo Failure index', color: 'var(--accent-yellow)' },
                { key: 'injector_failure', label: 'Injector Fault probability', color: 'var(--accent-purple)' },
                { key: 'sensor_drift', label: 'Sensor Drift factor', color: 'var(--accent-cyan)' }
              ].map(item => {
                const val = (aiPrediction && aiPrediction[item.key]) || 0.0;
                return (
                  <div key={item.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)', marginBottom: '3px' }}>
                      <span>{item.label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{(val * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: item.color, width: `${val * 100}%`, transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PANEL D: DATA EXPORTER & RECORDER */}
        <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-accent)', textTransform: 'uppercase', marginBottom: '8px' }}>
              🔴 Data Logging & Telemetry Exporter
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '10px' }}>
              Record real-time telemetry packets directly into an in-memory session buffer. Stop logging to package and export data in standard formats.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: '0.75rem' }}>Status: <strong style={{ color: recording ? 'var(--accent-red)' : 'var(--text-muted)' }}>{recording ? 'RECORDING LIVE' : 'STOPPED'}</strong></span>
              <span style={{ fontSize: '0.75rem' }}>Buffer: <strong>{telemetryBuffer.length} packets</strong></span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className={`demo-btn ${recording ? 'danger active' : 'active'}`}
                style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem', fontWeight: 'bold' }}
                onClick={toggleRecording}
                disabled={daqStatus !== 'Connected'}
              >
                {recording ? '⏹️ STOP LOGGER' : '🔴 START LOGGER'}
              </button>
            </div>

            {/* Download Buttons - Always visible when data exists */}
            {telemetryBuffer.length > 0 && !recording && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>
                  📦 {telemetryBuffer.length} Packets Ready to Download
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="demo-btn active"
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      border: '1px solid #10b981',
                      fontWeight: 'bold',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => exportRecording('csv')}
                  >
                    📄 Download CSV
                  </button>
                  <button
                    className="demo-btn active"
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      border: '1px solid #3b82f6',
                      fontWeight: 'bold',
                      fontSize: '0.85rem'
                    }}
                    onClick={() => exportRecording('json')}
                  >
                    📄 Download JSON
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── LIVE SENSOR LOG DATA LOGGER TABLE ──────────────────────── */}
      <div className="card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-accent)', textTransform: 'uppercase', marginBottom: '10px' }}>
          📑 Live Telemetry Packet Log (SensorReadings)
        </div>
        <div style={{ overflowX: 'auto', maxHeight: '180px' }}>
          <table className="history-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                <th style={{ padding: '6px 8px' }}>Timestamp</th>
                <th style={{ padding: '6px 8px' }}>RPM</th>
                <th style={{ padding: '6px 8px' }}>MAF</th>
                <th style={{ padding: '6px 8px' }}>Boost</th>
                <th style={{ padding: '6px 8px' }}>Coolant Temp</th>
                <th style={{ padding: '6px 8px' }}>Oil Temp</th>
                <th style={{ padding: '6px 8px' }}>Oil Press</th>
                <th style={{ padding: '6px 8px' }}>Throttle</th>
                <th style={{ padding: '6px 8px' }}>AFR</th>
                <th style={{ padding: '6px 8px' }}>Leak Zone</th>
                <th style={{ padding: '6px 8px' }}>Health Score</th>
              </tr>
            </thead>
            <tbody>
              {liveSensorList.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '15px' }}>
                    {daqStatus === 'Connected' ? 'Awaiting incoming packet streams...' : 'Connect to a DAQ stream to start logging packets.'}
                  </td>
                </tr>
              ) : (
                liveSensorList.map((row, idx) => (
                  <tr key={idx} style={{
                    fontSize: '0.75rem',
                    borderTop: '1px solid rgba(255,255,255,0.03)',
                    background: row.LeakZone > 0 ? 'rgba(239, 68, 68, 0.12)' : 'transparent'
                  }}>
                    <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{row.Timestamp}</td>
                    <td style={{ padding: '6px 8px' }}>{row.RPM}</td>
                    <td style={{ padding: '6px 8px' }}>{row.MAF}</td>
                    <td style={{ padding: '6px 8px' }}>{row.Boost}</td>
                    <td style={{ padding: '6px 8px' }}>{row.CoolantTemp}</td>
                    <td style={{ padding: '6px 8px' }}>{row.OilTemp}</td>
                    <td style={{ padding: '6px 8px' }}>{row.OilPressure}</td>
                    <td style={{ padding: '6px 8px' }}>{row.ThrottlePosition}%</td>
                    <td style={{ padding: '6px 8px' }}>{row.AFR}</td>
                    <td style={{
                      padding: '6px 8px',
                      color: row.LeakZone > 0 ? 'var(--accent-red)' : 'var(--accent-emerald)',
                      fontWeight: row.LeakZone > 0 ? 'bold' : 'normal'
                    }}>
                      {row.LeakZone > 0 ? `Zone ${row.LeakZone}` : 'Healthy'}
                    </td>
                    <td style={{
                      padding: '6px 8px',
                      color: row.HealthScore > 80 ? 'var(--status-go)' : row.HealthScore > 50 ? 'var(--accent-yellow)' : 'var(--accent-red)',
                      fontWeight: 'bold'
                    }}>
                      {row.HealthScore}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── DAX COMPILER & SANDBOX EDITOR ─────────────────────────── */}
      <div className="card" style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-subtle)', padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-accent)', textTransform: 'uppercase' }}>
             Sensor Query Sandbox
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label className="sensor-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'none', fontSize: '0.72rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={liveQueryMode} onChange={e => setLiveQueryMode(e.target.checked)} disabled={daqStatus !== 'Connected'} style={{ cursor: 'pointer' }} />
              ⏱️ Auto-Run Query (1 Hz)
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
          {QUICK_QUERIES.map(q => (
            <button
              key={q.label}
              className="demo-btn"
              style={{ padding: '5px 12px', fontSize: '11px' }}
              onClick={() => { setQuery(q.query); runQuery(q.query); }}
            >
              {q.label}
            </button>
          ))}
        </div>

        <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden', height: '180px' }}>
          <SafeMonacoEditor
            value={query}
            onChange={(val) => setQuery(val)}
          />
        </div>

        <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
          <button className="demo-btn active" onClick={() => runQuery()} disabled={loading}>
            {loading ? 'Running...' : 'RUN Ctrl+Enter'}
          </button>
          <button className="demo-btn" onClick={() => setQuery('')}>CLEAR</button>
        </div>

        {error && <div style={{ color: 'var(--accent-red)', marginTop: '15px', fontSize: '0.8rem' }}>Error: {error}</div>}

        {result && (
          <div style={{ marginTop: '15px' }}>
            {/* View Mode Tabs (if not scalar) */}
            {!result.is_scalar && result.rows.length > 0 && (
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '5px' }}>
                <button className={`demo-btn ${viewMode === 'table' ? 'active' : ''}`} style={{ padding: '3px 10px', fontSize: '11px' }} onClick={() => setViewMode('table')}>TABLE</button>
                <button className={`demo-btn ${viewMode === 'chart' ? 'active' : ''}`} style={{ padding: '3px 10px', fontSize: '11px' }} onClick={() => setViewMode('chart')}>CHART</button>
              </div>
            )}

            {result.is_scalar ? (
              <div style={{ padding: '15px', background: 'rgba(252,212,65,0.05)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Scalar Metric Value</div>
                <div style={{ fontSize: '36px', color: 'var(--accent-yellow)', fontFamily: 'Orbitron, sans-serif', fontWeight: '800' }}>
                  {result.scalar_value !== null ? result.scalar_value.toFixed(2) : 'No result'}
                </div>
              </div>
            ) : (
              viewMode === 'table' ? (
                <div style={{ overflowX: 'auto', maxHeight: '200px' }}>
                  <table className="history-table" style={{ width: '100%' }}>
                    <thead>
                      <tr style={{ fontSize: '0.7rem' }}>
                        {result.columns.map(col => <th key={col} style={{ padding: '6px 8px' }}>{col}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.slice(0, 30).map((row, i) => (
                        <tr key={i} style={{ fontSize: '0.72rem' }}>
                          {result.columns.map(col => (
                            <td key={col} style={{ padding: '6px 8px' }}>
                              {typeof row[col] === 'number' ? row[col].toFixed(2) : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <ResultLineChart data={result.rows} columns={result.columns} />
              )
            )}
            <div style={{ marginTop: '10px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Rows count: {result.row_count} · Execution: {result.execution_ms}ms
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
