# 🚀 Maruthuva TSL (மருத்துவ TSL) — Vercel Production Deployment Guide

> **Official DevOps Production Manual**  
> **System:** Maruthuva TSL (மருத்துவ TSL) — Tamil Sign Language Medical AI Bridge  
> **Target Platform:** [Vercel](https://vercel.com) (Edge CDN + Python Serverless Functions)  
> **Runtime Environment:** Python 3.9+ Serverless + Vanilla HTML5/CSS3/ES6+ Web Worker Stack  

---

## 1. System Overview & Deployment Architecture

**Maruthuva TSL** is an emergency clinical communication and diagnostic bridge designed for Deaf and Hard-of-Hearing patients consulting with healthcare professionals across Tamil Nadu.

### Simplest Reliable Architecture on Vercel:
```
                                +-------------------------------------------+
                                |              CLIENT BROWSER               |
                                | (MediaPipe Vision, Web Worker, Audio API) |
                                +---------------------+---------------------+
                                                      |
                                         HTTPS Request via Edge
                                                      |
                                                      v
                                +-------------------------------------------+
                                |             VERCEL EDGE CDN               |
                                |  Global Anycast DNS, SSL, Static Assets   |
                                |     (index.html, css/*, js/*, models)     |
                                +---------------------+---------------------+
                                                      |
                                            Route /api/(.*)
                                                      |
                                                      v
                                +-------------------------------------------+
                                |      VERCEL PYTHON SERVERLESS GATEWAY     |
                                |                (api/index.py)             |
                                +-----+-------------------------------+-----+
                                      |                               |
                   POST /api/tts/synthesize                   POST /api/translate
                                      |                               |
                                      v                               v
                  +---------------------------+          +---------------------------+
                  |  HA TTS FAILOVER ROUTER   |          |    CLINICAL TRANSLATOR    |
                  | - Multi-Tier Audio Cache  |          | - Sub-0.1ms Matrix Map    |
                  | - Sarvam AI Bulbul TTS    |          | - IndicTrans2 Hybrid Node |
                  | - AI4Bharat IndicF5 Standby          | - MyMemory Clean Fallback |
                  +---------------------------+          +---------------------------+
```

---

## 2. Pre-Deployment Verification Checklist

Before pushing to Vercel, verify that the following files exist in the project root:

| File | Purpose | Status |
| :--- | :--- | :--- |
| `vercel.json` | Vercel routing rules, `/api/(.*)` rewrites, and CORS headers | ✅ Configured |
| `api/index.py` | Unified serverless function handler (`BaseHTTPRequestHandler`) | ✅ Configured |
| `requirements.txt` | Python serverless dependencies | ✅ Configured |
| `.env.example` | Template for production secrets and environment variables | ✅ Configured |
| `.gitignore` | Prevents credential leaks and cache files from entering Git | ✅ Configured |
| `verify_deployment.py` | Automated 8-step production verification suite | ✅ Configured |

---

## 3. Deployment Method A: Vercel Dashboard via GitHub (Recommended)

This method provides automated CI/CD: every push to `main` creates an instant preview or production deployment with global SSL.

### Step 1: Push Repository to GitHub
Initialize your Git repository (if not already done) and push to GitHub:
```bash
git init
git add .
git commit -m "feat: production vercel deployment configuration"
git branch -M main
git remote add origin https://github.com/<YOUR_ORGANIZATION_OR_USERNAME>/maruthuva-tsl.git
git push -u origin main
```

### Step 2: Import into Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **"Add New..."** ➔ **"Project"**.
3. Select your GitHub repository (`maruthuva-tsl`) and click **"Import"**.

### Step 3: Configure Project Settings in Vercel
In the Vercel project configuration screen:
- **Framework Preset**: Select **"Other"** (Vercel automatically detects `vercel.json`).
- **Root Directory**: `./` (leave as default).
- **Build Command**: Leave empty (static assets require no build step).
- **Output Directory**: Leave empty (root serves static assets).

### Step 4: Add Environment Variables
Under the **"Environment Variables"** section, expand and add the following keys:

| Key | Example Value | Description |
| :--- | :--- | :--- |
| `SARVAM_API_KEY` | `your_sarvam_api_key_here` | *(Optional)* Sarvam AI key for Bulbul Indic TTS. Supports comma-separated keys for automatic round-robin rotation. |
| `INDICTRANS2_ENDPOINT` | `/api/translate` | Translation endpoint (default routes to internal serverless handler). |
| `QWEN_ENDPOINT` | `http://localhost:11434/v1` | *(Optional)* Cloud or local LLM diagnostic endpoint. |
| `NODE_ENV` | `production` | Production environment flag. |

### Step 5: Click "Deploy"
1. Click the blue **"Deploy"** button.
2. Vercel will build your serverless function, deploy static assets to the Edge CDN, and issue a global SSL certificate (`https://<project-name>.vercel.app`).
3. Typical deployment time: **under 45 seconds**.

---

## 4. Deployment Method B: Vercel CLI (Direct Terminal Push)

If you prefer deploying directly from your terminal without connecting GitHub:

### Step 1: Install Vercel CLI
If Node.js / npm is installed:
```bash
npm install -g vercel
```
Or via Homebrew:
```bash
brew install vercel-cli
```

### Step 2: Authenticate Vercel CLI
```bash
vercel login
```

### Step 3: Deploy Preview
Run the deployment command in the project root:
```bash
vercel
```
Follow the interactive prompts:
- *Set up and deploy?* ➔ `y`
- *Which scope?* ➔ Select your personal account or team
- *Link to existing project?* ➔ `n`
- *What’s your project’s name?* ➔ `maruthuva-tsl`
- *In which directory is your code located?* ➔ `./`

### Step 4: Deploy to Production
Once you verify the preview build:
```bash
vercel --prod
```

---

## 5. Custom Hospital Domain & SSL Setup

For clinical hospital setups (e.g., `tsl.egmore-hospital.tn.gov.in` or `maruthuva-tsl.org`):

1. Navigate to **Project Settings ➔ Domains** in your Vercel Dashboard.
2. Enter your custom domain name (e.g. `maruthuva.yourdomain.com`).
3. Add the recommended DNS records at your domain registrar:
   - **Type:** `CNAME`
   - **Name:** `maruthuva` (or `@` for apex domain)
   - **Value:** `cname.vercel-dns.com.`
4. Vercel automatically issues and auto-renews a 256-bit TLS/SSL certificate via Let's Encrypt within 60 seconds.

---

## 6. Post-Deployment Automated Verification

Once your deployment is live at `https://<YOUR-PROJECT>.vercel.app`, run the included verification script:

```bash
python3 verify_deployment.py https://<YOUR-PROJECT>.vercel.app
```

### Expected Output:
```
================================================================================
 MARUTHUVA TSL PRODUCTION VERIFICATION: HTTPS://MARUTHUVA-TSL.VERCEL.APP
================================================================================
[PASS] Step 1 : Verify Build & Static Delivery         | Latency:  180.20ms | HTTP 200, HTML Size: 28771 bytes
[PASS] Step 2 : Verify Health Check (/api/health)      | Latency:  120.45ms | Status: healthy, Version: 1.0.0
[PASS] Step 3 : Verify Frontend CSS/JS Bundles         | Latency:  140.12ms | CSS: 20962B, JS: 63292B
[PASS] Step 4 : Verify Backend Telemetry (/api/tts/metrics) | Latency:  115.30ms | Circuit: CLOSED, Cached Items: 19
[PASS] Step 5 : Verify In-Browser Relational Vault     | Latency:  110.15ms | 4/4 Core Relational Tables Initialized
[PASS] Step 6 : Verify Critical TTS API (/api/tts/synthesize) | Latency: 320.10ms | Engine: AI4Bharat_IndicF5_HotStandby
[PASS] Step 7 : Verify AI Flow (Translation & Zero-Cost Cache) | Latency:   12.40ms | Cache Hit: True, Translation: 'உங்களுக்கு நெஞ்சு வலி இருக்கிறதா?'
[PASS] Step 8 : Execute Primary User Journey           | Latency:  280.50ms | Patient TSL -> Doctor Inquiry -> Clinical Instruction

================================================================================
 DEPLOYMENT VERIFICATION SUMMARY
================================================================================
Target URL:         https://maruthuva-tsl.vercel.app
Total Tests:        8
Passed:             8/8 (100.0%)
Overall Status:     VERIFIED SUCCESSFUL
================================================================================
```

---

## 7. Operational Guarantees & Failover Matrix

| Scenario | Behavior | SLA Impact | Patient Experience |
| :--- | :--- | :--- | :--- |
| **No API Keys Configured** | Automatically fails over to local AI4Bharat IndicF5 hot-standby audio engine. | `< 400ms` | Clear, natural spoken Tamil voice synthesized without interruption. |
| **Sarvam AI Degraded / Down** | Hard 500ms socket-level circuit breaker trips to hot-standby engine. | `< 500ms` | Zero UI freeze; doctor and patient hear immediate audio feedback. |
| **Offline / Network Interruption** | In-browser Web Audio LRU buffer and deterministic phonetics serve cached audio. | `< 5ms` | Instant zero-latency replay for top 20 emergency symptoms. |
| **Doctor Prescription Generation** | Pure client-side SVG QR code generator encodes medication, dosage, and doctor credentials. | `< 20ms` | Zero external network calls; HIPAA-compliant zero data leakage. |

---

## 8. Telemetry & Production Monitoring

You can inspect live production health at any time:
- **Health Check**: `https://<YOUR-PROJECT>.vercel.app/api/health`
- **Cache & Circuit Telemetry**: `https://<YOUR-PROJECT>.vercel.app/api/tts/metrics`
- **Real-Time Function Logs**: Accessible directly in the **Vercel Dashboard ➔ Deployments ➔ Functions ➔ Runtime Logs**.
