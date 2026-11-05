// Prerenders projects.json into index.html (list + JSON-LD) and refreshes
// sitemap.xml, so crawlers see the content without running app.js.
// Run: node scripts/build.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SITE = 'https://alenahan.net/';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(root, f), 'utf8');

const { projects: all } = JSON.parse(read('projects.json'));
const projects = all.filter(p => p.listed !== false);

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const items = projects.map(p => {
  const isModal = p.open === 'modal' && p.modal;
  const attrs = isModal ? `href="#${esc(p.id)}"` : `href="${esc(p.link)}" target="_blank" rel="noopener"`;
  return `      <li><a ${attrs}><span class="title">${esc(p.title)}</span><span class="desc">${esc(p.summary)}<span class="icon">${isModal ? '+' : '↗'}</span></span></a></li>`;
}).join('\n');

const abs = src => new URL(src, SITE).href;
const firstImage = p => {
  const img = p.modal?.images?.[0];
  return img ? abs(typeof img === 'string' ? img : img.src) : undefined;
};

const person = {
  '@type': 'Person',
  '@id': `${SITE}#person`,
  name: 'Aidan Lenahan',
  url: SITE,
  email: 'mailto:aidan@aidanlenahan.com',
  sameAs: [
    'https://github.com/aidanlenahan',
    'https://linkedin.com/in/aidanlenahan',
    'https://aidanlenahan.com',
  ],
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    person,
    {
      '@type': 'WebSite',
      '@id': `${SITE}#website`,
      url: SITE,
      name: 'Aidan Lenahan · Projects',
      author: { '@id': `${SITE}#person` },
    },
    {
      '@type': 'ProfilePage',
      '@id': `${SITE}#page`,
      url: SITE,
      name: 'Aidan Lenahan · Projects',
      isPartOf: { '@id': `${SITE}#website` },
      mainEntity: { '@id': `${SITE}#person` },
      hasPart: {
        '@type': 'ItemList',
        name: 'Projects',
        itemListElement: projects.map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'CreativeWork',
            name: p.portfolio?.title || p.title,
            description: p.modal?.description || p.summary,
            url: p.link,
            image: firstImage(p),
            keywords: (p.tags || []).join(', ') || undefined,
            creator: { '@id': `${SITE}#person` },
          },
        })),
      },
    },
  ],
};

const between = (html, name, body) => {
  const re = new RegExp(`(<!-- ${name}:start -->)[\\s\\S]*?(<!-- ${name}:end -->)`);
  if (!re.test(html)) throw new Error(`index.html is missing the ${name} markers`);
  return html.replace(re, `$1\n${body}\n    $2`);
};

let html = read('index.html');
html = between(html, 'projects', items);
html = between(html, 'jsonld',
  `  <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c')}\n  </script>`);
writeFileSync(join(root, 'index.html'), html);

const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(root, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE}</loc>
    <lastmod>${today}</lastmod>
  </url>
</urlset>
`);

console.log(`Prerendered ${projects.length} projects.`);
