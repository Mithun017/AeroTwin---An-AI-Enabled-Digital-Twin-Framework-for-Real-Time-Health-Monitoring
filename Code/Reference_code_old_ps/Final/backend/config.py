"""
LeakSense Twin — Engine Configuration & Constants
Cat C18 Diesel Engine Parameters
"""

# ─── CAT C18 Engine Specifications ────────────────────────────────────────────
ENGINE_CONFIG = {
    "name": "Cat C18",
    "configuration": "Inline 6, 4-Stroke-Cycle Diesel",
    "displacement_L": 18.1,
    "n_cylinders": 6,
    "bore_mm": 145,
    "stroke_mm": 183,
    "compression_ratio": 16.3,
    "max_power_kW": 597,
    "max_power_rpm": 2100,
    "max_torque_Nm": 3655,
    "max_torque_rpm": 1400,
    "aspiration": "Twin-Turbocharged Aftercooled (DITA)",
    "ecu": "ADEM A4",
    "communication": "SAE J1939",
    "fuel_system": "MEUI injection",
}

# ─── Thermodynamic Constants ──────────────────────────────────────────────────
DISPLACEMENT = 18.1          # liters
N_CYLINDERS = 6
COMPRESSION_RATIO = 16.3
R_AIR = 287.0                # J/(kg·K)
CP_AIR = 1005.0              # J/(kg·K)
GAMMA = 1.4                  # Heat capacity ratio for air
CAC_EFFECTIVENESS = 0.88     # Nominal charge air cooler effectiveness
TURBO_EFF_COMPRESSOR = 0.78  # Nominal isentropic efficiency
TURBO_EFF_TURBINE = 0.82     # Nominal isentropic efficiency
VE_BASE = 0.92               # Volumetric efficiency at rated
LHV_DIESEL = 42800.0         # kJ/kg — Lower Heating Value
COMBUSTION_EFF = 0.97        # Combustion efficiency
MAP_AMBIENT = 101.325        # kPa — standard atmospheric pressure
T_AMBIENT_K = 298.15         # K — standard ambient temperature (25°C)

# ─── Sensor Channels ─────────────────────────────────────────────────────────
RAW_SENSOR_COLS = [
    'RPM', 'MAF', 'MAP_intake', 'MAP_boost', 'MAP_cac_in', 'MAP_cac_out',
    'T_intake', 'T_boost', 'T_cac_out', 'T_exh_manifold', 'T_dpf_in',
    'T_dpf_out', 'fuel_qty',
    # Extended sensors (optional - have defaults if missing)
    'turbo_speed', 'P_exh_manifold', 'P_turbine_out', 'P_tailpipe',
    'T_DOC', 'T_SCR'
]

RESIDUAL_COLS = [
    'res_MAF', 'res_MAP_boost', 'res_T_boost', 'res_T_cac_out',
    'res_MAP_cac_out', 'res_T_exh_manifold', 'res_T_post_turbine',
    'res_dP_dpf', 'res_MAP_intake',
    # Extended residuals
    'res_turbo_speed', 'res_P_exh_manifold', 'res_P_turbine_out',
    'res_P_tailpipe', 'res_T_DOC', 'res_T_SCR'
]

EF_CHANNELS = ['MAF', 'MAP_boost', 'MAP_cac_out', 'T_cac_out',
               'T_exh_manifold', 'dP_dpf', 'RPM']

ZONE_NAMES = [
    "No Leak / Healthy",
    "Zone 1 — Intake (Airflow meter → Compressor inlet)",
    "Zone 2 — Charge Air (Post-compressor → CAC inlet)",
    "Zone 3 — CAC/Manifold (CAC → Intake manifold)",
    "Zone 4 — Exhaust Manifold (Manifold → Turbo turbine)",
    "Zone 5 — DPF (Diesel Particulate Filter)",
    "Zone 6 — SCR/Tailpipe (Selective Catalytic Reduction)"
]

# ─── ML Model Hyperparameters ─────────────────────────────────────────────────
ML_CONFIG = {
    "input_dim": 43,  # Updated: 19 raw + 15 residuals + 6 ratios + 3 stats
    "hidden_dim": 64,
    "n_classes": 7,
    "dropout": 0.3,
    "learning_rate": 1e-3,
    "weight_decay": 1e-4,
    "batch_size": 256,
    "max_epochs": 200,
    "patience": 15,
    "leak_threshold": 0.5,
    "consecutive_alerts": 3,
}

# ─── Noise Parameters ─────────────────────────────────────────────────────────
NOISE_CONFIG = {
    "pressure_sigma_pct": 0.005,   # 0.5% for pressure sensors
    "temperature_sigma_pct": 0.01, # 1% for temperature sensors
    "flow_sigma_pct": 0.015,       # 1.5% for flow sensors
    "drift_rate_pct_hr": 0.001,    # 0.1%/hour sensor drift
}

# ─── Steady-State Filter ──────────────────────────────────────────────────────
STEADY_STATE_CONFIG = {
    "window_size": 30,        # 30 seconds at 1 Hz
    "rpm_std_max": 10.0,      # RPM
    "maf_std_pct_max": 0.02,  # 2% of mean
    "fuel_std_pct_max": 0.01, # 1% of mean
}

# ─── Scalable Engine Profiles ──────────────────────────────────────────────────
ENGINE_PROFILES = {
    "Cat C18": {
        "displacement_L": 18.1,
        "n_cylinders": 6,
        "compression_ratio": 16.3,
        "r_air": 287.0,
        "cp_air": 1005.0,
        "gamma": 1.4,
        "cac_effectiveness": 0.88,
        "turbo_eff_compressor": 0.78,
        "turbo_eff_turbine": 0.82,
        "ve_base": 0.92,
        "ve_rpm_peak": 1400.0,
        "ve_quadratic_coeff": -1.2e-7,  # Scaled to vary realistically across RPM (not flat)
        "lhv_diesel": 42800.0,
        "combustion_eff": 0.97,
        "exhaust_heat_fraction": 0.33,  # Prevents clamp saturation at 900C
        "thermo_weights": [
            [1.0, 0.9, 0.8, 0.3, 0.2, 0.1],
            [0.9, 1.0, 0.95, 0.5, 0.3, 0.2],
            [0.8, 0.95, 1.0, 0.6, 0.3, 0.2],
            [0.3, 0.5, 0.6, 1.0, 0.7, 0.3],
            [0.2, 0.3, 0.3, 0.7, 1.0, 0.5],
            [0.1, 0.2, 0.2, 0.3, 0.5, 1.0],
        ]
    }
}

