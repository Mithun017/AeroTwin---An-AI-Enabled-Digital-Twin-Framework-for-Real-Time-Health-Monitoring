import asyncio
import random
import time
from datetime import datetime
import pandas as pd
import numpy as np

class DAQService:
    def __init__(self):
        # Connection parameters
        self.connection_status = "Disconnected"  # "Disconnected", "Connecting", "Connected"
        self.connection_type = "Simulated DAQ Data"
        self.device_name = "N/A"
        self.sampling_rate = 1.0  # Hz (1, 5, or 10 Hz)
        self.packets_received = 0
        self.sensor_count = 11
        self.last_update = None
        self.simulation_state = "Healthy"  # "Healthy", "Minor Leak", "Boost Leak", "Sensor Failure", "Injector Fault"

        # Recording state
        self.recording = False
        self.recorded_packets = []

        # AI Prediction outputs
        self.ai_prediction = {
            "leak_risk": 0.0,
            "turbo_failure": 0.0,
            "injector_failure": 0.0,
            "sensor_drift": 0.0,
            "engine_health": 100.0
        }

        # Background streaming task
        self.stream_task = None
        self.broadcast_callback = None
        self.dax_engine = None
        self.predictor = None

    def connect(self, connection_type: str, device_name: str, sampling_rate: float, simulation_state: str, dax_engine, predictor, broadcast_callback=None):
        if self.connection_status == "Connected":
            self.disconnect()

        self.connection_status = "Connecting"
        self.connection_type = connection_type
        self.device_name = device_name
        self.sampling_rate = max(1.0, min(10.0, sampling_rate))
        self.simulation_state = simulation_state
        self.dax_engine = dax_engine
        self.predictor = predictor
        self.broadcast_callback = broadcast_callback
        self.packets_received = 0

        # Start streaming loop in background
        loop = asyncio.get_event_loop()
        self.connection_status = "Connected"
        self.stream_task = loop.create_task(self._stream_loop())
        print(f"[DAQ] Connected to {connection_type} ({device_name}) at {sampling_rate}Hz in {simulation_state} mode.")
        return True

    def disconnect(self):
        if self.stream_task:
            self.stream_task.cancel()
            self.stream_task = None
        self.connection_status = "Disconnected"
        self.device_name = "N/A"
        print("[DAQ] Disconnected from DAQ device.")
        return True

    def start_recording(self):
        self.recording = True
        self.recorded_packets = []
        print("[DAQ] Session recording started.")
        return True

    def stop_recording(self):
        self.recording = False
        print(f"[DAQ] Session recording stopped. Total packets recorded: {len(self.recorded_packets)}")
        return True

    def export_data(self, format_type: str = "json") -> str:
        if not self.recorded_packets:
            return ""
        df = pd.DataFrame(self.recorded_packets)
        if format_type == "csv":
            return df.to_csv(index=False)
        else:
            return df.to_json(orient="records", indent=2)

    async def _stream_loop(self):
        try:
            while self.connection_status == "Connected":
                t0 = time.time()
                packet = self._generate_telemetry_packet()
                self._run_ai_predictions(packet)

                # Append health scores to packet
                packet["LeakZone"] = int(packet["LeakZone"])
                packet["HealthScore"] = round(float(self.ai_prediction["engine_health"]), 1)

                self.packets_received += 1
                self.last_update = packet["Timestamp"]

                # Store packet in memory buffer
                if self.recording:
                    self.recorded_packets.append(packet.copy())

                # Insert packet into DuckDB
                if self.dax_engine:
                    try:
                        self.dax_engine.conn.execute(
                            """
                            INSERT INTO SensorReadings (Timestamp, RPM, MAF, Boost, CoolantTemp, OilTemp, OilPressure, ThrottlePosition, AFR, LeakZone, HealthScore)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                packet["Timestamp"],
                                packet["RPM"],
                                packet["MAF"],
                                packet["Boost"],
                                packet["CoolantTemp"],
                                packet["OilTemp"],
                                packet["OilPressure"],
                                packet["ThrottlePosition"],
                                packet["AFR"],
                                packet["LeakZone"],
                                packet["HealthScore"]
                            )
                        )
                        # Keep last 1000 records
                        count = self.dax_engine.conn.execute("SELECT COUNT(*) FROM SensorReadings").fetchone()[0]
                        if count > 1000:
                            # Select oldest rows timestamps
                            oldest_ts = self.dax_engine.conn.execute("SELECT Timestamp FROM SensorReadings ORDER BY Timestamp ASC LIMIT ?", (count - 1000,)).fetchall()
                            ts_list = [row[0] for row in oldest_ts]
                            if ts_list:
                                self.dax_engine.conn.execute("DELETE FROM SensorReadings WHERE Timestamp IN (" + ",".join([f"'{ts}'" for ts in ts_list]) + ")")
                    except Exception as db_err:
                        print(f"[DAQ] DB Insert Error: {db_err}")

                # Broadcast to UI
                if self.broadcast_callback:
                    await self.broadcast_callback({
                        "type": "daq_packet",
                        "status": self.connection_status,
                        "device_name": self.device_name,
                        "connection_type": self.connection_type,
                        "sampling_rate": self.sampling_rate,
                        "packets_received": self.packets_received,
                        "sensor_count": self.sensor_count,
                        "last_update": self.last_update,
                        "simulation_state": self.simulation_state,
                        "recording": self.recording,
                        "recorded_count": len(self.recorded_packets),
                        "packet": packet,
                        "ai_prediction": self.ai_prediction
                    })

                # Calculate sleep duration to maintain sampling rate
                elapsed = time.time() - t0
                sleep_time = max(0.01, (1.0 / self.sampling_rate) - elapsed)
                await asyncio.sleep(sleep_time)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[DAQ] Streaming error: {e}")
            self.connection_status = "Disconnected"

    def _generate_telemetry_packet(self) -> dict:
        now_str = datetime.now().strftime("%H:%M:%S")
        state = self.simulation_state

        # Base nominal clean values (RPM = 1800)
        rpm = 1800.0 + random.uniform(-15.0, 15.0)
        maf = 850.0 + random.uniform(-10.0, 10.0)
        boost = 215.0 + random.uniform(-2.0, 2.0)
        coolant_temp = 85.0 + random.uniform(-0.5, 0.5)
        oil_temp = 92.0 + random.uniform(-0.5, 0.5)
        oil_pressure = 350.0 + random.uniform(-5.0, 5.0)
        throttle = 65.0 + random.uniform(-1.0, 1.0)
        afr = 16.5 + random.uniform(-0.2, 0.2)
        leak_zone = 0

        # Inject telemetry anomalies depending on state
        if state == "Minor Leak":
            boost *= 0.95
            maf *= 0.97
            leak_zone = 2
        elif state == "Boost Leak":
            boost *= 0.85
            maf *= 0.92
            leak_zone = 2
        elif state == "Sensor Failure":
            # MAF reads a constant drifting value
            maf = 450.0 + random.uniform(-2.0, 2.0)
            afr *= 1.25  # Lean reading due to MAF sensor failure
        elif state == "Injector Fault":
            # Spiky fuel injection causing rich AFR
            afr = 12.2 + random.uniform(-0.5, 0.5)
            oil_temp += 5.0
            coolant_temp += 3.0

        return {
            "Timestamp": now_str,
            "RPM": round(float(rpm), 1),
            "MAF": round(float(maf), 2),
            "Boost": round(float(boost), 2),
            "CoolantTemp": round(float(coolant_temp), 2),
            "OilTemp": round(float(oil_temp), 2),
            "OilPressure": round(float(oil_pressure), 2),
            "ThrottlePosition": round(float(throttle), 1),
            "AFR": round(float(afr), 2),
            "LeakZone": leak_zone
        }

    def _run_ai_predictions(self, packet: dict):
        state = self.simulation_state

        # Calculate dynamic probabilities with noise
        leak_risk = 0.02
        turbo_failure = 0.01
        injector_failure = 0.03
        sensor_drift = 0.01

        if state == "Healthy":
            leak_risk += random.uniform(0.0, 0.03)
            turbo_failure += random.uniform(0.0, 0.02)
            injector_failure += random.uniform(0.0, 0.02)
            sensor_drift += random.uniform(0.0, 0.01)
        elif state == "Minor Leak":
            leak_risk = 0.58 + random.uniform(0.0, 0.05)
            turbo_failure = 0.12 + random.uniform(0.0, 0.03)
        elif state == "Boost Leak":
            leak_risk = 0.92 + random.uniform(0.0, 0.04)
            turbo_failure = 0.84 + random.uniform(0.0, 0.05)
        elif state == "Sensor Failure":
            sensor_drift = 0.95 + random.uniform(0.0, 0.03)
            leak_risk = 0.35 + random.uniform(0.0, 0.05)  # Confused by faulty sensor readings
        elif state == "Injector Fault":
            injector_failure = 0.91 + random.uniform(0.0, 0.04)

        # Let's override with actual ML predictor if available
        if self.predictor and self.predictor.intake_twin:
            try:
                # Map to standard C18 sensors
                s_data = {
                    'RPM': packet['RPM'],
                    'MAF': packet['MAF'],
                    'MAP_boost': packet['Boost'],
                    'T_cac_out': packet['CoolantTemp'],
                    'T_boost': packet['OilTemp'],
                    'fuel_qty': packet['ThrottlePosition'] * 1.5,
                    'T_exh_manifold': 550.0,
                    'dP_dpf': 0.5,
                }
                res = self.predictor.predict(s_data)
                # Keep original leak_risk if model is running
                if res.get('leak_detected', False):
                    leak_risk = max(leak_risk, res.get('confidence', 0.0))
            except Exception as ml_err:
                print(f"[DAQ] Predictor Error: {ml_err}")

        # Compute global engine health score
        max_failure_risk = max(leak_risk, turbo_failure, injector_failure, sensor_drift)
        engine_health = 100.0 - (max_failure_risk * 100.0)
        engine_health = max(0.0, min(100.0, engine_health))

        self.ai_prediction = {
            "leak_risk": round(float(leak_risk), 4),
            "turbo_failure": round(float(turbo_failure), 4),
            "injector_failure": round(float(injector_failure), 4),
            "sensor_drift": round(float(sensor_drift), 4),
            "engine_health": round(float(engine_health), 1)
        }
