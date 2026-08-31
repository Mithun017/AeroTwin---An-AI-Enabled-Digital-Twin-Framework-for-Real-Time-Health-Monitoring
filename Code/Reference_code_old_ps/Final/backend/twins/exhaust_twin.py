"""
AeroTwin — Zone 3: Exhaust Digital Twin
Physics: Energy balance — predicts exhaust temperatures and back-pressure.
"""

import numpy as np
import joblib


class ExhaustTwinModel:
    """
    Physics-based Exhaust Zone Digital Twin for Cat C18.
    Models: Combustion → exhaust manifold → turbine expansion → aftertreatment.
    """

    def __init__(self, engine_profile: str = "Cat C18"):
        """Initialize exhaust model parameters."""
        from config import ENGINE_PROFILES, MAP_AMBIENT
        self.engine_profile_name = engine_profile
        profile = ENGINE_PROFILES[engine_profile]

        self.n_cylinders = profile["n_cylinders"]
        self.cp_air = profile["cp_air"]
        self.gamma = profile["gamma"]
        self.turbo_eff_turbine = profile["turbo_eff_turbine"]
        self.lhv_diesel = profile["lhv_diesel"]
        self.combustion_eff = profile["combustion_eff"]
        self.exhaust_heat_fraction = profile["exhaust_heat_fraction"]
        self.map_ambient = MAP_AMBIENT

        self.correction_t_exh = 1.0
        self.correction_dp = 1.0
        # DPF loading factor (increases with soot accumulation)
        self.dpf_loading = 1.0

    def turbine_pr(self, rpm: float, maf_kgh: float) -> float:
        """
        Turbine pressure ratio as function of RPM and mass flow.
        Simplified model based on C18 turbine map.
        """
        # Normalized operating point
        rpm_norm = rpm / 2100.0
        maf_norm = maf_kgh / 1200.0
        # Pressure ratio typically 1.8-3.5 for C18 at rated
        PR = 1.5 + 1.2 * rpm_norm + 0.8 * maf_norm
        return np.clip(PR, 1.2, 4.0)

    def dpf_pressure_drop(self, maf_kgh: float, rpm: float) -> float:
        """
        DPF back-pressure model.
        Depends on exhaust flow rate and filter loading state.
        """
        flow_rate = maf_kgh / 3600.0  # kg/s
        # Base pressure drop + loading contribution
        dp_base = 2.5 * (flow_rate ** 1.8)  # kPa
        dp_loaded = dp_base * self.dpf_loading
        return dp_loaded * self.correction_dp

    def predict(self, maf_kgh: float, fuel_qty_mg: float, rpm: float,
                t_cac_out_k: float = 318.15) -> dict:
        """
        Predict exhaust system state.

        Args:
            maf_kgh: Mass air flow in kg/h
            fuel_qty_mg: Fuel injection quantity in mg/stroke
            rpm: Engine speed in RPM
            t_cac_out_k: CAC outlet temperature in Kelvin

        Returns:
            dict with T_exh_manifold_pred, T_post_turbine_pred, dP_dpf_pred
        """
        # Fuel mass flow rate (kg/s)
        # fuel_qty is per stroke per cylinder; 4-stroke → 1 injection per 2 revs
        fuel_mass_flow = fuel_qty_mg * 1e-6 * (rpm / 2.0 / 60.0) * self.n_cylinders

        # Air mass flow (kg/s)
        air_mass_flow = maf_kgh / 3600.0

        # Total exhaust mass flow
        total_flow = air_mass_flow + fuel_mass_flow

        # Combustion temperature (first law of thermodynamics)
        # We model the fraction of combustion heat actually entering the exhaust gas
        # (subtracting shaft power, coolant rejection, and structural heat loss)
        if total_flow > 0 and self.cp_air > 0:
            delta_T = (fuel_mass_flow * self.lhv_diesel * 1000.0 * self.exhaust_heat_fraction) / \
                      (total_flow * self.cp_air)
            T_exh_manifold = t_cac_out_k + delta_T
        else:
            T_exh_manifold = t_cac_out_k + 400.0

        T_exh_manifold *= self.correction_t_exh

        # Clamp to realistic range (200-900°C exhaust to prevent low-load saturation)
        T_exh_manifold = np.clip(T_exh_manifold, 473.15, 1173.15)

        # Turbine expansion
        PR_turbine = self.turbine_pr(rpm, maf_kgh)
        T_post_turbine = T_exh_manifold * (
            1.0 - self.turbo_eff_turbine * (
                1.0 - PR_turbine ** (-(self.gamma - 1) / self.gamma)
            )
        )

        # DPF pressure drop
        dP_dpf = self.dpf_pressure_drop(maf_kgh, rpm)

        # DPF inlet/outlet temperatures (with heat loss)
        T_dpf_in = T_post_turbine - 30.0   # ~30K loss in exhaust pipe
        T_dpf_out = T_dpf_in - 50.0        # ~50K across DPF

        # --- Extended Exhaust Predictions (NEW) ---
        # Exhaust manifold pressure (back-pressure from turbine restriction)
        P_exh_manifold_pred = self.map_ambient * (1.2 + 0.8 * (maf_kgh/1000.0) + 0.5 * (rpm/2100.0))
        P_exh_manifold_pred = np.clip(P_exh_manifold_pred, 110.0, 400.0)

        # Turbine outlet pressure (after turbine expansion)
        P_turbine_out_pred = P_exh_manifold_pred / PR_turbine
        P_turbine_out_pred = np.clip(P_turbine_out_pred, 100.0, 250.0)

        # Tailpipe pressure (after DPF/SCR restriction)
        P_tailpipe_pred = P_turbine_out_pred + dP_dpf
        P_tailpipe_pred = np.clip(P_tailpipe_pred, 100.0, 120.0)

        # DOC Temperature (Diesel Oxidation Catalyst - slightly higher than post-turbine)
        T_DOC_pred = T_post_turbine + 20.0 + 30.0 * (fuel_mass_flow / 0.02)
        T_DOC_pred = np.clip(T_DOC_pred, 473.15, 873.15)  # 200-600°C

        # SCR Temperature (after DPF cooling)
        T_SCR_pred = T_DOC_pred - 100.0
        T_SCR_pred = np.clip(T_SCR_pred, 473.15, 723.15)  # 200-450°C

        return {
            'T_exh_manifold_pred': float(T_exh_manifold),
            'T_post_turbine_pred': float(T_post_turbine),
            'dP_dpf_pred': float(dP_dpf),
            'T_dpf_in_pred': float(T_dpf_in),
            'T_dpf_out_pred': float(T_dpf_out),
            # Extended predictions
            'P_exh_manifold_pred': float(P_exh_manifold_pred),
            'P_turbine_out_pred': float(P_turbine_out_pred),
            'P_tailpipe_pred': float(P_tailpipe_pred),
            'T_DOC_pred': float(T_DOC_pred),
            'T_SCR_pred': float(T_SCR_pred),
        }

    def update_online(self, actual_t_exh: float, predicted_t_exh: float,
                      alpha: float = 0.01):
        """Online learning via EWA."""
        if predicted_t_exh > 0:
            ratio = actual_t_exh / predicted_t_exh
            self.correction_t_exh = (1 - alpha) * self.correction_t_exh + alpha * ratio

    def save(self, path: str):
        joblib.dump(self, path)

    @staticmethod
    def load(path: str) -> 'ExhaustTwinModel':
        return joblib.load(path)
