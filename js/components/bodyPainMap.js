// Interactive Body Pain Map Component
import { BODY_REGIONS } from '../data/tslAnatomyMap.js';
import { getTslSignById } from '../data/tslMedicalVocabulary.js';

export class BodyPainMap {
  constructor(containerElement, onSelectRegion = null) {
    this.container = containerElement;
    this.onSelectRegion = onSelectRegion;
    this.selectedRegionId = null;
    this.render();
  }

  render() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="body-map-card">
        <div class="body-map-header">
          <div class="body-map-title">
            <span class="icon-pulse">🫀</span>
            <div>
              <h4>உடல் வலி சுட்டி (Interactive Body Map)</h4>
              <p>Click body area to translate symptoms to TSL & Tamil/English</p>
            </div>
          </div>
        </div>

        <div class="body-map-grid">
          <div class="body-silhouette-wrapper">
            <!-- SVG Anatomical Silhouette with Interactive Hotspots -->
            <svg viewBox="0 0 200 400" class="human-silhouette-svg">
              <!-- Body Base -->
              <defs>
                <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#1e293b" />
                  <stop offset="100%" stop-color="#0f172a" />
                </linearGradient>
                <filter id="glowEffect">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <!-- Human Outline -->
              <path d="M100 20 C112 20 120 30 120 45 C120 60 112 70 100 70 C88 70 80 60 80 45 C80 30 88 20 100 20 Z" class="body-part-path" />
              <path d="M92 70 L108 70 L112 90 L145 105 L165 180 L152 185 L135 125 L125 130 L130 220 L118 220 L115 360 L95 360 L92 245 L85 360 L65 360 L62 220 L50 220 L55 130 L45 125 L28 185 L15 180 L35 105 L68 90 Z" class="body-part-path" />

              <!-- Interactive Clickable Target Hotspots with Accessible Keyboard Navigation -->
              <!-- 1. Head -->
              <circle cx="100" cy="45" r="22" class="hotspot-node" data-region="head" role="button" tabindex="0" aria-label="உடல் பகுதி: தலை (Head region)" />
              <!-- 2. Eyes & Ears -->
              <circle cx="100" cy="42" r="12" class="hotspot-node sub-node" data-region="eyes_ears" role="button" tabindex="0" aria-label="உடல் பகுதி: கண் மற்றும் காது (Eyes and Ears)" />
              <!-- 3. Throat -->
              <circle cx="100" cy="78" r="12" class="hotspot-node" data-region="throat" role="button" tabindex="0" aria-label="உடல் பகுதி: தொண்டை (Throat region)" />
              <!-- 4. Chest -->
              <circle cx="100" cy="115" r="22" class="hotspot-node" data-region="chest" role="button" tabindex="0" aria-label="உடல் பகுதி: நெஞ்சு (Chest region)" />
              <!-- 5. Stomach -->
              <circle cx="100" cy="165" r="22" class="hotspot-node" data-region="stomach" role="button" tabindex="0" aria-label="உடல் பகுதி: வயிறு (Stomach region)" />
              <!-- 6. Left & Right Arms -->
              <circle cx="45" cy="140" r="16" class="hotspot-node" data-region="arms_hands" role="button" tabindex="0" aria-label="உடல் பகுதி: கை (Arms and Hands)" />
              <circle cx="155" cy="140" r="16" class="hotspot-node" data-region="arms_hands" role="button" tabindex="0" aria-label="உடல் பகுதி: வலது கை (Right Arm)" />
              <!-- 7. Back & Spine -->
              <circle cx="100" cy="210" r="16" class="hotspot-node" data-region="back_spine" role="button" tabindex="0" aria-label="உடல் பகுதி: முதுகு (Back and Spine)" />
              <!-- 8. Legs & Knees -->
              <circle cx="78" cy="290" r="18" class="hotspot-node" data-region="legs_knees" role="button" tabindex="0" aria-label="உடல் பகுதி: இடது கால் (Left Leg and Knee)" />
              <circle cx="122" cy="290" r="18" class="hotspot-node" data-region="legs_knees" role="button" tabindex="0" aria-label="உடல் பகுதி: வலது கால் (Right Leg and Knee)" />
            </svg>
          </div>

          <div class="body-region-details" id="regionDetailPanel" role="region" aria-live="polite">
            <div class="empty-region-prompt">
              <span class="pulse-icon">👆</span>
              <p>உடலில் வலி உள்ள இடத்தை தொடவும்</p>
              <small>Tap or Tab+Enter to inspect TSL signs and doctor queries</small>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const hotspots = this.container.querySelectorAll('.hotspot-node');
    hotspots.forEach(node => {
      const handleSelect = (e) => {
        const regionId = e.currentTarget.getAttribute('data-region');
        this.selectRegion(regionId);
      };

      node.addEventListener('click', handleSelect);
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect(e);
        }
      });
    });
  }

  selectRegion(regionId) {
    this.selectedRegionId = regionId;
    const region = BODY_REGIONS.find(r => r.id === regionId);
    if (!region) return;

    // Highlight active hotspot
    this.container.querySelectorAll('.hotspot-node').forEach(node => {
      if (node.getAttribute('data-region') === regionId) {
        node.classList.add('active-hotspot');
      } else {
        node.classList.remove('active-hotspot');
      }
    });

    // Render region detail box
    const detailPanel = this.container.querySelector('#regionDetailPanel');
    if (detailPanel) {
      detailPanel.innerHTML = `
        <div class="selected-region-card animate-fade-in">
          <div class="region-badge">${region.nameTa}</div>
          <div class="region-en-name">${region.nameEn}</div>

          <div class="region-info-block">
            <div class="info-label">பொதுவான அறிகுறிகள் (Common Symptoms):</div>
            <div class="info-val-ta">${region.commonConditionsTa}</div>
            <div class="info-val-en">${region.commonConditionsEn}</div>
          </div>

          <div class="region-signs-block">
            <div class="info-label">தொடர்புடைய TSL சைகைகள் (Associated TSL Signs):</div>
            <div class="sign-tag-list">
              ${region.associatedSigns.map(sId => {
                const s = getTslSignById(sId);
                return s ? `<button class="sign-pill-btn" data-sign-id="${s.id}">
                  <span class="pill-dot"></span> ${s.tamilName.split(' ')[0]} (${s.englishName.split('/')[0]})
                </button>` : '';
              }).join('')}
            </div>
          </div>

          <div class="doctor-quick-query">
            <div class="query-header">🩺 மருத்துவர் கேள்வி (Doctor Query):</div>
            <p class="query-text-ta">"${region.doctorQueryTa}"</p>
            <p class="query-text-en">"${region.doctorQueryEn}"</p>
            <button class="send-query-btn" id="sendDoctorQueryBtn">
              <span>🗣️</span> நோயாளியிடம் கேட்க (Ask Patient in TSL & Audio)
            </button>
          </div>
        </div>
      `;

      // Bind sign pills & doctor query button
      detailPanel.querySelectorAll('.sign-pill-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const signId = e.currentTarget.getAttribute('data-sign-id');
          if (this.onSelectRegion) {
            this.onSelectRegion({ type: 'sign', signId, region });
          }
        });
      });

      const sendQueryBtn = detailPanel.querySelector('#sendDoctorQueryBtn');
      if (sendQueryBtn) {
        sendQueryBtn.addEventListener('click', () => {
          if (this.onSelectRegion) {
            this.onSelectRegion({ type: 'doctor_query', region });
          }
        });
      }
    }
  }
}
