// Bilingual Speech Audio Service (Tamil தமிழ் & English)
// Features Multi-Tiered Synthesis: Web Audio API Zero-Latency Buffer Player + Server HA TTS (/api/tts/synthesize) + Web Speech API
// Guaranteed Zero-Overlap Single-Stream Audio Engine with Monotonic Session Tokens

export class SpeechAudioService {
  constructor() {
    this.synthesis = window.speechSynthesis || null;
    this.voices = [];
    this.tamilVoice = null;
    this.englishVoice = null;
    this.isMuted = false;
    this.speechRate = 0.95;
    this.speechPitch = 1.0;
    this.languageMode = 'both'; // 'ta' (Tamil only), 'en' (English only), 'both' (Bilingual)
    this.audioElement = new Audio(); // Fallback streaming audio
    this.sarvamService = null; // Sarvam AI Bulbul Indic TTS integration

    // Live Audio Waveform Visualizer
    this.waveformCanvas = null;
    this.waveformCtx = null;
    this.wavePhase = 0;
    this.isAudioActive = false;

    // Web Audio API Engine & Strict Session Generation Counter (Prevents All Audio Overlaps)
    this.audioCtx = null;
    this.currentSourceNode = null;
    this.bilingualTimer = null;
    this.activeSessionId = 0;

    // Speech Recognition (STT for Doctor Voice Input)
    this.recognition = null;
    this.isListening = false;
    this.recognitionLanguage = 'ta-IN';

    this.initVoices();
    this.initSpeechRecognition();

    // Unlock Web Audio API & Audio Elements on ANY user interaction
    const userUnlocker = () => this.unlockAudio();
    ['click', 'touchstart', 'keydown', 'pointerdown'].forEach(evt => {
      document.addEventListener(evt, userUnlocker, { passive: true });
    });
  }

  // Waveform Visualizer Engine
  initWaveform(canvasElement) {
    if (!canvasElement) return;
    this.waveformCanvas = canvasElement;
    this.waveformCtx = canvasElement.getContext('2d');
    this.renderWaveformLoop();
  }

  setAudioActive(active) {
    this.isAudioActive = active;
  }

  renderWaveformLoop() {
    if (!this.waveformCanvas || !this.waveformCtx) return;
    const ctx = this.waveformCtx;
    const w = this.waveformCanvas.width;
    const h = this.waveformCanvas.height;

    ctx.clearRect(0, 0, w, h);

    const isActive = this.isAudioActive || this.isListening;
    ctx.lineWidth = isActive ? 2.2 : 1.2;
    ctx.strokeStyle = isActive ? '#38bdf8' : 'rgba(56, 189, 248, 0.3)';
    ctx.shadowBlur = isActive ? 8 : 0;
    ctx.shadowColor = '#38bdf8';

    ctx.beginPath();
    const midY = h / 2;
    const points = 24;
    for (let i = 0; i <= points; i++) {
      const x = (i / points) * w;
      const amp = isActive ? (h * 0.4 * Math.sin(this.wavePhase * 2 + i * 0.45)) : 1.5;
      const y = midY + Math.sin((i / points) * Math.PI * 3 + this.wavePhase) * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    this.wavePhase += isActive ? 0.22 : 0.03;
    requestAnimationFrame(() => this.renderWaveformLoop());
  }

  initVoices() {
    if (!this.synthesis) return;

    const loadVoices = () => {
      this.voices = this.synthesis.getVoices();

      // Find Tamil voice
      this.tamilVoice = this.voices.find(v => {
        const lang = (v.lang || '').toLowerCase();
        const name = (v.name || '').toLowerCase();
        return lang === 'ta-in' || lang === 'ta_in' || lang === 'ta-lk' || lang === 'ta-sg' || lang.startsWith('ta') ||
               name.includes('tamil') || name.includes('தமிழ்') || name.includes('vani') || name.includes('valluvar');
      }) || null;

      // Find English voice
      this.englishVoice = this.voices.find(v => v.lang === 'en-IN') ||
                          this.voices.find(v => v.lang === 'en-GB') ||
                          this.voices.find(v => v.lang.startsWith('en')) || null;
    };

    loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = loadVoices;
    }
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = this.recognitionLanguage;
    }
  }

  setLanguageMode(mode) {
    if (mode === 'ta' || mode === 'en' || mode === 'both') {
      this.languageMode = mode;
    }
  }

  setSarvamService(sarvamService) {
    this.sarvamService = sarvamService;
  }

  // Ensure AudioContext is instantiated and running (Audio Autoplay Policy Unblocker)
  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  // Explicit user-gesture audio unlocker
  unlockAudio() {
    try {
      const ctx = this.initAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      if (this.synthesis && this.synthesis.paused) {
        this.synthesis.resume();
      }
      const master = document.getElementById('masterAudioPlayer') || this.audioElement;
      if (master && master.paused && !master.src) {
        master.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
        master.play().then(() => { master.pause(); master.currentTime = 0; master.src = ''; }).catch(() => {});
      }
    } catch (e) {}
  }

  /**
   * Immediately stops and silences all currently playing audio streams.
   * Crucially clears all event listeners and timers so cancelled speech never fires callbacks.
   */
  stopAudio(resetSession = false) {
    if (this.bilingualTimer) {
      clearTimeout(this.bilingualTimer);
      this.bilingualTimer = null;
    }

    if (resetSession) {
      this.activeSessionId++;
    }

    // Silence Web Audio source node without triggering its onended handler!
    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.onended = null; // Detach before stop to prevent cascading callback!
        this.currentSourceNode.stop(0);
        this.currentSourceNode.disconnect();
      } catch (e) {}
      this.currentSourceNode = null;
    }

    // Silence DOM audio elements
    const master = document.getElementById('masterAudioPlayer');
    if (master) {
      try {
        master.onended = null;
        master.onerror = null;
        master.pause();
        master.currentTime = 0;
      } catch (e) {}
    }

    if (this.audioElement) {
      try {
        this.audioElement.onended = null;
        this.audioElement.onerror = null;
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch (e) {}
    }

    // Silence Web Speech API
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }

    this.setAudioActive(false);
  }

  /**
   * Play audio data (Base64 WAV / MP3 or data URI) with Web Audio API.
   * Protected against stale session overwrites and overlap races.
   * Returns true if audio playback succeeded, false otherwise.
   */
  async playAudioBufferOrUri(audioPayload, onEndCallback = null, session = null) {
    if (this.isMuted || !audioPayload) {
      if (onEndCallback) onEndCallback();
      return false;
    }

    // Check session freshness
    if (session && session !== this.activeSessionId) {
      return false; // Stale session, discard!
    }

    this.unlockAudio();
    this.stopAudio(false); // Silence previous audio without bumping current session
    this.setAudioActive(true);

    let finished = false;
    const finish = () => {
      if (!finished) {
        finished = true;
        this.setAudioActive(false);
        if (session && session !== this.activeSessionId) {
          return; // Superseded by a newer session, do not trigger chained callbacks!
        }
        if (onEndCallback) onEndCallback();
      }
    };

    // Clean base64 string
    let base64 = audioPayload;
    if (base64.startsWith('data:')) {
      const commaIdx = base64.indexOf(',');
      if (commaIdx !== -1) {
        base64 = base64.substring(commaIdx + 1);
      }
    }

    // MIME type detection
    let mimeType = 'audio/wav';
    if (audioPayload.startsWith('data:audio/mpeg') || audioPayload.startsWith('data:audio/mp3')) {
      mimeType = 'audio/mpeg';
    } else if (
      base64.startsWith('//u') ||
      base64.startsWith('//v') ||
      base64.startsWith('//w') ||
      base64.startsWith('SUQz') ||
      base64.startsWith('/+M') ||
      base64.startsWith('//O')
    ) {
      mimeType = 'audio/mpeg';
    } else if (base64.startsWith('UklGR')) {
      mimeType = 'audio/wav';
    }

    // TIER A: Web Audio API (Primary - Zero latency, immune to transient gesture timeouts)
    try {
      const ctx = this.initAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        if (session && session !== this.activeSessionId) {
          return false; // Abort if invalidated while resuming context
        }

        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // decodeAudioData seamlessly parses WAV / MP3 array buffers
        const audioBuffer = await new Promise((resolve, reject) => {
          ctx.decodeAudioData(bytes.buffer.slice(0), resolve, reject);
        });

        if (session && session !== this.activeSessionId) {
          return false; // Abort if superseded while decoding audio
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        this.currentSourceNode = source;

        source.onended = () => {
          if (session && session !== this.activeSessionId) {
            return;
          }
          this.currentSourceNode = null;
          finish();
        };

        source.start(0);
        return true;
      }
    } catch (webAudioErr) {
      console.warn('[SpeechAudioService] Web Audio decode error, trying HTMLAudio fallback:', webAudioErr);
    }

    // TIER B: HTMLAudioElement with Data URI
    try {
      if (session && session !== this.activeSessionId) {
        return false;
      }

      const dataUri = audioPayload.startsWith('data:') ? audioPayload : `data:${mimeType};base64,${base64}`;
      const master = document.getElementById('masterAudioPlayer') || this.audioElement;
      if (master) {
        master.pause();
        master.currentTime = 0;
        master.src = dataUri;
        master.onended = () => {
          if (session && session !== this.activeSessionId) return;
          finish();
        };
        master.onerror = (err) => {
          console.warn('[SpeechAudioService] HTMLAudio element playback error:', err);
          finish();
        };
        const playPromise = master.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        return true;
      }
    } catch (e) {
      console.warn('[SpeechAudioService] HTMLAudio element error:', e);
    }

    finish();
    return false;
  }

  // Alias for backward compatibility
  playAudioUri(uri, onEndCallback = null) {
    return this.playAudioBufferOrUri(uri, onEndCallback);
  }

  // Speak authentic Tamil text using HA Tiered Synthesis Engine
  async speakTamilText(tamilSentence, onEndCallback = null, session = null) {
    if (this.isMuted || !tamilSentence) {
      if (onEndCallback) onEndCallback();
      return;
    }

    const mySession = session || ++this.activeSessionId;
    this.unlockAudio();
    this.stopAudio(false);

    // Normalize and sanitize text
    let cleanSentence = (tamilSentence || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanSentence.length > 490) {
      cleanSentence = cleanSentence.substring(0, 490);
    }

    if (!cleanSentence) {
      if (onEndCallback) onEndCallback();
      return;
    }

    // 1. Primary Engine: High-Availability Failover Router (/api/tts/synthesize)
    try {
      const resp = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanSentence,
          lang: 'ta',
          speaker: this.sarvamService?.voiceSpeaker || 'kavya'
        })
      });

      if (mySession !== this.activeSessionId) {
        return; // Superseded by newer click during fetch
      }

      if (resp.ok) {
        const data = await resp.json();
        if (data && (data.audio_base64 || data.audio_data_uri)) {
          const payload = data.audio_base64 || data.audio_data_uri;
          const played = await this.playAudioBufferOrUri(payload, onEndCallback, mySession);
          if (played) return;
        }
      }
    } catch (apiErr) {
      console.warn('[SpeechAudioService] Server TTS synthesize error:', apiErr);
    }

    if (mySession !== this.activeSessionId) {
      return;
    }

    // 2. Secondary Engine: Native Web Speech API
    this.speakFallbackTamil(cleanSentence, onEndCallback, mySession);
  }

  // Web Speech Fallback for Tamil
  speakFallbackTamil(cleanSentence, onEndCallback = null, session = null) {
    if (session && session !== this.activeSessionId) return;

    if (window.speechSynthesis) {
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        const utterance = new SpeechSynthesisUtterance(cleanSentence);
        utterance.lang = 'ta-IN';
        utterance.rate = 0.90;

        const voices = window.speechSynthesis.getVoices();
        const tamilVoice = voices.find(v => {
          const l = (v.lang || '').toLowerCase();
          const n = (v.name || '').toLowerCase();
          return l.includes('ta') || l.includes('ta-in') || l.includes('ta_in') || n.includes('tamil') || n.includes('தமிழ்');
        });

        if (tamilVoice) {
          utterance.voice = tamilVoice;
        }

        this.setAudioActive(true);
        let finished = false;
        utterance.onend = () => {
          this.setAudioActive(false);
          if (!finished) {
            finished = true;
            if (session && session !== this.activeSessionId) return;
            if (onEndCallback) onEndCallback();
          }
        };
        utterance.onerror = () => {
          this.setAudioActive(false);
          if (!finished) {
            finished = true;
            if (session && session !== this.activeSessionId) return;
            if (onEndCallback) onEndCallback();
          }
        };
        window.speechSynthesis.speak(utterance);
        return;
      } catch (e) {
        console.warn('[SpeechAudioService] Web Speech Tamil error:', e);
      }
    }
    if (onEndCallback) onEndCallback();
  }

  // Speak natural Tamil voice audio
  speakTamil(text, onEndCallback = null) {
    return this.speakTamilText(text, onEndCallback);
  }

  // Speak English with dual engine redundancy (Server HA Synthesizer + Native SpeechSynthesis Fallback)
  async speakEnglish(text, onEndCallback = null, session = null) {
    if (this.isMuted || !text) {
      if (onEndCallback) onEndCallback();
      return;
    }

    const mySession = session || ++this.activeSessionId;
    this.unlockAudio();
    this.stopAudio(false);

    let cleanText = (text || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      if (onEndCallback) onEndCallback();
      return;
    }

    // 1. Primary: Server HA Synthesizer Endpoint (/api/tts/synthesize with lang='en')
    try {
      const resp = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          lang: 'en',
          speaker: 'samantha'
        })
      });

      if (mySession !== this.activeSessionId) {
        return; // Superseded by newer click
      }

      if (resp.ok) {
        const data = await resp.json();
        if (data && (data.audio_base64 || data.audio_data_uri)) {
          const payload = data.audio_base64 || data.audio_data_uri;
          const played = await this.playAudioBufferOrUri(payload, onEndCallback, mySession);
          if (played) return;
        }
      }
    } catch (apiErr) {
      console.warn('[SpeechAudioService] English server TTS synthesize error:', apiErr);
    }

    if (mySession !== this.activeSessionId) {
      return;
    }

    // 2. Secondary: Native SpeechSynthesis Utterance
    this.speakFallbackEnglish(cleanText, onEndCallback, mySession);
  }

  // Web Speech Fallback for English
  speakFallbackEnglish(cleanText, onEndCallback = null, session = null) {
    if (session && session !== this.activeSessionId) return;

    if (this.synthesis) {
      try {
        if (this.synthesis.paused) this.synthesis.resume();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'en-IN';
        utterance.rate = this.speechRate || 0.95;

        if (!this.englishVoice) {
          const voices = this.synthesis.getVoices();
          this.englishVoice = voices.find(v => v.lang === 'en-IN') ||
                              voices.find(v => v.lang === 'en-GB') ||
                              voices.find(v => v.lang.startsWith('en')) || null;
        }
        if (this.englishVoice) {
          utterance.voice = this.englishVoice;
        }

        this.setAudioActive(true);
        let finished = false;
        utterance.onend = () => {
          this.setAudioActive(false);
          if (!finished) {
            finished = true;
            if (session && session !== this.activeSessionId) return;
            if (onEndCallback) onEndCallback();
          }
        };

        utterance.onerror = () => {
          this.setAudioActive(false);
          if (!finished) {
            finished = true;
            if (session && session !== this.activeSessionId) return;
            if (onEndCallback) onEndCallback();
          }
        };

        this.synthesis.speak(utterance);
        return;
      } catch (e) {
        console.warn('[SpeechAudioService] Native SpeechSynthesis English error:', e);
      }
    }
    if (onEndCallback) onEndCallback();
  }

  // Smart Bilingual Audio Controller: Zero-Overlap, Monotonically Sequenced
  speakBilingual(tamilText, englishText) {
    if (this.isMuted) return;

    // Increment session ID to completely invalidate any previously running speech or pending timers
    const session = ++this.activeSessionId;
    this.stopAudio(false);
    this.unlockAudio();

    if (this.languageMode === 'ta') {
      // Tamil Only
      this.speakTamilText(tamilText, null, session);
    } else if (this.languageMode === 'en') {
      // English Only
      this.speakEnglish(englishText, null, session);
    } else {
      // Both: Speaks Tamil first, then English sequentially with guaranteed session safety
      if (tamilText) {
        this.speakTamilText(tamilText, () => {
          // Check if user has clicked something else during Tamil playback
          if (session !== this.activeSessionId || this.isMuted) {
            return;
          }
          if (englishText) {
            this.bilingualTimer = setTimeout(() => {
              if (session !== this.activeSessionId || this.isMuted) {
                return;
              }
              this.speakEnglish(englishText, null, session);
            }, 260);
          }
        }, session);
      } else if (englishText) {
        this.speakEnglish(englishText, null, session);
      }
    }
  }

  // Start Doctor Speech-to-Text
  startListening(language = 'ta-IN', onResultCallback, onEndCallback, onErrorCallback) {
    // Re-initialize recognition instance to clear any stalled internal states
    this.initSpeechRecognition();

    if (!this.recognition) {
      if (onErrorCallback) onErrorCallback('Speech recognition is not supported in this browser.');
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.recognitionLanguage = language;
    this.recognition.lang = language;

    // Proactively request microphone access if supported
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      }).catch((e) => {
        console.warn('[SpeechAudioService] getUserMedia mic check:', e);
      });
    }

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (onResultCallback) {
        onResultCallback({
          final: finalTranscript.trim(),
          interim: interimTranscript.trim(),
          isFinal: finalTranscript.trim().length > 0
        });
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      if (onErrorCallback) onErrorCallback(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEndCallback) onEndCallback();
    };

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e) {
      console.error('Speech recognition start failed:', e);
      this.isListening = false;
      if (onErrorCallback) onErrorCallback(e.message || 'start_failed');
      return false;
    }
  }

  stopListening() {
    if (this.recognition) {
      try {
        this.recognition.abort(); // abort immediately terminates recording without lingering buffer locks
      } catch (e) {}
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAudio(true);
    }
    return this.isMuted;
  }

  setSpeechRate(rate) {
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
  }
}
