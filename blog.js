/* blog.js · 蛋蛋知识库 v2
   数据源不变：data/meta.json + data/page_N.json + md/*.md
   行为不变：?path= 路由 / 分类标签归档筛选 / 暗色 / 回顶 / 打赏 / 代码复制 / MathJax
   新增：统计行 / 目录(TOC)+滚动高亮 / 相关推荐 / 阅读进度 / Ctrl+K / 打印 */

var blog_title = "蛋蛋知识库 | DandanLLab 公开知识门户";

class StaticBlog {
    constructor() {
        this.config = {
            metaUrl: 'data/meta.json',
            mdBasePath: '/md/'
        };

        this.dom = {};
        this.state = {
            allPosts: [],
            meta: null,
            currentFilter: { type: 'all', value: null },
            activeNavItem: null,
            pagination: { pageSize: 10, isLoading: false },
            currentPost: null
        };

        this.isMobile = window.innerWidth <= 768;
    }

    cacheDom() {
        const ids = ['nav', 'postList', 'postDetail', 'postLayout', 'articleTitle', 'articleContent',
            'backButton', 'copySuccess', 'articleCategory', 'articleCreated', 'articleTags',
            'loading', 'statsLine', 'tocPanel', 'tocList', 'tocCount', 'related'];
        ids.forEach(id => {
            const key = id.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            this.dom[key] = document.getElementById(id);
        });
    }

    async init() {
        try {
            this.cacheDom();
            this.ensureMathJax();
            await this.loadInitialData();
            this.renderStats();
            this.initRouter();
            this.initNavigation();
            this.initEventListeners();
            this.initSearch();
            this.initTheme();
            this.initArchive();
            this.initBackTop();
            this.initProgress();
            this.initShortcuts();
            this.handleRouting();
        } catch (error) {
            this.showError('初始化失败: ' + error.message);
        }
    }

    ensureMathJax() {
        if (window.MathJax) return;
        const script = document.createElement("script");
        script.src = "./libs/mathjax/es5/tex-mml-chtml.js";
        script.async = true;
        document.head.appendChild(script);
    }

    /* ── 数据 ── */
    async loadInitialData() {
        const metaResponse = await fetch(this.config.metaUrl);
        if (!metaResponse.ok) throw new Error('元数据加载失败');
        const meta = await metaResponse.json();
        this.state.meta = meta;

        const pages = [];
        for (let page = 1; page <= meta.page_count; page++) {
            pages.push(this.loadPage(page));
        }
        const results = await Promise.all(pages);
        this.state.allPosts = results.filter(Boolean).flatMap(r => r.posts || []);
    }

    async loadPage(page) {
        this.toggleLoading(true);
        try {
            const response = await fetch(`data/page_${page}.json`);
            if (!response.ok) throw new Error('分页加载失败');
            return await response.json();
        } finally {
            this.toggleLoading(false);
        }
    }

    toggleLoading(show) {
        if (this.dom.loading) this.dom.loading.style.display = show ? 'block' : 'none';
    }

    /* ── 统计行 ── */
    renderStats() {
        const el = this.dom.statsLine;
        if (!el) return;
        const posts = this.state.allPosts;
        const meta = this.state.meta || {};
        const cats = (meta.categories || []).length;
        const years = posts.map(p => (p.archive || '').slice(0, 7)).filter(Boolean).sort();
        const since = years.length ? years[0] : '';
        const latest = posts.map(p => (p.created || '').slice(0, 10)).filter(Boolean).sort().pop() || '';

        el.innerHTML = [
            `共 <b>${posts.length}</b> 篇`,
            cats ? `<b>${cats}</b> 个分类` : '',
            since ? `建站 <b>${since}</b>` : '',
            latest ? `最近更新 <b>${latest.slice(5)}</b>` : ''
        ].filter(Boolean).join(' <span style="opacity:.45">·</span> ');
    }

    /* ── 路由 ── */
    initRouter() {
        window.addEventListener('popstate', () => this.handleRouting());
    }

    handleRouting() {
        const params = new URLSearchParams(location.search);
        const path = params.get('path');

        if (params.get('view') === 'archive') {
            this.showArchive();
            return;
        }
        if (path) {
            const post = this.state.allPosts.find(p => p.path === decodeURIComponent(path));
            post ? this.showPost(post, { push: false }) : this.showNotFound();
            return;
        }
        this.showPostList({ replace: false });
    }

    /* ── 列表 ── */
    showPostList(opts) {
        const options = Object.assign({ replace: true }, opts || {});
        this.state.currentFilter = { type: 'all', value: null };

        if (options.replace) history.replaceState(null, '', window.location.pathname);

        if (this.state.activeNavItem) this.state.activeNavItem.classList.remove('active');
        const allItem = this.dom.nav.querySelector('[data-type="all"]');
        if (allItem) { allItem.classList.add('active'); this.state.activeNavItem = allItem; }

        document.title = blog_title;

        this.dom.postList.style.display = 'flex';
        this.dom.postLayout.style.display = 'none';
        this.hideArchive();
        this.setProgressActive(false);
        this.renderView();
    }

    renderView() {
        this.renderPostList(this.getFilteredPosts());
    }

    getFilteredPosts() {
        const { type, value } = this.state.currentFilter;
        return this.state.allPosts.filter(post => {
            switch (type) {
                case 'category': return post.category === value;
                case 'tag': return (post.tags || []).includes(value);
                case 'archive': return post.archive === value;
                default: return true;
            }
        });
    }

    renderPostList(posts) {
        if (!posts.length) {
            this.dom.postList.innerHTML = '<div class="list-empty">这个筛选下还没有文章</div>';
            return;
        }
        let lastDate = '';
        this.dom.postList.innerHTML = posts.map(post => {
            const date = (post.created || '').slice(0, 10);
            const dup = date && date === lastDate;
            lastDate = date || lastDate;
            const cat = post.category
                ? `<span class="category">${this.esc(post.category)}</span>` : '';
            const tags = (post.tags || []).slice(0, 3)
                .map(t => `<span class="tag">${this.esc(t)}</span>`).join('');
            return `
            <article class="post-item" data-path="${this.esc(post.path || '')}" tabindex="0">
                <div class="post-main">
                    <h3>${this.esc(post.title || '无题')}</h3>
                    ${tags ? `<div class="post-tags">${tags}</div>` : ''}
                </div>
                <div class="post-meta">
                    <time class="${dup ? 'dup' : ''}" datetime="${date}">${date}</time>${cat}
                </div>
            </article>`;
        }).join('');

        this.dom.postList.querySelectorAll('.post-item').forEach(item => {
            const open = () => {
                const path = item.dataset.path;
                window.location.href = `?path=${encodeURIComponent(path)}`;
            };
            item.addEventListener('click', open);
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
            });
        });
    }

    /* ── 导航 ── */
    initNavigation() {
        const categories = [...new Set(this.state.allPosts.map(p => p.category).filter(Boolean))];
        const tags = [...new Set(this.state.allPosts.flatMap(p => p.tags || []))];
        const archives = [...new Set(this.state.allPosts.map(p => p.archive).filter(Boolean))];

        this.dom.nav.innerHTML = `
            <div class="nav-item active" data-type="all">全部</div>
            ${this.createNavGroup('分类', 'category', categories)}
            ${this.createNavGroup('标签', 'tag', tags)}
            ${this.createNavGroup('归档', 'archive', archives)}
        `;

        this.state.activeNavItem = this.dom.nav.querySelector('.nav-item.active');

        document.querySelectorAll('.nav-header').forEach(header => {
            header.addEventListener('click', (e) => {
                const group = e.currentTarget.closest('.nav-group');
                const isMobile = window.innerWidth <= 768;

                if (isMobile) {
                    document.querySelectorAll('.nav-group').forEach(other => {
                        if (other !== group) other.classList.remove('active');
                    });
                    group.classList.toggle('active');
                } else {
                    const items = header.nextElementSibling;
                    items.style.display = items.style.display === 'block' ? 'none' : 'block';
                }
            });
        });

        this.dom.nav.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleNavClick(e));
        });
    }

    createNavGroup(title, type, items) {
        if (!items || items.length === 0) return '';
        return `
            <div class="nav-group">
                <div class="nav-header">${title}</div>
                <div class="nav-items">
                    ${items.map(item => `
                        <div class="nav-item" data-type="${type}" data-value="${this.esc(item)}">${this.esc(item)}</div>
                    `).join('')}
                </div>
            </div>`;
    }

    handleNavClick(e) {
        const target = e.target.closest('.nav-item');
        if (!target || !target.dataset.type) return;

        if (this.state.activeNavItem) this.state.activeNavItem.classList.remove('active');
        target.classList.add('active');
        this.state.activeNavItem = target;

        const type = target.dataset.type;
        const value = target.dataset.value;
        this.state.currentFilter = type === 'all' ? { type: 'all', value: null } : { type, value };

        // 从文章页点筛选 → 回列表
        this.dom.postDetail.style.display = 'none';
        this.dom.postLayout.style.display = 'none';
        this.dom.postList.style.display = 'flex';
        this.setProgressActive(false);
        history.replaceState(null, '', window.location.pathname);
        document.title = blog_title;
        this.renderView();
    }

    /* ── 文章 ── */
    async showPost(post, opts) {
        const options = Object.assign({ push: true }, opts || {});
        try {
            const content = post.content || post.plain || await this.fetchContent(post.path);
            this.renderPost(post, content);
            if (options.push) history.pushState({}, '', `?path=${encodeURIComponent(post.path)}`);
        } catch (error) {
            this.showNotFound();
        }
    }

    async fetchContent(path) {
        const encoded = path.split('/').map(encodeURIComponent).join('/');
        const response = await fetch(`${this.config.mdBasePath}${encoded}`);
        if (!response.ok) throw new Error('内容加载失败');
        return await response.text();
    }

    renderPost(post, content) {
        this.state.currentPost = post;
        document.title = `${post.title}-${blog_title}`;

        this.dom.articleTitle.textContent = post.title;
        this.dom.articleCategory.textContent = post.category || '';
        this.dom.articleCreated.textContent = post.created || '';
        this.dom.articleTags.innerHTML = (post.tags || [])
            .map(t => `<span class="tag">${this.esc(t)}</span>`).join('');

        const parsedContent = marked.parse(content);
        const safeContent = DOMPurify.sanitize(parsedContent, {
            ADD_TAGS: ['iframe'],
            ADD_ATTR: ['allowfullscreen', 'frameborder']
        });

        this.dom.articleContent.innerHTML = safeContent;

        if (window.MathJax && MathJax.typesetPromise) {
            MathJax.typesetPromise().catch(err => console.warn("MathJax:", err));
        }

        this.postProcessContent();
        this.buildToc();
        this.renderRelated(post);

        this.dom.postList.style.display = 'none';
        this.hideArchive();
        this.dom.postLayout.style.display = 'grid';
        this.dom.postDetail.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'auto' });
        this.setProgressActive(true);
    }

    postProcessContent() {
        if (window.hljs) hljs.highlightAll();

        this.dom.articleContent.querySelectorAll('pre').forEach(preBlock => {
            if (preBlock.querySelector('.code-copy')) return;

            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy';
            copyBtn.type = 'button';
            copyBtn.textContent = '复制';
            preBlock.appendChild(copyBtn);

            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const codeEl = preBlock.querySelector('code');
                this.copyToClipboard(codeEl ? codeEl.innerText : preBlock.innerText);
            });

            preBlock.addEventListener('click', () => { copyBtn.style.opacity = '1'; });
            preBlock.addEventListener('scroll', () => {
                const { scrollTop, scrollLeft } = preBlock;
                copyBtn.style.top = `${10 - scrollTop}px`;
                copyBtn.style.right = `${10 - scrollLeft}px`;
            });
        });
    }

    copyToClipboard(text) {
        const done = () => this.showCopySuccess();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(() => this.fallbackCopy(text, done));
        } else {
            this.fallbackCopy(text, done);
        }
    }

    fallbackCopy(text, done) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try { document.execCommand('copy'); } catch (e) { /* 忽略 */ }
        document.body.removeChild(textarea);
        done();
    }

    showCopySuccess() {
        const el = this.dom.copySuccess;
        el.style.display = 'block';
        clearTimeout(this._copyTimer);
        this._copyTimer = setTimeout(() => { el.style.display = 'none'; }, 1800);
    }

    /* ── 目录 TOC ── */
    buildToc() {
        // 笔记习惯用 # 做小节标题（正文里的 h1 其实是"章"），所以 h1/h2/h3 全收
        const heads = [...this.dom.articleContent.querySelectorAll('h1, h2, h3')]
            .filter(h => (h.textContent || '').trim().length > 0);

        const panel = this.dom.tocPanel;
        const list = this.dom.tocList;

        if (heads.length < 2) {
            panel.classList.remove('is-shown');
            this.dom.postLayout.classList.remove('with-toc');
            list.innerHTML = '';
            if (this.dom.tocCount) this.dom.tocCount.textContent = '';
            this._tocTargets = [];
            return;
        }

        heads.forEach((h, i) => {
            if (!h.id) h.id = `toc-${i + 1}`;
        });

        list.innerHTML = heads.map(h => `
            <a class="toc-link ${h.tagName === 'H3' ? 'is-h3' : ''}"
               href="#${h.id}" data-target="${h.id}">${this.esc(h.textContent.trim())}</a>
        `).join('');

        if (this.dom.tocCount) this.dom.tocCount.textContent = String(heads.length);
        panel.classList.add('is-shown');
        this.dom.postLayout.classList.add('with-toc');

        list.querySelectorAll('.toc-link').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const el = document.getElementById(a.dataset.target);
                if (!el) return;
                const top = el.getBoundingClientRect().top + window.scrollY - 64;
                window.scrollTo({ top, behavior: 'smooth' });
                this.setActiveToc(a.dataset.target);
            });
        });

        this._tocTargets = heads.map(h => h.id);
        this.initScrollSpy();
    }

    initScrollSpy() {
        if (this._spyObserver) this._spyObserver.disconnect();
        const targets = this._tocTargets || [];
        if (!targets.length) return;

        this._spyObserver = new IntersectionObserver((entries) => {
            const visible = entries
                .filter(e => e.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            if (visible.length) this.setActiveToc(visible[0].target.id);
        }, { rootMargin: '-64px 0px -68% 0px', threshold: 0 });

        targets.forEach(id => {
            const el = document.getElementById(id);
            if (el) this._spyObserver.observe(el);
        });
    }

    setActiveToc(id) {
        const links = this.dom.tocList.querySelectorAll('.toc-link');
        links.forEach(a => a.classList.toggle('active', a.dataset.target === id));
        const active = this.dom.tocList.querySelector('.toc-link.active');
        if (active && this.isMobile) {
            active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
    }

    /* ── 相关推荐（纯静态打分，零 API）── */
    renderRelated(post) {
        const box = this.dom.related;
        if (!box) return;

        const myTags = new Set(post.tags || []);
        const scored = this.state.allPosts
            .filter(p => p.path !== post.path)
            .map(p => {
                let score = 0;
                if (p.category && p.category === post.category) score += 3;
                (p.tags || []).forEach(t => { if (myTags.has(t)) score += 2; });
                if (p.archive && p.archive === post.archive) score += 1;
                return { post: p, score };
            })
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score || (b.post.created || '').localeCompare(a.post.created || ''))
            .slice(0, 3);

        if (!scored.length) {
            box.style.display = 'none';
            box.innerHTML = '';
            return;
        }

        box.innerHTML = `
            <div class="related-title">同分类再读</div>
            <div class="related-list">
                ${scored.map(({ post: p }) => `
                    <div class="related-item" data-path="${this.esc(p.path || '')}">
                        <span class="r-title">${this.esc(p.title || '无题')}</span>
                        <span class="r-meta">${(p.created || '').slice(0, 10)}</span>
                    </div>`).join('')}
            </div>`;

        box.style.display = 'block';
        box.querySelectorAll('.related-item').forEach(item => {
            item.addEventListener('click', () => {
                const p = this.state.allPosts.find(x => x.path === item.dataset.path);
                if (p) this.showPost(p);
            });
        });
    }

    /* ── 阅读进度 ── */
    initProgress() {
        this._progressBar = document.getElementById('readProgressBar');
        this._progressWrap = document.getElementById('readProgress');
        window.addEventListener('scroll', () => this.updateProgress(), { passive: true });
        window.addEventListener('resize', () => { this.isMobile = window.innerWidth <= 768; this.updateProgress(); });
    }

    setProgressActive(active) {
        if (!this._progressWrap) return;
        this._progressWrap.classList.toggle('is-active', !!active);
        if (!active && this._progressBar) this._progressBar.style.width = '0%';
    }

    updateProgress() {
        if (!this._progressBar || !this._progressWrap.classList.contains('is-active')) return;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const pct = max > 0 ? Math.min(100, Math.max(0, (window.scrollY / max) * 100)) : 0;
        this._progressBar.style.width = pct.toFixed(2) + '%';
    }

    /* ── 搜索 ── */
    initSearch() {
        const input = document.getElementById('search-input');
        const box = document.getElementById('search-results');
        if (!input || !box) return;

        let timer = null;
        input.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => this.doSearch(input.value.trim()), 140);
        });

        input.addEventListener('focus', () => {
            if (input.value.trim()) this.doSearch(input.value.trim());
        });

        input.addEventListener('keydown', (e) => {
            const hits = [...box.querySelectorAll('.search-hit')];
            if (e.key === 'Escape') { box.style.display = 'none'; input.blur(); return; }
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
    }

    doSearch(q) {
        const box = document.getElementById('search-results');
        if (!q) { box.style.display = 'none'; return; }

        const kw = q.toLowerCase();
        const scored = [];
        for (const p of this.state.allPosts) {
            const title = (p.title || '').toLowerCase();
            const body = (p.plain || p.content || '').toLowerCase();
            const tags = (p.tags || []).join(' ').toLowerCase();
            const category = (p.category || '').toLowerCase();
            let score = 0;
            if (title.includes(kw)) score += 100;
            if (tags.includes(kw)) score += 40;
            if (category.includes(kw)) score += 30;
            const at = body.indexOf(kw);
            if (at >= 0) score += 10 + (1000 - Math.min(at, 1000)) / 200;
            if (score > 0) scored.push({ p, score, at });
        }
        scored.sort((a, b) => b.score - a.score);
        const top = scored.slice(0, 8);

        if (!top.length) {
            box.innerHTML = `<div class="search-empty">没有找到「${this.esc(q)}」相关文章</div>`;
            box.style.display = 'block';
            return;
        }

        box.innerHTML = top.map(({ p, at }) => {
            const src = p.plain || p.content || '';
            let snip = '';
            if (at >= 0) {
                const start = Math.max(0, at - 18);
                snip = (start > 0 ? '…' : '') + src.slice(start, at + 48) + '…';
            } else {
                snip = (p.category ? p.category + ' · ' : '') + (src.slice(0, 60) || '无摘要');
            }
            return `<div class="search-hit" data-path="${this.esc(p.path || '')}">
                <div class="hit-title">${this.hl(p.title || '', q)}</div>
                <div class="hit-snip">${this.hl(snip, q)}</div>
            </div>`;
        }).join('');

        box.style.display = 'block';
        box.querySelectorAll('.search-hit').forEach(el => {
            el.addEventListener('click', () => {
                box.style.display = 'none';
                document.getElementById('search-input').value = '';
                const post = this.state.allPosts.find(x => x.path === el.getAttribute('data-path'));
                if (post) this.showPost(post);
            });
        });
    }

    /* ── 主题 ── */
    initTheme() {
        const btn = document.getElementById('theme-btn');
        const forced = new URLSearchParams(location.search).get('theme');
        if (forced === 'dark' || forced === 'light') this.applyTheme(forced, false);
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        this.applyTheme(cur, false);
        if (btn) btn.addEventListener('click', () => {
            const now = document.documentElement.getAttribute('data-theme');
            this.applyTheme(now === 'dark' ? 'light' : 'dark', true);
        });
    }

    applyTheme(mode, save) {
        document.documentElement.setAttribute('data-theme', mode);
        const btn = document.getElementById('theme-btn');
        if (btn) btn.textContent = mode === 'dark' ? '☀' : '☾';
        if (save) {
            try { localStorage.setItem('kb-theme', mode); } catch (e) { /* 隐私模式忽略 */ }
        }
    }

    /* ── 归档 ── */
    initArchive() {
        const btn = document.getElementById('archive-btn');
        if (btn) btn.addEventListener('click', () => {
            const v = document.getElementById('archiveView');
            if (!v || v.style.display === 'none') {
                this.showArchive();
                history.pushState(null, '', '?view=archive');
            } else {
                this.hideArchive();
                history.pushState(null, '', location.pathname);
            }
        });
    }

    showArchive() {
        const v = document.getElementById('archiveView');
        if (!v) return;

        this.dom.postList.style.display = 'none';
        this.dom.postLayout.style.display = 'none';
        this.dom.postDetail.style.display = 'none';
        this.setProgressActive(false);

        const groups = {};
        for (const p of this.state.allPosts) {
            const d = (p.created || '').slice(0, 7);
            if (!d) continue;
            (groups[d] = groups[d] || []).push(p);
        }
        const keys = Object.keys(groups).sort().reverse();

        let html = `<h2 class="archive-title">归档时间轴 · 共 ${this.state.allPosts.length} 篇</h2>`;
        for (const k of keys) {
            const [y, m] = k.split('-');
            html += `<div class="tl-month">${y} 年 ${Number(m)} 月 · ${groups[k].length} 篇</div>`;
            html += '<ul class="tl-list">' + groups[k].map(p =>
                `<li class="tl-item"><span class="tl-date">${(p.created || '').slice(5, 10)}</span>` +
                `<a href="?path=${encodeURIComponent(p.path || '')}" data-arch-path="${this.esc(p.path || '')}">${this.esc(p.title || '无题')}</a></li>`
            ).join('') + '</ul>';
        }

        v.innerHTML = html;
        v.style.display = 'block';
        window.scrollTo(0, 0);

        v.querySelectorAll('.tl-item a').forEach(a => {
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const post = this.state.allPosts.find(x => x.path === a.getAttribute('data-arch-path'));
                if (post) this.showPost(post);
            });
        });
    }

    hideArchive() {
        const v = document.getElementById('archiveView');
        if (v) v.style.display = 'none';
    }

    /* ── 回顶 / 快捷键 / 打印 ── */
    initBackTop() {
        const btn = document.getElementById('backTop');
        if (!btn) return;
        window.addEventListener('scroll', () => {
            btn.style.display = window.scrollY > 420 ? 'block' : 'none';
        }, { passive: true });
        btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    initShortcuts() {
        const printBtn = document.getElementById('print-btn');
        if (printBtn) printBtn.addEventListener('click', () => window.print());

        document.addEventListener('keydown', (e) => {
            const typing = /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName);
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                const input = document.getElementById('search-input');
                if (input) { input.focus(); input.select(); }
            }
            if (e.key === '/' && !typing) {
                e.preventDefault();
                const input = document.getElementById('search-input');
                if (input) input.focus();
            }
            if (e.key === 'Escape' && document.activeElement.id === 'search-input') {
                document.activeElement.blur();
            }
        });
    }

    initEventListeners() {
        if (this.dom.backButton) {
            this.dom.backButton.addEventListener('click', () => {
                history.pushState(null, '', location.pathname);
                this.showPostList({ replace: false });
            });
        }
        window.addEventListener('resize', () => { this.isMobile = window.innerWidth <= 768; });

        // 点空白处收起代码复制按钮（常驻，只挂一次）
        document.addEventListener('click', (e) => {
            if (e.target.closest('pre')) return;
            document.querySelectorAll('.code-copy').forEach(btn => { btn.style.opacity = '0'; });
        });
    }

    /* ── 错误态 ── */
    showNotFound() {
        document.title = '未归档 · ' + blog_title;
        this.dom.postList.style.display = 'none';
        this.dom.postDetail.style.display = 'block';
        this.dom.postLayout.style.display = 'grid';
        this.dom.tocPanel.classList.remove('is-shown');
        this.dom.postLayout.classList.remove('with-toc');
        this.dom.related.style.display = 'none';
        this.dom.articleTitle.textContent = '这篇没归档';
        this.dom.articleCategory.textContent = '';
        this.dom.articleCreated.textContent = '';
        this.dom.articleTags.innerHTML = '';
        this.dom.articleContent.innerHTML = `
            <div class="not-found">
                <h2>404 · 这条路径没有对应文章</h2>
                <p>可能已被撤稿，或者链接里的路径不对。</p>
                <button onclick="blog.showPostList()">回到全部文章</button>
            </div>`;
        this.setProgressActive(false);
    }

    showError(message) {
        document.body.innerHTML = `
            <div class="error">
                <h2>系统错误</h2>
                <p>${this.esc(message)}</p>
                <button onclick="location.reload()">重新加载</button>
            </div>`;
    }

    /* ── 工具 ── */
    esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    hl(text, q) {
        const safe = this.esc(text);
        if (!q) return safe;
        const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        return safe.replace(re, m => `<mark>${m}</mark>`);
    }
}

const blog = new StaticBlog();
window.blog = blog;
document.addEventListener('DOMContentLoaded', () => blog.init());
