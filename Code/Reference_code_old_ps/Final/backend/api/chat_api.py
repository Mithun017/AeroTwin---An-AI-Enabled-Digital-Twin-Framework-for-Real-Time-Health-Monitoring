"""
AeroTwin — AI Chat Advisor API
Uses a local Ollama LLM (qwen3:4b) for private, secure engine diagnostics.
Falls back to a rule-based knowledge base if Ollama is unavailable.
"""

from fastapi import APIRouter, Request
from pydantic import BaseModel
import os
import json

router = APIRouter(prefix="/api/chat", tags=["Chat Advisor"])


# ── Built-in Fallback Knowledge Base ─────────────────────────────────────────
FALLBACK_KB = {
    "leak": (
        "A leak or fault in the Aero Piston engine is detected by comparing actual sensor readings "
        "against the digital twin's predicted healthy values. Large residuals (actual − predicted) "
        "in MAF, MAP_boost, T_cac_out, T_exh, or dP_dpf indicate a potential leak. "
        "The Energy Field correlation matrix further confirms by showing distorted "
        "inter-sensor relationships. Severity: SMALL (<5%), MEDIUM (5–12%), CRITICAL (>12% flow loss)."
    ),
    "zone": (
        "There are 6 leak zones:\n"
        "Zone 1 — Intake: between airflow meter and compressor inlet (key sensor: MAF)\n"
        "Zone 2 — Charge Air: compressor outlet to CAC inlet (key sensor: MAP_boost, T_boost)\n"
        "Zone 3 — CAC/Manifold: CAC outlet to intake manifold (key sensor: MAP_cac_out, T_cac_out)\n"
        "Zone 4 — Exhaust Manifold: manifold to turbo turbine (key sensor: T_exh_manifold)\n"
        "Zone 5 — DPF: Diesel Particulate Filter (key sensor: dP_dpf)\n"
        "Zone 6 — SCR/Tailpipe: Selective Catalytic Reduction (key sensor: T_dpf_out)"
    ),
    "sensor": (
        "The system monitors 13 SAE J1939 sensors at 1 Hz: RPM, MAF (kg/h), MAP_intake, "
        "MAP_boost, MAP_cac_in, MAP_cac_out (all kPa), T_intake, T_boost, T_cac_out, "
        "T_exh_manifold, T_dpf_in, T_dpf_out (all °C), and fuel_qty (mg/stroke)."
    ),
    "accuracy": (
        "AeroTwin achieves: Binary Detection F1=0.886, Precision=0.90, Recall=0.87. "
        "Zone localization Top-1 Accuracy=95.6%. Inference latency <10ms, end-to-end <500ms."
    ),
    "twin": (
        "Three physics-based Digital Twins predict healthy-state values:\n"
        "• Intake Twin: MAF = VE × V_cyl × (RPM/120) × ρ_air (mass continuity)\n"
        "• Charge Air Twin: compressor pressure ratio + isentropic boost temp + CAC model (ε=0.88)\n"
        "• Exhaust Twin: first-law combustion temperature + isentropic turbine + DPF back-pressure"
    ),
    "energy": (
        "The Energy Field is a 6×6 weighted correlation matrix across MAF, MAP_boost, "
        "MAP_cac_out, T_cac_out, T_exh_manifold, and dP_dpf. Under healthy conditions it "
        "has a stable shape. During a leak, specific rows distort — the most disrupted row "
        "identifies the likely fault zone. Deviation is measured via Frobenius norm and cosine similarity."
    ),
    "go": (
        "The GO/NO-GO decision requires 3 consecutive positive leak detections (anti-flicker logic) "
        "before flagging NO-GO. This prevents false alarms from transient sensor spikes. "
        "GO = engine healthy, NO-GO = confirmed leak detected."
    ),
    "default": (
        "I am the AeroTwin AI Advisor for MALE UAV aero piston engine diagnostics. "
        "I can answer questions about leak detection zones, sensor readings, digital twin models, "
        "energy field analysis, accuracy metrics, and recommended actions. "
        "Please try rephrasing your question or ask about a specific topic like 'zone 2 leak', "
        "'energy field', 'sensor readings', or 'detection accuracy'."
    ),
}

def _fallback_response(message: str) -> str:
    """Rule-based fallback when Groq API is unavailable."""
    msg_lower = message.lower()
    if any(w in msg_lower for w in ["leak", "no-go", "nogo", "alert", "detect"]):
        return FALLBACK_KB["leak"]
    if any(w in msg_lower for w in ["zone", "location", "where", "area"]):
        return FALLBACK_KB["zone"]
    if any(w in msg_lower for w in ["sensor", "maf", "map", "temperature", "rpm", "dpf"]):
        return FALLBACK_KB["sensor"]
    if any(w in msg_lower for w in ["accuracy", "f1", "precision", "recall", "performance"]):
        return FALLBACK_KB["accuracy"]
    if any(w in msg_lower for w in ["twin", "physics", "model", "predict"]):
        return FALLBACK_KB["twin"]
    if any(w in msg_lower for w in ["energy", "field", "correlation", "matrix", "heatmap"]):
        return FALLBACK_KB["energy"]
    if any(w in msg_lower for w in ["go", "no go", "decision", "flicker", "consecutive"]):
        return FALLBACK_KB["go"]
    return FALLBACK_KB["default"]


def retrieve_relevant_context(query: str, max_sections: int = 3) -> str:
    """Simple local keyword-based RAG to find relevant documentation sections."""
    import re
    api_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.dirname(api_dir)
    only_testing_dir = os.path.dirname(backend_dir)
    
    docs = ["GEMINI.md", "ml.md", "explanation.md", "README.md"]
    sections = []
    
    for doc in docs:
        path = os.path.join(only_testing_dir, doc)
        if not os.path.exists(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                
            # Split by markdown headers
            raw_chunks = re.split(r'\n(?=#{1,4} )', content)
            for chunk in raw_chunks:
                chunk_clean = chunk.strip()
                if chunk_clean:
                    sections.append({
                        "source": doc,
                        "text": chunk_clean
                    })
        except Exception as e:
            print(f"[RAG] Error reading {doc}: {e}")
            
    # Simple keyword scoring
    keywords = [w.lower() for w in re.findall(r'\w+', query) if len(w) > 2]
    if not keywords:
        # Default back to first few sections
        default_context = ""
        for s in sections[:4]:
            default_context += f"--- Source: {s['source']} ---\n{s['text']}\n\n"
        return default_context
        
    scored_sections = []
    for s in sections:
        score = 0
        text_lower = s["text"].lower()
        for kw in keywords:
            if kw in text_lower:
                score += text_lower.count(kw)
        if score > 0:
            scored_sections.append((score, s))
            
    # Sort by score descending
    scored_sections.sort(key=lambda x: x[0], reverse=True)
    
    # Take top sections
    top_sections = scored_sections[:max_sections]
    if not top_sections:
        # Fallback to default sections
        default_context = ""
        for s in sections[:4]:
            default_context += f"--- Source: {s['source']} ---\n{s['text']}\n\n"
        return default_context
        
    context = "RELEVANT LOCAL DOCUMENTATION CONTEXT:\n"
    for score, s in top_sections:
        context += f"--- Source: {s['source']} (Relevance Score: {score}) ---\n{s['text']}\n\n"
        
    return context


def _query_ollama(messages: list) -> str:
    """Query a local Ollama instance running the qwen3:4b model."""
    import json
    import urllib.request
    url = "http://localhost:11434/api/chat"
    payload = {
        "model": "qwen3:4b",
        "messages": messages,
        "stream": False
    }
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=5.0) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["message"]["content"]
    except Exception as e:
        print(f"[Ollama] Local query failed: {e}")
        return None


class ChatRequest(BaseModel):
    message: str
    history: list = []
    session_id: str = "default"


@router.post("/ask")
async def ask_chatbot(request: Request, body: ChatRequest):
    session_id = body.session_id
    
    # ── Get live diagnostic status (processed metadata summary, NO raw test data) ───
    diagnostic_summary = {}
    try:
        predictor = request.app.state.predictor
        if predictor and hasattr(predictor, 'last_predictions') and session_id in predictor.last_predictions:
            last_pred = predictor.last_predictions[session_id]
            diagnostic_summary = {
                "leak_detected": last_pred.get("leak_detected", False),
                "confidence": last_pred.get("confidence", 0.0),
                "suspected_zone": last_pred.get("suspected_zone", "No Leak / Healthy"),
                "severity": last_pred.get("severity", "NONE"),
                "go_no_go": last_pred.get("go_no_go", "GO"),
                "is_steady_state": last_pred.get("is_steady_state", True),
                "status_message": last_pred.get("status_message", "")
            }
    except Exception:
        pass

    # ── Build Prompts and Messages (Shared between Groq and local Ollama) ─────────
    project_context = retrieve_relevant_context(body.message)

    system_prompt = (
        "You are the AeroTwin AI Advisor — a specialized expert in "
        "MALE UAV aero piston engine diagnostics and the AeroTwin AI health monitoring system.\n"
        "Your role is to help engineers understand engine health, interpret leak detection results, "
        "and explain the physics, ML models, and energy field analysis behind the system.\n\n"
        f"{project_context}"
        f"CURRENT DIAGNOSTIC STATUS (PROCESSED METADATA ONLY):\n{json.dumps(diagnostic_summary, indent=2)}\n\n"
        "Response guidelines:\n"
        "1. Be technical yet accessible — the user is an engineer.\n"
        "2. When asked about engine health or current diagnosis, refer to the processed CURRENT DIAGNOSTIC STATUS metadata above.\n"
        "3. Crucial Constraint: Do NOT expose or transmit raw sensor values (RPM, pressures, temperatures, flows) or raw test dataset rows in your replies to maintain strict data security compliance.\n"
        "4. Keep answers concise (max 3 paragraphs) unless a detailed explanation is requested.\n"
        "5. You can explain Digital Twin physics, Energy Field Analysis, ML models, and zones.\n"
        "6. Always recommend specific actions when a leak is suspected.\n"
    )

    messages = [{"role": "system", "content": system_prompt}]
    clean_history = []
    for msg in body.history:
        role = msg.get("role")
        content = msg.get("content", "")
        if role not in ("user", "assistant") or not content:
            continue
        if not clean_history or clean_history[-1]["role"] != role:
            clean_history.append({"role": role, "content": content})

    # Keep last 8 exchanges for context window efficiency
    messages.extend(clean_history[-8:])

    # Append current user message
    if messages and messages[-1].get("role") == "user":
        messages[-1]["content"] += f"\n\n{body.message}"
    else:
        messages.append({"role": "user", "content": body.message})

    # ── Try Local Ollama (qwen3:4b) ──────────────────────────────
    ollama_response = _query_ollama(messages)
    if ollama_response:
        return {
            "response": ollama_response,
            "source": "ollama",
            "model": "qwen3:4b",
        }

    # ── Rule-Based Static Fallback ────────────────────────────────
    fallback = _fallback_response(body.message)
    return {
        "response": (
            "⚠️ Local Ollama instance is offline.\n"
            f"Here's what I know locally:\n\n{fallback}"
        ),
        "source": "fallback",
    }

