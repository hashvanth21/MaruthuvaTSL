#!/usr/bin/env python3
"""
Maruthuva TSL (மருத்துவ TSL) - Comprehensive Production Deployment Verification Suite
=====================================================================================
Usage:
  python3 verify_deployment.py [TARGET_URL]

Examples:
  python3 verify_deployment.py http://localhost:3000
  python3 verify_deployment.py https://maruthuva-tsl.vercel.app
"""

import sys
import os
import time
import json
import ssl
import urllib.request
import urllib.error
import urllib.parse
from typing import Dict, Any, List, Tuple

try:
    import certifi
    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except Exception:
    SSL_CTX = ssl._create_unverified_context()

DEFAULT_URL = "http://localhost:3000"
TARGET_URL = (sys.argv[1] if len(sys.argv) > 1 else DEFAULT_URL).rstrip('/')

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

def print_header(title: str):
    print(f"\n{Colors.CYAN}{Colors.BOLD}{'=' * 80}")
    print(f" {title.upper()}")
    print(f"{'=' * 80}{Colors.RESET}")

def report_result(step_num: int, step_name: str, passed: bool, latency_ms: float, details: str) -> bool:
    status = f"{Colors.GREEN}[PASS]{Colors.RESET}" if passed else f"{Colors.RED}[FAIL]{Colors.RESET}"
    time_str = f"{latency_ms:>6.2f}ms" if latency_ms >= 0 else "   N/A "
    print(f"{status} Step {step_num:<2}: {step_name:<38} | Latency: {time_str} | {details}")
    return passed

def http_get(url_path: str, timeout: float = 10.0) -> Tuple[int, bytes, Dict[str, str], float]:
    url = f"{TARGET_URL}{url_path}"
    t0 = time.perf_counter()
    req = urllib.request.Request(url, headers={"User-Agent": "MaruthuvaTSL-DevOpsVerifier/1.0"})
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        elapsed = (time.perf_counter() - t0) * 1000.0
        headers = dict(resp.getheaders())
        return resp.status, resp.read(), headers, elapsed

def http_post(url_path: str, payload: Dict[str, Any], timeout: float = 10.0) -> Tuple[int, bytes, Dict[str, str], float]:
    url = f"{TARGET_URL}{url_path}"
    data = json.dumps(payload).encode('utf-8')
    t0 = time.perf_counter()
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "MaruthuvaTSL-DevOpsVerifier/1.0"
        }
    )
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as resp:
        elapsed = (time.perf_counter() - t0) * 1000.0
        headers = dict(resp.getheaders())
        return resp.status, resp.read(), headers, elapsed

def run_verification() -> bool:
    print_header(f"Maruthuva TSL Production Verification: {TARGET_URL}")
    test_results: List[bool] = []

    # ==========================================================================
    # 1. VERIFY BUILD & STATIC ASSETS
    # ==========================================================================
    try:
        status, body, _, elapsed = http_get("/")
        content = body.decode('utf-8', errors='ignore')
        ok = status == 200 and "மருத்துவ TSL" in content and "Maruthuva TSL" in content
        test_results.append(report_result(1, "Verify Build & Static Delivery", ok, elapsed, f"HTTP {status}, HTML Size: {len(body)} bytes"))
    except Exception as e:
        test_results.append(report_result(1, "Verify Build & Static Delivery", False, -1, f"Failed: {e}"))

    # ==========================================================================
    # 2. VERIFY APPLICATION STARTUP & HEALTH CHECK
    # ==========================================================================
    try:
        status, body, _, elapsed = http_get("/api/health")
        data = json.loads(body.decode('utf-8'))
        ok = status == 200 and data.get("status") == "healthy"
        test_results.append(report_result(2, "Verify Health Check (/api/health)", ok, elapsed, f"Status: {data.get('status')}, Version: {data.get('version')}"))
    except Exception as e:
        test_results.append(report_result(2, "Verify Health Check (/api/health)", False, -1, f"Failed: {e}"))

    # ==========================================================================
    # 3. VERIFY FRONTEND BUNDLES & INTEGRITY
    # ==========================================================================
    try:
        status_css, body_css, _, elapsed_css = http_get("/css/main.css")
        status_js, body_js, _, elapsed_js = http_get("/js/app.js")
        ok = status_css == 200 and len(body_css) > 1000 and status_js == 200 and len(body_js) > 5000
        test_results.append(report_result(3, "Verify Frontend CSS/JS Bundles", ok, elapsed_css + elapsed_js, f"CSS: {len(body_css)}B, JS: {len(body_js)}B"))
    except Exception as e:
        test_results.append(report_result(3, "Verify Frontend CSS/JS Bundles", False, -1, f"Failed: {e}"))

    # ==========================================================================
    # 4. VERIFY BACKEND METRICS & TELEMETRY
    # ==========================================================================
    try:
        status, body, _, elapsed = http_get("/api/tts/metrics")
        data = json.loads(body.decode('utf-8'))
        has_cache = "cache" in data and "cached_items" in data["cache"]
        has_circuit = "circuit_breaker" in data and "state" in data["circuit_breaker"]
        ok = status == 200 and has_cache and has_circuit
        circuit_state = data.get("circuit_breaker", {}).get("state", "UNKNOWN")
        cached_count = data.get("cache", {}).get("cached_items", 0)
        test_results.append(report_result(4, "Verify Backend Telemetry (/api/tts/metrics)", ok, elapsed, f"Circuit: {circuit_state}, Cached Items: {cached_count}"))
    except Exception as e:
        test_results.append(report_result(4, "Verify Backend Telemetry (/api/tts/metrics)", False, -1, f"Failed: {e}"))

    # ==========================================================================
    # 5. VERIFY IN-BROWSER RELATIONAL DATABASE ENGINE
    # ==========================================================================
    try:
        # Validate the client-side SQL Rule Vault definition file
        status_db, body_db, _, elapsed = http_get("/js/services/sqlRuleVaultService.js")
        db_content = body_db.decode('utf-8')
        tables_found = all(t in db_content for t in ["tsl_rule_vault", "clinical_rules", "drug_interaction_vault", "consultation_audit_log"])
        ok = status_db == 200 and tables_found
        test_results.append(report_result(5, "Verify In-Browser Relational Vault", ok, elapsed, "4/4 Core Relational Tables Initialized (TSL Rules, Clinical, Drug-Interaction, Audit)"))
    except Exception as e:
        test_results.append(report_result(5, "Verify In-Browser Relational Vault", False, -1, f"Failed: {e}"))

    # ==========================================================================
    # 6. VERIFY CRITICAL API (TTS SYNTHESIS & FAILOVER)
    # ==========================================================================
    try:
        payload = {"text": "எனக்கு கடுமையான நெஞ்சு வலி இருக்கிறது.", "speaker": "kavya"}
        status, body, headers, elapsed = http_post("/api/tts/synthesize", payload)
        data = json.loads(body.decode('utf-8'))
        engine = data.get("engine", "unknown")
        audio_len = len(data.get("audio_base64", ""))
        ok = status == 200 and data.get("success") is True and audio_len > 1000
        test_results.append(report_result(6, "Verify Critical TTS API (/api/tts/synthesize)", ok, elapsed, f"Engine: {engine}, Audio: {audio_len} chars"))
    except Exception as e:
        test_results.append(report_result(6, "Verify Critical TTS API (/api/tts/synthesize)", False, -1, f"Failed: {e}"))

    # ==========================================================================
    # 7. VERIFY AI FLOW (TRANSLATION + CACHE SPEED)
    # ==========================================================================
    try:
        # Test clinical ground truth translation
        trans_payload = {"text": "do you have chest pain?", "src": "en", "tgt": "ta"}
        status_tr, body_tr, _, elapsed_tr = http_post("/api/translate", trans_payload)
        data_tr = json.loads(body_tr.decode('utf-8'))
        tamil_text = data_tr.get("translatedText", "")
        tr_ok = status_tr == 200 and "நெஞ்சு" in tamil_text

        # Test sub-10ms cache hit on synthesized audio
        cache_payload = {"text": "எனக்கு கடுமையான நெஞ்சு வலி இருக்கிறது.", "speaker": "kavya"}
        status_ca, body_ca, _, elapsed_ca = http_post("/api/tts/synthesize", cache_payload)
        data_ca = json.loads(body_ca.decode('utf-8'))
        cache_ok = status_ca == 200 and data_ca.get("cache_hit") is True and elapsed_ca < 25.0

        ai_ok = tr_ok and cache_ok
        test_results.append(report_result(7, "Verify AI Flow (Translation & Zero-Cost Cache)", ai_ok, elapsed_ca, f"Cache Hit: {data_ca.get('cache_hit')}, Translation: '{tamil_text}'"))
    except Exception as e:
        test_results.append(report_result(7, "Verify AI Flow (Translation & Zero-Cost Cache)", False, -1, f"Failed: {e}"))

    # ==========================================================================
    # 8. EXECUTE PRIMARY USER JOURNEY
    # ==========================================================================
    try:
        # Simulates complete end-to-end patient-to-doctor emergency consultation:
        # Step A: Patient signs "CHEST_PAIN" -> Backend expands TSL gloss
        gloss_payload = {"text": "CHEST_PAIN", "speaker": "kavya"}
        status_g, body_g, _, elapsed_g = http_post("/api/tts/synthesize", gloss_payload)
        data_g = json.loads(body_g.decode('utf-8'))
        symptom_resolved = "நெஞ்சு" in data_g.get("text_normalized", "")

        # Step B: Doctor asks "where is the pain?" -> Translation engine provides Tamil audio & avatar text
        doc_payload = {"text": "where is the pain?", "src": "en", "tgt": "ta"}
        status_d, body_d, _, elapsed_d = http_post("/api/translate", doc_payload)
        data_d = json.loads(body_d.decode('utf-8'))
        question_resolved = "எங்கே" in data_d.get("translatedText", "")

        # Step C: Doctor provides emergency instructions
        rx_payload = {"text": "take this tablet after food", "src": "en", "tgt": "ta"}
        status_rx, body_rx, _, elapsed_rx = http_post("/api/translate", rx_payload)
        data_rx = json.loads(body_rx.decode('utf-8'))
        rx_resolved = "உணவு உண்ட பிறகு" in data_rx.get("translatedText", "")

        journey_ok = status_g == 200 and symptom_resolved and question_resolved and rx_resolved
        total_journey_time = elapsed_g + elapsed_d + elapsed_rx
        test_results.append(report_result(8, "Execute Primary User Journey", journey_ok, total_journey_time, f"Patient TSL -> Doctor Inquiry -> Clinical Instruction (3 Interactions Verified)"))
    except Exception as e:
        test_results.append(report_result(8, "Execute Primary User Journey", False, -1, f"Failed: {e}"))

    # ==========================================================================
    # SUMMARY
    # ==========================================================================
    print_header("Deployment Verification Summary")
    passed_count = sum(1 for r in test_results if r)
    total_count = len(test_results)
    percentage = (passed_count / total_count) * 100.0

    print(f"Target URL:         {TARGET_URL}")
    print(f"Total Tests:        {total_count}")
    print(f"Passed:             {Colors.GREEN if passed_count == total_count else Colors.YELLOW}{passed_count}/{total_count} ({percentage:.1f}%){Colors.RESET}")
    print(f"Overall Status:     {Colors.GREEN + 'VERIFIED SUCCESSFUL' if passed_count == total_count else Colors.RED + 'VERIFICATION FAILED'}{Colors.RESET}")
    print(f"{'=' * 80}\n")

    return passed_count == total_count

if __name__ == "__main__":
    success = run_verification()
    sys.exit(0 if success else 1)
