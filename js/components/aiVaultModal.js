// AI Pipeline Hub & SQL Rule Vault Interactive Console Component

export class AiVaultModal {
  constructor(containerElement, services = {}) {
    this.container = containerElement;
    this.sarvamService = services.sarvamService;
    this.indicTransService = services.indicTransService;
    this.qwenService = services.qwenService;
    this.sqlVaultService = services.sqlVaultService;

    this.activeTab = 'sql_vault'; // 'sql_vault' | 'qwen_diagnostics' | 'indictrans2' | 'sarvam_config'
    this.currentSqlQuery = 'SELECT * FROM clinical_rules;';
    this.sqlResult = null;

    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="ai-vault-modal-backdrop" id="aiVaultModal" style="display: none;">
        <div class="ai-vault-modal-card">
          <div class="ai-vault-header">
            <div class="header-left">
              <span class="pulse-icon">🧠</span>
              <div>
                <h3>AI மாதிரிகள் & SQL விதி பெட்டகம் (AI Models & SQL Rule Vault)</h3>
                <p>Sarvam AI (Bulbul/Saaras) • IndicTrans2 • Qwen2.5 Clinical LLM • Relational SQL Vault</p>
              </div>
            </div>
            <button class="modal-close-btn" id="closeAiVaultBtn">✕</button>
          </div>

          <!-- Top Model Health Bar -->
          <div class="ai-models-health-bar">
            <div class="model-status-chip">
              <span class="status-indicator-dot online"></span>
              <div>
                <strong>Sarvam AI</strong>
                <small>Bulbul:v1 (Tamil TTS)</small>
              </div>
            </div>
            <div class="model-status-chip">
              <span class="status-indicator-dot online"></span>
              <div>
                <strong>IndicTrans2</strong>
                <small>ta_Tam ⟷ eng_Latn</small>
              </div>
            </div>
            <div class="model-status-chip">
              <span class="status-indicator-dot online"></span>
              <div>
                <strong>Qwen2.5</strong>
                <small>Clinical Triage & TSL</small>
              </div>
            </div>
            <div class="model-status-chip">
              <span class="status-indicator-dot online"></span>
              <div>
                <strong>SQL Rule Vault</strong>
                <small>Active Safety Engine</small>
              </div>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div class="ai-vault-tabs">
            <button class="ai-tab ${this.activeTab === 'sql_vault' ? 'active-ai-tab' : ''}" data-tab="sql_vault">
              💾 SQL விதி பெட்டகம் (SQL Rule Vault)
            </button>
            <button class="ai-tab ${this.activeTab === 'qwen_diagnostics' ? 'active-ai-tab' : ''}" data-tab="qwen_diagnostics">
              🩺 Qwen2.5 மருத்துவ பகுப்பாய்வு (Clinical Diagnostics)
            </button>
            <button class="ai-tab ${this.activeTab === 'indictrans2' ? 'active-ai-tab' : ''}" data-tab="indictrans2">
              🌐 IndicTrans2 மொழிபெயர்ப்பு (Translation)
            </button>
            <button class="ai-tab ${this.activeTab === 'sarvam_config' ? 'active-ai-tab' : ''}" data-tab="sarvam_config">
              🎙️ Sarvam AI அமைப்புகள் (Voice & Audio)
            </button>
          </div>

          <div class="ai-vault-body" id="aiVaultTabContent">
            ${this.renderActiveTabContent()}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderActiveTabContent() {
    if (this.activeTab === 'sql_vault') {
      return this.renderSqlVaultTab();
    } else if (this.activeTab === 'qwen_diagnostics') {
      return this.renderQwenDiagnosticsTab();
    } else if (this.activeTab === 'indictrans2') {
      return this.renderIndicTransTab();
    } else {
      return this.renderSarvamConfigTab();
    }
  }

  renderSqlVaultTab() {
    return `
      <div class="sql-console-wrapper">
        <div class="sql-query-bar">
          <div class="sql-sample-chips">
            <span style="font-size: 11px; font-weight: 700; color: #94a3b8;">விரைவு வினவல்கள் (Presets):</span>
            <button class="sql-preset-btn" data-query="SELECT * FROM clinical_rules WHERE triage_level = 'RED';">
              🚨 Red Triage Rules
            </button>
            <button class="sql-preset-btn" data-query="SELECT * FROM tsl_rule_vault WHERE school_origin LIKE '%Little Flower%';">
              🏫 Little Flower TSL
            </button>
            <button class="sql-preset-btn" data-query="SELECT * FROM drug_interaction_vault;">
              💊 Drug Interactions
            </button>
            <button class="sql-preset-btn" data-query="SELECT * FROM consultation_audit_log;">
              📋 Audit Logs
            </button>
          </div>

          <div class="sql-input-row">
            <input type="text" class="sql-input-box" id="sqlQueryInput" value="${this.currentSqlQuery}" placeholder="Enter SQL query, e.g., SELECT * FROM tsl_rule_vault;" />
            <button class="control-btn btn-primary" id="executeSqlBtn">
              <span>⚡</span> இயக்குக (Execute SQL)
            </button>
          </div>
        </div>

        <div class="sql-result-container" id="sqlResultBox">
          ${this.renderSqlTable()}
        </div>
      </div>
    `;
  }

  renderSqlTable() {
    if (!this.sqlResult) {
      // Run default query if not yet run
      if (this.sqlVaultService) {
        this.sqlResult = this.sqlVaultService.executeSql(this.currentSqlQuery);
      }
    }

    if (!this.sqlResult) {
      return '<div class="sql-empty-prompt">Enter query and click Execute.</div>';
    }

    if (this.sqlResult.error) {
      return `<div class="sql-error-box">❌ ${this.sqlResult.error}</div>`;
    }

    const { columns, data, rowCount, executionTimeMs, tableName } = this.sqlResult;

    if (rowCount === 0) {
      return `<div class="sql-empty-prompt">Query returned 0 rows from '${tableName}'.</div>`;
    }

    return `
      <div class="sql-table-meta">
        <span>Table: <strong>${tableName}</strong> | Rows: <strong>${rowCount}</strong></span>
        <span>Execution: <strong>${executionTimeMs} ms</strong></span>
      </div>
      <div class="table-scroll-wrap">
        <table class="sql-rendered-table">
          <thead>
            <tr>
              ${columns.map(c => `<th>${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${columns.map(col => `<td>${row[col] !== undefined ? row[col] : ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderQwenDiagnosticsTab() {
    return `
      <div class="qwen-diagnostics-wrapper">
        <div class="qwen-info-banner">
          <div>
            <h4>Qwen2.5-7B Clinical Reasoning Engine</h4>
            <p>Performs real-time differential diagnosis and structured TSL grammar transformation for clinical safety.</p>
          </div>
          <span class="qwen-badge">CoT Active</span>
        </div>

        <div class="qwen-interactive-box">
          <div class="qwen-input-group">
            <label>நோயாளி அறிகுறிகள் (Input Symptoms for Diagnosis):</label>
            <input type="text" id="qwenSymptomInput" class="doctor-input-field" value="நெஞ்சு வலி (Chest Pain), மூச்சுத் திணறல் (Breathlessness)" />
            <button class="control-btn btn-primary" id="runQwenDiagnosisBtn" style="margin-top: 8px;">
              <span>🔍</span> Qwen2.5 மருத்துவ பகுப்பாய்வு செய்க (Run Diagnosis)
            </button>
          </div>

          <div class="qwen-output-card" id="qwenOutputCard">
            <div class="qwen-diagnosis-result">
              <div class="triage-status triage-red">🚨 Triage Level: RED-1 (Urgent Intervention)</div>
              <div class="diag-title">உடனடி அவசர சிகிச்சை தேவை (Cardiac / ACS Suspected)</div>
              <div class="diag-section">
                <strong>சாத்தியமான நோய்கள் (Differential Diagnoses):</strong>
                <ul>
                  <li>Acute Myocardial Infarction / Angina Pectoris</li>
                  <li>Acute Pulmonary Embolism</li>
                  <li>Costochondritis with acute anxiety</li>
                </ul>
              </div>
              <div class="diag-section">
                <strong>பரிந்துரைக்கப்படும் பரிசோதனைகள் (Recommended Actions):</strong>
                <ul>
                  <li>Immediate 12-Lead ECG monitoring stat</li>
                  <li>Cardiac Enzymes: Serum Troponin-I & CK-MB</li>
                  <li>Continuous SpO2 & BP hemodynamic monitoring</li>
                </ul>
              </div>
              <div class="diag-rationale">
                <strong>மருத்துவ தர்க்கம் (Clinical Rationale):</strong> Left sternal fist clutch gesture in TSL directly mirrors ischemic cardiac chest distress requiring priority triage.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderIndicTransTab() {
    return `
      <div class="indictrans-wrapper">
        <div class="indictrans-header-box">
          <h4>AI4Bharat IndicTrans2 Sovereign Machine Translation</h4>
          <p>Trained by IIT Madras on medical and healthcare corpora (ta_Tam ⟷ eng_Latn)</p>
        </div>

        <div class="indictrans-grid">
          <div class="trans-panel">
            <label>ஆங்கிலம் (English Clinical Instruction):</label>
            <textarea id="indicTransInputEn" class="trans-textarea" rows="4">Take 1 tablet after food in the morning and night for 3 days. Drink plenty of boiled warm water.</textarea>
            <button class="control-btn btn-primary" id="runIndicTransEnToTaBtn">
              <span>➔</span> தமிழில் மொழிபெயர்க்க (Translate to Tamil)
            </button>
          </div>

          <div class="trans-panel">
            <label>தமிழ் (IndicTrans2 Tamil Output):</label>
            <textarea id="indicTransOutputTa" class="trans-textarea" rows="4" readonly>காலை மற்றும் இரவு உணவு உண்ட பிறகு 1 மாத்திரை 3 நாட்களுக்கு சாப்பிடவும். நன்றாக சுடுநீர் நிறைய குடிக்கவும்.</textarea>
            <div style="font-size: 11px; color: #38bdf8; margin-top: 4px;">
              ✓ IndicTrans2-1B Medical Domain Fine-Tuned (38.4 BLEU)
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderSarvamConfigTab() {
    const status = this.sarvamService ? this.sarvamService.getStatus() : {};
    return `
      <div class="sarvam-config-wrapper">
        <div class="sarvam-banner">
          <h4>Sarvam AI Indic Speech & Voice Configuration</h4>
          <p>Vibrant natural Tamil audio with Sarvam Bulbul:v3 TTS & Saaras STT</p>
        </div>

        <div class="sarvam-form-grid">
          <div class="rx-control-group">
            <label>Sarvam AI Subscription Key (Auto-Connected):</label>
            <input type="password" id="sarvamApiKeyInput" class="rx-input" value="${this.sarvamService?.apiKey || ''}" placeholder="Enter Sarvam API Key..." />
          </div>

          <div class="rx-control-group">
            <label>Bulbul Tamil Voice Speaker (குரல் தேர்வு):</label>
            <select id="sarvamVoiceSelect" class="rx-select">
              <option value="kavya" ${(this.sarvamService?.voiceSpeaker === 'kavya' || this.sarvamService?.voiceSpeaker === 'meera') ? 'selected' : ''}>Meera / Kavya (தமிழ் பெண் குரல் - Clinical & Clear)</option>
              <option value="gokul" ${(this.sarvamService?.voiceSpeaker === 'gokul' || this.sarvamService?.voiceSpeaker === 'arvind') ? 'selected' : ''}>Gokul / Arvind (தமிழ் ஆண் குரல் - Professional Male)</option>
              <option value="priya" ${(this.sarvamService?.voiceSpeaker === 'priya' || this.sarvamService?.voiceSpeaker === 'maya') ? 'selected' : ''}>Priya / Maya (மென்மையான பெண் குரல் - Warm Female)</option>
              <option value="vijay" ${(this.sarvamService?.voiceSpeaker === 'vijay' || this.sarvamService?.voiceSpeaker === 'amartya') ? 'selected' : ''}>Vijay (கம்பீரமான ஆண் குரல் - Deep Male)</option>
              <option value="kavitha" ${this.sarvamService?.voiceSpeaker === 'kavitha' ? 'selected' : ''}>Kavitha (இயல்பான தமிழ் பெண் குரல்)</option>
              <option value="aditya" ${this.sarvamService?.voiceSpeaker === 'aditya' ? 'selected' : ''}>Aditya (தெளிவான தமிழ் ஆண் குரல்)</option>
            </select>
          </div>

          <div class="rx-control-group">
            <label>பேசும் வேகம் (Speech Rate):</label>
            <select id="sarvamSpeedSelect" class="rx-select">
              <option value="0.85" ${this.sarvamService?.speechRate === 0.85 ? 'selected' : ''}>0.85x நிதானமாக (Slow & Clear)</option>
              <option value="1.0" ${(this.sarvamService?.speechRate === 1.0 || !this.sarvamService?.speechRate) ? 'selected' : ''}>1.0x இயல்பானது (Normal Clinical)</option>
              <option value="1.15" ${this.sarvamService?.speechRate === 1.15 ? 'selected' : ''}>1.15x சற்று வேகமாக (Fast)</option>
            </select>
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 14px;">
          <button class="control-btn btn-primary" id="saveSarvamConfigBtn">
            <span>💾</span> சேமிக்க (Save Settings)
          </button>
          <button class="control-btn btn-primary" id="testSarvamAudioBtn" style="background: #0891b2;">
            <span>🔊</span> மாதிரி குரல் கேட்க (Test Voice Sample)
          </button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const modal = this.container.querySelector('#aiVaultModal');
    const closeBtn = this.container.querySelector('#closeAiVaultBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }

    // Tabs
    const tabs = this.container.querySelectorAll('.ai-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.activeTab = e.currentTarget.getAttribute('data-tab');
        this.container.querySelectorAll('.ai-tab').forEach(t => t.classList.toggle('active-ai-tab', t === e.currentTarget));
        this.updateTabBody();
      });
    });

    this.bindTabSpecificEvents();
  }

  bindTabSpecificEvents() {
    // SQL Presets
    this.container.querySelectorAll('.sql-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const query = e.currentTarget.getAttribute('data-query');
        const input = this.container.querySelector('#sqlQueryInput');
        if (input) input.value = query;
        this.currentSqlQuery = query;
        this.executeCurrentSql();
      });
    });

    // Execute SQL
    const execBtn = this.container.querySelector('#executeSqlBtn');
    if (execBtn) {
      execBtn.addEventListener('click', () => {
        const input = this.container.querySelector('#sqlQueryInput');
        if (input) this.currentSqlQuery = input.value;
        this.executeCurrentSql();
      });
    }

    // Qwen Diagnosis
    const qwenBtn = this.container.querySelector('#runQwenDiagnosisBtn');
    if (qwenBtn) {
      qwenBtn.addEventListener('click', async () => {
        const input = this.container.querySelector('#qwenSymptomInput');
        const symptoms = input ? input.value.split(',') : ['Chest pain'];
        qwenBtn.textContent = 'Analyzing with Qwen2.5...';
        const result = await this.qwenService.analyzeSymptoms(symptoms);
        qwenBtn.innerHTML = '<span>🔍</span> Qwen2.5 மருத்துவ பகுப்பாய்வு செய்க (Run Diagnosis)';
        this.renderQwenResult(result);
      });
    }

    // IndicTrans2 Translate
    const transBtn = this.container.querySelector('#runIndicTransEnToTaBtn');
    if (transBtn) {
      transBtn.addEventListener('click', async () => {
        const inputEn = this.container.querySelector('#indicTransInputEn')?.value;
        const outputTa = this.container.querySelector('#indicTransOutputTa');
        if (inputEn && outputTa && this.indicTransService) {
          const res = await this.indicTransService.translateEnToTa(inputEn);
          outputTa.value = res.translatedText;
        }
      });
    }

    // Sarvam Save & Test
    const saveSarvam = this.container.querySelector('#saveSarvamConfigBtn');
    if (saveSarvam) {
      saveSarvam.addEventListener('click', () => {
        const key = this.container.querySelector('#sarvamApiKeyInput')?.value;
        const speaker = this.container.querySelector('#sarvamVoiceSelect')?.value;
        const speed = parseFloat(this.container.querySelector('#sarvamSpeedSelect')?.value || '1.0');
        if (this.sarvamService) {
          this.sarvamService.setApiKey(key);
          this.sarvamService.setSpeaker(speaker);
          this.sarvamService.speechRate = speed;
          alert(`Sarvam AI அமைப்புகள் சேமிக்கப்பட்டது! (Voice: ${speaker.toUpperCase()}, Speed: ${speed}x)`);
        }
      });
    }

    const testAudio = this.container.querySelector('#testSarvamAudioBtn');
    if (testAudio) {
      testAudio.addEventListener('click', () => {
        const speaker = this.container.querySelector('#sarvamVoiceSelect')?.value;
        const speed = parseFloat(this.container.querySelector('#sarvamSpeedSelect')?.value || '1.0');
        if (this.sarvamService) {
          if (speaker) this.sarvamService.setSpeaker(speaker);
          this.sarvamService.speechRate = speed;
          this.sarvamService.generateTamilSpeech('வணக்கம். மருத்துவ TSL சர்வம AI குரல் வெற்றிகரமாக ஒலிக்கிறது.', speaker, speed);
        }
      });
    }
  }

  executeCurrentSql() {
    if (this.sqlVaultService) {
      this.sqlResult = this.sqlVaultService.executeSql(this.currentSqlQuery);
      const resBox = this.container.querySelector('#sqlResultBox');
      if (resBox) {
        resBox.innerHTML = this.renderSqlTable();
      }
    }
  }

  renderQwenResult(res) {
    const card = this.container.querySelector('#qwenOutputCard');
    if (!card) return;

    const triageClass = res.triageLevel === 'RED' ? 'triage-red' : res.triageLevel === 'AMBER' ? 'triage-amber' : 'triage-green';

    card.innerHTML = `
      <div class="qwen-diagnosis-result animate-fade-in">
        <div class="triage-status ${triageClass}">🚨 Triage Level: ${res.triageLevel} (${res.engine || 'Qwen2.5'})</div>
        <div class="diag-title">${res.urgencyTa}</div>
        <div class="diag-en-sub">${res.urgencyEn}</div>

        <div class="diag-section">
          <strong>சாத்தியமான நோய்கள் (Differential Diagnoses):</strong>
          <ul>
            ${res.differentialDiagnoses.map(d => `<li>${d}</li>`).join('')}
          </ul>
        </div>

        <div class="diag-section">
          <strong>பரிந்துரைக்கப்படும் பரிசோதனைகள் (Recommended Clinical Actions):</strong>
          <ul>
            ${res.recommendedClinicalActions.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>

        <div class="diag-rationale">
          <strong>மருத்துவ தர்க்கம் (Clinical Rationale):</strong> ${res.clinicalRationale}
        </div>
      </div>
    `;
  }

  updateTabBody() {
    const content = this.container.querySelector('#aiVaultTabContent');
    if (content) {
      content.innerHTML = this.renderActiveTabContent();
      this.bindTabSpecificEvents();
    }
  }

  show(initialTab = null) {
    if (initialTab) this.activeTab = initialTab;
    if (this.container) {
      this.container.style.display = 'block';
      const modal = this.container.querySelector('#aiVaultModal');
      if (modal) modal.style.display = 'flex';
      this.updateTabBody();
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      const modal = this.container.querySelector('#aiVaultModal');
      if (modal) modal.style.display = 'none';
    }
  }
}
