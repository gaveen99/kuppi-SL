# Kuppi Past Papers — DOE sync

Daily incremental scraper that pulls Sri Lankan Department of Examinations past papers
(GCE O/L, GCE A/L, Grade 5 Scholarship) from the official DOE CMS and hosts them on
this server at `/papers/<level>/<year>/<file>.pdf` for Kuppi students.

## What it does

- Hits the public DOE resources API: `https://doenets.lk/cms/api/resources?type=PAPA`
- Filters to O/L + A/L + Grade 5 by title pattern (skips Bhikshu training, government
  service exams, efficiency-bar exams, etc.)
- Downloads any PDF variants (Sinhala / Tamil / English) not already on disk
- Writes metadata to a local manifest **and** (optionally) to Firestore so Kuppi's
  Next.js app can list and filter the catalog
- Skips anything already downloaded (idempotent; safe to run daily)

**Source coverage at time of writing:** ~401 O/L + ~391 A/L + ~2 Grade 5 records on
the DOE CMS, each typically with 2-3 language variants. Expect ~1,500-2,400 PDFs after
the first full sync, ~6-12 GB total.

**Legal posture:** PDFs are sourced directly from the rights-holder's own public website
(Department of Examinations, Ministry of Education) and redistributed with attribution
and a takedown policy. This is the standard operating model for Sri Lankan educational
aggregators. See the platform's takedown email and policy page before going live.

## File layout

```
scripts/pastpapers/
├── sync_doenets.py         # the scraper
├── requirements.txt        # python deps
├── crontab.example         # cron schedule line
├── .env.example            # config template
├── README.md               # this file
├── nginx/
│   └── papers.conf         # nginx location block for /papers/
└── systemd/
    ├── kuppi-papers.service
    └── kuppi-papers.timer
```

## Deployment (one-time setup)

Assumes the kuppi repo lives at `/opt/kuppi` and you have a `kuppi` system user.

### 1. Install Python deps

```bash
sudo apt update && sudo apt install -y python3 python3-pip
sudo pip3 install -r /opt/kuppi/scripts/pastpapers/requirements.txt
```

### 2. Create the papers directory + log directory

```bash
sudo mkdir -p /var/kuppi/papers /var/log/kuppi
sudo chown -R kuppi:kuppi /var/kuppi /var/log/kuppi
sudo chmod 755 /var/kuppi/papers
```

### 3. Configure environment

```bash
cd /opt/kuppi/scripts/pastpapers
sudo -u kuppi cp .env.example .env
sudo -u kuppi nano .env       # paste FIREBASE_ADMIN_* values from kuppi web app .env.local
sudo chmod 600 .env
sudo chown kuppi:kuppi .env
```

### 4. First manual run (dry-run, then real)

```bash
sudo -u kuppi python3 /opt/kuppi/scripts/pastpapers/sync_doenets.py
# Reads the API, logs what it WOULD download. No files written.

sudo -u kuppi bash -c 'set -a; . /opt/kuppi/scripts/pastpapers/.env; set +a; \
  python3 /opt/kuppi/scripts/pastpapers/sync_doenets.py --apply --firestore --limit 5'
# Actually downloads the first 5 papers and pushes their metadata to Firestore.
# Verify they land at /var/kuppi/papers/al/2024/...pdf
```

If the test 5 look good, run the full sync once:

```bash
sudo -u kuppi bash -c 'set -a; . /opt/kuppi/scripts/pastpapers/.env; set +a; \
  python3 /opt/kuppi/scripts/pastpapers/sync_doenets.py --apply --firestore'
# Full sync. First run takes 30-60 min (downloading ~2,000 PDFs at 1.5s delay each).
# Subsequent daily runs finish in seconds — only new papers get fetched.
```

### 5. Nginx — serve `/papers/` from disk

Drop the location block into your `your-domain.com` server config:

```bash
sudo cp /opt/kuppi/scripts/pastpapers/nginx/papers.conf /etc/nginx/snippets/kuppi-papers.conf

# Then in your existing server { } block for your-domain.com, add:
#   include /etc/nginx/snippets/kuppi-papers.conf;

sudo nginx -t && sudo systemctl reload nginx
curl -I https://your-domain.com/papers/al/2024/...pdf   # should return 200 with Cache-Control: max-age=2592000
```

If you use Cloudflare's free DNS proxy in front of your-domain.com, the `Cache-Control: public,
max-age=2592000, immutable` header will make Cloudflare cache PDFs at the edge —
origin bandwidth drops by ~95% once a paper is warm.

### 6. Schedule the daily sync

**Option A — cron (simplest):**

```bash
sudo crontab -u kuppi -e
# Paste the line from scripts/pastpapers/crontab.example, then save.
```

**Option B — systemd timer (cleaner logs, easier to manage):**

```bash
sudo cp /opt/kuppi/scripts/pastpapers/systemd/kuppi-papers.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kuppi-papers.timer
sudo systemctl list-timers kuppi-papers.timer   # confirm scheduled
sudo journalctl -u kuppi-papers.service -f      # tail today's run
```

## Operational notes

### Monitoring

- `tail -f /var/log/kuppi/papers-sync.log` — full sync log
- `journalctl -u kuppi-papers.service -n 200` — systemd log
- `du -sh /var/kuppi/papers` — total disk used
- `find /var/kuppi/papers -name '*.pdf' | wc -l` — total papers on disk

### Manifest

`/var/kuppi/papers/.manifest.json` tracks `{ id → { sha256, sizeBytes, relPath, fetchedAt } }`
for every paper we've seen. It's the source of truth for "did we already download this".
Don't edit by hand; the script reads it before any download decision and writes it after.

If you wipe it and re-run, the script will see every paper as "new" but will skip
re-downloading any PDF already on disk (it just re-hashes them). Safe but slow.

### Firestore collection

Metadata lands in collection `pastPapers`, document id `doenets-<resourceId>-<lang>`,
e.g. `doenets-2335-si`. Fields are typed in `PaperRecord` in `sync_doenets.py`.

Suggested Firestore index for the Next.js app's filter UI:
- Composite: `(level ASC, year DESC, subject ASC, language ASC)`
- Composite: `(level ASC, year DESC)`

### Takedown handling

If the DOE or anyone else asks you to remove a paper:
1. Delete the file: `rm /var/kuppi/papers/<relPath>`
2. Delete the manifest entry: edit `.manifest.json` (remove the key)
3. Delete the Firestore doc: `pastPapers/<id>`
4. Add the resource ID to a future blocklist (TODO: implement `blocklist.json`)

### When DOE changes their API

This scraper depends on `https://doenets.lk/cms/api/resources?type=PAPA` returning JSON
with the shape `{ resources: [{ id, title:{en,si,ta}, tags:[{categoryCode,en/si/ta}],
links:[{link:{en,si,ta}}], created_date, ... }] }`. If that shape changes, the script
will either error or silently skip everything — check the log. The fix is usually a
small tweak to `build_records()`.

## Future expansion

- **e-thaksalawa.moe.gov.lk** — Ministry portal with additional model papers and
  Grade 5 content. Add a second sync script following the same pattern.
- **OCR pass** — Tesseract with Sinhala (`sin`) + Tamil (`tam`) traineddata for
  full-text search across older scanned papers.
- **Thumbnail generation** — PyMuPDF page-0 render → WebP thumbnails.
- **Meilisearch indexing** — Index extracted text into Meilisearch for typo-tolerant
  full-text search across all papers.
- **University past papers (DSpace OAI-PMH)** — separate path, ask for an MoU first.
