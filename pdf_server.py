#!/usr/bin/env python3
"""
PDF Extraction Server v4 - pdfminer-based vertical/horizontal writing PDF text extractor.
Listens on port 3001 and provides /extract and /extract-base64 endpoints.

v4 improvements over v3:
- Cross-page dialogue continuation joining (post-extraction merge pass)
- Improved within-page column joining (better length/overlap heuristics)
- Better handling of long lines that split across 3+ columns
- Smarter stray fragment cleanup (directional, avoids same-column merge)
- Scene line detection for proper line-end rules
- cleanLines() post-process: merges orphan continuation lines
"""

import json
import sys
import io
import re
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=["*"])

# ─────────────────────────────────────────────────────────────────────────────
# Constants & Patterns
# ─────────────────────────────────────────────────────────────────────────────

FOOTER_PATTERNS = re.compile(
    r'ヤングシナリオ大賞|シナリオ大賞\s*応募|応募用紙|次頁に続く|次のページへ'
)
NOISE_LINE_PATTERNS = re.compile(
    r'^[Pp]\.?\s*\d{1,4}$|^\d{1,4}\s*/\s*\d{1,4}$|^\s*-\s*\d{1,4}\s*-\s*$'
)

# Terminal punctuation that signals end of sentence
TERMINAL_PUNCT = ('」', '』', '。', '！', '？', '…」', '——', '×', '＊')

# Scene line prefixes
SCENE_PATTERN = re.compile(r'^[○◎●〇]|^【|^INT\.|^EXT\.|^シーン|^場面|^#[0-9]')


def is_terminal(text: str) -> bool:
    """Return True if text ends with a terminal punctuation."""
    t = text.rstrip()
    if not t:
        return True
    return any(t.endswith(p) for p in TERMINAL_PUNCT)


def is_scene_line(text: str) -> bool:
    return bool(SCENE_PATTERN.match(text))


def has_open_bracket(text: str) -> bool:
    """Return True if there's an unmatched opening bracket 「 or 『."""
    return text.count('「') + text.count('『') > text.count('」') + text.count('』')


# ─────────────────────────────────────────────────────────────────────────────
# Core extraction logic
# ─────────────────────────────────────────────────────────────────────────────

def is_vertical_box(element) -> bool:
    """Check if a text box is a vertical writing column (taller than wide)."""
    w = element.x1 - element.x0
    h = element.y1 - element.y0
    return h > w * 1.5 and h > 10


def detect_vertical_writing(pages, sample_count: int = 5) -> bool:
    """
    Detect if a PDF uses vertical writing by sampling multiple pages.
    Returns True if the majority of content boxes are in vertical layout.
    """
    from pdfminer.layout import LTTextBox

    total_vertical = 0
    total_horizontal = 0

    for page_num, page_layout in enumerate(pages):
        if page_num >= sample_count:
            break
        for element in page_layout:
            if not isinstance(element, LTTextBox):
                continue
            text = element.get_text().replace('\n', '').strip()
            if FOOTER_PATTERNS.search(text):
                continue
            if len(text) < 2:
                continue
            if is_vertical_box(element):
                total_vertical += 1
            else:
                total_horizontal += 1

    if total_vertical + total_horizontal == 0:
        return False
    ratio = total_vertical / (total_vertical + total_horizontal)
    return ratio >= 0.6 and total_vertical >= 3


def y_overlap_ratio(y0a, y1a, y0b, y1b) -> float:
    """Return the overlap ratio (0–1) of two y-ranges relative to the shorter range."""
    overlap = max(0, min(y1a, y1b) - max(y0a, y0b))
    shorter = min(y1a - y0a, y1b - y0b)
    if shorter <= 0:
        return 0.0
    return overlap / shorter


def process_vertical_page(page_layout) -> list:
    """
    Extract text from a vertical writing page.

    In vertical Japanese PDFs:
    - Each LTTextBox represents one column of vertically stacked characters
    - Reading order is right-to-left (largest x → smallest x)
    - Long lines wrap across multiple adjacent columns (continuation columns)

    Returns list of text strings (one per logical line, in reading order).
    """
    from pdfminer.layout import LTTextBox

    page_width = page_layout.width
    page_height = page_layout.height

    boxes = []
    for element in page_layout:
        if not isinstance(element, LTTextBox):
            continue

        raw_text = element.get_text()
        text = raw_text.replace('\n', '').strip()

        if not text:
            continue

        xc = (element.x0 + element.x1) / 2
        yc = (element.y0 + element.y1) / 2

        if FOOTER_PATTERNS.search(text):
            continue

        # Skip boxes at very bottom (footer area)
        if element.y1 < 58:
            continue

        # Skip the page number box: very right edge, short text that's all digits
        if xc > page_width - 18 and re.match(r'^\d{1,3}$', text):
            continue

        boxes.append({
            'text': text,
            'xc': xc,
            'yc': yc,
            'x0': element.x0,
            'x1': element.x1,
            'y0': element.y0,
            'y1': element.y1,
        })

    # Sort right-to-left (Japanese vertical reading order)
    boxes.sort(key=lambda b: -b['xc'])

    # ── Same-x-column deduplication ─────────────────────────────────────────
    # Merge ONLY contiguous boxes with same xc (y-gap <= 5pt)
    from collections import defaultdict

    xc_groups = defaultdict(list)
    for b in boxes:
        key = round(b['xc'] / 4) * 4  # group xc within 4pt tolerance
        xc_groups[key].append(b)

    deduped_boxes = []
    for key in sorted(xc_groups.keys(), reverse=True):  # right to left
        group = sorted(xc_groups[key], key=lambda b: -b['y1'])  # top (highest y1) first
        if len(group) == 1:
            deduped_boxes.append(group[0])
            continue

        # Merge only strictly contiguous fragments (y-gap <= 5pt)
        chains = []
        current_chain = [group[0]]
        for k in range(1, len(group)):
            prev = current_chain[-1]
            curr = group[k]
            gap = prev['y0'] - curr['y1']
            if gap <= 5:
                current_chain.append(curr)
            else:
                chains.append(current_chain)
                current_chain = [curr]
        chains.append(current_chain)

        for chain in chains:
            if len(chain) == 1:
                deduped_boxes.append(chain[0])
            else:
                merged_text = ''.join(b['text'] for b in chain)
                deduped_boxes.append({
                    'text': merged_text,
                    'xc': chain[0]['xc'],
                    'yc': (chain[0]['y1'] + chain[-1]['y0']) / 2,
                    'x0': min(b['x0'] for b in chain),
                    'x1': max(b['x1'] for b in chain),
                    'y0': min(b['y0'] for b in chain),
                    'y1': max(b['y1'] for b in chain),
                })

    # Re-sort right to left after deduplication
    deduped_boxes.sort(key=lambda b: -b['xc'])
    boxes = deduped_boxes

    # ── Parameters ──────────────────────────────────────────────────────────
    MAX_COL_GAP = 40     # max x distance between continuation columns (pt)
    MIN_Y_OVERLAP = 0.4  # minimum y-range overlap ratio
    MIN_TAIL_LEN = 2     # minimum chars for a tail fragment to be considered continuation

    # ── Stray single-char fragment cleanup ───────────────────────────────────
    # Isolated single chars with no punctuation/brackets get prepended to next box
    # ONLY if they are clearly displaced (x_gap > 3, low y-overlap)
    cleaned_boxes = []
    skip_stray = set()
    for i, box in enumerate(boxes):
        if i in skip_stray:
            continue
        text = box['text']
        is_stray_candidate = (
            len(text) == 1
            and '「' not in text and '」' not in text
            and '○' not in text and '〇' not in text
            and not re.search(r'[。、！？…「」（）×＊]', text)
        )
        if is_stray_candidate and i + 1 < len(boxes) and i + 1 not in skip_stray:
            nxt = boxes[i + 1]
            x_gap = box['xc'] - nxt['xc']
            # Only treat as stray if clearly displaced to a different column (x_gap > 3)
            # AND has minimal y-overlap with next box (it's out-of-place)
            if x_gap > 3:
                overlap = y_overlap_ratio(box['y0'], box['y1'], nxt['y0'], nxt['y1'])
                if overlap < 0.3:
                    # Prepend stray to next box
                    boxes[i + 1] = {**nxt, 'text': text + nxt['text']}
                    skip_stray.add(i)
                    continue
        cleaned_boxes.append(box)
    boxes = cleaned_boxes

    # ── Continuation-column joining ──────────────────────────────────────────
    # Join continuation columns (smaller x = further left = continuation in vertical)
    merged_boxes = []
    skip_indices = set()

    for i, box in enumerate(boxes):
        if i in skip_indices:
            continue

        merged_text = box['text']
        merged_y0 = box['y0']
        merged_y1 = box['y1']
        orig_len = len(box['text'])   # original box length (before merging)
        orig_y0 = box['y0']
        orig_y1 = box['y1']

        j = i + 1
        prev_xc = box['xc']

        while j < len(boxes) and j not in skip_indices:
            next_box = boxes[j]
            next_text = next_box['text']
            next_len = len(next_text)

            # x adjacency check relative to LAST merged box
            x_gap = prev_xc - next_box['xc']
            if x_gap <= 0 or x_gap > MAX_COL_GAP:
                break

            # Very short fragments (< MIN_TAIL_LEN chars): check if displaced stray
            if next_len < MIN_TAIL_LEN:
                # Look further to see if this belongs to the column AFTER this one
                if j + 1 < len(boxes) and j + 1 not in skip_indices:
                    after_box = boxes[j + 1]
                    x_gap2 = next_box['xc'] - after_box['xc']
                    if x_gap2 > 5:
                        # Short stray: belongs to next-next box, prepend to it
                        skip_indices.add(j)
                        boxes[j + 1] = {
                            **after_box,
                            'text': next_text + after_box['text'],
                        }
                        prev_xc = next_box['xc']
                        j += 1
                        continue
                # Can't resolve: skip this fragment without breaking the chain
                j += 1
                continue

            # y overlap check against ORIGINAL box y-range
            overlap = y_overlap_ratio(orig_y0, orig_y1, next_box['y0'], next_box['y1'])
            if overlap < MIN_Y_OVERLAP:
                break

            # Main text must be "open" (not terminated) OR have unbalanced brackets
            main_terminated = is_terminal(merged_text)
            main_open = has_open_bracket(merged_text)

            if main_terminated and not main_open:
                break

            # Continuation must be shorter than the ORIGINAL box for non-dialogue lines
            # For dialogue lines with open brackets, allow same-length or even longer continuations
            # (this handles long lines split across equal-width columns)
            if next_len >= orig_len and not main_open:
                break

            merged_text = merged_text + next_text
            merged_y0 = min(merged_y0, next_box['y0'])
            merged_y1 = max(merged_y1, next_box['y1'])
            prev_xc = next_box['xc']
            skip_indices.add(j)
            j += 1

        merged_boxes.append({
            **box,
            'text': merged_text,
            'y0': merged_y0,
            'y1': merged_y1,
        })

    return [b['text'] for b in merged_boxes]


def process_horizontal_page(page_layout) -> list:
    """
    Extract text from a horizontal writing page.
    Groups boxes by y-position (top to bottom), within each row left to right.
    """
    from pdfminer.layout import LTTextBox

    rows = {}
    for element in page_layout:
        if not isinstance(element, LTTextBox):
            continue
        text = element.get_text().strip()
        if not text:
            continue
        if FOOTER_PATTERNS.search(text):
            continue
        y_key = round((element.y0 + element.y1) / 2 / 5) * 5
        if y_key not in rows:
            rows[y_key] = []
        rows[y_key].append((element.x0, text))

    lines = []
    for y_key in sorted(rows.keys(), reverse=True):
        row = sorted(rows[y_key], key=lambda x: x[0])
        line = '　'.join(t for _, t in row).strip()
        if line:
            lines.append(line)

    return lines


def merge_cross_page_fragments(all_pages_data: list) -> list:
    """
    Post-extraction pass: merge dialogue/sentence fragments that were split across page
    boundaries due to the physical layout of the PDF.

    A line at the END of page N is a "dangling fragment" if:
      - It has an unmatched opening bracket 「 / 『, OR
      - It does not end with terminal punctuation AND is not a scene line

    The FIRST line of page N+1 is the continuation if:
      - It does NOT start a new scene (no ○ / 〇 / 【 prefix)
      - It does NOT start a new dialogue (no キャラ名「 pattern)
      - It is short (< 40 chars) OR starts with hiragana/katakana/kanji continuation

    When both conditions are met, the first line of N+1 is prepended to the last line of N
    and removed from page N+1.
    """
    NEW_DIALOGUE = re.compile(r'^[ぁ-んァ-ヶーｱ-ﾝﾞﾟ一-龯Ａ-Ｚａ-ｚA-Za-z　ー]{1,12}[「『]')
    CONTINUATION_CHAR = re.compile(r'^[ぁ-んァ-ヶー一-龯Ａ-Ｚａ-ｚ０-９A-Za-z0-9\s　、。！？…×＊・ー]')

    result = []
    for p_idx, page_data in enumerate(all_pages_data):
        page_lines = list(page_data['lines'])

        # Try to merge from PREVIOUS page's pending carry-over
        if result and result[-1].get('_carry'):
            carry_lines = result[-1]['_carry']
            if page_lines:
                # Append carry lines as continuation fragments to start of this page
                merged_carry = []
                for cl in carry_lines:
                    merged_carry.append(cl)
                page_lines = merged_carry + page_lines
                result[-1]['_carry'] = []

        result.append({
            'page': page_data['page'],
            'lines': page_lines,
            'line_count': len(page_lines),
            '_carry': [],
        })

    # Second pass: cross-page merge
    for p_idx in range(len(result) - 1):
        curr_page = result[p_idx]
        next_page = result[p_idx + 1]

        if not curr_page['lines'] or not next_page['lines']:
            continue

        last_line = curr_page['lines'][-1]
        first_next = next_page['lines'][0]

        # Is the last line of this page a dangling fragment?
        is_dangling = (
            has_open_bracket(last_line)
            or (not is_terminal(last_line) and not is_scene_line(last_line) and len(last_line) > 5)
        )

        if not is_dangling:
            continue

        # Is the first line of the next page a continuation?
        # It must NOT start a new dialogue or scene
        is_continuation = (
            not is_scene_line(first_next)
            and not NEW_DIALOGUE.match(first_next)
            and (
                CONTINUATION_CHAR.match(first_next)
                or len(first_next) <= 30
            )
        )

        if not is_continuation:
            continue

        # Merge: append first_next to last_line and remove from next_page
        curr_page['lines'][-1] = last_line + first_next
        next_page['lines'] = next_page['lines'][1:]

        # After merging, check if there are MORE continuation lines at the start of next_page
        # (e.g., a long dialogue spans 3+ pages)
        while next_page['lines']:
            new_last = curr_page['lines'][-1]
            new_first = next_page['lines'][0]

            still_dangling = (
                has_open_bracket(new_last)
                or (not is_terminal(new_last) and not is_scene_line(new_last) and len(new_last) > 5)
            )
            still_continuation = (
                not is_scene_line(new_first)
                and not NEW_DIALOGUE.match(new_first)
                and (CONTINUATION_CHAR.match(new_first) or len(new_first) <= 25)
            )

            if still_dangling and still_continuation:
                curr_page['lines'][-1] = new_last + new_first
                next_page['lines'] = next_page['lines'][1:]
            else:
                break

    # Clean up internal _carry keys and update line_count
    for page_data in result:
        page_data.pop('_carry', None)
        page_data['line_count'] = len(page_data['lines'])

    return result


def post_process_lines(lines: list, is_vertical: bool) -> list:
    """
    Post-process extracted lines:
    1. Remove noise lines (page numbers, headers, etc.)
    2. Remove completely empty lines
    """
    result = []

    for ln in lines:
        lt = ln.strip()
        if not lt:
            continue
        if FOOTER_PATTERNS.search(lt):
            continue
        if NOISE_LINE_PATTERNS.match(lt):
            continue
        result.append(lt)

    return result


def merge_within_page_continuations(lines: list) -> list:
    """
    Within a page's extracted lines, merge lines where a dialogue or sentence
    was split but the column-joining algorithm couldn't fully merge them.

    Handles cases where:
    - A line ends mid-dialogue (open bracket, no terminal punct)
    - The next line is a short continuation (< 25 chars, no new dialogue/scene)
    - The next line starts with continuation characters
    """
    NEW_DIALOGUE = re.compile(r'^[ぁ-んァ-ヶーｱ-ﾝﾞﾟ一-龯Ａ-Ｚａ-ｚA-Za-z　ー]{1,12}[「『]')
    # Continuation chars: hiragana, katakana, kanji, fullwidth latin, digits, punctuation
    CONTINUATION_CHAR = re.compile(r'^[ぁ-んァ-ヶー一-龯Ａ-Ｚａ-ｚ０-９A-Za-z0-9\s　、。！？…×＊・ー]')

    result = []
    i = 0
    while i < len(lines):
        line = lines[i]

        if not line.strip():
            result.append(line)
            i += 1
            continue

        # Check if this line is a dangling fragment needing continuation
        # "dangling" = has unmatched open bracket, or doesn't end with terminal punct
        is_dangling = (
            has_open_bracket(line)
            or (not is_terminal(line) and not is_scene_line(line) and len(line) > 5)
        )

        if is_dangling and i + 1 < len(lines):
            next_line = lines[i + 1]

            # Can we merge?
            # next line must NOT start a new scene or new character dialogue
            # AND must look like a continuation (starts with expected chars or is short)
            is_cont = (
                next_line.strip()
                and not is_scene_line(next_line)
                and not NEW_DIALOGUE.match(next_line)
                and (CONTINUATION_CHAR.match(next_line) or len(next_line) <= 25)
            )

            if is_cont:
                # Merge and continue checking further continuations
                merged = line + next_line.strip()
                i += 2

                while i < len(lines):
                    still_dangling = (
                        has_open_bracket(merged)
                        or (not is_terminal(merged) and not is_scene_line(merged))
                    )
                    if not still_dangling:
                        break
                    further = lines[i]
                    still_cont = (
                        further.strip()
                        and not is_scene_line(further)
                        and not NEW_DIALOGUE.match(further)
                        and (CONTINUATION_CHAR.match(further) or len(further) <= 20)
                    )
                    if still_cont:
                        merged = merged + further.strip()
                        i += 1
                    else:
                        break

                result.append(merged)
                continue

        result.append(line)
        i += 1

    return result


def extract_pdf_text(pdf_bytes: bytes) -> dict:
    """
    Main extraction function. Returns dict with:
    - text: plain text of the entire PDF
    - text_with_markers: text with \x00PAGE:N\x00 markers
    - is_vertical: bool
    - pages: total page count
    - page_map: {page_num: line_index} mapping
    - char_count: character count (excluding whitespace)
    - all_pages: per-page data
    - error: None or error message
    """
    try:
        from pdfminer.high_level import extract_pages
        from pdfminer.layout import LTTextBox
    except ImportError:
        return {
            "error": "pdfminer.six not installed on server",
            "text": "", "pages": 0, "is_vertical": False,
            "page_map": {}, "char_count": 0, "all_pages": []
        }

    try:
        pdf_file = io.BytesIO(pdf_bytes)
        pages = list(extract_pages(pdf_file))
    except Exception as e:
        return {
            "error": f"PDF parse error: {str(e)}",
            "text": "", "pages": 0, "is_vertical": False,
            "page_map": {}, "char_count": 0, "all_pages": []
        }

    total_pages = len(pages)
    is_vertical = detect_vertical_writing(pages, sample_count=min(5, total_pages))

    all_pages_data = []

    for page_num, page_layout in enumerate(pages):
        if is_vertical:
            raw_lines = process_vertical_page(page_layout)
        else:
            raw_lines = process_horizontal_page(page_layout)

        lines = post_process_lines(raw_lines, is_vertical)

        all_pages_data.append({
            "page": page_num + 1,
            "lines": lines,
            "line_count": len(lines)
        })

    # ── Within-page continuation merge pass (first pass) ────────────────────
    # Must run BEFORE cross-page merge so page boundaries reflect merged state
    for page_data in all_pages_data:
        page_data['lines'] = merge_within_page_continuations(page_data['lines'])
        page_data['line_count'] = len(page_data['lines'])

    # ── Cross-page fragment merge pass ──────────────────────────────────────
    if is_vertical:
        all_pages_data = merge_cross_page_fragments(all_pages_data)

    # ── Within-page continuation merge pass (second pass) ───────────────────
    # Run again after cross-page merge to catch any newly created fragment chains
    for page_data in all_pages_data:
        page_data['lines'] = merge_within_page_continuations(page_data['lines'])
        page_data['line_count'] = len(page_data['lines'])

    # ── Assemble final text ──────────────────────────────────────────────────
    full_text_parts = []
    page_map = {}
    line_index = 0

    for page_data in all_pages_data:
        lines = page_data['lines']
        if lines:
            page_num = page_data['page']
            page_map[page_num] = line_index
            page_marker = f'\x00PAGE:{page_num}\x00'
            full_text_parts.append(page_marker + '\n'.join(lines))
            line_index += len(lines) + 1

    full_text_with_markers = '\n'.join(full_text_parts)
    display_text = re.sub(r'\x00PAGE:\d+\x00', '', full_text_with_markers)
    display_text = re.sub(r'\n{3,}', '\n\n', display_text)
    char_count = len(re.sub(r'\s', '', display_text))

    return {
        "text": display_text.strip(),
        "text_with_markers": full_text_with_markers,
        "is_vertical": bool(is_vertical),
        "pages": total_pages,
        "page_map": {str(k): v for k, v in page_map.items()},
        "char_count": char_count,
        "all_pages": all_pages_data,
        "error": None
    }


# ─────────────────────────────────────────────────────────────────────────────
# Flask routes
# ─────────────────────────────────────────────────────────────────────────────

def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response


@app.after_request
def after_request(response):
    return add_cors_headers(response)


@app.route('/health', methods=['GET', 'OPTIONS'])
def health():
    return jsonify({"status": "ok", "service": "pdf-extractor", "version": "4.0"})


@app.route('/extract', methods=['POST', 'OPTIONS'])
def extract_multipart():
    """
    POST /extract
    Body: multipart/form-data with 'file' field (PDF file)
    Returns: JSON with extracted text and metadata
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    if 'file' not in request.files:
        return jsonify({"error": "No 'file' field in request"}), 400

    f = request.files['file']
    if not f or not f.filename:
        return jsonify({"error": "Empty file"}), 400

    if not f.filename.lower().endswith('.pdf'):
        return jsonify({"error": "Only PDF files supported"}), 400

    try:
        pdf_bytes = f.read()
        result = extract_pdf_text(pdf_bytes)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/extract-base64', methods=['POST', 'OPTIONS'])
def extract_b64():
    """
    POST /extract-base64
    Body: JSON {"data": "<base64-encoded PDF bytes>"}
    Returns: JSON with extracted text and metadata
    """
    if request.method == 'OPTIONS':
        return jsonify({}), 200

    try:
        body = request.get_json(force=True, silent=True)
        if not body or 'data' not in body:
            return jsonify({"error": "JSON body must have 'data' field with base64 PDF"}), 400

        pdf_bytes = base64.b64decode(body['data'])
        result = extract_pdf_text(pdf_bytes)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 3001
    print(f"PDF Extraction Server v4 starting on port {port}...")
    print("Endpoints:")
    print(f"  GET  http://0.0.0.0:{port}/health")
    print(f"  POST http://0.0.0.0:{port}/extract  (multipart file upload)")
    print(f"  POST http://0.0.0.0:{port}/extract-base64  (JSON with base64 data)")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
