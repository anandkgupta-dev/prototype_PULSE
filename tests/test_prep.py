import re
import os

def test_preprocess(raw_text):
    text = raw_text
    changes = []

    # Strip BOM
    if '\ufeff' in text:
        text = text.replace('\ufeff', '')
        changes.append("Removed UTF-8 Byte Order Mark (BOM)")

    # Normalize typographical single and double quotes, dashes
    unicode_map = {
        '\u2018': "'", '\u2019': "'", '\u201c': '"', '\u201d': '"',
        '\u2013': '-', '\u2014': '-', '\u00a0': ' '
    }
    for char, repl in unicode_map.items():
        if char in text:
            text = text.replace(char, repl)
            changes.append(f"Normalized typographical character ({repr(char)} -> {repr(repl)})")

    # Comma spacing: letter,letter or letter,digit or digit,letter
    def comma_repl(m):
        changes.append(f"Fixed comma spacing: '{m.group(0)}' -> '{m.group(1)}, {m.group(2)}'")
        return f"{m.group(1)}, {m.group(2)}"

    text = re.sub(r'([a-zA-Z]),([a-zA-Z0-9])', comma_repl, text)
    text = re.sub(r'([0-9]),([a-zA-Z])', comma_repl, text)

    # Period spacing & sentence boundary capitalization (e.g. her.no -> her. No)
    def period_repl(m):
        before = m.group(1)
        after = m.group(2)
        # Avoid abbreviations like Dr., mr., etc.
        if before.lower() in ['dr', 'mr', 'ms', 'mrs', 'vs', 'eg', 'ie']:
            return m.group(0)
        capitalized = after.upper()
        changes.append(f"Standardized sentence boundary: '{before}.{after}' -> '{before}. {capitalized}'")
        return f"{before}. {capitalized}"

    text = re.sub(r'([a-zA-Z]{2,})\.([a-zA-Z])', period_repl, text)

    # Honorific normalization: DR Smith -> Dr. Smith
    def title_repl(m):
        changes.append(f"Standardized doctor honorific: '{m.group(0)}' -> 'Dr. {m.group(1)}'")
        return f"Dr. {m.group(1)}"
    text = re.sub(r'\b(?:DR|dr)\s+([A-Z])', title_repl, text)

    # Multiple spaces & whitespace collapse
    if re.search(r'[ \t]{2,}', text):
        changes.append("Collapsed redundant consecutive whitespace into single spaces")
        text = re.sub(r'[ \t]+', ' ', text)

    text = text.strip()

    # Split into sentences for NLP pipeline view
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]

    return {
        "preprocessed_text": text,
        "changes_made": changes,
        "sentences": sentences
    }

if __name__ == '__main__':
    for r_id in ['0', '1', '11']:
        path = f'data/101writtenfreetextreports/{r_id}.txt'
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                raw = f.read()
            res = test_preprocess(raw)
            print(f"=== Report #{r_id} ===")
            print("RAW:", repr(raw[:80]))
            print("CLEAN:", res['preprocessed_text'][:80])
            print("CHANGES:", res['changes_made'])
            print("SENTENCES (Count=" + str(len(res['sentences'])) + "):")
            for i, s in enumerate(res['sentences'][:3], 1):
                print(f"  {i}. {s}")
            print()
