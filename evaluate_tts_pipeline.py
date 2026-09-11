"""
Tamil TTS & Symptom-to-Speech AI Pipeline Evaluation Suite
===========================================================
Role: AI Evaluation Engineer
Objective: Rigorous, adversarial, and boundary evaluation of the Tamil TTS
orchestrator and failover system across 8 distinct failure modes.
"""

import sys
import time
import json
import struct
import urllib.request
import urllib.error
from typing import Dict, List, Any, Tuple

# Evaluation Test Matrix
EVALUATION_DATASET = [
    # 1. Normal Cases
    {
        "id": "NORM-01",
        "category": "Normal",
        "input": "எனக்கு கடுமையான தலைவலி மற்றும் காய்ச்சல் இருக்கிறது.",
        "description": "Standard multi-symptom Tamil sentence",
        "expect_success": True
    },
    {
        "id": "NORM-02",
        "category": "Normal",
        "input": "தயவுசெய்து உடனே உதவுங்கள், இது அவசர நிலை.",
        "description": "Standard emergency SOS triage prompt",
        "expect_success": True
    },
    {
        "id": "NORM-03",
        "category": "Normal",
        "input": "எனக்கு நெஞ்சு வலி மற்றும் மூச்சுத்திணறல் இருக்கிறது.",
        "description": "Cardiac / respiratory emergency symptom",
        "expect_success": True
    },

    # 2. Difficult Cases
    {
        "id": "DIFF-01",
        "category": "Difficult",
        "input": "எனக்கு Paracetamol 650mg மாத்திரை காலை 1 இரவு 1 உணவு உண்ட பிறகு தேவை.",
        "description": "Mixed Tamil script with English brand name, dosage numbers, and medical instructions",
        "expect_success": True
    },
    {
        "id": "DIFF-02",
        "category": "Difficult",
        "input": "ரத்த அழுத்தம் 140/90 mmHg உள்ளது, சர்க்கரை அளவு 250 mg/dL உள்ளது.",
        "description": "Clinical vitals with forward slashes, units, abbreviations, and numbers",
        "expect_success": True
    },
    {
        "id": "DIFF-03",
        "category": "Difficult",
        "input": "கடந்த 3 நாட்களாக தொடர்ந்து விடாத வறட்டு இருமல், சளி, மற்றும் கடுமையான தொண்டை வலி.",
        "description": "Temporal qualifiers, compound sentence structure with multiple conjunctions",
        "expect_success": True
    },

    # 3. Ambiguous Cases
    {
        "id": "AMB-01",
        "category": "Ambiguous",
        "input": "வலி",
        "description": "Single-word polysemic symptom (pain/agony)",
        "expect_success": True
    },
    {
        "id": "AMB-02",
        "category": "Ambiguous",
        "input": "CHEST_PAIN",
        "description": "Raw TSL sign gloss in uppercase English",
        "expect_success": True
    },
    {
        "id": "AMB-03",
        "category": "Ambiguous",
        "input": "Enakku romba thalaivali irukku doc",
        "description": "Transliterated Tanglish (colloquial Tamil in Roman script)",
        "expect_success": True
    },

    # 4. Adversarial Cases
    {
        "id": "ADV-01",
        "category": "Adversarial",
        "input": "<script>alert('XSS');</script> எனக்கு நெஞ்சு வலி",
        "description": "XSS / HTML script tag injection attack",
        "expect_success": True  # Sanitized and synthesized safely
    },
    {
        "id": "ADV-02",
        "category": "Adversarial",
        "input": "'; DROP TABLE patients; UPDATE users SET role='admin'--",
        "description": "SQL injection vector as symptom input",
        "expect_success": True  # Neutralized as plain text
    },
    {
        "id": "ADV-03",
        "category": "Adversarial",
        "input": "தலைவலி\x00\x08\x0b\x0c\r\n\x1b[31mகாய்ச்சல்\x1b[0m",
        "description": "Embedded null bytes, control characters, and ANSI escape sequences",
        "expect_success": True
    },
    {
        "id": "ADV-04",
        "category": "Adversarial",
        "input": "த\u200d\u200cல\u200dை\u200cவ\u200dல\u200cி" * 15,
        "description": "Unicode homoglyphs stuffed with repeated Zero-Width Joiner (ZWJ) and Non-Joiner (ZWNJ)",
        "expect_success": True
    },

    # 5. Empty Inputs
    {
        "id": "EMP-01",
        "category": "Empty",
        "input": "",
        "description": "Zero-length empty string",
        "expect_success": False  # Should return structured 400 Bad Request, never 500 crash
    },
    {
        "id": "EMP-02",
        "category": "Empty",
        "input": "       \t\n  \r\n  ",
        "description": "Whitespace-only tabs and carriage returns",
        "expect_success": False
    },

    # 6. Invalid Inputs
    {
        "id": "INV-01",
        "category": "Invalid",
        "input": 123456789,
        "description": "Raw integer payload instead of string",
        "expect_success": False
    },
    {
        "id": "INV-02",
        "category": "Invalid",
        "input": ["தலைவலி", "காய்ச்சல்"],
        "description": "JSON array instead of text string",
        "expect_success": False
    },
    {
        "id": "INV-03",
        "category": "Invalid",
        "input": "!@#$%^&*()_+=-{}[]:;\"'<>?,./~`",
        "description": "Pure punctuation and special characters with zero linguistic tokens",
        "expect_success": False
    },

    # 7. Long Inputs
    {
        "id": "LONG-01",
        "category": "Long",
        "input": "எனக்கு கடுமையான தலைவலி இருக்கிறது. " * 20,  # ~740 characters (exceeds Sarvam 490 limit)
        "description": "740-character input exceeding cloud TTS 490-char API limit",
        "expect_success": True  # Should gracefully truncate to 490 chars without breaking audio
    },
    {
        "id": "LONG-02",
        "category": "Long",
        "input": "அவசரம் " * 400,  # ~2800 characters
        "description": "2,800-character flood attack designed to trigger buffer overflow or memory spikes",
        "expect_success": True  # Should truncate safely
    },

    # 8. Unexpected Inputs
    {
        "id": "UNEXP-01",
        "category": "Unexpected",
        "input": "எனக்கு தலைவலி 🤕🤮🤒 severe fever 💔🚨",
        "description": "Mixed Tamil, medical emojis, and English emotional qualifiers",
        "expect_success": True
    },
    {
        "id": "UNEXP-02",
        "category": "Unexpected",
        "input": "തലവേദന പനി (Malayalam) + தலைவலி (Tamil)",
        "description": "Cross-script Dravidian linguistic collision (Malayalam + Tamil)",
        "expect_success": True
    }
]


def validate_wav_header(audio_bytes: bytes) -> Tuple[bool, str]:
    """Inspects byte-level integrity of the RIFF/WAVE header."""
    if not audio_bytes or len(audio_bytes) < 44:
        return False, f"Byte buffer underflow ({len(audio_bytes) if audio_bytes else 0} bytes)"
    if audio_bytes[:4] != b"RIFF":
        return False, f"Invalid RIFF magic: {audio_bytes[:4]!r}"
    if audio_bytes[8:12] != b"WAVE":
        return False, f"Invalid WAVE format identifier: {audio_bytes[8:12]!r}"
    if audio_bytes[12:16] != b"fmt ":
        return False, f"Missing fmt chunk: {audio_bytes[12:16]!r}"
    
    # Check sample rate (must be 22050 or 16000 or 24000)
    sample_rate = struct.unpack("<I", audio_bytes[24:28])[0]
    if sample_rate not in (16000, 22050, 24000, 44100, 48000):
        return False, f"Abnormal sample rate: {sample_rate} Hz"
    
    return True, f"Valid PCM WAV ({sample_rate} Hz, {len(audio_bytes)} bytes)"


def run_evaluation(endpoint: str = "http://localhost:3000/api/tts/synthesize") -> Dict[str, Any]:
    print("=" * 80)
    print("STARTING COMPREHENSIVE AI EVALUATION FOR TAMIL TTS PIPELINE")
    print(f"Target Endpoint: {endpoint}")
    print(f"Total Test Cases: {len(EVALUATION_DATASET)}")
    print("=" * 80)

    results = []
    latencies = []
    passed = 0
    failed = 0

    for test in EVALUATION_DATASET:
        t_id = test["id"]
        cat = test["category"]
        raw_input = test["input"]
        expected_ok = test["expect_success"]
        desc = test["description"]

        start_time = time.perf_counter()
        req_payload = {"text": raw_input, "speaker": "kavya"}

        status_code = None
        response_json = None
        error_msg = None
        is_pass = False
        wav_valid = False
        wav_info = ""

        try:
            req_data = json.dumps(req_payload).encode("utf-8")
            req = urllib.request.Request(
                endpoint,
                data=req_data,
                headers={"Content-Type": "application/json"}
            )
            with urllib.request.urlopen(req, timeout=3.0) as resp:
                elapsed_ms = (time.perf_counter() - start_time) * 1000.0
                status_code = resp.status
                response_json = json.loads(resp.read().decode("utf-8"))

        except urllib.error.HTTPError as he:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            status_code = he.status
            try:
                response_json = json.loads(he.read().decode("utf-8"))
            except Exception:
                response_json = {"error": str(he)}
        except Exception as e:
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            status_code = 0
            error_msg = str(e)

        latencies.append(elapsed_ms)

        # Evaluate against expected behavior
        if expected_ok:
            if status_code == 200 and response_json and response_json.get("success"):
                import base64
                audio_bytes = base64.b64decode(response_json.get("audio_base64", ""))
                wav_valid, wav_info = validate_wav_header(audio_bytes)
                if wav_valid:
                    is_pass = True
                else:
                    error_msg = f"Audio Corruption: {wav_info}"
            else:
                error_msg = f"Expected 200 OK, received {status_code}: {response_json}"
        else:
            # Expected rejection (e.g. empty or invalid input)
            if status_code == 400:
                is_pass = True
            elif status_code == 500:
                is_pass = False
                error_msg = f"Crash Vulnerability: Server unhandled 500 error instead of 400 Bad Request ({response_json})"
            else:
                is_pass = False
                error_msg = f"Invalid status code for bad input: {status_code}"

        if is_pass:
            passed += 1
            status_icon = " PASS "
        else:
            failed += 1
            status_icon = "!FAIL!"

        results.append({
            "id": t_id,
            "category": cat,
            "description": desc,
            "passed": is_pass,
            "status_code": status_code,
            "latency_ms": round(elapsed_ms, 2),
            "error": error_msg,
            "wav_valid": wav_valid,
            "engine": response_json.get("engine") if response_json else "N/A"
        })

        print(f"[{status_icon}] {t_id:<8} | {cat:<11} | Latency: {elapsed_ms:>6.2f}ms | Status: {status_code} | {desc}")
        if not is_pass:
            print(f"         └── ROOT CAUSE: {error_msg}")

    # Summary Statistics
    sorted_latencies = sorted(latencies)
    p50 = sorted_latencies[int(len(latencies) * 0.50)]
    p95 = sorted_latencies[int(len(latencies) * 0.95)]
    p99 = sorted_latencies[-1]

    print("\n" + "=" * 80)
    print("EVALUATION METRICS & SLA COMPLIANCE SUMMARY")
    print("=" * 80)
    print(f"Total Test Cases:       {len(EVALUATION_DATASET)}")
    print(f"Passed:                 {passed} ({passed/len(EVALUATION_DATASET)*100:.1f}%)")
    print(f"Failed:                 {failed} ({failed/len(EVALUATION_DATASET)*100:.1f}%)")
    print(f"Latency P50:            {p50:.2f} ms")
    print(f"Latency P95:            {p95:.2f} ms")
    print(f"Latency Max (P99):      {p99:.2f} ms")
    print(f"Sub-500ms SLA Pass:     {p95 < 500.0} (P95: {p95:.2f}ms vs 500ms ceiling)")
    print("=" * 80)

    return {
        "total": len(EVALUATION_DATASET),
        "passed": passed,
        "failed": failed,
        "p50": p50,
        "p95": p95,
        "p99": p99,
        "results": results
    }

if __name__ == "__main__":
    run_evaluation()
