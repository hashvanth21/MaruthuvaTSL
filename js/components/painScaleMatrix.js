// Wong-Baker Faces Pain Scale Matrix (0-10) with TSL Gloss Integration

export const PAIN_LEVELS = [
  { level: 0, emoji: '😊', score: '0', titleTa: 'வலி இல்லை', titleEn: 'No Hurt', color: '#10b981', tslGloss: 'அமைதியான முகம்', descTa: 'முழுமையான ஆரோக்கிய நிலை' },
  { level: 2, emoji: '🙂', score: '1-2', titleTa: 'லேசான வலி', titleEn: 'Hurts Little Bit', color: '#3b82f6', tslGloss: 'லேசான தொடுதல்', descTa: 'கவனம் செலுத்தக்கூடிய சிறிய வலி' },
  { level: 4, emoji: '😐', score: '3-4', titleTa: 'மிதமான வலி', titleEn: 'Hurts Little More', color: '#f59e0b', tslGloss: 'புருவம் சுருங்குதல்', descTa: 'வேலைகளை செய்ய இடையூறு' },
  { level: 6, emoji: '🙁', score: '5-6', titleTa: 'குறிப்பிடத்தக்க வலி', titleEn: 'Hurts Even More', color: '#f97316', tslGloss: 'முகத்தில் வேதனை', descTa: 'தொடர்ச்சியான அசௌகரியம்' },
  { level: 8, emoji: '😣', score: '7-8', titleTa: 'அதிக வலி', titleEn: 'Hurts Whole Lot', color: '#ef4444', tslGloss: 'நடுங்கும் முஷ்டி + கண் மூடுதல்', descTa: 'தாங்க முடியாத நிலை' },
  { level: 10, emoji: '😭', score: '9-10', titleTa: 'தாங்க முடியாத கடுமையான வலி', titleEn: 'Hurts Worst Possible', color: '#dc2626', tslGloss: 'அவசர சிகிச்சை சைகை', descTa: 'உடனடி அவசர சிகிச்சை தேவை' }
];

export class PainScaleMatrix {
  constructor(containerElement, onSelectPain = null) {
    this.container = containerElement;
    this.onSelectPain = onSelectPain;
    this.selectedLevel = 4;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="pain-matrix-card">
        <div class="pain-matrix-header">
          <div class="pain-title-row">
            <span class="pulse-icon">📊</span>
            <h4>வலி தீவிரத்தன்மை அளவுகோல் (Wong-Baker Pain Scale & TSL)</h4>
          </div>
          <span class="pain-badge" id="selectedPainBadge">Level: ${this.selectedLevel}/10</span>
        </div>

        <div class="pain-scale-items-row" role="radiogroup" aria-label="Wong-Baker Pain Scale 0-10">
          ${PAIN_LEVELS.map(p => `
            <button class="pain-level-card ${p.level === this.selectedLevel ? 'active-pain' : ''}" 
                    role="radio"
                    aria-checked="${p.level === this.selectedLevel ? 'true' : 'false'}"
                    aria-label="Pain level ${p.score} of 10: ${p.titleTa} (${p.titleEn})"
                    data-level="${p.level}" 
                    style="--level-color: ${p.color}">
              <span class="pain-emoji" aria-hidden="true">${p.emoji}</span>
              <span class="pain-score-pill">${p.score}</span>
              <span class="pain-ta">${p.titleTa}</span>
              <span class="pain-en">${p.titleEn}</span>
              <span class="pain-tsl-gloss">TSL: ${p.tslGloss}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const cards = this.container.querySelectorAll('.pain-level-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        const level = parseInt(e.currentTarget.getAttribute('data-level'), 10);
        this.selectLevel(level);
      });
    });
  }

  selectLevel(level) {
    this.selectedLevel = level;
    const painObj = PAIN_LEVELS.find(p => p.level === level) || PAIN_LEVELS[2];

    this.container.querySelectorAll('.pain-level-card').forEach(c => {
      const isSelected = parseInt(c.getAttribute('data-level'), 10) === level;
      c.setAttribute('aria-checked', isSelected ? 'true' : 'false');
      if (isSelected) {
        c.classList.add('active-pain');
      } else {
        c.classList.remove('active-pain');
      }
    });

    const badge = this.container.querySelector('#selectedPainBadge');
    if (badge) {
      badge.textContent = `Level: ${painObj.score}/10 (${painObj.titleEn})`;
      badge.style.backgroundColor = painObj.color;
    }

    if (this.onSelectPain) {
      this.onSelectPain(painObj);
    }
  }
}
