// 1-Tap Emergency SOS Rapid Triage Component
import { getTslSignById } from '../data/tslMedicalVocabulary.js';

export const EMERGENCY_CONDITIONS = [
  { id: 'chest_pain', labelTa: 'மாரடைப்பு / நெஞ்சு வலி', labelEn: 'Heart Attack / Chest Pain', triageCode: 'RED-1 (Cardiac)' },
  { id: 'breathlessness', labelTa: 'கடுமையான மூச்சுத்திணறல்', labelEn: 'Severe Respiratory Distress', triageCode: 'RED-2 (Airway)' },
  { id: 'fracture', labelTa: 'எலும்பு முறிவு / விபத்து', labelEn: 'Trauma / Bone Fracture', triageCode: 'AMBER-1 (Trauma)' },
  { id: 'allergy', labelTa: 'அனாபிலாக்ஸிஸ் ஒவ்வாமை', labelEn: 'Anaphylaxis / Severe Allergy', triageCode: 'RED-3 (Allergy)' },
  { id: 'dizziness', labelTa: 'மயக்கம் / சுயநினைவின்மை', labelEn: 'Unconscious / Syncope', triageCode: 'AMBER-2 (Neuro)' }
];

export class EmergencySosModule {
  constructor(containerElement, onTriggerEmergency = null) {
    this.container = containerElement;
    this.onTriggerEmergency = onTriggerEmergency;
    this.isAlertActive = false;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="emergency-sos-bar" id="sosBar" role="region" aria-label="அவசர சிகிச்சை (Emergency SOS Triage Bar)">
        <div class="sos-left-group">
          <div class="sos-badge-flashing" role="status" aria-live="polite">
            <span class="siren-icon" aria-hidden="true">🚨</span>
            <span class="sos-text">அவசர சிகிச்சை (EMERGENCY SOS TRIAGE)</span>
          </div>
          <span class="sos-subtitle">1-Tap rapid clinical triage for critical Deaf patient distress</span>
        </div>

        <div class="sos-action-buttons" role="group" aria-label="Emergency conditions">
          ${EMERGENCY_CONDITIONS.map((c, idx) => `
            <button class="sos-quick-btn" data-sign-id="${c.id}" aria-label="Emergency alert ${c.labelTa} ${c.triageCode}" title="Alt+${idx + 1}: ${c.labelTa}">
              <span class="triage-dot ${c.triageCode.includes('AMBER') ? 'amber-dot' : ''}" aria-hidden="true"></span>
              <span class="btn-ta">${c.labelTa.split('/')[0].trim()}</span>
              <span class="btn-code">${c.triageCode}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const buttons = this.container.querySelectorAll('.sos-quick-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const signId = e.currentTarget.getAttribute('data-sign-id');
        this.triggerEmergency(signId);
      });
    });

    // Global keyboard shortcuts Alt+1 through Alt+5 for emergency triage
    document.addEventListener('keydown', (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && e.key >= '1' && e.key <= '5') {
        const idx = parseInt(e.key, 10) - 1;
        if (EMERGENCY_CONDITIONS[idx]) {
          e.preventDefault();
          this.triggerEmergency(EMERGENCY_CONDITIONS[idx].id);
        }
      }
    });
  }

  triggerEmergency(signId) {
    const condition = EMERGENCY_CONDITIONS.find(c => c.id === signId) || EMERGENCY_CONDITIONS[0];
    const sign = getTslSignById(signId);

    // Flash screen alert
    const sosBar = this.container.querySelector('#sosBar');
    if (sosBar) {
      sosBar.classList.add('sos-active-flash');
      setTimeout(() => sosBar.classList.remove('sos-active-flash'), 3500);
    }

    if (this.onTriggerEmergency) {
      this.onTriggerEmergency({
        signId,
        condition,
        sign,
        alertTime: new Date().toLocaleTimeString()
      });
    }
  }
}
