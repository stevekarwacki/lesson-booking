const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const MarkdownIt = require('markdown-it');

const CONTENT_DIR = path.join(__dirname, '..', 'content', 'help', 'admin');

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// Resolve the file path for a given category + slug.
// Top-level articles (index, _template) live directly under /admin/.
// Categorised articles live under /admin/:category/.
const resolveArticlePath = (category, slug) => {
    const safe = (s) => path.basename(s); // strip any path separators
    // 'admin' is the root level — index.md lives directly under CONTENT_DIR
    if (safe(category) === 'admin') {
        return path.join(CONTENT_DIR, `${safe(slug)}.md`);
    }
    return path.join(CONTENT_DIR, safe(category), `${safe(slug)}.md`);
};

// Recursively walk a directory and collect all .md files, returning
// their parsed frontmatter (body excluded).  Files prefixed with _
// (e.g. _template.md) are skipped.
const buildManifest = () => {
    const articles = [];

    const walk = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(fullPath);
            } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
                const raw = fs.readFileSync(fullPath, 'utf-8');
                const { data } = matter(raw);
                if (data.id) {
                    const slug = path.basename(entry.name, '.md');
                    const relDir = path.relative(CONTENT_DIR, dir);
                    const category = relDir || 'admin';
                    // slug and category are derived from the filesystem and used for routing —
                    // they must not be overridden by frontmatter values.
                    articles.push({ ...data, slug, category });
                }
            }
        }
    };

    walk(CONTENT_DIR);
    articles.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
    return articles;
};

// GET /api/help
// Returns a manifest of all articles (frontmatter only, no body).
// Used by the frontend to build the help nav without loading all content.
router.get('/', (req, res) => {
    try {
        const articles = buildManifest();
        res.json({ articles });
    } catch (error) {
        console.error('Error building help manifest:', error);
        res.status(500).json({ error: 'Failed to load help content' });
    }
});

// GET /api/help/:category/:slug
// Returns a single article: frontmatter + body rendered to HTML.
router.get('/:category/:slug', (req, res) => {
    const { category, slug } = req.params;

    const filePath = resolveArticlePath(category, slug);

    // Ensure the resolved path stays within CONTENT_DIR (path traversal guard)
    if (!filePath.startsWith(CONTENT_DIR + path.sep) && filePath !== CONTENT_DIR) {
        return res.status(400).json({ error: 'Invalid article path' });
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Article not found' });
    }

    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(raw);
        const html = md.render(content);
        res.json({ article: { ...data, html } });
    } catch (error) {
        console.error(`Error loading help article ${category}/${slug}:`, error);
        res.status(500).json({ error: 'Failed to load article' });
    }
});

module.exports = router;
