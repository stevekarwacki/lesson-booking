const { describe, it } = require('node:test');
const assert = require('node:assert');

const helpRoutes = require('../routes/help');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRes = () => ({
    statusCode: 200,
    _data: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this._data = data; return this; }
});

// Find a route handler on the express Router by method + path
const findHandler = (router, method, routePath) => {
    const layer = router.stack.find(l =>
        l.route &&
        l.route.path === routePath &&
        l.route.methods[method.toLowerCase()]
    );
    if (!layer) throw new Error(`Route ${method} ${routePath} not found`);
    // Return the last handler (skips any middleware added by .use())
    const stack = layer.route.stack;
    return stack[stack.length - 1].handle;
};

// ---------------------------------------------------------------------------
// GET /  (manifest)
// ---------------------------------------------------------------------------

describe('GET /api/help (manifest)', () => {
    const handler = findHandler(helpRoutes, 'GET', '/');

    it('should return 200 with an articles array', async () => {
        const res = makeRes();
        await handler({}, res);

        assert.strictEqual(res.statusCode, 200);
        assert.ok(Array.isArray(res._data.articles), 'articles should be an array');
    });

    it('should return at least one article', async () => {
        const res = makeRes();
        await handler({}, res);

        assert.ok(res._data.articles.length > 0, 'manifest should not be empty');
    });

    it('each article should have required frontmatter fields', async () => {
        const res = makeRes();
        await handler({}, res);

        for (const article of res._data.articles) {
            assert.ok(article.id, `article missing id: ${JSON.stringify(article)}`);
            assert.ok(article.title, `article missing title: ${article.id}`);
            assert.ok(article.category, `article missing category: ${article.id}`);
        }
    });

    it('articles should not include body HTML', async () => {
        const res = makeRes();
        await handler({}, res);

        for (const article of res._data.articles) {
            assert.strictEqual(article.html, undefined, `manifest should not include html for: ${article.id}`);
        }
    });

    it('articles should be sorted by order field', async () => {
        const res = makeRes();
        await handler({}, res);

        const orders = res._data.articles
            .filter(a => a.order !== undefined)
            .map(a => a.order);

        for (let i = 1; i < orders.length; i++) {
            assert.ok(orders[i] >= orders[i - 1], 'articles should be in ascending order');
        }
    });
});

// ---------------------------------------------------------------------------
// GET /:category/:slug  (single article)
// ---------------------------------------------------------------------------

describe('GET /api/help/:category/:slug (article)', () => {
    const handler = findHandler(helpRoutes, 'GET', '/:category/:slug');

    it('should return 200 with frontmatter and html for a known article', async () => {
        const req = { params: { category: 'settings', slug: 'business-info' } };
        const res = makeRes();
        await handler(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res._data.article, 'response should have an article key');
        assert.ok(res._data.article.id, 'article should have an id');
        assert.ok(res._data.article.title, 'article should have a title');
        assert.ok(typeof res._data.article.html === 'string', 'html should be a string');
        assert.ok(res._data.article.html.length > 0, 'html should not be empty');
    });

    it('should render markdown body to HTML', async () => {
        const req = { params: { category: 'settings', slug: 'business-info' } };
        const res = makeRes();
        await handler(req, res);

        assert.ok(res._data.article.html.includes('<'), 'html should contain HTML tags');
    });

    it('should return 404 for a non-existent article', async () => {
        const req = { params: { category: 'settings', slug: 'does-not-exist' } };
        const res = makeRes();
        await handler(req, res);

        assert.strictEqual(res.statusCode, 404);
        assert.ok(res._data.error, 'response should have an error message');
    });

    it('should return 404 for a non-existent category', async () => {
        const req = { params: { category: 'nonexistent', slug: 'business-info' } };
        const res = makeRes();
        await handler(req, res);

        assert.strictEqual(res.statusCode, 404);
    });

    it('should block path traversal attempts', async () => {
        const req = { params: { category: '..', slug: '..%2Fpackage' } };
        const res = makeRes();
        await handler(req, res);

        // Should be 404 (path.basename strips traversal) or 400
        assert.ok(res.statusCode === 404 || res.statusCode === 400);
    });

    it('should return the admin index article', async () => {
        const req = { params: { category: 'admin', slug: 'index' } };
        const res = makeRes();
        await handler(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res._data.article.html.length > 0);
    });

    it('should return a bookings article', async () => {
        const req = { params: { category: 'bookings', slug: 'book-on-behalf' } };
        const res = makeRes();
        await handler(req, res);

        assert.strictEqual(res.statusCode, 200);
        assert.ok(res._data.article.id === 'bookings-book-on-behalf');
    });
});
