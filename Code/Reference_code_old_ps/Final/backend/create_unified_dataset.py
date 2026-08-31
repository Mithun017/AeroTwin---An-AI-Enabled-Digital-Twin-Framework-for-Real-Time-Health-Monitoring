"""
Create Unified LeakSense Twin Dataset
Combines all necessary data for easy model training with proper structure.
"""

import numpy as np
import pandas as pd
import sys
import os
from datetime import datetime, timedelta

# Fix console encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout.reconfigure(encoding='utf-8') if hasattr(sys.stdout, 'reconfigure') else None

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from data_generator import generate_healthy_sample, inject_leak, add_noise
from config import ZONE_NAMES, RAW_SENSOR_COLS

def create_comprehensive_dataset(n_healthy=5000, n_leak_per_zone=1000):
    """
    Create a comprehensive, well-structured dataset for training.

    Args:
        n_healthy: Number of healthy samples
        n_leak_per_zone: Number of leak samples per zone (5 zones × 3 severities)

    Returns:
        DataFrame with all features ready for ML training
    """

    print(f"\n{'='*70}")
    print("LeakSense Twin — Unified Dataset Generator")
    print(f"{'='*70}\n")

    all_samples = []

    # RPM range for Cat C18
    rpm_range = np.arange(1100, 2101, 100)  # 1100 to 2100 RPM

    # ═══════════════════════════════════════════════════════════════════
    # PART 1: Healthy Samples
    # ═══════════════════════════════════════════════════════════════════
    print(f"[1/2] Generating {n_healthy} HEALTHY samples...")

    for i in range(n_healthy):
        rpm = np.random.choice(rpm_range)
        ambient_var = np.random.uniform(-0.2, 0.2)

        sample = generate_healthy_sample(rpm, ambient_var)
        sample = add_noise(sample)

        # Add metadata
        sample['leak_flag'] = 0
        sample['leak_zone'] = 0
        sample['leak_zone_name'] = ZONE_NAMES[0]
        sample['leak_severity'] = 0
        sample['leak_severity_name'] = 'None'
        sample['flow_loss_pct'] = 0.0
        sample['sample_id'] = f"HEALTHY_{i+1:05d}"
        sample['timestamp'] = (datetime(2024, 1, 1) + timedelta(seconds=i*30)).isoformat()

        all_samples.append(sample)

        if (i + 1) % 1000 == 0:
            print(f"   [OK] {i+1}/{n_healthy} healthy samples generated")

    print(f"   [OK] Total healthy samples: {n_healthy}")

    # ═══════════════════════════════════════════════════════════════════
    # PART 2: Leak Samples (5 zones × 3 severities)
    # ═══════════════════════════════════════════════════════════════════
    print(f"\n[2/2] Generating LEAK samples...")

    leak_zones = [1, 2, 3, 4, 5]  # Zone 0 is healthy
    leak_severities = [
        (1, 'Small', 2.0),
        (2, 'Medium', 8.0),
        (3, 'Large', 15.0)
    ]

    leak_sample_id = 0

    for zone in leak_zones:
        for severity_code, severity_name, flow_loss in leak_severities:

            n_samples = n_leak_per_zone // 3  # Split equally among severities

            for i in range(n_samples):
                rpm = np.random.choice(rpm_range)
                ambient_var = np.random.uniform(-0.2, 0.2)

                sample = generate_healthy_sample(rpm, ambient_var)
                sample = inject_leak(sample, zone, severity_code)
                sample = add_noise(sample)

                # Add metadata
                sample['leak_flag'] = 1
                sample['leak_zone'] = zone
                sample['leak_zone_name'] = ZONE_NAMES[zone]
                sample['leak_severity'] = severity_code
                sample['leak_severity_name'] = severity_name
                sample['flow_loss_pct'] = flow_loss
                sample['sample_id'] = f"LEAK_Z{zone}_S{severity_code}_{i+1:04d}"
                sample['timestamp'] = (datetime(2024, 6, 1) + timedelta(seconds=leak_sample_id*30)).isoformat()

                all_samples.append(sample)
                leak_sample_id += 1

            print(f"   [OK] Zone {zone} ({ZONE_NAMES[zone]}), {severity_name}: {n_samples} samples")

    print(f"   [OK] Total leak samples: {leak_sample_id}")

    # ═══════════════════════════════════════════════════════════════════
    # PART 3: Create DataFrame with proper column order
    # ═══════════════════════════════════════════════════════════════════
    print(f"\n[3/3] Creating structured DataFrame...")

    df = pd.DataFrame(all_samples)

    # Define column order
    metadata_cols = ['sample_id', 'timestamp', 'leak_flag', 'leak_zone', 'leak_zone_name',
                     'leak_severity', 'leak_severity_name', 'flow_loss_pct']

    sensor_cols = ['RPM', 'MAF', 'MAP_intake', 'MAP_boost', 'MAP_cac_in', 'MAP_cac_out',
                   'T_intake', 'T_boost', 'T_cac_out', 'T_exh_manifold', 'T_dpf_in',
                   'T_dpf_out', 'fuel_qty', 'T_post_turbine', 'dP_dpf']

    # Reorder columns
    df = df[metadata_cols + sensor_cols]

    # Add derived features for convenience
    df['pressure_ratio'] = df['MAP_boost'] / 101.325
    df['cac_efficiency'] = (df['T_boost'] - df['T_cac_out']) / (df['T_boost'] - df['T_intake'] + 1e-8)
    df['exhaust_temp_ratio'] = df['T_exh_manifold'] / (df['T_cac_out'] + 273.15 + 1e-8)

    print(f"   [OK] DataFrame created with shape: {df.shape}")
    print(f"   [OK] Total columns: {len(df.columns)}")

    return df


def create_summary_sheet(df):
    """Create a summary statistics sheet."""

    summary_data = {
        'Metric': [
            'Total Samples',
            'Healthy Samples',
            'Leak Samples',
            'Zone 1 Leaks',
            'Zone 2 Leaks',
            'Zone 3 Leaks',
            'Zone 4 Leaks',
            'Zone 5 Leaks',
            'Small Severity',
            'Medium Severity',
            'Large Severity',
            'RPM Range',
            'MAF Range (kg/h)',
            'Boost Pressure Range (kPa)',
        ],
        'Value': [
            len(df),
            len(df[df['leak_flag'] == 0]),
            len(df[df['leak_flag'] == 1]),
            len(df[df['leak_zone'] == 1]),
            len(df[df['leak_zone'] == 2]),
            len(df[df['leak_zone'] == 3]),
            len(df[df['leak_zone'] == 4]),
            len(df[df['leak_zone'] == 5]),
            len(df[df['leak_severity'] == 1]),
            len(df[df['leak_severity'] == 2]),
            len(df[df['leak_severity'] == 3]),
            f"{df['RPM'].min():.0f} - {df['RPM'].max():.0f}",
            f"{df['MAF'].min():.1f} - {df['MAF'].max():.1f}",
            f"{df['MAP_boost'].min():.1f} - {df['MAP_boost'].max():.1f}",
        ]
    }

    return pd.DataFrame(summary_data)


def create_column_descriptions():
    """Create a data dictionary sheet."""

    descriptions = {
        'Column': [
            'sample_id', 'timestamp', 'leak_flag', 'leak_zone', 'leak_zone_name',
            'leak_severity', 'leak_severity_name', 'flow_loss_pct',
            'RPM', 'MAF', 'MAP_intake', 'MAP_boost', 'MAP_cac_in', 'MAP_cac_out',
            'T_intake', 'T_boost', 'T_cac_out', 'T_exh_manifold', 'T_dpf_in',
            'T_dpf_out', 'fuel_qty', 'T_post_turbine', 'dP_dpf',
            'pressure_ratio', 'cac_efficiency', 'exhaust_temp_ratio'
        ],
        'Description': [
            'Unique sample identifier',
            'ISO timestamp of sample',
            'Binary leak indicator (0=Healthy, 1=Leak)',
            'Leak zone number (0-5)',
            'Leak zone description',
            'Leak severity code (0=None, 1=Small, 2=Medium, 3=Large)',
            'Leak severity description',
            'Estimated flow loss percentage',
            'Engine speed (rpm)',
            'Mass air flow (kg/h)',
            'Intake manifold absolute pressure (kPa)',
            'Boost pressure post-compressor (kPa)',
            'Charge air cooler inlet pressure (kPa)',
            'Charge air cooler outlet pressure (kPa)',
            'Intake air temperature (°C)',
            'Boost temperature post-compressor (°C)',
            'Charge air cooler outlet temperature (°C)',
            'Exhaust manifold temperature (°C)',
            'DPF inlet temperature (°C)',
            'DPF outlet temperature (°C)',
            'Fuel injection quantity (mg/stroke)',
            'Post-turbine exhaust temperature (°C)',
            'DPF differential pressure (kPa)',
            'Compressor pressure ratio (dimensionless)',
            'Charge air cooler effectiveness (dimensionless)',
            'Exhaust/intake temperature ratio (dimensionless)'
        ],
        'Unit': [
            'string', 'ISO datetime', 'binary', 'int', 'string',
            'int', 'string', 'percent',
            'rpm', 'kg/h', 'kPa', 'kPa', 'kPa', 'kPa',
            '°C', '°C', '°C', '°C', '°C',
            '°C', 'mg/stroke', '°C', 'kPa',
            'ratio', 'efficiency', 'ratio'
        ],
        'Usage': [
            'Identifier', 'Metadata', 'Target (Binary)', 'Target (Zone)', 'Metadata',
            'Target (Severity)', 'Metadata', 'Metadata',
            'Feature', 'Feature', 'Feature', 'Feature', 'Feature', 'Feature',
            'Feature', 'Feature', 'Feature', 'Feature', 'Feature',
            'Feature', 'Feature', 'Feature', 'Feature',
            'Derived Feature', 'Derived Feature', 'Derived Feature'
        ]
    }

    return pd.DataFrame(descriptions)


if __name__ == "__main__":

    # Configuration
    N_HEALTHY = 5000
    N_LEAK_PER_ZONE = 1000  # Will be split into 3 severities

    # Get absolute path to Data directory
    BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJ_DIR = os.path.dirname(BACKEND_DIR)
    DATA_DIR = os.path.join(PROJ_DIR, 'Data')
    OUTPUT_FILE = os.path.join(DATA_DIR, 'LeakSense_Twin_Unified_Dataset.xlsx')

    # Ensure Data directory exists
    os.makedirs(DATA_DIR, exist_ok=True)

    # Create dataset
    print("\nStarting dataset generation...")
    df_main = create_comprehensive_dataset(n_healthy=N_HEALTHY, n_leak_per_zone=N_LEAK_PER_ZONE)

    # Create summary
    df_summary = create_summary_sheet(df_main)
    df_dictionary = create_column_descriptions()

    # ═══════════════════════════════════════════════════════════════════
    # Save to Excel with multiple sheets
    # ═══════════════════════════════════════════════════════════════════
    print(f"\n[SAVE] Writing to Excel file...")
    print(f"   → {OUTPUT_FILE}")

    with pd.ExcelWriter(OUTPUT_FILE, engine='openpyxl') as writer:
        # Sheet 1: Summary
        df_summary.to_excel(writer, sheet_name='Summary', index=False)

        # Sheet 2: Data Dictionary
        df_dictionary.to_excel(writer, sheet_name='Data Dictionary', index=False)

        # Sheet 3: Full Dataset
        df_main.to_excel(writer, sheet_name='Training Data', index=False)

        # Sheet 4: Healthy Samples Only
        df_healthy = df_main[df_main['leak_flag'] == 0]
        df_healthy.to_excel(writer, sheet_name='Healthy Samples', index=False)

        # Sheet 5: Leak Samples Only
        df_leak = df_main[df_main['leak_flag'] == 1]
        df_leak.to_excel(writer, sheet_name='Leak Samples', index=False)

        # Sheet 6: Per-Zone Statistics
        zone_stats = df_main.groupby('leak_zone_name').agg({
            'sample_id': 'count',
            'RPM': ['mean', 'std'],
            'MAF': ['mean', 'std'],
            'MAP_boost': ['mean', 'std'],
            'T_cac_out': ['mean', 'std'],
            'T_exh_manifold': ['mean', 'std']
        }).round(2)
        zone_stats.to_excel(writer, sheet_name='Zone Statistics')

    print(f"   [OK] Excel file saved successfully!")

    # ═══════════════════════════════════════════════════════════════════
    # Final Report
    # ═══════════════════════════════════════════════════════════════════
    print(f"\n{'='*70}")
    print("DATASET GENERATION COMPLETE!")
    print(f"{'='*70}\n")

    print("[INFO] Dataset Summary:")
    print(f"   • Total samples: {len(df_main):,}")
    print(f"   • Healthy samples: {len(df_healthy):,} ({len(df_healthy)/len(df_main)*100:.1f}%)")
    print(f"   • Leak samples: {len(df_leak):,} ({len(df_leak)/len(df_main)*100:.1f}%)")
    print(f"   • Features: {len(df_main.columns)} columns")
    print(f"   • Zones covered: 6 (including healthy)")
    print(f"   • Severity levels: 4 (none, small, medium, large)")

    print(f"\n[INFO] File Location:")
    print(f"   {OUTPUT_FILE}")

    print(f"\n[INFO] Excel Sheets:")
    print(f"   1. Summary — Dataset statistics")
    print(f"   2. Data Dictionary — Column descriptions")
    print(f"   3. Training Data — Full dataset ({len(df_main):,} rows)")
    print(f"   4. Healthy Samples — Only healthy data ({len(df_healthy):,} rows)")
    print(f"   5. Leak Samples — Only leak data ({len(df_leak):,} rows)")
    print(f"   6. Zone Statistics — Per-zone aggregated stats")

    print(f"\n[READY] Ready for ML Training!")
    print(f"   Use 'Training Data' sheet for model training")
    print(f"   Split: 80% train, 20% test recommended")
    print(f"   Target columns: 'leak_flag' (binary), 'leak_zone' (multiclass)")

    print(f"\n{'='*70}\n")
