"""
PULSE Database Module (SQLite)
Maintains local prototype storage for:
- Analysis execution history
- Report caching and indexing
The original dataset in data/ remains strictly read-only.
"""

import sqlite3
import os
import json
from datetime import datetime
from typing import Dict, Any, List, Optional

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "pulse_prototype.db"))

class Database:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Analysis history table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS analysis_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    report_id TEXT,
                    timestamp TEXT NOT NULL,
                    raw_text TEXT NOT NULL,
                    preprocessed_text TEXT NOT NULL,
                    structured_output TEXT NOT NULL,
                    word_count INTEGER,
                    status TEXT DEFAULT 'Completed'
                )
            """)

            # Reports cache table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS reports_cache (
                    report_id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    word_count INTEGER NOT NULL,
                    char_count INTEGER NOT NULL,
                    last_synced TEXT NOT NULL
                )
            """)
            conn.commit()

    def save_analysis(self, report_id: Optional[str], raw_text: str, preprocessed_text: str, structured_data: Dict[str, Any]) -> int:
        timestamp = datetime.now().isoformat()
        word_count = len(raw_text.split())
        structured_json = json.dumps(structured_data)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO analysis_history (report_id, timestamp, raw_text, preprocessed_text, structured_output, word_count, status)
                VALUES (?, ?, ?, ?, ?, ?, 'Completed')
            """, (report_id or "Custom", timestamp, raw_text, preprocessed_text, structured_json, word_count))
            conn.commit()
            return cursor.lastrowid

    def get_recent_analyses(self, limit: int = 20) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT id, report_id, timestamp, word_count, status, 
                       substr(raw_text, 1, 120) as snippet,
                       structured_output
                FROM analysis_history
                ORDER BY id DESC
                LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                try:
                    item["structured_output"] = json.loads(item["structured_output"])
                except Exception:
                    pass
                results.append(item)
            return results

    def sync_reports_cache(self, reports: List[Dict[str, Any]]):
        now = datetime.now().isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for r in reports:
                cursor.execute("""
                    INSERT OR REPLACE INTO reports_cache (report_id, filename, word_count, char_count, last_synced)
                    VALUES (?, ?, ?, ?, ?)
                """, (str(r["report_id"]), r["filename"], r["word_count"], r["char_count"], now))
            conn.commit()

# Global database instance
db = Database()
