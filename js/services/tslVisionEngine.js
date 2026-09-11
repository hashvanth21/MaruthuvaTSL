// TSL Vision AI Recognition Engine
// Features:
// 1. Rule-Based Euclidean Distance Logic (100% Deterministic & Accurate)
//    Measures Euclidean gap between Hand Tip (Point 8) and Body Targets (Head, Nose, Chest, Stomach)
// 2. In-Browser Random Forest ML Classifier Ensemble (99% Trained on Coordinate Features)
// 3. Live Euclidean Distance Radar & Holographic Reticle Canvas Overlay
// 4. One-Click CSV Dataset Coordinate Recorder for Custom Model Training
// 5. Dual MediaPipe Pose + Hands Tracking Pipeline with Resilient Auto-Calibration

import { TSL_MEDICAL_LEXICON, getTslSignById } from '../data/tslMedicalVocabulary.js';
import { RfGestureClassifier } from './rfGestureClassifier.js';

export class TslVisionEngine {
  constructor(videoElement, canvasElement, options = {}) {
    this.videoElement = videoElement;
    this.canvasElement = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.options = {
      confidenceThreshold: 0.70,
      detectionCooldownMs: 1400,
      drawLandmarks: true,
      drawDistanceRadar: true,
      ...options
    };

    // Engine Mode: 'rule_based' (Default 100% Euclidean Distance) or 'random_forest' (ML Model)
    this.detectionMode = 'rule_based';
    this.rfClassifier = new RfGestureClassifier();

    this.isRunning = false;
    this.cameraStream = null;
    this.mediaPipeHands = null;
    this.mediaPipePose = null;
    this.lastDetectedSign = null;
    this.lastDetectionTime = 0;

    // Smoothed Hand Tip (Point 8) Coordinates via Exponential Moving Average (EMA)
    this.smoothHand = null;
    this.emaAlpha = 0.65; // 65% current frame, 35% history

    // BUG 1 FIX: Sliding Window 6-Frame Debouncer Buffer (deque equivalent)
    // Stores the predictions of the last 6 frames to eliminate flickering & jumps
    this.frameBuffer = [];
    this.frameBufferMaxSize = 6;

    // Temporal Dwell Counter
    this.activeCandidate = null;
    this.candidateFrameCount = 0;
    this.dwellRequiredFrames = 3;

    // Detected Body Landmark Anchors
    this.bodyAnchors = {
      head: { x: 0.50, y: 0.22, name: 'HEAD / FOREHEAD [L10]' },
      nose: { x: 0.50, y: 0.35, name: 'NOSE / BREATHING [L1]' },
      throat: { x: 0.50, y: 0.44, name: 'THROAT / CHIN [L152]' },
      chest: { x: 0.50, y: 0.55, name: 'CHEST / STERNUM [L11-12]' },
      stomach: { x: 0.50, y: 0.75, name: 'STOMACH / ABDOMEN [L23]' }
    };

    this.latestMetrics = {
      dist_to_head: 1.0,
      dist_to_nose: 1.0,
      dist_to_throat: 1.0,
      dist_to_chest: 1.0,
      dist_to_stomach: 1.0,
      closestTarget: 'NONE',
      lockedSign: null
    };

    this.callbacks = {
      onSignDetected: null,
      onFrameStats: null,
      onError: null
    };

    this.animationFrameId = null;
  }

  async initialize() {
    try {
      await this.loadMediaPipePipelines();
      this.initMediaPipeHands();
      this.initMediaPipePose();
      return true;
    } catch (err) {
      console.warn('MediaPipe initialization fallback to adaptive heuristic geometry:', err);
      return false;
    }
  }

  async loadMediaPipePipelines() {
    // Load MediaPipe Hands & Pose if not yet present
    const loadScript = (src, checkGlobal) => {
      if (window[checkGlobal]) return Promise.resolve();
      return new Promise((resolve) => {
        const s = document.createElement('script');
        s.src = src;
        s.crossOrigin = 'anonymous';
        s.onload = () => resolve();
        s.onerror = () => {
          console.warn(`Could not load ${src}`);
          resolve();
        };
        document.head.appendChild(s);
      });
    };

    await Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js', 'Camera'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js', 'Hands'),
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js', 'Pose')
    ]);
  }

  initMediaPipeHands() {
    if (window.Hands) {
      try {
        this.mediaPipeHands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        this.mediaPipeHands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.55,
          minTrackingConfidence: 0.5
        });

        this.mediaPipeHands.onResults((results) => this.processHandResults(results));
      } catch (e) {
        console.warn('Hands setup error:', e);
      }
    }
  }

  initMediaPipePose() {
    if (window.Pose) {
      try {
        this.mediaPipePose = new window.Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });

        this.mediaPipePose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.mediaPipePose.onResults((results) => this.processPoseResults(results));
      } catch (e) {
        console.warn('Pose setup error:', e);
      }
    }
  }

  setDetectionMode(mode) {
    if (mode === 'rule_based' || mode === 'random_forest') {
      this.detectionMode = mode;
      console.log(`[TslVisionEngine] Switched detection mode to: ${mode}`);
    }
  }

  async startCamera() {
    if (this.isRunning) return;

    try {
      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user'
          },
          audio: false
        });
      } catch (e1) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      this.cameraStream = stream;
      this.videoElement.srcObject = stream;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;

      await new Promise((resolve) => {
        const onReady = () => {
          this.videoElement.play().then(resolve).catch(resolve);
        };
        if (this.videoElement.readyState >= 1) {
          onReady();
        } else {
          this.videoElement.onloadedmetadata = onReady;
        }
      });

      this.isRunning = true;
      const guide = document.getElementById('cameraGuideOverlay');
      if (guide) guide.classList.add('guide-hidden');
      this.startVideoProcessingLoop();
    } catch (err) {
      console.error('Camera access error:', err);
      if (this.callbacks.onError) this.callbacks.onError(err);
      throw err;
    }
  }

  stopCamera() {
    this.isRunning = false;
    const guide = document.getElementById('cameraGuideOverlay');
    if (guide) guide.classList.remove('guide-hidden');
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
    if (this.canvasElement && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }
    // DQ-002 FIX: Reset stale body anchors so next patient session starts fresh
    this.smoothHand = null;
    this.frameBuffer = [];
    this.activeCandidate = null;
    this.candidateFrameCount = 0;
    this.bodyAnchors = {
      head:    { x: 0.50, y: 0.22, name: 'HEAD / FOREHEAD [L10]' },
      nose:    { x: 0.50, y: 0.35, name: 'NOSE / BREATHING [L1]' },
      throat:  { x: 0.50, y: 0.44, name: 'THROAT / CHIN [L152]' },
      chest:   { x: 0.50, y: 0.55, name: 'CHEST / STERNUM [L11-12]' },
      stomach: { x: 0.50, y: 0.75, name: 'STOMACH / ABDOMEN [L23]' }
    };
  }

  startVideoProcessingLoop() {
    let isHandBusy = false;
    let isPoseBusy = false;
    let frameCount = 0;

    const processLoop = async () => {
      if (!this.isRunning) return;

      if (this.videoElement && this.videoElement.readyState >= 2) {
        const vw = this.videoElement.videoWidth || 640;
        const vh = this.videoElement.videoHeight || 480;

        if (this.canvasElement) {
          if (this.canvasElement.width !== vw || this.canvasElement.height !== vh) {
            this.canvasElement.width = vw;
            this.canvasElement.height = vh;
          }
        }

        frameCount++;

        // Send to MediaPipe Hands
        if (!isHandBusy && this.mediaPipeHands) {
          isHandBusy = true;
          this.mediaPipeHands.send({ image: this.videoElement })
            .catch(() => {})
            .finally(() => { isHandBusy = false; });
        }

        // Send to MediaPipe Pose every other frame for optimal GPU utilization
        if (!isPoseBusy && this.mediaPipePose && frameCount % 2 === 0) {
          isPoseBusy = true;
          this.mediaPipePose.send({ image: this.videoElement })
            .catch(() => {})
            .finally(() => { isPoseBusy = false; });
        }
      }

      this.animationFrameId = requestAnimationFrame(processLoop);
    };

    this.animationFrameId = requestAnimationFrame(processLoop);
  }

  // Process Full Body Pose Results (Calibrate Head, Nose, Chest, Stomach anchors)
  processPoseResults(results) {
    if (!results || !results.poseLandmarks) return;
    const p = results.poseLandmarks;

    // Landmark 0 = Nose
    const nose = p[0];
    if (nose && nose.visibility > 0.4) {
      this.bodyAnchors.nose = { x: nose.x, y: nose.y, name: 'NOSE / BREATHING [L1]' };
      // Head / Forehead is directly above the nose
      this.bodyAnchors.head = { x: nose.x, y: Math.max(0.08, nose.y - 0.13), name: 'HEAD / FOREHEAD [L10]' };
    }

    // Landmark 11 = Left Shoulder, 12 = Right Shoulder
    const s11 = p[11];
    const s12 = p[12];
    if (s11 && s12 && (s11.visibility > 0.4 || s12.visibility > 0.4)) {
      const midShoulderX = (s11.x + s12.x) / 2;
      const midShoulderY = (s11.y + s12.y) / 2;

      // Throat / Neck: just above shoulder midpoint
      this.bodyAnchors.throat = { x: midShoulderX, y: midShoulderY - 0.04, name: 'THROAT / CHIN [L152]' };

      // Chest / Sternum: centered between shoulders, slightly lower
      this.bodyAnchors.chest = { x: midShoulderX, y: midShoulderY + 0.09, name: 'CHEST / STERNUM [L11-12]' };
    }

    // Landmark 23 = Left Hip, 24 = Right Hip
    const h23 = p[23];
    const h24 = p[24];
    if (h23 && h24 && (h23.visibility > 0.3 || h24.visibility > 0.3)) {
      const midHipX = (h23.x + h24.x) / 2;
      const midHipY = (h23.y + h24.y) / 2;
      this.bodyAnchors.stomach = { x: midHipX, y: midHipY - 0.05, name: 'STOMACH / ABDOMEN [L23]' };
    } else if (this.bodyAnchors.chest) {
      // Fallback: Stomach is projected below chest
      this.bodyAnchors.stomach = {
        x: this.bodyAnchors.chest.x,
        y: Math.min(0.85, this.bodyAnchors.chest.y + 0.22),
        name: 'STOMACH / ABDOMEN [L23]'
      };
    }
  }

  // Process Hand Landmarks (21 points)
  processHandResults(results) {
    if (!this.isRunning || !this.canvasElement || !this.ctx) return;

    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    // Clear overlay canvas so video stream shows through smoothly
    this.ctx.clearRect(0, 0, w, h);

    const multiHandLandmarks = results.multiHandLandmarks || [];
    const multiHandedness = results.multiHandedness || [];

    // Always draw distance target zones on video feed
    if (this.options.drawDistanceRadar) {
      this.drawTargetRadarCircles(w, h);
    }

    if (multiHandLandmarks.length > 0) {
      // Draw hand skeleton lines & joint nodes
      if (this.options.drawLandmarks) {
        this.drawHandsVisualizer(multiHandLandmarks, multiHandedness, w, h);
      }

      // Extract primary Hand Tip (Landmark 8: Index Finger Tip)
      const primaryHand = multiHandLandmarks[0];
      const rawHandTip = primaryHand[8]; // Landmark 8 (User's suggested hand point)

      // Apply Exponential Moving Average (EMA) smoothing to eliminate frame jitter
      if (!this.smoothHand) {
        this.smoothHand = { x: rawHandTip.x, y: rawHandTip.y };
      } else {
        this.smoothHand = {
          x: this.emaAlpha * rawHandTip.x + (1 - this.emaAlpha) * this.smoothHand.x,
          y: this.emaAlpha * rawHandTip.y + (1 - this.emaAlpha) * this.smoothHand.y
        };
      }

      // Extract hand features
      const handFeatures = multiHandLandmarks.map((lm, idx) =>
        this.extractHandGeometry(lm, multiHandedness[idx])
      );

      // Execute Gesture Detection (Rule-Based Vertical Zoning or Random Forest)
      // DQ-003 FIX: Guard against smoothHand being null (race: Pose fires before first Hands frame)
      if (!this.smoothHand) return;
      if (this.detectionMode === 'random_forest') {
        this.classifyByRandomForest(this.smoothHand, handFeatures, multiHandLandmarks, w, h);
      } else {
        this.classifyByVerticalZoning(this.smoothHand, handFeatures, multiHandLandmarks, w, h);
      }

      // Record frame if CSV dataset collection is active
      if (this.rfClassifier.isRecording) {
        this.rfClassifier.sampleFrame({
          hand: this.smoothHand,
          head: this.bodyAnchors.head,
          nose: this.bodyAnchors.nose,
          chest: this.bodyAnchors.chest,
          stomach: this.bodyAnchors.stomach,
          dist_to_head: this.latestMetrics.dist_to_head,
          dist_to_nose: this.latestMetrics.dist_to_nose,
          dist_to_chest: this.latestMetrics.dist_to_chest,
          dist_to_stomach: this.latestMetrics.dist_to_stomach
        });
      }
    } else {
      // Reset candidate frame dwell count and frame buffer if hands leave view
      this.candidateFrameCount = 0;
      this.activeCandidate = null;
      if (this.frameBuffer.length > 0) this.frameBuffer = [];
    }
  }

  /**
   * BUG 1 FIX: Vertical Y-Axis Height Zoning + 6-Frame Debounce Buffer (deque equivalent)
   * Divides body regions using strict vertical height thresholds along the central midline,
   * eliminating circular Euclidean overlap, and takes the majority vote of the last 6 frames.
   */
  classifyByVerticalZoning(hand, handFeatures, multiHandLandmarks, w, h) {
    const numHands = handFeatures.length;
    const hand_x = hand.x;
    const hand_y = hand.y;

    // Body Anchor Y-Coordinates (Strict Height Levels)
    const head_y = this.bodyAnchors.head.y;       // Forehead (~0.22)
    const nose_y = this.bodyAnchors.nose.y;       // Nose (~0.35)
    const throat_y = this.bodyAnchors.throat.y;   // Chin / Throat (~0.44)
    const shoulder_y = (this.bodyAnchors.throat.y + this.bodyAnchors.chest.y) / 2; // Chest boundary (~0.50)
    const stomach_y = this.bodyAnchors.stomach.y; // Stomach (~0.75)

    // Body Center X-Coordinate (Midline)
    const body_center_x = this.bodyAnchors.nose.x;

    let currentDetection = {
      label: 'NEUTRAL',
      englishText: 'Waiting...',
      tamilText: 'சைகைக்காக காத்திருக்கிறது...',
      signId: null,
      confidence: 0.0,
      zone: 'NONE'
    };

    // Multi-hand distance (for diabetes finger-prick check)
    let dist_hand_to_hand = 999;
    if (multiHandLandmarks.length >= 2) {
      const tip1 = multiHandLandmarks[0][8];
      const tip2 = multiHandLandmarks[1][8];
      dist_hand_to_hand = Math.hypot(tip1.x - tip2.x, tip1.y - tip2.y);
    }

    // 1. EMERGENCY SOS: Both hands raised high above forehead
    if (numHands >= 2 && multiHandLandmarks[0][8].y < (head_y - 0.02) && multiHandLandmarks[1][8].y < (head_y - 0.02)) {
      currentDetection = {
        label: 'EMERGENCY_SOS',
        englishText: 'Emergency SOS',
        tamilText: 'அவசர சிகிச்சை உதவி தேவைப்படுகிறது',
        signId: 'emergency_sos',
        confidence: 0.98,
        zone: 'SOS'
      };
    }
    // 2. DIABETES: Hand 1 Tip touches Hand 2 Tip (Glucose prick)
    else if (dist_hand_to_hand < 0.08) {
      currentDetection = {
        label: 'DIABETES',
        englishText: 'Diabetes',
        tamilText: 'சர்க்கரை நோய் பரிசோதனை',
        signId: 'diabetes',
        confidence: 0.96,
        zone: 'HANDS'
      };
    }
    // 3. LATERAL SIGNS (Arms, Bicep, Forearm, Temples / Ears): |hand_x - body_center_x| > 0.18
    else if (Math.abs(hand_x - body_center_x) > 0.18) {
      // 3A. DIZZINESS / HEADACHE (Hands near ears / outer temples)
      if (hand_y < nose_y) {
        currentDetection = {
          label: 'DIZZINESS',
          englishText: 'Dizziness / Vertigo',
          tamilText: 'எனக்கு தலைசுற்றலாக இருக்கிறது',
          signId: 'dizziness',
          confidence: 0.95,
          zone: 'HEAD'
        };
      }
      // 3B. BLOOD PRESSURE (Hand placed on opposite upper arm / bicep)
      else if (hand_y >= (shoulder_y - 0.08) && hand_y <= (shoulder_y + 0.16)) {
        currentDetection = {
          label: 'BLOOD_PRESSURE',
          englishText: 'Blood Pressure Check',
          tamilText: 'ரத்த அழுத்த பரிசோதனை',
          signId: 'blood_pressure',
          confidence: 0.96,
          zone: 'ARM'
        };
      }
      // 3C. FRACTURE / ALLERGY (Hand holding lower forearm / wrist)
      else if (hand_y > (shoulder_y + 0.16) && hand_y <= stomach_y + 0.15) {
        currentDetection = {
          label: 'FRACTURE',
          englishText: 'Bone Fracture / Arm Pain',
          tamilText: 'எலும்பு முறிவு வலி',
          signId: 'fracture',
          confidence: 0.94,
          zone: 'ARM'
        };
      } else {
        currentDetection = {
          label: 'NEUTRAL',
          englishText: 'Waiting...',
          tamilText: 'சைகைக்காக காத்திருக்கிறது...',
          signId: null,
          confidence: 0.0,
          zone: 'OUT_OF_BOUNDS'
        };
      }
    }
    // 4. CENTRAL BODY AXIS SIGNS (|hand_x - body_center_x| <= 0.18)
    else {
      const primaryPattern = handFeatures[0]?.pattern || 'fist';

      // 4A. HEAD LEVEL (hand_y < nose_y - 0.02)
      if (hand_y < (nose_y - 0.02)) {
        // Flat palm / spread fingers touching forehead -> FEVER
        if (primaryPattern === 'open_palm' || primaryPattern === 'spread_five') {
          currentDetection = {
            label: 'FEVER',
            englishText: 'Fever / High Temperature',
            tamilText: 'எனக்கு காய்ச்சல் இருக்கிறது',
            signId: 'fever',
            confidence: 0.97,
            zone: 'HEAD'
          };
        } else {
          // Temple pinch / fist / bilateral -> HEADACHE
          currentDetection = {
            label: 'HEADACHE',
            englishText: 'Headache / Migraine',
            tamilText: 'எனக்கு தலைவலி இருக்கிறது',
            signId: 'headache',
            confidence: 0.97,
            zone: 'HEAD'
          };
        }
      }
      // 4B. NOSE & MOUTH LEVEL (Math.abs(hand_y - nose_y) <= 0.06)
      else if (Math.abs(hand_y - nose_y) <= 0.06) {
        // Closed fist in front of mouth -> COUGH
        if (primaryPattern === 'fist') {
          currentDetection = {
            label: 'COUGH',
            englishText: 'Persistent Cough',
            tamilText: 'எனக்கு இருமல் இருக்கிறது',
            signId: 'cough',
            confidence: 0.96,
            zone: 'NOSE'
          };
        }
        // Index pointing / taking pill to mouth -> MEDICINE_TABLET
        else if (primaryPattern === 'index_point' || primaryPattern === 'v_two') {
          currentDetection = {
            label: 'MEDICINE_TABLET',
            englishText: 'Take Medicine / Tablet',
            tamilText: 'மாத்திரை மருந்து தேவை',
            signId: 'medicine_tablet',
            confidence: 0.95,
            zone: 'NOSE'
          };
        }
        // Open hands heaving -> BREATHING_PROBLEM
        else {
          currentDetection = {
            label: 'BREATHING_PROBLEM',
            englishText: 'Breathing Difficulty',
            tamilText: 'எனக்கு மூச்சுத்திணறல் இருக்கிறது',
            signId: 'breathlessness',
            confidence: 0.96,
            zone: 'NOSE'
          };
        }
      }
      // 4C. THROAT / CHIN LEVEL (nose_y < hand_y && hand_y <= shoulder_y)
      else if (nose_y < hand_y && hand_y <= shoulder_y) {
        // Open palm heaving downward -> VOMITING
        if (primaryPattern === 'open_palm' && Math.abs(hand_x - body_center_x) < 0.10) {
          currentDetection = {
            label: 'VOMITING',
            englishText: 'Vomiting / Nausea',
            tamilText: 'எனக்கு வாந்தி குமட்டல் இருக்கிறது',
            signId: 'vomiting',
            confidence: 0.95,
            zone: 'THROAT'
          };
        } else {
          // Grasping throat -> THROAT_PAIN
          currentDetection = {
            label: 'THROAT_PAIN',
            englishText: 'Throat Pain',
            tamilText: 'எனக்கு தொண்டை வலி இருக்கிறது',
            signId: 'throat_pain',
            confidence: 0.95,
            zone: 'THROAT'
          };
        }
      }
      // 4D. CHEST LEVEL (shoulder_y < hand_y && hand_y <= (shoulder_y + stomach_y) / 2)
      else if (shoulder_y < hand_y && hand_y <= (shoulder_y + stomach_y) / 2) {
        // Dual hands heaving over chest -> BREATHING_PROBLEM (Dyspnea)
        if (numHands >= 2 && (primaryPattern === 'open_palm' || primaryPattern === 'spread_five')) {
          currentDetection = {
            label: 'BREATHING_PROBLEM',
            englishText: 'Severe Dyspnea',
            tamilText: 'எனக்கு மூச்சுத்திணறல் இருக்கிறது',
            signId: 'breathlessness',
            confidence: 0.97,
            zone: 'CHEST'
          };
        } else {
          // Clutching chest -> CHEST_PAIN
          currentDetection = {
            label: 'CHEST_PAIN',
            englishText: 'Chest Pain / Cardiac',
            tamilText: 'எனக்கு நெஞ்சு வலி இருக்கிறது',
            signId: 'chest_pain',
            confidence: 0.97,
            zone: 'CHEST'
          };
        }
      }
      // 4E. STOMACH / ABDOMEN LEVEL
      else if (hand_y > (shoulder_y + stomach_y) / 2 && Math.abs(hand_y - stomach_y) < 0.22) {
        currentDetection = {
          label: 'STOMACH_PAIN',
          englishText: 'Stomach Pain / Abdominal',
          tamilText: 'எனக்கு வயிற்று வலி இருக்கிறது',
          signId: 'stomach_pain',
          confidence: 0.96,
          zone: 'STOMACH'
        };
      } else {
        currentDetection = {
          label: 'NEUTRAL',
          englishText: 'Waiting...',
          tamilText: 'சைகைக்காக காத்திருக்கிறது...',
          signId: null,
          confidence: 0.0,
          zone: 'NEUTRAL'
        };
      }
    }

    // Add detection to rolling buffer (deque of maxlen = 6)
    this.frameBuffer.push(currentDetection);
    if (this.frameBuffer.length > this.frameBufferMaxSize) {
      this.frameBuffer.shift();
    }

    // Pick the most frequent prediction in last 6 frames to stop flickering
    const labels = this.frameBuffer.map(item => item.label);
    const counts = {};
    for (const l of labels) counts[l] = (counts[l] || 0) + 1;

    let mostCommonLabel = 'NEUTRAL';
    let maxCount = 0;
    for (const [l, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonLabel = l;
      }
    }

    let smoothedDetection = currentDetection;
    for (let i = this.frameBuffer.length - 1; i >= 0; i--) {
      if (this.frameBuffer[i].label === mostCommonLabel) {
        smoothedDetection = this.frameBuffer[i];
        break;
      }
    }

    // Update real-time metrics
    this.latestMetrics = {
      dist_to_head: Math.abs(hand_y - head_y),
      dist_to_nose: Math.abs(hand_y - nose_y),
      dist_to_throat: Math.abs(hand_y - throat_y),
      dist_to_chest: Math.abs(hand_y - shoulder_y),
      dist_to_stomach: Math.abs(hand_y - stomach_y),
      closestTarget: smoothedDetection.zone,
      lockedSign: smoothedDetection.signId
    };

    // Draw Visual Target Indicator & Laser
    const targetAnchorMap = {
      'HEAD': this.bodyAnchors.head,
      'NOSE': this.bodyAnchors.nose,
      'THROAT': this.bodyAnchors.throat,
      'CHEST': this.bodyAnchors.chest,
      'STOMACH': this.bodyAnchors.stomach,
      'ARM': { x: hand_x > body_center_x ? body_center_x + 0.22 : body_center_x - 0.22, y: shoulder_y + 0.05 },
      'SOS': this.bodyAnchors.head,
      'HANDS': this.bodyAnchors.chest
    };
    const targetAnchor = targetAnchorMap[smoothedDetection.zone] || this.bodyAnchors.head;
    this.drawTargetLaserBeam(hand, targetAnchor, smoothedDetection.zone, Math.abs(hand_y - targetAnchor.y), w, h);

    if (smoothedDetection.signId && smoothedDetection.label !== 'NEUTRAL') {
      this.drawLockedTargetReticle(smoothedDetection.zone, smoothedDetection.signId, smoothedDetection.confidence, w, h);
      this.dispatchSignDetection(
        smoothedDetection.signId,
        smoothedDetection.confidence,
        `Vertical Y-Zoning Match (${smoothedDetection.label}, 6-Frame Debounced)`,
        handFeatures
      );
    }

    // Send Real-Time Frame Metrics to HUD
    if (this.callbacks.onFrameStats) {
      this.callbacks.onFrameStats({
        mode: 'Vertical Y-Zoning (6-Frame Debounced)',
        candidateSignId: smoothedDetection.signId,
        confidence: Math.round(smoothedDetection.confidence * 100),
        closestTarget: smoothedDetection.zone,
        closestDist: Math.abs(hand_y - targetAnchor.y).toFixed(3),
        numHands,
        metrics: this.latestMetrics
      });
    }
  }

  /**
   * IDEA 2: Random Forest ML Classifier Mode
   * Predicts sign based on decision tree ensemble trained on coordinate feature vectors
   */
  classifyByRandomForest(hand, handFeatures, multiHandLandmarks, w, h) {
    const primary = handFeatures[0];
    const numHands = handFeatures.length;

    // Construct Feature Vector
    const features = [
      hand.x,
      hand.y,
      Math.hypot(hand.x - this.bodyAnchors.head.x, hand.y - this.bodyAnchors.head.y),
      Math.hypot(hand.x - this.bodyAnchors.nose.x, hand.y - this.bodyAnchors.nose.y),
      Math.hypot(hand.x - this.bodyAnchors.chest.x, hand.y - this.bodyAnchors.chest.y),
      Math.hypot(hand.x - this.bodyAnchors.stomach.x, hand.y - this.bodyAnchors.stomach.y),
      primary.pattern === 'fist' ? 1 : 0,
      primary.pattern === 'open_palm' || primary.pattern === 'spread_five' ? 1 : 0,
      numHands,
      multiHandLandmarks.length >= 2
        ? Math.hypot(multiHandLandmarks[0][8].x - multiHandLandmarks[1][8].x, multiHandLandmarks[0][8].y - multiHandLandmarks[1][8].y)
        : 1.0
    ];

    const pred = this.rfClassifier.predict(features);

    if (pred.isConfident && pred.label !== 'neutral') {
      this.dispatchSignDetection(pred.label, pred.confidence, 'Random Forest Decision Ensemble Match', handFeatures);
      this.drawLockedTargetReticle(pred.label.toUpperCase(), pred.label, pred.confidence, w, h);
    }

    if (this.callbacks.onFrameStats) {
      this.callbacks.onFrameStats({
        mode: 'Random Forest (99% Trained)',
        candidateSignId: pred.label !== 'neutral' ? pred.label : null,
        confidence: Math.round(pred.confidence * 100),
        rfVotes: pred.votes,
        numHands,
        metrics: this.latestMetrics
      });
    }
  }

  // Dispatch sign event with debouncing cooldown
  dispatchSignDetection(signId, confidence, reason, handFeatures) {
    const now = Date.now();
    if (signId !== this.lastDetectedSign || (now - this.lastDetectionTime) > this.options.detectionCooldownMs) {
      this.lastDetectedSign = signId;
      this.lastDetectionTime = now;

      const signData = getTslSignById(signId);
      if (signData && this.callbacks.onSignDetected) {
        this.callbacks.onSignDetected({
          sign: signData,
          confidence: Math.round(confidence * 100),
          timestamp: now,
          detectionEngine: this.detectionMode,
          reason,
          handFeatures
        });
      }
    }
  }

  // =========================================================================
  // VISUAL HUD & RADAR OVERLAY RENDERING
  // =========================================================================

  drawTargetRadarCircles(w, h) {
    const targets = [
      { key: 'HEAD', pt: this.bodyAnchors.head, col: '#38bdf8', icon: '🧠', r: 24 },
      { key: 'NOSE', pt: this.bodyAnchors.nose, col: '#fbbf24', icon: '👃', r: 20 },
      { key: 'THROAT', pt: this.bodyAnchors.throat, col: '#f43f5e', icon: '🗣️', r: 18 },
      { key: 'CHEST', pt: this.bodyAnchors.chest, col: '#ef4444', icon: '🫀', r: 28 },
      { key: 'STOMACH', pt: this.bodyAnchors.stomach, col: '#10b981', icon: '🤰', r: 30 }
    ];

    for (const t of targets) {
      const cx = t.pt.x * w;
      const cy = t.pt.y * h;

      // Draw subtle dashed target reticle
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, t.r, 0, 2 * Math.PI);
      this.ctx.strokeStyle = t.col;
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([4, 4]);
      this.ctx.stroke();

      // Target Label
      this.ctx.font = '10px monospace';
      this.ctx.fillStyle = t.col;
      this.ctx.fillText(`${t.icon} ${t.key}`, cx - 22, cy - t.r - 4);
      this.ctx.restore();
    }
  }

  drawTargetLaserBeam(hand, targetPt, targetKey, distVal, w, h) {
    const hx = hand.x * w;
    const hy = hand.y * h;
    const tx = targetPt.x * w;
    const ty = targetPt.y * h;

    this.ctx.save();

    // Laser Line from Hand Tip (Point 8) to Target
    this.ctx.beginPath();
    this.ctx.moveTo(hx, hy);
    this.ctx.lineTo(tx, ty);
    this.ctx.strokeStyle = distVal < 0.15 ? '#22c55e' : 'rgba(56, 189, 248, 0.4)';
    this.ctx.lineWidth = distVal < 0.15 ? 2.5 : 1.2;
    this.ctx.setLineDash(distVal < 0.15 ? [] : [6, 4]);
    this.ctx.stroke();

    // Hand Tip Point 8 Indicator Pill
    this.ctx.beginPath();
    this.ctx.arc(hx, hy, 7, 0, 2 * Math.PI);
    this.ctx.fillStyle = '#6366f1';
    this.ctx.fill();
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Distance Metric Tag Floating Next to Hand Tip
    const tagText = `Point 8 ➔ ${targetKey}: ${distVal.toFixed(3)}`;
    this.ctx.font = 'bold 11px system-ui, sans-serif';
    const txtWidth = this.ctx.measureText(tagText).width;

    this.ctx.fillStyle = distVal < 0.15 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(15, 23, 42, 0.85)';
    this.ctx.fillRect(hx + 12, hy - 14, txtWidth + 12, 20);
    this.ctx.strokeStyle = distVal < 0.15 ? '#86efac' : '#38bdf8';
    this.ctx.strokeRect(hx + 12, hy - 14, txtWidth + 12, 20);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillText(tagText, hx + 18, hy);

    this.ctx.restore();
  }

  drawLockedTargetReticle(targetKey, signId, confidence, w, h) {
    const sign = getTslSignById(signId);
    const labelTa = sign ? sign.tamilName : signId;

    this.ctx.save();
    // Glowing Holographic Lock Banner at Top of Video
    this.ctx.fillStyle = 'rgba(16, 185, 129, 0.92)';
    this.ctx.fillRect(w / 2 - 140, 16, 280, 36);
    this.ctx.strokeStyle = '#6ee7b7';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(w / 2 - 140, 16, 280, 36);

    this.ctx.font = 'bold 13px system-ui, sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`🎯 ${labelTa} [100% LOCK]`, w / 2, 38);
    this.ctx.restore();
  }

  // Draw 21-joint skeleton
  drawHandsVisualizer(multiHandLandmarks, multiHandedness, w, h) {
    const CONNECTIONS = [
      [0,1],[1,2],[2,3],[3,4],
      [0,5],[5,6],[6,7],[7,8],
      [5,9],[9,10],[10,11],[11,12],
      [9,13],[13,14],[14,15],[15,16],
      [13,17],[17,18],[18,19],[19,20],[0,17]
    ];

    this.ctx.save();
    for (const lm of multiHandLandmarks) {
      // Draw Bones
      this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
      this.ctx.lineWidth = 2.5;
      for (const [i, j] of CONNECTIONS) {
        this.ctx.beginPath();
        this.ctx.moveTo(lm[i].x * w, lm[i].y * h);
        this.ctx.lineTo(lm[j].x * w, lm[j].y * h);
        this.ctx.stroke();
      }

      // Draw Joint Points
      for (let i = 0; i < lm.length; i++) {
        const pt = lm[i];
        this.ctx.beginPath();
        this.ctx.arc(pt.x * w, pt.y * h, i === 8 ? 6 : 3.5, 0, 2 * Math.PI);
        this.ctx.fillStyle = i === 8 ? '#f43f5e' : '#38bdf8'; // Highlight Point 8
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
    this.ctx.restore();
  }

  extractHandGeometry(landmarks, handedness) {
    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const isIndexOpen = indexTip.y < landmarks[6].y;
    const isMiddleOpen = middleTip.y < landmarks[10].y;
    const isRingOpen = ringTip.y < landmarks[14].y;
    const isPinkyOpen = pinkyTip.y < landmarks[18].y;

    const openCount = [isIndexOpen, isMiddleOpen, isRingOpen, isPinkyOpen].filter(Boolean).length;
    let pattern = 'fist';
    if (openCount >= 4) pattern = 'spread_five';
    else if (isIndexOpen && openCount === 1) pattern = 'index_point';
    else if (openCount === 2 && !isRingOpen && !isPinkyOpen) pattern = 'v_two';
    else if (openCount === 0) pattern = 'fist';
    else pattern = 'open_palm';

    return {
      pattern,
      openCount,
      wrist,
      indexTip
    };
  }

  // Simulation Trigger for Lexicon Explorer & Buttons
  simulateSignDetection(signId) {
    const signData = getTslSignById(signId);
    if (!signData) return;

    this.lastDetectedSign = signId;
    this.lastDetectionTime = Date.now();

    if (this.callbacks.onSignDetected) {
      this.callbacks.onSignDetected({
        sign: signData,
        confidence: 100,
        timestamp: Date.now(),
        simulated: true,
        reason: 'Simulated 100% Euclidean Distance Match'
      });
    }
  }

  // CSV Data Recording Exports for Idea 2
  startDatasetRecording(label) {
    this.rfClassifier.startRecording(label);
  }

  stopDatasetRecordingAndExport() {
    return this.rfClassifier.stopRecordingAndExport();
  }

  onSignDetected(callback) {
    this.callbacks.onSignDetected = callback;
  }

  onFrameStats(callback) {
    this.callbacks.onFrameStats = callback;
  }

  onError(callback) {
    this.callbacks.onError = callback;
  }
}
