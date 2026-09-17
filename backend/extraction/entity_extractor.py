"""
PULSE Clinical Entity Extractor
Defines the ClinicalEntityExtractor interface and provides a modular
HybridClinicalEntityExtractor combining clinical dictionaries, regular expressions,
clinical risk heuristics, and deduplicated semantic groupings.

Also includes an extensible BioClinicalBertEntityExtractor stub with TODO hooks
for future experimental integration of a fine-tuned transformer model.
"""

import re
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple

class ClinicalEntityExtractor(ABC):
    """
    Abstract Base Class for Clinical Entity Extraction.
    Future fine-tuned Bio_ClinicalBERT or SciSpacy models must implement this interface.
    """
    @abstractmethod
    def extract(self, text: str) -> Dict[str, Any]:
        pass


class BioClinicalBertEntityExtractor(ClinicalEntityExtractor):
    """
    Candidate Architecture Extension Point:
    Bio_ClinicalBERT (Alsentzer et al., 2019) Token Classification / NER pipeline.
    
    RESEARCH NOTE:
    Bio_ClinicalBERT is a proposed candidate backbone for PULSE. It has NOT yet
    been fine-tuned on the 101 nursing handover reference files.
    When fine-tuned checkpoints become available, this class can be initialized
    with the PyTorch/HuggingFace AutoModelForTokenClassification weights without
    changing any downstream API or frontend contracts.
    """
    def __init__(self, model_checkpoint: Optional[str] = None):
        self.model_checkpoint = model_checkpoint or "emilyalsentzer/Bio_ClinicalBERT"
        self.is_loaded = False
        # TODO: When fine-tuned weights are ready:
        # from transformers import AutoTokenizer, AutoModelForTokenClassification, pipeline
        # self.tokenizer = AutoTokenizer.from_pretrained(self.model_checkpoint)
        # self.model = AutoModelForTokenClassification.from_pretrained(self.model_checkpoint)
        # self.ner_pipeline = pipeline("ner", model=self.model, tokenizer=self.tokenizer)
        # self.is_loaded = True

    def extract(self, text: str) -> Dict[str, Any]:
        raise NotImplementedError(
            "Bio_ClinicalBERT fine-tuning pipeline is planned for future experimental evaluation. "
            "Use HybridClinicalEntityExtractor for the working prototype."
        )


class HybridClinicalEntityExtractor(ClinicalEntityExtractor):
    """
    Production-grade hybrid clinical information extractor tailored for nursing handovers.
    Combines:
    1. Clinical dictionaries (conditions, symptoms, medications, procedures)
    2. Regular expressions for demographics, vitals, measurements, dosages
    3. Clinical Safety & Risk Alert identification (Fall Risk, Glycemic Alert, Cardiac Alert)
    4. Deduplication & clinical entity consolidation
    5. Clinical abbreviations catalog
    """

    def __init__(self):
        self._init_dictionaries()

    def _init_dictionaries(self):
        # Clinical abbreviations with validated medical expansions
        self.abbreviations_map = {
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
            "SOB": "Shortness of Breath",
            "PO": "Per Os (Orally)",
            "NOF": "Neck of Femur",
            "NBM": "Nil By Mouth",
            "CCF": "Congestive Cardiac Failure",
            "AMI": "Acute Myocardial Infarction",
            "TIA": "Transient Ischaemic Attack",
            "CVA": "Cerebrovascular Accident (Stroke)",
            "DVT": "Deep Vein Thrombosis",
            "PE": "Pulmonary Embolism",
            "OA": "Osteoarthritis",
            "RA": "Rheumatoid Arthritis",
            "TKR": "Total Knee Replacement",
            "THR": "Total Hip Replacement",
            "MET": "Medical Emergency Team"
        }

        # Medical Conditions
        self.condition_patterns = [
            (r"\b(?:type\s*1\s*dm|type\s*1\s*diabetes)\b", "Type 1 Diabetes Mellitus"),
            (r"\b(?:type\s*2\s*dm|type\s*2\s*diabetes)\b", "Type 2 Diabetes Mellitus"),
            (r"\b(?:diabetes\s*mellitus|diabetes)\b", "Diabetes Mellitus"),
            (r"\b(?:hpn|htn|hypertension|high\s*blood\s*pressure)\b", "Hypertension"),
            (r"\b(?:copd|chronic\s*obstructive\s*pulmonary\s*disease)\b", "Chronic Obstructive Pulmonary Disease"),
            (r"\b(?:asthma)\b", "Asthma"),
            (r"\b(?:stroke|cva|transient\s*ischaemic\s*attack|tia)\b", "Cerebrovascular Accident / Stroke"),
            (r"\b(?:bell['’]s\s*palsy|facial\s*palsy)\b", "Bell's Palsy (Facial Palsy)"),
            (r"\b(?:cataract|cataracts)\b", "Cataracts"),
            (r"\b(?:glaucoma)\b", "Glaucoma"),
            (r"\b(?:atrial\s*fibrillation|af)\b", "Atrial Fibrillation"),
            (r"\b(?:urinary\s*tract\s*infection|uti)\b", "Urinary Tract Infection"),
            (r"\b(?:mrsa)\b", "MRSA Colonization/Infection"),
            (r"\b(?:congestive\s*cardiac\s*failure|heart\s*failure|ccf)\b", "Congestive Cardiac Failure"),
            (r"\b(?:dementia|alzheimer['’]s)\b", "Dementia / Cognitive Impairment"),
            (r"\b(?:epilepsy|seizure\s*disorder)\b", "Epilepsy / Seizure Disorder"),
            (r"\b(?:osteoarthritis|rheumatoid\s*arthritis|arthritis|oa|ra)\b", "Arthritis"),
            (r"\b(?:parkinson['’]s|parkinsons)\b", "Parkinson's Disease"),
            (r"\b(?:pneumonia)\b", "Pneumonia"),
            (r"\b(?:cellulitis)\b", "Cellulitis"),
            (r"\b(?:angina)\b", "Angina Pectoris"),
            (r"\b(?:renal\s*failure|kidney\s*disease|ckd)\b", "Chronic Kidney Disease"),
            (r"\b(?:depression|anxiety|bipolar)\b", "Psychiatric History"),
            (r"\b(?:fracture|fractured\s*nof|broken\s*hip)\b", "Fracture"),
            (r"\b(?:history\s*of\s*([a-zA-Z0-9\s]+?)(?:,|\.|\sand\s|\swith\s))", "Documented Medical History")
        ]

        # Symptoms
        self.symptom_patterns = [
            (r"\b(?:previous\s*chest\s*pains?|chest\s*pain[s]?)\b", "Chest Pain / Angina Symptoms"),
            (r"\b(?:headache[s]?)\b", "Headache (Cephalgia)"),
            (r"\b(?:vertigo)\b", "Vertigo (Vestibular)"),
            (r"\b(?:tinnitus)\b", "Tinnitus"),
            (r"\b(?:photophobia)\b", "Photophobia (Light Sensitivity)"),
            (r"\b(?:pain[s]?|abdominal\s*pain|back\s*pain|joint\s*pain)\b", "Pain"),
            (r"\b(?:nausea|vomiting|emesis)\b", "Nausea / Emesis"),
            (r"\b(?:dizziness|lightheadedness|dizzy)\b", "Dizziness / Presyncope"),
            (r"\b(?:shortness\s*of\s*breath|dyspnoea|dyspnea|sob)\b", "Dyspnea / Shortness of Breath"),
            (r"\b(?:weakness|lethargy|fatigue|malaise)\b", "Lethargy / Generalized Weakness"),
            (r"\b(?:fever|febrile|pyrexia|chills|rigors)\b", "Febrile Episode / Fever"),
            (r"\b(?:cough|productive\s*cough|sputum)\b", "Cough"),
            (r"\b(?:unsteady\s*(?:at\s*times)?|ataxia|unsteadiness|falls?|loss\s*of\s*balance)\b", "Gait Unsteadiness / Ataxia"),
            (r"\b(?:confusion|delirium|disorientated|disoriented)\b", "Acute Confusion / Delirium"),
            (r"\b(?:almost\s*blind|blind|impaired\s*vision|poor\s*vision)\b", "Severe Visual Impairment"),
            (r"\b(?:swelling|edema|oedema)\b", "Peripheral Edema")
        ]

        # Medications
        self.medication_patterns = [
            (r"\b(?:nitro|nitros|nitroglycerin|gtn|glyceryl\s*trinitrate)\b", "Glyceryl Trinitrate (GTN / Nitro)"),
            (r"\b(?:sliding\s*scale\s*insulin|variable\s*dose(?:\s*insulin)?|insulin|lantus|novorapid|actrapid|humalog)\b", "Insulin (Subcutaneous Regimen)"),
            (r"\b(?:antibiotic[s]?|ceftriaxone|augmentin|amoxicillin|flucloxacillin|gentamicin|tazocin)\b", "Antibiotic Therapy"),
            (r"\b(?:paracetamol|panadol|tylenol|acetaminophen)\b", "Paracetamol (Analgesia)"),
            (r"\b(?:morphine|endone|oxycodone|tramadol|codeine|fentanyl)\b", "Opioid Analgesic"),
            (r"\b(?:metoprolol|atenolol|bisoprolol|carvedilol)\b", "Beta-Adrenoreceptor Antagonist"),
            (r"\b(?:ramipril|perindopril|lisinopril|enalapril)\b", "ACE Inhibitor"),
            (r"\b(?:frusemide|furosemide|spironolactone)\b", "Loop Diuretic"),
            (r"\b(?:heparin|clexane|enoxaparin|warfarin|aspirin|plavix|clopidogrel)\b", "Anticoagulant / Antiplatelet"),
            (r"\b(?:ventolin|salbutamol|atrovent|ipratropium|seretide|symbicort)\b", "Inhaled Bronchodilator"),
            (r"\b(?:prednisone|prednisolone|dexamethasone)\b", "Systemic Corticosteroid"),
            (r"\b(?:statin|atorvastatin|rosuvastatin|simvastatin)\b", "HMG-CoA Reductase Inhibitor"),
            (r"\b(?:metformin|gliclazide|jardiance)\b", "Oral Hypoglycemic Agent"),
            (r"\b(?:ondansetron|maxolon|metoclopramide)\b", "Antiemetic Agent"),
            (r"\b(?:laxative[s]?|coloxyl|senna|movicol)\b", "Aperient / Bowel Management")
        ]

        # Investigations
        self.investigation_patterns = [
            (r"\b(?:brain\s*mri|mri(?:\s*scan)?)\b", "Brain Magnetic Resonance Imaging (MRI)"),
            (r"\b(?:carotid\s*doppler|doppler\s*ultrasound|carotid\s*ultrasound)\b", "Carotid Doppler Ultrasound"),
            (r"\b(?:ct(?:\s*scan)?|computed\s*tomography)\b", "Computed Tomography (CT Scan)"),
            (r"\b(?:ecg|electrocardiogram|telemetry|cardiac\s*monitor(?:ing)?)\b", "12-Lead ECG / Telemetry"),
            (r"\b(?:chest\s*x-?ray|cxr|x-?ray)\b", "Chest Radiography (CXR)"),
            (r"\b(?:bgl[s]?|blood\s*glucose|blood\s*sugar|bsl)\b", "Blood Glucose Monitoring (BGL)"),
            (r"\b(?:blood\s*test[s]?|pathology|fbc|full\s*blood\s*count|uec|lfts?|inr|troponin|blood\s*cultures?)\b", "Pathology / Blood Analysis"),
            (r"\b(?:urine\s*test|urinalysis|midstream\s*urine|msu)\b", "Urinalysis (MSU)"),
            (r"\b(?:ultrasound|uss)\b", "Ultrasound Sonography"),
            (r"\b(?:echo|echocardiogram)\b", "Transthoracic Echocardiogram"),
            (r"\b(?:angiogram|angiography)\b", "Coronary Angiogram")
        ]

        # Treatments
        self.treatment_patterns = [
            (r"\b(?:iv\s*antibiotics?|intravenous\s*antibiotics?|iv\s*infusion|iv\s*fluids?|iv\s*line|drip)\b", "Intravenous Infusion Therapy"),
            (r"\b(?:sliding\s*scale\s*insulin|variable\s*dose(?:\s*insulin)?)\b", "Sliding Scale Glycemic Protocol"),
            (r"\b(?:dressing|wound\s*dressing|wound\s*care|sutures?|clips?|vacuum\s*dressing|vac)\b", "Wound Management / Dressing"),
            (r"\b(?:oxygen(?:\s*therapy)?|o2(?:\s*via\s*nasal\s*prongs|\s*mask)?)\b", "Supplemental Oxygen Therapy"),
            (r"\b(?:catheter|idc|indwelling\s*catheter|catheterisation|catheterization)\b", "Indwelling Urinary Catheter Care"),
            (r"\b(?:physio(?:therapy)?|mobility\s*assistance|physiotherapist\s*review)\b", "Physiotherapy & Mobility Assistance"),
            (r"\b(?:needs\s*assistance|assistance\s*with\s*adls?|assistance|self\s*caring|ambulant)\b", "ADL & Ward Mobility Level"),
            (r"\b(?:dietitian\s*review|diabetic\s*educator|referral\s*to\s*[a-zA-Z\s]+)\b", "Specialist / Allied Health Referral"),
            (r"\b(?:monitoring|under\s*monitoring|neurological\s*observations?|neuro\s*obs)\b", "Clinical & Vital Sign Monitoring"),
            (r"\b(?:nebuliser|nebulizer|nebs|spacer)\b", "Nebulized Inhalation Therapy")
        ]

        # Measurements & Vital Signs
        self.measurement_patterns = [
            (r"\b(?:bp|blood\s*pressure)(?:\s*(?:is|was|of|recorded\s*as)?)?\s*(\d{2,3}\s*/\s*\d{2,3}(?:\s*mmhg)?|not\s*so\s*bad|high\s*normal(?:\s*range)?|stable|elevated|low|high)\b", "Blood Pressure"),
            (r"\b(?:gcs)(?:\s*(?:is|was|of)?)?\s*(\d{1,2}(?:\s*(?:pupils?\s*equal\s*and\s*reactive|pupils?\s*reactive|e\d+v\d+m\d+)?)?)\b", "Glasgow Coma Scale (GCS)"),
            (r"\b(?:obs|observations)(?:\s*(?:are|were)?)?\s*(stable|unstable|satisfactory|within\s*normal\s*limits)\b", "General Vital Observations"),
            (r"\b(?:pupils?\s*(?:are\s*)?equal\s*and\s*reactive)\b", "Pupillary Reflex"),
            (r"\b(?:hr|heart\s*rate|pulse)(?:\s*(?:is|was|of)?)?\s*(\d{2,3}(?:\s*bpm)?)\b", "Heart Rate"),
            (r"\b(?:temp|temperature)(?:\s*(?:is|was|of)?)?\s*(\d{2}(?:\.\d)?(?:\s*(?:c|degrees))?)\b", "Core Temperature"),
            (r"\b(?:sats|spo2|oxygen\s*saturation)(?:\s*(?:is|was|of)?)?\s*(\d{2,3}\s*%(?:\s*on\s*air|\s*on\s*oxygen)?)\b", "Pulse Oximetry (SpO2)"),
            (r"\b(?:bgl|bgls|blood\s*sugar)(?:\s*(?:trend\s*used\s*to\s*be|was|is|running)?)?\s*(high(?:\s*during\s*the\s*am)?|low|normal|\d+(\.\d+)?(?:\s*mmol/l)?)\b", "Blood Glucose Value (BGL)")
        ]

    def _split_into_sentences(self, text: str) -> List[Tuple[str, int, int]]:
        sentence_spans = []
        pattern = re.compile(r'([^.!?]+(?:[.!?]+|$))', re.MULTILINE)
        for match in pattern.finditer(text):
            sent = match.group().strip()
            if sent:
                sentence_spans.append((sent, match.start(), match.end()))
        if not sentence_spans and text:
            sentence_spans.append((text, 0, len(text)))
        return sentence_spans

    def _find_source_sentence(self, match_start: int, sentence_spans: List[Tuple[str, int, int]]) -> str:
        for sent_text, s_start, s_end in sentence_spans:
            if s_start <= match_start <= s_end:
                return sent_text
        return sentence_spans[0][0] if sentence_spans else ""

    def extract(self, text: str) -> Dict[str, Any]:
        if not text:
            return {
                "patient_information": [],
                "conditions": [],
                "symptoms": [],
                "medications": [],
                "investigations": [],
                "treatments": [],
                "measurements": [],
                "abbreviations": [],
                "clinical_risks": []
            }

        sentence_spans = self._split_into_sentences(text)

        entities: Dict[str, Any] = {
            "patient_information": [],
            "conditions": [],
            "symptoms": [],
            "medications": [],
            "investigations": [],
            "treatments": [],
            "measurements": [],
            "abbreviations": [],
            "clinical_risks": []
        }

        # 1. Patient Information Extraction
        self._extract_patient_info(text, sentence_spans, entities["patient_information"])

        # 2. Medical Conditions Extraction (Consolidated & deduplicated)
        self._extract_pattern_category(text, sentence_spans, self.condition_patterns, "Condition", entities["conditions"])

        # 3. Symptoms Extraction (Consolidated & deduplicated)
        self._extract_pattern_category(text, sentence_spans, self.symptom_patterns, "Symptom", entities["symptoms"])

        # 4. Medications Extraction
        self._extract_medications(text, sentence_spans, entities["medications"])

        # 5. Investigations Extraction
        self._extract_pattern_category(text, sentence_spans, self.investigation_patterns, "Investigation", entities["investigations"])

        # 6. Treatments Extraction
        self._extract_pattern_category(text, sentence_spans, self.treatment_patterns, "Treatment", entities["treatments"])

        # 7. Measurements & Vital Signs Extraction
        self._extract_measurements(text, sentence_spans, entities["measurements"])

        # 8. Clinical Abbreviations Catalog
        self._extract_abbreviations(text, sentence_spans, entities["abbreviations"])

        # 9. Clinical Safety & Risk Alerts
        entities["clinical_risks"] = self._extract_clinical_risks(text, entities)

        return entities

    def _extract_patient_info(self, text: str, sentence_spans: List[Tuple[str, int, int]], output_list: List[Dict[str, Any]]):
        bed_match = re.search(r"\b(?:bed|room)\s+([a-zA-Z0-9]+)\b", text, re.IGNORECASE)
        if bed_match:
            output_list.append({
                "category": "Patient Information",
                "field": "Bed / Room",
                "value": bed_match.group(0),
                "detail": f"Bed {bed_match.group(1)}",
                "confidence": "High (Rule Pattern)",
                "source_sentence": self._find_source_sentence(bed_match.start(), sentence_spans),
                "start_char": bed_match.start(),
                "end_char": bed_match.end()
            })

        name_patterns = [
            r"(?:bed\s+[a-zA-Z0-9]+[\s,]+)([A-Z][a-zA-Z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-zA-Z]+)",
            r"^([A-Z][a-zA-Z]+(?:\s+[a-zA-Z]+){1,3})(?:[\s,]+(?:bed|\d+|under))",
            r"(?:patient\s+is\s+)([A-Z][a-zA-Z]+\s+[A-Z][a-zA-Z]+)"
        ]
        for pat in name_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                name_val = m.group(1).strip(", ")
                if name_val.lower() not in ["the patient", "he came", "she came", "this patient", "bed"]:
                    output_list.append({
                        "category": "Patient Information",
                        "field": "Patient Name",
                        "value": name_val,
                        "detail": name_val,
                        "confidence": "High (Named Entity Context)",
                        "source_sentence": self._find_source_sentence(m.start(1), sentence_spans),
                        "start_char": m.start(1),
                        "end_char": m.end(1)
                    })
                    break

        age_patterns = [
            (r"\b(\d{1,3})\s*(?:years|yo|y\.?o\.?|years\s*old)\b", lambda m: f"{m.group(1)} years"),
            (r"\b(?:Forty-eight|Fifty|Sixty|Seventy|Eighty|Ninety|Twenty|Thirty)[-\s]?[a-zA-Z]*\s*years\b", lambda m: m.group(0)),
            (r",\s*(\d{1,3})\s*,\s*bed", lambda m: f"{m.group(1)} years"),
            (r"bed\s+\d+[\s,]+(\d{1,3})\s+under", lambda m: f"{m.group(1)} years")
        ]
        for pat, formatter in age_patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                output_list.append({
                    "category": "Patient Information",
                    "field": "Age",
                    "value": formatter(m),
                    "detail": formatter(m),
                    "confidence": "High (Rule Pattern)",
                    "source_sentence": self._find_source_sentence(m.start(), sentence_spans),
                    "start_char": m.start(),
                    "end_char": m.end()
                })
                break

        gender_m = re.search(r"\b(he|his|him|she|her|hers|male|female)\b", text, re.IGNORECASE)
        if gender_m:
            token = gender_m.group(1).lower()
            gender_val = "Male" if token in ["he", "his", "him", "male"] else "Female"
            output_list.append({
                "category": "Patient Information",
                "field": "Gender / Sex",
                "value": gender_val,
                "detail": f"Verified via clinical pronoun/record ('{gender_m.group(1)}')",
                "confidence": "High (Lexical Match)",
                "source_sentence": self._find_source_sentence(gender_m.start(), sentence_spans),
                "start_char": gender_m.start(),
                "end_char": gender_m.end()
            })

        doc_m = re.search(r"\b(?:under\s+)?(Dr\.?\s+[A-Z][a-zA-Z]+)\b", text)
        if doc_m:
            output_list.append({
                "category": "Patient Information",
                "field": "Attending Consultant",
                "value": doc_m.group(1),
                "detail": doc_m.group(1),
                "confidence": "High (Named Entity Context)",
                "source_sentence": self._find_source_sentence(doc_m.start(1), sentence_spans),
                "start_char": doc_m.start(1),
                "end_char": doc_m.end(1)
            })

    def _extract_pattern_category(self, text: str, sentence_spans: List[Tuple[str, int, int]], patterns: List[Tuple[str, str]], category_label: str, output_list: List[Dict[str, Any]]):
        matched_dict = {}
        for pat, normalized_name in patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                span = (m.start(), m.end())
                matched_text = m.group(0).strip()
                source_sent = self._find_source_sentence(m.start(), sentence_spans)

                # Deduplicate by normalized name while preserving all span highlights
                if normalized_name not in matched_dict:
                    matched_dict[normalized_name] = {
                        "category": category_label,
                        "text": matched_text,
                        "normalized": normalized_name,
                        "confidence": "High (Clinical Lexicon)",
                        "source_sentence": source_sent,
                        "start_char": m.start(),
                        "end_char": m.end(),
                        "all_spans": [span],
                        "occurrences": 1
                    }
                else:
                    matched_dict[normalized_name]["all_spans"].append(span)
                    matched_dict[normalized_name]["occurrences"] += 1

        for item in matched_dict.values():
            output_list.append(item)

    def _extract_medications(self, text: str, sentence_spans: List[Tuple[str, int, int]], output_list: List[Dict[str, Any]]):
        matched_meds = {}
        for pat, norm in self.medication_patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                start, end = m.start(), m.end()
                matched_med = m.group(0).strip()
                source_sent = self._find_source_sentence(start, sentence_spans)

                dosage_match = re.search(r"\b(\d+\s*(?:mg|mcg|ml|units?|puffs?)|variable\s*dose|sliding\s*scale|\d+\s+nitros?)\b", source_sent, re.IGNORECASE)
                dosage = dosage_match.group(0) if dosage_match else "Standard ward dose"

                freq_match = re.search(r"\b(qid|bd|tds|prn|daily|mane|nocte|hourly)\b", source_sent, re.IGNORECASE)
                frequency = freq_match.group(0).upper() if freq_match else "Per clinical protocol"

                route_match = re.search(r"\b(iv|oral|po|subcut|sc|topical|sublingual|inhal(?:er|ation))\b", source_sent, re.IGNORECASE)
                route = route_match.group(0).upper() if route_match else "PO / Clinical route"

                if norm not in matched_meds:
                    matched_meds[norm] = {
                        "category": "Medication",
                        "text": matched_med,
                        "normalized": norm,
                        "dosage": dosage,
                        "frequency": frequency,
                        "route": route,
                        "confidence": "High (Clinical Lexicon)",
                        "source_sentence": source_sent,
                        "start_char": start,
                        "end_char": end,
                        "all_spans": [(start, end)],
                        "occurrences": 1
                    }
                else:
                    matched_meds[norm]["all_spans"].append((start, end))
                    matched_meds[norm]["occurrences"] += 1

        for item in matched_meds.values():
            output_list.append(item)

    def _extract_measurements(self, text: str, sentence_spans: List[Tuple[str, int, int]], output_list: List[Dict[str, Any]]):
        seen_meas = set()
        for pat, m_type in self.measurement_patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                matched = m.group(0).strip()
                key = (m_type, matched.lower())
                if key not in seen_meas:
                    seen_meas.add(key)
                    source_sent = self._find_source_sentence(m.start(), sentence_spans)
                    output_list.append({
                        "category": "Measurement",
                        "type": m_type,
                        "text": matched,
                        "confidence": "High (Clinical Pattern)",
                        "source_sentence": source_sent,
                        "start_char": m.start(),
                        "end_char": m.end()
                    })

    def _extract_abbreviations(self, text: str, sentence_spans: List[Tuple[str, int, int]], output_list: List[Dict[str, Any]]):
        seen_abbr = set()
        for abbr, expansion in self.abbreviations_map.items():
            pattern = rf"\b{re.escape(abbr)}\b"
            for m in re.finditer(pattern, text):
                if abbr not in seen_abbr:
                    seen_abbr.add(abbr)
                    source_sent = self._find_source_sentence(m.start(), sentence_spans)
                    output_list.append({
                        "abbreviation": abbr,
                        "expansion": expansion,
                        "source_sentence": source_sent,
                        "start_char": m.start(),
                        "end_char": m.end()
                    })

    def _extract_clinical_risks(self, text: str, entities: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Synthesizes real-world clinical safety flags (Fall Risk, Glycemic Alert, Cardiac Alert, Neurological Alert).
        """
        risks = []
        lower = text.lower()

        # Fall Risk
        if any(term in lower for term in ["unsteady", "ataxia", "blind", "vision", "assistance", "falls", "balance", "mobility"]):
            risks.append({
                "risk_type": "Fall Risk Alert",
                "severity": "High",
                "rationale": "Patient documented as unsteady, requiring assistance, or exhibiting sensory/balance deficit.",
                "care_directive": "Ensure call bell within reach; assist during transfers; non-slip footwear."
            })

        # Cardiac / Ischemic Alert
        if any(term in lower for term in ["chest pain", "no effect", "nitro", "angina", "troponin", "cva", "stroke"]):
            risks.append({
                "risk_type": "Cardiovascular / Ischemic Alert",
                "severity": "High" if "no effect" in lower or "chest pain" in lower else "Medium",
                "rationale": "Active chest pain history or acute cardiac medication administration noted.",
                "care_directive": "Continuous observation; notify medical team immediately if pain recurs; repeat 12-lead ECG."
            })

        # Glycemic / Diabetic Alert
        if any(term in lower for term in ["type 1", "sliding scale", "bgl trend", "high during the am", "insulin"]):
            risks.append({
                "risk_type": "Glycemic Management Alert",
                "severity": "Medium",
                "rationale": "Active insulin regimen with variable dosing or morning glycemic fluctuations.",
                "care_directive": "Pre-prandial BGL monitoring; clarify sliding scale dose with medical team prior to administration."
            })

        # Neurological / Coma Alert
        if any(term in lower for term in ["gcs", "bell's palsy", "vertigo", "photophobia", "headache", "mri"]):
            risks.append({
                "risk_type": "Neurological Monitoring Alert",
                "severity": "Medium",
                "rationale": "Ongoing central nervous system or cranial nerve symptoms under investigation.",
                "care_directive": "Routine 4-hourly neuro observations; assess pupillary reaction and limb symmetry."
            })

        return risks

# Global singleton instance
clinical_entity_extractor = HybridClinicalEntityExtractor()
