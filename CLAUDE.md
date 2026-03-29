# Manager Pulse — CLAUDE.md

## Tech Stack
- Vue 3.4 CDN (Composition API, render functions with `h()`, NO SFC/templates) + Vue Router 4.3 (hash mode)
- Zero build tools — all JS loaded as ES modules via `<script type="module">`
- Import map in `index.html` resolves `vue`, `vue-router`, `@vue/devtools-api`
- No `package.json`, no bundler, no TypeScript
- Data: localStorage primary + GitHub API (private repo `data` branch) for cross-device sync
- AI: 智谱 GLM-5.1 via Cloudflare Worker CORS proxy (`worker/cors-proxy.js`)

## Architecture
```
index.html → js/app.js → AppShell.js (root component, owns all global dialogs)
  ├── js/router.js (5 routes: /, /role/:roleId, /archive, /report, /settings)
  ├── js/store/state.js (single reactive() object, ROLES map, persist functions)
  ├── js/store/actions.js (all mutations: CRUD, sync triggers, toast)
  ├── js/api/{github,sync,zhipu}.js
  ├── js/composables/{useWorkStreams,useSync}.js
  ├── js/services/{storage,status,export}.js
  ├── js/components/*.js (15 components, ALL use named exports)
  └── js/utils/{date,fuzzyMatch}.js
```

## Commands
- Local dev: `cd /home/qingyong/Github_projects/Manager-Pulse && node -e "require('http').createServer((q,r)=>{const f='.'+(q.url==='/'?'/index.html':q.url.split('?')[0]);require('fs').readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return}const t={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};r.writeHead(200,{'Content-Type':t[require('path').extname(f)]||'application/octet-stream'});r.end(d)})}).listen(8080)"`
- Syntax check: `find js -name "*.js" -exec node --check {} \;`
- Import check: `for f in $(find js -name "*.js"); do dir=$(dirname "$f"); grep -oP "from '\\.\\.?/[^']+'" "$f" | while read l; do p=$(echo "$l" | grep -oP "'\\K[^']+"); [ -f "$dir/$p" ] || echo "MISS: $f -> $p"; done; done`

## Known Issues & Pitfalls

### CRITICAL: Named exports with vue-router dynamic imports
vue-router lazy imports MUST extract named exports: `() => import('./X.js').then(m => m.X)`.
All components use `export const ComponentName = { ... }` — there are NO default exports.
NEVER write `() => import('./X.js')` directly in router config — it will pass the module namespace object instead of the component, causing `__vccOpts` crash.

### CRITICAL: `@vue/devtools-api` stub required
Vue 3 ESM browser build imports `@vue/devtools-api` internally. It MUST be mapped in the import map to `./stubs/devtools-api.js` (a minimal stub exporting empty functions). Without this, the app crashes immediately.

### Two sets of files exist
There are PascalCase (`WorkStreamForm.js`) and lowercase (`workStreamForm.js`) versions of some files. They are identical content (Linux case-sensitive FS). The router and imports reference the PascalCase versions.

## Conventions
- All components use render functions (`h()`), no templates/SFC
- State mutations ONLY through `actions.js` functions — never mutate `state` directly
- `currentStatus` field updates in `editWorkStream()` must also update `lastUpdateTime`, `statusLight`, and prepend to `history[]`
- Status light: green (≤5 days), yellow (6-10 days), red (11+ days or never updated). Only manual updates reset the timer, NOT system warnings.
- Mobile breakpoint: 767px (detected via `matchMedia`)
- Input font-size must be ≥16px to prevent iOS auto-zoom

## Prohibitions
- NEVER add a build step, bundler, or package.json
- NEVER use default exports — always named exports
- NEVER put API keys in source code — they live in localStorage via Settings UI
- NEVER create .vue SFC files — this project uses pure JS render functions
