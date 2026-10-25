const request = require('supertest');
const { useTestApp, signedInAgent } = require('./helpers/setup');

const ctx = useTestApp();

const upload = `/api/uploads/${'a'.repeat(32)}.webp`;
const slide = (overrides = {}) => ({
  image: upload,
  title: 'Our shoe restock is here',
  subtitle: 'New pairs this week',
  cta: 'Shop',
  link: '/collections/footwear',
  focus: 'bottom',
  ...overrides,
});

describe('home page cover images', () => {
  it('shows the starter slides until an admin saves some', async () => {
    const res = await request(ctx.app).get('/api/site/home');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ heroSlides: null, heroMono: null, updatedAt: null });
  });

  it('lets an admin replace, reorder and reset them', async () => {
    const { agent } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    const slides = [slide(), slide({ title: 'Hoodies', subtitle: '', link: '/products?q=hoodie', image: 'https://images.example.com/h.jpg' })];
    const saved = await agent.put('/api/admin/home').send({ heroSlides: slides, heroMono: false });
    expect(saved.status).toBe(200);

    const home = (await request(ctx.app).get('/api/site/home')).body;
    expect(home.heroMono).toBe(false);
    expect(home.heroSlides).toEqual(slides);

    // Saving again replaces the list (new order, one removed).
    await agent.put('/api/admin/home').send({ heroSlides: [slides[1]] });
    const after = (await request(ctx.app).get('/api/site/home')).body;
    expect(after.heroSlides.map((s) => s.title)).toEqual(['Hoodies']);
    expect(after.heroMono).toBe(true);

    expect((await agent.delete('/api/admin/home')).status).toBe(200);
    expect((await request(ctx.app).get('/api/site/home')).body.heroSlides).toBeNull();
  });

  it('only links to pages on the shop and only shows uploaded or https photos', async () => {
    const { agent } = await signedInAgent(ctx.app, { roles: ['user', 'admin'] });
    const put = (body) => agent.put('/api/admin/home').send(body);
    for (const link of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', 'collections/footwear']) {
      expect((await put({ heroSlides: [slide({ link })] })).status).toBe(400);
    }
    for (const image of ['javascript:alert(1)', 'data:image/png;base64,AAAA', '/etc/passwd', 'https://a.example/x.jpg);background:url(https://evil.example']) {
      expect((await put({ heroSlides: [slide({ image })] })).status).toBe(400);
    }
    expect((await put({ heroSlides: [] })).status).toBe(400);
    expect((await put({ heroSlides: Array.from({ length: 7 }, () => slide()) })).status).toBe(400);
    expect((await put({ heroSlides: [slide({ title: '' })] })).status).toBe(400);
    expect((await put({ heroSlides: [slide({ onclick: 'x' })] })).status).toBe(400);
    expect((await request(ctx.app).get('/api/site/home')).body.heroSlides).toBeNull();
  });

  it('is changed only by admins', async () => {
    expect(
      (
        await request(ctx.app)
          .put('/api/admin/home')
          .send({ heroSlides: [slide()] })
      ).status
    ).toBe(401);
    const { agent } = await signedInAgent(ctx.app);
    expect((await agent.put('/api/admin/home').send({ heroSlides: [slide()] })).status).toBe(403);
    expect((await agent.delete('/api/admin/home')).status).toBe(403);
  });
});
