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

    def preprocess(self, raw_text: str) -> Dict[str, Any]:
        """
        Executes non-destructive clinical formatting normalization.
        Returns:
            {
                "raw_text": raw_text,
                "preprocessed_text": cleaned_text,
                "changes_made": list_of_descriptions
            }
        """
        if not raw_text:
            return {
                "raw_text": "",
                "preprocessed_text": "",
                "changes_made": ["Received empty input string"]
            }

        changes = []
        text = raw_text

        # 1. Normalize unicode characters (curly quotes, dashes, non-breaking spaces)
        replaced_unicode = False
        for char, repl in self.unicode_replacements.items():
            if char in text:
                text = text.replace(char, repl)
                replaced_unicode = True
        if replaced_unicode:
            changes.append("Normalized Unicode curly quotes, smart apostrophes, and typographical dashes to standard ASCII")

        # 2. Normalize whitespace between punctuation if squished without space
        # e.g., 'pains,asthma' -> 'pains, asthma', 'Liu.He' -> 'Liu. He'
        # BUT carefully avoid altering decimals (e.g. 5.5), dates (12/04/2022), blood pressure (120/80), or ratios
        spaced_punctuation = re.sub(r'([a-zA-Z])([,;])([a-zA-Z])', r'\1\2 \3', text)
        spaced_punctuation = re.sub(r'([a-zA-Z])(\.)([A-Z])', r'\1. \3', spaced_punctuation)
        if spaced_punctuation != text:
            changes.append("Resolved concatenated words around punctuation (e.g. comma/period spacing)")
            text = spaced_punctuation

        # 3. Normalize multiple whitespace sequences and newlines into a single space
        normalized_space = re.sub(r'[ \t\r\n]+', ' ', text)
        if normalized_space != text:
            changes.append("Normalized multiple consecutive whitespace characters and newlines into single spaces")
            text = normalized_space

        # 4. Strip leading and trailing whitespace
        stripped = text.strip()
        if stripped != text:
            changes.append("Removed leading and trailing whitespace")
            text = stripped

        # 5. Verify preserved clinical notations
        preserved_notes = []
        if re.search(r'[@\+_]', text):
            preserved_notes.append("Preserved clinically meaningful symbols (@, +, _)")
        if re.search(r'\b\d+(\.\d+)?\s*(mg|mcg|g|ml|mmol|%|bpm|mmHg)?\b', text, re.IGNORECASE):
            preserved_notes.append("Preserved numerical dosages and clinical measurement units")
        if re.search(r'\b[A-Z]{2,}\b', text):
            preserved_notes.append("Preserved clinical acronyms and abbreviations without destructive lowercase conversion")

        if not changes:
            changes.append("Input text formatting already conforms to clinical preprocessing standards")

        changes.extend(preserved_notes)

        return {
            "raw_text": raw_text,
            "preprocessed_text": text,
            "changes_made": changes
        }

# Global singleton instance
clinical_preprocessor = ClinicalPreprocessor()
