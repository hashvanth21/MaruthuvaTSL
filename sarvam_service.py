"""
Sarvam AI Sovereign Tamil Translation and Speech Service for Maruthuva TSL (மருத்துவ TSL)
=========================================================================================
Converts medical keywords and raw English sign glosses into natural, polite,
grammatically correct Tamil spoken sentences for Deaf emergency communication,
and synthesizes spoken Tamil audio using Sarvam AI Bulbul Indic TTS.

Endpoints:
  - Translation: https://api.sarvam.ai/translate
  - Text-to-Speech: https://api.sarvam.ai/text-to-speech
"""

import os
import json
import urllib.request
import urllib.error
import urllib.parse
import ssl

# Default API Key from environment
DEFAULT_SARVAM_API_KEY = os.environ.get('SARVAM_API_KEY', '')

# 1. Pre-mapping dictionary for raw sign glosses to clinical emergency sentences
SIGN_PRE_MAP = {
    'HEADACHE': 'I have a headache',
    'THROAT_PAIN': 'I have throat pain',
    'BREATHING_PROBLEM': 'I have difficulty breathing',
    'STOMACH_PAIN': 'I have severe stomach pain',
    'CHEST_PAIN': 'I have chest pain',
    'FEVER': 'I have a high fever',
    'VOMITING': 'I have vomiting and nausea',
    'DIZZINESS': 'I feel very dizzy and faint',
    'COUGH': 'I have a persistent severe cough',
    'FRACTURE': 'I have severe bone fracture pain',
    'BLEEDING': 'I have continuous heavy bleeding',
    'ALLERGY': 'I have severe skin allergy and itching',
    'EMERGENCY_SOS': 'Please help immediately, this is a medical emergency',
    'INSULIN_TIMING': 'When should I take my insulin dose?',
    'BLOOD_PRESSURE': 'I have severe high blood pressure'
}

# 2. Local Fallback Dictionary for Emergency ER Tamil Sentences
LOCAL_TAMIL_DICTIONARY = {
    'HEADACHE': 'எனக்கு தலைவலி இருக்கிறது.',
    'THROAT_PAIN': 'எனக்கு தொண்டை வலி இருக்கிறது.',
    'BREATHING_PROBLEM': 'எனக்கு மூச்சுத்திணறல் இருக்கிறது.',
    'STOMACH_PAIN': 'எனக்கு வயிற்று வலி இருக்கிறது.',
    'CHEST_PAIN': 'எனக்கு நெஞ்சு வலி இருக்கிறது.',
    'FEVER': 'எனக்கு கடுமையான காய்ச்சல் இருக்கிறது.',
    'VOMITING': 'எனக்கு வாந்தி மற்றும் குமட்டல் இருக்கிறது.',
    'DIZZINESS': 'எனக்கு தலைசுற்றலாகவும் மயக்கமாகவும் இருக்கிறது.',
    'COUGH': 'எனக்கு கடுமையான இருமல் இருக்கிறது.',
    'FRACTURE': 'எனக்கு எலும்பு முறிவு ஏற்பட்டு கடுமையான வலி இருக்கிறது.',
    'BLEEDING': 'எனக்கு தொடர்ந்து ரத்தப்போக்கு ஏற்படுகிறது.',
    'ALLERGY': 'எனக்கு தோல் ஒவ்வாமை மற்றும் கடுமையான அரிப்பு இருக்கிறது.',
    'EMERGENCY_SOS': 'தயவுசெய்து உடனே உதவுங்கள், இது அவசர மருத்துவ நிலை.',
    'INSULIN_TIMING': 'நான் எப்போது இன்சுலின் மருந்து எடுத்துக்கொள்ள வேண்டும்?',
    'BLOOD_PRESSURE': 'எனக்கு ரத்த அழுத்தம் அதிகமாக இருக்கிறது.'
}


class SarvamService:
    def __init__(self, api_key: str = None):
        self.api_key = (api_key or DEFAULT_SARVAM_API_KEY).strip()
        self.translate_endpoint = "https://api.sarvam.ai/translate"
        self.tts_endpoint = "https://api.sarvam.ai/text-to-speech"
        self.default_speaker = "meera"
        self.default_pace = 1.0
        self.ssl_context = self._create_ssl_context()

    def _create_ssl_context(self):
        return ssl.create_default_context()

    def _get_headers(self) -> dict:
        return {
            "Content-Type": "application/json",
            "api-subscription-key": self.api_key
        }

    def _map_keyword_to_english_phrase(self, keyword: str) -> str:
        """Normalizes and maps raw sign gloss to standard clinical English sentence."""
        if not keyword:
            return ""
        norm = keyword.strip().upper().replace(" ", "_").replace("-", "_")
        if norm in SIGN_PRE_MAP:
            return SIGN_PRE_MAP[norm]
        # Return clean natural sentence if already regular text
        clean = keyword.strip().replace("_", " ")
        return f"I have {clean.lower()}"

    def translate_keyword_to_tamil(self, keyword: str) -> str:
        """
        Converts the input medical keyword or raw English sign gloss into a natural,
        polite, grammatically correct Tamil spoken sentence for emergency room communication.

        Returns ONLY the refined Tamil sentence in Tamil script (Unicode).
        """
        if not keyword:
            return ""

        norm_key = keyword.strip().upper().replace(" ", "_").replace("-", "_")

        # Fast lookup in local few-shot gold standards
        if norm_key in LOCAL_TAMIL_DICTIONARY:
            gold_sentence = LOCAL_TAMIL_DICTIONARY[norm_key]
        else:
            gold_sentence = None

        # Prepare pre-mapped clinical English sentence
        english_input = self._map_keyword_to_english_phrase(keyword)

        if not self.api_key:
            return gold_sentence or f"எனக்கு {keyword} இருக்கிறது."

        payload = {
            "input": english_input,
            "source_language_code": "en-IN",
            "target_language_code": "ta-IN",
            "mode": "formal"
        }

        try:
            req = urllib.request.Request(
                self.translate_endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers=self._get_headers(),
                method="POST"
            )
            # Try with default SSL, fallback to unverified if macOS certs issue
            try:
                with urllib.request.urlopen(req, context=self.ssl_context, timeout=8) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
            except urllib.error.URLError as url_err:
                unverified = ssl._create_unverified_context()
                with urllib.request.urlopen(req, context=unverified, timeout=8) as resp:
                    data = json.loads(resp.read().decode("utf-8"))

            translated = (data.get("translated_text") or "").strip()
            if translated:
                # If translation contains leftover English words or is incomplete, use gold dictionary
                has_latin = any('a' <= c.lower() <= 'z' for c in translated)
                if has_latin and gold_sentence:
                    return gold_sentence
                # Standardize sentence ending for polite clinical communication
                if not translated.endswith('.'):
                    translated += '.'
                return translated

        except Exception as e:
            # Smooth fallback to local dictionary
            pass

        return gold_sentence or f"எனக்கு {keyword} பிரச்சினை இருக்கிறது."

    def generate_tamil_speech(self, tamil_text: str, speaker: str = "meera", pace: float = 1.0) -> dict:
        """
        Synthesizes spoken Tamil audio using Sarvam AI Text-to-Speech API.
        
        Parameters:
          - target_language_code: "ta-IN"
          - speaker: "meera" (auto-mapped to high-fidelity Tamil voice 'kavya' / 'priya' for bulbul:v3)
          - pace: 1.0

        Returns a dictionary containing:
          - 'audio_base64': Base64 encoded WAV string
          - 'html_audio_tag': '<audio autoplay controls src="data:audio/wav;base64,..."></audio>'
          - 'success': Boolean
        """
        clean_text = (tamil_text or "").strip()
        if not clean_text:
            return {
                "audio_base64": "",
                "html_audio_tag": "",
                "success": False,
                "error": "Empty Tamil text provided"
            }

        # Bulbul:v3 active speaker resolution with alias compatibility
        speaker_map = {
            "meera": "kavya",
            "arvind": "gokul",
            "maya": "priya",
            "amartya": "vijay",
            "kavya": "kavya",
            "gokul": "gokul",
            "priya": "priya",
            "vijay": "vijay",
            "kavitha": "kavitha",
            "aditya": "aditya",
            "ritu": "ritu",
            "pooja": "pooja",
            "shreya": "shreya",
            "shruti": "shruti",
            "suhani": "suhani",
            "rohan": "rohan",
            "dev": "dev",
            "ratan": "ratan",
            "varun": "varun"
        }
        req_speaker = (speaker or self.default_speaker or "kavya").lower().strip()
        resolved_speaker = speaker_map.get(req_speaker, "kavya")

        payload = {
            "inputs": [clean_text],
            "target_language_code": "ta-IN",
            "speaker": resolved_speaker,
            "pace": float(pace or self.default_pace),
            "model": "bulbul:v3"
        }

        try:
            req = urllib.request.Request(
                self.tts_endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers=self._get_headers(),
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, context=self.ssl_context, timeout=10) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
            except urllib.error.URLError:
                unverified = ssl._create_unverified_context()
                with urllib.request.urlopen(req, context=unverified, timeout=10) as resp:
                    data = json.loads(resp.read().decode("utf-8"))

            audios = data.get("audios", [])
            if audios and audios[0]:
                b64_audio = audios[0]
                audio_uri = f"data:audio/wav;base64,{b64_audio}"
                html_tag = f'<audio autoplay controls src="{audio_uri}"></audio>'
                return {
                    "audio_base64": b64_audio,
                    "audio_uri": audio_uri,
                    "html_audio_tag": html_tag,
                    "success": True,
                    "speaker": resolved_speaker
                }

        except Exception as e:
            # Fallback representation
            encoded = urllib.parse.quote(clean_text)
            fallback_url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={encoded}&tl=ta&client=tw-ob"
            html_tag = f'<audio autoplay controls src="{fallback_url}"></audio>'
            return {
                "audio_base64": "",
                "audio_uri": fallback_url,
                "html_audio_tag": html_tag,
                "success": False,
                "error": str(e),
                "fallback": "web_speech_native"
            }


# Standalone Helper Functions matching requirements directly
_service_singleton = None

def get_sarvam_service(api_key: str = None) -> SarvamService:
    global _service_singleton
    if _service_singleton is None or api_key:
        _service_singleton = SarvamService(api_key=api_key)
    return _service_singleton

def translate_keyword_to_tamil(keyword: str, api_key: str = None) -> str:
    """Convenience function: Convert medical keyword / gloss to polite Tamil sentence."""
    svc = get_sarvam_service(api_key)
    return svc.translate_keyword_to_tamil(keyword)

def generate_tamil_speech(tamil_text: str, speaker: str = "meera", pace: float = 1.0, api_key: str = None) -> str:
    """Convenience function: Returns HTML5 <audio autoplay> tag string from Tamil text."""
    svc = get_sarvam_service(api_key)
    res = svc.generate_tamil_speech(tamil_text, speaker=speaker, pace=pace)
    return res.get("html_audio_tag", "")


if __name__ == "__main__":
    import urllib.parse
    print("=" * 60)
    print("Maruthuva TSL (மருத்துவ TSL) — Sarvam AI Tamil Translation & Audio Test")
    print("=" * 60)

    test_keywords = [
        "HEADACHE",
        "THROAT_PAIN",
        "BREATHING_PROBLEM",
        "STOMACH_PAIN",
        "CHEST_PAIN",
        "FEVER",
        "EMERGENCY_SOS"
    ]

    service = SarvamService()
    for kw in test_keywords:
        tamil_sentence = service.translate_keyword_to_tamil(kw)
        print(f"\n[Keyword]: {kw}")
        print(f"[Spoken Tamil]: {tamil_sentence}")
        speech_res = service.generate_tamil_speech(tamil_sentence, speaker="meera", pace=1.0)
        print(f"[Audio Tag]: {speech_res.get('html_audio_tag')[:80]}... [Success: {speech_res.get('success')}]")
