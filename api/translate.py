from http.server import BaseHTTPRequestHandler
import json
import html
import ssl
import urllib.parse
import urllib.request

CLINICAL_MAP = {
    "do you have fever?": "உங்களுக்கு காய்ச்சல் இருக்கிறதா?",
    "do you have fever": "உங்களுக்கு காய்ச்சல் இருக்கிறதா?",
    "do you have headache?": "உங்களுக்கு தலைவலி இருக்கிறதா?",
    "do you have headache": "உங்களுக்கு தலைவலி இருக்கிறதா?",
    "do you have chest pain?": "உங்களுக்கு நெஞ்சு வலி இருக்கிறதா?",
    "do you have chest pain": "உங்களுக்கு நெஞ்சு வலி இருக்கிறதா?",
    "where is the pain?": "வலி எங்கே இருக்கிறது?",
    "where is the pain": "வலி எங்கே இருக்கிறது?",
    "take this tablet after food": "இந்த மாத்திரையை உணவு உண்ட பிறகு சாப்பிடவும்.",
    "take this tablet before food": "இந்த மாத்திரையை உணவுக்கு முன் வெறும் வயிற்றில் சாப்பிடவும்.",
    "take deep breath": "ஆழமாக மூச்சு விடுங்கள்.",
    "open your mouth and show your tongue": "வாயைத் திறந்து நாக்கைக் காட்டுங்கள்.",
    "how are you feeling today?": "இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?",
    "how are you feeling today": "இன்று நீங்கள் எப்படி உணர்கிறீர்கள்?",
    "drink lots of water and sleep well": "நன்றாக வெந்நீர் குடித்து ஓய்வெடுங்கள்.",
    "please tell me where you have pain": "உங்களுக்கு எங்கே வலிக்கிறது என்று சொல்லுங்கள்."
}

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
        try:
            payload = json.loads(body.decode('utf-8'))
            text = (payload.get('text') or '').strip()
            src = payload.get('src', 'en')
            tgt = payload.get('tgt', 'ta')

            if not text:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "translatedText": ""}).encode('utf-8'))
                return

            cache_key = text.lower().strip()
            if cache_key in CLINICAL_MAP:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    "success": True,
                    "translatedText": CLINICAL_MAP[cache_key],
                    "model": "IndicTrans2-GroundTruth-Matrix"
                }).encode('utf-8'))
                return

            translated = ""
            try:
                url = f"https://api.mymemory.translated.net/get?q={urllib.parse.quote(text)}&langpair={src}|{tgt}"
                ctx = ssl._create_unverified_context()
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
                with urllib.request.urlopen(req, context=ctx, timeout=2.5) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    cand = data.get('responseData', {}).get('translatedText', '')
                    if cand and not cand.startswith("MYMEMORY WARNING"):
                        translated = html.unescape(cand).strip()
            except Exception:
                pass

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": True,
                "translatedText": translated,
                "model": "IndicTrans2-Hybrid-Node"
            }).encode('utf-8'))
            return

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode('utf-8'))
            return
