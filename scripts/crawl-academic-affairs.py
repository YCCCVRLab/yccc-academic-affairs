#!/usr/bin/env python3
import hashlib, json, os, re, time
from collections import deque
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse, urldefrag
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

START = "https://virtual.yccc.edu/academicAffairs"
HOST = "virtual.yccc.edu"
PREFIX = "/academicAffairs"
OUT = Path("migration/source")
MAX_PAGES = int(os.environ.get("MAX_PAGES", "500"))
DELAY = float(os.environ.get("CRAWL_DELAY", "0.8"))
UA = "YCCC-Academic-Affairs-Migration-Crawler/1.0 (+https://github.com/YCCCVRLab/yccc-academic-affairs)"

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.images=[]; self.forms=[]; self.iframes=[]; self.text=[]; self.in_script=0; self.in_style=0
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag in ("a","link") and a.get("href"): self.links.append(a["href"])
        if tag in ("img","source") and a.get("src"): self.images.append(a["src"])
        if tag=="form": self.forms.append({"action":a.get("action",""),"method":a.get("method","get"),"attrs":a})
        if tag in ("iframe","frame") and a.get("src"): self.iframes.append(a["src"])
        if tag=="script" and a.get("src"): self.links.append(a["src"])
        if tag=="script": self.in_script+=1
        if tag=="style": self.in_style+=1
    def handle_endtag(self, tag):
        if tag=="script" and self.in_script: self.in_script-=1
        if tag=="style" and self.in_style: self.in_style-=1
    def handle_data(self, data):
        if not self.in_script and not self.in_style and data.strip(): self.text.append(data.strip())

def norm(base, href):
    if not href or href.startswith(("mailto:","tel:","javascript:","data:","#")): return None
    u=urljoin(base, href); u,_=urldefrag(u); p=urlparse(u)
    return u if p.scheme in ("http","https") else None

def in_scope(u):
    p=urlparse(u); return p.hostname==HOST and (p.path==PREFIX or p.path.startswith(PREFIX+"/"))

def key_name(u, ext=""):
    p=urlparse(u); raw=(p.path.rstrip("/").replace(PREFIX,"",1).strip("/") or "home")
    raw=re.sub(r"[^A-Za-z0-9._-]+","_",raw)
    if p.query: raw += "__" + hashlib.sha1(p.query.encode()).hexdigest()[:10]
    return raw + ext

def fetch(u):
    req=Request(u, headers={"User-Agent":UA,"Accept":"text/html,application/xhtml+xml,application/pdf,image/*,*/*;q=0.8"})
    for attempt in range(5):
        try:
            with urlopen(req, timeout=30) as r: return r.status, r.headers.get("Content-Type",""), r.read()
        except HTTPError as e:
            if e.code in (429,500,502,503,504): time.sleep(min(30,2**attempt)); continue
            return e.code, e.headers.get("Content-Type",""), b""
        except (URLError,TimeoutError): time.sleep(min(30,2**attempt))
    return 0,"",b""

for d in (OUT, OUT/"pages", OUT/"assets"): d.mkdir(parents=True, exist_ok=True)
q=deque([START]); seen=set(); records=[]; asset_records=[]
while q and len(seen)<MAX_PAGES:
    u=q.popleft()
    if u in seen: continue
    seen.add(u); status,ctype,data=fetch(u)
    rec={"url":u,"status":status,"content_type":ctype,"links":[],"images":[],"forms":[],"iframes":[]}
    print("{} {} {} {}".format(len(seen),status,ctype,u),flush=True)
    if not data: records.append(rec); time.sleep(DELAY); continue
    path=urlparse(u).path.lower(); is_pdf=("pdf" in ctype.lower() or path.endswith(".pdf"))
    if is_pdf:
        dest=OUT/"assets"/key_name(u,".pdf"); dest.write_bytes(data); rec["saved_asset"]=str(dest)
        asset_records.append({"url":u,"type":"pdf","path":str(dest),"bytes":len(data)}); records.append(rec); time.sleep(DELAY); continue
    if "html" not in ctype.lower() and not path.endswith((".htm",".html","/")):
        ext=os.path.splitext(path)[1] or ".bin"; dest=OUT/"assets"/key_name(u,ext); dest.write_bytes(data); rec["saved_asset"]=str(dest)
        asset_records.append({"url":u,"type":ctype,"path":str(dest),"bytes":len(data)}); records.append(rec); time.sleep(DELAY); continue
    html=data.decode("utf-8","replace"); name=key_name(u,".html"); (OUT/"pages"/name).write_text(html,encoding="utf-8")
    parser=Parser(); parser.feed(html)
    rec["links"]=[x for x in (norm(u,h) for h in parser.links) if x]
    rec["images"]=[x for x in (norm(u,h) for h in parser.images) if x]
    rec["iframes"]=[x for x in (norm(u,h) for h in parser.iframes) if x]
    rec["forms"]=parser.forms
    m=re.search(r"<title[^>]*>(.*?)</title>",html,re.I|re.S); rec["title"]=(m.group(1).strip() if m else "")
    (OUT/"pages"/(name[:-5]+".txt")).write_text("\n".join(parser.text),encoding="utf-8")
    for x in rec["links"]+rec["iframes"]:
        if in_scope(x) and x not in seen: q.append(x)
    records.append(rec); time.sleep(DELAY)
downloaded=set()
for rec in records:
    for u in rec.get("images",[])+rec.get("links",[])+rec.get("iframes",[]):
        if u in downloaded: continue
        p=urlparse(u)
        if p.hostname!=HOST: continue
        if not (in_scope(u) or p.path.lower().endswith((".pdf",".png",".jpg",".jpeg",".gif",".webp",".svg"))): continue
        if p.path.lower().endswith((".pdf",".png",".jpg",".jpeg",".gif",".webp",".svg")):
            status,ctype,data=fetch(u)
            if data:
                ext=os.path.splitext(p.path)[1].lower() or ".bin"; dest=OUT/"assets"/key_name(u,ext); dest.write_bytes(data)
                asset_records.append({"url":u,"type":ctype,"path":str(dest),"bytes":len(data),"status":status})
        downloaded.add(u); time.sleep(DELAY)
manifest={"start_url":START,"host":HOST,"scope":PREFIX,"pages_crawled":len(records),"successful_pages":sum(1 for r in records if r["status"]==200),"records":records,"assets":asset_records,"generated":"GitHub Actions"}
(OUT/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
(OUT/"README.md").write_text("# Old Academic Affairs crawl\n\nStart: "+START+"\n\nScope: same-host URLs under `"+PREFIX+"`. Pages attempted: "+str(len(records))+"; successful: "+str(manifest["successful_pages"])+" .\n\nRaw HTML and extracted text are in `pages/`. Same-origin PDFs/images discovered from the crawl are in `assets/`. The manifest preserves URLs, links, forms, images, and iframe targets.\n",encoding="utf-8")
print("Crawl complete: {}/{} pages succeeded; {} assets saved.".format(manifest["successful_pages"],len(records),len(asset_records)),flush=True)