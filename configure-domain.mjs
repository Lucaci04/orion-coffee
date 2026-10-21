import { readFile, writeFile } from 'node:fs/promises';
const value = process.argv[2];
if (!value) { console.error('Utilizare: node configure-domain.mjs https://domeniul-real.ro/'); process.exit(1); }
let base;
try {
  base = new URL(value);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error();
} catch { console.error('Folosește un URL valid http/https, fără parolă, parametri sau fragment.'); process.exit(1); }
if (!base.pathname.endsWith('/')) base.pathname += '/';
const escape = s => s.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const file = new URL('./site/index.html', import.meta.url);
let content = await readFile(file, 'utf8');
content = content.replace(/\s*<link rel="canonical"[^>]*>/g, '').replace(/\s*<meta property="og:url"[^>]*>/g, '');
content = content.replace('</head>', `  <link rel="canonical" href="${escape(base.href)}">\n  <meta property="og:url" content="${escape(base.href)}">\n</head>`);
content = content.replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escape(new URL('assets/images/coffee-table.jpg', base).href)}">`);
content = content.replace(/(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/, (_, start, json, end) => {
  const data = JSON.parse(json);
  data.url = base.href;
  data['@id'] = new URL('#orion', base).href;
  return start + '\n' + JSON.stringify(data, null, 2).replaceAll('<', '\\u003c') + '\n' + end;
});
await writeFile(file, content);
await writeFile(new URL('./site/sitemap.xml', import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escape(base.href)}</loc></url></urlset>\n`);
await writeFile(new URL('./site/robots.txt', import.meta.url), `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', base).href}\n`);
let notFound = await readFile(new URL('./site/404.html', import.meta.url), 'utf8');
notFound = notFound.replace(/href="[^"]*assets\/styles.css"/, `href="${escape(new URL('assets/styles.css', base).href)}"`).replace(/href="[^"]*assets\/favicon.svg"/, `href="${escape(new URL('assets/favicon.svg', base).href)}"`).replace(/href="(?:\/?index.html|https?:\/\/[^\"]*\/index.html)"/g, `href="${escape(new URL('index.html', base).href)}"`).replace(/href="(?:\/?credite.html|https?:\/\/[^\"]*\/credite.html)"/g, `href="${escape(new URL('credite.html', base).href)}"`).replace(/href="(?:\/?confidentialitate.html|https?:\/\/[^\"]*\/confidentialitate.html)"/g, `href="${escape(new URL('confidentialitate.html', base).href)}"`);
await writeFile(new URL('./site/404.html', import.meta.url), notFound);
console.log(`SEO configurat pentru ${base.href}. Publică conținutul directorului site în această locație.`);
