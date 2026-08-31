from fastapi import APIRouter, Request
from dax.measures import MEASURES
import time

router = APIRouter(prefix="/api/dax", tags=["DAX Engine"])

@router.post("/query")
async def dax_query(request: Request, body: dict):
    dax_engine = request.app.state.dax
    expr = body.get("expression", "")
    t0 = time.time()
    result = dax_engine.query(expr)
    t1 = time.time()
    return {
        "expression": expr,
        "result": result,
        "execution_ms": round((t1 - t0) * 1000, 2)
    }

@router.get("/measures")
async def list_measures():
    return {"measures": [
        {"name": k, "formula": v, "description": ""}
        for k, v in MEASURES.items()
    ]}

@router.post("/validate")
async def validate_dax(request: Request, body: dict):
    dax_engine = request.app.state.dax
    expr = body.get("expression", "")
    try:
        sql = dax_engine._dax_to_sql(dax_engine._expand_measures(expr))
        dax_engine.conn.execute(f"EXPLAIN {sql}")
        return {"valid": True, "translated_sql": sql}
    except Exception as e:
        return {"valid": False, "error": str(e)}

@router.get("/suggestions")
async def dax_suggestions(prefix: str = ""):
    funcs = ["CALCULATE","FILTER","AVERAGEX","SUMX","COUNTX","MINX","MAXX",
             "IF","DIVIDE","TOPN","DATESBETWEEN","DATEADD","VALUES","ALL",
             "RANKX","CORR","STDEV","PERCENTILE","RELATED","DISTINCTCOUNT","COUNTROWS"]
    measures = list(MEASURES.keys())
    tables = ["SensorReadings","TwinResiduals","LeakEvents","ThresholdChecks","EngineSpecs"]
    all_items = funcs + [f"[{m}]" for m in measures] + tables
    filtered = [x for x in all_items if prefix.upper() in x.upper()]
    return {"suggestions": filtered[:20]}

@router.post("/daq/connect")
async def daq_connect(request: Request, body: dict):
    daq = request.app.state.daq_service
    dax_engine = request.app.state.dax
    predictor = request.app.state.predictor
    
    conn_type = body.get("connection_type", "Simulated DAQ Data")
    dev_name = body.get("device_name", "Mock DAQ Device")
    rate = float(body.get("sampling_rate", 1.0))
    state = body.get("simulation_state", "Healthy")
    
    success = daq.connect(
        connection_type=conn_type,
        device_name=dev_name,
        sampling_rate=rate,
        simulation_state=state,
        dax_engine=dax_engine,
        predictor=predictor,
        broadcast_callback=request.app.state.daq_broadcast
    )
    return {"success": success, "status": daq.connection_status}

@router.post("/daq/disconnect")
async def daq_disconnect(request: Request):
    daq = request.app.state.daq_service
    success = daq.disconnect()
    return {"success": success, "status": daq.connection_status}

@router.get("/daq/status")
async def daq_status(request: Request):
    daq = request.app.state.daq_service
    return {
        "status": daq.connection_status,
        "device_name": daq.device_name,
        "connection_type": daq.connection_type,
        "sampling_rate": daq.sampling_rate,
        "packets_received": daq.packets_received,
        "sensor_count": daq.sensor_count,
        "last_update": daq.last_update,
        "simulation_state": daq.simulation_state,
        "recording": daq.recording,
        "recorded_count": len(daq.recorded_packets),
        "ai_prediction": daq.ai_prediction
    }

@router.post("/daq/record/start")
async def daq_record_start(request: Request):
    daq = request.app.state.daq_service
    success = daq.start_recording()
    return {"success": success, "recording": daq.recording}

@router.post("/daq/record/stop")
async def daq_record_stop(request: Request):
    daq = request.app.state.daq_service
    success = daq.stop_recording()
    return {"success": success, "recording": daq.recording, "count": len(daq.recorded_packets)}

@router.get("/daq/record/export")
async def daq_record_export(request: Request, format: str = "json"):
    daq = request.app.state.daq_service
    from fastapi.responses import Response
    data = daq.export_data(format)
    
    if format == "csv":
        media = "text/csv"
        filename = "daq_recording.csv"
    else:
        media = "application/json"
        filename = "daq_recording.json"
        
    return Response(
        content=data,
        media_type=media,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
