import glob
import os
import json
import re

def export():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(base_dir, 'data', '101writtenfreetextreports')
    files = glob.glob(os.path.join(data_dir, '*.txt'))

    def sort_key(filepath):
        num_match = re.match(r'(\d+)', os.path.basename(filepath))
        return int(num_match.group(1)) if num_match else filepath

    sorted_files = sorted(files, key=sort_key)
    reports = []
    all_tokens = []
    word_counts = []

    for f in sorted_files:
        fname = os.path.basename(f)
        rid = os.path.splitext(fname)[0]
        with open(f, 'r', encoding='utf-8-sig', errors='replace') as fp:
            raw = fp.read()
        words = raw.split()
        wc = len(words)
        cc = len(raw)
        word_counts.append(wc)
        for t in words:
            clean_t = t.lower().strip('.,;:!?"\'()[]{}')
            if clean_t:
                all_tokens.append(clean_t)

        reports.append({
            'report_id': str(rid),
            'filename': fname,
            'raw_text': raw,
            'word_count': wc,
            'char_count': cc,
            'status': 'Loaded'
        })

    stats = {
        'total_reports': len(reports),
        'average_word_count': round(sum(word_counts) / len(word_counts), 2) if word_counts else 0.0,
        'min_word_count': min(word_counts) if word_counts else 0,
        'max_word_count': max(word_counts) if word_counts else 0,
        'total_tokens': len(all_tokens),
        'unique_vocabulary_tokens': len(set(all_tokens)),
        'loaded_successfully': len(reports),
        'dataset_name': 'Synthetic Nursing Handover Training and Development Data Set',
        'folder_name': '101writtenfreetextreports',
        'format': 'TXT',
        'corpus_description': '101 written free-text nursing handover reports capturing clinical patient handover interactions across acute and subacute wards.'
    }

    out_dir = os.path.join(base_dir, 'frontend', 'src', 'data')
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, 'dataset.json')

    with open(out_file, 'w', encoding='utf-8') as out:
        json.dump({'stats': stats, 'reports': reports}, out, indent=2)

    print(f"Exported {len(reports)} reports and stats to {out_file}")

if __name__ == '__main__':
    export()
