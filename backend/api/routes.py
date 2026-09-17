"""
PULSE REST API Endpoints
Provides endpoints for:
- Health & System status
- Corpus statistics (dynamic EDA)
- Report discovery & retrieval (0 to 100)
- Preprocessing comparison
- Clinical extraction & event structuring
- Full end-to-end analysis pipeline
- SQLite execution history
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional

from backend.dataset.loader import dataset_loader
from backend.preprocessing.preprocessor import clinical_preprocessor
from backend.extraction.entity_extractor import clinical_entity_extractor
from backend.extraction.event_extractor import clinical_event_extractor
from backend.extraction.temporal_extractor import clinical_temporal_extractor
from backend.extraction.structured_generator import structured_handover_generator
from backend.database.database import db

router = APIRouter(prefix="/api")

# Pydantic Schemas
class PreprocessRequest(BaseModel):
    raw_text: str = Field(..., description="Raw unstructured nursing handover text")

class AnalyzeRequest(BaseModel):
    report_id: Optional[str] = Field(None, description="Optional ID of dataset report (0-100)")
    raw_text: Optional[str] = Field(None, description="Raw handover text if custom or overriding")

class ExtractRequest(BaseModel):
    text: str = Field(..., description="Handover text to extract from")


@router.get("/health")
async def health_check():
    """
    Returns system health status and component availability.
    """
    stats = dataset_loader.calculate_statistics()
    return {
        "status": "healthy",
        "system": "PULSE (Patient Update & Log Structuring Engine)",
        "version": "1.0.0-prototype",
        "dataset_loaded": stats["loaded_successfully"] > 0,
        "total_reports": stats["total_reports"],
        "model_status": {
            "current_engine": "Hybrid Clinical Information Extraction Pipeline",
            "candidate_backbone": "Bio_ClinicalBERT",
            "candidate_status": "Planned for experimental fine-tuning evaluation"
        },
        "disclaimer": "PULSE is an AI-assisted clinical information-organization prototype. It does not diagnose, prescribe treatment, or replace professional clinical judgment."
    }


@router.get("/stats")
async def get_stats():
    """
    Calculates and returns live EDA statistics directly from the 101 text files.
    """
    try:
        stats = dataset_loader.calculate_statistics()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate dataset statistics: {str(e)}")


@router.get("/reports")
async def get_reports():
    """
    Returns index of all discovered nursing handover reports.
    """
    try:
        reports = dataset_loader.get_all_reports()
        # Return summary listing
        summary = []
        for r in reports:
            summary.append({
                "report_id": r["report_id"],
                "filename": r["filename"],
                "word_count": r["word_count"],
                "char_count": r["char_count"],
                "preview": r["raw_text"][:140] + "..." if len(r["raw_text"]) > 140 else r["raw_text"],
                "status": r["status"]
            })
        return {
            "total_count": len(summary),
            "reports": summary
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve reports: {str(e)}")


@router.get("/reports/{report_id}")
async def get_report(report_id: str):
    """
    Returns verbatim raw text and preprocessed text for a specific report.
    """
    report = dataset_loader.get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail=f"Report ID '{report_id}' not found in dataset.")

    preprocessed_res = clinical_preprocessor.preprocess(report["raw_text"])

    return {
        "report_id": report["report_id"],
        "filename": report["filename"],
        "word_count": report["word_count"],
        "char_count": report["char_count"],
        "raw_text": report["raw_text"],
        "preprocessed_text": preprocessed_res["preprocessed_text"],
        "changes_made": preprocessed_res["changes_made"],
        "preserved_clinical_elements": preprocessed_res.get("preserved_clinical_elements", []),
        "sentences": preprocessed_res.get("sentences", []),
        "token_count": preprocessed_res.get("token_count", 0),
        "philosophy_note": preprocessed_res.get("philosophy_note", "")
    }


@router.post("/preprocess")
async def preprocess_text(payload: PreprocessRequest):
    """
    Performs standalone clinical formatting normalization.
    """
    if not payload.raw_text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    result = clinical_preprocessor.preprocess(payload.raw_text)
    return result


@router.post("/extract")
async def extract_clinical_info(payload: ExtractRequest):
    """
    Executes clinical entity extraction on the provided text.
    """
    if not payload.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    entities = clinical_entity_extractor.extract(payload.text)
    return entities


@router.post("/analyze")
async def analyze_handover(payload: AnalyzeRequest):
    """
    The PRIMARY End-to-End Pipeline Execution Endpoint:
    STEP 1: Receive raw handover text (or fetch by report_id)
    STEP 2: Preprocess the text (clean formatting, preserve clinical meaning)
    STEP 3: Perform clinical information & entity extraction
    STEP 4: Perform event extraction
    STEP 5: Perform temporal extraction
    STEP 6: Extract pending tasks & follow-up actions
    STEP 7: Synthesize 9-category structured clinical handover
    STEP 8: Store in SQLite history and return comprehensive JSON
    """
    raw_text = payload.raw_text or ""
    report_id = payload.report_id

    # If report_id is given and raw_text is omitted or blank, load from dataset
    if report_id and not raw_text.strip():
        report_data = dataset_loader.get_report_by_id(report_id)
        if not report_data:
            raise HTTPException(status_code=404, detail=f"Report ID '{report_id}' not found in dataset.")
        raw_text = report_data["raw_text"]

    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="No clinical handover text provided for analysis.")

    # STEP 2: Preprocessing
    prep_res = clinical_preprocessor.preprocess(raw_text)
    preprocessed_text = prep_res["preprocessed_text"]
    changes_made = prep_res["changes_made"]

    # STEP 3: Entity Extraction
    entities = clinical_entity_extractor.extract(preprocessed_text)

    # STEP 4: Event Extraction
    events = clinical_event_extractor.extract(preprocessed_text, entities=entities)

    # STEP 5: Temporal Extraction
    temporal_info = clinical_temporal_extractor.extract(preprocessed_text, events=events)

    # STEP 6: Pending Tasks & Follow-Up
    pending_tasks = structured_handover_generator.extract_pending_tasks(preprocessed_text, events=events)
    follow_up = structured_handover_generator.extract_follow_up(preprocessed_text, pending_tasks=pending_tasks)

    # STEP 7: Final 9-Category Structured Handover Output
    structured_handover = structured_handover_generator.generate_structured_handover(
        text=preprocessed_text,
        entities=entities,
        events=events,
        temporal_info=temporal_info,
        pending_tasks=pending_tasks,
        follow_up=follow_up
    )

    # Compile Evidence Map (linking extracted items to source sentences)
    evidence_items = []
    # Patient Info evidence
    for p in entities.get("patient_information", []):
        evidence_items.append({
            "category": "Patient Info",
            "entity": f"{p.get('field')}: {p.get('value')}",
            "source_sentence": p.get("source_sentence", "")
        })
    # Conditions evidence
    for c in entities.get("conditions", []):
        evidence_items.append({
            "category": "Condition",
            "entity": c.get("text"),
            "source_sentence": c.get("source_sentence", "")
        })
    # Symptoms evidence
    for s in entities.get("symptoms", []):
        evidence_items.append({
            "category": "Symptom",
            "entity": s.get("text"),
            "source_sentence": s.get("source_sentence", "")
        })
    # Medications evidence
    for m in entities.get("medications", []):
        evidence_items.append({
            "category": "Medication",
            "entity": m.get("text"),
            "source_sentence": m.get("source_sentence", "")
        })
    # Investigations evidence
    for inv in entities.get("investigations", []):
        evidence_items.append({
            "category": "Investigation",
            "entity": inv.get("text"),
            "source_sentence": inv.get("source_sentence", "")
        })
    # Treatments evidence
    for trt in entities.get("treatments", []):
        evidence_items.append({
            "category": "Treatment",
            "entity": trt.get("text"),
            "source_sentence": trt.get("source_sentence", "")
        })
    # Measurements evidence
    for ms in entities.get("measurements", []):
        evidence_items.append({
            "category": "Measurement",
            "entity": ms.get("text"),
            "source_sentence": ms.get("source_sentence", "")
        })
    # Events evidence
    for ev in events:
        evidence_items.append({
            "category": "Clinical Event",
            "entity": ev.get("event"),
            "source_sentence": ev.get("source_sentence", "")
        })
    # Pending tasks evidence
    for pt in pending_tasks:
        evidence_items.append({
            "category": "Pending Task",
            "entity": pt.get("task"),
            "source_sentence": pt.get("source_sentence", "")
        })

    # Prepare complete response payload
    response_data = {
        "report_id": report_id or "Custom",
        "raw_text": raw_text,
        "preprocessed_text": preprocessed_text,
        "changes_made": changes_made,
        "word_count": len(preprocessed_text.split()),
        "char_count": len(preprocessed_text),
        "entities": entities,
        "events": events,
        "temporal_information": temporal_info,
        "pending_tasks": pending_tasks,
        "follow_up": follow_up,
        "structured_handover": structured_handover,
        "executive_summary": structured_handover.get("executive_summary", ""),
        "isbar": structured_handover.get("isbar", {}),
        "clinical_risks": entities.get("clinical_risks", []),
        "evidence": evidence_items,
        "model_metadata": {
            "pipeline": "PULSE Hybrid Clinical Extraction Pipeline",
            "nlp_paradigm": "Dictionary, Pattern, and Contextual Rule Engine",
            "planned_future_model": "Bio_ClinicalBERT (Candidate backbone)",
            "evaluation_reference": "Synthetic Nursing Handover Reference Corpus (101 Documents)"
        }
    }

    # STEP 8: Store in SQLite history
    try:
        db.save_analysis(
            report_id=report_id,
            raw_text=raw_text,
            preprocessed_text=preprocessed_text,
            structured_data=response_data
        )
    except Exception as db_err:
        print(f"Warning: could not persist to SQLite history: {db_err}")

    return response_data


@router.get("/history")
async def get_history(limit: int = 20):
    """
    Returns recent analysis runs from SQLite.
    """
    try:
        records = db.get_recent_analyses(limit=limit)
        return {"history": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve history: {str(e)}")
