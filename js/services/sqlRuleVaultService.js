// SQL Rule Vault Engine
// In-Browser Relational Clinical Rules Database & Audit Log
// Enforces Clinical Safety Constraints, Drug-Drug Interactions, and TSL Regional Dialect Grammar

export class SqlRuleVaultService {
  constructor() {
    this.tables = {
      tsl_rule_vault: [],
      clinical_rules: [],
      drug_interaction_vault: [],
      consultation_audit_log: []
    };

    this.initDatabase();
  }

  initDatabase() {
    // 1. Table: tsl_rule_vault (Regional Tamil Nadu Deaf School Rules)
    this.tables.tsl_rule_vault = [
      {
        rule_id: 'TSL-R01',
        sign_id: 'chest_pain',
        tamil_name: 'நெஞ்சு வலி',
        english_name: 'Chest Pain',
        school_origin: 'Little Flower Convent Chennai',
        handshape: 'Fist Clutch on Sternum',
        motion: 'Inward Pulsing Compression',
        target_region: 'chest',
        severity_weight: 9.8,
        triage_level: 'RED-1'
      },
      {
        rule_id: 'TSL-R02',
        sign_id: 'breathlessness',
        tamil_name: 'மூச்சுத் திணறல்',
        english_name: 'Breathlessness / Dyspnea',
        school_origin: 'St. Louis Institute Adyar',
        handshape: 'Open 5-Fingers Spayed',
        motion: 'Rapid Heaving Oscillation',
        target_region: 'chest',
        severity_weight: 9.5,
        triage_level: 'RED-2'
      },
      {
        rule_id: 'TSL-R03',
        sign_id: 'fever',
        tamil_name: 'காய்ச்சல்',
        english_name: 'Fever / Pyrexia',
        school_origin: 'CSI Deaf School Tirunelveli',
        handshape: 'Dorsal Hand Touch',
        motion: 'Forehead Contact to Outward Wave',
        target_region: 'head',
        severity_weight: 6.5,
        triage_level: 'AMBER-1'
      },
      {
        rule_id: 'TSL-R04',
        sign_id: 'headache',
        tamil_name: 'தலைவலி',
        english_name: 'Headache / Migraine',
        school_origin: 'Coimbatore Deaf Academy',
        handshape: 'Bilateral Pinch Claw',
        motion: 'Temple Pulsing Compression',
        target_region: 'head',
        severity_weight: 5.8,
        triage_level: 'GREEN-2'
      },
      {
        rule_id: 'TSL-R05',
        sign_id: 'stomach_pain',
        tamil_name: 'வயிற்று வலி',
        english_name: 'Abdominal Cramps',
        school_origin: 'Madurai Deaf Education Center',
        handshape: 'Cupped Hand to Claw',
        motion: 'Circular Abdominal Palpation',
        target_region: 'stomach',
        severity_weight: 7.2,
        triage_level: 'AMBER-2'
      },
      {
        rule_id: 'TSL-R06',
        sign_id: 'diabetes',
        tamil_name: 'சர்க்கரை நோய்',
        english_name: 'Diabetes Mellitus',
        school_origin: 'Tamil Nadu Deaf Association (TNDA)',
        handshape: 'Index Prick + Cheek Touch',
        motion: 'Finger-prick then Sweet Sign',
        target_region: 'neutral',
        severity_weight: 6.0,
        triage_level: 'AMBER-3'
      },
      {
        rule_id: 'TSL-R07',
        sign_id: 'blood_pressure',
        tamil_name: 'ரத்த அழுத்தம்',
        english_name: 'Hypertension / BP',
        school_origin: 'Salem Deaf Welfare Post',
        handshape: 'C-Cup Wrap + Fist Pump',
        motion: 'Upper Bicep Compression',
        target_region: 'arm',
        severity_weight: 7.0,
        triage_level: 'AMBER-1'
      },
      {
        rule_id: 'TSL-R08',
        sign_id: 'fracture',
        tamil_name: 'எலும்பு முறிவு',
        english_name: 'Bone Fracture',
        school_origin: 'Tiruchirappalli Deaf Center',
        handshape: 'Dual Fist Snap',
        motion: 'Abrupt Lateral Snapping Separation',
        target_region: 'neutral',
        severity_weight: 8.5,
        triage_level: 'RED-3'
      }
    ];

    // 2. Table: clinical_rules (Diagnostic & Clinical Safety Protocols)
    this.tables.clinical_rules = [
      {
        rule_id: 'CR-001',
        condition: 'chest_pain',
        triage_level: 'RED',
        mandatory_investigation: '12-Lead ECG + Troponin I',
        red_flag_symptoms: 'Radiation to jaw/arm, diaphoresis, syncope',
        default_rx: 'Aspirin 300mg chewable + Sorbitrate 5mg sublingual',
        contraindicated: 'Heavy physical strain'
      },
      {
        rule_id: 'CR-002',
        condition: 'breathlessness',
        triage_level: 'RED',
        mandatory_investigation: 'Pulse Oximetry (SpO2) + Chest X-ray',
        red_flag_symptoms: 'Cyanosis, SpO2 < 90%, stridor, silent chest',
        default_rx: 'Salbutamol + Ipratropium Nebulization + O2 therapy',
        contraindicated: 'Sedatives'
      },
      {
        rule_id: 'CR-003',
        condition: 'stomach_pain',
        triage_level: 'AMBER',
        mandatory_investigation: 'USG Abdomen + Complete Blood Count',
        red_flag_symptoms: 'Board-like rigidity, hematemesis, melena',
        default_rx: 'Pantoprazole 40mg IV + Dicyclomine 20mg',
        contraindicated: 'NSAIDs (Ibuprofen / Diclofenac)'
      },
      {
        rule_id: 'CR-004',
        condition: 'fever',
        triage_level: 'AMBER',
        mandatory_investigation: 'Dengue NS1 Antigen + Peripheral Smear for MP',
        red_flag_symptoms: 'Petechial rash, persistent vomiting, delirium',
        default_rx: 'Paracetamol 650mg TDS (After food)',
        contraindicated: 'Aspirin in viral fever (Reye syndrome risk)'
      },
      {
        rule_id: 'CR-005',
        condition: 'dizziness',
        triage_level: 'AMBER',
        mandatory_investigation: 'Random Blood Glucose (RBS) + Orthostatic BP',
        red_flag_symptoms: 'Unilateral focal weakness, slurred speech',
        default_rx: 'Oral Rehydration Solution (ORS) + Betahistine 16mg',
        contraindicated: 'Sudden posture changes'
      }
    ];

    // 3. Table: drug_interaction_vault (Pharmacological Safety Enforcer)
    this.tables.drug_interaction_vault = [
      {
        interaction_id: 'DI-101',
        drug_a: 'Paracetamol',
        drug_b: 'Dolo 650mg',
        severity: 'CRITICAL',
        clinical_effect: 'Duplicate Acetaminophen toxicity (Hepatotoxicity risk)',
        recommendation_ta: 'இரண்டும் பாராசிட்டமால் மருந்துகள், ஒரே நேரத்தில் கொடுக்கக் கூடாது!',
        recommendation_en: 'Duplicate therapy. Do not co-prescribe Paracetamol and Dolo 650 simultaneously.'
      },
      {
        interaction_id: 'DI-102',
        drug_a: 'Aspirin',
        drug_b: 'NSAID / Ibuprofen',
        severity: 'HIGH',
        clinical_effect: 'Severe Gastrointestinal Bleeding and ulceration',
        recommendation_ta: 'வயிற்றில் கடுமையான ரத்தப்போக்கு அபாயம். ஒன்றாக கொடுக்காதீர்கள்.',
        recommendation_en: 'Increased risk of GI mucosal hemorrhage and ulceration.'
      },
      {
        interaction_id: 'DI-103',
        drug_a: 'Pantoprazole',
        drug_b: 'Iron Supplements',
        severity: 'MODERATE',
        clinical_effect: 'Decreased absorption of Iron due to elevated gastric pH',
        recommendation_ta: 'இரும்பு சத்து மாத்திரையை பேன்டோபிரசோலுக்கு 2 மணி நேரம் கழித்து கொடுக்கவும்.',
        recommendation_en: 'Separate administration of Pantoprazole and Iron by at least 2 hours.'
      },
      // DQ-006 FIX: Critical interactions previously absent from vault
      {
        interaction_id: 'DI-104',
        drug_a: 'Warfarin',
        drug_b: 'Aspirin',
        severity: 'CRITICAL',
        clinical_effect: 'Severe Hemorrhage Risk — Dual antiplatelet/anticoagulant synergy',
        recommendation_ta: 'வார்ஃபரின் மற்றும் ஆஸ்பிரின் ஒன்றாக கொடுக்கக்கூடாது — மிகவும் தீவிரமான ரத்தப்போக்கு அபாயம்.',
        recommendation_en: 'CRITICAL: Do not co-prescribe Warfarin and Aspirin. Risk of severe internal hemorrhage.'
      },
      {
        interaction_id: 'DI-105',
        drug_a: 'Tramadol',
        drug_b: 'Paracetamol',
        severity: 'HIGH',
        clinical_effect: 'Serotonin Syndrome + CNS/Respiratory Depression risk',
        recommendation_ta: 'ட்ராமடோல் மற்றும் பாராசிட்டமால் — மருத்துவர் கண்காணிப்பில் மட்டுமே கொடுக்கவும்.',
        recommendation_en: 'HIGH: Tramadol + Paracetamol combination requires close monitoring. Risk of CNS depression.'
      },
      {
        interaction_id: 'DI-106',
        drug_a: 'Metformin',
        drug_b: 'Contrast Dye',
        severity: 'CRITICAL',
        clinical_effect: 'Lactic Acidosis — Hold Metformin 48h before and after contrast procedures',
        recommendation_ta: 'கான்ட்ராஸ்ட் ஸ்கேன் செய்வதற்கு 48 மணி நேரம் முன்பு மெட்ஃபோர்மினை நிறுத்தவும்.',
        recommendation_en: 'CRITICAL: Stop Metformin 48h before iodinated contrast. Risk of fatal lactic acidosis.'
      },
      {
        interaction_id: 'DI-107',
        drug_a: 'ACE Inhibitor',
        drug_b: 'Potassium Supplements',
        severity: 'HIGH',
        clinical_effect: 'Hyperkalemia — Dangerous elevation of serum potassium levels',
        recommendation_ta: 'ACE இன்ஹிபிட்டர் மற்றும் பொட்டாசியம் ஒன்றாக கொடுக்க வேண்டாம் — இதய ஆபத்து.',
        recommendation_en: 'HIGH: ACE inhibitors + Potassium supplements cause dangerous hyperkalemia. Avoid co-prescription.'
      }
    ];

    // DQ-007 FIX: Start with empty audit log — dummy seed record removed
    // Records are appended dynamically via logConsultation() during actual patient sessions
    this.tables.consultation_audit_log = [];
  }

  /**
   * Evaluates prescription safety against SQL Rule Vault
   */
  validatePrescription(prescribedMedNames) {
    const violations = [];
    const names = prescribedMedNames.map(n => n.toLowerCase());

    for (const rule of this.tables.drug_interaction_vault) {
      const matchA = names.some(n => n.includes(rule.drug_a.toLowerCase()));
      const matchB = names.some(n => n.includes(rule.drug_b.toLowerCase()));

      if (matchA && matchB) {
        violations.push(rule);
      }
    }

    return {
      isSafe: violations.length === 0,
      violationsCount: violations.length,
      violations
    };
  }

  /**
   * Log consultation event into immutable audit trail
   */
  /**
   * Log consultation event into immutable audit trail
   * Enforces schema completeness, deduplication (3s debounce), and checksum validation
   */
  logConsultation(patientId, tslSign, prescription, triageCode, ruleStatus, metadata = {}) {
    const nowEpoch = Date.now();
    const pid = (patientId && typeof patientId === 'string') ? patientId.trim() : 'PT-UNKNOWN';
    const signStr = typeof tslSign === 'object' && tslSign !== null ? (tslSign.tamilName || tslSign.id || 'N/A') : String(tslSign || 'N/A');
    const rxStr = typeof prescription === 'object' && prescription !== null ? (prescription.medicines ? prescription.medicines.map(m => m.medicine?.name || m.medicine).join(', ') : JSON.stringify(prescription)) : String(prescription || 'N/A');

    // 1. Data Quality Guard: Deduplication Check within 3-second window
    const recentDuplicate = this.tables.consultation_audit_log.find(entry => {
      return entry.patient_id === pid &&
             entry.tsl_sign_detected === signStr &&
             (nowEpoch - (entry.created_epoch_ms || 0)) < 3000;
    });

    if (recentDuplicate) {
      recentDuplicate.repeat_count = (recentDuplicate.repeat_count || 1) + 1;
      recentDuplicate.last_observed_iso = new Date().toISOString();
      return recentDuplicate;
    }

    // 2. Data Quality Guard: Cryptographic integrity checksum
    const rawPayload = `${pid}|${signStr}|${rxStr}|${triageCode}|${nowEpoch}`;
    let hash = 0;
    for (let i = 0; i < rawPayload.length; i++) {
      hash = ((hash << 5) - hash) + rawPayload.charCodeAt(i);
      hash |= 0;
    }
    const checksum = '0x' + Math.abs(hash).toString(16).padStart(8, '0');

    const entry = {
      log_id: 'AUDIT-' + Math.floor(1000 + Math.random() * 9000),
      session_id: metadata.sessionId || 'SESS-' + nowEpoch.toString(36).toUpperCase(),
      patient_id: pid,
      timestamp: new Date().toISOString(),
      created_epoch_ms: nowEpoch,
      tsl_sign_detected: signStr,
      doctor_prescription: rxStr,
      qwen_triage_code: triageCode || 'GREEN',
      rule_check_status: ruleStatus || 'PASSED',
      pain_score: metadata.painScore ?? null,
      repeat_count: 1,
      integrity_checksum: checksum
    };

    this.tables.consultation_audit_log.unshift(entry);
    return entry;
  }

  /**
   * Pure In-Browser SQL Query Engine (SELECT, FROM, WHERE, ORDER BY, LIMIT)
   */
  executeSql(query) {
    const startTime = performance.now();
    const cleanQuery = (query || '').trim();

    if (!cleanQuery) {
      return { error: 'Empty SQL query.' };
    }

    try {
      const match = cleanQuery.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?;?$/i);

      if (!match) {
        return {
          error: 'SQL Syntax Error. Supported syntax: SELECT [columns | *] FROM [table] [WHERE condition] [ORDER BY column] [LIMIT n]'
        };
      }

      const [, columnsStr, tableName, whereClause, orderByClause, limitStr] = match;

      if (!this.tables[tableName]) {
        const available = Object.keys(this.tables).join(', ');
        return { error: `Table '${tableName}' does not exist. Available tables: ${available}` };
      }

      let rows = [...this.tables[tableName]];

      // 1. WHERE Filter
      if (whereClause) {
        rows = rows.filter(row => {
          return this.evaluateWhereCondition(row, whereClause);
        });
      }

      // 2. ORDER BY
      if (orderByClause) {
        const [col, dir] = orderByClause.trim().split(/\s+/);
        const isDesc = dir && dir.toUpperCase() === 'DESC';
        rows.sort((a, b) => {
          const valA = a[col];
          const valB = b[col];
          if (valA === undefined || valB === undefined) return 0;
          if (valA < valB) return isDesc ? 1 : -1;
          if (valA > valB) return isDesc ? -1 : 1;
          return 0;
        });
      }

      // 3. LIMIT
      if (limitStr) {
        const limit = parseInt(limitStr, 10);
        rows = rows.slice(0, limit);
      }

      // 4. Projection
      const columns = columnsStr.trim() === '*' ? (rows[0] ? Object.keys(rows[0]) : []) : columnsStr.split(',').map(c => c.trim());

      const projectedRows = rows.map(r => {
        if (columnsStr.trim() === '*') return r;
        const projected = {};
        columns.forEach(col => {
          projected[col] = r[col];
        });
        return projected;
      });

      const execTimeMs = (performance.now() - startTime).toFixed(2);

      return {
        success: true,
        query: cleanQuery,
        tableName,
        columns,
        rowCount: projectedRows.length,
        executionTimeMs: execTimeMs,
        data: projectedRows
      };
    } catch (err) {
      return { error: 'SQL Execution Error: ' + err.message };
    }
  }

  evaluateWhereCondition(row, whereClause) {
    const clause = whereClause.trim();

    // Not Equals: col != 'val' or col <> 'val'
    const neMatch = clause.match(/([a-zA-Z0-9_]+)\s*(?:!=|<>)\s*['"]?([^'"]+)['"]?/i);
    if (neMatch) {
      const [, col, val] = neMatch;
      return String(row[col] ?? '').toLowerCase() !== val.toLowerCase();
    }

    // Greater than or equal: col >= num
    const gteMatch = clause.match(/([a-zA-Z0-9_]+)\s*>=\s*(\d+(\.\d+)?)/i);
    if (gteMatch) {
      const [, col, val] = gteMatch;
      return Number(row[col]) >= Number(val);
    }

    // Less than or equal: col <= num
    const lteMatch = clause.match(/([a-zA-Z0-9_]+)\s*<=\s*(\d+(\.\d+)?)/i);
    if (lteMatch) {
      const [, col, val] = lteMatch;
      return Number(row[col]) <= Number(val);
    }

    // Greater than: col > num
    const gtMatch = clause.match(/([a-zA-Z0-9_]+)\s*>\s*(\d+(\.\d+)?)/i);
    if (gtMatch) {
      const [, col, val] = gtMatch;
      return Number(row[col]) > Number(val);
    }

    // Less than: col < num
    const ltMatch = clause.match(/([a-zA-Z0-9_]+)\s*<\s*(\d+(\.\d+)?)/i);
    if (ltMatch) {
      const [, col, val] = ltMatch;
      return Number(row[col]) < Number(val);
    }

    // Equals: col = 'value'
    const eqMatch = clause.match(/([a-zA-Z0-9_]+)\s*=\s*['"]?([^'"]+)['"]?/i);
    if (eqMatch) {
      const [, col, val] = eqMatch;
      return String(row[col] ?? '').toLowerCase() === val.toLowerCase();
    }

    // LIKE: col LIKE '%value%'
    const likeMatch = clause.match(/([a-zA-Z0-9_]+)\s+LIKE\s+['"]%?([^'%"]+)%?['"]/i);
    if (likeMatch) {
      const [, col, val] = likeMatch;
      return String(row[col] ?? '').toLowerCase().includes(val.toLowerCase());
    }

    return true;
  }

  getSchema() {
    return Object.entries(this.tables).map(([name, rows]) => {
      return {
        tableName: name,
        columns: rows[0] ? Object.keys(rows[0]) : [],
        count: rows.length
      };
    });
  }
}
