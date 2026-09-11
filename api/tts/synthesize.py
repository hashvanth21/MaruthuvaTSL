from http.server import BaseHTTPRequestHandler
import sys
import os
import json
import base64

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

try:
    from tts_orchestrator import TTSFailoverRouter
    router = TTSFailoverRouter()
except Exception as e:
    router = None
    router_error = str(e)

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, api-subscription-key')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        if not router:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Router not initialized: " + router_error}).encode('utf-8'))
            return

        try:
            payload = json.loads(body.decode('utf-8'))
            if not isinstance(payload, dict):
                self.send_response(400)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Payload must be a JSON object", "code": "INVALID_JSON"}).encode('utf-8'))
                return

            text = payload.get('text')
            speaker = payload.get('speaker', 'kavya')
            lang = payload.get('lang', None)

            res = router.route_symptom_to_speech(text, speaker, lang)

            if not res.get("success"):
                status_code = res.get("status_code", 400)
                self.send_response(status_code)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "error": res.get("error", "Bad Request"),
                    "code": "VALIDATION_FAILED",
                    "latency_ms": res.get("latency_ms", 0.0)
                }).encode('utf-8'))
                return

            audio_b64 = base64.b64encode(res['audio_bytes']).decode('utf-8')
            response_payload = {
                "success": True,
                "engine": res['engine_used'],
                "latency_ms": res['latency_ms'],
                "cache_hit": res['cache_hit'],
                "circuit_state": res['circuit_state'],
                "text_normalized": res['text_normalized'],
                "audio_base64": audio_b64,
                "audio_data_uri": f"data:audio/wav;base64,{audio_b64}"
            }

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('X-TTS-Engine', res['engine_used'])
            self.send_header('X-TTS-Latency-Ms', str(res['latency_ms']))
            self.send_header('X-TTS-Cache-Hit', str(res['cache_hit']))
            self.send_header('X-Circuit-State', res['circuit_state'])
            self.end_headers()
            self.wfile.write(json.dumps(response_payload).encode('utf-8'))
            return

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return
