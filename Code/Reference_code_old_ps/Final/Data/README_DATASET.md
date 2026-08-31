# LeakSense Twin — Unified Dataset Documentation

## Overview

**File**: `LeakSense_Twin_Unified_Dataset.xlsx` (5.36 MB)  
**Created**: June 9, 2026  
**Total Samples**: 9,995  
**Purpose**: Comprehensive training dataset for Cat C18 diesel engine leak detection and localization

---

## Dataset Summary

| Metric | Value |
|--------|-------|
| **Total Samples** | 9,995 |
| **Healthy Samples** | 5,000 (50.0%) |
| **Leak Samples** | 4,995 (50.0%) |
| **Leak Zones** | 5 zones |
| **Severity Levels** | 3 levels (Small, Medium, Large) |
| **Features** | 26 columns |
| **RPM Range** | 1100-2100 rpm |
| **Sensors** | 15 channels |

---

## Excel Sheet Structure

The dataset contains **6 sheets** for different use cases:

### 1. Summary
- **Purpose**: Quick overview of dataset statistics
- **Rows**: 14
- **Columns**: Metric, Value
- **Contents**: Sample counts, zone distribution, sensor ranges

### 2. Data Dictionary
- **Purpose**: Complete column descriptions and metadata
- **Rows**: 26 (one per column)
- **Columns**: Column, Description, Unit, Usage
- **Use**: Reference guide for understanding each feature

### 3. Training Data ⭐ **PRIMARY SHEET FOR ML**
- **Purpose**: Complete dataset ready for model training
- **Rows**: 9,995
- **Columns**: 26
- **Contents**: All samples (healthy + leak) with metadata and sensor readings
- **Recommended Split**: 80% train (7,996 samples), 20% test (1,999 samples)

### 4. Healthy Samples
- **Purpose**: Baseline healthy engine data only
- **Rows**: 5,000
- **Columns**: 26
- **Use**: Analyzing normal operating patterns, calibrating digital twins

### 5. Leak Samples
- **Purpose**: All fault samples for analysis
- **Rows**: 4,995
- **Columns**: 26
- **Use**: Leak pattern analysis, severity distribution studies

### 6. Zone Statistics
- **Purpose**: Aggregated statistics per leak zone
- **Rows**: 6 zones + 2 header rows
- **Columns**: 12 (mean and std for key sensors)
- **Use**: Understanding zone-specific sensor signatures

---

## Column Description

### Metadata Columns (8)

| Column | Type | Description | Example Values |
|--------|------|-------------|---------------|
| `sample_id` | string | Unique sample identifier | `HEALTHY_00001`, `LEAK_Z2_S1_0042` |
| `timestamp` | datetime | ISO timestamp | `2024-01-01T00:00:00` |
| `leak_flag` | binary | Leak indicator (0=Healthy, 1=Leak) | 0, 1 |
| `leak_zone` | int | Zone number (0-5) | 0, 1, 2, 3, 4, 5 |
| `leak_zone_name` | string | Zone description | `Zone 3 — CAC/Manifold` |
| `leak_severity` | int | Severity code (0-3) | 0, 1, 2, 3 |
| `leak_severity_name` | string | Severity description | `None`, `Small`, `Medium`, `Large` |
| `flow_loss_pct` | float | Estimated flow loss % | 0.0, 2.0, 8.0, 15.0 |

### Raw Sensor Columns (15)

| Column | Unit | Description | Typical Range |
|--------|------|-------------|---------------|
| `RPM` | rpm | Engine speed | 1100-2100 |
| `MAF` | kg/h | Mass air flow | 400-1200 |
| `MAP_intake` | kPa | Intake manifold pressure | 180-250 |
| `MAP_boost` | kPa | Boost pressure (post-compressor) | 200-350 |
| `MAP_cac_in` | kPa | CAC inlet pressure | 200-350 |
| `MAP_cac_out` | kPa | CAC outlet pressure | 195-345 |
| `T_intake` | °C | Intake air temperature | 20-30 |
| `T_boost` | °C | Boost temperature | 80-180 |
| `T_cac_out` | °C | CAC outlet temperature | 35-70 |
| `T_exh_manifold` | °C | Exhaust manifold temperature | 450-850 |
| `T_dpf_in` | °C | DPF inlet temperature | 150-400 |
| `T_dpf_out` | °C | DPF outlet temperature | 100-350 |
| `fuel_qty` | mg/stroke | Fuel injection quantity | 60-160 |
| `T_post_turbine` | °C | Post-turbine temperature | 300-600 |
| `dP_dpf` | kPa | DPF differential pressure | 0.2-3.0 |

### Derived Feature Columns (3)

| Column | Type | Description | Formula |
|--------|------|-------------|---------|
| `pressure_ratio` | float | Compressor pressure ratio | `MAP_boost / 101.325` |
| `cac_efficiency` | float | CAC effectiveness | `(T_boost - T_cac_out) / (T_boost - T_intake)` |
| `exhaust_temp_ratio` | float | Exhaust/intake temperature ratio | `T_exh_manifold / (T_cac_out + 273.15)` |

---

## Leak Zone Definitions

### Zone 0 — No Leak / Healthy
- **Samples**: 5,000
- **Description**: Normal engine operation, no leaks
- **Characteristics**: All sensors within expected ranges

### Zone 1 — Intake
- **Location**: Airflow meter → Compressor inlet
- **Samples**: 999 (333 small, 333 medium, 333 large)
- **Signature**: Low MAF, normal boost pressure
- **Flow Loss**: 2%, 8%, 15%

### Zone 2 — Charge Air
- **Location**: Post-compressor → CAC inlet
- **Samples**: 999
- **Signature**: High boost temp, low CAC outlet pressure
- **Flow Loss**: 2%, 8%, 15%

### Zone 3 — CAC/Manifold
- **Location**: CAC → Intake manifold
- **Samples**: 999
- **Signature**: Normal CAC temps, low intake manifold pressure
- **Flow Loss**: 2%, 8%, 15%

### Zone 4 — Exhaust Manifold
- **Location**: Manifold → Turbo turbine
- **Samples**: 999
- **Signature**: Low exhaust temps, reduced turbine drive
- **Flow Loss**: 2%, 8%, 15%

### Zone 5 — DPF/SCR
- **Location**: Aftertreatment system
- **Samples**: 999
- **Signature**: High DPF differential pressure, abnormal post-DPF temps
- **Flow Loss**: 2%, 8%, 15%

---

## Data Generation Method

### Physics-Based Synthetic Data

The dataset was generated using **validated thermodynamic models** for the Cat C18 diesel engine:

1. **Healthy Baseline**: Generated using:
   - Mass continuity equations
   - Compressor maps (pressure ratio vs corrected flow)
   - CAC heat exchanger model (ε-NTU method)
   - Combustion thermodynamics (first law)
   - Isentropic turbine expansion
   - DPF back-pressure model

2. **Leak Injection**: Applied zone-specific modifications:
   - **Zone 1**: Reduce MAF by severity %
   - **Zone 2**: Reduce boost pressure, increase boost temp
   - **Zone 3**: Reduce intake manifold pressure
   - **Zone 4**: Reduce exhaust temps and turbine inlet pressure
   - **Zone 5**: Increase DPF back-pressure

3. **Noise Model**: Gaussian noise added to simulate sensor uncertainty:
   - Pressure sensors: σ = 0.5% of reading
   - Temperature sensors: σ = 1.0% of reading
   - Flow sensors: σ = 1.5% of reading

---

## How to Use for ML Training

### Quick Start with Python/Pandas

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Load training data
df = pd.read_excel('LeakSense_Twin_Unified_Dataset.xlsx', 
                   sheet_name='Training Data')

# Separate features and targets
metadata_cols = ['sample_id', 'timestamp', 'leak_flag', 'leak_zone', 
                 'leak_zone_name', 'leak_severity', 'leak_severity_name', 
                 'flow_loss_pct']

feature_cols = [col for col in df.columns if col not in metadata_cols]

X = df[feature_cols].values
y_binary = df['leak_flag'].values       # Binary classification (leak vs healthy)
y_zone = df['leak_zone'].values         # Multi-class (6 zones)
y_severity = df['leak_severity'].values # Multi-class (4 severity levels)

# Train-test split (80/20)
X_train, X_test, y_train, y_test = train_test_split(
    X, y_binary, test_size=0.2, random_state=42, stratify=y_binary
)

# Normalize features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

print(f"Training samples: {X_train.shape[0]}")
print(f"Test samples: {X_test.shape[0]}")
print(f"Features: {X_train.shape[1]}")
```

### Recommended Training Approach

#### Task 1: Binary Leak Detection
```python
# Target: leak_flag (0 or 1)
# Recommended models:
# - Random Forest
# - Gradient Boosting
# - Neural Network (LeakSenseNet architecture)
# - Ensemble of above
```

#### Task 2: Zone Localization
```python
# Target: leak_zone (0-5)
# Train only on leak samples (leak_flag == 1)
# Recommended models:
# - Random Forest Classifier
# - Multi-class Neural Network
# - XGBoost
```

#### Task 3: Severity Estimation
```python
# Target: leak_severity (0-3) or flow_loss_pct (continuous)
# Recommended models:
# - Regression: SVR, Random Forest Regressor
# - Classification: Multi-class Softmax NN
```

---

## Data Quality & Validation

### Quality Checks Performed

✅ **No missing values**: All 9,995 samples complete  
✅ **No duplicates**: Each sample_id is unique  
✅ **Balanced classes**: 50/50 split healthy/leak  
✅ **Even zone distribution**: ~1000 samples per leak zone  
✅ **Realistic sensor ranges**: Based on Cat C18 specifications  
✅ **Physical consistency**: All samples pass thermodynamic validation  

### Known Limitations

⚠️ **Synthetic Data**: Generated from physics models, not real test cell recordings  
⚠️ **Steady-State Only**: Does not include transient dynamics  
⚠️ **Idealized Conditions**: Ambient conditions limited to ±0.2 variation factor  
⚠️ **No Multi-Zone Leaks**: Each leak sample has only one active zone  

---

## Comparison with Other Datasets

| File | Samples | Leak Zones | Features | Use Case |
|------|---------|------------|----------|----------|
| `diesel_engine_leak_dataset.xlsx` | ~1,000 | 3 | 16 | Initial prototyping |
| `LeakSense_Twin_Dataset.xlsx` | ~8,000 | 5 | 42 | Full system (raw format) |
| `LeakSense_Twin_Dataset_v2.xlsx` | ~10,000 | 5 | 42 | Enhanced version |
| **`LeakSense_Twin_Unified_Dataset.xlsx`** ⭐ | **9,995** | **5** | **26** | **Ready-to-train format** |

### Why Use the Unified Dataset?

1. ✅ **Clean Structure**: No unnamed columns or confusing headers
2. ✅ **Ready to Use**: No preprocessing needed
3. ✅ **Multiple Sheets**: Separate views for different analyses
4. ✅ **Complete Documentation**: Data dictionary included
5. ✅ **Derived Features**: Key ratios pre-calculated
6. ✅ **Proper Labeling**: Clear target columns for all ML tasks

---

## Sample Code Examples

### Example 1: Load and Explore

```python
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load dataset
df = pd.read_excel('LeakSense_Twin_Unified_Dataset.xlsx', 
                   sheet_name='Training Data')

# View first few rows
print(df.head())

# Check class distribution
print(df['leak_flag'].value_counts())
print(df['leak_zone_name'].value_counts())

# Visualize sensor distribution by leak status
fig, axes = plt.subplots(2, 3, figsize=(15, 10))
sensors = ['RPM', 'MAF', 'MAP_boost', 'T_cac_out', 'T_exh_manifold', 'dP_dpf']

for ax, sensor in zip(axes.flat, sensors):
    df.boxplot(column=sensor, by='leak_flag', ax=ax)
    ax.set_title(f'{sensor} by Leak Status')

plt.tight_layout()
plt.show()
```

### Example 2: Train RandomForest Binary Classifier

```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix

# Prepare data (use code from Quick Start above)

# Train model
rf = RandomForestClassifier(n_estimators=100, max_depth=12, 
                            class_weight='balanced', random_state=42)
rf.fit(X_train_scaled, y_train)

# Evaluate
y_pred = rf.predict(X_test_scaled)
print(classification_report(y_test, y_pred, 
                           target_names=['Healthy', 'Leak']))
print(confusion_matrix(y_test, y_pred))

# Feature importance
feature_importance = pd.DataFrame({
    'feature': feature_cols,
    'importance': rf.feature_importances_
}).sort_values('importance', ascending=False)

print(feature_importance.head(10))
```

### Example 3: Zone Localization (Multi-Class)

```python
from sklearn.ensemble import GradientBoostingClassifier

# Filter only leak samples
df_leak = df[df['leak_flag'] == 1]
X_leak = df_leak[feature_cols].values
y_leak_zone = df_leak['leak_zone'].values

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X_leak, y_leak_zone, test_size=0.2, random_state=42, stratify=y_leak_zone
)

# Scale
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train
gb = GradientBoostingClassifier(n_estimators=100, max_depth=6, 
                                learning_rate=0.1, random_state=42)
gb.fit(X_train_scaled, y_train)

# Evaluate
y_pred = gb.predict(X_test_scaled)
print(classification_report(y_test, y_pred, 
                           target_names=[f'Zone {i}' for i in range(6)]))
```

---

## Integration with LeakSense Twin System

### Loading in Backend (`data_generator.py`)

The dataset can be used to pre-train models instead of generating synthetic data:

```python
# In ml/train.py
import pandas as pd

# Option 1: Use existing synthetic generator (default)
from data_generator import create_training_dataset
df_train, df_test = create_training_dataset()

# Option 2: Load from unified dataset
df = pd.read_excel('../Data/LeakSense_Twin_Unified_Dataset.xlsx', 
                   sheet_name='Training Data')
# Split and proceed with training...
```

### DAX Analytics Integration

The dataset is automatically loaded by the DAX engine for analytics:

```python
# In dax/engine.py
dataset_path = os.path.join(DATA_DIR, 'LeakSense_Twin_Unified_Dataset.xlsx')
df_ext = pd.read_excel(dataset_path, sheet_name='Training Data')
conn.register('df_ext', df_ext)
conn.execute("CREATE TABLE LeakSense_Dataset AS SELECT * FROM df_ext")
```

---

## Regenerating the Dataset

To regenerate with different parameters:

```bash
cd backend
python create_unified_dataset.py

# Edit the script to change:
# - N_HEALTHY (default: 5000)
# - N_LEAK_PER_ZONE (default: 1000)
# - RPM range
# - Noise levels
```

---

## Contact & Support

For questions about this dataset:
- **Project**: LeakSense Twin
- **Engine**: Caterpillar C18 DITA
- **Created**: 2026-06-09
- **Version**: 1.0

---

## Change Log

### v1.0 (2026-06-09)
- Initial release
- 9,995 samples (5,000 healthy + 4,995 leak)
- 5 leak zones × 3 severity levels
- 26 features (15 raw sensors + 8 metadata + 3 derived)
- 6 Excel sheets for different use cases

---

**Last Updated**: June 9, 2026
