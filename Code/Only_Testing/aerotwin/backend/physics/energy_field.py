"""
energy_field.py — Energy Field Generator

Computes the expected thermal/mechanical energy signature for a given
operating condition. Used as an intermediate representation between the
physics model and the residual computation.
"""
from __future__ import annotations
import numpy as np
from schemas import OperatingCondition


class EnergyFieldGenerator:
    """
    Produces a normalised energy vector [thermal, mechanical, combustion]
    that characterises the expected operating state.
    Used to provide additional context features to the ML layer if needed.
    """

    # Normalisation ranges for each energy component
    _THERMAL_MAX = 800.0      # max EGT-equivalent (°C)
    _MECH_MAX = 5000.0        # max RPM
    _COMB_MAX = 30.0          # max fuel flow (L/hr)

    def compute(self, cond: OperatingCondition, predicted_rpm: float,
                predicted_egt: float, predicted_fuel_flow: float) -> dict:
        """
        Returns normalised energy components [0, 1].
        """
        thermal    = float(np.clip(predicted_egt / self._THERMAL_MAX, 0, 1))
        mechanical = float(np.clip(predicted_rpm / self._MECH_MAX, 0, 1))
        combustion = float(np.clip(predicted_fuel_flow / self._COMB_MAX, 0, 1))

        # Combined energy index (weighted)
        energy_index = round(0.4 * thermal + 0.4 * mechanical + 0.2 * combustion, 4)

        return {
            "thermal": round(thermal, 4),
            "mechanical": round(mechanical, 4),
            "combustion": round(combustion, 4),
            "energy_index": energy_index,
        }
