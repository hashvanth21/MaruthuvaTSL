// TSL Lexicon & Regional Dialect Explorer Component
import { TSL_MEDICAL_LEXICON } from '../data/tslMedicalVocabulary.js';
import { TSL_UYIR_EZHUTHUKKAL, TSL_MEI_EZHUTHUKKAL } from '../data/tslAlphabet.js';

export class TslLexiconViewer {
  constructor(containerElement, onPlaySignCallback = null) {
    this.container = containerElement;
    this.onPlaySign = onPlaySignCallback;
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.currentTab = 'medical'; // 'medical' | 'alphabet'
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="lexicon-modal-backdrop" id="lexiconModal">
        <div class="lexicon-modal-card">
          <div class="lexicon-header">
            <div class="header-left">
              <span class="pulse-icon">📚</span>
              <div>
                <h3>தமிழ் சைகை மொழி மருத்துவ களஞ்சியம்</h3>
                <p>Tamil Sign Language (TSL) Medical Lexicon & Regional Tamil Nadu School Dialect Guide</p>
              </div>
            </div>
            <button class="modal-close-btn" id="closeLexiconBtn">✕</button>
          </div>

          <div class="lexicon-nav-tabs">
            <button class="lexicon-tab ${this.currentTab === 'medical' ? 'active-tab' : ''}" data-tab="medical">
              🏥 மருத்துவ சைகைகள் (Medical TSL Signs)
            </button>
            <button class="lexicon-tab ${this.currentTab === 'alphabet' ? 'active-tab' : ''}" data-tab="alphabet">
              🔤 தமிழ் எழுத்துக்கள் விரல் சைகை (Tamil Fingerspelling)
            </button>
          </div>

          <div class="lexicon-controls-bar" id="lexiconControls">
            <div class="search-box">
              <span class="search-icon">🔍</span>
              <input type="text" id="lexiconSearchInput" placeholder="சைகை அல்லது நோயின் பெயர் தேடுக... (Search TSL signs, Tamil, English)" value="${this.searchQuery}" />
            </div>

            <div class="category-filter-chips">
              <button class="chip ${this.currentCategory === 'all' ? 'active-chip' : ''}" data-cat="all">அனைத்தும் (All)</button>
              <button class="chip ${this.currentCategory === 'symptom' ? 'active-chip' : ''}" data-cat="symptom">அறிகுறிகள் (Symptoms)</button>
              <button class="chip ${this.currentCategory === 'emergency' ? 'active-chip' : ''}" data-cat="emergency">அவசரம் (Emergency)</button>
              <button class="chip ${this.currentCategory === 'treatment' ? 'active-chip' : ''}" data-cat="treatment">சிகிச்சை (Treatment)</button>
              <button class="chip ${this.currentCategory === 'duration' ? 'active-chip' : ''}" data-cat="duration">நேரம்/அளவு (Dosage/Time)</button>
            </div>
          </div>

          <div class="lexicon-content-scroll" id="lexiconBody">
            ${this.renderContent()}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  renderContent() {
    if (this.currentTab === 'alphabet') {
      return this.renderAlphabetTab();
    }
    return this.renderMedicalSignsTab();
  }

  renderMedicalSignsTab() {
    let signs = TSL_MEDICAL_LEXICON;

    if (this.currentCategory !== 'all') {
      signs = signs.filter(s => s.category === this.currentCategory);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      signs = signs.filter(s =>
        s.tamilName.toLowerCase().includes(q) ||
        s.englishName.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tslVsIslNote.toLowerCase().includes(q)
      );
    }

    if (signs.length === 0) {
      return `
        <div class="empty-results-box">
          <span>🔍</span>
          <p>எந்த சைகைகளும் கிடைக்கவில்லை</p>
          <small>No TSL signs found matching "${this.searchQuery}"</small>
        </div>
      `;
    }

    return `
      <div class="lexicon-grid">
        ${signs.map(sign => `
          <div class="lexicon-sign-card" data-sign-id="${sign.id}">
            <div class="sign-card-header">
              <div class="sign-title-group">
                <span class="sign-category-tag cat-${sign.category}">${sign.category.toUpperCase()}</span>
                <h4>${sign.tamilName}</h4>
                <div class="sign-en-sub">${sign.englishName}</div>
              </div>
              <button class="play-sign-btn" data-play-id="${sign.id}" title="Play Avatar Sign & Speak Audio">
                ▶️ Play Sign
              </button>
            </div>

            <div class="sign-card-body">
              <div class="sign-desc">
                <strong>சைகை விளக்கம்:</strong> ${sign.description}
              </div>

              <div class="sign-meta-row">
                <div class="meta-item">
                  <span class="meta-label">கை வடிவம் (Handshape):</span>
                  <span class="meta-val">${sign.handShape}</span>
                </div>
                <div class="meta-item">
                  <span class="meta-label">முகபாவனை (Expression):</span>
                  <span class="meta-val">${sign.facialExpression}</span>
                </div>
              </div>

              <!-- TSL vs ISL Dialect Distinction Highlight -->
              <div class="tsl-vs-isl-box">
                <div class="dialect-badge">📍 தமிழ்நாடு TSL vs ISL தனித்துவம்:</div>
                <p>${sign.tslVsIslNote}</p>
              </div>

              <div class="sample-sentence-box">
                <div class="sample-ta">💬 "${sign.sampleSentenceTa}"</div>
                <div class="sample-en">"${sign.sampleSentenceEn}"</div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderAlphabetTab() {
    return `
      <div class="alphabet-section">
        <div class="alphabet-group-header">
          <h4>உயிர் எழுத்துக்கள் விரல் சைகை (Tamil Vowels TSL Fingerspelling)</h4>
          <p>Curated from Tamil Nadu special schools (Chennai, Coimbatore, Madurai Deaf curricula)</p>
        </div>

        <div class="vowel-cards-grid">
          ${TSL_UYIR_EZHUTHUKKAL.map(v => `
            <div class="vowel-card">
              <div class="vowel-letter">${v.letter}</div>
              <div class="vowel-name">${v.name}</div>
              <div class="vowel-shape">${v.fingerShape}</div>
              <div class="vowel-desc">${v.description}</div>
              <div class="vowel-tip">💡 ${v.tip}</div>
            </div>
          `).join('')}
        </div>

        <div class="alphabet-group-header" style="margin-top: 24px;">
          <h4>மெய் எழுத்துக்கள் விரல் சைகை (Tamil Consonants TSL Fingerspelling)</h4>
        </div>

        <div class="mei-cards-grid">
          ${TSL_MEI_EZHUTHUKKAL.map(m => `
            <div class="mei-card">
              <div class="mei-letter">${m.letter}</div>
              <div class="mei-name">${m.name}</div>
              <div class="mei-desc">${m.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  bindEvents() {
    const modal = this.container.querySelector('#lexiconModal');
    const closeBtn = this.container.querySelector('#closeLexiconBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide();
      });
    }

    // Tabs
    const tabs = this.container.querySelectorAll('.lexicon-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.currentTab = e.currentTarget.getAttribute('data-tab');
        const controls = this.container.querySelector('#lexiconControls');
        if (controls) {
          controls.style.display = this.currentTab === 'medical' ? 'flex' : 'none';
        }
        this.updateBody();
        this.container.querySelectorAll('.lexicon-tab').forEach(t => t.classList.toggle('active-tab', t === e.currentTarget));
      });
    });

    // Search input
    const searchInput = this.container.querySelector('#lexiconSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.updateBody();
      });
    }

    // Category chips
    const chips = this.container.querySelectorAll('.chip');
    chips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        this.currentCategory = e.currentTarget.getAttribute('data-cat');
        this.container.querySelectorAll('.chip').forEach(c => c.classList.toggle('active-chip', c === e.currentTarget));
        this.updateBody();
      });
    });

    this.bindPlayButtons();
  }

  bindPlayButtons() {
    const playBtns = this.container.querySelectorAll('.play-sign-btn');
    playBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const signId = e.currentTarget.getAttribute('data-play-id');
        if (this.onPlaySign) {
          this.onPlaySign(signId);
        }
      });
    });
  }

  updateBody() {
    const body = this.container.querySelector('#lexiconBody');
    if (body) {
      body.innerHTML = this.renderContent();
      this.bindPlayButtons();
    }
  }

  show() {
    if (this.container) {
      this.container.style.display = 'block';
      const modal = this.container.querySelector('#lexiconModal');
      if (modal) modal.style.display = 'flex';
      this.updateBody();
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
      const modal = this.container.querySelector('#lexiconModal');
      if (modal) modal.style.display = 'none';
    }
  }
}
