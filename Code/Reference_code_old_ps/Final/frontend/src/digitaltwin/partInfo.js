export const ZONES = {
  intake:         { label: 'Air Intake',        color: '#3b82f6' },
  boost:          { label: 'Boost / Intercool', color: '#8b5cf6' },
  exhaust:        { label: 'Exhaust',           color: '#ef4444' },
  aftertreatment: { label: 'Aftertreatment',    color: '#f97316' },
  cooling:        { label: 'Cooling',           color: '#06b6d4' },
  lubrication:    { label: 'Lubrication',       color: '#eab308' },
  fuel:           { label: 'Fuel System',       color: '#84cc16' },
  electrical:     { label: 'Electrical',        color: '#a855f7' },
  structure:      { label: 'Structure',         color: '#6b7280' },
};

// Checked in order — first match wins. Put more specific keywords before general.
const PARTS = [

  // ── Aftertreatment (most specific — before exhaust) ─────────────────────
  {
    match: ['aftertreatment', 'doc+dpf', 'dpf', 'scr'],
    zone: 'aftertreatment',
    name: 'Aftertreatment System (DOC + DPF + SCR)',
    desc: 'Three-stage exhaust aftertreatment system achieving Tier 4 Final / Stage V compliance. The Diesel Oxidation Catalyst oxidises CO and HC; the Diesel Particulate Filter captures soot; the Selective Catalytic Reduction system with DEF/AdBlue dosing reduces NOₓ by >95 %.',
    specs: {
      'DOC dimensions': '∅250 × 420 mm',
      'DPF dimensions': '∅310 × 620 mm',
      'SCR dimensions': '∅310 × 720 mm',
      'NOₓ reduction':  '>95 %',
      'PM capture':     '>99 %',
      'Reductant':      '32.5 % AUS-32 (DEF / AdBlue)',
      'DPF regen':      'Passive + active (fuel dosing)',
      'Dosing nozzle':  '1× urea injector (SCR inlet)',
    },
  },

  // ── Air intake ──────────────────────────────────────────────────────────
  {
    match: ['airflow meter', 'maf sensor', 'mass air flow'],
    zone: 'intake',
    name: 'Mass Airflow Meter (MAF Sensor)',
    desc: 'Hot-film anemometer measuring mass airflow into the turbocharger. The ECM uses this reading for precise fuel metering, VGT vane control, and EGR rate calculation.',
    specs: { 'Sensor type': 'Hot-film thermal', 'Output signal': '0–5 V analogue', 'Range': '0–2 200 kg/h', 'Location': 'Turbocharger inlet duct' },
  },
  {
    match: ['air cleaner', 'intake duct assembly'],
    zone: 'intake',
    name: 'Air Cleaner & Intake Duct Assembly',
    desc: 'Heavy-duty two-stage dry-element air filtration that removes particles to ≤5 µm before air enters the turbocharger, preventing compressor blade erosion.',
    specs: { 'Filtration': '2-stage (pre-cleaner + main element)', 'Service interval': '500 h or restriction-indicator trip', 'Restriction limit': '6.35 kPa (25 in H₂O)', 'Element type': 'Radial-seal dry paper' },
  },
  {
    match: ['air induction system'],
    zone: 'intake',
    name: 'Air Induction System',
    desc: 'Complete air supply sub-system routing clean filtered air from the air cleaner through large-bore flexible ducting to the turbocharger compressor inlet.',
    specs: { 'Bore': '∅127 mm nominal', 'Material': 'Reinforced silicone + steel', 'Clamps': 'T-bolt worm-drive' },
  },
  {
    match: ['air intake pipe', 'turbo inlet duct'],
    zone: 'intake',
    name: 'Air Intake Pipe / Turbo Inlet Duct',
    desc: 'Large-bore duct carrying filtered air from the air cleaner outlet directly to the turbocharger compressor inlet, with clamped silicone couplings to absorb vibration.',
    specs: { 'Nominal bore': '∅127 mm', 'Material': 'Reinforced silicone + aluminised steel' },
  },
  {
    match: ['inspection cover', 'compressor inlet cover'],
    zone: 'intake',
    name: 'Air Intake Inspection Cover',
    desc: 'Removable cover on the air intake duct providing access to the turbocharger compressor inlet for inspection of the impeller blades and inlet guide vanes.',
    specs: { 'Fasteners': '4× M8 bolts', 'Seal': 'Formed gasket' },
  },

  // ── Turbocharger & boost ────────────────────────────────────────────────
  {
    match: ['turbocharger coolant', 'turbocharger oil'],
    zone: 'cooling',
    name: 'Turbocharger Coolant / Oil Transfer Lines',
    desc: 'Stainless steel braided lines supplying coolant and lubrication oil to the turbocharger centre housing, and returning hot oil back to the engine sump.',
    specs: { 'Oil supply': 'Engine gallery pressure (~400 kPa)', 'Oil return': 'Gravity drain to sump', 'Coolant': 'Jacket water (post-thermostat)' },
  },
  {
    match: ['turbocharger assembly', 'turbocharger'],
    zone: 'boost',
    name: 'Turbocharger Assembly',
    desc: 'Single-stage variable-geometry turbocharger (VGT) with water-cooled centre housing. The ECM actuates the variable nozzle ring to match boost pressure precisely to load, achieving up to 1.8 bar gauge without a wastegate.',
    specs: { 'Type': 'Single-stage VGT', 'Max boost': '~1.8 bar gauge', 'Turbine inlet temp': '≤760 °C', 'Centre housing': 'Water-cooled', 'Bearings': 'Full-floating radial + thrust' },
  },
  {
    match: ['compressor outlet', 'turbo to cac'],
    zone: 'boost',
    name: 'Compressor Outlet Duct (Turbo → CAC)',
    desc: 'Short high-temperature charge-air duct carrying compressed hot air from the turbocharger compressor volute outlet down to the Charge Air Cooler inlet.',
    specs: { 'Bore': '∅130 mm', 'Max pressure': '2.8 bar(a)', 'Max inlet temp': '~200 °C', 'Material': 'Aluminised steel / silicone couplings' },
  },
  {
    match: ['charge air cooler', 'cac'],
    zone: 'boost',
    name: 'Charge Air Cooler (CAC / ATAAC)',
    desc: 'Air-to-water heat exchanger (ATAAC) cooling compressed charge air from ~200 °C down to ~60 °C, increasing air density by 30–40 % and reducing in-cylinder peak temperatures to lower NOₓ.',
    specs: { 'Type': 'Air-to-water (ATAAC)', 'Air inlet temp': '≤205 °C', 'Air outlet temp': '≤65 °C', 'Coolant circuit': 'Engine jacket water', 'Core': 'Aluminium bar-and-plate' },
  },
  {
    match: ['intake manifold'],
    zone: 'boost',
    name: 'Intake Manifold Assembly',
    desc: 'Cast aluminium manifold distributing cooled, pressurised charge air equally to all six cylinder ports. Incorporates the combined MAP + MAT sensor boss and coolant crossover.',
    specs: { 'Cylinders': '6 (inline)', 'Material': 'Aluminium alloy', 'Sensor boss': 'MAP + MAT combined' },
  },

  // ── Exhaust ─────────────────────────────────────────────────────────────
  {
    match: ['exhaust manifold assembly', 'exhaust manifold'],
    zone: 'exhaust',
    name: 'Exhaust Manifold Assembly',
    desc: 'Dry log-style cast-iron exhaust manifold collecting combustion gas from all six cylinder-head ports and routing it to the turbocharger turbine inlet at controlled back-pressure.',
    specs: { 'Type': 'Dry log manifold', 'Material': 'Ductile cast iron', 'Ports': '6 individual flanges', 'Max rated temp': '760 °C', 'Gasket': 'Multi-layer steel (MLS)' },
  },
  {
    match: ['exhaust outlet', 'exhaust elbow', 'turbo exhaust'],
    zone: 'exhaust',
    name: 'Turbo Exhaust Elbow',
    desc: 'Cast elbow bolted to the turbocharger turbine outlet, redirecting spent exhaust gas sideways toward the aftertreatment system inlet pipe.',
    specs: { 'Material': 'Cast iron', 'Outlet bore': '∅110 mm', 'Connection': 'Flanged (6× M12 bolts)' },
  },

  // ── Engine block & head ─────────────────────────────────────────────────
  {
    match: ['cylinder block', 'cylinder block assembly'],
    zone: 'structure',
    name: 'Cylinder Block Assembly',
    desc: 'Main structural casting of the inline-6 engine, machined for replaceable dry cylinder liners, seven main-bearing caps, and integral oil and coolant passages throughout.',
    specs: { 'Bore × Stroke': '145 × 183 mm', 'Displacement': '18.1 L (1 105 in³)', 'Material': 'Compacted graphite iron (CGI)', 'Main bearings': '7' },
  },
  {
    match: ['cylinder head region', 'cylinder head'],
    zone: 'structure',
    name: 'Cylinder Head Assembly',
    desc: '4-valve-per-cylinder cast-iron cylinder head with cross-flow porting for optimum volumetric efficiency. Houses the hydraulic electronic unit injectors (HEUI) and rocker arms.',
    specs: { 'Valves/cylinder': '4 (2 intake, 2 exhaust)', 'Material': 'Grey cast iron', 'Injector type': 'Hydraulic Electronic Unit Injector (HEUI)' },
  },
  {
    match: ['valve cover assembly', 'valve cover region', 'valve cover', 'rocker cover'],
    zone: 'structure',
    name: 'Valve / Rocker Cover',
    desc: 'Sealed aluminium casting enclosing the rocker-arm assembly and unit-injector solenoid connectors. Integrates the closed crankcase ventilation (CCV) breather outlet.',
    specs: { 'Material': 'Aluminium casting', 'Seal': 'FIPG (formed-in-place gasket)', 'Breather': 'CCV port to air inlet' },
  },

  // ── Flywheel ─────────────────────────────────────────────────────────────
  {
    match: ['flywheel housing'],
    zone: 'structure',
    name: 'Flywheel Housing Assembly',
    desc: 'SAE No. 0 flywheel housing providing the driven-equipment mounting interface. Encloses the flywheel and starter motor pinion engagement zone.',
    specs: { 'SAE housing': 'No. 0', 'Starter location': 'Bottom mount' },
  },
  {
    match: ['flywheel disc', 'flywheel'],
    zone: 'structure',
    name: 'Flywheel',
    desc: 'Cast-iron flywheel carrying a 168-tooth ring gear for starter engagement. Stores rotational inertia to smooth power delivery and provides the SAE coupling face for driven equipment.',
    specs: { 'Ring gear teeth': '168', 'Material': 'Grey cast iron', 'Balance': 'Dynamic balanced' },
  },

  // ── Timing ──────────────────────────────────────────────────────────────
  {
    match: ['timing gear cover', 'front timing gear cover'],
    zone: 'structure',
    name: 'Front Timing Gear Cover',
    desc: 'Sheet-metal or cast cover sealing the front gear train, mounting the vibration damper, and providing the front crankshaft oil seal housing.',
    specs: { 'Material': 'Aluminium / steel', 'Seal': 'Lip seal (crankshaft)' },
  },
  {
    match: ['timing gear housing', 'front timing gear housing'],
    zone: 'structure',
    name: 'Front Timing Gear Housing',
    desc: 'Main structural housing enclosing the front helical gear train that drives the camshaft, fuel pump, coolant pump, oil pump, and accessory drives.',
    specs: { 'Material': 'Cast aluminium', 'Gear type': 'Helical cut (low noise)' },
  },

  // ── Lubrication ─────────────────────────────────────────────────────────
  {
    match: ['engine lubrication assembly', 'crankcase ventilation'],
    zone: 'lubrication',
    name: 'Engine Lubrication & CCV Assembly',
    desc: 'Integrated lubrication module including the closed crankcase ventilation (CCV) separator and oil mist recirculation system, preventing unfiltered crankcase gases from entering the intake.',
    specs: { 'Oil capacity': '56 L (with filter)', 'CCV type': 'Coalescing separator', 'Coalesce efficiency': '>97 % oil mist' },
  },
  {
    match: ['oil filter', 'lubrication module'],
    zone: 'lubrication',
    name: 'Lube Oil Filter / Module',
    desc: 'Full-flow spin-on oil filter rated at 20 µm absolute. Integral anti-drain-back valve prevents dry starts; bypass valve opens at 207 kPa to protect the engine if the element becomes restricted.',
    specs: { 'Rating': '20 µm absolute', 'Bypass valve': '207 kPa (30 psi)', 'Anti-drain-back': 'Integral', 'Service interval': '500 h' },
  },
  {
    match: ['oil pump'],
    zone: 'lubrication',
    name: 'Engine Oil Pump Assembly',
    desc: 'Gear-type oil pump driven by the front gear train, supplying pressurised lubricant to all engine bearings, piston cooling jets, and the HEUI high-pressure actuating oil system.',
    specs: { 'Type': 'Gear pump', 'Rated pressure': '380–550 kPa at operating temp', 'Drive': 'Front gear train', 'Pressure relief': 'Integral spring valve' },
  },
  {
    match: ['oil sump', 'engine oil sump'],
    zone: 'lubrication',
    name: 'Engine Oil Sump',
    desc: 'Fabricated-steel sump forming the structural base of the engine. Internal baffles prevent surge under dynamic loading (marine or mobile applications).',
    specs: { 'Capacity (full)': '56 L (with filter)', 'Material': 'Steel', 'Drain': '1½" NPT plug' },
  },
  {
    match: ['oil pressure sensor'],
    zone: 'lubrication',
    name: 'Oil Pressure Sensor',
    desc: 'Piezo-resistive pressure sensor monitoring main-gallery oil pressure. Signals the ECM for fault detection and data-link reporting; triggers a warning lamp below 140 kPa.',
    specs: { 'Warning trip': '<140 kPa at idle', 'Output': '0–5 V analogue / CAN', 'Thread': 'M14 × 1.5' },
  },
  {
    match: ['oil transfer', 'lubrication line'],
    zone: 'lubrication',
    name: 'Oil Transfer / Lubrication Line',
    desc: 'High-pressure oil supply and return line connecting main gallery to remote lubrication points or the turbocharger centre housing.',
    specs: { 'Fitting': 'Banjo or JIC', 'Material': 'Steel braided / solid steel' },
  },
  {
    match: ['oil dipstick'],
    zone: 'lubrication',
    name: 'Engine Oil Dipstick Assembly',
    desc: 'Calibrated dipstick tube assembly for checking oil level at service intervals. MIN/MAX marks cover the operating range of the 56 L system.',
    specs: { 'Full mark': '56 L', 'Low mark': '~52 L', 'Check interval': 'Daily / every 10 h' },
  },
  {
    match: ['oil drain plug', 'engine drain plug'],
    zone: 'lubrication',
    name: 'Oil Drain Plug',
    desc: 'Magnetic drain plug at the lowest point of the sump; magnetic element traps ferrous wear particles for inspection at each oil change.',
    specs: { 'Thread': '1½" NPT', 'Torque': '55 N·m', 'Magnetic': 'Yes' },
  },
  {
    match: ['oil filler cap'],
    zone: 'lubrication',
    name: 'Engine Oil Filler Cap',
    desc: 'Bayonet-style sealed cap on the valve cover providing oil fill access. Integral vent gasket prevents crankcase pressure bleed.',
    specs: { 'Type': 'Bayonet cap', 'Seal': 'Moulded rubber ring' },
  },

  // ── Cooling ─────────────────────────────────────────────────────────────
  {
    match: ['engine coolant line', 'coolant hose', 'coolant outlet'],
    zone: 'cooling',
    name: 'Coolant Line / Hose',
    desc: 'Coolant circuit hose or fitting routing jacket water between the cylinder block, head, thermostat housing, and external heat exchangers.',
    specs: { 'Coolant type': 'Extended life coolant (ELC)', 'Change interval': '6 000 h or 3 years', 'Thermostat opens': '83 °C' },
  },
  {
    match: ['coolant temperature sensor'],
    zone: 'cooling',
    name: 'Coolant Temperature Sensor',
    desc: 'NTC thermistor monitoring jacket water temperature at the cylinder head outlet. Signals the ECM to adjust timing, fuelling, and fan control.',
    specs: { 'Type': 'NTC thermistor', 'Normal range': '82–97 °C', 'Alarm': '>107 °C de-rate', 'Thread': 'M14 × 1.5' },
  },
  {
    match: ['water pump', 'coolant pump'],
    zone: 'cooling',
    name: 'Coolant Pump',
    desc: 'Gear-driven centrifugal pump circulating ~600 L/min of coolant at full rated load.',
    specs: { 'Type': 'Centrifugal', 'Rated flow': '~600 L/min', 'Drive': 'Front gear train' },
  },

  // ── Electrical ──────────────────────────────────────────────────────────
  {
    match: ['ecu', 'ecm', 'electronic control module'],
    zone: 'electrical',
    name: 'Electronic Control Module (ECM)',
    desc: 'Flash-programmable engine controller managing fuel quantity, injection timing, VGT vane position, EGR rate, aftertreatment dosing, and comprehensive on-board diagnostics over J1939 CAN.',
    specs: { 'Communication': 'SAE J1939 CAN + J1587', 'Inputs': '>40 sensor channels', 'Protection': 'IP67 sealed aluminium', 'Logging': 'Non-volatile fault & event memory' },
  },
  {
    match: ['starter motor', 'starter'],
    zone: 'electrical',
    name: 'Starter Motor',
    desc: '24 V sliding-pinion starter motor providing sufficient cranking torque for cold-start operation. Pinion engages the flywheel ring gear on command from the ECM.',
    specs: { 'Voltage': '24 V DC', 'Type': 'Sliding pinion (Bendix)', 'Power': '≥9 kW', 'Ring gear teeth': '168' },
  },
  {
    match: ['engine speed sensor', 'speed sensor'],
    zone: 'electrical',
    name: 'Engine Speed / Crankshaft Position Sensor',
    desc: 'Magnetic reluctance (or Hall-effect) sensor reading a 60-2 tone wheel on the crankshaft to provide RPM and TDC timing reference for the ECM.',
    specs: { 'Type': 'Magnetic reluctance or Hall-effect', 'Target wheel': '60-2 tooth', 'Output': 'Variable reluctance pulse / digital', 'Thread': 'M18 × 1.5' },
  },
  {
    match: ['alternator'],
    zone: 'electrical',
    name: 'Alternator',
    desc: '24 V belt-driven alternator supplying continuous charging current to the battery bank and vehicle electrical loads.',
    specs: { 'System voltage': '24 V DC', 'Output current': '105 A typical', 'Drive': 'Poly-V belt, front accessory drive' },
  },

  // ── Fuel ────────────────────────────────────────────────────────────────
  {
    match: ['fuel filter', 'water separator'],
    zone: 'fuel',
    name: 'Fuel Filter / Water Separator',
    desc: 'Primary fuel conditioning module separating water and removing particulate contamination to protect the high-precision HEUI injectors.',
    specs: { 'Filtration': '10 µm absolute', 'Service interval': '500 h', 'Water drain': 'Manual drain cock' },
  },

  // ── Structure / supports ─────────────────────────────────────────────────
  {
    match: ['pump drive region', 'pump drive'],
    zone: 'structure',
    name: 'Pump Drive Region',
    desc: 'Rear accessory drive interface housing for auxiliary pump drives (hydraulic, fuel lift pump, etc.) driven off the rear gear train.',
    specs: { 'Drive': 'Rear gear train', 'Interfaces': 'SAE B / C pump flange available' },
  },
  {
    match: ['crankcase breather'],
    zone: 'structure',
    name: 'Crankcase Breather / CCV Connector',
    desc: 'Closed crankcase ventilation filter or connector routing filtered crankcase gases back to the intake system, preventing environmental oil mist release.',
    specs: { 'Type': 'Closed CCV (EPA / Stage V mandated)' },
  },
  {
    match: ['speed sensor mount'],
    zone: 'structure',
    name: 'Engine Speed Sensor Mount',
    desc: 'Precision-machined mounting boss maintaining correct air gap between the speed sensor tip and the crankshaft tone wheel (0.5–1.0 mm nominal).',
    specs: { 'Air gap': '0.5–1.0 mm', 'Thread': 'M18 × 1.5' },
  },
  {
    match: ['mounting bolts', 'fastener studs'],
    zone: 'structure',
    name: 'Mounting Bolts / Fastener Studs',
    desc: 'High-tensile fasteners securing major components; typically grade 10.9 metric bolts with specific torque sequences per service manual.',
    specs: { 'Material': 'Grade 10.9 steel', 'Coating': 'Zinc-phosphate + oil' },
  },
  {
    match: ['support bracket', 'engine support', 'side support', 'front engine support'],
    zone: 'structure',
    name: 'Engine Support / Mounting Bracket',
    desc: 'Structural bracket transmitting engine loads to the mounting frame or anti-vibration mounts, absorbing dynamic torque and vibration.',
    specs: { 'Material': 'Cast iron or steel weldment', 'Mount type': 'Flexible (anti-vibration pad)' },
  },
];

export function getPartInfo(meshName) {
  const lower = meshName.toLowerCase();
  for (const entry of PARTS) {
    if (entry.match.some(kw => lower.includes(kw))) {
      return { ...entry };
    }
  }
  // Generic fallback
  return {
    name: meshName,
    zone: 'structure',
    desc: 'A component of the Aero Piston Engine for MALE UAVs. Designed for high mission reliability, real-time health monitoring, and altitude performance.',
    specs: { 'Engine': 'Aero Piston Engine', 'Application': 'MALE UAV', 'Config': 'Turbocharged Aero Engine', 'Monitoring': 'AeroTwin Real-Time DT' },
  };
}
