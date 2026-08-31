"""
AeroTwin — Zone 2: Charge Air System Digital Twin
Physics: Turbocharger compressor map + CAC heat exchanger model.
Predicts: MAP_boost, T_boost, T_cac_out, MAP_cac_out, MAP_intake
"""

import numpy as np
import joblib


class ChargeAirTwinModel:
    """
    Physics-based Charge Air Zone Digital Twin for Cat C18.
    Models: Compressor map → boost pressure → CAC cooling → manifold pressure.
    """

    def __init__(self, engine_profile: str = "Cat C18"):
        """Initialize compressor map polynomial coefficients."""
        from config import ENGINE_PROFILES
        self.engine_profile_name = engine_profile
        profile = ENGINE_PROFILES[engine_profile]
        
        self.gamma = profile["gamma"]
        self.turbo_eff_compressor = profile["turbo_eff_compressor"]
        self.cac_effectiveness = profile["cac_effectiveness"]
        self.r_air = profile["r_air"]
        
        # Fitted from GT-Power simulation of Cat C18 compressor
        # PR = c00 + c10*Q_corr + c01*N_corr + c20*Q_corr² + c11*Q_corr*N_corr + c02*N_corr²
        self.compressor_coeffs = {
            'c00': 1.0,
            'c10': 0.0015,
            'c01': 0.0008,
            'c20': -2.0e-7,
            'c11': 5.0e-8,
            'c02': -1.5e-8,
        }
        self.correction_boost = 1.0
        self.correction_temp = 1.0

    def compressor_map(self, corrected_flow: float, corrected_speed: float) -> float:
        """
        Simplified compressor map returning pressure ratio.
        Based on polynomial surface fit to C18 compressor data.
        """
        c = self.compressor_coeffs
        Q = corrected_flow
        N = corrected_speed
        PR = (c['c00'] + c['c10'] * Q + c['c01'] * N +
              c['c20'] * Q**2 + c['c11'] * Q * N + c['c02'] * N**2)
        return np.clip(PR, 1.0, 4.5)

    def cac_pressure_drop(self, maf_kgh: float) -> float:
        """
        CAC pressure drop via Darcy-Weisbach approximation.
        dP proportional to mass_flow² — calibrated for C18 CAC geometry.
        """
        return 0.0012 * (maf_kgh / 100.0) ** 2

    def predict(self, maf_actual: float, rpm: float,
                t_ambient_k: float = 298.15,
                map_ambient: float = 101.325) -> dict:
        """
        Predict charge air system state.

        Returns dict with: MAP_boost_pred, T_boost_pred, T_cac_out_pred,
                          MAP_cac_out_pred, MAP_intake_pred
        """
        # Corrected flow and speed for compressor map
        corrected_flow = maf_actual * np.sqrt(t_ambient_k / 288.15) / (map_ambient / 101.325)
        corrected_speed = rpm / np.sqrt(t_ambient_k / 288.15)

        # Pressure ratio from compressor map
        PR = self.compressor_map(corrected_flow, corrected_speed)

        # Boost pressure
        map_boost = PR * map_ambient * self.correction_boost

        # Compressor outlet temperature (isentropic + efficiency)
        T_boost = t_ambient_k * (1.0 + (PR ** ((self.gamma - 1) / self.gamma) - 1.0)
                                  / self.turbo_eff_compressor)

        # CAC heat exchanger — temperature drop
        T_cac_out = T_boost - self.cac_effectiveness * (T_boost - t_ambient_k)
        T_cac_out *= self.correction_temp

        # Pressure after CAC (small pressure drop)
        MAP_cac_out = map_boost - self.cac_pressure_drop(maf_actual)

        # Intake manifold pressure (slight additional loss)
        MAP_intake = MAP_cac_out - 1.5  # ~1.5 kPa manifold runner loss

        # Turbo speed prediction (NEW - optional)
        # Turbo speed scales with engine RPM and boost pressure ratio
        turbo_speed_pred = rpm * 15.0 * np.sqrt(map_boost / map_ambient)
        turbo_speed_pred = np.clip(turbo_speed_pred, 20000, 140000)

        return {
            'MAP_boost_pred': float(map_boost),
            'T_boost_pred': float(T_boost),
            'T_cac_out_pred': float(T_cac_out),
            'MAP_cac_out_pred': float(MAP_cac_out),
            'MAP_intake_pred': float(MAP_intake),
            'turbo_speed_pred': float(turbo_speed_pred),  # NEW
        }

    def compute_residuals(self, actual: dict, predicted: dict) -> dict:
        """Compute residuals between actual and predicted values."""
        residuals = {}
        for key in predicted:
            actual_key = key.replace('_pred', '')
            if actual_key in actual:
                residuals[f'res_{actual_key}'] = actual[actual_key] - predicted[key]
        return residuals

    def update_online(self, actual_boost: float, predicted_boost: float,
                      actual_temp: float, predicted_temp: float,
                      alpha: float = 0.01):
        """Online learning via EWA for drift compensation."""
        if predicted_boost > 0:
            ratio_b = actual_boost / predicted_boost
            self.correction_boost = (1 - alpha) * self.correction_boost + alpha * ratio_b
        if predicted_temp > 0:
            ratio_t = actual_temp / predicted_temp
            self.correction_temp = (1 - alpha) * self.correction_temp + alpha * ratio_t

    def save(self, path: str):
        joblib.dump(self, path)

    @staticmethod
    def load(path: str) -> 'ChargeAirTwinModel':
        return joblib.load(path)
