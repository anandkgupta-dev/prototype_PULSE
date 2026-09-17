"""
PULSE Dataset Loader
Discovers and loads the 101 written free-text nursing handover reports.
Calculates dynamic corpus statistics from the actual dataset files.
Preserves raw text in its original verbatim form.
"""

import os
import glob
import re
from typing import List, Dict, Any, Optional

DATASET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "101writtenfreetextreports"))

class DatasetLoader:
    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or DATASET_DIR
        self._reports_cache: Dict[str, Dict[str, Any]] = {}
        self._stats_cache: Optional[Dict[str, Any]] = None

    def discover_reports(self) -> List[Dict[str, Any]]:
        """
        Dynamically scans data_dir for all .txt reports.
        Sorts numerically by report ID.
        """
        if not os.path.exists(self.data_dir):
            return []

        file_paths = glob.glob(os.path.join(self.data_dir, "*.txt"))
        reports = []

        def sort_key(filepath: str):
            filename = os.path.basename(filepath)
            num_match = re.match(r"(\d+)", filename)
            return int(num_match.group(1)) if num_match else filename

        sorted_paths = sorted(file_paths, key=sort_key)

        self._reports_cache.clear()

        for filepath in sorted_paths:
            filename = os.path.basename(filepath)
            report_id = os.path.splitext(filename)[0]

            try:
                with open(filepath, "r", encoding="utf-8-sig", errors="replace") as f:
                    raw_text = f.read()
            except Exception as e:
                raw_text = ""

            words = raw_text.split()
            word_count = len(words)
            char_count = len(raw_text)

            report_item = {
                "report_id": report_id,
                "filename": filename,
                "filepath": filepath,
                "raw_text": raw_text,
                "word_count": word_count,
                "char_count": char_count,
                "status": "Loaded"
            }

            self._reports_cache[report_id] = report_item
            reports.append(report_item)

        return reports

    def get_all_reports(self) -> List[Dict[str, Any]]:
        if not self._reports_cache:
            self.discover_reports()
        return list(self._reports_cache.values())

    def get_report_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        if not self._reports_cache:
            self.discover_reports()
        return self._reports_cache.get(str(report_id))

    def calculate_statistics(self) -> Dict[str, Any]:
        """
        Calculates live corpus EDA statistics dynamically from loaded files.
        """
        reports = self.get_all_reports()
        if not reports:
            return {
                "total_reports": 0,
                "average_word_count": 0.0,
                "min_word_count": 0,
                "max_word_count": 0,
                "total_tokens": 0,
                "unique_vocabulary_tokens": 0,
                "loaded_successfully": 0,
                "dataset_name": "Synthetic Nursing Handover Training and Development Data Set",
                "folder_name": "101writtenfreetextreports",
                "format": "TXT"
            }

        word_counts = [r["word_count"] for r in reports]
        all_tokens = []
        for r in reports:
            tokens = [t.lower().strip(".,;:!?\"'()[]{}") for t in r["raw_text"].split()]
            all_tokens.extend([t for t in tokens if t])

        unique_tokens = set(all_tokens)

        stats = {
            "total_reports": len(reports),
            "average_word_count": round(sum(word_counts) / len(word_counts), 2) if word_counts else 0.0,
            "min_word_count": min(word_counts) if word_counts else 0,
            "max_word_count": max(word_counts) if word_counts else 0,
            "total_tokens": len(all_tokens),
            "unique_vocabulary_tokens": len(unique_tokens),
            "loaded_successfully": len(reports),
            "dataset_name": "Synthetic Nursing Handover Training and Development Data Set",
            "folder_name": "101writtenfreetextreports",
            "format": "TXT",
            "corpus_description": "101 written free-text nursing handover reports capturing clinical patient handover interactions across acute and subacute wards."
        }
        self._stats_cache = stats
        return stats

# Global singleton instance
dataset_loader = DatasetLoader()
