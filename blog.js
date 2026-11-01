var blog_title = "蛋蛋知识库 | DandanLLab 公开知识门户";

class StaticBlog {
    constructor() {
        this.config = {
            metaUrl: 'data/meta.json',
            mdBasePath: '/md/'
        };

        this.dom = {
            nav: document.getElementById('nav'),
            postList: document.getElementById('postList'),
            postDetail: document.getElementById('postDetail'),
            articleTitle: document.getElementById('articleTitle'),
            articleContent: document.getElementById('articleContent'),
            backButton: document.getElementById('backButton'),
            copySuccess: document.getElementById('copySuccess'),
            articleCategory: document.getElementById('articleCategory'),
            articleCreated: document.getElementById('articleCreated'),
            articleTags: document.getElementById('articleTags'),
            loadingIndicator: document.getElementById('loading'),
        };

        this.state = {
            allPosts: [],
            filteredPosts: [],
            currentFilter: { type: 'all', value: null },
            activeNavItem: null,
            pagination: {
                currentPage: 1,
                totalPages: 1,
                pageSize: 10, // 默认值，后续会从meta.json中更新
                isLoading: false,
                hasMore: true
            }
        };

        this.isMobile = window.innerWidth <= 768; // 检测是否为移动端
    }

    async init() {
        try {
            if (!window.MathJax) {
                const script = document.createElement("script");
                script.src = "./libs/mathjax/es5/tex-mml-chtml.js";
                script.async = true;
                document.head.appendChild(script);
            }

            await this.loadInitialData();
            this.initRouter();
            this.initNavigation();
            this.initEventListeners();
            this.initSearch(); this.initTheme(); this.initArchive(); this.initBackTop();
            this.showPostList(); // 显示文章列表
        } catch (error) {
            this.showError('初始化失败: ' + error.message);
        }
    }

    async loadInitialData() {
        // 加载元数据
        const metaResponse = await fetch(this.config.metaUrl);
        if (!metaResponse.ok) throw new Error('元数据加载失败');
        const meta = await metaResponse.json();
        this.state.pagination.totalPages = meta.page_count;
        this.state.pagination.pageSize = meta.page_size;

        // 预加载所有文章
        for (let page = 1; page <= meta.page_count; page++) {
            const pageData = await this.loadPage(page);
            if (pageData) {
                this.state.allPosts = [...this.state.allPosts, ...pageData.posts];
            }
        }

        this.applyFilter();
    }

    async loadPage(page) {
        if (this.state.pagination.isLoading) return null;
        
        this.state.pagination.isLoading = true;
        this.toggleLoading(true);

        try {
            const response = await fetch(`data/page_${page}.json`);
            if (!response.ok) throw new Error('分页加载失败');
            const data = await response.json();
            return data;
        } finally {
            this.state.pagination.isLoading = false;
            this.toggleLoading(false);
        }
    }

    applyFilter() {
        const { type, value } = this.state.currentFilter;
        this.state.filteredPosts = this.state.allPosts.filter(post => {
            switch(type) {
                case 'category': return post.category === value;
                case 'tag': return post.tags?.includes(value);
                case 'archive': return post.archive === value;
                default: return true;
            }
        });
    }

    initRouter() {
        // 处理路由逻辑
        window.addEventListener('popstate', () => this.handleRouting());
        this.handleRouting();
    }

    handleRouting() {
        const params = new URLSearchParams(location.search);
        const path = params.get('path');
        
        if (path) {
            // 进入详情页时隐藏按钮
            const post = this.state.allPosts.find(p => p.path === decodeURIComponent(path));
            post ? this.showPostDetail(post) : this.showNotFound();
        } else {
            // 进入列表页时按需显示按钮
            this.showPostList();
        }
    }

    initEventListeners() {
        this.dom.nav.addEventListener('click', (e) => this.handleNavClick(e));
        this.dom.backButton.addEventListener('click', () => this.showPostList());
        window.addEventListener('scroll', () => this.handleScroll());
        window.addEventListener('resize', () => this.handleResponsive());
    }

    handleScroll() {
        // 无需处理滚动加载，因为已经预加载了所有内容
    }

    toggleLoading(show) {
        this.dom.loadingIndicator.style.display = show ? 'block' : 'none';
    }

    renderPostList(posts) {
        this.dom.postList.innerHTML = posts.map(post => `
            <article class="post-item" data-path="${post.path}">
                <h3>${post.title}</h3>
                <div class="meta-info">
                    <span class="category">${post.category}</span>
                    <time>${post.created}</time>
                    ${post.tags?.length ? `
                    <div class="tags">
                        ${post.tags.map(t => `<span class="tag">${t}</span>`).join('')}
                    </div>` : ''}
                </div>
            </article>
        `).join('');

        document.querySelectorAll('.post-item').forEach(item => {
            item.addEventListener('click', () => {
                const path = item.dataset.path;
                // 使用 URL 参数加载文章详情
                const url = `?path=${encodeURIComponent(path)}`;
                window.location.href = url;
            });
        });
    }

    postProcessContent() {
        hljs.highlightAll();

        document.querySelectorAll('pre').forEach(preBlock => {
            const existingCopyBtn = preBlock.querySelector('.code-copy');
            if (existingCopyBtn) {
                existingCopyBtn.remove();
            }

            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy';
            copyBtn.textContent = '复制';
            copyBtn.style.position = 'absolute';
            copyBtn.style.right = '10px';
            copyBtn.style.top = '10px';
            copyBtn.style.zIndex = '10';
            copyBtn.style.background = 'rgba(255, 255, 255, 0.9)';
            copyBtn.style.border = '1px solid #ddd';
            copyBtn.style.borderRadius = '4px';
            copyBtn.style.padding = '5px 10px';
            copyBtn.style.cursor = 'pointer';
            copyBtn.style.opacity = '0';
            copyBtn.style.transition = 'opacity 0.3s ease';

            copyBtn.addEventListener('click', () => {
                const code = preBlock.querySelector('code').innerText;
                this.copyToClipboard(code);
            });

            preBlock.appendChild(copyBtn);

            preBlock.addEventListener('click', (e) => {
                e.stopPropagation();
                copyBtn.style.opacity = '1';
            });

            preBlock.addEventListener('scroll', () => {
                const { scrollTop, scrollLeft } = preBlock;
                copyBtn.style.top = `${10 - scrollTop}px`;
                copyBtn.style.right = `${10 - scrollLeft}px`;
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.code-copy').forEach(btn => {
                btn.style.opacity = '0';
            });
        });
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showCopySuccess();
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showCopySuccess();
        });
    }

    showCopySuccess() {
        this.dom.copySuccess.style.display = 'block';
        setTimeout(() => {
            this.dom.copySuccess.style.display = 'none';
        }, 2000);
    }

    showPostList() {
        this.state.currentFilter = { type: 'all', value: null };
        history.replaceState(null, '', window.location.pathname);
        
        if (this.state.activeNavItem) {
            this.state.activeNavItem.classList.remove('active');
        }
        const allItem = this.dom.nav.querySelector('[data-type="all"]');
        if (allItem) {
            allItem.classList.add('active');
            this.state.activeNavItem = allItem;
        }
        
        const existingTitle = document.querySelector("head > title");
        if (existingTitle) {
            existingTitle.textContent = `${blog_title}`;
        }

        this.dom.postList.style.display = 'grid';
        this.dom.postDetail.style.display = 'none';
        this.renderView();
    }

    renderView() {
        const filteredPosts = this.getFilteredPosts();
        this.renderPostList(filteredPosts);
    }

    getFilteredPosts() {
        const { type, value } = this.state.currentFilter;
        return this.state.allPosts.filter(post => {
            switch(type) {
                case 'category': return post.category === value;
                case 'tag': return post.tags?.includes(value);
                case 'archive': return post.archive === value;
                default: return true;
            }
        });
    }

        initNavigation() {
        const categories = [...new Set(this.state.allPosts.map(p => p.category))];
        const tags = [...new Set(this.state.allPosts.flatMap(p => p.tags || []))];
        const archives = [...new Set(this.state.allPosts.map(p => p.archive))];

        let navHTML = `
            <div class="nav-item active" data-type="all">全部</div>
            ${this.createNavGroup('分类', 'category', categories)}
            ${this.createNavGroup('标签', 'tag', tags)}
            ${this.createNavGroup('归档', 'archive', archives)}
        `;

        this.dom.nav.innerHTML = navHTML;

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

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                this.handleNavClick(e);
            });
        });
    }

    createNavGroup(title, type, items) {
        if (!items || items.length === 0) return '';
        
        return `
            <div class="nav-group">
                <div class="nav-header">${title}</div>
                <div class="nav-items">
                    ${items.map(item => `
                        <div class="nav-item" data-type="${type}" data-value="${item}">${item}</div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    handleNavClick(e) {
        const target = e.target.closest('.nav-item');
        if (!target || !target.dataset.type) return;

        if (this.state.activeNavItem) {
            this.state.activeNavItem.classList.remove('active');
        }
        target.classList.add('active');
        this.state.activeNavItem = target;

        const type = target.dataset.type;
        const value = target.dataset.value;
        this.state.currentFilter = type === 'all' 
            ? { type: 'all', value: null }
            : { type, value };

        this.renderView();
    }

    async showPostDetail(post) {
        try {
            let content = post.content || await this.fetchContent(post.path);
            this.renderPost(post, content);
            history.pushState({}, '', `?path=${encodeURIComponent(post.path)}`);
        } catch (error) {
            this.showError('内容加载失败');
        }
    }

    async fetchContent(path) {
        const response = await fetch(`${this.config.mdBasePath}${path}`);
        if (!response.ok) throw new Error('内容加载失败');
        return await response.text();
    }

    renderPost(post, content) {
        const existingTitle = document.querySelector("head > title");
        if (!existingTitle) {
            const titleTag = document.createElement("title");
            titleTag.textContent = `${post.title}-${blog_title}`;
            document.head.appendChild(titleTag);
        } else {
            existingTitle.textContent = `${post.title}-${blog_title}`;
        }

        this.dom.articleTitle.textContent = post.title;
        this.dom.articleCategory.textContent = post.category;
        this.dom.articleCreated.textContent = post.created;
        this.dom.articleTags.innerHTML = post.tags?.map(t => 
            `<span class="tag">${t}</span>`
        ).join('') || '';

        const parsedContent = marked.parse(content);
        const safeContent = DOMPurify.sanitize(parsedContent, {
            ADD_TAGS: ['iframe'],
            ADD_ATTR: ['allowfullscreen', 'frameborder']
        });

        this.dom.articleContent.innerHTML = safeContent;

        if (window.MathJax) {
            MathJax.typesetPromise().then(() => {
                console.log("MathJax rendering complete.");
            }).catch((error) => {
                console.error("MathJax rendering failed:", error);
            });
        } else {
            console.warn("MathJax is not loaded. Please ensure MathJax is correctly included.");
        }

        this.postProcessContent();
        
        this.dom.postList.style.display = 'none';
        this.dom.postDetail.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    postProcessContent() {
        hljs.highlightAll();

        document.querySelectorAll('pre').forEach(preBlock => {
            const existingCopyBtn = preBlock.querySelector('.code-copy');
            if (existingCopyBtn) {
                existingCopyBtn.remove();
            }

            const copyBtn = document.createElement('button');
            copyBtn.className = 'code-copy';
            copyBtn.textContent = '复制';
            copyBtn.style.position = 'absolute';
            copyBtn.style.right = '10px';
            copyBtn.style.top = '10px';
            copyBtn.style.zIndex = '10';
            copyBtn.style.background = 'rgba(255, 255, 255, 0.9)';
            copyBtn.style.border = '1px solid #ddd';
            copyBtn.style.borderRadius = '4px';
            copyBtn.style.padding = '5px 10px';
            copyBtn.style.cursor = 'pointer';
            copyBtn.style.opacity = '0';
            copyBtn.style.transition = 'opacity 0.3s ease';

            copyBtn.addEventListener('click', () => {
                const code = preBlock.querySelector('code').innerText;
                this.copyToClipboard(code);
            });

            preBlock.appendChild(copyBtn);

            preBlock.addEventListener('click', (e) => {
                e.stopPropagation();
                copyBtn.style.opacity = '1';
            });

            preBlock.addEventListener('scroll', () => {
                const { scrollTop, scrollLeft } = preBlock;
                copyBtn.style.top = `${10 - scrollTop}px`;
                copyBtn.style.right = `${10 - scrollLeft}px`;
            });
        });

        document.addEventListener('click', () => {
            document.querySelectorAll('.code-copy').forEach(btn => {
                btn.style.opacity = '0';
            });
        });
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showCopySuccess();
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showCopySuccess();
        });
    }

    showCopySuccess() {
        this.dom.copySuccess.style.display = 'block';
        setTimeout(() => {
            this.dom.copySuccess.style.display = 'none';
        }, 2000);
    }

    showNotFound() {
        this.dom.articleContent.innerHTML = `
            <div class="not-found">
                <h2>文章未找到</h2>
                <p>请求的内容不存在或已被移除</p>
                <button onclick="blog.showPostList()">返回列表</button>
            </div>
        `;
    }

    showError(message) {
        document.body.innerHTML = `
            <div class="error">
                <h2>系统错误</h2>
                <p>${message}</p>
                <button onclick="location.reload()">重新加载</button>
            </div>
        `;
    }
}

// 初始化博客
const blog = new StaticBlog();
document.addEventListener('DOMContentLoaded', () => blog.init());

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
