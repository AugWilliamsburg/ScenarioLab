#!/usr/bin/env python3
"""
PDF Extraction Server v3 - pdfminer-based vertical/horizontal writing PDF text extractor.
Listens on port 3001 and provides /extract and /extract-base64 endpoints.

Key improvements over v2:
- Continuation-column joining: adjacent x-columns belonging to the same dialogue line
  are joined (e.g. 「small出「二年間、教育現場を離れていたんです」 was split across two columns)
- Accurate vertical column grouping with overlap detection
- More robust noise/footer removal
- Proxy-friendly (Hono calls this, frontend calls Hono /api/extract-pdf)
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
# Core extraction logic
# ─────────────────────────────────────────────────────────────────────────────

FOOTER_PATTERNS = re.compile(
    r'ヤングシナリオ大賞|シナリオ大賞\s*応募|応募用紙|次頁に続く|次のページへ'
)
NOISE_LINE_PATTERNS = re.compile(
    r'^[Pp]\.?\s*\d{1,4}$|^\d{1,4}\s*/\s*\d{1,4}$|^\s*-\s*\d{1,4}\s*-\s*$'
)


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
            # Skip noise
            if FOOTER_PATTERNS.search(text):
                continue
            if len(text) < 2:
                continue
            if is_vertical_box(element):
                total_vertical += 1
            else:
                total_horizontal += 1

    # Vertical if at least 60% of content boxes are vertical AND there are at least 3
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

    This version detects continuation columns and joins them to restore
    the original line.

    Returns list of text strings (one per logical line, in reading order).
    """
    from pdfminer.layout import LTTextBox

    page_width = page_layout.width
    page_height = page_layout.height

    boxes = []
    for element in page_layout:
        if not isinstance(element, LTTextBox):
            continue

        # Join the box text, removing intra-column newlines
        # (pdfminer adds \n between each character in vertical text)
        raw_text = element.get_text()
        text = raw_text.replace('\n', '').strip()

        if not text:
            continue

        xc = (element.x0 + element.x1) / 2
        yc = (element.y0 + element.y1) / 2

        # Skip footer noise
        if FOOTER_PATTERNS.search(text):
            continue

        # Skip boxes at very bottom (footer area, y1 < ~60)
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

    # ── Same-x-column deduplication: merge CONTIGUOUS boxes with same xc ────
    # Sometimes pdfminer splits a single vertical column into 2+ LTTextBox
    # fragments. Merge them ONLY if they are vertically contiguous (y-gap < 20pt).
    # Do NOT merge isolated single-char fragments that belong to different content.
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

        # Merge only contiguous fragments (y-gap <= 20pt between consecutive boxes)
        # Each "chain" of contiguous boxes becomes one merged box
        chains = []
        current_chain = [group[0]]
        for k in range(1, len(group)):
            prev = current_chain[-1]
            curr = group[k]
            # gap between bottom of prev and top of curr (in PDF y-coordinates)
            gap = prev['y0'] - curr['y1']
            if gap <= 5:  # strictly contiguous (same column fragment)
                current_chain.append(curr)
            else:
                chains.append(current_chain)
                current_chain = [curr]
        chains.append(current_chain)

        for chain in chains:
            if len(chain) == 1:
                deduped_boxes.append(chain[0])
            else:
                # Merge contiguous chain (text ordered top-to-bottom)
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

    # ── Continuation-column joining ──────────────────────────────────────────
    # In vertical PDFs, a long dialogue line like:
    #   宮内「はい。僕、卓球部の顧問で、朝練あっ  → (column A, xc=314)
    #   て……あ、体育館案内しましょうか？         → (column B, xc=283, continuation)
    #   園先生も朝練ありますよね？」              → (column C, xc=252, continuation)
    # The continuation columns have overlapping y-range with column A AND are shorter.
    #
    # Key rules to AVOID false merges:
    #   1. The "tail" box must overlap y-range with the ORIGINAL box (box[i], not merged)
    #   2. The tail must be clearly shorter than the main column
    #   3. Single character boxes that are not sentence-continuations should not be joined
    #      unless they fit the bracket-continuation pattern

    MAX_COL_GAP = 40    # max x distance between continuation columns (pt)
    MIN_Y_OVERLAP = 0.5  # minimum y-range overlap ratio (higher = stricter)
    MIN_TAIL_LEN = 2     # minimum length for a tail to be considered continuation

    # ── Stray single-char fragment cleanup ───────────────────────────────────
    # pdfminer sometimes misassigns the first character of a continuation column
    # to a slightly wrong x-position. If a box has 1-3 chars with no brackets/punctuation
    # AND the next box is x-adjacent, prepend this fragment to the NEXT box.
    cleaned_boxes = []
    skip_stray = set()
    for i, box in enumerate(boxes):
        if i in skip_stray:
            continue
        text = box['text']
        # Is this a "stray fragment" (single char, no sentence markers)?
        # Only treat completely isolated single characters as strays to avoid misidentifying
        # legitimate short continuation fragments like 'ね？」' (len=3)
        if (len(text) <= 1
                and '「' not in text and '」' not in text
                and '○' not in text and '〇' not in text
                and not re.search(r'[。、！？…「」（）]', text)):
            # Check if the next box is close (x-adjacent) AND stray y-range doesn't
            # overlap significantly with the next box (it's out-of-place)
            if i + 1 < len(boxes) and i + 1 not in skip_stray:
                nxt = boxes[i + 1]
                x_gap = box['xc'] - nxt['xc']
                if 3 < x_gap <= MAX_COL_GAP * 2:  # x_gap > 3 to exclude same-column near-zero differences
                    # Only treat as stray if the fragment's y-range does NOT significantly
                    # overlap the next box's y-range (it's displaced from the main column)
                    overlap = y_overlap_ratio(box['y0'], box['y1'], nxt['y0'], nxt['y1'])
                    if overlap < 0.3:  # minimal overlap = it's a stray
                        nxt_merged = {
                            **nxt,
                            'text': text + nxt['text'],
                        }
                        boxes[i + 1] = nxt_merged
                        skip_stray.add(i)
                        continue
        cleaned_boxes.append(box)
    boxes = cleaned_boxes

    merged_boxes = []
    skip_indices = set()

    for i, box in enumerate(boxes):
        if i in skip_indices:
            continue

        merged_text = box['text']
        merged_y0 = box['y0']
        merged_y1 = box['y1']
        orig_y0 = box['y0']
        orig_y1 = box['y1']

        # Look ahead: does the next column continue this one?
        j = i + 1
        prev_xc = box['xc']  # track the xc of the last merged box
        while j < len(boxes) and j not in skip_indices:
            next_box = boxes[j]

            # Check x adjacency relative to PREVIOUS merged box (not original box)
            # This allows chains like: A(xc=314) → B(xc=283) → C(xc=252)
            x_gap = prev_xc - next_box['xc']
            if x_gap <= 0 or x_gap > MAX_COL_GAP:
                break

            # Must be a non-trivial continuation (at least MIN_TAIL_LEN chars)
            # For single-char fragments only (len=1), check if it's a displaced stray character
            if len(next_box['text']) < MIN_TAIL_LEN:
                # Check if this short fragment's xc is significantly DIFFERENT from the next box
                # (displaced stray that belongs to a further-left column)
                if j + 1 < len(boxes) and j + 1 not in skip_indices:
                    after_box = boxes[j + 1]
                    x_gap2 = next_box['xc'] - after_box['xc']
                    # Only treat as displaced stray if there's a meaningful x gap to the NEXT-NEXT box
                    # (meaning the short fragment is misplaced between the current and next column)
                    if x_gap2 > 5:  # significant gap = fragment belongs to the next column
                        skip_indices.add(j)
                        boxes[j + 1] = {
                            **after_box,
                            'text': next_box['text'] + after_box['text'],
                        }
                        # Don't update prev_xc here - use the after_box xc when we process it next
                        prev_xc = next_box['xc']  # use stray's xc as reference for next step
                        j += 1
                        continue
                # Near-zero gap or can't resolve - this is a same-column orphan, skip it
                j += 1
                continue

            # Check y overlap against ORIGINAL box y-range (not merged)
            overlap = y_overlap_ratio(orig_y0, orig_y1, next_box['y0'], next_box['y1'])
            if overlap < MIN_Y_OVERLAP:
                break

            # The continuation box must be substantially shorter than the main column
            # (it's the "tail" fragment, not a peer column)
            if len(next_box['text']) >= len(box['text']):
                break

            # The main column text must be "open" (mid-sentence, not terminated)
            # Terminated endings: 。！？」（ can close）, 。or other final punctuation
            terminal_punct = ('」', '。', '！', '？', '…」', '——')
            main_terminated = any(merged_text.endswith(p) for p in terminal_punct)
            has_open_bracket = '「' in merged_text and merged_text.count('「') > merged_text.count('」')
            # If main text is terminated AND no open bracket, don't continue
            if main_terminated and not has_open_bracket:
                break

            merged_text = merged_text + next_box['text']
            merged_y0 = min(merged_y0, next_box['y0'])
            merged_y1 = max(merged_y1, next_box['y1'])
            prev_xc = next_box['xc']  # update prev_xc for next iteration
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
        # Round y to 5pt to group nearby boxes
        y_key = round((element.y0 + element.y1) / 2 / 5) * 5
        if y_key not in rows:
            rows[y_key] = []
        rows[y_key].append((element.x0, text))

    lines = []
    for y_key in sorted(rows.keys(), reverse=True):  # top to bottom
        row = sorted(rows[y_key], key=lambda x: x[0])  # left to right
        line = '　'.join(t for _, t in row).strip()  # join with ideographic space
        if line:
            lines.append(line)

    return lines


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
        # Extract all pages (need to iterate twice: once for detection, once for content)
        pages = list(extract_pages(pdf_file))
    except Exception as e:
        return {
            "error": f"PDF parse error: {str(e)}",
            "text": "", "pages": 0, "is_vertical": False,
            "page_map": {}, "char_count": 0, "all_pages": []
        }

    total_pages = len(pages)

    # Detect writing direction by sampling first 5 pages
    is_vertical = detect_vertical_writing(pages, sample_count=min(5, total_pages))

    all_pages_data = []
    full_text_parts = []
    page_map = {}
    line_index = 0

    for page_num, page_layout in enumerate(pages):
        # Extract lines based on writing direction
        if is_vertical:
            raw_lines = process_vertical_page(page_layout)
        else:
            raw_lines = process_horizontal_page(page_layout)

        # Post-process
        lines = post_process_lines(raw_lines, is_vertical)

        if lines:
            page_map[page_num + 1] = line_index
            page_marker = f'\x00PAGE:{page_num + 1}\x00'
            full_text_parts.append(page_marker + '\n'.join(lines))
            line_index += len(lines) + 1

        all_pages_data.append({
            "page": page_num + 1,
            "lines": lines,
            "line_count": len(lines)
        })

    full_text_with_markers = '\n'.join(full_text_parts)
    display_text = re.sub(r'\x00PAGE:\d+\x00', '', full_text_with_markers)
    # Clean up multiple consecutive newlines
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
    return jsonify({"status": "ok", "service": "pdf-extractor", "version": "3.0"})


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
    print(f"PDF Extraction Server v3 starting on port {port}...")
    print("Endpoints:")
    print(f"  GET  http://0.0.0.0:{port}/health")
    print(f"  POST http://0.0.0.0:{port}/extract  (multipart file upload)")
    print(f"  POST http://0.0.0.0:{port}/extract-base64  (JSON with base64 data)")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
