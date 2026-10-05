import os
import re
import json
import csv
from pathlib import Path
from typing import List, Dict, Any, Optional
from pypdf import PdfReader
from PIL import Image
import cv2
import numpy as np
import requests
from bs4 import BeautifulSoup

try:
    import docx
except ImportError:
    docx = None

try:
    import pptx
except ImportError:
    pptx = None

try:
    import openpyxl
except ImportError:
    openpyxl = None

try:
    import pandas as pd
except ImportError:
    pd = None


class EducationalDocumentLoader:
    """
    Multi-source ingestion engine for ZORO Intelligent Teacher Robot.
    Parses documents (PDF, DOCX, PPTX, TXT, MD, CSV), structured data (Excel, JSON),
    images (scanned notes, textbook pages, diagrams), web URLs, and direct teacher notes.
    """

    SUPPORTED_DOC_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".md", ".csv"}
    SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    SUPPORTED_STRUCTURED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json"}

    @classmethod
    def load_document(cls, file_path: str, source_type: Optional[str] = None) -> Dict[str, Any]:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = path.suffix.lower()
        title = path.stem.replace("_", " ").replace("-", " ").title()

        if ext == ".pdf":
            doc = cls._load_pdf(path, title)
            doc["source_type"] = source_type or "document"
            return doc
        elif ext == ".docx":
            doc = cls._load_docx(path, title)
            doc["source_type"] = source_type or "document"
            return doc
        elif ext == ".pptx":
            doc = cls._load_pptx(path, title)
            doc["source_type"] = source_type or "document"
            return doc
        elif ext in [".txt", ".md"]:
            doc = cls._load_text_or_markdown(path, title, is_md=(ext == ".md"))
            doc["source_type"] = source_type or "document"
            return doc
        elif ext == ".csv":
            doc = cls._load_csv(path, title)
            doc["source_type"] = source_type or "structured"
            return doc
        elif ext in [".xlsx", ".xls"]:
            doc = cls._load_excel(path, title)
            doc["source_type"] = source_type or "structured"
            return doc
        elif ext == ".json":
            doc = cls._load_json(path, title)
            doc["source_type"] = source_type or "structured"
            return doc
        elif ext in cls.SUPPORTED_IMAGE_EXTENSIONS:
            doc = cls._load_image(path, title)
            doc["source_type"] = source_type or "image"
            return doc
        else:
            raise ValueError(
                f"Unsupported file format '{ext}'. Supported formats: PDF, DOCX, PPTX, TXT, MD, CSV, XLSX, JSON, JPG, PNG."
            )

    @classmethod
    def _load_pdf(cls, path: Path, title: str) -> Dict[str, Any]:
        reader = PdfReader(str(path))
        pages_content = []
        full_text_list = []
        multimodal_elements = []

        for idx, page in enumerate(reader.pages):
            page_num = idx + 1
            text = (page.extract_text() or "").strip()
            pages_content.append({
                "page_number": page_num,
                "text": text,
                "section": f"Page {page_num}"
            })
            if text:
                full_text_list.append(f"[Page {page_num}]\n" + text)

            images_in_page = len(page.images) if hasattr(page, "images") else 0
            if images_in_page > 0:
                multimodal_elements.append({
                    "page_number": page_num,
                    "type": "diagram_or_figure",
                    "count": images_in_page,
                    "caption_hint": f"Figure/Diagram on page {page_num} of {title}"
                })

        full_text = "\n\n".join(full_text_list)
        return {
            "title": title,
            "filename": path.name,
            "file_path": str(path),
            "file_size": path.stat().st_size,
            "total_pages": max(1, len(reader.pages)),
            "full_text": full_text,
            "pages": pages_content,
            "multimodal_elements": multimodal_elements
        }

    @classmethod
    def _load_docx(cls, path: Path, title: str) -> Dict[str, Any]:
        if docx is None:
            raise ImportError("python-docx is not installed.")

        doc = docx.Document(str(path))
        pages_content = []
        full_text_list = []
        multimodal_elements = []

        current_section = "Introduction"
        current_paragraphs = []
        page_counter = 1

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue

            if p.style and ("Heading" in p.style.name or "Title" in p.style.name):
                if current_paragraphs:
                    section_text = "\n".join(current_paragraphs)
                    pages_content.append({
                        "page_number": page_counter,
                        "text": section_text,
                        "section": current_section
                    })
                    full_text_list.append(section_text)
                    page_counter += 1
                    current_paragraphs = []
                current_section = text
                current_paragraphs.append(f"## {text}")
            else:
                current_paragraphs.append(text)

        for table_idx, table in enumerate(doc.tables):
            table_rows = []
            for row in table.rows:
                cells = [c.text.strip().replace("\n", " ") for c in row.cells]
                if any(cells):
                    table_rows.append(" | ".join(cells))
            if table_rows:
                formatted_table = f"\nTable #{table_idx + 1}:\n" + "\n".join(table_rows)
                current_paragraphs.append(formatted_table)
                multimodal_elements.append({
                    "page_number": page_counter,
                    "type": "table",
                    "caption_hint": f"Curriculum Data Table in section {current_section}"
                })

        if current_paragraphs:
            section_text = "\n".join(current_paragraphs)
            pages_content.append({
                "page_number": page_counter,
                "text": section_text,
                "section": current_section
            })
            full_text_list.append(section_text)

        full_text = "\n\n".join(full_text_list)
        return {
            "title": title,
            "filename": path.name,
            "file_path": str(path),
            "file_size": path.stat().st_size,
            "total_pages": max(1, len(pages_content)),
            "full_text": full_text,
            "pages": pages_content if pages_content else [{"page_number": 1, "text": full_text, "section": "Content"}],
            "multimodal_elements": multimodal_elements
        }

    @classmethod
    def _load_pptx(cls, path: Path, title: str) -> Dict[str, Any]:
        if pptx is None:
            raise ImportError("python-pptx is not installed.")

        prs = pptx.Presentation(str(path))
        pages_content = []
        full_text_list = []
        multimodal_elements = []

        for idx, slide in enumerate(prs.slides):
            slide_num = idx + 1
            slide_texts = []
            slide_title = f"Slide {slide_num}"

            if slide.shapes.title and slide.shapes.title.text:
                slide_title = slide.shapes.title.text.strip()
                slide_texts.append(f"# {slide_title}")

            image_count = 0
            for shape in slide.shapes:
                if shape.has_text_frame:
                    for para in shape.text_frame.paragraphs:
                        txt = para.text.strip()
                        if txt and txt != slide_title:
                            slide_texts.append(txt)
                elif shape.shape_type == 13:
                    image_count += 1

            if slide.has_notes_slide and slide.notes_slide.notes_text_frame:
                notes = slide.notes_slide.notes_text_frame.text.strip()
                if notes:
                    slide_texts.append(f"Teacher Notes: {notes}")

            slide_full = "\n".join(slide_texts)
            pages_content.append({
                "page_number": slide_num,
                "text": slide_full,
                "section": slide_title
            })
            if slide_full:
                full_text_list.append(f"[{slide_title}]\n" + slide_full)

            if image_count > 0:
                multimodal_elements.append({
                    "page_number": slide_num,
                    "type": "presentation_visual",
                    "count": image_count,
                    "caption_hint": f"Visual diagrams on slide {slide_num}: {slide_title}"
                })

        full_text = "\n\n".join(full_text_list)
        return {
            "title": title,
            "filename": path.name,
            "file_path": str(path),
            "file_size": path.stat().st_size,
            "total_pages": max(1, len(prs.slides)),
            "full_text": full_text,
            "pages": pages_content,
            "multimodal_elements": multimodal_elements
        }

    @classmethod
    def _load_text_or_markdown(cls, path: Path, title: str, is_md: bool = False) -> Dict[str, Any]:
        encodings = ["utf-8", "utf-8-sig", "latin-1", "cp1252"]
        content = ""
        for enc in encodings:
            try:
                with open(path, "r", encoding=enc) as f:
                    content = f.read()
                break
            except UnicodeDecodeError:
                continue

        pages_content = []
        if is_md and re.search(r"^#{1,3}\s+", content, re.MULTILINE):
            sections = re.split(r"(^#{1,3}\s+[^\n]+)", content, flags=re.MULTILINE)
            current_sec = "Overview"
            cur_body = []
            page_num = 1
            for part in sections:
                part = part.strip()
                if not part:
                    continue
                if re.match(r"^#{1,3}\s+", part):
                    if cur_body:
                        sec_text = "\n".join(cur_body).strip()
                        if sec_text:
                            pages_content.append({"page_number": page_num, "text": sec_text, "section": current_sec})
                            page_num += 1
                        cur_body = []
                    current_sec = re.sub(r"^#{1,3}\s+", "", part)
                    cur_body.append(part)
                else:
                    cur_body.append(part)
            if cur_body:
                sec_text = "\n".join(cur_body).strip()
                if sec_text:
                    pages_content.append({"page_number": page_num, "text": sec_text, "section": current_sec})

        if not pages_content:
            pages_content = [{"page_number": 1, "text": content, "section": title}]

        return {
            "title": title,
            "filename": path.name,
            "file_path": str(path),
            "file_size": path.stat().st_size,
            "total_pages": len(pages_content),
            "full_text": content,
            "pages": pages_content,
            "multimodal_elements": []
        }

    @classmethod
    def _load_csv(cls, path: Path, title: str) -> Dict[str, Any]:
        encodings = ["utf-8", "latin-1"]
        rows = []
        for enc in encodings:
            try:
                with open(path, "r", encoding=enc, newline="") as f:
                    reader = csv.reader(f)
                    rows = list(reader)
                break
            except Exception:
                continue

        if not rows:
            return cls._load_text_or_markdown(path, title)

        headers = rows[0]
        data_rows = rows[1:]
        total_rows = len(data_rows)

        chunk_size = 20
        pages_content = []
        full_text_blocks = []

        for chunk_idx in range(0, max(1, total_rows), chunk_size):
            slice_rows = data_rows[chunk_idx:chunk_idx + chunk_size]
            block_lines = [f"Dataset Table: {title} | Total Records: {total_rows}"]
            block_lines.append(f"Columns: {', '.join(headers)}")
            for r_idx, r in enumerate(slice_rows):
                row_str = " | ".join(f"{h}: {val}" for h, val in zip(headers, r) if val)
                block_lines.append(f"Record #{chunk_idx + r_idx + 1}: {row_str}")

            text_block = "\n".join(block_lines)
            pages_content.append({
                "page_number": (chunk_idx // chunk_size) + 1,
                "text": text_block,
                "section": f"Records {chunk_idx + 1} to {chunk_idx + len(slice_rows)}"
            })
            full_text_blocks.append(text_block)

        return {
            "title": title,
            "filename": path.name,
            "file_path": str(path),
            "file_size": path.stat().st_size,
            "total_pages": len(pages_content),
            "full_text": "\n\n".join(full_text_blocks),
            "pages": pages_content,
            "multimodal_elements": [{"type": "structured_dataset", "rows": total_rows, "columns": len(headers)}]
        }

    @classmethod
    def _load_excel(cls, path: Path, title: str) -> Dict[str, Any]:
        if openpyxl is None:
            raise ImportError("openpyxl is not installed.")

        wb = openpyxl.load_workbook(str(path), data_only=True)
        pages_content = []
        full_text_blocks = []
        page_num = 1

        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            rows = []
            for row in ws.iter_rows(values_only=True):
                if any(row):
                    rows.append([str(c).strip() if c is not None else "" for c in row])

            if not rows:
                continue

            headers = rows[0]
            data_rows = rows[1:]
            total_rows = len(data_rows)

            chunk_size = 20
            for chunk_idx in range(0, max(1, total_rows), chunk_size):
                slice_rows = data_rows[chunk_idx:chunk_idx + chunk_size]
                block_lines = [f"Curriculum Spreadsheet: {title} | Sheet: {sheet_name}"]
                block_lines.append(f"Headers: {', '.join(headers)}")
                for r_idx, r in enumerate(slice_rows):
                    row_str = " | ".join(f"{h}: {val}" for h, val in zip(headers, r) if val)
                    block_lines.append(f"Row {chunk_idx + r_idx + 1}: {row_str}")

                text_block = "\n".join(block_lines)
                pages_content.append({
                    "page_number": page_num,
                    "text": text_block,
                    "section": f"{sheet_name} (Rows {chunk_idx + 1}-{chunk_idx + len(slice_rows)})"
                })
                full_text_blocks.append(text_block)
                page_num += 1

        wb.close()
        full_text = "\n\n".join(full_text_blocks)
        return {
            "title": title,
            "filename": path.name,
            "file_path": str(path),
            "file_size": path.stat().st_size,
            "total_pages": max(1, len(pages_content)),
            "full_text": full_text,
            "pages": pages_content if pages_content else [{"page_number": 1, "text": f"Empty Excel file {title}", "section": "Empty"}],
            "multimodal_elements": [{"type": "spreadsheet", "sheets": len(wb.sheetnames)}]
        }

    @classmethod
    def _load_json(cls, path: Path, title: str) -> Dict[str, Any]:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)

        pages_content = []
        full_text_blocks = []

        if isinstance(data, list):
            chunk_size = 10
            for idx in range(0, max(1, len(data)), chunk_size):
                slice_items = data[idx:idx + chunk_size]
                lines = [f"JSON Knowledge Bank: {title} | Items {idx + 1} to {idx + len(slice_items)}:"]
                for i_idx, item in enumerate(slice_items):
                    if isinstance(item, dict):
                        item_str = "; ".join(f"{k}: {v}" for k, v in item.items())
                    else:
                        item_str = str(item)
                    lines.append(f"Item #{idx + i_idx + 1}: {item_str}")

                text_block = "\n".join(lines)
                pages_content.append({
                    "page_number": (idx // chunk_size) + 1,
                    "text": text_block,
                    "section": f"Items {idx + 1}-{idx + len(slice_items)}"
                })
                full_text_blocks.append(text_block)
        elif isinstance(data, dict):
            page_counter = 1
            for key, val in data.items():
                if isinstance(val, (dict, list)):
                    val_str = json.dumps(val, indent=2)
                else:
                    val_str = str(val)
                sec_text = f"Subject / Key: {key}\nContent:\n{val_str}"
                pages_content.append({
                    "page_number": page_counter,
                    "text": sec_text,
                    "section": str(key)
                })
                full_text_blocks.append(sec_text)
                page_counter += 1
        else:
            raw_text = str(data)
            pages_content.append({"page_number": 1, "text": raw_text, "section": title})
            full_text_blocks.append(raw_text)

        return {
            "title": title,
            "filename": path.name,
            "file_path": str(path),
            "file_size": path.stat().st_size,
            "total_pages": max(1, len(pages_content)),
            "full_text": "\n\n".join(full_text_blocks),
            "pages": pages_content,
            "multimodal_elements": [{"type": "structured_json"}]
        }

    @classmethod
    def _load_image(cls, path: Path, title: str) -> Dict[str, Any]:
        img_pil = Image.open(str(path))
        w, h = img_pil.size
        aspect_ratio = round(w / max(1, h), 2)
        mode = img_pil.mode

        img_cv = cv2.imread(str(path))
        visual_type = "Educational Diagram"
        contour_count = 0
        edge_density = 0.0

        if img_cv is not None:
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            edge_density = round(float(np.mean(edges > 0)), 3)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            contour_count = len(contours)

            if edge_density > 0.15:
                visual_type = "Scanned Textbook Page / Handwritten Notes"
            elif contour_count > 40:
                visual_type = "Complex Diagram / Scientific Illustration"
            else:
                visual_type = "Educational Figure / Concept Chart"

        description_body = (
            f"[Multimodal Educational Analysis: {title}]\n"
            f"Visual Asset Type: {visual_type}\n"
            f"Image Dimensions: {w}x{h} pixels (Aspect Ratio: {aspect_ratio}, Channels: {mode})\n"
            f"Structural Characteristics: {contour_count} identifiable visual contour regions with edge density score {edge_density}.\n"
            f"Pedagogical Significance: This educational graphic presents visual concept relationships, labeled components, "
            f"and schematic illustrations corresponding to {title}. The graphic is indexed for multimodal concept retrieval in classroom tutoring."
        )

        pages_content = [{
            "page_number": 1,
            "text": description_body,
            "section": f"{visual_type}: {title}"
        }]

        return {
            "title": title,
            "filename": path.name,
            "file_path": str(path),
            "file_size": path.stat().st_size,
            "total_pages": 1,
            "full_text": description_body,
            "pages": pages_content,
            "multimodal_elements": [{
                "type": "image_diagram",
                "visual_type": visual_type,
                "width": w,
                "height": h,
                "contours": contour_count,
                "edge_density": edge_density
            }]
        }

    @classmethod
    def load_url(cls, url: str, custom_title: Optional[str] = None) -> Dict[str, Any]:
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 ZORO-Teacher-Robot/1.0"
            )
        }
        resp = requests.get(url, headers=headers, timeout=10.0)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")

        for element in soup(["script", "style", "nav", "footer", "header", "aside", "form", "iframe", "noscript"]):
            element.decompose()

        page_title = custom_title
        if not page_title:
            if soup.title and soup.title.string:
                page_title = soup.title.string.strip()
            elif soup.find("h1"):
                page_title = soup.find("h1").get_text().strip()
            else:
                page_title = url.split("//")[-1].split("?")[0].replace("/", " ").strip().title()

        main_elem = soup.find("article") or soup.find("main") or soup.find("div", {"id": "content"}) or soup.body

        pages_content = []
        full_text_blocks = []
        page_counter = 1

        if main_elem:
            for table_idx, tbl in enumerate(main_elem.find_all("table")):
                rows = []
                for tr in tbl.find_all("tr"):
                    cells = [td.get_text().strip().replace("\n", " ") for td in tr.find_all(["th", "td"])]
                    if any(cells):
                        rows.append(" | ".join(cells))
                if rows:
                    tbl.replace_with(f"\n[Table #{table_idx+1}]\n" + "\n".join(rows) + "\n")

            elements = main_elem.find_all(["h1", "h2", "h3", "p", "ul", "ol", "blockquote"])
            current_sec = "Introduction"
            cur_lines = []

            for el in elements:
                tag = el.name
                txt = el.get_text().strip()
                if not txt:
                    continue

                if tag in ["h1", "h2", "h3"]:
                    if cur_lines:
                        sec_text = "\n".join(cur_lines)
                        pages_content.append({
                            "page_number": page_counter,
                            "text": sec_text,
                            "section": current_sec
                        })
                        full_text_blocks.append(sec_text)
                        page_counter += 1
                        cur_lines = []
                    current_sec = txt
                    cur_lines.append(f"## {txt}")
                else:
                    cur_lines.append(txt)

            if cur_lines:
                sec_text = "\n".join(cur_lines)
                pages_content.append({
                    "page_number": page_counter,
                    "text": sec_text,
                    "section": current_sec
                })
                full_text_blocks.append(sec_text)

        full_text = "\n\n".join(full_text_blocks)
        if not full_text:
            full_text = soup.get_text(separator="\n", strip=True)
            pages_content = [{"page_number": 1, "text": full_text[:4000], "section": "Article Content"}]

        return {
            "title": page_title,
            "filename": f"Web: {page_title[:40]}",
            "file_path": url,
            "file_size": len(resp.content),
            "total_pages": max(1, len(pages_content)),
            "full_text": full_text,
            "pages": pages_content,
            "source_type": "url",
            "source_url": url,
            "multimodal_elements": [{"type": "web_article", "url": url}]
        }

    @classmethod
    def load_text_entry(cls, title: str, content: str) -> Dict[str, Any]:
        clean_content = content.strip()
        pages_content = []
        paragraphs = re.split(r"\n\s*\n", clean_content)
        page_counter = 1
        current_block = []

        for p in paragraphs:
            p_strip = p.strip()
            if not p_strip:
                continue
            current_block.append(p_strip)
            if len("\n".join(current_block)) > 1200:
                pages_content.append({
                    "page_number": page_counter,
                    "text": "\n\n".join(current_block),
                    "section": f"Section {page_counter}"
                })
                page_counter += 1
                current_block = []

        if current_block or not pages_content:
            pages_content.append({
                "page_number": page_counter,
                "text": "\n\n".join(current_block) if current_block else clean_content,
                "section": f"Section {page_counter}"
            })

        return {
            "title": title,
            "filename": f"Notes_{title.replace(' ', '_')[:30]}.txt",
            "file_path": "direct_text_entry",
            "file_size": len(clean_content.encode("utf-8")),
            "total_pages": len(pages_content),
            "full_text": clean_content,
            "pages": pages_content,
            "source_type": "text",
            "multimodal_elements": []
        }
