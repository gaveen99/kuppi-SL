#!/usr/bin/env python3
"""
sync_doenets.py — Daily incremental sync of Sri Lankan Department of Examinations past papers.

Source: https://doenets.lk (Department of Examinations Sri Lanka — Ministry of Education)
        Single JSON API at /cms/api/resources?type=PAPA returns all ~1,440 papers
        with year tags, trilingual titles, PDF links, and created/updated timestamps.

Scope: GCE O/L, GCE A/L, Grade 5 Scholarship only. Other exam types (Bhikshu training,
       government service exams, efficiency bar exams) are skipped.

Pipeline:
  1. Fetch the resources JSON (one request, no scraping)
  2. Filter to O/L | A/L | Grade 5 by title pattern
  3. For each (resource, language) combination with a PDF link:
       a. Build target path /var/kuppi/papers/<level>/<year>/<slug>-<lang>-<id>.pdf
       b. Skip if already on disk AND metadata exists in manifest with matching hash
       c. Otherwise download (polite delay), hash, write metadata
  4. Sync manifest to Firestore (optional — runs locally without if firebase-admin missing)

Run daily via cron. Idempotent — re-running only downloads new/changed papers.

Usage:
  python sync_doenets.py                  # default config, dry-run-ish (won't download)
  python sync_doenets.py --apply          # actually download
  python sync_doenets.py --apply --limit 10   # for testing
  python sync_doenets.py --apply --firestore  # also push to Firestore
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import re
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin

import requests

# -----------------------------------------------------------------------------
# Config
# -----------------------------------------------------------------------------

DOENETS_BASE = "https://doenets.lk"
RESOURCES_API = f"{DOENETS_BASE}/cms/api/resources?isEnabled=1&rowCount=0&type=PAPA"
USER_AGENT = "KuppiPastPapersBot/1.0 (+https://your-domain.com/bot; contact: admin@your-domain.com)"

PAPERS_ROOT = Path(os.environ.get("KUPPI_PAPERS_ROOT", "/var/kuppi/papers"))
MANIFEST_PATH = PAPERS_ROOT / ".manifest.json"
LOG_PATH = Path(os.environ.get("KUPPI_PAPERS_LOG", "/var/log/kuppi/papers-sync.log"))

REQUEST_TIMEOUT = 90        # seconds (doenets.lk API is consistently slow; ~32s for the full JSON)
DOWNLOAD_DELAY = 1.5        # seconds between PDF downloads (be polite)
MAX_DOWNLOAD_RETRIES = 3

LEVEL_PATTERNS = [
    ("al",     re.compile(r"G\.?C\.?E\.?\s*\(?\s*A[\s/.\\-]*L\s*\)?|Advanced\s+Level", re.I)),
    ("ol",     re.compile(r"G\.?C\.?E\.?\s*\(?\s*O[\s/.\\-]*L\s*\)?|Ordinary\s+Level", re.I)),
    ("grade5", re.compile(r"Grade\s*5|Scholarship|පහ\s*ශ්‍ර|5\s*ශ්‍ර", re.I)),
]

# Order matters — we check A/L before O/L (A/L titles often contain "Level" so could
# false-positive, but the explicit "A/L" check happens first).

SUBJECT_HINTS = [
    # Map title/description fragments to canonical subject names.
    # ORDER MATTERS — more specific patterns must come before more general ones
    # (e.g. "Combined Maths" before "Mathematics", "Design & Mechanical Technology"
    # before "Mechanical Technology", religion-specific before generic "Religion").

    # === Multi-word / specific subjects first ===
    (re.compile(r"Combined\s+Math(s|ematics)?|සංයුක්ත\s*ගණිතය", re.I), "Combined Maths"),
    (re.compile(r"General\s+English|සාමාන්‍ය\s*ඉංග්‍රීසි", re.I), "General English"),
    (re.compile(r"General\s+Information\s+Technology|\bGIT\b", re.I), "General Information Technology"),
    (re.compile(r"Common\s+General\s+Test", re.I), "Common General Test"),
    (re.compile(r"Information\s*(&|and)?\s*Communication\s*Technology|\bICT\b|තොරතුරු", re.I), "ICT"),

    # Technology subjects (OL technology stream + A/L engineering tech)
    (re.compile(r"Agriculture\s*(&|and)?\s*Food\s*Technology", re.I), "Agriculture & Food Technology"),
    (re.compile(r"Aquatic\s+Bioresources\s+Technology", re.I), "Aquatic Bioresources Technology"),
    (re.compile(r"Health\s*(&|and)?\s*Physical\s*Education|සෞඛ්‍ය\s*හා\s*ශාරීරික", re.I), "Health & Physical Education"),
    (re.compile(r"Communication\s*(&|and)?\s*Media\s*Studies", re.I), "Communication & Media Studies"),
    (re.compile(r"Design\s*,?\s*Electrical\s*(&|and)?\s*Electronic\s*Technology", re.I), "Electrical & Electronic Technology"),
    (re.compile(r"Design\s*(&|and)?\s*Mechanical\s*Technology", re.I), "Design & Mechanical Technology"),
    (re.compile(r"Design\s*(&|and)?\s*Construction\s*Technology", re.I), "Design & Construction Technology"),
    (re.compile(r"\bMechanical\s+Technology\b", re.I), "Mechanical Technology"),
    (re.compile(r"Engineering\s+Technology|ඉංජිනේරු\s*තාක්ෂණවේදය", re.I), "Engineering Technology"),
    (re.compile(r"Bio\s*System\s*Technology|ජෛව\s*පද්ධති", re.I), "Bio System Technology"),
    (re.compile(r"Bio[-\s]*Resource\s+Technology", re.I), "Bio-Resource Technology"),
    (re.compile(r"Civil\s+Technology", re.I), "Civil Technology"),
    (re.compile(r"Food\s+Technology", re.I), "Food Technology"),
    (re.compile(r"Agro[-\s]*Technology", re.I), "Agro Technology"),
    (re.compile(r"Design\s*(&|and)?\s*Technology", re.I), "Design & Technology"),
    (re.compile(r"Christian\s+Civili[sz]ation", re.I), "Christian Civilization"),
    (re.compile(r"Science\s+for\s+Technology|තාක්ෂණවේදය\s+සඳහා\s*විද්‍යාව", re.I), "Science for Technology"),

    # Commerce & humanities (specific before generic)
    (re.compile(r"Entrepreneurship\s+Studies|ව්‍යවසායකත්ව", re.I), "Entrepreneurship Studies"),
    (re.compile(r"Business\s+Statistics", re.I), "Business Statistics"),
    (re.compile(r"Business\s*Studies|ව්‍යාපාර\s*අධ්‍යයන", re.I), "Business Studies"),
    (re.compile(r"Logic\s*(&|and)?\s*Scientific\s*Method", re.I), "Logic & Scientific Method"),
    (re.compile(r"Civic(s)?\s*(Education)?|පුරවැසි", re.I), "Civic Education"),
    (re.compile(r"Political\s+Science|දේශපාලන\s*විද්‍යාව", re.I), "Political Science"),
    (re.compile(r"Home\s+Economics|නිවාස\s*ආර්ථිකය", re.I), "Home Economics"),
    (re.compile(r"\bSociology\b|සමාජ\s*විද්‍යාව", re.I), "Sociology"),
    (re.compile(r"\bPsychology\b|මනෝ\s*විද්‍යාව", re.I), "Psychology"),
    (re.compile(r"Greek\s*(&|and)?\s*Roo?man\s+Civili[sz]ation", re.I), "Greek & Roman Civilization"),
    (re.compile(r"\bAesthetics\b", re.I), "Aesthetics"),

    # Performing arts (specific variants before generic)
    (re.compile(r"Western\s+Music|පාශ්චාත්‍ය\s*සංගීත", re.I), "Western Music"),
    (re.compile(r"Oriental\s+Music|පෙරදිග\s*සංගීත", re.I), "Oriental Music"),
    (re.compile(r"Carnatic\s+Music", re.I), "Carnatic Music"),
    (re.compile(r"Dancing\s*\(\s*Bharata\s*\)|භරත\s*නාට්‍ය", re.I), "Dancing (Bharata)"),
    (re.compile(r"Dancing\s*\(\s*Oriental\s*\)|පෙරදිග\s*නැටුම්", re.I), "Dancing (Oriental)"),
    (re.compile(r"\bDrama\b|නාට්‍ය", re.I), "Drama"),
    (re.compile(r"Appreciation\s+of\s+\w+\s+Literary\s+Texts", re.I), "Literary Appreciation"),

    # Religious studies — broken out per faith (students search by their religion)
    (re.compile(r"Thri?pi?taka\s+Dharma", re.I), "Thripitaka Dharmaya"),
    (re.compile(r"\bBuddhism\b|බෞද්ධ", re.I), "Buddhism"),
    (re.compile(r"\bCatholicism\b|කතෝලික", re.I), "Catholicism"),
    (re.compile(r"\bChristianity\b|Christian\s+Religion|ක්‍රිස්තියානි", re.I), "Christianity"),
    (re.compile(r"\bIslam\b|Muslim\s+Religion|ඉස්ලාම්", re.I), "Islam"),
    (re.compile(r"\bSaivanery\b|\bHindu(ism)?\b|හින්දු|සෛවනේරි", re.I), "Saivanery"),
    (re.compile(r"Religious?\s+Studies|\bReligion\b|ආගම", re.I), "Religion"),

    # Sciences (after multi-word like Combined Maths)
    (re.compile(r"\bPhysics\b|භෞතික\s*විද්‍යාව", re.I), "Physics"),
    (re.compile(r"\bChemistry\b|රසායන\s*විද්‍යාව", re.I), "Chemistry"),
    (re.compile(r"\bBiology\b|ජීව\s*විද්‍යාව", re.I), "Biology"),
    (re.compile(r"Agricultural?(\s+Science)?|කෘෂිකර්ම", re.I), "Agriculture"),
    (re.compile(r"\bMathematic(s)?\b|ගණිතය", re.I), "Mathematics"),

    # Humanities
    (re.compile(r"\bAccounting\b|ගිණුම්කරණය", re.I), "Accounting"),
    (re.compile(r"\bEconomics\b|ආර්ථික\s*විද්‍යාව", re.I), "Economics"),
    (re.compile(r"\bGeography\b|භූගෝල\s*විද්‍යාව", re.I), "Geography"),
    (re.compile(r"\bHistory\b|ඉතිහාසය", re.I), "History"),

    # Arts (generic, after specific variants)
    (re.compile(r"\bMusic\b|සංගීත", re.I), "Music"),
    (re.compile(r"\bArt\b|චිත්‍ර", re.I), "Art"),
    (re.compile(r"\bDancing\b|නැටුම්", re.I), "Dancing"),

    # Languages (English etc. last so e.g. "English Literature" matches via the base)
    (re.compile(r"\bSinhala\b|සිංහල", re.I), "Sinhala"),
    (re.compile(r"\bTamil\b|දෙමළ", re.I), "Tamil"),
    (re.compile(r"\bPali\b|පාලි", re.I), "Pali"),
    (re.compile(r"\bSanskrit\b|සංස්කෘත", re.I), "Sanskrit"),
    (re.compile(r"\bHindi\b|හින්දි", re.I), "Hindi"),
    (re.compile(r"\bArabic\b|අරාබි", re.I), "Arabic"),
    (re.compile(r"\bJapanese\b|ජපාන", re.I), "Japanese"),
    (re.compile(r"\bChinese\b|චීන", re.I), "Chinese"),
    (re.compile(r"\bKorean\b|කොරියානු", re.I), "Korean"),
    (re.compile(r"\bRussian\b|රුසියානු", re.I), "Russian"),
    (re.compile(r"\bFrench\b|ප්‍රංශ", re.I), "French"),
    (re.compile(r"\bGerman\b|ජර්මන්", re.I), "German"),
    (re.compile(r"\bMalay\b|මැලේ", re.I), "Malay"),
    (re.compile(r"\bGreek\b", re.I), "Greek"),
    (re.compile(r"\bEnglish(\s+Language|\s+Lit(erature)?)?\b|ඉංග්‍රීසි", re.I), "English"),

    # Generic fallback last — many A/L titles just say "Science"
    (re.compile(r"\bScience\b|විද්‍යාව", re.I), "Science"),
]


# -----------------------------------------------------------------------------
# Data model
# -----------------------------------------------------------------------------

@dataclass
class PaperRecord:
    """One language-variant of one paper. This is what we save and what Firestore stores."""
    id: str                       # e.g. "doenets-2335-si"
    source: str                   # "doenets.lk"
    sourceResourceId: int
    level: str                    # "ol" | "al" | "grade5"
    year: int | None
    subject: str | None
    language: str                 # "en" | "si" | "ta"
    titleEn: str
    titleSi: str
    titleTa: str
    descriptionEn: str
    descriptionSi: str
    descriptionTa: str
    sourceUrl: str                # absolute URL to PDF on doenets.lk
    fileUrl: str                  # public URL on your-domain.com (/papers/...)
    relPath: str                  # relative to PAPERS_ROOT
    sha256: str = ""
    sizeBytes: int = 0
    createdDate: str = ""         # from API
    fetchedAt: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

def setup_logging() -> logging.Logger:
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    log = logging.getLogger("doenets-sync")
    log.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    fh = logging.FileHandler(LOG_PATH)
    fh.setFormatter(fmt)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    log.addHandler(fh)
    log.addHandler(sh)
    return log


def detect_level(title: str) -> str | None:
    for level, pat in LEVEL_PATTERNS:
        if pat.search(title):
            return level
    return None


def detect_subject(title: str, desc: str) -> str | None:
    text = f"{title} {desc}"
    for pat, name in SUBJECT_HINTS:
        if pat.search(text):
            return name
    return None


def detect_year(tags: list[dict]) -> int | None:
    # Prefer YEAR-category tag; fall back to first 4-digit numeric we find.
    year_tags = [t for t in tags if t.get("categoryCode") == "YEAR"]
    for t in year_tags:
        v = t.get("en") or t.get("si") or t.get("ta") or ""
        m = re.search(r"\b(19|20)\d{2}\b", v)
        if m:
            return int(m.group(0))
    for t in tags:
        v = t.get("en") or t.get("si") or t.get("ta") or ""
        m = re.search(r"\b(19|20)\d{2}\b", v)
        if m:
            return int(m.group(0))
    return None


def slugify(text: str, max_len: int = 60) -> str:
    text = re.sub(r"[඀-෿஀-௿]+", "", text)   # strip Sinhala / Tamil scripts
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:max_len] or "paper"


def load_manifest() -> dict:
    if MANIFEST_PATH.exists():
        try:
            return json.loads(MANIFEST_PATH.read_text())
        except json.JSONDecodeError:
            return {}
    return {}


def save_manifest(manifest: dict) -> None:
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = MANIFEST_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(manifest, indent=2, ensure_ascii=False, sort_keys=True))
    tmp.replace(MANIFEST_PATH)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# -----------------------------------------------------------------------------
# Core pipeline
# -----------------------------------------------------------------------------

def fetch_resources(log: logging.Logger) -> list[dict]:
    log.info("Fetching DOE resources API")
    r = requests.get(RESOURCES_API, headers={"User-Agent": USER_AGENT}, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    data = r.json()
    resources = data.get("resources") or []
    log.info("API returned %d total resources", len(resources))
    return resources


def build_records(resources: Iterable[dict], log: logging.Logger) -> list[PaperRecord]:
    out: list[PaperRecord] = []
    skipped_no_level = skipped_no_link = 0
    for r in resources:
        title_en = (r.get("title") or {}).get("en", "") or ""
        title_si = (r.get("title") or {}).get("si", "") or ""
        title_ta = (r.get("title") or {}).get("ta", "") or ""
        desc_en  = (r.get("description") or {}).get("en", "") or ""
        desc_si  = (r.get("description") or {}).get("si", "") or ""
        desc_ta  = (r.get("description") or {}).get("ta", "") or ""

        level = detect_level(f"{title_en} {title_si} {title_ta}")
        if not level:
            skipped_no_level += 1
            continue

        year = detect_year(r.get("tags") or [])
        subject = detect_subject(f"{title_en} {desc_en}", f"{title_si} {desc_si}")

        links = r.get("links") or []
        if not links:
            skipped_no_link += 1
            continue

        rid = r.get("id")
        created = r.get("created_date", "")

        for link in links:
            link_paths = link.get("link") or {}
            for lang in ("en", "si", "ta"):
                rel = (link_paths.get(lang) or "").strip()
                if not rel:
                    continue
                source_url = urljoin(DOENETS_BASE, rel)
                slug = slugify(title_en or title_si or f"paper-{rid}")
                fname = f"{slug}-{rid}-{lang}.pdf"
                rel_path = f"{level}/{year or 'unknown'}/{fname}"
                out.append(PaperRecord(
                    id=f"doenets-{rid}-{lang}",
                    source="doenets.lk",
                    sourceResourceId=rid,
                    level=level,
                    year=year,
                    subject=subject,
                    language=lang,
                    titleEn=title_en, titleSi=title_si, titleTa=title_ta,
                    descriptionEn=desc_en, descriptionSi=desc_si, descriptionTa=desc_ta,
                    sourceUrl=source_url,
                    fileUrl=f"/papers/{rel_path}",
                    relPath=rel_path,
                    createdDate=created,
                ))
    log.info("Filtered to %d in-scope paper variants (O/L + A/L + Grade 5); skipped %d for level, %d for no link",
             len(out), skipped_no_level, skipped_no_link)
    return out


def download_paper(record: PaperRecord, log: logging.Logger) -> bool:
    """Download one PDF. Returns True if a new file was written, False if skipped."""
    target = PAPERS_ROOT / record.relPath
    target.parent.mkdir(parents=True, exist_ok=True)

    if target.exists() and target.stat().st_size > 0:
        record.sizeBytes = target.stat().st_size
        record.sha256 = sha256_file(target)
        return False

    for attempt in range(1, MAX_DOWNLOAD_RETRIES + 1):
        try:
            r = requests.get(
                record.sourceUrl,
                headers={"User-Agent": USER_AGENT},
                timeout=REQUEST_TIMEOUT,
                stream=True,
            )
            r.raise_for_status()
            tmp = target.with_suffix(".pdf.part")
            with tmp.open("wb") as f:
                for chunk in r.iter_content(1 << 16):
                    if chunk:
                        f.write(chunk)
            tmp.replace(target)
            record.sizeBytes = target.stat().st_size
            record.sha256 = sha256_file(target)
            return True
        except Exception as e:
            log.warning("Download failed (attempt %d/%d) for %s: %s",
                        attempt, MAX_DOWNLOAD_RETRIES, record.sourceUrl, e)
            time.sleep(2 ** attempt)
    log.error("Giving up on %s", record.sourceUrl)
    return False


def maybe_push_firestore(records: list[PaperRecord], log: logging.Logger) -> int:
    """Push to Firestore if credentials present. Returns number written."""
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
    except ImportError:
        log.info("firebase-admin not installed — skipping Firestore push (set up locally only)")
        return 0

    project_id = os.environ.get("FIREBASE_ADMIN_PROJECT_ID")
    client_email = os.environ.get("FIREBASE_ADMIN_CLIENT_EMAIL")
    private_key = os.environ.get("FIREBASE_ADMIN_PRIVATE_KEY", "").replace("\\n", "\n")
    if not (project_id and client_email and private_key):
        log.info("Firebase Admin env vars not set — skipping Firestore push")
        return 0

    if not firebase_admin._apps:
        # google-auth requires token_uri; older firebase-admin defaulted it but
        # current versions reject the dict if it's missing.
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": project_id,
            "client_email": client_email,
            "private_key": private_key,
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        firebase_admin.initialize_app(cred)
    db = firestore.client()

    BATCH_SIZE = 400
    written = 0
    batch = db.batch()
    for i, rec in enumerate(records, 1):
        ref = db.collection("pastPapers").document(rec.id)
        batch.set(ref, asdict(rec), merge=True)
        if i % BATCH_SIZE == 0:
            batch.commit()
            batch = db.batch()
            log.info("Firestore: committed %d / %d", i, len(records))
    batch.commit()
    written = len(records)
    log.info("Firestore: wrote %d documents to pastPapers", written)
    return written


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--apply", action="store_true", help="Actually download files (default: dry-run)")
    p.add_argument("--firestore", action="store_true", help="Push metadata to Firestore")
    p.add_argument("--limit", type=int, default=0, help="Stop after N new downloads (testing)")
    p.add_argument("--root", type=str, default="", help="Override KUPPI_PAPERS_ROOT")
    args = p.parse_args(argv)

    if args.root:
        global PAPERS_ROOT, MANIFEST_PATH
        PAPERS_ROOT = Path(args.root)
        MANIFEST_PATH = PAPERS_ROOT / ".manifest.json"

    log = setup_logging()
    started = time.time()
    log.info("=" * 60)
    log.info("doenets.lk sync starting (apply=%s, firestore=%s, root=%s)",
             args.apply, args.firestore, PAPERS_ROOT)

    PAPERS_ROOT.mkdir(parents=True, exist_ok=True)

    try:
        resources = fetch_resources(log)
    except Exception as e:
        log.error("Failed to fetch resources API: %s", e)
        return 2

    records = build_records(resources, log)

    manifest = load_manifest()
    downloaded = skipped = 0

    for rec in records:
        seen = manifest.get(rec.id)
        if seen and seen.get("sha256") and (PAPERS_ROOT / rec.relPath).exists():
            rec.sha256 = seen["sha256"]
            rec.sizeBytes = seen.get("sizeBytes", 0)
            skipped += 1
            continue

        if not args.apply:
            log.info("[dry-run] would download %s", rec.sourceUrl)
            continue

        new = download_paper(rec, log)
        if new:
            downloaded += 1
            log.info("Downloaded %s (%s bytes)", rec.relPath, rec.sizeBytes)
            time.sleep(DOWNLOAD_DELAY)
        else:
            skipped += 1

        manifest[rec.id] = {
            "sha256": rec.sha256,
            "sizeBytes": rec.sizeBytes,
            "relPath": rec.relPath,
            "fetchedAt": rec.fetchedAt,
        }

        if args.limit and downloaded >= args.limit:
            log.info("--limit %d reached, stopping", args.limit)
            break

    if args.apply:
        save_manifest(manifest)

    log.info("Summary: %d downloaded, %d skipped/already-present, %d total records",
             downloaded, skipped, len(records))

    if args.apply and args.firestore:
        maybe_push_firestore(records, log)

    log.info("Done in %.1fs", time.time() - started)
    return 0


if __name__ == "__main__":
    sys.exit(main())
