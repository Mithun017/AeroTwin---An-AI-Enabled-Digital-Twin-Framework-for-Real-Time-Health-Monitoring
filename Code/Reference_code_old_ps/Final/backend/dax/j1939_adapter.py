"""
AeroTwin — SAE J1939 CAN Bus Ingestion Adapter
Decodes raw CAN frames from the engine test cell DAQ into physical values
required by the AeroTwin digital twins and machine learning models.
"""

from typing import Dict, Tuple, Optional, Any
import struct


class J1939Adapter:
    """
    Adapter that decodes standard SAE J1939 CAN identifiers and data payloads.
    Provides mappings for Cat C18 ADEM A4 ECU broadcasts.
    """

    # J1939 Parameter Group Number (PGN) mappings
    # Mappings format: SPN -> (byte_start, byte_length, resolution, offset, target_key)
    # Note: byte_start is 0-indexed.
    PGN_MAP = {
        61444: {  # EEC1 - Electronic Engine Controller 1 (0xF004)
            190: (3, 2, 0.125, 0.0, "RPM"),                    # Engine Speed: Bytes 4-5
            513: (1, 1, 1.0, -125.0, "actual_percent_torque")   # Actual Engine Percent Torque: Byte 2
        },
        65262: {  # ET1 - Engine Temperature 1 (0xFEEE)
            110: (0, 1, 1.0, -40.0, "T_cac_out"),              # Engine Coolant Temp (Byte 1) mapped to T_cac_out
            175: (2, 2, 0.03125, -273.15, "T_boost")           # Engine Oil Temp (Bytes 3-4) mapped to T_boost
        },
        65270: {  # IC1 - Inlet/Exhaust Conditions 1 (0xFEF6)
            102: (1, 1, 2.0, 0.0, "MAP_boost"),                # Intake Manifold 1 Boost Pressure: Byte 2
            105: (2, 1, 1.0, -40.0, "T_intake"),               # Intake Manifold 1 Temp: Byte 3
            132: (3, 2, 0.05, 0.0, "MAF")                      # Air Flow Rate (MAF): Bytes 4-5
        },
        65272: {  # AFT1 - Aftertreatment 1 (0xFEF8)
            3242: (0, 2, 0.03125, -273.15, "T_exh_manifold"),  # Exhaust Gas Temp 1 (DPF In): Bytes 1-2
            3246: (2, 2, 0.03125, -273.15, "T_dpf_out")         # Exhaust Gas Temp 2 (DPF Out): Bytes 3-4
        },
        65266: {  # LFE - Fuel Economy (0xFEF2)
            183: (0, 2, 0.05, 0.0, "fuel_flow_rate_l_h")       # Engine Fuel Rate: Bytes 1-2
        }
    }

    def __init__(self):
        # Local state storage accumulating the latest parameters from decoded frames
        self.sensor_state = {
            "RPM": 1800.0,
            "MAF": 850.0,
            "MAP_intake": 210.0,
            "MAP_boost": 215.0,
            "MAP_cac_in": 212.0,
            "MAP_cac_out": 205.0,
            "T_intake": 25.0,
            "T_boost": 120.0,
            "T_cac_out": 45.0,
            "T_exh_manifold": 550.0,
            "T_dpf_in": 250.0,
            "T_dpf_out": 200.0,
            "fuel_qty": 120.0,
            "dP_dpf": 0.5
        }

    @staticmethod
    def extract_pgn(can_id: int) -> int:
        """
        Extract J1939 PGN from the standard 29-bit CAN identifier.
        """
        # PF = Protocol Format (bits 16-23)
        # PS = Protocol Specific (bits 8-15)
        pf = (can_id >> 16) & 0xFF
        ps = (can_id >> 8) & 0xFF

        if pf < 240:
            # Destination specific PGN — PS represents destination address, mask it out
            return pf << 8
        else:
            # Broadcast PGN
            return (pf << 8) | ps

    def decode_frame(self, can_id: int, data: bytes) -> Dict[str, Any]:
        """
        Decode a single raw J1939 CAN frame.

        Args:
            can_id: 29-bit CAN ID containing Priority, PGN, SA, DA
            data: 8-byte payload

        Returns:
            Dict containing newly decoded physical SPN values from this frame
        """
        pgn = self.extract_pgn(can_id)
        decoded = {}

        if pgn not in self.PGN_MAP:
            return decoded

        spn_definitions = self.PGN_MAP[pgn]
        data_len = len(data)

        for spn, (start, length, resolution, offset, key) in spn_definitions.items():
            if start + length > data_len:
                continue

            # Extract raw integer based on length (Little Endian in J1939)
            raw_bytes = data[start:start+length]
            if length == 1:
                raw_val = raw_bytes[0]
            elif length == 2:
                raw_val = struct.unpack("<H", raw_bytes)[0]
            elif length == 4:
                raw_val = struct.unpack("<I", raw_bytes)[0]
            else:
                continue

            # Check for J1939 error/not available indicators (e.g. 0xFF or 0xFFFF)
            if length == 1 and raw_val >= 0xFE:
                continue
            if length == 2 and raw_val >= 0xFFFE:
                continue

            # Convert to physical engineering units
            physical_val = (raw_val * resolution) + offset
            decoded[key] = round(float(physical_val), 4)

            # Update the cached status
            self.sensor_state[key] = decoded[key]

        # Derived logic mapping
        # Translate torque/percent load or fuel flow rate into fuel_qty (mg/stroke)
        if "actual_percent_torque" in decoded or "fuel_flow_rate_l_h" in decoded:
            rpm = self.sensor_state["RPM"]
            if "fuel_flow_rate_l_h" in decoded:
                # Liters/hour to mg/stroke:
                # fuel_flow (kg/h) = fuel_flow_rate_l_h * 0.84 (diesel density)
                # fuel_flow (kg/s) = fuel_flow (kg/h) / 3600
                # fuel_qty (mg/stroke) = fuel_flow (kg/s) * 1e6 / (strokes_per_sec) / n_cylinders
                # strokes_per_sec = (rpm / 2.0 / 60.0) * 6
                # Simplifying: fuel_qty = (flow_l_h * 0.84 * 1000 * 1000 / 3600) / (rpm / 120.0 * 6)
                # fuel_qty = (flow_l_h * 233.33) / (rpm / 20)
                flow_l_h = decoded.get("fuel_flow_rate_l_h", 0.0)
                if rpm > 100:
                    fuel_qty = (flow_l_h * 4666.6) / rpm
                    self.sensor_state["fuel_qty"] = round(min(180.0, max(10.0, fuel_qty)), 2)
            elif "actual_percent_torque" in decoded:
                # Linear approximation: percent torque to injection quantity
                torque = decoded["actual_percent_torque"]
                # 0% torque = 30 mg, 100% torque = 160 mg
                fuel_qty = 30.0 + max(0.0, torque) * 1.3
                self.sensor_state["fuel_qty"] = round(min(180.0, max(10.0, fuel_qty)), 2)

        # Derived pressures
        if "MAP_boost" in decoded:
            mb = decoded["MAP_boost"]
            self.sensor_state["MAP_cac_in"] = round(mb * 0.98, 2)
            self.sensor_state["MAP_cac_out"] = round(mb * 0.95, 2)
            self.sensor_state["MAP_intake"] = round(mb * 0.93, 2)

        if "T_exh_manifold" in decoded:
            # DPF inlet temperature estimate
            self.sensor_state["T_dpf_in"] = round(self.sensor_state["T_exh_manifold"] - 30.0, 2)
            # Estimate dP_dpf back-pressure proportional to MAF flow
            maf_kgs = self.sensor_state["MAF"] / 3600.0
            self.sensor_state["dP_dpf"] = round(2.5 * (maf_kgs ** 1.8), 3)

        return decoded

    def get_state(self) -> Dict[str, float]:
        """
        Return the consolidated current state.
        """
        return self.sensor_state.copy()


if __name__ == "__main__":
    # Self-test code showing raw CAN frame parsing
    adapter = J1939Adapter()

    # EEC1: RPM = 1500 (Hex: 1500 / 0.125 = 12000 -> 0x2EE0)
    # Byte index 3-4 (0-indexed) is 0xE0, 0x2E
    # Frame bytes: [0xFF, 0x50, 0xFF, 0xE0, 0x2E, 0xFF, 0xFF, 0xFF]
    # PGN 61444 (EEC1) in hex is 0xF004. Priority=3, SA=0, DA=255 -> CAN ID = 0x0CF00400
    eec1_can_id = 0x0CF00400
    eec1_data = bytes([0xFF, 0x50, 0xFF, 0xE0, 0x2E, 0xFF, 0xFF, 0xFF])

    # IC1: Boost = 220 kPa (Hex: 220 / 2 = 110 -> 0x6E), MAF = 720 kg/h (Hex: 720 / 0.05 = 14400 -> 0x3840)
    # PGN 65270 (IC1) -> 0xFEF6. CAN ID = 0x18FEF600
    ic1_can_id = 0x18FEF600
    ic1_data = bytes([0xFF, 0x6E, 0x41, 0x40, 0x38, 0xFF, 0xFF, 0xFF])

    print("Initial RPM:", adapter.get_state()["RPM"])
    print("Initial MAF:", adapter.get_state()["MAF"])
    print("Initial Boost:", adapter.get_state()["MAP_boost"])

    dec1 = adapter.decode_frame(eec1_can_id, eec1_data)
    print("\nDecoded EEC1:", dec1)
    print("State RPM after EEC1:", adapter.get_state()["RPM"])
    print("State Fuel Qty (derived from Torque):", adapter.get_state()["fuel_qty"])

    dec2 = adapter.decode_frame(ic1_can_id, ic1_data)
    print("\nDecoded IC1:", dec2)
    print("State MAF after IC1:", adapter.get_state()["MAF"])
    print("State Boost after IC1:", adapter.get_state()["MAP_boost"])
    print("State Intake Pressure (derived from Boost):", adapter.get_state()["MAP_intake"])
