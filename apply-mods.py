# -*- coding: utf-8 -*-
"""博客魔改 B1-B3：搜索+归档时间轴+暗色+回顶+打赏重排+Issues 通道（参考 blog-vue-typescript / sl1673495 / hugo-terminal）"""
import io, os, json

R = os.path.dirname(os.path.abspath(__file__))
os.chdir(R)

# ── 1. index.html：工具栏 + 归档视图 + 回顶按钮 ──
html = io.open('index.html', encoding='utf-8').read()
if 'search-input' not in html:
    toolbar = '''        <div class="kb-toolbar">
            <div class="search-wrap">
                <input type="search" id="search-input" class="search-input" placeholder="搜索文章…（标题/正文/标签）" autocomplete="off">
                <div class="search-results" id="search-results" style="display:none"></div>
            </div>
            <div class="toolbar-actions">
                <button id="archive-btn" class="tool-btn" title="归档时间轴">🗂 归档</button>
                <button id="theme-btn" class="tool-btn" title="明暗切换">🌙</button>
            </div>
        </div>
        <nav class="main-nav" id="nav"></nav>
'''
    html = html.replace('        <nav class="main-nav" id="nav"></nav>\n', toolbar, 1)
    html = html.replace('            <section class="post-list" id="postList"></section>',
        '            <section class="post-list" id="postList"></section>\n'
        '            <section class="archive-view" id="archiveView" style="display:none"></section>', 1)
    html = html.replace('</body>',
        '    <button id="backTop" class="back-top" title="回到顶部" style="display:none">↑</button>\n</body>', 1)
    io.open('index.html', 'w', encoding='utf-8', newline='\n').write(html)
    print('index.html: toolbar+archive+backtop ok')

# ── 2. blog.css：变量暗色 + 工具栏 + 搜索 + 时间轴 + 回顶 + 打赏重排 ──
css = io.open('blog.css', encoding='utf-8').read()
if 'data-theme' not in css:
    css += '''
/* ═══ 魔改层：暗色 / 搜索 / 归档时间轴 / 回顶 / 打赏重排 ═══ */
[data-theme="dark"] {
  --primary-color: #8ab4f8;
  --secondary-color: #9aa0a6;
  --accent-color: #f28b82;
  --bg-color: #101418;
  --text-color: #e2e6ea;
}
[data-theme="dark"] body { background-color: var(--bg-color); color: var(--text-color); }
[data-theme="dark"] .main-nav,
[data-theme="dark"] .post-item,
[data-theme="dark"] .post-detail,
[data-theme="dark"] .markdown-body,
[data-theme="dark"] .site-footer,
[data-theme="dark"] .search-input,
[data-theme="dark"] .tool-btn,
[data-theme="dark"] .search-results { background: #1a1f26; color: var(--text-color); border-color: #2a313a; }
[data-theme="dark"] .post-item a,
[data-theme="dark"] .markdown-body h1, [data-theme="dark"] .markdown-body h2,
[data-theme="dark"] .markdown-body h3, [data-theme="dark"] .markdown-body a { color: var(--text-color); }
[data-theme="dark"] .markdown-body { background: transparent; }
[data-theme="dark"] .site-title { color: var(--text-color); }
[data-theme="dark"] .search-input::placeholder { color: #6b7480; }
[data-theme="dark"] img { filter: brightness(.92); }

.kb-toolbar { display: flex; gap: 12px; align-items: center; justify-content: space-between;
  margin: 14px 0 4px; flex-wrap: wrap; }
.search-wrap { position: relative; flex: 1; min-width: 220px; max-width: 460px; }
.search-input { width: 100%; padding: 8px 14px; border: 1px solid #dde2e8; border-radius: 8px;
  font-size: 14px; outline: none; background: #fff; color: inherit; transition: border .2s, box-shadow .2s; }
.search-input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(44,62,80,.08); }
.search-results { position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 50;
  background: #fff; border: 1px solid #e2e7ee; border-radius: 10px; overflow: hidden;
  max-height: 380px; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,.12); }
.search-hit { padding: 10px 14px; cursor: pointer; border-bottom: 1px solid #f0f3f7; }
.search-hit:last-child { border-bottom: none; }
.search-hit:hover, .search-hit.active { background: #f3f6fa; }
.search-hit .hit-title { font-weight: 600; font-size: 14px; color: var(--text-color); }
.search-hit .hit-snip { font-size: 12.5px; color: #7a8593; margin-top: 3px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.search-hit mark { background: rgba(231,76,60,.18); color: var(--accent-color); padding: 0 2px; border-radius: 3px; }
.search-empty { padding: 14px; text-align: center; color: #8a94a0; font-size: 13px; }
.toolbar-actions { display: flex; gap: 8px; }
.tool-btn { padding: 7px 13px; border: 1px solid #dde2e8; background: #fff; color: var(--text-color);
  border-radius: 8px; cursor: pointer; font-size: 13.5px; transition: all .2s; }
.tool-btn:hover { border-color: var(--primary-color); color: var(--primary-color); }

.archive-view { background: #fff; border-radius: var(--border-radius); padding: 26px 30px 30px;
  box-shadow: 0 1px 4px rgba(0,0,0,.05); }
.archive-title { font-size: 21px; font-weight: 700; margin: 0 0 20px; color: var(--text-color); }
.tl-year { font-size: 19px; font-weight: 700; color: var(--primary-color); margin: 18px 0 6px; }
.tl-month { font-size: 14px; font-weight: 600; color: var(--secondary-color); margin: 12px 0 4px 4px; }
.tl-list { list-style: none; margin: 0 0 4px; padding: 0 0 0 16px; border-left: 2px solid #e6ebf1; }
[data-theme="dark"] .tl-list { border-left-color: #2a313a; }
.tl-item { position: relative; padding: 5px 0 5px 4px; font-size: 14.5px; }
.tl-item::before { content: ""; position: absolute; left: -21px; top: 12px; width: 8px; height: 8px;
  border-radius: 50%; background: var(--primary-color); opacity: .75; }
.tl-item a { color: var(--text-color); text-decoration: none; }
.tl-item a:hover { color: var(--primary-color); }
.tl-date { color: #8a94a0; font-size: 12.5px; margin-right: 10px; font-variant-numeric: tabular-nums; }

.back-top { position: fixed; right: 26px; bottom: 30px; z-index: 80; width: 42px; height: 42px;
  border: none; border-radius: 50%; background: var(--primary-color); color: #fff; font-size: 18px;
  cursor: pointer; opacity: .82; transition: all .25s; box-shadow: 0 4px 14px rgba(0,0,0,.18); }
.back-top:hover { opacity: 1; transform: translateY(-2px); }

/* 打赏重排（师父模块） */
#donateButton { width: 58px; height: 58px; line-height: 58px; font-size: 26px; color: #fff;
  background: linear-gradient(135deg, #ff9a44, #e74c3c); border: none; border-radius: 50%;
  box-shadow: 0 6px 18px rgba(231,76,60,.35); cursor: pointer; transition: transform .2s, box-shadow .2s; }
#donateButton:hover { transform: scale(1.08) rotate(3deg); box-shadow: 0 8px 24px rgba(231,76,60,.45); }
#donateModal .modal-content { border-radius: 14px; border: none; box-shadow: 0 20px 60px rgba(0,0,0,.28); }
#donateModal .qr-code img { border-radius: 10px; border: 1px solid #f0e6d8; }
'''
    io.open('blog.css', 'w', encoding='utf-8', newline='\n').write(css)
    print('blog.css: mod layer ok')

# ── 3. blog.js：搜索/主题/归档/回顶 四件套（prototype 注入） ──
js = io.open('blog.js', encoding='utf-8').read()
if 'initSearch' not in js:
    js = js.replace('var blog_title = "天天的小站 | 玄蛋秘阁 ";',
        'var blog_title = "蛋蛋知识库 | DandanLLab 公开知识门户";')
    hook = 'this.initEventListeners();'
    assert hook in js
    js = js.replace(hook, hook + '\n            this.initSearch(); this.initTheme(); this.initArchive(); this.initBackTop();', 1)
    mods = r'''
/* ═══ 魔改层：搜索 / 暗色 / 归档时间轴 / 回顶（StaticBlog.prototype 注入）═══ */
Object.assign(StaticBlog.prototype, {
  initSearch() {
    const input = document.getElementById('search-input');
    const box = document.getElementById('search-results');
    if (!input || !box) return;
    let timer = null;
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => this.doSearch(input.value.trim()), 160);
    });
    input.addEventListener('keydown', (e) => {
      const hits = [...box.querySelectorAll('.search-hit')];
      if (!hits.length) return;
      let i = hits.findIndex(h => h.classList.contains('active'));
      if (e.key === 'ArrowDown') { e.preventDefault(); i = Math.min(i + 1, hits.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); i = Math.max(i - 1, 0); }
      else if (e.key === 'Enter') { e.preventDefault(); (hits[Math.max(i, 0)] || hits[0]).click(); return; }
      else return;
      hits.forEach(h => h.classList.remove('active'));
      hits[i].classList.add('active');
      hits[i].scrollIntoView({ block: 'nearest' });
    });
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-wrap')) box.style.display = 'none';
    });
  },
  doSearch(q) {
    const box = document.getElementById('search-results');
    if (!q || q.length < 1) { box.style.display = 'none'; return; }
    const kw = q.toLowerCase();
    const scored = [];
    for (const p of this.state.allPosts) {
      const title = (p.title || '').toLowerCase();
      const content = (p.content || '').toLowerCase();
      const tags = (p.tags || []).join(' ').toLowerCase();
      let score = 0;
      if (title.includes(kw)) score += 100;
      if (tags.includes(kw)) score += 40;
      const at = content.indexOf(kw);
      if (at >= 0) { score += 10 + (1000 - Math.min(at, 1000)) / 200; }
      if (score > 0) scored.push({ p, score, at });
    }
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 8);
    if (!top.length) {
      box.innerHTML = '<div class="search-empty">没有找到「' + q.replace(/</g, '&lt;') + '」相关文章</div>';
      box.style.display = 'block'; return;
    }
    box.innerHTML = top.map(({ p, at }) => {
      const src = p.content || '';
      let snip = '';
      if (at >= 0) {
        const start = Math.max(0, at - 18);
        snip = (start > 0 ? '…' : '') + src.slice(start, at + 48) + '…';
      } else {
        snip = src.slice(0, 66) + '…';
      }
      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const hl = t => esc(t).replace(new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        m => '<mark>' + m + '</mark>');
      return '<div class="search-hit" data-path="' + esc(p.path || '') + '">' +
        '<div class="hit-title">' + hl(p.title || '') + '</div>' +
        '<div class="hit-snip">' + hl(snip) + '</div></div>';
    }).join('');
    box.style.display = 'block';
    box.querySelectorAll('.search-hit').forEach(el => {
      el.addEventListener('click', () => {
        box.style.display = 'none';
        document.getElementById('search-input').value = '';
        const path = el.getAttribute('data-path');
        const post = this.state.allPosts.find(x => x.path === path);
        if (post) this.showPost(post);
      });
    });
  },
  initTheme() {
    const btn = document.getElementById('theme-btn');
    const saved = localStorage.getItem('kb-theme');
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(saved || (prefers ? 'dark' : 'light'), false);
    if (btn) btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme');
      this.applyTheme(cur === 'dark' ? 'light' : 'dark', true);
    });
  },
  applyTheme(mode, save) {
    document.documentElement.setAttribute('data-theme', mode);
    const btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = mode === 'dark' ? '☀️' : '🌙';
    if (save) localStorage.setItem('kb-theme', mode);
  },
  initArchive() {
    const btn = document.getElementById('archive-btn');
    if (btn) btn.addEventListener('click', () => {
      const v = document.getElementById('archiveView');
      if (v.style.display === 'none') { this.showArchive(); history.pushState(null, '', '?view=archive'); }
      else { this.hideArchive(); history.pushState(null, '', location.pathname); }
    });
    const params = new URLSearchParams(location.search);
    if (params.get('view') === 'archive') this.showArchive();
  },
  showArchive() {
    const v = document.getElementById('archiveView');
    const list = document.getElementById('postList');
    if (!v) return;
    list.style.display = 'none';
    const groups = {};
    for (const p of this.state.allPosts) {
      const d = (p.created || '').slice(0, 7);
      if (!d) continue;
      (groups[d] = groups[d] || []).push(p);
    }
    const keys = Object.keys(groups).sort().reverse();
    let html2 = '<h2 class="archive-title">🗂 归档时间轴 · 共 ' + this.state.allPosts.length + ' 篇</h2>';
    for (const k of keys) {
      const [y, m] = k.split('-');
      html2 += '<div class="tl-month">' + y + ' 年 ' + Number(m) + ' 月 · ' + groups[k].length + ' 篇</div>';
      html2 += '<ul class="tl-list">' + groups[k].map(p =>
        '<li class="tl-item"><span class="tl-date">' + (p.created || '').slice(5, 10) + '</span>' +
        '<a href="?path=' + encodeURIComponent(p.path || '') + '" data-arch-path="' +
        (p.path || '').replace(/"/g, '&quot;') + '">' + (p.title || '无题') + '</a></li>').join('') + '</ul>';
    }
    v.innerHTML = html2;
    v.style.display = 'block';
    window.scrollTo(0, 0);
    v.querySelectorAll('.tl-item a').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const path = a.getAttribute('data-arch-path');
        const post = this.state.allPosts.find(x => x.path === path);
        if (post) this.showPost(post);
      });
    });
  },
  hideArchive() {
    const v = document.getElementById('archiveView');
    if (v) v.style.display = 'none';
    const list = document.getElementById('postList');
    if (list) list.style.display = '';
  },
  initBackTop() {
    const btn = document.getElementById('backTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.style.display = window.scrollY > 420 ? 'block' : 'none';
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
});
'''
    js = js.rstrip() + '\n' + mods
    io.open('blog.js', 'w', encoding='utf-8', newline='\n').write(js)
    print('blog.js: search/theme/archive/backtop ok')

# ── 4. generate_issues.py：GitHub Issues 内容通道（sl1673495 图案） ──
if not os.path.exists('generate_issues.py'):
    issues_py = '''#!/usr/bin/env python3
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
        slug = re.sub(r"[\\s/\\\\:*?\\"<>|]+", "-", it["title"]).strip("-")[:40] or "issue"
        fn = os.path.join(OUT, "%03d-%s.md" % (num, slug))
        created = (it.get("created_at") or "")[:19].replace("T", " ")
        body = (it.get("body") or "").replace("\\r\\n", "\\n")
        fm = "---\\ntitle: %s\\ntype: record\\ndate: %s\\ntags: [issue, 门户直发]\\n---\\n\\n" % (
            it["title"].replace('"', "'"), created)
        open(fn, "w", encoding="utf-8", newline="\\n").write(
            fm + body + "\\n\\n> 来自 GitHub Issue #%d · %s\\n" % (num, it.get("html_url", "")))
        keep.add(os.path.basename(fn))
    for f in os.listdir(OUT):
        if f.endswith(".md") and f not in keep:
            os.remove(os.path.join(OUT, f))
    print("issues synced:", len(keep))

main()
'''
    io.open('generate_issues.py', 'w', encoding='utf-8', newline='\n').write(issues_py)
    print('generate_issues.py written')

# ── 5. workflow：Issues 拉取步骤 + 触发路径 ──
wf_path = '.github/workflows/auto_generate_blog.yml'
wf = io.open(wf_path, encoding='utf-8').read()
if 'generate_issues.py' not in wf:
    wf = wf.replace("      - 'md/**'", "      - 'md/**'\n      - 'generate_issues.py'")
    wf = wf.replace("""        python generate_blog.py""",
        """        python generate_issues.py\n        python generate_blog.py""")
    wf = wf.replace("""      run: |
        python generate_blog.py""",
        """      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
      run: |
        python generate_issues.py
        python generate_blog.py""")
    io.open(wf_path, 'w', encoding='utf-8', newline='\n').write(wf)
    print('workflow: issues step ok')

print('ALL B-LINE MODS APPLIED')
