#!/usr/bin/env python3
import json, re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
ROOT=Path("migration/source"); PAGES=ROOT/"pages"
class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.links=[]; self.images=[]; self.iframes=[]; self.forms=[]; self.headings=[]; self.text=[]; self._heading=None; self.in_script=0; self.in_style=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag in ("a","link") and a.get("href"): self.links.append((a.get("href"),""))
        if tag in ("img","source") and a.get("src"): self.images.append(a.get("src"))
        if tag in ("iframe","frame") and a.get("src"): self.iframes.append(a.get("src"))
        if tag=="form": self.forms.append({"action":a.get("action",""),"method":a.get("method","get"),"id":a.get("id",""),"name":a.get("name","")})
        if tag=="script":
            if a.get("src"): self.links.append((a.get("src"),"[script]"))
            self.in_script+=1
        if tag=="style": self.in_style+=1
        if tag in ("h1","h2","h3","h4","h5","h6") and not self.in_script and not self.in_style: self._heading=tag
    def handle_endtag(self,tag):
        if tag=="script" and self.in_script: self.in_script-=1
        if tag=="style" and self.in_style: self.in_style-=1
        if self._heading==tag: self._heading=None
    def handle_data(self,data):
        s=" ".join(data.split())
        if not s or self.in_script or self.in_style: return
        self.text.append(s)
        if self._heading: self.headings.append({"level":int(self._heading[1]),"text":s})
def absurl(base,u):
    if not u or u.startswith(("#","mailto:","tel:","javascript:","data:")): return None
    return urljoin(base,u)
manifest=json.loads((ROOT/"manifest.json").read_text(encoding="utf-8")); pages=[]; domains=Counter(); types=Counter(); all_urls=set()
for html_file in sorted(PAGES.glob("*.html")):
    html=html_file.read_text(encoding="utf-8",errors="replace"); p=Parser(); p.feed(html); url=""
    for rec in manifest.get("records",[]):
        if rec.get("saved_asset")==str(html_file): url=rec.get("url",""); break
    title=re.search(r"<title[^>]*>(.*?)</title>",html,re.I|re.S); title=" ".join(re.sub("<[^>]+>"," ",title.group(1)).split()) if title else ""
    links=[]
    for href,label in p.links:
        u=absurl(url,href)
        if not u: continue
        all_urls.add(u); domains[urlparse(u).netloc]+=1; path=urlparse(u).path.lower(); kind="page"
        if path.endswith(".pdf") or "/ld.php" in path: kind="document"
        elif path.endswith((".png",".jpg",".jpeg",".gif",".webp",".svg")): kind="image"
        elif "/sb.php" in path or "/srch.php" in path: kind="search/index"
        elif urlparse(u).netloc!="virtual.yccc.edu": kind="external"
        types[kind]+=1; links.append({"url":u,"label":label,"kind":kind})
    images=[absurl(url,x) for x in p.images if absurl(url,x)]; iframes=[absurl(url,x) for x in p.iframes if absurl(url,x)]
    for u in images+iframes: all_urls.add(u); domains[urlparse(u).netloc]+=1
    pages.append({"source_file":str(html_file),"url":url,"title":title,"headings":p.headings,"text_file":str(html_file.with_suffix(".txt")),"links":links,"images":images,"iframes":iframes,"forms":p.forms})
(ROOT/"migration-inventory.json").write_text(json.dumps({"pages":pages,"page_count":len(pages),"unique_urls":len(all_urls),"domains":dict(domains),"link_types":dict(types)},indent=2),encoding="utf-8")
md=["# Academic Affairs migration inventory","",f"Pages extracted: {len(pages)}","","## Page inventory",""]
for p in pages:
    md.append(f"### {p['title'] or p['url']}"); md.append(f"- Source: {p['source_file']}"); md.append(f"- URL: {p['url']}"); md.append(f"- Links: {len(p['links'])}; images: {len(p['images'])}; embedded frames: {len(p['iframes'])}; forms: {len(p['forms'])}")
    docs=[x["url"] for x in p["links"] if x["kind"]=="document"]; ext=[x["url"] for x in p["links"] if x["kind"]=="external"]
    if docs: md.append("- Documents:"); md.extend(["  - "+x for x in docs])
    if ext: md.append("- External resources:"); md.extend(["  - "+x for x in ext])
    md.append("")
md += ["## External domains",""]; md.extend([f"- {d} — {n} references" for d,n in domains.most_common()])
(ROOT/"MIGRATION-INVENTORY.md").write_text("\n".join(md)+"\n",encoding="utf-8"); print(f"Inventory complete: {len(pages)} pages, {len(all_urls)} unique URLs.")