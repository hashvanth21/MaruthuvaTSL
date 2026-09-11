// Prescription Service with TSL Video / Animation Guidance & QR Code Generator
import qrcode from './qrcode.js';
import { PRESCRIPTION_MEDICINES } from '../data/doctorPresets.js';
import { getTslSignById } from '../data/tslMedicalVocabulary.js';

export class PrescriptionService {
  constructor() {
    this.currentPrescription = {
      patientId: this.generatePatientId(),
      timestamp: new Date().toLocaleDateString('ta-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      chiefComplaintsTa: [],
      chiefComplaintsEn: [],
      medicines: [],
      specialAdviceTa: '3 நாட்கள் கழித்து மீண்டும் மருத்துவரை அணுகவும் (Review after 3 days).',
      specialAdviceEn: 'Review in clinic after 3 days if symptoms persist.',
      doctorNotes: 'TSL Medical Bridge Consultation'
    };
  }

  addSymptom(tslSign) {
    if (!this.currentPrescription.chiefComplaintsTa.includes(tslSign.tamilName)) {
      this.currentPrescription.chiefComplaintsTa.push(tslSign.tamilName);
      this.currentPrescription.chiefComplaintsEn.push(tslSign.englishName);
    }
  }

  addMedicine(medicineItem, timing = 'morning_night', foodRelation = 'after_food', durationDays = 3) {
    const rxItem = {
      id: 'rx_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      medicine: medicineItem,
      timing, // 'morning', 'night', 'morning_night', 'thrice'
      foodRelation, // 'before_food', 'after_food'
      durationDays,
      timingLabelTa: this.getTimingLabelTa(timing, foodRelation, durationDays),
      timingLabelEn: this.getTimingLabelEn(timing, foodRelation, durationDays),
      tslSequence: this.compileMedicineTslSequence(timing, foodRelation)
    };

    this.currentPrescription.medicines.push(rxItem);
    return rxItem;
  }

  removeMedicine(rxItemId) {
    this.currentPrescription.medicines = this.currentPrescription.medicines.filter(m => m.id !== rxItemId);
  }

  getTimingLabelTa(timing, foodRelation, days) {
    let t = '';
    if (timing === 'morning_night') t = 'காலை 1 + இரவு 1';
    else if (timing === 'morning') t = 'காலை மட்டும் 1';
    else if (timing === 'night') t = 'இரவு மட்டும் 1';
    else if (timing === 'thrice') t = 'காலை 1 + மதியம் 1 + இரவு 1';

    const f = foodRelation === 'before_food' ? 'உணவிற்கு முன் (வெறும் வயிறு)' : 'உணவு உண்ட பிறகு';
    return `${t} (${f}) - ${days} நாட்களுக்கு`;
  }

  getTimingLabelEn(timing, foodRelation, days) {
    let t = '';
    if (timing === 'morning_night') t = '1 Morning + 1 Night';
    else if (timing === 'morning') t = '1 Morning only';
    else if (timing === 'night') t = '1 Night only';
    else if (timing === 'thrice') t = '1 Morning + 1 Afternoon + 1 Night';

    const f = foodRelation === 'before_food' ? 'Before Food' : 'After Food';
    return `${t} (${f}) for ${days} days`;
  }

  compileMedicineTslSequence(timing, foodRelation) {
    const seq = ['medicine_tablet'];
    if (foodRelation === 'before_food') {
      seq.push('before_food');
    } else {
      seq.push('after_food');
    }
    seq.push('morning_afternoon_night');
    return seq;
  }

  getSimpleTimingDose(timing, foodRelation, days) {
    let doseEn = '1 Morning + 1 Night';
    if (timing === 'morning') doseEn = '1 Morning only';
    else if (timing === 'night') doseEn = '1 Night only';
    else if (timing === 'thrice') doseEn = '1 Morning + 1 Afternoon + 1 Night';
    const foodEn = foodRelation === 'before_food' ? 'Before Food' : 'After Food';
    return `${doseEn} (${foodEn}) for ${days} days`;
  }

  /**
   * Compiles current prescription schedule into a clean, simple, scannable prescription.
   * Scanned by standard phone cameras (iOS / Android / Google Lens) to display the prescription.
   */
  compilePrescriptionText() {
    const p = this.currentPrescription;
    const dateStr = new Date().toLocaleDateString('en-GB');
    const lines = [
      'MARUTHUVA TSL PRESCRIPTION',
      `Patient ID: ${p.patientId}`,
      `Date: ${dateStr}`,
      '----------------------------------------',
      'Rx Prescribed Medicines:'
    ];

    if (p.chiefComplaintsEn && p.chiefComplaintsEn.length > 0) {
      lines.push(`Symptoms: ${p.chiefComplaintsEn.join(', ')}`);
      lines.push('');
    }

    if (!p.medicines || p.medicines.length === 0) {
      lines.push('(No medications prescribed yet)');
    } else {
      p.medicines.forEach((m, idx) => {
        const doseStr = this.getSimpleTimingDose(m.timing, m.foodRelation, m.durationDays);
        lines.push(`${idx + 1}. ${m.medicine.name}`);
        lines.push(`   Dose: ${doseStr}`);
      });
    }

    lines.push('----------------------------------------');
    lines.push('Special Advice:');
    lines.push('- Review in clinic after 3 days if symptoms persist.');
    lines.push('- TSL Video Guidance: Sign language instruction available.');
    lines.push('- Emergency Helpline: 108 / 104');

    return lines.join('\n');
  }

  /**
   * Data Quality & Privacy Guard:
   * Generates a 100% offline, in-browser ISO/IEC 18004 compliant QR Code Data URI.
   * Fully generative: updates dynamically whenever medicines are added or modified.
   * Scannable by any smartphone camera (iOS / Android / Lens) to deliver the simple prescription.
   * Zero bytes sent to third-party endpoints (100% private & air-gapped).
   */
  generateQrCodeUrl(payloadText) {
    const rawData = payloadText || this.compilePrescriptionText();

    try {
      if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
        qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      }
      const qr = qrcode(0, 'L');
      qr.addData(rawData);
      qr.make();
      return qr.createDataURL(5, 16);
    } catch (err) {
      console.warn('QR Code generation with Level L failed, falling back to Level M:', err);
      try {
        const qrFallback = qrcode(0, 'M');
        qrFallback.addData(rawData);
        qrFallback.make();
        return qrFallback.createDataURL(4, 16);
      } catch (err2) {
        console.error('Fatal QR Code generation error:', err2);
        return '';
      }
    }
  }

  generatePatientId() {
    const d = new Date();
    const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `PT-${ymd}-${rand}`;
  }

  reset() {
    this.currentPrescription = {
      patientId: this.generatePatientId(),
      timestamp: new Date().toLocaleDateString('ta-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      chiefComplaintsTa: [],
      chiefComplaintsEn: [],
      medicines: [],
      specialAdviceTa: '3 நாட்கள் கழித்து மீண்டும் மருத்துவரை அணுகவும் (Review after 3 days).',
      specialAdviceEn: 'Review in clinic after 3 days if symptoms persist.',
      doctorNotes: 'TSL Medical Bridge Consultation'
    };
  }
}
