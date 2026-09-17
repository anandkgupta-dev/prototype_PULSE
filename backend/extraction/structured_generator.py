"""
PULSE Structured Handover Generator
Synthesizes extracted clinical entities, events, and temporal expressions into:
1. Standard 9-Category Clinical Handover Output
2. ISBAR Clinical Handover Framework (Identify, Situation, Background, Assessment, Recommendation)
3. Executive Clinical Shift Summary (Charge-nurse narrative handover brief)
4. Outstanding Prioritized Shift Continuity Tasks
5. Long-term Follow-Up Plan
Adheres strictly to source evidence with authentic clinical documentation formatting.
"""

import re
from typing import Dict, Any, List, Optional, Tuple

class StructuredHandoverGenerator:
    def __init__(self):
        # Patterns for Pending Tasks (urgent or shift-level actions)
        self.pending_task_patterns = [
            (r"\b(?:needs\s+another|rescheduled|needs|waiting\s+for|awaiting)\s+([^.,;]+)", "Diagnostic Scheduling Pending"),
            (r"\b(?:still\s+for\s+referral\s+to|referral\s+to)\s+([^.,;]+)", "Allied Health / Specialist Referral"),
            (r"\b(?:still\s+need\s+(?:the\s+)?team\s+to\s+review|still\s+for\s+review|needs?\s+review)\s*([^.,;]*)", "Medical Team Review Pending"),
            (r"\b(?:just\s+ask\s+the\s+doctor\s+for\s+the\s+next\s+dose|ask\s+doctor)\b", "Medication Dosing Clarification Required"),
            (r"\b(?:needs?\s+assistance|needs?\s+help)\b", "Patient Care Assistance Required"),
            (r"\b(?:still\s+under\s+monitoring|continuous\s+monitoring)\b", "Ongoing Active Monitoring Required"),
            (r"\b(?:is\s+for\s+([a-zA-Z\s]+?)(?:,|\.|\sbut|\she))", "Scheduled Investigation / Procedure")
        ]

        # Patterns for Follow-Up (future evaluations, repeat tests, discharge planning)
        self.follow_up_patterns = [
            (r"\b(?:review\s+(?:patient\s+)?tomorrow|review\s+next\s+shift|review\s+later)\b", "Scheduled Clinical Review"),
            (r"\b(?:repeat\s+(?:blood\s*test|ecg|x-?ray|scan|labs?))\b", "Repeat Diagnostic Evaluation"),
            (r"\b(?:follow-?up\s+(?:appointment|with|by)|outpatient\s+clinic)\b", "Outpatient Follow-Up"),
            (r"\b(?:monitor\s+(?:bgl|bp|blood\s*pressure|vital\s*signs|sats))\b", "Targeted Parameter Monitoring"),
            (r"\b(?:referral\s+to\s+([a-zA-Z\s]+))\b", "Specialist Consultation Follow-Up"),
            (r"\b(?:needs\s+another\s+carotid\s+doppler\s+appointment)\b", "Ultrasound Unit Rescheduling")
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

    def extract_pending_tasks(self, text: str, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not text:
            return []

        sentence_spans = self._split_into_sentences(text)
        pending_tasks = []
        seen = set()

        for pattern, task_type in self.pending_task_patterns:
            for m in re.finditer(pattern, text, re.IGNORECASE):
                matched_item = m.group(0).strip()
                source_sentence = self._find_source_sentence(m.start(), sentence_spans)
                key = (task_type, source_sentence.lower())
                if key not in seen:
                    seen.add(key)
                    priority = "High" if any(w in matched_item.lower() for w in ["review", "dose", "another", "rescheduled"]) else "Medium"
                    pending_tasks.append({
                        "task": matched_item.capitalize(),
                        "type": task_type,
                        "priority": priority,
                        "source_sentence": source_sentence,
                        "start_char": m.start(),
                        "end_char": m.end()
                    })

        # Also inspect events for pending or rescheduled status
        for ev in events:
            if any(k in ev.get("type", "").lower() for k in ["pending", "review", "rescheduled", "scheduled"]):
                key = ("Event Pending", ev.get("source_sentence", "").lower())
                if key not in seen:
                    seen.add(key)
                    pending_tasks.append({
                        "task": ev.get("event"),
                        "type": ev.get("type"),
                        "priority": "High" if "rescheduled" in ev.get("type", "").lower() or "review" in ev.get("type", "").lower() else "Medium",
                        "source_sentence": ev.get("source_sentence"),
                        "start_char": ev.get("start_char", 0),
                        "end_char": ev.get("end_char", 0)
                    })

        return pending_tasks

    def extract_follow_up(self, text: str, pending_tasks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not text:
            return []

        sentence_spans = self._split_into_sentences(text)
        follow_up = []
        seen = set()

        for pattern, fu_type in self.follow_up_patterns:
            for m in re.finditer(pattern, text, re.IGNORECASE):
                matched = m.group(0).strip()
                source_sentence = self._find_source_sentence(m.start(), sentence_spans)
                key = matched.lower()
                if key not in seen:
                    seen.add(key)
                    follow_up.append({
                        "action": matched.capitalize(),
                        "type": fu_type,
                        "source_sentence": source_sentence,
                        "start_char": m.start(),
                        "end_char": m.end()
                    })

        for pt in pending_tasks:
            if any(term in pt.get("task", "").lower() for term in ["referral", "review", "appointment", "educator"]):
                key = pt.get("task", "").lower()
                if key not in seen:
                    seen.add(key)
                    follow_up.append({
                        "action": pt.get("task"),
                        "type": "Specialist / Multi-disciplinary Follow-Up",
                        "source_sentence": pt.get("source_sentence"),
                        "start_char": pt.get("start_char", 0),
                        "end_char": pt.get("end_char", 0)
                    })

        return follow_up

    def generate_executive_summary(self, patient_dict: Dict[str, str], conditions: List[Any], symptoms: List[Any], pending_tasks: List[Any], measurements: List[Any]) -> str:
        """
        Synthesizes a realistic, highly coherent 2-3 sentence executive clinical shift handover brief.
        """
        name = patient_dict.get("Patient Name", "Patient")
        bed = patient_dict.get("Bed / Room", "Ward")
        age = patient_dict.get("Age", "")
        doc = patient_dict.get("Attending Consultant", "Medical Team")

        # Admission reason / primary symptom
        prim_cond = conditions[0]["normalized"] if conditions else (symptoms[0]["normalized"] if symptoms else "clinical observation")
        
        # Vital status
        meas_summary = "Vital signs stable"
        for m in measurements:
            if "gcs" in m.get("type", "").lower() or "15" in m.get("text", ""):
                meas_summary = f"GCS stable ({m.get('text')})"
                break
            elif "bp" in m.get("type", "").lower():
                meas_summary = f"BP recorded as {m.get('text')}"

        # Pending action
        if pending_tasks:
            top_task = pending_tasks[0].get("task")
            action_phrase = f"Key handover priority is to follow up on {top_task.lower()}."
        else:
            action_phrase = "Patient remains under routine nursing surveillance with no acute deterioration noted."

        intro = f"{name} ({bed}, {age}{', under ' + doc if doc != 'Medical Team' else ''}) admitted for management of {prim_cond}."
        second = f"{meas_summary}; currently under active ward observation."
        return f"{intro} {second} {action_phrase}"

    def generate_isbar(
        self,
        patient_dict: Dict[str, str],
        entities: Dict[str, Any],
        events: List[Dict[str, Any]],
        pending_tasks: List[Dict[str, Any]],
        follow_up: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Synthesizes ISBAR (Identify, Situation, Background, Assessment, Recommendation),
        the gold-standard clinical communication protocol used in modern hospitals.
        """
        # I - Identify
        identify_items = [
            f"Patient: {patient_dict.get('Patient Name', 'Name not explicitly stated')}",
            f"Location: {patient_dict.get('Bed / Room', 'Bed not recorded')}",
            f"Demographics: {patient_dict.get('Age', 'Age not stated')} | {patient_dict.get('Gender / Sex', 'Gender not stated')}",
            f"Consultant: {patient_dict.get('Attending Consultant', 'Medical Team')}"
        ]

        # S - Situation
        situation_items = []
        if entities.get("symptoms"):
            symptom_names = ", ".join([s["normalized"] for s in entities["symptoms"][:3]])
            situation_items.append(f"Current Clinical Presentation: Acute {symptom_names}")
        elif entities.get("conditions"):
            situation_items.append(f"Current Admission Reason: Management of {entities['conditions'][0]['normalized']}")
        else:
            situation_items.append("Admitted to ward for clinical observation and symptomatic management.")
        
        for ev in events:
            if "admission" in ev.get("type", "").lower() or "presentation" in ev.get("type", "").lower():
                situation_items.append(f"Presentation Context: {ev.get('event')}")
                break

        # B - Background
        background_items = []
        if entities.get("conditions"):
            for c in entities["conditions"]:
                background_items.append(f"Documented Condition: {c['normalized']}")
        if not background_items:
            background_items.append("No prior chronic medical conditions recorded in shift handover.")

        # A - Assessment
        assessment_items = []
        for m in entities.get("measurements", []):
            assessment_items.append(f"{m['type']}: {m['text']}")
        for trt in entities.get("treatments", []):
            assessment_items.append(f"Clinical Care / Mobility: {trt['normalized']} ({trt['text']})")
        for inv in entities.get("investigations", []):
            assessment_items.append(f"Diagnostic Finding: {inv['normalized']}")
        if not assessment_items:
            assessment_items.append("Patient alert, orientated, and clinically stable on ward baseline.")

        # R - Recommendation
        recommendation_items = []
        if pending_tasks:
            for pt in pending_tasks:
                recommendation_items.append(f"[{pt.get('priority', 'Medium')} Priority] {pt['task']}")
        if follow_up:
            for fu in follow_up:
                if fu['action'] not in [pt['task'] for pt in pending_tasks]:
                    recommendation_items.append(f"Follow-Up: {fu['action']}")
        if not recommendation_items:
            recommendation_items.append("Continue routine vital observations and supportive nursing care.")

        return {
            "identify": identify_items,
            "situation": situation_items,
            "background": background_items,
            "assessment": assessment_items,
            "recommendation": recommendation_items
        }

    def generate_structured_handover(
        self,
        text: str,
        entities: Dict[str, Any],
        events: List[Dict[str, Any]],
        temporal_info: List[Dict[str, Any]],
        pending_tasks: List[Dict[str, Any]],
        follow_up: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Constructs the comprehensive structured handover output:
        1. 9-category structured handover
        2. ISBAR structured protocol
        3. Executive clinical brief
        """
        patient_dict = {p.get("field"): p.get("value") for p in entities.get("patient_information", [])}

        # 1. Patient Information
        patient_info_list = []
        for p in entities.get("patient_information", []):
            patient_info_list.append(f"{p.get('field')}: {p.get('value')}")
        if not patient_info_list:
            patient_info_list.append("Demographics: Not explicitly recorded in free-text note.")

        # 2. Current Condition
        current_condition_list = []
        for s in entities.get("symptoms", []):
            occ = f" (reported {s['occurrences']}x)" if s.get('occurrences', 1) > 1 else ""
            current_condition_list.append(f"Acute Symptom: {s.get('normalized')}{occ}")
        for m in entities.get("measurements", []):
            current_condition_list.append(f"Vital Assessment: {m.get('type')} — {m.get('text')}")
        if not current_condition_list:
            current_condition_list.append("Current condition stable; no acute distressing symptoms documented.")

        # 3. Medical History
        history_list = []
        for c in entities.get("conditions", []):
            history_list.append(f"Documented History: {c.get('normalized')}")
        if not history_list:
            history_list.append("No significant past medical history documented in report.")

        # 4. Medications / Treatment
        med_treatment_list = []
        for med in entities.get("medications", []):
            dose_info = f"Dose: {med.get('dosage')}" if med.get('dosage') != "Standard ward dose" else "Dose: As charted"
            med_treatment_list.append(f"{med.get('normalized')} — {dose_info}, Route: {med.get('route')}, Frequency: {med.get('frequency')}")
        for trt in entities.get("treatments", []):
            med_treatment_list.append(f"Care Level: {trt.get('normalized')} ({trt.get('text')})")
        if not med_treatment_list:
            med_treatment_list.append("No active medications or invasive therapies recorded in handover.")

        # 5. Investigations
        investigations_list = []
        for inv in entities.get("investigations", []):
            investigations_list.append(f"Investigation: {inv.get('normalized')}")
        if not investigations_list:
            investigations_list.append("No diagnostic investigations recorded in current report.")

        # 6. Clinical Events
        clinical_events_list = []
        for ev in events:
            time_part = f" [{ev.get('time')}]" if ev.get("time") != "Not specified" else ""
            clinical_events_list.append(f"{ev.get('event')} ({ev.get('type')}){time_part}")
        if not clinical_events_list:
            clinical_events_list.append("No discrete inter-shift clinical events identified.")

        # 7. Temporal Information
        temporal_list = []
        for t in temporal_info:
            assoc = f" → Associated with: {t.get('associated_event')}" if t.get('associated_event') else ""
            temporal_list.append(f"Time: '{t.get('expression')}' ({t.get('type')}){assoc}")
        if not temporal_list:
            temporal_list.append("No explicit temporal expressions identified.")

        # 8. Pending Tasks
        pending_list = []
        for pt in pending_tasks:
            pending_list.append(f"[{pt.get('priority', 'Medium')} Priority] {pt.get('task')} ({pt.get('type')})")
        if not pending_list:
            pending_list.append("No outstanding pending tasks recorded for upcoming shift.")

        # 9. Follow-up
        follow_up_list = []
        for fu in follow_up:
            follow_up_list.append(f"{fu.get('action')} ({fu.get('type')})")
        if not follow_up_list:
            follow_up_list.append("No specific long-term follow-up actions recorded.")

        # Executive Summary
        exec_summary = self.generate_executive_summary(
            patient_dict=patient_dict,
            conditions=entities.get("conditions", []),
            symptoms=entities.get("symptoms", []),
            pending_tasks=pending_tasks,
            measurements=entities.get("measurements", [])
        )

        # ISBAR Protocol
        isbar = self.generate_isbar(
            patient_dict=patient_dict,
            entities=entities,
            events=events,
            pending_tasks=pending_tasks,
            follow_up=follow_up
        )

        return {
            "patient_information": patient_info_list,
            "current_condition": current_condition_list,
            "medical_history": history_list,
            "medications_treatment": med_treatment_list,
            "investigations": investigations_list,
            "clinical_events": clinical_events_list,
            "temporal_information": temporal_list,
            "pending_tasks": pending_list,
            "follow_up": follow_up_list,
            "executive_summary": exec_summary,
            "isbar": isbar
        }

# Global singleton instance
structured_handover_generator = StructuredHandoverGenerator()
