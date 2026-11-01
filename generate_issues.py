#!/usr/bin/env python3
"""GitHub Issues → md/公开/issues/（写 issue 打 label「公开」即上门户，sl1673495/blogs 同款通道）"""
import json, os, re, urllib.request

REPO = os.environ.get("GITHUB_REPOSITORY", "DandanLLab/blog")
TOKEN = os.environ.get("GITHUB_TOKEN", "")
OUT = os.path.join("md", "公开", "issues")
LABEL = "公开"

def api(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": "kb-issues-sync",
        "Accept": "application/vnd.github+json",
        **({"Authorization": "Bearer " + TOKEN} if TOKEN else {}),
    })
    return json.load(urllib.request.urlopen(req, timeout=30))

def main():
    os.makedirs(OUT, exist_ok=True)
    issues = api("https://api.github.com/repos/%s/issues?state=open&labels=%s&per_page=50" % (REPO, LABEL))
    keep = set()
    for it in issues:
        if "pull_request" in it:
            continue
        num = it["number"]
        slug = re.sub(r"[\s/\\:*?\"<>|]+", "-", it["title"]).strip("-")[:40] or "issue"
        fn = os.path.join(OUT, "%03d-%s.md" % (num, slug))
        created = (it.get("created_at") or "")[:19].replace("T", " ")
        body = (it.get("body") or "").replace("\r\n", "\n")
        fm = "---\ntitle: %s\ntype: record\ndate: %s\ntags: [issue, 门户直发]\n---\n\n" % (
            it["title"].replace('"', "'"), created)
        open(fn, "w", encoding="utf-8", newline="\n").write(
            fm + body + "\n\n> 来自 GitHub Issue #%d · %s\n" % (num, it.get("html_url", "")))
        keep.add(os.path.basename(fn))
    for f in os.listdir(OUT):
        if f.endswith(".md") and f not in keep:
            os.remove(os.path.join(OUT, f))
    print("issues synced:", len(keep))

main()
