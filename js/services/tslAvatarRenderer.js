// ============================================================================
// TSL & ISL Hand Sign Renderer (Medical Text-to-Hand Sign Engine)
// Replaces human stick figure with high-definition, articulated 3D hand anatomy
// Features: 21 Landmark Joint Kinematics, 5-Finger Articulation & Trajectory Arcs
// ============================================================================
import { getTslSignById } from '../data/tslMedicalVocabulary.js?v=20260911_hd_hands_v4';

export class TslAvatarRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.isPlaying = false;
    this.currentSign = null;
    this.signSequence = [];
    this.sequenceIndex = 0;
    this.animationSpeed = 1.0;
    this.animationStartTime = 0;
    this.currentFrameId = null;

    // Hand Engine State
    this.avatarState = this.getDefaultState();
    this.targetState = this.getDefaultState();
    this.prevState = this.getDefaultState();
    this.transitionProgress = 1.0;
    this.transitionDuration = 400; // ms
    this.currentPoseOnComplete = null;

    this.onSequenceStep = null;
    this.onSequenceComplete = null;

    // Motion ripples & particles for visual trajectory feedback
    this.motionRipples = [];
    this.motionParticles = [];
    this.animTime = 0;

    if (this.canvas) {
      this.resize();
      this.startRenderLoop();
    }
  }

  getDefaultState() {
    return {
      // Left Hand (visible during two-handed signs)
      leftHand: {
        visible: false,
        x: -75,
        y: 10,
        rotation: 0,
        scale: 1.35,
        palmFacing: 'front',
        pattern: 'open_palm',
        curl: [0.1, 0.1, 0.1, 0.1, 0.1],
        spread: [-25, -12, 0, 12, 25]
      },
      // Right Hand (Prominent centered hand)
      rightHand: {
        visible: true,
        x: 0,
        y: 8,
        rotation: 0,
        scale: 1.45,
        palmFacing: 'front',
        pattern: 'open_palm',
        curl: [0.1, 0.12, 0.12, 0.12, 0.12],
        spread: [25, 12, 0, -12, -25]
      },
      // Sign Motion Dynamics
      motionType: 'idle',
      motionProgress: 0,
      highlightRegion: null,
      pulseGlow: 0,
      signNameTa: '',
      signNameEn: '',
      handshapeDesc: 'தயார் நிலை (Ready)',
      activeHand: 'right',
      motionArrow: null
    };
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : { width: 480, height: 380 };
    this.canvas.width = rect.width || 480;
    this.canvas.height = Math.max(340, rect.height || 380);
    this.draw();
  }

  setSpeed(speed) {
    this.animationSpeed = Math.max(0.25, Math.min(2.0, speed));
  }

  playSign(signId, onComplete = null) {
    const sign = typeof signId === 'string' ? getTslSignById(signId) : signId;
    if (!sign) return;

    this.currentSign = sign;
    this.signSequence = [sign];
    this.sequenceIndex = 0;
    this.isPlaying = true;
    this.onSequenceComplete = onComplete;

    this.executeCurrentSignKeyframes();
  }

  playSequence(signIds, onStep = null, onComplete = null) {
    const signs = signIds.map(id => typeof id === 'string' ? getTslSignById(id) : id).filter(Boolean);
    if (signs.length === 0) return;

    this.signSequence = signs;
    this.sequenceIndex = 0;
    this.isPlaying = true;
    this.onSequenceStep = onStep;
    this.onSequenceComplete = onComplete;

    this.playNextInSequence();
  }

  playNextInSequence() {
    if (this.sequenceIndex >= this.signSequence.length) {
      this.isPlaying = false;
      this.currentSign = null;
      this.animateTo(this.getDefaultState(), 500);
      if (this.onSequenceComplete) this.onSequenceComplete();
      return;
    }

    const sign = this.signSequence[this.sequenceIndex];
    this.currentSign = sign;
    if (this.onSequenceStep) this.onSequenceStep(sign, this.sequenceIndex, this.signSequence.length);

    this.executeCurrentSignKeyframes(() => {
      this.sequenceIndex++;
      setTimeout(() => {
        this.playNextInSequence();
      }, 400 / this.animationSpeed);
    });
  }

  executeCurrentSignKeyframes(onDone = null) {
    if (!this.currentSign) {
      if (onDone) onDone();
      return;
    }

    const poses = this.getSignPoseKeyframes(this.currentSign.id);
    let poseIdx = 0;

    const playNextPose = () => {
      if (!this.isPlaying || poseIdx >= poses.length) {
        if (onDone) onDone();
        return;
      }

      const pose = poses[poseIdx];
      const duration = (pose.duration || 450) / this.animationSpeed;

      // Spawn visual ripple if pose triggers impact or pulse
      if (pose.state.pulseGlow > 0.5) {
        this.addRipple(pose.state.rightHand.x, pose.state.rightHand.y);
      }

      this.animateTo(pose.state, duration, () => {
        poseIdx++;
        setTimeout(playNextPose, 80 / this.animationSpeed);
      });
    };

    playNextPose();
  }

  animateTo(targetState, durationMs, onComplete = null) {
    this.prevState = JSON.parse(JSON.stringify(this.avatarState));
    this.targetState = targetState;
    this.transitionDuration = durationMs;
    this.animationStartTime = performance.now();
    this.transitionProgress = 0.0;
    this.currentPoseOnComplete = onComplete;
  }

  startRenderLoop() {
    const loop = (timestamp) => {
      this.update(timestamp);
      this.draw();
      this.currentFrameId = requestAnimationFrame(loop);
    };
    this.currentFrameId = requestAnimationFrame(loop);
  }

  update(timestamp) {
    this.animTime = timestamp;

    if (this.transitionProgress < 1.0) {
      const elapsed = timestamp - this.animationStartTime;
      this.transitionProgress = Math.min(1.0, elapsed / Math.max(1, this.transitionDuration));

      // Ease-in-out cubic interpolation
      const t = this.transitionProgress < 0.5
        ? 4 * this.transitionProgress * this.transitionProgress * this.transitionProgress
        : 1 - Math.pow(-2 * this.transitionProgress + 2, 3) / 2;

      this.avatarState = this.interpolateStates(this.prevState, this.targetState, t);

      if (this.transitionProgress >= 1.0 && this.currentPoseOnComplete) {
        const cb = this.currentPoseOnComplete;
        this.currentPoseOnComplete = null;
        cb();
      }
    } else if (!this.isPlaying) {
      // Gentle idle floating micro-motion for natural visual readiness
      const float = Math.sin(timestamp * 0.002) * 4;
      const def = this.getDefaultState();
      this.avatarState.leftHand.y = def.leftHand.y + float;
      this.avatarState.rightHand.y = def.rightHand.y - float;
    }

    // Update ripples
    this.motionRipples = this.motionRipples.filter(r => {
      r.radius += 2.5;
      r.alpha -= 0.035;
      return r.alpha > 0;
    });
  }

  addRipple(x, y) {
    this.motionRipples.push({ x, y, radius: 10, alpha: 0.8 });
  }

  interpolateStates(s1, s2, t) {
    const lerp = (a, b, f) => a + (b - a) * f;
    const lerpArray = (a1, a2, f) => {
      const len = Math.max(a1 ? a1.length : 0, a2 ? a2.length : 0);
      const res = [];
      for (let i = 0; i < len; i++) {
        const v1 = a1 && a1[i] !== undefined ? a1[i] : 0;
        const v2 = a2 && a2[i] !== undefined ? a2[i] : v1;
        res.push(lerp(v1, v2, f));
      }
      return res;
    };

    const interpHand = (h1, h2) => ({
      visible: t > 0.5 ? h2.visible : h1.visible,
      x: lerp(h1.x, h2.x, t),
      y: lerp(h1.y, h2.y, t),
      rotation: lerp(h1.rotation, h2.rotation, t),
      scale: lerp(h1.scale || 1.0, h2.scale || 1.0, t),
      palmFacing: t > 0.5 ? h2.palmFacing : h1.palmFacing,
      pattern: t > 0.5 ? h2.pattern : h1.pattern,
      curl: lerpArray(h1.curl, h2.curl, t),
      spread: lerpArray(h1.spread, h2.spread, t)
    });

    return {
      leftHand: interpHand(s1.leftHand, s2.leftHand),
      rightHand: interpHand(s1.rightHand, s2.rightHand),
      motionType: t > 0.5 ? s2.motionType : s1.motionType,
      motionProgress: lerp(s1.motionProgress || 0, s2.motionProgress || 0, t),
      highlightRegion: t > 0.5 ? s2.highlightRegion : s1.highlightRegion,
      pulseGlow: lerp(s1.pulseGlow || 0, s2.pulseGlow || 0, t),
      signNameTa: s2.signNameTa || s1.signNameTa,
      signNameEn: s2.signNameEn || s1.signNameEn,
      handshapeDesc: s2.handshapeDesc || s1.handshapeDesc,
      activeHand: s2.activeHand || s1.activeHand,
      motionArrow: t > 0.5 ? s2.motionArrow : s1.motionArrow
    };
  }

  // ==========================================================================
  // MASTER DRAWING ROUTINE (Hands-Only Sign Language Stage)
  // ==========================================================================
  draw() {
    if (!this.ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2 - 10;

    this.ctx.clearRect(0, 0, w, h);

    // 1. Futuristic Clinical Grid & Ambient Glow Background
    this.drawBackground(w, h, cx, cy);

    const s = this.avatarState;

    this.ctx.save();
    this.ctx.translate(cx, cy);

    // 2. Signing Stage Center Guide & Depth Glow
    this.drawSigningStageGuide();

    // 3. Motion Ripples
    for (const r of this.motionRipples) {
      this.ctx.save();
      this.ctx.strokeStyle = `rgba(56, 189, 248, ${r.alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // 4. Draw Left Hand (if visible)
    if (s.leftHand.visible) {
      this.drawArticulatedHand(s.leftHand, -1);
    }

    // 5. Draw Right Hand (if visible)
    if (s.rightHand.visible) {
      this.drawArticulatedHand(s.rightHand, 1);
    }

    // 6. Draw Motion Arrow / Trajectory Arcs
    if (s.motionArrow) {
      this.drawMotionArrow(s.motionArrow);
    }

    this.ctx.restore();

    // 7. Top & Bottom In-Canvas HUD Telemetry Badges
    this.drawInCanvasHud(w, h, s);
  }

  drawBackground(w, h, cx, cy) {
    // Deep radial spotlight
    const grad = this.ctx.createRadialGradient(cx, cy, 20, cx, cy, Math.max(w, h) * 0.7);
    grad.addColorStop(0, 'rgba(14, 165, 233, 0.12)');
    grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.85)');
    grad.addColorStop(1, '#090d16');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    // Subtle clinical coordinate grid
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    this.ctx.lineWidth = 1;
    const gridSize = 32;
    for (let x = 0; x < w; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, h);
      this.ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawSigningStageGuide() {
    this.ctx.save();
    // High-Tech Hand Gesture Targeting Frame (Corner Brackets)
    const bw = 150;
    const bh = 120;
    const cl = 18;
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    this.ctx.lineWidth = 2;

    // Top-Left corner
    this.ctx.beginPath();
    this.ctx.moveTo(-bw, -bh + cl);
    this.ctx.lineTo(-bw, -bh);
    this.ctx.lineTo(-bw + cl, -bh);
    this.ctx.stroke();

    // Top-Right corner
    this.ctx.beginPath();
    this.ctx.moveTo(bw - cl, -bh);
    this.ctx.lineTo(bw, -bh);
    this.ctx.lineTo(bw, -bh + cl);
    this.ctx.stroke();

    // Bottom-Left corner
    this.ctx.beginPath();
    this.ctx.moveTo(-bw, bh - cl);
    this.ctx.lineTo(-bw, bh);
    this.ctx.lineTo(-bw + cl, bh);
    this.ctx.stroke();

    // Bottom-Right corner
    this.ctx.beginPath();
    this.ctx.moveTo(bw - cl, bh);
    this.ctx.lineTo(bw, bh);
    this.ctx.lineTo(bw, bh - cl);
    this.ctx.stroke();

    // Center crosshair
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    this.ctx.beginPath();
    this.ctx.moveTo(-10, 0);
    this.ctx.lineTo(10, 0);
    this.ctx.moveTo(0, -10);
    this.ctx.lineTo(0, 10);
    this.ctx.stroke();

    // Stage Label
    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
    this.ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('TSL / ISL PURE HAND SIGN STAGE', 0, bh + 18);
    this.ctx.restore();
  }

  // ==========================================================================
  // ARTICULATED 3D ANATOMICAL HAND ENGINE (True Kinematic Hand Anatomy)
  // ==========================================================================
  drawArticulatedHand(hand, side) {
    this.ctx.save();
    this.ctx.translate(hand.x, hand.y);
    this.ctx.scale(hand.scale || 1.0, hand.scale || 1.0);
    this.ctx.rotate((hand.rotation * Math.PI) / 180);

    const isDorsal = hand.palmFacing === 'back';

    // 1. Pure Anatomical Carpal Wrist Base
    this.drawForearm(side);

    // 2. Palm Body (High-Definition Anatomical Volume with Thenar/Hypothenar pads)
    this.drawPalmBody(isDorsal, side);

    // 3. 5 Articulated Fingers (Thumb, Index, Middle, Ring, Pinky)
    // Enlarged, high-contrast anatomical knuckle anchors
    const knuckleAnchors = [
      { id: 'thumb',  x: side * -28, y: 16,  len: [26, 20, 16], width: 14.5, baseAngle: side * -42 },
      { id: 'index',  x: side * -18, y: -30, len: [32, 24, 18], width: 13.5, baseAngle: side * -12 },
      { id: 'middle', x: side * -4,  y: -36, len: [36, 26, 20], width: 13.5, baseAngle: 0 },
      { id: 'ring',   x: side * 10,  y: -33, len: [32, 24, 18], width: 12.5, baseAngle: side * 12 },
      { id: 'pinky',  x: side * 24,  y: -26, len: [24, 18, 14], width: 11.0, baseAngle: side * 24 }
    ];

    const landmarks = [{ x: 0, y: 46 }]; // Landmark 0: Carpal Wrist

    // Render Fingers: In a fist/pinch, draw thumb last so it folds over the knuckles
    const isThumbCurled = (hand.curl && hand.curl[0] >= 0.35) || hand.pattern === 'fist' || hand.pattern === 'pinch';
    const fingersToDraw = isThumbCurled 
      ? [knuckleAnchors[1], knuckleAnchors[2], knuckleAnchors[3], knuckleAnchors[4], knuckleAnchors[0]]
      : knuckleAnchors;

    fingersToDraw.forEach(finger => {
      const idx = knuckleAnchors.indexOf(finger);
      const curl = Math.max(0, Math.min(1.0, hand.curl[idx] || 0));
      const spreadDeg = (hand.spread[idx] !== undefined ? hand.spread[idx] : finger.baseAngle);
      const fingerLandmarks = this.drawPhalanxSegmentedFinger(finger, curl, spreadDeg, isDorsal, side);
      landmarks.push(...fingerLandmarks);
    });

    // 4. Specialized Mudra Visuals (Medicine Pill, Syringe, ECG Heartbeat, Scan Reticle)
    if (hand.pattern === 'pinch' || this.currentSign?.id === 'medicine_tablet') {
      this.drawMedicinePillHeld(side);
    } else if (this.currentSign?.id === 'injection') {
      this.drawSyringeApparatus(side);
    } else if (this.currentSign?.id === 'chest_pain') {
      this.drawCardiacPulseRings(side);
    } else if (this.currentSign?.id === 'where_is_pain') {
      this.drawPainTargetReticle(side);
    } else if (this.currentSign?.id === 'fever') {
      this.drawThermalShimmerWaves(side);
    }

    // 5. Landmark Skeleton Tracker (Luminous MediaPipe 21 Joints)
    this.drawLandmarkOverlay(landmarks);

    // 6. Hand Side & Mudra Indicator Label
    this.ctx.fillStyle = side === 1 ? '#38bdf8' : '#a5b4fc';
    this.ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
    this.ctx.shadowBlur = 4;
    this.ctx.fillText(side === 1 ? 'RIGHT HAND (வலது கை)' : 'LEFT HAND (இடது கை)', 0, 68);
    this.ctx.shadowBlur = 0;

    this.ctx.restore();
  }

  drawForearm(side) {
    this.ctx.save();
    // Anatomical Carpal Wrist base - zero forearm, zero body
    this.ctx.strokeStyle = '#0284c7';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.moveTo(side * -24, 46);
    this.ctx.quadraticCurveTo(0, 50, side * 24, 46);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawPalmBody(isDorsal, side) {
    this.ctx.save();

    // 3D Contoured Palm Gradient - High Contrast & Radiant
    const palmGrad = this.ctx.createRadialGradient(-6 * side, -8, 8, 0, 4, 52);
    if (isDorsal) {
      palmGrad.addColorStop(0, '#bae6fd');
      palmGrad.addColorStop(0.35, '#38bdf8');
      palmGrad.addColorStop(0.8, '#0284c7');
      palmGrad.addColorStop(1.0, '#0369a1');
    } else {
      palmGrad.addColorStop(0, '#ffffff');
      palmGrad.addColorStop(0.25, '#bae6fd');
      palmGrad.addColorStop(0.65, '#38bdf8');
      palmGrad.addColorStop(1.0, '#0284c7');
    }

    this.ctx.fillStyle = palmGrad;
    this.ctx.strokeStyle = '#024e75';
    this.ctx.lineWidth = 3.2;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
    this.ctx.shadowBlur = 12;

    // Anatomical Palm Contour: Wrist base -> Hypothenar -> Knuckles -> Thenar -> Wrist
    this.ctx.beginPath();
    this.ctx.moveTo(side * -24, 46); // Wrist thumb side
    // Thenar pad curve
    this.ctx.quadraticCurveTo(side * -40, 24, side * -32, 0);
    // Index knuckle base
    this.ctx.lineTo(side * -26, -30);
    // Knuckle arch
    this.ctx.quadraticCurveTo(0, -42, side * 30, -26);
    // Hypothenar curve (pinky side)
    this.ctx.quadraticCurveTo(side * 36, 18, side * 24, 46);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();

    // Palm Interior Markings
    if (!isDorsal) {
      // Palmar Lines (Heart, Head, Life lines)
      this.ctx.strokeStyle = 'rgba(2, 78, 117, 0.55)';
      this.ctx.lineWidth = 1.8;

      // Heart Line
      this.ctx.beginPath();
      this.ctx.moveTo(side * 24, -16);
      this.ctx.quadraticCurveTo(side * 4, -22, side * -16, -10);
      this.ctx.stroke();

      // Head Line
      this.ctx.beginPath();
      this.ctx.moveTo(side * -24, 2);
      this.ctx.quadraticCurveTo(side * -4, 0, side * 20, 8);
      this.ctx.stroke();

      // Life Line (surrounding thenar pad)
      this.ctx.beginPath();
      this.ctx.moveTo(side * -24, 4);
      this.ctx.quadraticCurveTo(side * -10, 22, side * -6, 42);
      this.ctx.stroke();

      // Thenar Eminence (Thumb Muscle Glow)
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      this.ctx.beginPath();
      this.ctx.ellipse(side * -18, 22, 12, 16, (side * 20 * Math.PI) / 180, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Dorsal Tendon Lines extending toward knuckles
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      this.ctx.lineWidth = 2.0;
      [-18, -4, 10, 22].forEach(kx => {
        this.ctx.beginPath();
        this.ctx.moveTo(0, 42);
        this.ctx.lineTo(side * kx, -26);
        this.ctx.stroke();
      });
    }

    this.ctx.restore();
  }

  // Draw 3-Phalanx Anatomical Finger with True 2.5D Kinematic Bending
  drawPhalanxSegmentedFinger(finger, curl, spreadDeg, isDorsal, side) {
    const fingerLandmarks = [];
    const baseRad = (spreadDeg * Math.PI) / 180;
    const isThumb = finger.id === 'thumb';

    this.ctx.save();
    this.ctx.translate(finger.x, finger.y);
    fingerLandmarks.push({ x: finger.x, y: finger.y }); // Knuckle MCP

    let p1End, p2End, p3End;

    if (isThumb) {
      // THUMB KINEMATICS
      if (curl >= 0.45) {
        // Thumb curled across palm / locked on fist
        const tAngle1 = side * (25 * Math.PI / 180);
        const tAngle2 = side * (55 * Math.PI / 180);
        const tAngle3 = side * (85 * Math.PI / 180);

        p1End = { x: Math.sin(tAngle1) * finger.len[0] * 0.9, y: Math.cos(tAngle1) * finger.len[0] * 0.6 };
        p2End = { x: p1End.x + Math.sin(tAngle2) * finger.len[1] * 0.8, y: p1End.y + Math.cos(tAngle2) * finger.len[1] * 0.4 };
        p3End = { x: p2End.x + Math.sin(tAngle3) * finger.len[2] * 0.7, y: p2End.y - Math.cos(tAngle3) * finger.len[2] * 0.2 };
      } else {
        // Open Thumb branching outward
        const tAngle1 = baseRad;
        const tAngle2 = baseRad + side * (-12 * Math.PI / 180);
        const tAngle3 = baseRad + side * (-24 * Math.PI / 180);

        p1End = { x: Math.sin(tAngle1) * finger.len[0], y: -Math.cos(tAngle1) * finger.len[0] };
        p2End = { x: p1End.x + Math.sin(tAngle2) * finger.len[1], y: p1End.y - Math.cos(tAngle2) * finger.len[1] };
        p3End = { x: p2End.x + Math.sin(tAngle3) * finger.len[2], y: p2End.y - Math.cos(tAngle3) * finger.len[2] };
      }
    } else {
      // 4 FINGERS KINEMATICS
      if (curl >= 0.7) {
        // FULL FIST: Folded over palm in 2.5D
        p1End = { x: Math.sin(baseRad) * 8, y: 16 };
        p2End = { x: p1End.x, y: p1End.y + 14 };
        p3End = { x: p1End.x - side * 2, y: p2End.y + 10 };
      } else if (curl >= 0.3) {
        // CLAW / PARTIAL BEND (Temple claw, stomach grip, pinch)
        const bendFactor = curl;
        const a1 = baseRad + side * (-18 * Math.PI / 180) * bendFactor;
        const a2 = a1 + side * (-45 * Math.PI / 180) * bendFactor;
        const a3 = a2 + side * (-65 * Math.PI / 180) * bendFactor;

        const l1 = finger.len[0] * (1 - bendFactor * 0.15);
        const l2 = finger.len[1] * (1 - bendFactor * 0.25);
        const l3 = finger.len[2] * (1 - bendFactor * 0.35);

        p1End = { x: Math.sin(a1) * l1, y: -Math.cos(a1) * l1 };
        p2End = { x: p1End.x + Math.sin(a2) * l2, y: p1End.y - Math.cos(a2) * l2 };
        p3End = { x: p2End.x + Math.sin(a3) * l3, y: p2End.y - Math.cos(a3) * l3 };
      } else {
        // FULL EXTENSION (Open palm, pointing index, V-sign)
        p1End = { x: Math.sin(baseRad) * finger.len[0], y: -Math.cos(baseRad) * finger.len[0] };
        p2End = { x: p1End.x + Math.sin(baseRad) * finger.len[1], y: p1End.y - Math.cos(baseRad) * finger.len[1] };
        p3End = { x: p2End.x + Math.sin(baseRad) * finger.len[2], y: p2End.y - Math.cos(baseRad) * finger.len[2] };
      }
    }

    // Segment 1: Proximal Phalanx
    this.drawSegmentCapsule(0, 0, p1End.x, p1End.y, finger.width, finger.width * 0.9, isDorsal);
    fingerLandmarks.push({ x: finger.x + p1End.x, y: finger.y + p1End.y }); // PIP

    // Segment 2: Intermediate Phalanx
    this.drawSegmentCapsule(p1End.x, p1End.y, p2End.x, p2End.y, finger.width * 0.88, finger.width * 0.78, isDorsal);
    fingerLandmarks.push({ x: finger.x + p2End.x, y: finger.y + p2End.y }); // DIP

    // Segment 3: Distal Phalanx & Fingertip Pad
    this.drawSegmentCapsule(p2End.x, p2End.y, p3End.x, p3End.y, finger.width * 0.76, finger.width * 0.62, isDorsal);
    fingerLandmarks.push({ x: finger.x + p3End.x, y: finger.y + p3End.y }); // Fingertip

    // Fingertip Detail
    this.drawFingertipDetail(p3End.x, p3End.y, finger.width * 0.65, isDorsal);

    // Flexure creases if folded into fist
    if (!isThumb && curl >= 0.7) {
      this.ctx.strokeStyle = '#024e75';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(p1End.x - finger.width * 0.4, p1End.y);
      this.ctx.lineTo(p1End.x + finger.width * 0.4, p1End.y);
      this.ctx.moveTo(p2End.x - finger.width * 0.35, p2End.y);
      this.ctx.lineTo(p2End.x + finger.width * 0.35, p2End.y);
      this.ctx.stroke();
    }

    this.ctx.restore();
    return fingerLandmarks;
  }

  // Draw High-Contrast 3D Anatomical Phalanx Cylinder Capsule
  drawSegmentCapsule(x1, y1, x2, y2, w1, w2, isDorsal) {
    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const r1 = w1 / 2;
    const r2 = w2 / 2;

    // 4 Corner coordinates of the tapered cylinder
    const p1x = x1 + nx * r1, p1y = y1 + ny * r1;
    const p2x = x2 + nx * r2, p2y = y2 + ny * r2;
    const p3x = x2 - nx * r2, p3y = y2 - ny * r2;
    const p4x = x1 - nx * r1, p4y = y1 - ny * r1;

    // 1. High-Contrast Outer Perimeter Outline
    this.ctx.beginPath();
    this.ctx.moveTo(p1x, p1y);
    this.ctx.lineTo(p2x, p2y);
    this.ctx.arc(x2, y2, r2, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
    this.ctx.lineTo(p4x, p4y);
    this.ctx.arc(x1, y1, r1, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
    this.ctx.closePath();

    this.ctx.strokeStyle = '#024e75';
    this.ctx.lineWidth = 3.0;
    this.ctx.shadowColor = 'rgba(56, 189, 248, 0.45)';
    this.ctx.shadowBlur = 8;
    this.ctx.stroke();

    // 2. High-Contrast Gradient Fill
    const segGrad = this.ctx.createLinearGradient(p1x, p1y, p4x, p4y);
    if (isDorsal) {
      segGrad.addColorStop(0.0, '#0284c7');
      segGrad.addColorStop(0.2, '#38bdf8');
      segGrad.addColorStop(0.5, '#e0f2fe'); // Bright specular ridge
      segGrad.addColorStop(0.8, '#38bdf8');
      segGrad.addColorStop(1.0, '#0369a1');
    } else {
      segGrad.addColorStop(0.0, '#0284c7');
      segGrad.addColorStop(0.25, '#7dd3fc');
      segGrad.addColorStop(0.5, '#ffffff'); // Radiant specular core
      segGrad.addColorStop(0.75, '#38bdf8');
      segGrad.addColorStop(1.0, '#026aa2');
    }

    this.ctx.fillStyle = segGrad;
    this.ctx.fill();

    // 3. Longitudinal Specular Highlight
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    this.ctx.lineWidth = Math.max(1.5, w1 * 0.22);
    this.ctx.beginPath();
    this.ctx.moveTo(x1 + dx * 0.15, y1 + dy * 0.15);
    this.ctx.lineTo(x1 + dx * 0.85, y1 + dy * 0.85);
    this.ctx.stroke();

    // 4. Knuckle Joint Ball Cap at Base
    const jointGrad = this.ctx.createRadialGradient(x1, y1 - 1, 1, x1, y1, r1);
    jointGrad.addColorStop(0, '#ffffff');
    jointGrad.addColorStop(0.4, '#7dd3fc');
    jointGrad.addColorStop(0.9, '#0284c7');
    jointGrad.addColorStop(1, '#024e75');

    this.ctx.fillStyle = jointGrad;
    this.ctx.beginPath();
    this.ctx.arc(x1, y1, r1 * 0.85, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#024e75';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawFingertipDetail(tipX, tipY, radius, isDorsal) {
    this.ctx.save();
    if (isDorsal) {
      // Sleek Fingernail with High-Contrast White Lunula
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      this.ctx.strokeStyle = '#024e75';
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      this.ctx.ellipse(tipX, tipY, radius * 0.75, radius * 0.95, 0, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
    } else {
      // Tactile Finger Pad Sensor Pulse
      this.ctx.fillStyle = '#ffffff';
      this.ctx.shadowColor = '#38bdf8';
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(tipX, tipY, radius * 0.55, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  // Specialized Visual Mudras
  drawMedicinePillHeld(side) {
    this.ctx.save();
    this.ctx.translate(side * 6, -16);
    this.ctx.rotate((side * 25 * Math.PI) / 180);

    // Glowing Pill Capsule
    this.ctx.shadowColor = '#38bdf8';
    this.ctx.shadowBlur = 14;

    // Left half (Cyan)
    this.ctx.fillStyle = '#0ea5e9';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(-12, -6, 12, 12, [6, 0, 0, 6]);
    this.ctx.fill();
    this.ctx.stroke();

    // Right half (Gold/Amber)
    this.ctx.fillStyle = '#fbbf24';
    this.ctx.beginPath();
    this.ctx.roundRect(0, -6, 12, 12, [0, 6, 6, 0]);
    this.ctx.fill();
    this.ctx.stroke();

    // Specular shine
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.ctx.beginPath();
    this.ctx.roundRect(-8, -3.5, 16, 3, 1.5);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawSyringeApparatus(side) {
    this.ctx.save();
    this.ctx.translate(side * 18, -32);
    this.ctx.rotate((side * -35 * Math.PI) / 180);

    // Glass Barrel
    this.ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 2.0;
    this.ctx.beginPath();
    this.ctx.roundRect(-6, -26, 12, 30, 2);
    this.ctx.fill();
    this.ctx.stroke();

    // Medicine Fluid
    this.ctx.fillStyle = '#06b6d4';
    this.ctx.beginPath();
    this.ctx.roundRect(-4, -14, 8, 16, 1);
    this.ctx.fill();

    // Needle cannula
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2.0;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -26);
    this.ctx.lineTo(0, -46);
    this.ctx.stroke();

    // Medicine droplet
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.beginPath();
    this.ctx.arc(0, -47, 3, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawCardiacPulseRings(side) {
    this.ctx.save();
    const time = this.animTime * 0.005;
    const r1 = 20 + (Math.sin(time) * 12 + 12);
    const r2 = 35 + (Math.sin(time + 1) * 15 + 15);

    this.ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
    this.ctx.lineWidth = 2.5;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r1, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
    this.ctx.lineWidth = 1.8;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, r2, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawPainTargetReticle(side) {
    this.ctx.save();
    const tipX = side * -18;
    const tipY = -95;
    const time = this.animTime * 0.006;
    const r = 16 + Math.sin(time) * 4;

    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 2.0;
    this.ctx.setLineDash([4, 4]);
    this.ctx.beginPath();
    this.ctx.arc(tipX, tipY, r, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Crosshairs
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 1.8;
    this.ctx.beginPath();
    this.ctx.moveTo(tipX - r - 4, tipY);
    this.ctx.lineTo(tipX + r + 4, tipY);
    this.ctx.moveTo(tipX, tipY - r - 4);
    this.ctx.lineTo(tipX, tipY + r + 4);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawThermalShimmerWaves(side) {
    this.ctx.save();
    const time = this.animTime * 0.004;
    this.ctx.strokeStyle = '#f59e0b';
    this.ctx.lineWidth = 2.2;
    for (let i = 0; i < 3; i++) {
      const yOffset = -50 - i * 16 - (time * 15 % 20);
      const alpha = Math.max(0, 1 - i * 0.3);
      this.ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
      this.ctx.beginPath();
      this.ctx.moveTo(-25, yOffset);
      this.ctx.quadraticCurveTo(0, yOffset - 8, 25, yOffset);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawLandmarkOverlay(landmarks) {
    this.ctx.save();
    // Subtle MediaPipe-like conduit lines between landmarks
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    landmarks.forEach((pt, i) => {
      if (i === 0) this.ctx.moveTo(pt.x, pt.y);
      else if (i % 4 === 1) {
        this.ctx.moveTo(landmarks[0].x, landmarks[0].y);
        this.ctx.lineTo(pt.x, pt.y);
      } else {
        this.ctx.lineTo(pt.x, pt.y);
      }
    });
    this.ctx.stroke();

    // Luminous Landmark Nodes
    landmarks.forEach(pt => {
      this.ctx.fillStyle = '#38bdf8';
      this.ctx.beginPath();
      this.ctx.arc(pt.x, pt.y, 1.8, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.restore();
  }

  drawMotionArrow(arrow) {
    this.ctx.save();
    const { startX, startY, endX, endY, label } = arrow;
    const dx = endX - startX;
    const dy = endY - startY;
    const angle = Math.atan2(dy, dx);
    const len = Math.hypot(dx, dy);

    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.fillStyle = '#38bdf8';
    this.ctx.lineWidth = 2.5;

    // Glowing motion path
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    // Arrowhead
    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(endX - 10 * Math.cos(angle - Math.PI / 6), endY - 10 * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(endX - 10 * Math.cos(angle + Math.PI / 6), endY - 10 * Math.sin(angle + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fill();

    if (label) {
      this.ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      this.ctx.fillStyle = '#7dd3fc';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(label, (startX + endX) / 2, (startY + endY) / 2 - 8);
    }
    this.ctx.restore();
  }

  drawInCanvasHud(w, h, s) {
    this.ctx.save();

    // Top Engine Badge
    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    this.ctx.strokeStyle = '#38bdf8';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.roundRect(14, 12, 275, 28, 6);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#38bdf8';
    this.ctx.font = 'bold 11.5px "Plus Jakarta Sans", sans-serif';
    this.ctx.fillText('🖐️ TEXT-TO-HAND SIGN (TSL / ISL)', 24, 30);

    // Active Sign & Handshape Metadata Pill
    const pillW = Math.min(w - 28, 420);
    const pillX = (w - pillW) / 2;
    const pillY = h - 38;

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    this.ctx.strokeStyle = '#0284c7';
    this.ctx.lineWidth = 1.2;
    this.ctx.beginPath();
    this.ctx.roundRect(pillX, pillY, pillW, 28, 6);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.font = 'bold 11.5px "Plus Jakarta Sans", "Mukta Malar", sans-serif';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.textAlign = 'center';

    const labelText = this.currentSign
      ? `🩺 ${this.currentSign.tamilName || ''} — கை: ${this.currentSign.handShape || 'Mudra'}`
      : '🖐️ கை சைகை தயார் (Hand Sign Engine Ready)';
    this.ctx.fillText(labelText, w / 2, pillY + 18);

    this.ctx.restore();
  }

  // ==========================================================================
  // COMPREHENSIVE TSL & ISL MEDICAL SIGN KEYFRAME CATALOG
  // Guaranteed precise hand positions, realistic finger curls and trajectories
  // ==========================================================================
  getSignPoseKeyframes(signId) {
    const def = this.getDefaultState();

    switch (signId) {
      // 1. CHEST PAIN (நெஞ்சு வலி - Cardiac / Heart Distress)
      // Right hand tight FIST clutching over left cardiac zone, pulsing inward
      case 'chest_pain':
        return [
          {
            duration: 400,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: -30,
                y: 10,
                rotation: -15,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'fist',
                curl: [1.0, 1.0, 1.0, 1.0, 1.0], // Firm clenched fist
                spread: [15, 5, 0, -5, -15]
              },
              leftHand: {
                visible: true,
                x: -85,
                y: 40,
                rotation: 20,
                scale: 0.9,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.3, 0.3, 0.3, 0.3, 0.3],
                spread: [-20, -10, 0, 10, 20]
              },
              motionType: 'pulse',
              pulseGlow: 0.8,
              motionArrow: { startX: 10, startY: 20, endX: -25, endY: 10, label: 'நெஞ்சு அழுத்தம் (Inward Clutch)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: -34,
                y: 8,
                rotation: -20,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'fist',
                curl: [1.0, 1.0, 1.0, 1.0, 1.0],
                spread: [10, 5, 0, -5, -10]
              },
              leftHand: {
                visible: true,
                x: -80,
                y: 45,
                rotation: 25,
                scale: 0.9,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.4, 0.4, 0.4, 0.4, 0.4],
                spread: [-20, -10, 0, 10, 20]
              },
              motionType: 'pulse',
              pulseGlow: 1.0
            }
          }
        ];

      // 2. BREATHLESSNESS (மூச்சுத் திணறல் - Dual Open Palms Heaving Rapidly)
      case 'breathlessness':
        return [
          {
            duration: 350,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -60,
                y: -30,
                rotation: 12,
                scale: 1.05,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [-32, -16, 0, 16, 32]
              },
              rightHand: {
                visible: true,
                x: 60,
                y: -30,
                rotation: -12,
                scale: 1.05,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [32, 16, 0, -16, -32]
              },
              motionType: 'wave',
              pulseGlow: 0.6,
              motionArrow: { startX: 0, startY: 30, endX: 0, endY: -30, label: 'சுவாசம் மேலெழல் (Inhale)' }
            }
          },
          {
            duration: 350,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -55,
                y: 35,
                rotation: 10,
                scale: 1.0,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [-26, -12, 0, 12, 26]
              },
              rightHand: {
                visible: true,
                x: 55,
                y: 35,
                rotation: -10,
                scale: 1.0,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [26, 12, 0, -12, -26]
              },
              motionType: 'wave',
              pulseGlow: 0.4
            }
          }
        ];

      // 3. FEVER (காய்ச்சல் - Dorsal Forehead Touch & Thermal Wave)
      case 'fever':
        return [
          {
            duration: 450,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 10,
                y: -60,
                rotation: 35,
                scale: 1.1,
                palmFacing: 'back', // Dorsal touch on forehead
                pattern: 'flat',
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [15, 6, 0, -6, -15]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'pulse',
              pulseGlow: 0.85,
              motionArrow: { startX: 60, startY: -20, endX: 10, endY: -55, label: 'நெற்றி தொடுதல் (Forehead Check)' }
            }
          },
          {
            duration: 550,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 50,
                y: 35,
                rotation: -25,
                scale: 1.05,
                palmFacing: 'front', // Flip outward wave showing heat
                pattern: 'open_palm',
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [30, 15, 0, -15, -30]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'wave',
              pulseGlow: 0.7,
              motionArrow: { startX: 10, startY: -50, endX: 50, endY: 30, label: 'வெப்ப அலை (Thermal Wave)' }
            }
          }
        ];

      // 4. HEADACHE (தலைவலி - Bilateral Temple Claws Pulsing)
      case 'headache':
        return [
          {
            duration: 400,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -95,
                y: -50,
                rotation: 55,
                scale: 1.05,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.4, 0.45, 0.45, 0.45, 0.45], // Temple claws
                spread: [-25, -12, 0, 12, 25]
              },
              rightHand: {
                visible: true,
                x: 95,
                y: -50,
                rotation: -55,
                scale: 1.05,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.4, 0.45, 0.45, 0.45, 0.45],
                spread: [25, 12, 0, -12, -25]
              },
              motionType: 'temple_pulse',
              pulseGlow: 0.9,
              motionArrow: { startX: -110, startY: -50, endX: -85, endY: -50, label: 'இரு பொட்டு அழுத்தம் (Bilateral Pulse)' }
            }
          },
          {
            duration: 450,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -85,
                y: -48,
                rotation: 60,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.55, 0.6, 0.6, 0.6, 0.6],
                spread: [-20, -10, 0, 10, 20]
              },
              rightHand: {
                visible: true,
                x: 85,
                y: -48,
                rotation: -60,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.55, 0.6, 0.6, 0.6, 0.6],
                spread: [20, 10, 0, -10, -20]
              },
              motionType: 'temple_pulse',
              pulseGlow: 1.0
            }
          }
        ];

      // 5. STOMACH PAIN (வயிற்று வலி - Abdominal Cramp Rotations)
      case 'stomach_pain':
        return [
          {
            duration: 450,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -45,
                y: 35,
                rotation: 25,
                scale: 1.05,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.5, 0.55, 0.55, 0.55, 0.55],
                spread: [-20, -10, 0, 10, 20]
              },
              rightHand: {
                visible: true,
                x: 45,
                y: 35,
                rotation: -25,
                scale: 1.05,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.5, 0.55, 0.55, 0.55, 0.55],
                spread: [20, 10, 0, -10, -20]
              },
              motionType: 'circle',
              pulseGlow: 0.8,
              motionArrow: { startX: -30, startY: 20, endX: 30, endY: 45, label: 'வயிற்று பிசைவு (Abdominal Rub)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -35,
                y: 45,
                rotation: 35,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.65, 0.7, 0.7, 0.7, 0.7],
                spread: [-15, -8, 0, 8, 15]
              },
              rightHand: {
                visible: true,
                x: 35,
                y: 45,
                rotation: -35,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.65, 0.7, 0.7, 0.7, 0.7],
                spread: [15, 8, 0, -8, -15]
              },
              motionType: 'circle',
              pulseGlow: 0.95
            }
          }
        ];

      // 6. MEDICINE TABLET (மருந்து மாத்திரை - O-Shape Pinch to Open Palm Tray)
      case 'medicine_tablet':
        return [
          {
            duration: 450,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -50,
                y: 40,
                rotation: 15,
                scale: 1.0,
                palmFacing: 'front', // Palm tray facing up
                pattern: 'open_palm',
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [-20, -10, 0, 10, 20]
              },
              rightHand: {
                visible: true,
                x: 40,
                y: -20,
                rotation: -25,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'pinch', // O-pinch holding pill
                curl: [0.45, 0.55, 0.85, 0.85, 0.85],
                spread: [15, 5, -5, -12, -20]
              },
              motionType: 'pulse',
              pulseGlow: 0.7,
              motionArrow: { startX: 40, startY: -15, endX: -30, endY: 30, label: 'மாத்திரை வைத்தல் (Place Tablet)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -40,
                y: 40,
                rotation: 10,
                scale: 1.05,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [-22, -10, 0, 10, 22]
              },
              rightHand: {
                visible: true,
                x: -30,
                y: 30,
                rotation: -10,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'pinch',
                curl: [0.55, 0.65, 0.9, 0.9, 0.9],
                spread: [12, 4, -4, -10, -18]
              },
              motionType: 'pulse',
              pulseGlow: 0.95
            }
          }
        ];

      // 7. INJECTION (ஊசி மருந்து - Syringe Injection Gesture into Forearm)
      case 'injection':
        return [
          {
            duration: 450,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -55,
                y: 40,
                rotation: 45, // Forearm positioned horizontally
                scale: 1.0,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.2, 0.2, 0.2, 0.2, 0.2],
                spread: [-20, -10, 0, 10, 20]
              },
              rightHand: {
                visible: true,
                x: 20,
                y: -10,
                rotation: -45,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'point', // Syringe needle pointing
                curl: [0.1, 0.0, 0.8, 0.8, 0.8],
                spread: [25, 0, -15, -20, -25]
              },
              motionType: 'injection',
              pulseGlow: 0.8,
              motionArrow: { startX: 20, startY: -5, endX: -35, endY: 35, label: 'ஊசி செலுத்துதல் (Inject)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -55,
                y: 40,
                rotation: 45,
                scale: 1.0,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.2, 0.2, 0.2, 0.2, 0.2],
                spread: [-20, -10, 0, 10, 20]
              },
              rightHand: {
                visible: true,
                x: -35,
                y: 32,
                rotation: -50,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'fist', // Plunger pressed down
                curl: [0.6, 0.1, 0.85, 0.85, 0.85],
                spread: [20, 0, -15, -20, -25]
              },
              motionType: 'injection',
              pulseGlow: 1.0
            }
          }
        ];

      // 8. THROAT PAIN (தொண்டை வலி - C-Claw Airway Clutch)
      case 'throat_pain':
        return [
          {
            duration: 450,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 0,
                y: -30,
                rotation: 0,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'claw', // C-claw clutching throat
                curl: [0.35, 0.45, 0.45, 0.45, 0.45],
                spread: [20, 10, 0, -10, -20]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'pulse',
              pulseGlow: 0.85,
              motionArrow: { startX: 40, startY: 0, endX: 5, endY: -25, label: 'தொண்டை பிடிப்பு (Throat Clutch)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 0,
                y: -28,
                rotation: 0,
                scale: 1.18,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.5, 0.6, 0.6, 0.6, 0.6],
                spread: [18, 8, 0, -8, -18]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'pulse',
              pulseGlow: 1.0
            }
          }
        ];

      // 9. DIZZINESS (மயக்கம் / தலைசுற்றல் - Orbiting Index Finger)
      case 'dizziness':
        return [
          {
            duration: 400,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 40,
                y: -60,
                rotation: -15,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'point',
                curl: [0.8, 0.0, 0.85, 0.85, 0.85],
                spread: [20, 0, -10, -15, -20]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'circle',
              pulseGlow: 0.7,
              motionArrow: { startX: -40, startY: -65, endX: 40, endY: -60, label: 'தலைசுற்றல் சுழற்சி (Orbit)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: -40,
                y: -65,
                rotation: 15,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'point',
                curl: [0.8, 0.0, 0.85, 0.85, 0.85],
                spread: [-20, 0, 10, 15, 20]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'circle',
              pulseGlow: 0.85
            }
          }
        ];

      // 10. WHERE IS PAIN? (எங்கே வலிக்கிறது? - Forward Point to Inquiring Palm)
      case 'where_is_pain':
        return [
          {
            duration: 450,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 35,
                y: 0,
                rotation: -10,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'point', // Pointing forward
                curl: [0.8, 0.0, 0.85, 0.85, 0.85],
                spread: [20, 0, -10, -15, -20]
              },
              leftHand: {
                visible: true,
                x: -60,
                y: 25,
                rotation: 15,
                scale: 0.95,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.2, 0.2, 0.2, 0.2, 0.2],
                spread: [-20, -10, 0, 10, 20]
              },
              motionType: 'pulse',
              pulseGlow: 0.7,
              motionArrow: { startX: 0, startY: 20, endX: 35, endY: 0, label: 'எங்கே? (Where?)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 45,
                y: 15,
                rotation: 20,
                scale: 1.12,
                palmFacing: 'front', // Open inquiring palm
                pattern: 'open_palm',
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [25, 12, 0, -12, -25]
              },
              leftHand: {
                visible: true,
                x: -45,
                y: 15,
                rotation: -20,
                scale: 1.12,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [-25, -12, 0, 12, 25]
              },
              motionType: 'wave',
              pulseGlow: 0.9
            }
          }
        ];

      // 11. EMERGENCY SOS (அவசர சிகிச்சை - Crossed Wrists International SOS)
      case 'emergency_sos':
        return [
          {
            duration: 400,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -15,
                y: -10,
                rotation: 40,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'fist',
                curl: [1.0, 1.0, 1.0, 1.0, 1.0],
                spread: [-15, -8, 0, 8, 15]
              },
              rightHand: {
                visible: true,
                x: 15,
                y: -10,
                rotation: -40,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'fist',
                curl: [1.0, 1.0, 1.0, 1.0, 1.0],
                spread: [15, 8, 0, -8, -15]
              },
              motionType: 'sos_cross',
              pulseGlow: 1.0,
              motionArrow: { startX: -50, startY: 20, endX: -15, endY: -10, label: 'SOS குறுக்கு சைகை (Crossed SOS)' }
            }
          },
          {
            duration: 450,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -20,
                y: -15,
                rotation: 45,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'fist',
                curl: [1.0, 1.0, 1.0, 1.0, 1.0],
                spread: [-12, -6, 0, 6, 12]
              },
              rightHand: {
                visible: true,
                x: 20,
                y: -15,
                rotation: -45,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'fist',
                curl: [1.0, 1.0, 1.0, 1.0, 1.0],
                spread: [12, 6, 0, -6, -12]
              },
              motionType: 'sos_cross',
              pulseGlow: 1.0
            }
          }
        ];

      // 12. REST & WATER (ஓய்வு மற்றும் தண்ணீர் - Cupped Hand Water Drink + Calm Rest)
      case 'rest_and_water':
        return [
          {
            duration: 450,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 15,
                y: -45,
                rotation: -25,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'cupped', // Cup holding water
                curl: [0.35, 0.45, 0.45, 0.45, 0.45],
                spread: [15, 6, 0, -6, -15]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'wave',
              pulseGlow: 0.6,
              motionArrow: { startX: 40, startY: 10, endX: 15, endY: -45, label: 'தண்ணீர் குடித்தல் (Drink Water)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -50,
                y: 30,
                rotation: 10,
                scale: 1.05,
                palmFacing: 'front',
                pattern: 'flat', // Flat calm resting mudra
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [-20, -10, 0, 10, 20]
              },
              rightHand: {
                visible: true,
                x: 50,
                y: 30,
                rotation: -10,
                scale: 1.05,
                palmFacing: 'front',
                pattern: 'flat',
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [20, 10, 0, -10, -20]
              },
              motionType: 'wave',
              pulseGlow: 0.8
            }
          }
        ];

      // 13. BREATHE DEEPLY (ஆழமாக மூச்சு விடுதல் - Dual Expanding & Contracting Thoracic Palms)
      case 'breathe_deeply':
        return [
          {
            duration: 550,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -75,
                y: -15,
                rotation: 18,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [-32, -16, 0, 16, 32]
              },
              rightHand: {
                visible: true,
                x: 75,
                y: -15,
                rotation: -18,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [32, 16, 0, -16, -32]
              },
              motionType: 'wave',
              pulseGlow: 0.9,
              motionArrow: { startX: -30, startY: 10, endX: -75, endY: -15, label: 'ஆழமாக உள்சுவாசம் (Inhale Deeply)' }
            }
          },
          {
            duration: 550,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -45,
                y: 20,
                rotation: 8,
                scale: 1.05,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.15, 0.15, 0.15, 0.15, 0.15],
                spread: [-24, -12, 0, 12, 24]
              },
              rightHand: {
                visible: true,
                x: 45,
                y: 20,
                rotation: -8,
                scale: 1.05,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.15, 0.15, 0.15, 0.15, 0.15],
                spread: [24, 12, 0, -12, -24]
              },
              motionType: 'wave',
              pulseGlow: 0.6,
              motionArrow: { startX: 75, startY: -15, endX: 45, endY: 20, label: 'மெதுவாக வெளிச்சுவாசம் (Exhale Slowly)' }
            }
          }
        ];

      // 14. OPEN MOUTH & SHOW TONGUE (வாய் திறந்து நாக்கு காட்டுதல் - Index Pointing to Mouth & Flat Palm)
      case 'open_mouth_tongue':
        return [
          {
            duration: 450,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 20,
                y: -65,
                rotation: -25,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'point', // Pointing directly to oral cavity
                curl: [0.85, 0.0, 0.9, 0.9, 0.9],
                spread: [20, 0, -10, -15, -20]
              },
              leftHand: {
                visible: true,
                x: -55,
                y: 20,
                rotation: 12,
                scale: 0.95,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [-20, -10, 0, 10, 20]
              },
              motionType: 'pulse',
              pulseGlow: 0.8,
              motionArrow: { startX: 60, startY: -20, endX: 20, endY: -65, label: 'வாய் திற (Open Mouth)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 0,
                y: -45,
                rotation: 0,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'open_palm', // Flat tongue presentation
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [26, 12, 0, -12, -26]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'wave',
              pulseGlow: 0.95,
              motionArrow: { startX: 0, startY: -65, endX: 0, endY: -45, label: 'நாக்கு காட்டு (Show Tongue)' }
            }
          }
        ];

      // 15. COUGH (இருமல் - Closed Fist Covering Mouth with Rhythmic Vibration)
      case 'cough':
        return [
          {
            duration: 350,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 10,
                y: -55,
                rotation: -15,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'fist',
                curl: [1.0, 1.0, 1.0, 1.0, 1.0],
                spread: [12, 5, 0, -5, -12]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'pulse',
              pulseGlow: 0.8,
              motionArrow: { startX: 40, startY: -20, endX: 10, endY: -55, label: 'இருமல் (Cough Pulse)' }
            }
          },
          {
            duration: 350,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 18,
                y: -50,
                rotation: -10,
                scale: 1.18,
                palmFacing: 'front',
                pattern: 'fist',
                curl: [1.0, 1.0, 1.0, 1.0, 1.0],
                spread: [10, 4, 0, -4, -10]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'pulse',
              pulseGlow: 1.0
            }
          }
        ];

      // 16. VOMITING (வாந்தி - Dual Hands Cascading Downward in Clearing Arcs)
      case 'vomiting':
        return [
          {
            duration: 400,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -35,
                y: -30,
                rotation: -15,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.4, 0.5, 0.5, 0.5, 0.5],
                spread: [-20, -10, 0, 10, 20]
              },
              rightHand: {
                visible: true,
                x: 35,
                y: -30,
                rotation: 15,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.4, 0.5, 0.5, 0.5, 0.5],
                spread: [20, 10, 0, -10, -20]
              },
              motionType: 'wave',
              pulseGlow: 0.7,
              motionArrow: { startX: 0, startY: -40, endX: 0, endY: 20, label: 'குமட்டல் & வாந்தி (Nausea / Vomiting)' }
            }
          },
          {
            duration: 450,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -55,
                y: 40,
                rotation: -35,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [-25, -12, 0, 12, 25]
              },
              rightHand: {
                visible: true,
                x: 55,
                y: 40,
                rotation: 35,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [25, 12, 0, -12, -25]
              },
              motionType: 'wave',
              pulseGlow: 0.95
            }
          }
        ];

      // 17. BLOOD TEST (ரத்தப் பரிசோதனை - Forearm Presentation & Vein Needle Pointer)
      case 'blood_test':
        return [
          {
            duration: 450,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -45,
                y: 15,
                rotation: 20,
                scale: 1.1,
                palmFacing: 'front', // Forearm resting
                pattern: 'open_palm',
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [-20, -10, 0, 10, 20]
              },
              rightHand: {
                visible: true,
                x: 40,
                y: -30,
                rotation: -35,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'point', // Pointing index approaching vein
                curl: [0.85, 0.0, 0.9, 0.9, 0.9],
                spread: [18, 0, -8, -12, -18]
              },
              motionType: 'pulse',
              pulseGlow: 0.7,
              motionArrow: { startX: 40, startY: -30, endX: -20, endY: 15, label: 'ரத்தம் எடுத்தல் (Blood Draw)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -40,
                y: 15,
                rotation: 15,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [-20, -10, 0, 10, 20]
              },
              rightHand: {
                visible: true,
                x: -15,
                y: 18,
                rotation: -15,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'point', // Touching cubital vein
                curl: [0.85, 0.0, 0.9, 0.9, 0.9],
                spread: [18, 0, -8, -12, -18]
              },
              motionType: 'pulse',
              pulseGlow: 1.0
            }
          }
        ];

      // 18. AFTER FOOD (சாப்பாட்டிற்கு பின் - Eating Mudra to Forward Cleared Palm)
      case 'after_food':
        return [
          {
            duration: 400,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 15,
                y: -50,
                rotation: -20,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'pinch', // Eating handshape near mouth
                curl: [0.4, 0.5, 0.5, 0.5, 0.5],
                spread: [15, 5, 0, -5, -15]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'pulse',
              pulseGlow: 0.6,
              motionArrow: { startX: 15, startY: -50, endX: 30, endY: 30, label: 'உணவு உண்ட பின் (Post-Meal)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 35,
                y: 30,
                rotation: 10,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'open_palm', // Forward sweep representing "after/completed"
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [25, 12, 0, -12, -25]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'wave',
              pulseGlow: 0.85
            }
          }
        ];

      // 19. BEFORE FOOD (உணவுக்கு முன் / வெறும் வயிற்றில் - Protective Boundary Pullback)
      case 'before_food':
        return [
          {
            duration: 450,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 40,
                y: 10,
                rotation: 0,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'open_palm', // Flat palm barrier "stop"
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [20, 10, 0, -10, -20]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'pulse',
              pulseGlow: 0.7,
              motionArrow: { startX: 40, startY: 10, endX: 10, endY: -30, label: 'உணவுக்கு முன் (Pre-Meal Barrier)' }
            }
          },
          {
            duration: 450,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 10,
                y: -30,
                rotation: -15,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [15, 6, 0, -6, -15]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'wave',
              pulseGlow: 0.85
            }
          }
        ];

      // 20. MORNING & NIGHT (காலை மற்றும் இரவு நேரம் - Horizon Arc)
      case 'morning_afternoon_night':
        return [
          {
            duration: 450,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: -50,
                y: 35,
                rotation: 25,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [25, 12, 0, -12, -25]
              },
              leftHand: {
                visible: true,
                x: -50,
                y: 45,
                rotation: 0,
                scale: 0.95,
                palmFacing: 'front', // Horizon line
                pattern: 'flat',
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [0, 0, 0, 0, 0]
              },
              motionType: 'wave',
              pulseGlow: 0.75,
              motionArrow: { startX: -50, startY: 35, endX: 50, endY: -35, label: 'காலை சூரிய உதயம் (Morning Horizon)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 50,
                y: -35,
                rotation: -25,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [25, 12, 0, -12, -25]
              },
              leftHand: {
                visible: true,
                x: 0,
                y: 45,
                rotation: 0,
                scale: 0.95,
                palmFacing: 'front',
                pattern: 'flat',
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [0, 0, 0, 0, 0]
              },
              motionType: 'wave',
              pulseGlow: 0.9
            }
          }
        ];

      // 21. HOW MANY DAYS? (எத்தனை நாட்கள்? - Sequential Counting Mudras)
      case 'how_many_days':
        return [
          {
            duration: 400,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 0,
                y: 0,
                rotation: 0,
                scale: 1.25,
                palmFacing: 'front',
                pattern: 'point', // 1 finger (Index)
                curl: [0.9, 0.0, 0.9, 0.9, 0.9],
                spread: [18, 0, -8, -12, -18]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'pulse',
              pulseGlow: 0.7,
              motionArrow: { startX: -20, startY: 20, endX: 20, endY: -20, label: 'எத்தனை நாட்கள்? (How Many Days?)' }
            }
          },
          {
            duration: 450,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 0,
                y: -10,
                rotation: 0,
                scale: 1.3,
                palmFacing: 'front',
                pattern: 'v_sign', // 2 fingers (Index + Middle V)
                curl: [0.9, 0.0, 0.0, 0.9, 0.9],
                spread: [18, -14, 14, -12, -18]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'pulse',
              pulseGlow: 0.95
            }
          }
        ];

      // 22. EYE & EAR PAIN (கண் மற்றும் காது வலி - Cranial Points)
      case 'eye_ear_pain':
        return [
          {
            duration: 450,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 20,
                y: -65,
                rotation: -20,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'point', // Pointing to eye
                curl: [0.85, 0.0, 0.9, 0.9, 0.9],
                spread: [18, 0, -8, -12, -18]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'pulse',
              pulseGlow: 0.8,
              motionArrow: { startX: 20, startY: -65, endX: 65, endY: -50, label: 'கண் & காது (Eye to Ear)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 65,
                y: -50,
                rotation: -35,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'claw', // Clamping ear
                curl: [0.4, 0.5, 0.5, 0.5, 0.5],
                spread: [18, 8, 0, -8, -18]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'pulse',
              pulseGlow: 0.95
            }
          }
        ];

      // 23. ALLERGY (தோல் ஒவ்வாமை / அரிப்பு - Forearm Scratching Mudra)
      case 'allergy':
        return [
          {
            duration: 400,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -45,
                y: 20,
                rotation: 15,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [-20, -10, 0, 10, 20]
              },
              rightHand: {
                visible: true,
                x: -30,
                y: 10,
                rotation: -25,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'claw', // Scratching claw
                curl: [0.5, 0.6, 0.6, 0.6, 0.6],
                spread: [15, 6, 0, -6, -15]
              },
              motionType: 'pulse',
              pulseGlow: 0.75,
              motionArrow: { startX: -30, startY: 10, endX: -45, endY: 30, label: 'தோல் அரிப்பு (Skin Scratch)' }
            }
          },
          {
            duration: 450,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -45,
                y: 20,
                rotation: 15,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [-20, -10, 0, 10, 20]
              },
              rightHand: {
                visible: true,
                x: -45,
                y: 30,
                rotation: -30,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'claw',
                curl: [0.6, 0.7, 0.7, 0.7, 0.7],
                spread: [12, 5, 0, -5, -12]
              },
              motionType: 'pulse',
              pulseGlow: 0.95
            }
          }
        ];

      // 24. FRACTURE (எலும்பு முறிவு - Dual Fingers Snapping Break)
      case 'fracture':
        return [
          {
            duration: 400,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -20,
                y: 10,
                rotation: 0,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'flat', // Bone aligned
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [-15, -8, 0, 8, 15]
              },
              rightHand: {
                visible: true,
                x: 20,
                y: 10,
                rotation: 0,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'flat', // Bone aligned
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [15, 8, 0, -8, -15]
              },
              motionType: 'pulse',
              pulseGlow: 0.7,
              motionArrow: { startX: -20, startY: 10, endX: -45, endY: -15, label: 'முறிவு (Sharp Break)' }
            }
          },
          {
            duration: 450,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -45,
                y: -15,
                rotation: 35,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'flat', // Snapped apart
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [-15, -8, 0, 8, 15]
              },
              rightHand: {
                visible: true,
                x: 45,
                y: -15,
                rotation: -35,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'flat', // Snapped apart
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [15, 8, 0, -8, -15]
              },
              motionType: 'pulse',
              pulseGlow: 1.0
            }
          }
        ];

      // 25. BLEEDING (ரத்தப்போக்கு - Descending Fluid Dripping Flow)
      case 'bleeding':
        return [
          {
            duration: 400,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 25,
                y: -25,
                rotation: -10,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.1, 0.2, 0.3, 0.4, 0.5],
                spread: [20, 10, 0, -10, -20]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'wave',
              pulseGlow: 0.75,
              motionArrow: { startX: 25, startY: -25, endX: 25, endY: 35, label: 'ரத்தப்போக்கு வழிதல் (Blood Flow)' }
            }
          },
          {
            duration: 450,
            state: {
              ...def,
              rightHand: {
                visible: true,
                x: 25,
                y: 35,
                rotation: 10,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.2, 0.3, 0.4, 0.5, 0.6],
                spread: [22, 10, 0, -10, -22]
              },
              leftHand: { visible: false, x: -80, y: 30, rotation: 0, scale: 0.8, palmFacing: 'front', pattern: 'open_palm', curl: [0.2, 0.2, 0.2, 0.2, 0.2], spread: [0, 0, 0, 0, 0] },
              motionType: 'wave',
              pulseGlow: 0.95
            }
          }
        ];

      // 26. SHOW PRESCRIPTION (மருத்துவர் மருந்துச் சீட்டு - Dual Palms Open Document Frame)
      case 'show_prescription':
        return [
          {
            duration: 450,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -55,
                y: 5,
                rotation: 20,
                scale: 1.15,
                palmFacing: 'front', // Holding prescription sheet
                pattern: 'open_palm',
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [-25, -12, 0, 12, 25]
              },
              rightHand: {
                visible: true,
                x: 55,
                y: 5,
                rotation: -20,
                scale: 1.15,
                palmFacing: 'front', // Holding prescription sheet
                pattern: 'open_palm',
                curl: [0.0, 0.0, 0.0, 0.0, 0.0],
                spread: [25, 12, 0, -12, -25]
              },
              motionType: 'wave',
              pulseGlow: 0.85,
              motionArrow: { startX: 0, startY: 30, endX: 0, endY: -10, label: 'மருந்துச் சீட்டு (Prescription)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -50,
                y: -5,
                rotation: 15,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [-26, -12, 0, 12, 26]
              },
              rightHand: {
                visible: true,
                x: 50,
                y: -5,
                rotation: -15,
                scale: 1.2,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [26, 12, 0, -12, -26]
              },
              motionType: 'wave',
              pulseGlow: 1.0
            }
          }
        ];

      // GENERAL DEFAULT FALLBACK (Polite TSL / ISL Two-Handed Affirmative Gesture)
      default:
        return [
          {
            duration: 450,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -70,
                y: 0,
                rotation: 15,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [-25, -12, 0, 12, 25]
              },
              rightHand: {
                visible: true,
                x: 70,
                y: 0,
                rotation: -15,
                scale: 1.1,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.05, 0.05, 0.05, 0.05, 0.05],
                spread: [25, 12, 0, -12, -25]
              },
              motionType: 'wave',
              pulseGlow: 0.75,
              motionArrow: { startX: 0, startY: 40, endX: 0, endY: 0, label: 'TSL சைகை (Signing)' }
            }
          },
          {
            duration: 500,
            state: {
              ...def,
              leftHand: {
                visible: true,
                x: -60,
                y: -10,
                rotation: 20,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [-28, -14, 0, 14, 28]
              },
              rightHand: {
                visible: true,
                x: 60,
                y: -10,
                rotation: -20,
                scale: 1.15,
                palmFacing: 'front',
                pattern: 'open_palm',
                curl: [0.1, 0.1, 0.1, 0.1, 0.1],
                spread: [28, 14, 0, -14, -28]
              },
              motionType: 'wave',
              pulseGlow: 0.9
            }
          }
        ];
    }
  }
}
