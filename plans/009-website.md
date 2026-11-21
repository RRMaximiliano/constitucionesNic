# Plan 009: Build the "git history" website of Nicaragua's constitutions and deploy it to GitHub Pages

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat b834124..HEAD -- site/index.html site/app.js site/lib.js site/styles.css site/vendor .github/workflows/pages.yml`
> must be empty. `site/data/` exists from plan 008, which is expected.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (static files and a deploy workflow; no package changes)
- **Depends on**: plans/008-site-data.md (`site/data/`), plans/002-github-actions-ci.md (GitHub Actions in use)
- **Category**: direction
- **Planned at**: commit `b834124` (tip of `advisor/005-fix-structural-parsing`), 2026-11-20

## Why this matters

The maintainer's idea: a public page where anyone can follow Nicaragua's
constitutional history **like a git log**. Every published text is a
"commit" with a short hash, date and change summary. Clicking a reform shows
a GitHub-style diff of the articles that changed: words added in green,
removed in red. Clicking a new constitution shows that it replaced the
previous one entirely, with the before/after numbers. Plan 008 already
generated all the data as JSON under `site/data/`. This plan builds the static
page that reads it, plus a GitHub Actions workflow that publishes `site/` to
GitHub Pages. The R package is unaffected (`^site$` is in `.Rbuildignore`).

## Current state

- `site/data/timeline.json` — shape (real values):

```json
{
  "generado": "2026-11-20",
  "portal": "http://legislacion.asamblea.gob.ni",
  "versiones": [
    { "id": "2025", "nombre": "Texto íntegro (2025)", "tipo": "texto_consolidado",
      "linea": "principal", "familia": "1987", "fecha": "2025-01-30",
      "fecha_aprobacion": "2025-01-30", "fecha_publicacion": "2025-02-18",
      "publicacion": "La Gaceta N° 32", "url": "http://legislacion…", "nota": "Incorpora la Ley N° 1234",
      "commit": "9ccb770", "n_articulos": 184, "n_palabras": 12987, "padre": "2024",
      "cambio": { "tipo": "reforma", "archivo": "cambios/2024__2025.json",
                  "resumen": { "sin_cambios": 9, "modificado": 102, "solo_forma": 4,
                               "derogado": 91, "nuevo": 73, "renumerado": 103 } } },
    { "id": "1987", "…": "…", "padre": "1974",
      "cambio": { "tipo": "nueva", "archivo": null,
                  "resumen": { "articulos_antes": 343, "articulos_despues": 202,
                               "palabras_antes": 23118, "palabras_despues": 10323 } } },
    { "id": "1913-non-nata", "linea": "alterna", "padre": null, "cambio": null, "…": "…" }
  ],
  "leyes": [
    { "id": "ley-1268", "nombre": "Ley N° 1268, de Reforma Parcial a los Artículos 23 y 25",
      "fecha_aprobacion": "2026-01-14", "fecha_publicacion": "2026-01-16",
      "publicacion": "La Gaceta N° 9", "url": "http://…", "nota": "Sin texto consolidado publicado",
      "incorporada_en": null }
  ]
}
```

  20 versions (16 `principal`, 4 `alterna`: 1854 draft, 1898 federal, 1913
  non nata, 2024 preliminary) and 5 laws (`ley-1234` is incorporated in
  `2025`; the four 2026 laws have `incorporada_en: null`).
- `site/data/versiones/<id>.json` — `{ "id": "...", "lineas": [ { "line", "text", "titulo", "cap", "subdivision", "art", "tema", "cap_tema", "seccion", "tipo" } ] }`. `seccion` is `preambulo` / `cuerpo` / `cierre`; `tipo` is `encabezado` / `texto`. Values may be `null`.
- `site/data/cambios/<antes>__<despues>.json` — `{ "antes", "despues", "umbral_contenido", "umbral_mismo_numero", "articulos": [ { "estado": "sin_cambios"|"modificado"|"derogado"|"nuevo", "solo_forma", "renumerado", "similitud", "art_antes", "art_despues", "titulo_antes", "titulo_despues", "texto_antes", "texto_despues" } ] }`. `texto_antes` is `null` for `sin_cambios` (only `texto_despues` kept). 5 files: `1987__2010`, `2010__2014`, `2014__2022`, `2022__2024`, `2024__2025`.
- Node.js ≥ 20 is available for tests (`node --version`). Python 3 is available for a local preview server.
- The advisor wrote and tested `site/lib.js` (pure helpers) and `site/tests/lib.test.mjs` against the real data: 8/8 pass. They are embedded below. The visual layer (`index.html`, `app.js`, `styles.css`) is specified in Step 4 for you to build.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Syntax | `node --check site/lib.js && node --check site/app.js` | exit 0 |
| Tests | `node --test site/tests/` | `pass 8`, `fail 0` (or more passes if you add tests) |
| Preview | `python3 -m http.server 8765 -d site` (background; stop it afterwards) | `curl -s -o /dev/null -w '%{http_code}' http://localhost:8765/` → `200` |
| R package unaffected | `P=$PWD; T=$(mktemp -d) && (cd "$T" && R CMD build "$P" && _R_CHECK_FUTURE_FILE_TIMESTAMPS_=FALSE R CMD check --no-manual constitucionesNic_*.tar.gz)` | `Status: OK` |

## Suggested executor toolkit

- If a `frontend-design` (or similar UI design) skill is available, use it for Step 4's visual design. The constraints below take precedence over it.

## Scope

**In scope** (create all):
- `site/index.html`, `site/styles.css`, `site/app.js`
- `site/lib.js`, `site/tests/lib.test.mjs` (exact content below)
- `site/vendor/diff.min.js`, `site/vendor/LICENSE` (jsdiff 5.2.0, downloaded)
- `site/README.md`
- `.github/workflows/pages.yml`
- `plans/README.md` (status row only)

**Out of scope**: `site/data/**` (generated by plan 008; never hand-edit), anything in the R package (`R/`, `data/`, `data-raw/`, `tests/`, `DESCRIPTION`, `README.*`), `.github/workflows/R-CMD-check.yaml`. No build tools: no npm packages, bundlers or frameworks. Plain HTML/CSS/ES modules.

## Git workflow

- Pre-flight: clean tree; `BASE=$(git rev-parse HEAD)`.
- Branch: `advisor/009-website` (from the branch where plan 008 landed).
- Commits: 1. `:sparkles: added site helpers, tests and vendored jsdiff`; 2. `:sparkles: built constitutional history website`; 3. `:rocket: deploy site to github pages`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Vendor jsdiff 5.2.0

```sh
mkdir -p site/vendor
curl -sSL -o site/vendor/diff.min.js https://cdn.jsdelivr.net/npm/diff@5.2.0/dist/diff.min.js
curl -sSL -o site/vendor/LICENSE https://cdn.jsdelivr.net/npm/diff@5.2.0/LICENSE
```

**Verify**: `shasum -a 256 site/vendor/diff.min.js` → `c9bd9f7442db093c796b51b62ae199b619c158fd761a4ca9ac85da58a8024b8c`; `head -1 site/vendor/LICENSE` → `BSD 3-Clause License`. If the hash differs, STOP.

### Step 2: Add the helpers and their tests

Create `site/lib.js` with exactly:

```js
// Pure helpers for the website. No DOM access here, so Node can test them
// (see tests/lib.test.mjs). app.js does all rendering.

export const ETIQUETAS_TIPO = {
  constitucion: 'Constitución',
  texto_consolidado: 'Texto consolidado',
  proyecto: 'Proyecto',
  non_nata: 'No entró en vigor',
  preliminar: 'Texto preliminar',
  federal: 'Constitución federal',
  ley_reforma: 'Ley de reforma',
};

export function etiquetaTipo(tipo) {
  return ETIQUETAS_TIPO[tipo] ?? tipo;
}

// One list for the git-log view, newest first. Reform laws not yet
// incorporated in a published text ("pendientes") come first, like
// uncommitted changes. Incorporated laws are attached to their version.
export function ordenarTimeline(timeline, { incluirAlternas = true } = {}) {
  const leyesPorVersion = new Map();
  const pendientes = [];
  for (const ley of timeline.leyes) {
    if (ley.incorporada_en) {
      if (!leyesPorVersion.has(ley.incorporada_en)) leyesPorVersion.set(ley.incorporada_en, []);
      leyesPorVersion.get(ley.incorporada_en).push(ley);
    } else {
      pendientes.push({ clase: 'ley', ...ley });
    }
  }
  pendientes.sort((a, b) => b.fecha_publicacion.localeCompare(a.fecha_publicacion) || b.id.localeCompare(a.id));
  const versiones = timeline.versiones
    .filter((v) => incluirAlternas || v.linea === 'principal')
    .map((v) => ({ clase: 'version', ...v, leyes: leyesPorVersion.get(v.id) ?? [] }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id.localeCompare(a.id));
  return [...pendientes, ...versiones];
}

// Short text for a version's change, shown next to its commit hash.
export function resumenCambio(version) {
  const c = version.cambio;
  if (!c) return version.linea === 'alterna' ? 'Texto fuera de la línea vigente' : 'Primera constitución';
  const r = c.resumen;
  if (c.tipo === 'reforma') {
    return `+${r.nuevo} −${r.derogado} ~${r.modificado} artículos`;
  }
  return `Nueva constitución: ${r.articulos_antes} → ${r.articulos_despues} artículos`;
}

// Articles of a change file to display. By default unchanged articles are
// hidden; format-only edits can be hidden too.
export function filtrarCambios(articulos, { mostrarSinCambios = false, mostrarSoloForma = true, estados = null } = {}) {
  return articulos.filter((a) =>
    (mostrarSinCambios || a.estado !== 'sin_cambios') &&
    (mostrarSoloForma || !a.solo_forma) &&
    (!estados || estados.includes(a.estado)));
}

// Group articles by título for display, keeping their order.
export function agruparPorTitulo(articulos) {
  const grupos = [];
  for (const a of articulos) {
    const titulo = a.titulo_despues ?? a.titulo_antes ?? 'Sin título';
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.titulo === titulo) ultimo.articulos.push(a);
    else grupos.push({ titulo, articulos: [a] });
  }
  return grupos;
}

// Word-level diff tokens. `diffWords` must be jsdiff's Diff.diffWordsWithSpace
// (whitespace is significant, so both texts can be rebuilt exactly from the
// tokens; plain Diff.diffWords hides line-break changes). Injected so this
// module stays pure and testable in Node.
export function tokensDiff(antes, despues, diffWords) {
  return diffWords(antes ?? '', despues ?? '').map((p) => ({
    tipo: p.added ? 'agregado' : p.removed ? 'eliminado' : 'igual',
    texto: p.value,
  }));
}

// Route parsing for hash URLs: #/ , #/v/<id> , #/c/<id>
export function parsearRuta(hash) {
  const partes = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (partes[0] === 'v' && partes[1]) return { vista: 'version', id: partes[1] };
  if (partes[0] === 'c' && partes[1]) return { vista: 'cambio', id: partes[1] };
  return { vista: 'timeline' };
}
```

Create `site/tests/lib.test.mjs` with exactly:

```js
// Smoke tests for site/lib.js against the real generated data.
// Run from the repo root: node --test site/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ordenarTimeline, resumenCambio, filtrarCambios, agruparPorTitulo, tokensDiff, parsearRuta, etiquetaTipo } from '../lib.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const datos = (p) => JSON.parse(readFileSync(join(aqui, '..', 'data', p), 'utf8'));
const Diff = createRequire(import.meta.url)('../vendor/diff.min.js');
const timeline = datos('timeline.json');

test('timeline has every version and law', () => {
  assert.equal(timeline.versiones.length, 20);
  assert.equal(timeline.leyes.length, 5);
});

test('ordenarTimeline puts pending laws first, then versions newest first', () => {
  const lista = ordenarTimeline(timeline);
  assert.equal(lista.length, 24); // 20 versions + 4 pending laws (ley-1234 is attached to 2025)
  assert.deepEqual(lista.slice(0, 4).map((e) => e.clase), ['ley', 'ley', 'ley', 'ley']);
  assert.equal(lista[4].id, '2025');
  assert.deepEqual(lista[4].leyes.map((l) => l.id), ['ley-1234']);
  assert.equal(lista[lista.length - 1].id, '1826');
  const principales = ordenarTimeline(timeline, { incluirAlternas: false }).filter((e) => e.clase === 'version');
  assert.equal(principales.length, 16);
});

test('resumenCambio describes reforms and new constitutions', () => {
  const v = Object.fromEntries(timeline.versiones.map((x) => [x.id, x]));
  assert.equal(resumenCambio(v['2025']), '+73 −91 ~102 artículos');
  assert.equal(resumenCambio(v['1987']), 'Nueva constitución: 343 → 202 artículos');
  assert.equal(resumenCambio(v['1826']), 'Primera constitución');
  assert.equal(resumenCambio(v['1913-non-nata']), 'Texto fuera de la línea vigente');
});

test('every change file referenced by the timeline exists and is consistent', () => {
  for (const v of timeline.versiones) {
    if (v.cambio?.tipo !== 'reforma') continue;
    const c = datos(v.cambio.archivo);
    assert.equal(c.antes, v.padre);
    assert.equal(c.despues, v.id);
    const n = (e) => c.articulos.filter((a) => a.estado === e).length;
    assert.equal(n('nuevo'), v.cambio.resumen.nuevo);
    assert.equal(n('derogado'), v.cambio.resumen.derogado);
    assert.equal(n('modificado'), v.cambio.resumen.modificado);
  }
});

test('filtrarCambios and agruparPorTitulo', () => {
  const c = datos('cambios/2022__2024.json');
  assert.equal(filtrarCambios(c.articulos).length, 6);
  assert.equal(filtrarCambios(c.articulos, { mostrarSinCambios: true }).length, 202);
  assert.equal(filtrarCambios(c.articulos, { mostrarSoloForma: false }).length, 5);
  const grupos = agruparPorTitulo(filtrarCambios(c.articulos, { mostrarSinCambios: true }));
  assert.equal(grupos.reduce((s, g) => s + g.articulos.length, 0), 202);
});

test('tokensDiff reconstructs both texts for every modified article', () => {
  for (const archivo of ['cambios/2022__2024.json', 'cambios/2024__2025.json']) {
    for (const a of datos(archivo).articulos.filter((x) => x.estado === 'modificado')) {
      const t = tokensDiff(a.texto_antes, a.texto_despues, Diff.diffWordsWithSpace);
      assert.equal(t.filter((x) => x.tipo !== 'agregado').map((x) => x.texto).join(''), a.texto_antes);
      assert.equal(t.filter((x) => x.tipo !== 'eliminado').map((x) => x.texto).join(''), a.texto_despues);
    }
  }
});

test('version files exist for every version', () => {
  for (const v of timeline.versiones) {
    const f = datos(`versiones/${v.id}.json`);
    assert.equal(f.id, v.id);
    assert.ok(f.lineas.length > 250);
  }
});

test('parsearRuta and etiquetaTipo', () => {
  assert.deepEqual(parsearRuta(''), { vista: 'timeline' });
  assert.deepEqual(parsearRuta('#/v/1838'), { vista: 'version', id: '1838' });
  assert.deepEqual(parsearRuta('#/c/2025'), { vista: 'cambio', id: '2025' });
  assert.equal(etiquetaTipo('non_nata'), 'No entró en vigor');
});
```

**Verify**: `node --check site/lib.js` → exit 0; `node --test site/tests/` → `pass 8`, `fail 0`.

Commit 1.

### Step 3: Read the design brief

Requirements for the page. Every point is checked in review:

1. **Language**: all UI text in Spanish. `<html lang="es">`.
2. **Metaphor**: a git log. Each version is a commit row: a dot on a
   vertical line, the 7-char `commit` hash in monospace, the version `nombre`,
   its `fecha` formatted in Spanish (e.g. "30 de enero de 2025"), a type badge
   (`etiquetaTipo(tipo)`), and `resumenCambio(version)` with `+n` in green,
   `−n` in red and `~n` in amber. Signs and text always accompany colors, so
   the page is never color-only.
3. **Pending laws first**: the 4 `pendientes` from `ordenarTimeline` sit at
   the top, styled like uncommitted changes, under a heading such as "Cambios
   sin texto consolidado". Each links to its portal `url`.
4. **Alternate texts** (`linea == "alterna"`) appear in date order but
   visually set off (muted, dashed connector, a badge like "No vigente").
   A toggle "Mostrar proyectos y textos no vigentes" (default on) uses
   `ordenarTimeline(timeline, { incluirAlternas })`.
5. **Routes** (use `parsearRuta(location.hash)` and listen to `hashchange`):
   - `#/` timeline.
   - `#/v/<id>` full text of a version: header (name, dates, publication, `nota`, link "Ver en el portal de la Asamblea" → `url`, and for versions with a parent, a link "Ver cambios" → `#/c/<id>`). Render `lineas` in order. Rows with `tipo == "encabezado"` are headings: TÍTULO lines larger, CAPÍTULO smaller, topic and name lines as subtitles. Body text in a readable serif or system font at a comfortable measure (about 70ch). Mark `preambulo` and `cierre` sections subtly. Include a short table of contents of the títulos (or capítulos when a text has no títulos).
   - `#/c/<id>` change from the version's `padre` to `<id>`:
     - **reforma**: header "<padre> → <id>" with the summary counts; filter chips per `estado` (Modificados / Nuevos / Derogados), a checkbox "Mostrar artículos sin cambios" (default off) and a checkbox "Incluir cambios de forma" (default on). All of these go through `filtrarCambios`. Group with `agruparPorTitulo`. Each article is a diff block like a GitHub file diff. Header: "Art. 139 → Art. 133" when `renumerado`, otherwise "Art. 133", plus the estado badge and, for matched pairs, `similitud` as "similitud 0,94". Body: for `modificado`, the tokens of `tokensDiff(texto_antes, texto_despues, Diff.diffWordsWithSpace)` with `agregado` in `<ins>`, `eliminado` in `<del>`, `igual` as plain text, preserving line breaks (`white-space: pre-wrap`). `nuevo` shows `texto_despues` all green, `derogado` shows `texto_antes` all red, and `sin_cambios` shows `texto_despues` plainly.
     - **nueva**: a card saying the text replaced the previous constitution entirely ("Nueva constitución: reemplaza por completo a la de <padre>"), with articles and words before → after, and links to read both texts (`#/v/<padre>`, `#/v/<id>`). No article diff.
     - version without a parent: show the version page instead.
   - Unknown id: a friendly "No encontrado" with a link back to `#/`.
6. **Data loading**: `fetch('data/timeline.json')` once at start. Version and change files are fetched lazily on first visit and cached in a `Map`. All paths are relative (the site must work under a GitHub Pages sub-path like `/constitucionesNic/`). Show a loading state and an error state if a fetch fails.
7. **Safety**: every piece of data goes into the DOM via `textContent` / `createElement`. **Never `innerHTML`** with data. The text comes from an external website. `grep -n "innerHTML" site/app.js` must print nothing.
8. **jsdiff**: load `vendor/diff.min.js` with a classic `<script>` before `app.js` (it defines `window.Diff`). `app.js` is `<script type="module">` and imports from `./lib.js`.
9. **Layout and theme**: works from 360 px wide (16 px side gutters, no horizontal page scroll; long diff blocks wrap) up to desktop (content max about 960 px). Colors defined as CSS custom properties on `:root`, with a dark theme under `@media (prefers-color-scheme: dark)`. System font stack; monospace for hashes and article numbers. Visible focus styles; all controls reachable by keyboard; chips are real `<button>`s with `aria-pressed`.
10. **Header/footer**: title "Historia constitucional de Nicaragua", a one-paragraph explanation in Spanish of how to read the page (commits = textos publicados; diffs only between versions of the same constitution), and a footer crediting the source ("Textos: Asamblea Nacional de Nicaragua, legislacion.asamblea.gob.ni"), linking the GitHub repo `https://github.com/RRMaximiliano/constitucionesNic`, and showing `generado`.

### Step 4: Build `index.html`, `styles.css`, `app.js`

Implement the brief. Keep `app.js` focused on rendering and routing, and use
the `lib.js` helpers instead of re-implementing their logic. No external
fonts, CDNs or analytics.

**Verify**:
- `node --check site/app.js` → exit 0
- `grep -c 'innerHTML' site/app.js` → `0`
- `grep -c 'lang="es"' site/index.html` → `1`; `grep -c 'name="viewport"' site/index.html` → `1`
- `grep -c 'vendor/diff.min.js' site/index.html` → `1`; `grep -c 'type="module"' site/index.html` → at least `1`
- `grep -c "from './lib.js'" site/app.js` → `1`
- `grep -c 'prefers-color-scheme: dark' site/styles.css` → at least `1`
- Preview: start `python3 -m http.server 8765 -d site` in the background. Then
  `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8765/` → `200`,
  `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8765/data/cambios/2024__2025.json` → `200`.
  Stop the server.
- `node --test site/tests/` still → `fail 0`

Commit 2.

### Step 5: Write `site/README.md`

Short Spanish README covering:
- what the site is;
- how to preview it locally (`python3 -m http.server 8765 -d site`, then open `http://localhost:8765`);
- how to regenerate the data (`Rscript data-raw/DATASET.R && Rscript data-raw/site_data.R`);
- how to run the tests (`node --test site/tests/`);
- that `site/data/` is generated and must not be edited by hand.

### Step 6: Add the Pages workflow

Create `.github/workflows/pages.yml`:

```yaml
name: Pages

on:
  push:
    branches: [main, master]
    paths: ['site/**', '.github/workflows/pages.yml']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: node --test site/tests/
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: site
      - id: deployment
        uses: actions/deploy-pages@v4
```

**Verify**: `Rscript -e 'y <- yaml::read_yaml(".github/workflows/pages.yml"); stopifnot(!is.null(y$jobs$deploy)); cat("ok\n")'` → `ok`.

Commit 3 (README + workflow).

### Step 7: R package still fine

**Verify**: R build + check → `Status: OK` (`site/` is excluded by `.Rbuildignore`).

## Test plan

- `site/tests/lib.test.mjs` (8 tests, given). It covers: data completeness;
  timeline ordering (pending laws first, newest first, alternates
  toggleable); summary strings; consistency of every change file with its
  timeline counts; the filters; and exact reconstruction of both texts from
  diff tokens for every modified article in 2022→2024 and 2024→2025.
- You may add tests for any new pure helper you put in `lib.js` (keep DOM code out of `lib.js`).
- Visual and interaction review is done by the reviewer in a browser against the Step 3 brief. Make sure every route renders without console errors.

## Done criteria

- [ ] jsdiff hash matches; LICENSE present
- [ ] `node --test site/tests/` → `fail 0`
- [ ] All Step 4 grep checks pass (in particular `innerHTML` count 0)
- [ ] Preview server serves `/` and the data files with 200
- [ ] `.github/workflows/pages.yml` parses
- [ ] R build + check → `Status: OK`
- [ ] Changed files ⊆ in-scope list (`git diff --name-only "$BASE"..HEAD`)
- [ ] `plans/README.md` status row for 009 updated, noting: "deploy pending: enable Settings → Pages → Source: GitHub Actions, then merge to master"

## STOP conditions

- The jsdiff download fails or its hash differs.
- `node --test` fails on the given `lib.js`/tests before you change anything (data differs from plan 008's).
- The design seems to require editing `site/data/` or the R package. It doesn't; stop and ask.
- You want to add a framework, bundler or npm dependency.

## Maintenance notes

- **Publishing**: the operator must enable GitHub Pages once (repo Settings → Pages → Build and deployment → Source: *GitHub Actions*). The workflow then deploys on every push to `master` that touches `site/`. The site URL will be `https://rrmaximiliano.github.io/constitucionesNic/`.
- When the data changes (new consolidated text), regenerate `site/data/` with plan 008's script and update the counts in `site/tests/lib.test.mjs`. The CI step `node --test` blocks the deploy if they disagree.
- `similitud` is shown so readers can judge borderline matches. The matching method (Jaccard ≥ 0,35, or ≥ 0,15 for the same number) is worth explaining in a short "Metodología" note on the page if the maintainer wants one.
- Reviewer focus: no `innerHTML`; relative paths; the page works at 360 px; dark mode; the diff view of 2024 → 2025 (the largest, 275 articles) stays responsive.
