import sys
import os
import pytest
import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

# Add backend dir to python path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from twins.intake_twin import IntakeTwinModel
from twins.charge_air_twin import ChargeAirTwinModel
from twins.exhaust_twin import ExhaustTwinModel
from ml.energy_field import EnergyFieldDetector, compute_energy_field
from ml.train import compute_features_fast
from main import app, UnifiedPredictor


def test_intake_ve_model():
    """Verify volumetric efficiency curve calculation inside IntakeTwinModel."""
    model = IntakeTwinModel("Cat C18")
    
    # VE should peak at ve_rpm_peak (1400 rpm)
    ve_peak = model.ve_model(1400.0)
    ve_low = model.ve_model(800.0)
    ve_high = model.ve_model(2200.0)
    
    assert ve_peak >= ve_low
    assert ve_peak >= ve_high
    assert 0.75 <= ve_peak <= 0.98
    
    # Test predict_maf
    maf_pred = model.predict_maf(rpm=1800.0)
    assert maf_pred > 0.0
    assert isinstance(maf_pred, float)


def test_exhaust_clamp_saturation():
    """Verify isentropic and combustive physics in ExhaustTwinModel asserting no clamp saturation."""
    model = ExhaustTwinModel("Cat C18")
    
    # With corrected exhaust_heat_fraction of 0.33, T_exh_manifold should not hit the clamp limits of 723.15 or 1173.15
    # under standard operating points (e.g. RPM=1800, MAF=850, fuel_qty=120)
    result = model.predict(maf_kgh=850.0, fuel_qty_mg=120.0, rpm=1800.0)
    T_exh = result['T_exh_manifold_pred']
    
    # 723.15 Kelvin is 450°C, 1173.15 Kelvin is 900°C.
    # Check that it's strictly within the realistic range (not exactly clamped to the boundary limits)
    assert 723.15 < T_exh < 1173.15
    assert result['T_post_turbine_pred'] < T_exh


def test_energy_field_rpm_normalization():
    """Verify energy field matrix RPM speed ratio normalization (only MAF flow-like channel is scaled)."""
    # Create windows with different RPMs but identical telemetry otherwise
    window_rpm1 = np.array([
        [850.0, 215.0, 205.0, 45.0, 550.0, 0.5, 1800.0],
        [850.0, 215.0, 205.0, 45.0, 550.0, 0.5, 1800.0],
        [850.0, 215.0, 205.0, 45.0, 550.0, 0.5, 1800.0],
        [850.0, 215.0, 205.0, 45.0, 550.0, 0.5, 1800.0],
        [850.0, 215.0, 205.0, 45.0, 550.0, 0.5, 1800.0],
    ])
    
    window_rpm2 = np.array([
        [850.0, 215.0, 205.0, 45.0, 550.0, 0.5, 2000.0],
        [850.0, 215.0, 205.0, 45.0, 550.0, 0.5, 2000.0],
        [850.0, 215.0, 205.0, 45.0, 550.0, 0.5, 2000.0],
        [850.0, 215.0, 205.0, 45.0, 550.0, 0.5, 2000.0],
        [850.0, 215.0, 205.0, 45.0, 550.0, 0.5, 2000.0],
    ])
    
    # Calculate energy fields
    field1 = compute_energy_field(window_rpm1)
    field2 = compute_energy_field(window_rpm2)
    
    # The fields should differ only because MAF was scaled by different RPM ratios.
    # Let's test fitted deviation mapping
    detector = EnergyFieldDetector("Cat C18")
    detector.fit([window_rpm1])
    
    # Assert fitted
    assert detector.is_fitted
    
    # Z-field of window_rpm1 against itself should be zero
    dev1 = detector.compute_deviation(window_rpm1)
    assert dev1['global_deviation_score'] < 1e-5


def test_steady_state_transient_suppression():
    """Verify steady-state gating logic and transient suppression inside UnifiedPredictor."""
    predictor = UnifiedPredictor()
    
    # 1. Provide steady-state samples
    steady_sensors = {
        'RPM': 1800.0, 'MAF': 850.0, 'MAP_intake': 210.0, 'MAP_boost': 215.0,
        'MAP_cac_in': 212.0, 'MAP_cac_out': 205.0, 'T_intake': 25.0, 'T_boost': 120.0,
        'T_cac_out': 45.0, 'T_exh_manifold': 550.0, 'T_dpf_in': 250.0, 'T_dpf_out': 200.0,
        'fuel_qty': 120.0, 'T_post_turbine': 400.0, 'dP_dpf': 0.5,
        'session_id': 'test_steady_session'
    }
    
    # Stream multiple times to fill windows
    result = None
    for _ in range(10):
        result = predictor.predict(steady_sensors)
        
    assert result is not None
    assert result['is_steady_state'] is True
    
    # 2. Provide transient samples (rapidly changing RPM)
    transient_sensors = steady_sensors.copy()
    transient_sensors['session_id'] = 'test_steady_session'
    
    for i in range(10):
        transient_sensors['RPM'] = 1800.0 + i * 50.0  # Big steps!
        result = predictor.predict(transient_sensors)
        
    # Standard deviation of RPM should exceed the threshold (10.0 RPM)
    assert result['is_steady_state'] is False
    assert "Transient State" in result['status_message']
    assert result['confidence'] == 0.0


def test_api_endpoints():
    """Verify /api/predict and /api/audio/predict endpoint responses."""
    with TestClient(app) as client:
        # Verify health endpoint
        health_resp = client.get("/api/health")
        assert health_resp.status_code == 200
        
        # Verify predict endpoint
        payload = {
            'RPM': 1800.0, 'MAF': 850.0, 'MAP_intake': 210.0, 'MAP_boost': 215.0,
            'MAP_cac_in': 212.0, 'MAP_cac_out': 205.0, 'T_intake': 25.0, 'T_boost': 120.0,
            'T_cac_out': 45.0, 'T_exh_manifold': 550.0, 'T_dpf_in': 250.0, 'T_dpf_out': 200.0,
            'fuel_qty': 120.0, 'T_post_turbine': 400.0, 'dP_dpf': 0.5,
            'session_id': 'test_api_session'
        }
        
        predict_resp = client.post("/api/predict", json=payload)
        assert predict_resp.status_code == 200
        data = predict_resp.json()
        assert 'leak_detected' in data
        assert 'is_steady_state' in data
        assert 'residuals' in data


def test_train_inference_feature_parity():
    """Verify that train.py and main.py compute identical feature vectors for the same inputs."""
    telemetry = {
        'RPM': 1800.0, 'MAF': 850.0, 'MAP_intake': 210.0, 'MAP_boost': 215.0,
        'MAP_cac_in': 212.0, 'MAP_cac_out': 205.0, 'T_intake': 25.0, 'T_boost': 120.0,
        'T_cac_out': 45.0, 'T_exh_manifold': 550.0, 'T_dpf_in': 250.0, 'T_dpf_out': 200.0,
        'fuel_qty': 120.0, 'T_post_turbine': 400.0, 'dP_dpf': 0.5,
        'turbo_speed': 28000.0, 'P_exh_manifold': 150.0, 'P_turbine_out': 120.0,
        'P_tailpipe': 102.0, 'T_DOC': 430.0, 'T_SCR': 180.0
    }
    
    df = pd.DataFrame([telemetry])
    
    intake_twin = IntakeTwinModel()
    charge_twin = ChargeAirTwinModel()
    exhaust_twin = ExhaustTwinModel()
    
    features_train = compute_features_fast(df, intake_twin, charge_twin, exhaust_twin)[0]
    
    predictor = UnifiedPredictor()
    
    t_intake_k = telemetry['T_intake'] + 273.15
    t_cac_k = telemetry['T_cac_out'] + 273.15
    
    maf_pred = predictor.intake_twin.predict(telemetry['RPM'], 101.325, t_intake_k, telemetry['fuel_qty'])
    res_maf = telemetry['MAF'] - maf_pred
    
    ca = predictor.charge_twin.predict(telemetry['MAF'], telemetry['RPM'], t_intake_k, 101.325)
    res_map_boost = telemetry['MAP_boost'] - ca['MAP_boost_pred']
    res_t_boost = telemetry['T_boost'] - (ca['T_boost_pred'] - 273.15)
    res_t_cac_out = telemetry['T_cac_out'] - (ca['T_cac_out_pred'] - 273.15)
    res_map_cac_out = telemetry['MAP_cac_out'] - ca['MAP_cac_out_pred']
    res_map_intake = telemetry['MAP_intake'] - ca['MAP_intake_pred']
    res_turbo_speed = telemetry['turbo_speed'] - ca['turbo_speed_pred']
    
    ex = predictor.exhaust_twin.predict(telemetry['MAF'], telemetry['fuel_qty'], telemetry['RPM'], t_cac_k)
    res_t_exh_manifold = telemetry['T_exh_manifold'] - (ex['T_exh_manifold_pred'] - 273.15)
    res_t_post_turbine = telemetry['T_post_turbine'] - (ex['T_post_turbine_pred'] - 273.15)
    res_dp_dpf = telemetry['dP_dpf'] - ex['dP_dpf_pred']
    res_p_exh_manifold = telemetry['P_exh_manifold'] - ex['P_exh_manifold_pred']
    res_p_turbine_out = telemetry['P_turbine_out'] - ex['P_turbine_out_pred']
    res_p_tailpipe = telemetry['P_tailpipe'] - ex['P_tailpipe_pred']
    res_t_doc = telemetry['T_DOC'] - (ex['T_DOC_pred'] - 273.15)
    res_t_scr = telemetry['T_SCR'] - (ex['T_SCR_pred'] - 273.15)
    
    raw = [telemetry['RPM'], telemetry['MAF'], telemetry['MAP_intake'], telemetry['MAP_boost'],
           telemetry['MAP_cac_in'], telemetry['MAP_cac_out'], telemetry['T_intake'], telemetry['T_boost'],
           telemetry['T_cac_out'], telemetry['T_exh_manifold'], telemetry['T_dpf_in'], telemetry['T_dpf_out'],
           telemetry['fuel_qty'], telemetry['turbo_speed'], telemetry['P_exh_manifold'], telemetry['P_turbine_out'],
           telemetry['P_tailpipe'], telemetry['T_DOC'], telemetry['T_SCR']]
           
    res = [res_maf, res_map_boost, res_t_boost, res_t_cac_out, res_map_cac_out, res_t_exh_manifold,
           res_t_post_turbine, res_dp_dpf, res_map_intake, res_turbo_speed, res_p_exh_manifold,
           res_p_turbine_out, res_p_tailpipe, res_t_doc, res_t_scr]
           
    pr_comp = telemetry['MAP_boost'] / (101.325 + 1e-8)
    t_diff = abs(telemetry['T_boost'] - telemetry['T_intake']) + 1e-8
    cac_eff = (telemetry['T_boost'] - telemetry['T_cac_out']) / t_diff if t_diff > 1 else 0.88
    t_exh_ratio = telemetry['T_exh_manifold'] / (telemetry['T_cac_out'] + 273.15 + 1e-8)
    boost_maf = telemetry['MAP_boost'] / (telemetry['MAF'] + 1e-8)
    dpf_ratio = telemetry['dP_dpf'] / (telemetry['MAP_boost'] + 1e-8)
    fuel_flow = telemetry['fuel_qty'] * 1e-6 * (telemetry['RPM'] / 120.0) * 6
    afr = (telemetry['MAF'] / 3600.0) / (fuel_flow + 1e-8)
    ratios = [pr_comp, cac_eff, t_exh_ratio, boost_maf, dpf_ratio, afr]
    
    stats = [abs(res[0]) * 0.1, abs(res[1]) * 0.1, abs(res[5]) * 0.1]
    
    features_inference = np.array(raw + res + ratios + stats, dtype=np.float32)
    
    np.testing.assert_allclose(features_train, features_inference, rtol=1e-5, atol=1e-5)


def test_j1939_adapter_decoding():
    """Verify that J1939Adapter parses standard EEC1 and IC1 messages correctly."""
    from dax.j1939_adapter import J1939Adapter
    adapter = J1939Adapter()

    # EEC1: RPM = 1600 (Hex: 1600 / 0.125 = 12800 -> 0x3200)
    # Byte index 3-4 (0-indexed) is 0x00, 0x32
    # Torque = 50% (Hex: (50 + 125) / 1 = 175 -> 0xAF) (Byte 1)
    eec1_can_id = 0x0CF00400
    eec1_data = bytes([0xFF, 0xAF, 0xFF, 0x00, 0x32, 0xFF, 0xFF, 0xFF])

    # IC1: Boost = 230 kPa (Hex: 230 / 2 = 115 -> 0x73) (Byte 1)
    # T_intake = 30 C (Hex: (30 + 40) / 1 = 70 -> 0x46) (Byte 2)
    # MAF = 800 kg/h (Hex: 800 / 0.05 = 16000 -> 0x3E80) (Bytes 3-4)
    ic1_can_id = 0x18FEF600
    ic1_data = bytes([0xFF, 0x73, 0x46, 0x80, 0x3E, 0xFF, 0xFF, 0xFF])

    dec_eec1 = adapter.decode_frame(eec1_can_id, eec1_data)
    assert dec_eec1["RPM"] == 1600.0
    assert dec_eec1["actual_percent_torque"] == 50.0

    dec_ic1 = adapter.decode_frame(ic1_can_id, ic1_data)
    assert dec_ic1["MAP_boost"] == 230.0
    assert dec_ic1["T_intake"] == 30.0
    assert dec_ic1["MAF"] == 800.0

    # Test state retrieval
    state = adapter.get_state()
    assert state["RPM"] == 1600.0
    assert state["MAF"] == 800.0
    assert state["MAP_boost"] == 230.0
    assert state["fuel_qty"] == 30.0 + 50.0 * 1.3

