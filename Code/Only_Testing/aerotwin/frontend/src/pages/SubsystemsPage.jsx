// SubsystemsPage.jsx — Sub-System Health Matrix & DTC Diagnostic Codes
import { useTelemetryStore } from '../state/telemetryStore'

export default function SubsystemsPage() {
  const { sensors, residual, mlOutput } = useTelemetryStore()

  const chtVal = sensors?.cht ?? 178
  const egtVal = sensors?.egt ?? 670
  const oilPVal = sensors?.oil_pressure ?? 4.2
  const oilTVal = sensors?.oil_temp ?? 75
  const rpmVal = sensors?.rpm ?? 2880
  const vibVal = sensors?.vibration ?? 0.18

  const SUBSYSTEMS = [
    {
      id: 'combustion',
      name: 'Combustion System',
      desc: 'Cylinder head temps, spark plugs, ignition timing',
      health: Math.max(0, 100 - Math.abs(residual?.cht ?? 0) * 5),
      sensors: [`CHT: ${chtVal.toFixed(1)}°C`, `RPM: ${rpmVal.toFixed(0)}`, `Inj: ${sensors?.injection_timing?.toFixed(1) ?? '12'}°`],
      dtc: mlOutput?.fault_class === 'misfire' ? 'DTC-P0300 (Random Misfire)' : 'DTC-0000 (Nominal)',
    },
    {
      id: 'exhaust',
      name: 'Exhaust System',
      desc: 'EGT thermal manifold, turbocharger headers',
      health: Math.max(0, 100 - Math.abs(residual?.egt ?? 0) * 3),
      sensors: [`EGT: ${egtVal.toFixed(1)}°C`, `Temp Grad: Normal`],
      dtc: mlOutput?.fault_class === 'overheating' ? 'DTC-P0420 (EGT Thermal High)' : 'DTC-0000 (Nominal)',
    },
    {
      id: 'lubrication',
      name: 'Lubrication System',
      desc: 'Oil pump pressure, oil sump temperature, viscosity',
      health: Math.max(0, 100 - Math.abs(residual?.oil_pressure ?? 0) * 45),
      sensors: [`Oil Pressure: ${oilPVal.toFixed(2)} bar`, `Oil Temp: ${oilTVal.toFixed(1)}°C`],
      dtc: mlOutput?.fault_class === 'lubrication_issue' ? 'DTC-P0520 (Oil Pressure Low)' : 'DTC-0000 (Nominal)',
    },
    {
      id: 'cooling',
      name: 'Cooling System',
      desc: 'Airflow cooling fins, thermal radiator heat dissipation',
      health: Math.max(0, 100 - Math.abs(residual?.cht ?? 0) * 3 - Math.abs(residual?.oil_temp ?? 0) * 2),
      sensors: [`Coolant Delta: 4.2°C`, `Fin Airflow: 92%`],
      dtc: mlOutput?.fault_class === 'cooling_degradation' ? 'DTC-P0128 (Cooling Degradation)' : 'DTC-0000 (Nominal)',
    },
    {
      id: 'fuel',
      name: 'Fuel Injection System',
      desc: 'High-pressure fuel rail, injector duty cycle',
      health: Math.max(0, 100 - Math.abs(residual?.fuel_flow ?? 0) * 15),
      sensors: [`Fuel Flow: ${sensors?.fuel_flow?.toFixed(2) ?? '11.4'} L/hr`, `Duty Cycle: 42%`],
      dtc: mlOutput?.fault_class === 'injector_abnormality' ? 'DTC-P0200 (Injector Circuit Abnormality)' : 'DTC-0000 (Nominal)',
    },
    {
      id: 'electrical',
      name: 'Electrical & CAN System',
      desc: 'Alternator voltage, J1939 CAN bus packet integrity',
      health: 98,
      sensors: [`Battery: ${sensors?.battery_voltage?.toFixed(2) ?? '28.0'} V`, `CAN Bus: 250 kbps`],
      dtc: 'DTC-0000 (Nominal)',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, padding: 12, height: '100%', overflowY: 'auto' }}>
      {SUBSYSTEMS.map(sys => {
        const isHealthy = sys.health >= 80
        const color = isHealthy ? '#22c55e' : sys.health >= 50 ? '#f59e0b' : '#ef4444'

        return (
          <div key={sys.id} style={{ background: '#0f172a', border: `1px solid ${isHealthy ? '#1e293b' : color + '50'}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>{sys.name}</div>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${color}20`, color }}>
                {sys.health.toFixed(0)}% HEALTH
              </span>
            </div>

            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>{sys.desc}</div>

            {/* Health Bar */}
            <div style={{ height: 6, background: '#1e293b', borderRadius: 3, marginBottom: 14 }}>
              <div style={{ width: `${sys.health}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
            </div>

            {/* Sensors list */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {sys.sensors.map((s, idx) => (
                <span key={idx} style={{ padding: '4px 8px', background: '#1e293b', borderRadius: 6, fontSize: 11, color: '#cbd5e1', fontFamily: 'JetBrains Mono, monospace' }}>
                  {s}
                </span>
              ))}
            </div>

            {/* DTC Code */}
            <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid #1e293b', fontSize: 10, color: sys.dtc.includes('DTC-0000') ? '#64748b' : '#ef4444', fontFamily: 'JetBrains Mono, monospace' }}>
              DTC Status: <span style={{ fontWeight: 700 }}>{sys.dtc}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
