"""
PULSE Clinical Preprocessor
Implements the core preprocessing philosophy:
"Clean the formatting, preserve the clinical meaning."

Preserves:
- Numbers, measurements, dosages, vital signs (e.g., 130/80, 5mg, 98%)
- Medical abbreviations (e.g., BP, GCS, BGL, IV, PRN, COPD, DM)
- Clinically meaningful symbols: @, +, _, /, %, <, >
- Grammatical punctuation, dates, times, and medication administration records
- Avoids destructive stopword elimination, stemming, or lemmatization
"""

import re
from typing import Dict, Any, List

class ClinicalPreprocessor:
    def __init__(self):
        # Specific unicode mapping for typography normalization
        self.unicode_replacements = {
            '\u2018': "'",  # Left single quotation mark
            '\u2019': "'",  # Right single quotation mark
            '\u201a': "'",  # Single low-9 quotation mark
            '\u201b': "'",  # Single high-reversed-9 quotation mark
            '\u201c': '"',  # Left double quotation mark
            '\u201d': '"',  # Right double quotation mark
            '\u201e': '"',  # Double low-9 quotation mark
            '\u2013': '-',  # En dash
            '\u2014': '-',  # Em dash
            '\u00a0': ' ',  # Non-breaking space
            '\ufeff': '',   # Zero-width no-break space (BOM)
        }

    def split_sentences(self, text: str) -> List[str]:
        """Splits clinical text into grammatical sentences preserving abbreviations."""
        if not text:
            return []
        safe = re.sub(r'\b(Dr|Mr|Mrs|Ms|vs|eg|ie|St)\.', r'\1<DOT>', text, flags=re.IGNORECASE)
        parts = re.split(r'[.!?]+\s+', safe)
        sentences = []
        for p in parts:
            clean_p = p.replace('<DOT>', '.').strip()
            if clean_p:
                if not clean_p.endswith(('.', '!', '?')):
                    clean_p = clean_p + '.'
                sentences.append(clean_p)
        return sentences

    def preprocess(self, raw_text: str) -> Dict[str, Any]:
        """
        Executes non-destructive clinical formatting normalization.
        Preserves critical clinical symbols, acronyms, dosages, and negations.
        """
        if not raw_text:
            return {
                "raw_text": "",
                "preprocessed_text": "",
                "changes_made": ["Received empty input string"],
                "sentences": [],
                "token_count": 0,
                "char_count": 0,
                "preserved_clinical_elements": []
            }

        changes = []
        text = raw_text

        # 1. Strip UTF-8 BOM if present
        if '\ufeff' in text:
            text = text.replace('\ufeff', '')
            changes.append("Stripped hidden UTF-8 Byte Order Mark (BOM)")

        # 2. Normalize unicode characters (curly quotes, dashes, non-breaking spaces)
        replaced_unicode = False
        for char, repl in self.unicode_replacements.items():
            if char in text:
                text = text.replace(char, repl)
                replaced_unicode = True
        if replaced_unicode:
            changes.append("Normalized Unicode curly quotes, smart apostrophes, and typographical dashes to ASCII")

        # 3. Resolve concatenated words and numbers around commas (e.g. 'Abbott,93' -> 'Abbott, 93', 'pains,asthma' -> 'pains, asthma')
        def comma_spacing(m):
            changes.append(f"Fixed comma spacing: '{m.group(0)}' -> '{m.group(1)}, {m.group(2)}'")
            return f"{m.group(1)}, {m.group(2)}"

        text = re.sub(r'([a-zA-Z]),([a-zA-Z0-9])', comma_spacing, text)
        text = re.sub(r'([0-9]),([a-zA-Z])', comma_spacing, text)

        # 4. Resolve squished sentence boundaries after periods (e.g. 'her.no plan' -> 'her. No plan', 'glaucoma.almost' -> 'glaucoma. Almost')
        def period_spacing(m):
            before, after = m.group(1), m.group(2)
            if before.lower() in ['dr', 'mr', 'ms', 'mrs', 'vs', 'eg', 'ie', 'st']:
                return m.group(0)
            capitalized = after.upper()
            changes.append(f"Fixed sentence boundary spacing & capitalization: '{before}.{after}' -> '{before}. {capitalized}'")
            return f"{before}. {capitalized}"

        text = re.sub(r'([a-zA-Z]{2,})\.([a-zA-Z])', period_spacing, text)

        # 5. Normalize doctor titles/honorifics (e.g. 'DR Smith' -> 'Dr. Smith')
        def doctor_norm(m):
            changes.append(f"Standardized doctor honorific: '{m.group(0)}' -> 'Dr. {m.group(1)}'")
            return f"Dr. {m.group(1)}"

        text = re.sub(r'\b(?:DR|dr)\s+([A-Z])', doctor_norm, text)

        # 6. Normalize multiple consecutive whitespace and newlines
        if re.search(r'[ \t\r\n]{2,}', text):
            changes.append("Collapsed redundant consecutive whitespace into single spaces")
            text = re.sub(r'[ \t\r\n]+', ' ', text)

        # 7. Strip leading and trailing whitespace
        stripped = text.strip()
        if stripped != text:
            changes.append("Trimmed leading/trailing whitespace")
            text = stripped

        # 8. Record non-destructive clinical preservation guarantees
        preserved = []
        if re.search(r'[@\+_]', text):
            preserved.append("Preserved clinically meaningful symbols (@, +, _)")
        if re.search(r'\b\d+(\.\d+)?\s*(mg|mcg|g|ml|mmol|%|bpm|mmHg)?\b', text, re.IGNORECASE):
            preserved.append("Preserved numerical dosages, vitals (e.g. BP, BGL) and clinical measurement units")
        if re.search(r'\b[A-Z]{2,}\b', text):
            preserved.append("Preserved clinical acronyms (GCS, BP, IV, COPD) without destructive lowercasing")
        if re.search(r'\b(no|not|denies|without|none|never)\b', text, re.IGNORECASE):
            preserved.append("Preserved negative assertion terms ('no', 'without') to prevent dangerous false-positive inferences")

        if not changes:
            changes.append("Input text formatting conforms to clinical preprocessing standards")

        sentences = self.split_sentences(text)
        tokens = re.findall(r'\b\w+\b', text)

        return {
            "raw_text": raw_text,
            "preprocessed_text": text,
            "changes_made": changes,
            "preserved_clinical_elements": preserved,
            "sentences": sentences,
            "token_count": len(tokens),
            "char_count": len(text),
            "philosophy_note": "Non-destructive clinical normalization: unlike traditional text mining, clinical NLP must never destroy clinical acronyms, vital numbers/dosages, or negations."
        }

# Global singleton instance
clinical_preprocessor = ClinicalPreprocessor()
