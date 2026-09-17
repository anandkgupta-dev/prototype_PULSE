/**
 * PULSE Client-Side Clinical NLP Engine
 * Enables 100% offline & static cloud execution (e.g. Vercel, Netlify, GitHub Pages).
 * Provides seamless fallback when Python FastAPI backend is not locally accessible.
 */

import datasetData from '../data/dataset.json';

// Clinical Abbreviations Map
const ABBREVIATIONS_MAP = {
  "BP": "Blood Pressure",
  "GCS": "Glasgow Coma Scale",
  "BGL": "Blood Glucose Level",
  "BGLS": "Blood Glucose Levels",
  "BSL": "Blood Sugar Level",
  "MRI": "Magnetic Resonance Imaging",
  "CT": "Computed Tomography",
  "ECG": "Electrocardiogram",
  "IV": "Intravenous",
  "PRN": "Pro Re Nata (As Needed)",
  "QID": "Quater In Die (Four Times Daily)",
  "BD": "Bis In Die (Twice Daily)",
  "TDS": "Ter Die Sumendum (Three Times Daily)",
  "AF": "Atrial Fibrillation",
  "COPD": "Chronic Obstructive Pulmonary Disease",
  "DM": "Diabetes Mellitus",
  "HPN": "Hypertension",
  "HTN": "Hypertension",
  "UTI": "Urinary Tract Infection",
  "MRSA": "Methicillin-Resistant Staphylococcus Aureus",
  "OBS": "Observations / Vital Signs",
  "CXR": "Chest X-Ray",
  "FBC": "Full Blood Count",
  "IDC": "Indwelling Catheter",
  "ADL": "Activities of Daily Living",
  "SOB": "Shortness of Breath"
};

// Preprocessor
export function preprocessTextLocal(rawText) {
  if (!rawText) {
    return { raw_text: "", preprocessed_text: "", changes_made: ["Empty input"] };
  }

  let text = rawText;
  const changes = [];

  // Unicode replacements
  const unicodeMap = {
    '’': "'", '‘': "'", '“': '"', '”': '"', '–': '-', '—': '-', '\u00a0': ' ', '\ufeff': ''
  };
  let replacedUnicode = false;
  for (const [k, v] of Object.entries(unicodeMap)) {
    if (text.includes(k)) {
      text = text.replaceAll(k, v);
      replacedUnicode = true;
    }
  }
  if (replacedUnicode) {
    changes.append ? changes.append("Normalized Unicode characters") : changes.push("Normalized Unicode quotes/dashes to standard ASCII");
  }

  // Spacing around punctuation
  const spacedPunct = text.replace(/([a-zA-Z])([,;])([a-zA-Z])/g, '$1$2 $3')
                          .replace(/([a-zA-Z])(\.)([A-Z])/g, '$1. $2');
  if (spacedPunct !== text) {
    changes.push("Resolved concatenated words around punctuation");
    text = spacedPunct;
  }

  // Whitespace normalization
  const normalizedSpace = text.replace(/[ \t\r\n]+/g, ' ').trim();
  if (normalizedSpace !== text) {
    changes.push("Normalized multiple consecutive whitespace and newlines");
    text = normalizedSpace;
  }

  if (changes.length === 0) {
    changes.push("Input text formatting already conforms to clinical preprocessing standards");
  }

  changes.push("Preserved clinical symbols (@, +, _) and measurement dosages");

  return {
    raw_text: rawText,
    preprocessed_text: text,
    changes_made: changes
  };
}

// Split into sentences with offsets
function splitSentences(text) {
  const spans = [];
  const regex = /([^.!?]+(?:[.!?]+|$))/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const s = match[0].trim();
    if (s) {
      spans.push({ text: s, start: match.index, end: match.index + match[0].length });
    }
  }
  if (spans.length === 0 && text) {
    spans.push({ text, start: 0, end: text.length });
  }
  return spans;
}

function findSentence(pos, sList) {
  for (const s of sList) {
    if (s.start <= pos && pos <= s.end) return s.text;
  }
  return sList[0]?.text || "";
}

// Entity & Event Extraction
export function analyzeLocalEngine({ reportId, rawText }) {
  let text = rawText || "";
  if (reportId && !text.trim()) {
    const found = datasetData.reports.find(r => String(r.report_id) === String(reportId));
    if (found) text = found.raw_text;
  }

  const prep = preprocessTextLocal(text);
  const clean = prep.preprocessed_text;
  const sList = splitSentences(clean);

  // 1. Demographics
  const patientInfo = [];
  const bedM = clean.match(/\b(?:bed|room)\s+([a-zA-Z0-9]+)\b/i);
  if (bedM) {
    patientInfo.push({
      category: "Patient Information",
      field: "Bed / Room",
      value: bedM[0],
      detail: `Bed ${bedM[1]}`,
      confidence: "High (Rule Pattern)",
      source_sentence: findSentence(bedM.index, sList),
      start_char: bedM.index,
      end_char: bedM.index + bedM[0].length
    });
  }

  const namePatterns = [
    /(?:bed\s+[a-zA-Z0-9]+[\s,]+)([A-Z][a-zA-Z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-zA-Z]+)/i,
    /^([A-Z][a-zA-Z]+(?:\s+[a-zA-Z]+){1,3})(?:[\s,]+(?:bed|\d+|under))/i,
    /(?:patient\s+is\s+)([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+)/i
  ];
  for (const pat of namePatterns) {
    const m = clean.match(pat);
    if (m) {
      const val = m[1].replace(/[,.]/g, '').trim();
      if (!['the patient', 'he came', 'she came', 'bed'].includes(val.toLowerCase())) {
        const idx = m.index + m[0].indexOf(m[1]);
        patientInfo.push({
          category: "Patient Information",
          field: "Patient Name",
          value: val,
          detail: val,
          confidence: "High (Named Entity Context)",
          source_sentence: findSentence(idx, sList),
          start_char: idx,
          end_char: idx + val.length
        });
        break;
      }
    }
  }

  const ageM = clean.match(/\b(\d{1,3})\s*(?:years|yo|y\.?o\.?|years\s*old)\b/i) ||
               clean.match(/\b(?:Forty-eight|Fifty|Sixty|Seventy|Eighty|Ninety|Twenty|Thirty)[-\s]?[a-zA-Z]*\s*years\b/i) ||
               clean.match(/,\s*(\d{1,3})\s*,\s*bed/i) ||
               clean.match(/bed\s+\d+[\s,]+(\d{1,3})\s+under/i);
  if (ageM) {
    const ageVal = ageM[1] ? `${ageM[1]} years` : ageM[0];
    patientInfo.push({
      category: "Patient Information",
      field: "Age",
      value: ageVal,
      detail: ageVal,
      confidence: "High (Rule Pattern)",
      source_sentence: findSentence(ageM.index, sList),
      start_char: ageM.index,
      end_char: ageM.index + ageM[0].length
    });
  }

  const genM = clean.match(/\b(he|his|him|she|her|hers|male|female)\b/i);
  if (genM) {
    const isMale = ['he', 'his', 'him', 'male'].includes(genM[1].toLowerCase());
    patientInfo.push({
      category: "Patient Information",
      field: "Gender / Sex",
      value: isMale ? "Male" : "Female",
      detail: `Verified via pronoun ('${genM[1]}')`,
      confidence: "High (Lexical Match)",
      source_sentence: findSentence(genM.index, sList),
      start_char: genM.index,
      end_char: genM.index + genM[0].length
    });
  }

  const docM = clean.match(/\b(?:under\s+)?(Dr\.?\s+[A-Z][a-zA-Z]+)\b/);
  if (docM) {
    const dVal = docM[1];
    const dIdx = docM.index + docM[0].indexOf(docM[1]);
    patientInfo.push({
      category: "Patient Information",
      field: "Attending Consultant",
      value: dVal,
      detail: dVal,
      confidence: "High (Named Entity Context)",
      source_sentence: findSentence(dIdx, sList),
      start_char: dIdx,
      end_char: dIdx + dVal.length
    });
  }

  // 2. Conditions
  const condPatterns = [
    [/\b(?:type\s*1\s*dm|type\s*1\s*diabetes)\b/gi, "Type 1 Diabetes Mellitus"],
    [/\b(?:type\s*2\s*dm|type\s*2\s*diabetes)\b/gi, "Type 2 Diabetes Mellitus"],
    [/\b(?:diabetes\s*mellitus|diabetes)\b/gi, "Diabetes Mellitus"],
    [/\b(?:hpn|htn|hypertension|high\s*blood\s*pressure)\b/gi, "Hypertension"],
    [/\b(?:copd|chronic\s*obstructive\s*pulmonary\s*disease)\b/gi, "Chronic Obstructive Pulmonary Disease"],
    [/\b(?:asthma)\b/gi, "Asthma"],
    [/\b(?:stroke|cva|transient\s*ischaemic\s*attack|tia)\b/gi, "Cerebrovascular Accident / Stroke"],
    [/\b(?:bell['']s\s*palsy|facial\s*palsy)\b/gi, "Bell's Palsy (Facial Palsy)"],
    [/\b(?:cataract|cataracts)\b/gi, "Cataracts"],
    [/\b(?:glaucoma)\b/gi, "Glaucoma"],
    [/\b(?:atrial\s*fibrillation|af)\b/gi, "Atrial Fibrillation"],
    [/\b(?:urinary\s*tract\s*infection|uti)\b/gi, "Urinary Tract Infection"]
  ];
  const conditionsMap = {};
  for (const [pat, norm] of condPatterns) {
    let m;
    while ((m = pat.exec(clean)) !== null) {
      if (!conditionsMap[norm]) {
        conditionsMap[norm] = {
          category: "Condition",
          text: m[0],
          normalized: norm,
          confidence: "High (Clinical Lexicon)",
          source_sentence: findSentence(m.index, sList),
          start_char: m.index,
          end_char: m.index + m[0].length,
          all_spans: [[m.index, m.index + m[0].length]],
          occurrences: 1
        };
      } else {
        conditionsMap[norm].all_spans.push([m.index, m.index + m[0].length]);
        conditionsMap[norm].occurrences++;
      }
    }
  }
  const conditions = Object.values(conditionsMap);

  // 3. Symptoms
  const sympPatterns = [
    [/\b(?:previous\s*chest\s*pains?|chest\s*pain[s]?)\b/gi, "Chest Pain / Angina Symptoms"],
    [/\b(?:headache[s]?)\b/gi, "Headache (Cephalgia)"],
    [/\b(?:vertigo)\b/gi, "Vertigo (Vestibular)"],
    [/\b(?:tinnitus)\b/gi, "Tinnitus"],
    [/\b(?:photophobia)\b/gi, "Photophobia (Light Sensitivity)"],
    [/\b(?:nausea|vomiting|emesis)\b/gi, "Nausea / Emesis"],
    [/\b(?:dizziness|lightheadedness|dizzy)\b/gi, "Dizziness / Presyncope"],
    [/\b(?:shortness\s*of\s*breath|dyspnoea|dyspnea|sob)\b/gi, "Dyspnea / Shortness of Breath"],
    [/\b(?:unsteady\s*(?:at\s*times)?|ataxia|unsteadiness|falls?|loss\s*of\s*balance)\b/gi, "Gait Unsteadiness / Ataxia"],
    [/\b(?:almost\s*blind|blind|impaired\s*vision|poor\s*vision)\b/gi, "Severe Visual Impairment"]
  ];
  const symptomsMap = {};
  for (const [pat, norm] of sympPatterns) {
    let m;
    while ((m = pat.exec(clean)) !== null) {
      if (!symptomsMap[norm]) {
        symptomsMap[norm] = {
          category: "Symptom",
          text: m[0],
          normalized: norm,
          confidence: "High (Clinical Lexicon)",
          source_sentence: findSentence(m.index, sList),
          start_char: m.index,
          end_char: m.index + m[0].length,
          all_spans: [[m.index, m.index + m[0].length]],
          occurrences: 1
        };
      } else {
        symptomsMap[norm].all_spans.push([m.index, m.index + m[0].length]);
        symptomsMap[norm].occurrences++;
      }
    }
  }
  const symptoms = Object.values(symptomsMap);

  // 4. Medications
  const medPatterns = [
    [/\b(?:nitro|nitros|nitroglycerin|gtn)\b/gi, "Glyceryl Trinitrate (GTN / Nitro)"],
    [/\b(?:sliding\s*scale\s*insulin|variable\s*dose(?:\s*insulin)?|insulin|lantus|novorapid|actrapid)\b/gi, "Insulin (Subcutaneous Regimen)"],
    [/\b(?:antibiotic[s]?|ceftriaxone|augmentin|amoxicillin)\b/gi, "Antibiotic Therapy"],
    [/\b(?:paracetamol|panadol)\b/gi, "Paracetamol (Analgesia)"],
    [/\b(?:morphine|endone|oxycodone)\b/gi, "Opioid Analgesic"]
  ];
  const medsMap = {};
  for (const [pat, norm] of medPatterns) {
    let m;
    while ((m = pat.exec(clean)) !== null) {
      const src = findSentence(m.index, sList);
      const doseM = src.match(/\b(\d+\s*(?:mg|mcg|ml|units?|puffs?)|variable\s*dose|sliding\s*scale|\d+\s+nitros?)\b/i);
      const freqM = src.match(/\b(qid|bd|tds|prn|daily|mane|nocte)\b/i);
      const routeM = src.match(/\b(iv|oral|po|subcut|sc|topical|sublingual)\b/i);

      if (!medsMap[norm]) {
        medsMap[norm] = {
          category: "Medication",
          text: m[0],
          normalized: norm,
          dosage: doseM ? doseM[0] : "Standard ward dose",
          frequency: freqM ? freqM[0].toUpperCase() : "Per protocol",
          route: routeM ? routeM[0].toUpperCase() : "PO / Ward route",
          confidence: "High (Clinical Lexicon)",
          source_sentence: src,
          start_char: m.index,
          end_char: m.index + m[0].length,
          all_spans: [[m.index, m.index + m[0].length]],
          occurrences: 1
        };
      } else {
        medsMap[norm].all_spans.push([m.index, m.index + m[0].length]);
        medsMap[norm].occurrences++;
      }
    }
  }
  const medications = Object.values(medsMap);

  // 5. Investigations
  const invPatterns = [
    [/\b(?:brain\s*mri|mri(?:\s*scan)?)\b/gi, "Brain Magnetic Resonance Imaging (MRI)"],
    [/\b(?:carotid\s*doppler|doppler\s*ultrasound|carotid\s*ultrasound)\b/gi, "Carotid Doppler Ultrasound"],
    [/\b(?:ct(?:\s*scan)?|computed\s*tomography)\b/gi, "Computed Tomography (CT Scan)"],
    [/\b(?:ecg|electrocardiogram|telemetry)\b/gi, "12-Lead ECG / Telemetry"],
    [/\b(?:chest\s*x-?ray|cxr|x-?ray)\b/gi, "Chest Radiography (CXR)"],
    [/\b(?:bgl[s]?|blood\s*glucose|blood\s*sugar|bsl)\b/gi, "Blood Glucose Monitoring (BGL)"]
  ];
  const invMap = {};
  for (const [pat, norm] of invPatterns) {
    let m;
    while ((m = pat.exec(clean)) !== null) {
      if (!invMap[norm]) {
        invMap[norm] = {
          category: "Investigation",
          text: m[0],
          normalized: norm,
          confidence: "High (Clinical Lexicon)",
          source_sentence: findSentence(m.index, sList),
          start_char: m.index,
          end_char: m.index + m[0].length,
          all_spans: [[m.index, m.index + m[0].length]],
          occurrences: 1
        };
      } else {
        invMap[norm].all_spans.push([m.index, m.index + m[0].length]);
        invMap[norm].occurrences++;
      }
    }
  }
  const investigations = Object.values(invMap);

  // 6. Treatments
  const trtPatterns = [
    [/\b(?:sliding\s*scale\s*insulin|variable\s*dose(?:\s*insulin)?)\b/gi, "Sliding Scale Glycemic Protocol"],
    [/\b(?:needs\s*assistance|assistance\s*with\s*adls?|assistance|self\s*caring|ambulant)\b/gi, "ADL & Ward Mobility Level"],
    [/\b(?:monitoring|under\s*monitoring|still\s*under\s*monitoring)\b/gi, "Clinical & Vital Sign Monitoring"],
    [/\b(?:referral\s*to\s*the\s*diabetic\s*educator|referral\s*to\s*[a-zA-Z\s]+)\b/gi, "Allied Health / Specialist Referral"]
  ];
  const trtMap = {};
  for (const [pat, norm] of trtPatterns) {
    let m;
    while ((m = pat.exec(clean)) !== null) {
      if (!trtMap[norm]) {
        trtMap[norm] = {
          category: "Treatment",
          text: m[0],
          normalized: norm,
          confidence: "High (Clinical Lexicon)",
          source_sentence: findSentence(m.index, sList),
          start_char: m.index,
          end_char: m.index + m[0].length,
          all_spans: [[m.index, m.index + m[0].length]],
          occurrences: 1
        };
      }
    }
  }
  const treatments = Object.values(trtMap);

  // 7. Measurements
  const measPatterns = [
    [/\b(?:bp|blood\s*pressure)(?:\s*(?:is|was|of|recorded\s*as)?)?\s*(\d{2,3}\s*\/\s*\d{2,3}(?:\s*mmhg)?|not\s*so\s*bad|high\s*normal(?:\s*range)?|stable|elevated|low|high)\b/gi, "Blood Pressure"],
    [/\b(?:gcs)(?:\s*(?:is|was|of)?)?\s*(\d{1,2}(?:\s*(?:pupils?\s*equal\s*and\s*reactive|pupils?\s*reactive)?)?)\b/gi, "Glasgow Coma Scale (GCS)"],
    [/\b(?:obs|observations)(?:\s*(?:are|were)?)?\s*(stable|unstable|satisfactory)\b/gi, "General Vital Observations"],
    [/\b(?:pupils?\s*(?:are\s*)?equal\s*and\s*reactive)\b/gi, "Pupillary Reflex"]
  ];
  const measurements = [];
  for (const [pat, type] of measPatterns) {
    let m;
    while ((m = pat.exec(clean)) !== null) {
      measurements.push({
        category: "Measurement",
        type,
        text: m[0],
        confidence: "High (Clinical Pattern)",
        source_sentence: findSentence(m.index, sList),
        start_char: m.index,
        end_char: m.index + m[0].length
      });
    }
  }

  // 8. Abbreviations
  const abbreviations = [];
  const seenAbbr = new Set();
  for (const [abbr, expansion] of Object.entries(ABBREVIATIONS_MAP)) {
    const reg = new RegExp(`\\b${abbr}\\b`, 'g');
    let m;
    while ((m = reg.exec(clean)) !== null) {
      if (!seenAbbr.has(abbr)) {
        seenAbbr.add(abbr);
        abbreviations.push({
          abbreviation: abbr,
          expansion,
          source_sentence: findSentence(m.index, sList),
          start_char: m.index,
          end_char: m.index + m[0].length
        });
      }
    }
  }

  // 9. Clinical Events
  const events = [];
  const evRules = [
    [/\b(?:came\s+in(?:\s+for|\s+with)?|admitted(?:\s+for|\s+with)?|presented(?:\s+with)?)\s+([^.,;]+)/gi, "Admission / Presentation", "Patient admitted with/for {0}"],
    [/\b(?:had|given|received|administered)\s+(\d+\s+nitros?|antibiotics?|insulin|medication[s]?[^.,;]*)/gi, "Medication Administration", "Administered {0}"],
    [/\b(?:just\s+came\s+back\s+from|returned\s+from|completed)\s+([^.,;]*(?:mri|scan|ct|doppler)[^.,;]*)/gi, "Investigation Completed", "Completed investigation: {0}"],
    [/\b(?:is\s+for|scheduled\s+for|supposed\s+to\s+have)\s+([^.,;]*(?:carotid\s+doppler|mri|scan|procedure)[^.,;]*)/gi, "Investigation Scheduled", "Scheduled for {0}"],
    [/\b(?:pushed\s+(?:it\s+)?back\s+to|rescheduled\s+to|needs\s+another)\s+([^.,;]+)/gi, "Investigation Rescheduled", "Investigation rescheduled/pending: {0}"],
    [/\b(gcs\s+is\s+\d+[^.,;]*|obs\s+are\s+stable|pupils?\s*equal\s*and\s*reactive)/gi, "Clinical Status Assessment", "Assessment: {0}"],
    [/\b(?:still\s+for\s+referral\s+to|referred\s+to)\s+([^.,;]+)/gi, "Consultation / Referral", "Referral requested for {0}"],
    [/\b(?:still\s+need\s+(?:the\s+)?team\s+to\s+review|still\s+for\s+review)\s*([^.,;]*)/gi, "Clinical Review Event", "Clinical review pending by medical team"]
  ];
  for (const [pat, type, template] of evRules) {
    let m;
    while ((m = pat.exec(clean)) !== null) {
      const arg = m[1] ? m[1].trim() : m[0].trim();
      const desc = template.replace('{0}', arg);
      const src = findSentence(m.index, sList);
      events.push({
        event: desc,
        type,
        time: src.match(/\b(\d{3,4}|this\s+morning|tomorrow|yesterday)\b/i)?.[0] || "Not specified",
        source_sentence: src,
        start_char: m.index,
        end_char: m.index + m[0].length
      });
    }
  }

  // 10. Temporal Expressions
  const temporal = [];
  const tempPats = [
    [/\b(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/gi, "Clock Time"],
    [/\b(?:at|to)\s+(\d{3,4})\b/gi, "Clinical Clock Time"],
    [/\b(today|tonight|this\s+morning|this\s+afternoon)\b/gi, "Immediate Shift"],
    [/\b(tomorrow|yesterday|next\s+shift)\b/gi, "Relative Anchor"],
    [/\b(for\s+the\s+last\s+(?:\d+|three|four|five)\s+years)\b/gi, "Duration"],
    [/\b(since\s+(?:childhood|yesterday))\b/gi, "Onset Anchor"]
  ];
  for (const [pat, type] of tempPats) {
    let m;
    while ((m = pat.exec(clean)) !== null) {
      const src = findSentence(m.index, sList);
      temporal.push({
        expression: m[0],
        type,
        associated_event: events.find(e => e.source_sentence === src)?.event || "Clinical event in shift",
        source_sentence: src,
        start_char: m.index,
        end_char: m.index + m[0].length
      });
    }
  }

  // 11. Pending Tasks & Follow-up
  const pendingTasks = [];
  const pendingPats = [
    [/\b(?:needs\s+another|rescheduled|needs|waiting\s+for)\s+([^.,;]+)/gi, "Diagnostic Scheduling Pending", "High"],
    [/\b(?:still\s+for\s+referral\s+to|referral\s+to)\s+([^.,;]+)/gi, "Specialist Referral Pending", "Medium"],
    [/\b(?:still\s+need\s+(?:the\s+)?team\s+to\s+review|still\s+for\s+review)\b/gi, "Medical Team Review Pending", "High"],
    [/\b(?:just\s+ask\s+the\s+doctor\s+for\s+the\s+next\s+dose|ask\s+doctor)\b/gi, "Medication Dosing Clarification", "High"],
    [/\b(?:still\s+under\s+monitoring)\b/gi, "Ongoing Active Monitoring Required", "Medium"]
  ];
  for (const [pat, type, prio] of pendingPats) {
    let m;
    while ((m = pat.exec(clean)) !== null) {
      const src = findSentence(m.index, sList);
      pendingTasks.push({
        task: m[0].charAt(0).toUpperCase() + m[0].slice(1),
        type,
        priority: prio,
        source_sentence: src,
        start_char: m.index,
        end_char: m.index + m[0].length
      });
    }
  }

  const followUp = [];
  for (const pt of pendingTasks) {
    if (pt.task.toLowerCase().includes('referral') || pt.task.toLowerCase().includes('review') || pt.task.toLowerCase().includes('appointment')) {
      followUp.push({
        action: pt.task,
        type: "Specialist / Multidisciplinary Follow-Up",
        source_sentence: pt.source_sentence,
        start_char: pt.start_char,
        end_char: pt.end_char
      });
    }
  }

  // 12. Clinical Safety & Risk Alerts
  const clinicalRisks = [];
  const lower = clean.toLowerCase();
  if (lower.includes("unsteady") || lower.includes("blind") || lower.includes("assistance") || lower.includes("balance")) {
    clinicalRisks.push({
      risk_type: "Fall Risk Alert",
      severity: "High",
      rationale: "Documented gait unsteadiness, sensory deficit, or mobility assistance required.",
      care_directive: "Ensure call bell within reach; assistance with all ward transfers."
    });
  }
  if (lower.includes("chest pain") || lower.includes("no effect") || lower.includes("nitro")) {
    clinicalRisks.push({
      risk_type: "Cardiovascular / Ischemic Alert",
      severity: "High",
      rationale: "Chest pain history or acute cardiac medication administration noted.",
      care_directive: "Continuous telemetry / observation; immediate doctor review if pain recurs."
    });
  }
  if (lower.includes("type 1") || lower.includes("sliding scale") || lower.includes("bgl trend")) {
    clinicalRisks.push({
      risk_type: "Glycemic Management Alert",
      severity: "Medium",
      rationale: "Sliding scale insulin protocol with documented morning blood glucose fluctuations.",
      care_directive: "Pre-prandial BGL monitoring; verify insulin dose with medical team."
    });
  }
  if (lower.includes("gcs") || lower.includes("bell's palsy") || lower.includes("vertigo") || lower.includes("photophobia")) {
    clinicalRisks.push({
      risk_type: "Neurological Monitoring Alert",
      severity: "Medium",
      rationale: "Cranial nerve / neurological symptoms under active investigation.",
      care_directive: "Routine neuro observations; monitor pupil equality and limb symmetry."
    });
  }

  // 13. Executive Shift Brief
  const ptDict = {};
  for (const p of patientInfo) ptDict[p.field] = p.value;
  const pName = ptDict["Patient Name"] || "Patient";
  const pBed = ptDict["Bed / Room"] || "Ward Bed";
  const pAge = ptDict["Age"] || "";
  const pDoc = ptDict["Attending Consultant"] || "Medical Team";
  const primaryReason = conditions[0]?.normalized || symptoms[0]?.normalized || "clinical evaluation";
  const obsStatus = measurements.find(m => m.type.includes("GCS"))?.text || "observations stable";
  const keyTask = pendingTasks[0]?.task ? `Key priority is to follow up on ${pendingTasks[0].task.toLowerCase()}.` : "Patient stable under routine ward care.";
  const execSummary = `${pName} (${pBed}, ${pAge}${pDoc !== "Medical Team" ? ', under ' + pDoc : ''}) admitted for management of ${primaryReason}. ${obsStatus}; ${keyTask}`;

  // 14. ISBAR Framework
  const isbar = {
    identify: [
      `Patient: ${pName}`,
      `Location: ${pBed}`,
      `Demographics: ${pAge} | ${ptDict["Gender / Sex"] || "Sex not documented"}`,
      `Consultant: ${pDoc}`
    ],
    situation: [
      `Current Admission Presentation: ${primaryReason}`,
      ...events.filter(e => e.type.includes("Admission")).map(e => `Context: ${e.event}`)
    ],
    background: [
      ...(conditions.length > 0 ? conditions.map(c => `Documented Condition: ${c.normalized}`) : ["No prior chronic conditions documented."])
    ],
    assessment: [
      ...(measurements.map(m => `${m.type}: ${m.text}`)),
      ...(treatments.map(t => `Care Status: ${t.normalized} (${t.text})`)),
      ...(investigations.map(i => `Diagnostic Finding: ${i.normalized}`))
    ],
    recommendation: [
      ...(pendingTasks.map(t => `[${t.priority} Priority] ${t.task}`)),
      ...(followUp.map(f => `Follow-Up: ${f.action}`))
    ]
  };

  // 15. Standard 9 Categories
  const structuredHandover = {
    patient_information: patientInfo.map(p => `${p.field}: ${p.value}`),
    current_condition: [
      ...symptoms.map(s => `Acute Symptom: ${s.normalized}`),
      ...measurements.map(m => `Vital Assessment: ${m.type} — ${m.text}`)
    ],
    medical_history: conditions.map(c => `Documented History: ${c.normalized}`),
    medications_treatment: [
      ...medications.map(m => `${m.normalized} — Dose: ${m.dosage}, Route: ${m.route}, Freq: ${m.frequency}`),
      ...treatments.map(t => `Care Level: ${t.normalized} (${t.text})`)
    ],
    investigations: investigations.map(i => `Investigation: ${i.normalized}`),
    clinical_events: events.map(e => `${e.event} (${e.type})`),
    temporal_information: temporal.map(t => `Time: '${t.expression}' (${t.type}) → ${t.associated_event}`),
    pending_tasks: pendingTasks.map(p => `[${p.priority} Priority] ${p.task} (${p.type})`),
    follow_up: followUp.map(f => `${f.action} (${f.type})`),
    executive_summary: execSummary,
    isbar
  };

  // 16. Evidence Mapping
  const evidence = [
    ...patientInfo.map(p => ({ category: "Patient Info", entity: `${p.field}: ${p.value}`, source_sentence: p.source_sentence })),
    ...conditions.map(c => ({ category: "Condition", entity: c.text, source_sentence: c.source_sentence })),
    ...symptoms.map(s => ({ category: "Symptom", entity: s.text, source_sentence: s.source_sentence })),
    ...medications.map(m => ({ category: "Medication", entity: m.text, source_sentence: m.source_sentence })),
    ...investigations.map(i => ({ category: "Investigation", entity: i.text, source_sentence: i.source_sentence })),
    ...measurements.map(ms => ({ category: "Measurement", entity: ms.text, source_sentence: ms.source_sentence })),
    ...events.map(ev => ({ category: "Clinical Event", entity: ev.event, source_sentence: ev.source_sentence })),
    ...pendingTasks.map(pt => ({ category: "Pending Task", entity: pt.task, source_sentence: pt.source_sentence }))
  ];

  return {
    report_id: reportId || "Custom",
    raw_text: text,
    preprocessed_text: clean,
    changes_made: prep.changes_made,
    word_count: clean.split(/\s+/).filter(Boolean).length,
    char_count: clean.length,
    entities: {
      patient_information: patientInfo,
      conditions,
      symptoms,
      medications,
      investigations,
      treatments,
      measurements,
      abbreviations,
      clinical_risks: clinicalRisks
    },
    events,
    temporal_information: temporal,
    pending_tasks: pendingTasks,
    follow_up: followUp,
    structured_handover: structuredHandover,
    executive_summary: execSummary,
    isbar,
    clinical_risks: clinicalRisks,
    evidence,
    model_metadata: {
      pipeline: "PULSE Client/Cloud Hybrid Clinical Pipeline",
      nlp_paradigm: "Dictionary, Pattern, and Contextual Rule Engine",
      planned_future_model: "Bio_ClinicalBERT (Candidate backbone)",
      evaluation_reference: "Synthetic Nursing Handover Reference Corpus (101 Documents)"
    }
  };
}

export function getLocalStats() {
  return datasetData.stats;
}

export function getLocalReports() {
  return {
    total_count: datasetData.reports.length,
    reports: datasetData.reports.map(r => ({
      report_id: r.report_id,
      filename: r.filename,
      word_count: r.word_count,
      char_count: r.char_count,
      preview: r.raw_text.length > 140 ? r.raw_text.substring(0, 140) + "..." : r.raw_text,
      status: r.status
    }))
  };
}

export function getLocalReport(reportId) {
  const r = datasetData.reports.find(item => String(item.report_id) === String(reportId));
  if (!r) throw new Error(`Report #${reportId} not found`);
  const prep = preprocessTextLocal(r.raw_text);
  return {
    report_id: r.report_id,
    filename: r.filename,
    word_count: r.word_count,
    char_count: r.char_count,
    raw_text: r.raw_text,
    preprocessed_text: prep.preprocessed_text,
    changes_made: prep.changes_made
  };
}
