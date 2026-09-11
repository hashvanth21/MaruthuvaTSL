from http.server import BaseHTTPRequestHandler
import sys
import os
import json
import time

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

    def do_GET(self):
        if not router:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": router_error}).encode('utf-8'))
            return

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        data = {
            "cache": router.cache.stats(),
            "circuit_breaker": router.circuit_breaker.get_status(),
            "timestamp": time.time()
        }
        self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))
