# 蛋蛋知识库 · DandanLLab KB Portal

DandanLLab 公开知识门户。纯静态、零依赖、免构建前端（原生 HTML/JS + marked + DOMPurify + highlight.js），文章源为 `md/` 目录下的 Markdown，由 GitHub Actions 自动生成 `data/` 索引后由前端直读。

## 内容通道（三层兜底）

1. **静态直读（默认）**：页面加载 `data/data.json`，全部文章索引与正文一次拉齐 —— GitHub Pages 直接出，不走任何 API。
2. **公开 API（新内容增量）**：站点配置了公开 API 时，新文章可经 API 增量拉取；API 不通时自动回落静态数据。
3. **服务器兜底**：私有 API 部署于自有服务器（priv.dandanllab.top），公开层仅暴露公开知识。

## 发布流程

- 往 `md/<分类>/` 丢 Markdown 文件（首行 `# 标题`，可用 YAML front-matter：`date` / `tags`）
- push 后 Actions 自动跑 `generate_blog.py` → `generate_data_json.py` → `generate_sitemap.py` 并回推 `data/`
- 线上域名：[kb.dandanllab.top](https://kb.dandanllab.top)（CNAME 已绑定 GitHub Pages）

## 本地预览

```sh
python -m http.server 8000   # http://localhost:8000
```

## 目录结构

```
md/            文章源（按分类分目录）
data/          生成的索引与正文 JSON
libs/          本地化的 marked / DOMPurify / highlight.js / MathJax
generate_*.py  数据生成器（Actions 自动执行）
blog.js        前端逻辑（列表/详情/搜索主题插件）
```

## 隐私边界

本仓库仅存放**允许公开**的知识。私密知识走独立体系（自有服务器 + 私有 API，双层授权），不入本仓库。
