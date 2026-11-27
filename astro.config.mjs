import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { transform } from 'esbuild';
import { readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Production build only: (1) cut the debug panel out of the scene script (everything between /*DEBUG-START*/ and /*DEBUG-END*/, with an
// optional /*DEBUG-ELSE*/ branch that stays), (2) minify every script in dist/assets, and (3) join site.js + avatar-live.js + live-config.js
// into one file, app.js (one request instead of three). The scene scripts (avatar-*.js) stay separate: they load on demand.
function shipScripts() {
  return {
    name: 'ship-scripts',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const assets = path.join(fileURLToPath(dir), 'assets');
        const strip = (code) => code.replace(/\/\*DEBUG-START\*\/([\s\S]*?)(?:\/\*DEBUG-ELSE\*\/([\s\S]*?))?\/\*DEBUG-END\*\//g, (_, _dbg, prod) => prod ?? '');
        const min = async (file) => {
          let code = await readFile(file, 'utf8');
          if (path.basename(file) === 'avatar-live.js') {
            code = strip(code);
            if (code.includes('DEBUG-START') || code.includes('al-panel')) throw new Error('debug panel code is still in the production bundle');
          }
          return (await transform(code, { minify: true, target: 'es2019', legalComments: 'none' })).code;
        };
        let before = 0, after = 0;
        const out = {};
        for (const f of (await readdir(assets)).filter((n) => n.endsWith('.js'))) {
          const file = path.join(assets, f);
          before += (await readFile(file, 'utf8')).length;
          out[f] = await min(file);
          after += out[f].length;
          await writeFile(file, out[f]);
        }
        const app = ['site.js', 'avatar-live.js', 'live-config.js'].map((n) => out[n]).join(';\n');
        await writeFile(path.join(assets, 'app.js'), app);
        for (const n of ['site.js', 'avatar-live.js', 'live-config.js']) await rm(path.join(assets, n));
        logger.info(`scripts: ${(before / 1024).toFixed(1)} KB -> ${(after / 1024).toFixed(1)} KB minified; debug panel removed; app.js bundled`);
      },
    },
  };
}

// A static build: every page becomes real HTML (indexable), while <ClientRouter /> in the layout gives
// SPA-like navigation, so the avatar keeps running from page to page.
export default defineConfig({
  site: 'https://lukaszwojcik.net',
  integrations: [sitemap(), shipScripts()],
  build: { format: 'directory' },
  trailingSlash: 'always',
  // Fetch the next page as soon as a link is hovered or touched, so a click swaps instantly (no waiting, no blank gap).
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
});
