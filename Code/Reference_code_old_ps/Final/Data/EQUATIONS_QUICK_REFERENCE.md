# 🔬 Dataset Creation Equations - Quick Reference Card

## The 6 Core Equations (Simple Version)

---

### 1️⃣ Air Flow (MAF)
**What it does**: Calculates how much air enters the engine

```
MAF = 0.92 × 0.003 × 6 × (RPM/120) × Air_Density × 3600

Where:
  0.92 = Engine efficiency
  0.003 = Cylinder size (liters)
  6 = Number of cylinders
  RPM/120 = Strokes per second (4-stroke engine)
  Air_Density = 1.18 kg/m³ (at sea level, 25°C)
  3600 = Convert to kg/hour
```

**Example**:
```
At 1800 RPM:
MAF = 0.92 × 0.003 × 6 × 15 × 1.18 × 3600
MAF = 850 kg/h
```

---

### 2️⃣ Boost Pressure
**What it does**: How much the turbo compresses air

```
Boost_Pressure = Pressure_Ratio × 101.325

Pressure_Ratio = 2.15 (typical for C18 at mid-range RPM)
```

**Example**:
```
Boost_Pressure = 2.15 × 101.325 = 218 kPa
```

---

### 3️⃣ Boost Temperature  
**What it does**: Air gets hot when compressed

```
T_boost = T_intake × 1.35

(Simplified from: T_boost = T_intake × [1 + (PR^0.286 - 1) / 0.78])
```

**Example**:
```
At T_intake = 298K (25°C):
T_boost = 298 × 1.35 = 403K = 130°C
```

---

### 4️⃣ Charge Air Cooler
**What it does**: Intercooler cools the hot compressed air

```
T_cac_out = T_boost - 0.88 × (T_boost - T_intake)

Where: 0.88 = Cooler is 88% effective
```

**Example**:
```
T_cac_out = 403 - 0.88×(403-298) 
T_cac_out = 403 - 92 = 311K = 38°C
```

---

### 5️⃣ Exhaust Temperature
**What it does**: Burning fuel heats exhaust gas

```
T_exhaust = T_cac_out + 500K

(Simplified - actual uses combustion energy calculation)
```

**Example**:
```
T_exhaust = 311 + 500 = 811K = 538°C
```

---

### 6️⃣ DPF Pressure
**What it does**: Resistance from diesel particulate filter

```
dP_dpf = 2.5 × (Air_Flow)^1.8

Where: Air_Flow in kg/second
```

**Example**:
```
Air_Flow = 850 kg/h = 0.236 kg/s
dP_dpf = 2.5 × (0.236)^1.8 = 0.45 kPa
```

---

## 🎯 Leak Injection Formulas

### Zone 1 - Intake Leak
```
MAF_with_leak = MAF × (1 - leak_percent)

Small leak (2%): MAF = 850 × 0.98 = 833 kg/h
Medium (8%): MAF = 850 × 0.92 = 782 kg/h  
Large (15%): MAF = 850 × 0.85 = 722 kg/h
```

### Zone 2 - Charge Air Leak
```
Boost_with_leak = Boost × (1 - 0.8 × leak_percent)

Small (2%): Boost = 218 × 0.984 = 214.5 kPa
Medium (8%): Boost = 218 × 0.936 = 204.0 kPa
Large (15%): Boost = 218 × 0.88 = 191.8 kPa
```

### Zone 3 - CAC/Manifold Leak
```
MAP_intake_with_leak = MAP_intake × (1 - leak_percent)

Small (2%): MAP = 205 × 0.98 = 201 kPa
Medium (8%): MAP = 205 × 0.92 = 189 kPa
Large (15%): MAP = 205 × 0.85 = 174 kPa
```

### Zone 4 - Exhaust Leak
```
T_exh_with_leak = T_exh × (1 - 0.15 × leak_percent)

Small (2%): T_exh = 538 × 0.997 = 536°C
Medium (8%): T_exh = 538 × 0.988 = 531°C  
Large (15%): T_exh = 538 × 0.978 = 526°C
```

### Zone 5 - DPF Leak
```
dP_dpf_with_leak = dP_dpf × (1 + 2.0 × leak_percent)

Small (2%): dP = 0.45 × 1.04 = 0.47 kPa
Medium (8%): dP = 0.45 × 1.16 = 0.52 kPa
Large (15%): dP = 0.45 × 1.30 = 0.59 kPa
```

---

## 🔊 Noise Addition Formula

**Applied to all sensors**:

```python
Measured_Value = True_Value × (1 + Random_Noise)

Random_Noise = Gaussian(mean=0, std=error_percent)

Error levels:
- Pressure sensors: 0.5%
- Temperature sensors: 1.0%
- Flow sensors: 1.5%
```

**Example** (Boost pressure with noise):
```python
True_Boost = 218 kPa
Noise = random.normal(0, 0.005)  # 0.5% error
Measured = 218 × (1 + 0.003) = 218.7 kPa
or
Measured = 218 × (1 - 0.004) = 217.1 kPa
```

---

## 📊 Complete Data Generation Flow

```
┌─────────────────────────────────────────┐
│ Step 1: Pick Random RPM (1100-2100)    │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Step 2: Calculate Healthy Sensors      │
│  ├─ MAF (Equation 1)                   │
│  ├─ Boost Pressure (Equation 2)        │
│  ├─ Boost Temp (Equation 3)            │
│  ├─ CAC Temp (Equation 4)              │
│  ├─ Exhaust Temp (Equation 5)          │
│  └─ DPF Pressure (Equation 6)          │
└──────────────┬──────────────────────────┘
               ↓
        ┌──────┴──────┐
        │   Leak?     │
        └──┬───────┬──┘
     NO ↓         ↓ YES
   ┌─────┴──┐  ┌──┴─────────────────────┐
   │ Healthy│  │ Apply Leak Injection   │
   │ Sample │  │ (Modify sensors based  │
   │        │  │  on zone & severity)   │
   └────┬───┘  └──────┬─────────────────┘
        │             │
        └──────┬──────┘
               ↓
┌─────────────────────────────────────────┐
│ Step 3: Add Gaussian Noise to All      │
│         Sensors (realistic errors)      │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Step 4: Save to DataFrame               │
│  - sample_id, timestamp                 │
│  - leak_flag, leak_zone                 │
│  - All 15 sensor readings               │
└─────────────────────────────────────────┘
```

---

## 💻 Python Implementation (Simplified)

```python
import numpy as np

def generate_sample(rpm, has_leak=False, zone=0, severity=0):
    # Constants
    VE = 0.92
    DISPLACEMENT = 0.003 * 6  # liters per cylinder × 6
    AIR_DENSITY = 1.18
    
    # Equation 1: Air Flow
    MAF = VE * DISPLACEMENT * (rpm/120) * AIR_DENSITY * 3600
    
    # Equation 2: Boost Pressure  
    PR = 2.15  # Simplified pressure ratio
    Boost = PR * 101.325
    
    # Equation 3: Boost Temperature
    T_boost = 298 * 1.35  # Kelvin
    
    # Equation 4: CAC Temperature
    T_cac = T_boost - 0.88 * (T_boost - 298)
    
    # Equation 5: Exhaust Temperature
    T_exh = T_cac + 500
    
    # Equation 6: DPF Pressure
    air_flow = MAF / 3600  # kg/s
    dP_dpf = 2.5 * (air_flow ** 1.8)
    
    # If leak, modify sensors
    if has_leak:
        leak_pct = [0, 0.02, 0.08, 0.15][severity]
        
        if zone == 1:  # Intake leak
            MAF = MAF * (1 - leak_pct)
        elif zone == 2:  # Charge air leak
            Boost = Boost * (1 - 0.8 * leak_pct)
        # ... etc for other zones
    
    # Add noise
    MAF = MAF * (1 + np.random.normal(0, 0.015))
    Boost = Boost * (1 + np.random.normal(0, 0.005))
    # ... etc
    
    return {
        'RPM': rpm,
        'MAF': MAF,
        'MAP_boost': Boost,
        'T_boost': T_boost - 273,  # Convert to Celsius
        'T_cac_out': T_cac - 273,
        'T_exh_manifold': T_exh - 273,
        'dP_dpf': dP_dpf,
        'leak_flag': 1 if has_leak else 0,
        'leak_zone': zone
    }

# Generate 5000 healthy samples
healthy_samples = [generate_sample(np.random.randint(1100, 2100)) 
                   for _ in range(5000)]

# Generate leak samples
leak_samples = []
for zone in [1,2,3,4,5]:
    for severity in [1,2,3]:
        for _ in range(333):
            rpm = np.random.randint(1100, 2100)
            leak_samples.append(
                generate_sample(rpm, has_leak=True, zone=zone, severity=severity)
            )
```

---

## 📈 Validation Checks

After generating data, we validate:

### 1. Sensor Range Check
```python
assert 400 <= MAF <= 1200, "MAF out of range"
assert 180 <= Boost <= 350, "Boost out of range"  
assert 30 <= T_cac_out <= 70, "CAC temp out of range"
assert 450 <= T_exh <= 850, "Exhaust temp out of range"
```

### 2. Physics Consistency
```python
# Boost temp must be higher than intake temp
assert T_boost > T_intake, "Invalid compression"

# CAC output must be cooler than CAC input
assert T_cac_out < T_boost, "CAC not cooling"

# Exhaust hotter than intake
assert T_exh > T_cac_out, "Invalid combustion"
```

### 3. Energy Balance
```python
# Energy in fuel ≈ Energy in exhaust heat + Work
fuel_energy = fuel_flow * 42800  # kJ/kg
exhaust_heat = mass_flow * Cp * (T_exh - T_intake)
work_output = torque * rpm / 9550  # kW

assert abs(fuel_energy - (exhaust_heat + work_output)) < tolerance
```

---

## 🎓 Key Formulas Summary Table

| Sensor | Formula | Typical Value |
|--------|---------|---------------|
| **MAF** | `0.92 × 0.018 × (RPM/120) × ρ × 3600` | 850 kg/h |
| **Boost** | `2.15 × 101.325` | 218 kPa |
| **T_boost** | `T_intake × 1.35` | 130°C |
| **T_cac_out** | `T_boost - 0.88×(T_boost - T_intake)` | 38°C |
| **T_exh** | `T_cac_out + 500` | 538°C |
| **dP_dpf** | `2.5 × (flow)^1.8` | 0.45 kPa |

---

## 🔢 Constants Used

```python
# Engine specs
DISPLACEMENT = 18.1  # liters
CYLINDERS = 6
COMPRESSION_RATIO = 16.3

# Thermodynamic
R_AIR = 287  # J/(kg·K)
CP_AIR = 1005  # J/(kg·K)
GAMMA = 1.4  # Heat capacity ratio

# Efficiencies
VE_BASE = 0.92  # Volumetric efficiency
TURBO_EFFICIENCY = 0.78  # Compressor
CAC_EFFECTIVENESS = 0.88  # Intercooler
COMBUSTION_EFF = 0.97  # Fuel burn

# Fuel
LHV_DIESEL = 42800  # kJ/kg

# Ambient
AMBIENT_PRESSURE = 101.325  # kPa
AMBIENT_TEMP = 298.15  # K (25°C)
```

---

## 📋 Quick Reference - Leak Effects

| Zone | Primary Effect | Formula Modifier |
|------|---------------|------------------|
| **Zone 1** | MAF drops | `MAF × (1 - %)` |
| **Zone 2** | Boost drops | `Boost × (1 - 0.8×%)` |
| **Zone 3** | Manifold pressure drops | `MAP × (1 - %)` |
| **Zone 4** | Exhaust temp drops | `T_exh × (1 - 0.15×%)` |
| **Zone 5** | DPF pressure rises | `dP × (1 + 2.0×%)` |

Where `%` = 0.02 (small), 0.08 (medium), or 0.15 (large)

---

**Last Updated**: June 9, 2026  
**Use**: Print this for quick equation reference while coding!
