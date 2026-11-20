// Catalogue answers (product lists, product pages, Specials, shop details) are
// the same for every visitor, so Vercel's CDN may serve one copy to everyone
// for a short while instead of running the server for each visit. This keeps
// function runs and CPU time (Vercel usage) low. Browsers always re-check;
// the CDN keeps a copy for `seconds` and may serve a slightly older one while
// it refreshes in the background. Only successful answers are shared.
const publicCache =
  (seconds = 60) =>
  (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const json = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode === 200) res.set('Cache-Control', `public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${seconds * 5}`);
      return json(body);
    };
    next();
  };

module.exports = publicCache;
