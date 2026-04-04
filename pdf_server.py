#!/usr/bin/env python3
"""
PDF Extraction Server v2 - pdfminer-based vertical/horizontal writing PDF text extractor.
Listens on port 3001 and provides /extract and /extract-base64 endpoints.

Key improvements:
- Detects vertical writing by sampling multiple pages (not just page 1)
- Uses LTTextBox level (not character level) - each box is a column in vertical writing
- Correctly handles right-to-left column ordering for vertical Japanese
- Filters footer/header noise robustly
- Joins continuation lines across columns properly
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


def process_vertical_page(page_layout) -> list:
    """
    Extract text from a vertical writing page.
    
    In vertical Japanese PDFs:
    - Each LTTextBox represents one column of vertically stacked characters
    - Reading order is right-to-left (largest x → smallest x)
    - Each box's text has newlines separating characters (we join them)
    
    Returns list of text strings (one per column, in reading order).
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
        # In this PDF format: xc > page_width - 20 and text is a number
        if xc > page_width - 18 and re.match(r'^\d{1,3}$', text):
            continue
        
        boxes.append({
            'text': text,
            'xc': xc,
            'yc': yc,
            'x0': element.x0,
            'y0': element.y0,
            'y1': element.y1,
        })
    
    # Sort right-to-left (Japanese vertical reading order)
    boxes.sort(key=lambda b: -b['xc'])
    
    return [b['text'] for b in boxes]


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
    
    NOTE: We do NOT join continuation lines here - each LTTextBox in a vertical PDF
    is a separate complete text unit. Joining across boxes would corrupt the structure.
    The scoring engine handles continuation across lines naturally.
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
    return jsonify({"status": "ok", "service": "pdf-extractor", "version": "2.0"})


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
    print(f"PDF Extraction Server v2 starting on port {port}...")
    print("Endpoints:")
    print(f"  GET  http://0.0.0.0:{port}/health")
    print(f"  POST http://0.0.0.0:{port}/extract  (multipart file upload)")
    print(f"  POST http://0.0.0.0:{port}/extract-base64  (JSON with base64 data)")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
