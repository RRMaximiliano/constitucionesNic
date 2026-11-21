# Plan 010: Make the website a GitHub-style `git diff` (compare any two versions)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report; do not improvise. When done, update the status row for this plan
> in `plans/README.md`, unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8171286..HEAD -- site/`
> must print nothing. If `site/` changed since this plan was written, STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (static site only; no package or data changes)
- **Depends on**: 009 (the website). Start from `advisor/009-website` @ `8171286` or any commit containing it.
- **Category**: feature (website)
- **Planned at**: commit `8171286`, 2026-11-21

## Why this matters

Plan 009 built the site as a **commit log**. Each reform opened as article
cards with words highlighted inline. Transitions between different
constitutions showed only a "replaced entirely" card.

The maintainer asked for a **git diff** instead, and chose the GitHub
"compare" design:

- the diff is the main view;
- the reader picks **any two versions**, base and compare, including different constitutions (1826 vs 2025, 1948 vs 1950);
- the page shows a unified red/green **line** diff, with −/+ gutters, line numbers, `@@` hunk headers that name the título and article, changed words highlighted, and unchanged lines folded;
- a split view is available;
- the commit log becomes a sidebar, and clicking a commit shows its diff against the previous text.

The advisor prototyped the diff engine on the real data:

- every pair of texts diffs in under 100 ms in Node, so diffs are computed in the browser and no new data files are needed;
- the engine rebuilds both texts exactly for all 22 tested pairs;
- comparisons across constitutions are meaningful. 1948 → 1950 pairs 433 edited paragraphs; 1939 → 1948 pairs 368.

## Current state

`site/` is vanilla HTML, CSS and ES modules with no build step.

- `site/index.html`: the page shell (header, `#migas`, `#anuncio` live region, `<main id="principal">`, footer). It loads `vendor/diff.min.js` (jsdiff 5.2.0, global `Diff`) and then `app.js` as a module.
- `site/lib.js`: pure helpers with no DOM, tested in Node:
  - `etiquetaTipo`, `ordenarTimeline`, `resumenCambio`, `filtrarCambios`, `agruparPorTitulo`, `tokensDiff`;
  - `parsearRuta`, which returns `{vista:'timeline'}`, `{vista:'version',id}` or `{vista:'cambio',id}`.
- `site/app.js` (426 lines): renders through an `el()` helper (createElement/textContent only, with **no `innerHTML`** because the texts come from an external site). It has three views:
  - `vistaTimeline`: a git-log page of `tarjetaVersion`/`tarjetaLey` cards;
  - `vistaVersion`: the full text of one version;
  - `vistaCambio`: for reforms, article cards via `bloqueArticulo`/`pintarArticulos` with filter chips; for new constitutions, the `tarjetaNueva` "replaced entirely" card.

  Every async view checks `if (mio !== token) return;` after each `await`. `anunciar()` writes to the `#anuncio` live region. `document.body.classList.toggle('inicio', …)` shows the long intro on the home page only.
- `site/styles.css`: color tokens on `:root`, with a dark-mode block. Includes `--verde`, `--verde-fondo`, `--rojo`, `--rojo-fondo`, `--ambar`, `--ambar-fondo`, `--lago`, `--lago-fondo`, `--linea`, `--papel`, `--superficie`, `--tinta`, `--tinta-suave`, `--mono`, `--serif`, `--sans`.
- `site/data/`: `timeline.json` (20 `versiones` and 5 `leyes`), `versiones/<id>.json` (`{id, lineas:[{line, text, titulo, cap, art, tema, cap_tema, seccion, tipo, ...}]}`, where `line` is 1-based and contiguous), and `cambios/<a>__<b>.json` (article-level alignment for the five reforms). **Generated: do not edit.**
- `site/tests/lib.test.mjs`: 8 Node tests. `node --test site/tests/` → 8 pass.
- In `timeline.json`, `padre` is `null` for 1826 and for the four `linea: "alterna"` texts (1854-proyecto, 1898-federal, 1913-non-nata, 2024-preliminar). Different constitutions have different `familia`; the 1987 family is 1987, 2010, 2014, 2022, 2024, 2024-preliminar and 2025.

## Commands you will need

Run from the repo root.

| Purpose | Command | Expected |
|---|---|---|
| Tests | `node --test site/tests/` | `pass 15`, `fail 0` |
| Hashes | `shasum -a 256 site/lib.js site/tests/diff.test.mjs site/tests/lib.test.mjs` | the three hashes in Step 1/2 |
| Local server | `python3 -m http.server 8765 -d site` (run in background, stop it when done) | serves the site |
| Rendered DOM | `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --virtual-time-budget=8000 --dump-dom "http://localhost:8765/#/compare/vacio...1826"` | DOM after JS runs |

If Chrome is not at that path, try `google-chrome` or `chromium` on PATH. If
none exists, skip the DOM checks in Step 6 and say so in your report: the
reviewer will run them.

## Scope

**In scope** (the only files you may modify or create):
- `site/lib.js` (replace wholesale with Step 1's content)
- `site/tests/diff.test.mjs` (new, Step 2)
- `site/tests/lib.test.mjs` (one line, Step 2)
- `site/app.js`
- `site/styles.css`
- `site/index.html`
- `site/README.md`

**Out of scope**: `site/data/**`, `site/vendor/**`, `data-raw/**`, R files,
`DESCRIPTION`, `.github/**`, `plans/**`. Do not add dependencies,
frameworks, build tools or fonts.

## Git workflow

- Pre-flight: `git status --porcelain --untracked-files=no` prints nothing; `BASE=$(git rev-parse HEAD)`.
- Branch: `advisor/010-git-diff-view`.
- Commits (gitmoji, short lowercase, like the repo):
  1. `:sparkles: added line diff helpers for compare view` (Steps 1–2)
  2. `:sparkles: website is now a github-style compare (git diff)` (Steps 3–5)
- Do NOT push or open a PR.

## Steps

### Step 1: Replace `site/lib.js`

Write `site/lib.js` with **exactly** the content of the block below. Copy it
mechanically, for example by slicing the block out of this file with a
script, and do not retype it. It keeps every existing export unchanged except
`parsearRuta`, which now returns `{vista:'inicio'}` instead of
`{vista:'timeline'}` and understands `#/compare/<base>...<head>`. It adds
the diff engine.

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

// Route parsing for hash URLs:
//   #/                         -> inicio (compare the latest text with its parent)
//   #/compare/<base>...<head>  -> comparar any two versions (GitHub syntax)
//   #/v/<id>                   -> read one version
//   #/c/<id>                   -> old link; app.js redirects it to compare
export function parsearRuta(hash) {
  const partes = (hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (partes[0] === 'v' && partes[1]) return { vista: 'version', id: partes[1] };
  if (partes[0] === 'c' && partes[1]) return { vista: 'cambio', id: partes[1] };
  if (partes[0] === 'compare' && partes[1]) {
    const m = /^(.+?)\.\.\.(.+)$/.exec(partes[1]);
    if (m) return { vista: 'comparar', base: m[1], head: m[2] };
  }
  return { vista: 'inicio' };
}

export function rutaComparar(base, head) {
  return `#/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
}

// ---------- git diff ----------

// Base id meaning "empty text", like git's empty tree: comparing against it
// shows a whole version as added (used for the first constitution).
export const VACIO = 'vacio';

// What a version is compared with when its commit is clicked in the log:
// its parent, or for texts outside the main line (drafts, texts that never
// took effect) the main-line text in force just before it, or VACIO.
export function padreParaComparar(version, versiones) {
  if (version.padre) return version.padre;
  const previas = versiones
    .filter((x) => x.linea === 'principal' && x.fecha < version.fecha)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  return previas[0]?.id ?? VACIO;
}

// Default comparison for #/ : the newest main-line text against its parent.
export function comparacionInicial(versiones) {
  const ultima = versiones
    .filter((x) => x.linea === 'principal')
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  return { base: padreParaComparar(ultima, versiones), head: ultima.id };
}

// The article-level change file (from site_data.R) exists only for a reform
// compared with its own parent. Returns its path under data/, or null.
export function archivoArticulos(base, headVersion) {
  const c = headVersion?.cambio;
  return c?.tipo === 'reforma' && headVersion.padre === base ? c.archivo : null;
}

const SEPARADOR = /[^\p{L}\p{N}]+/u;
function palabras(texto) {
  return new Set((texto || '').toLowerCase().split(SEPARADOR).filter(Boolean));
}

// Word-set Jaccard similarity of two strings (or precomputed word sets).
export function similitud(a, b) {
  const A = a instanceof Set ? a : palabras(a);
  const B = b instanceof Set ? b : palabras(b);
  if (!A.size && !B.size) return 1;
  let comun = 0;
  for (const w of A) if (B.has(w)) comun++;
  return comun / (A.size + B.size - comun);
}

// Inside one block of removed and added lines, pair each edited paragraph
// with its new version so the changed words can be highlighted. Pairs keep
// their order (no crossings) and maximize total similarity, like a weighted
// LCS; a pair needs similitud >= umbral. Returns [[i, j], ...] ascending.
export function emparejar(antes, despues, umbral = 0.4) {
  const n = antes.length;
  const m = despues.length;
  if (!n || !m) return [];
  const A = antes.map(palabras);
  const B = despues.map(palabras);
  const W = m + 1;
  const puntos = new Float64Array((n + 1) * W);
  const sim = new Float64Array(n * m);
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = similitud(A[i - 1], B[j - 1]);
      sim[(i - 1) * m + (j - 1)] = s;
      let mejor = Math.max(puntos[(i - 1) * W + j], puntos[i * W + j - 1]);
      if (s >= umbral) mejor = Math.max(mejor, puntos[(i - 1) * W + j - 1] + s);
      puntos[i * W + j] = mejor;
    }
  }
  const pares = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const s = sim[(i - 1) * m + (j - 1)];
    if (s >= umbral && puntos[i * W + j] === puntos[(i - 1) * W + j - 1] + s) {
      pares.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (puntos[i * W + j] === puntos[(i - 1) * W + j]) {
      i--;
    } else {
      j--;
    }
  }
  return pares.reverse();
}

// Line-level diff of two versions' `lineas` arrays (one paragraph per line),
// like `git diff`. `diffArrays` is jsdiff's Diff.diffArrays and `diffWords`
// Diff.diffWordsWithSpace (injected to keep this module pure). Returns ops:
//   { tipo: 'igual', a, b }                         one unchanged line
//   { tipo: 'cambio', eliminadas, agregadas, pares } one block of changes
// where eliminadas = [{ linea, tokens }], agregadas = [{ linea, tokens }],
// `linea` is the original line object and `tokens` (word diff, from
// tokensDiff) is set only on paired lines.
export function diffLineas(antes, despues, { diffArrays, diffWords }) {
  const partes = diffArrays(antes.map((l) => l.text), despues.map((l) => l.text));
  const ops = [];
  let ia = 0;
  let ib = 0;
  let k = 0;
  while (k < partes.length) {
    const p = partes[k];
    if (!p.added && !p.removed) {
      for (let c = 0; c < p.count; c++) ops.push({ tipo: 'igual', a: antes[ia++], b: despues[ib++] });
      k++;
      continue;
    }
    const eliminadas = [];
    const agregadas = [];
    while (k < partes.length && (partes[k].added || partes[k].removed)) {
      for (let c = 0; c < partes[k].count; c++) {
        if (partes[k].removed) eliminadas.push({ linea: antes[ia++], tokens: null });
        else agregadas.push({ linea: despues[ib++], tokens: null });
      }
      k++;
    }
    const pares = emparejar(eliminadas.map((x) => x.linea.text), agregadas.map((x) => x.linea.text));
    for (const [i, j] of pares) {
      const t = tokensDiff(eliminadas[i].linea.text, agregadas[j].linea.text, diffWords);
      eliminadas[i].tokens = t.filter((x) => x.tipo !== 'agregado');
      agregadas[j].tokens = t.filter((x) => x.tipo !== 'eliminado');
    }
    ops.push({ tipo: 'cambio', eliminadas, agregadas, pares });
  }
  return ops;
}

// Line counts for the stat line (`git diff --stat`).
export function estadisticas(ops) {
  let agregadas = 0;
  let eliminadas = 0;
  let iguales = 0;
  for (const o of ops) {
    if (o.tipo === 'igual') iguales++;
    else {
      agregadas += o.agregadas.length;
      eliminadas += o.eliminadas.length;
    }
  }
  return { agregadas, eliminadas, iguales };
}

// Unified-view rows of one 'cambio' op. Unlike plain git, each edited
// paragraph's old line is followed directly by its new line, so long blocks
// stay readable. Rows: { tipo: 'eliminado' | 'agregado', linea, tokens }.
export function filasUnificadas(op) {
  const filas = [];
  const fin = [op.eliminadas.length, op.agregadas.length];
  let i = 0;
  let j = 0;
  for (const [pi, pj] of [...op.pares, fin]) {
    while (i < pi) filas.push({ tipo: 'eliminado', ...op.eliminadas[i++] });
    while (j < pj) filas.push({ tipo: 'agregado', ...op.agregadas[j++] });
    if (pi < fin[0]) {
      filas.push({ tipo: 'eliminado', ...op.eliminadas[i++] });
      filas.push({ tipo: 'agregado', ...op.agregadas[j++] });
    }
  }
  return filas;
}

// Split-view rows of one 'cambio' op: [{ izq, der }], each side an
// eliminadas/agregadas entry or null. Paired paragraphs share a row;
// unpaired lines are stacked side by side as GitHub does.
export function filasDivididas(op) {
  const filas = [];
  const fin = [op.eliminadas.length, op.agregadas.length];
  let i = 0;
  let j = 0;
  for (const [pi, pj] of [...op.pares, fin]) {
    while (i < pi || j < pj) {
      filas.push({ izq: i < pi ? op.eliminadas[i++] : null, der: j < pj ? op.agregadas[j++] : null });
    }
    if (pi < fin[0]) filas.push({ izq: op.eliminadas[i++], der: op.agregadas[j++] });
  }
  return filas;
}

// "TÍTULO I · Art. 5" for a line object, shown after a hunk's @@ header.
export function contextoLinea(linea) {
  if (!linea) return '';
  return [linea.titulo, linea.art != null ? `Art. ${linea.art}` : null].filter(Boolean).join(' · ');
}

// Group ops into hunks with `contexto` unchanged lines around each change;
// longer unchanged runs become folds the reader can expand. Returns
//   { tipo: 'hunk', ops, a0, na, b0, nb, contexto }  (a0/b0 1-based, 0 if none)
//   { tipo: 'pliegue', ops }                         (only 'igual' ops)
// Concatenating every item's ops gives back the input.
export function agruparHunks(ops, contexto = 1) {
  const visible = new Array(ops.length).fill(false);
  ops.forEach((o, i) => {
    if (o.tipo !== 'cambio') return;
    for (let k = Math.max(0, i - contexto); k <= Math.min(ops.length - 1, i + contexto); k++) visible[k] = true;
  });
  const salida = [];
  let k = 0;
  while (k < ops.length) {
    const v = visible[k];
    let f = k;
    while (f < ops.length && visible[f] === v) f++;
    const tramo = ops.slice(k, f);
    salida.push(v ? { tipo: 'hunk', ops: tramo, ...cabeceraHunk(tramo) } : { tipo: 'pliegue', ops: tramo });
    k = f;
  }
  return salida;
}

function cabeceraHunk(tramo) {
  const viejas = [];
  const nuevas = [];
  let primerCambio = null;
  for (const o of tramo) {
    if (o.tipo === 'igual') {
      viejas.push(o.a.line);
      nuevas.push(o.b.line);
    } else {
      for (const e of o.eliminadas) viejas.push(e.linea.line);
      for (const g of o.agregadas) nuevas.push(g.linea.line);
      if (!primerCambio) primerCambio = o.agregadas[0]?.linea ?? o.eliminadas[0]?.linea;
    }
  }
  return {
    a0: viejas[0] ?? 0, na: viejas.length,
    b0: nuevas[0] ?? 0, nb: nuevas.length,
    contexto: contextoLinea(primerCambio),
  };
}

// "@@ -12,4 +12,6 @@" for a hunk.
export function formatoHunk(h) {
  return `@@ -${h.a0},${h.na} +${h.b0},${h.nb} @@`;
}
```

**Verify**: `shasum -a 256 site/lib.js` →
`218258bb6986c5440369ea803ef7b8b4d1c797a4aac7c186f46cc020abaebdba`. On a
mismatch, re-extract the block. Do not hand-fix it. If it still mismatches,
STOP.

### Step 2: Tests

1. Create `site/tests/diff.test.mjs` with exactly this content:

```js
// Tests for the git-diff helpers in site/lib.js, on the real generated data.
// Run from the repo root: node --test site/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parsearRuta, rutaComparar, VACIO, padreParaComparar, comparacionInicial,
  archivoArticulos, similitud, emparejar, diffLineas, estadisticas,
  filasUnificadas, filasDivididas, agruparHunks, formatoHunk,
} from '../lib.js';

const aqui = dirname(fileURLToPath(import.meta.url));
const datos = (p) => JSON.parse(readFileSync(join(aqui, '..', 'data', p), 'utf8'));
const Diff = createRequire(import.meta.url)('../vendor/diff.min.js');
const timeline = datos('timeline.json');
const versiones = timeline.versiones;
const porId = Object.fromEntries(versiones.map((v) => [v.id, v]));
const lineas = (id) => (id === VACIO ? [] : datos(`versiones/${id}.json`).lineas);
const comparar = (a, b) => diffLineas(lineas(a), lineas(b), { diffArrays: Diff.diffArrays, diffWords: Diff.diffWordsWithSpace });

test('parsearRuta and rutaComparar handle compare routes', () => {
  assert.deepEqual(parsearRuta(''), { vista: 'inicio' });
  assert.deepEqual(parsearRuta('#/'), { vista: 'inicio' });
  assert.deepEqual(parsearRuta('#/compare/2024...2025'), { vista: 'comparar', base: '2024', head: '2025' });
  assert.deepEqual(parsearRuta('#/compare/vacio...1826'), { vista: 'comparar', base: VACIO, head: '1826' });
  assert.deepEqual(parsearRuta('#/compare/2024..2025'), { vista: 'inicio' });
  assert.deepEqual(parsearRuta('#/c/2025'), { vista: 'cambio', id: '2025' });
  assert.deepEqual(parsearRuta('#/v/1838'), { vista: 'version', id: '1838' });
  assert.equal(rutaComparar('1854-proyecto', '2025'), '#/compare/1854-proyecto...2025');
  assert.deepEqual(parsearRuta(rutaComparar('2024-preliminar', '2024')), { vista: 'comparar', base: '2024-preliminar', head: '2024' });
});

test('padreParaComparar, comparacionInicial and archivoArticulos', () => {
  const p = (id) => padreParaComparar(porId[id], versiones);
  assert.equal(p('1826'), VACIO);
  assert.equal(p('1838'), '1826');
  assert.equal(p('1854-proyecto'), '1838');
  assert.equal(p('1898-federal'), '1894');
  assert.equal(p('1913-non-nata'), '1912');
  assert.equal(p('2024-preliminar'), '2024');
  assert.equal(p('2025'), '2024');
  assert.deepEqual(comparacionInicial(versiones), { base: '2024', head: '2025' });
  assert.equal(archivoArticulos('2024', porId['2025']), 'cambios/2024__2025.json');
  assert.equal(archivoArticulos('2022', porId['2025']), null);
  assert.equal(archivoArticulos('1974', porId['1987']), null);
  assert.equal(archivoArticulos(VACIO, porId['1826']), null);
});

test('similitud and emparejar', () => {
  assert.equal(similitud('La Patria', 'la patria.'), 1);
  assert.equal(similitud('uno dos', 'tres'), 0);
  assert.deepEqual(emparejar(
    ['Artículo 1 La soberanía reside en el pueblo'],
    ['Artículo 1 La soberanía reside en el Pueblo nicaragüense']), [[0, 0]]);
  assert.deepEqual(emparejar(['uno dos tres'], ['cuatro cinco seis']), []);
  // Pairs never cross: two swapped paragraphs give one pair, not two.
  assert.equal(emparejar(['uno dos tres', 'cuatro cinco seis'], ['cuatro cinco seis', 'uno dos tres']).length, 1);
});

// Every pair of consecutive texts (by date), plus the empty base and two
// comparisons across constitutions.
const pares = [...versiones].sort((a, b) => a.fecha.localeCompare(b.fecha))
  .map((v, i, arr) => (i ? [arr[i - 1].id, v.id] : [VACIO, v.id]))
  .concat([['1826', '2025'], ['1974', '1987']]);

test('diffLineas rebuilds both texts exactly', () => {
  for (const [a, b] of pares) {
    const ops = comparar(a, b);
    const viejas = [];
    const nuevas = [];
    for (const o of ops) {
      if (o.tipo === 'igual') {
        assert.equal(o.a.text, o.b.text);
        viejas.push(o.a.text);
        nuevas.push(o.b.text);
        continue;
      }
      viejas.push(...o.eliminadas.map((e) => e.linea.text));
      nuevas.push(...o.agregadas.map((g) => g.linea.text));
      for (const [i, j] of o.pares) {
        assert.equal(o.eliminadas[i].tokens.map((t) => t.texto).join(''), o.eliminadas[i].linea.text);
        assert.equal(o.agregadas[j].tokens.map((t) => t.texto).join(''), o.agregadas[j].linea.text);
      }
    }
    assert.deepEqual(viejas, lineas(a).map((l) => l.text), `${a}...${b} old side`);
    assert.deepEqual(nuevas, lineas(b).map((l) => l.text), `${a}...${b} new side`);
  }
});

test('estadisticas', () => {
  assert.deepEqual(estadisticas(comparar('2022', '2024')), { agregadas: 30, eliminadas: 25, iguales: 695 });
  assert.deepEqual(estadisticas(comparar('2024', '2025')), { agregadas: 463, eliminadas: 637, iguales: 88 });
  assert.deepEqual(estadisticas(comparar(VACIO, '1826')), { agregadas: 317, eliminadas: 0, iguales: 0 });
  assert.deepEqual(estadisticas(comparar('1987', '1987')), { agregadas: 0, eliminadas: 0, iguales: 528 });
});

test('agruparHunks covers every op with correct headers', () => {
  for (const [a, b] of [['2022', '2024'], ['2024', '2025'], [VACIO, '1826'], ['1987', '1987']]) {
    const ops = comparar(a, b);
    const items = agruparHunks(ops, 1);
    assert.deepEqual(items.flatMap((x) => x.ops), ops);
    for (const x of items) {
      if (x.tipo === 'pliegue') {
        assert.ok(x.ops.every((o) => o.tipo === 'igual'));
        continue;
      }
      assert.ok(x.ops.some((o) => o.tipo === 'cambio'));
      const na = x.ops.reduce((s, o) => s + (o.tipo === 'igual' ? 1 : o.eliminadas.length), 0);
      const nb = x.ops.reduce((s, o) => s + (o.tipo === 'igual' ? 1 : o.agregadas.length), 0);
      assert.equal(x.na, na);
      assert.equal(x.nb, nb);
    }
  }
  const h = agruparHunks(comparar('2022', '2024'), 1).filter((x) => x.tipo === 'hunk');
  assert.equal(h.length, 13);
  assert.equal(formatoHunk(h[0]), '@@ -1,6 +1,6 @@');
  assert.equal(h[0].contexto, 'PREÁMBULO');
  const raiz = agruparHunks(comparar(VACIO, '1826'), 1);
  assert.equal(raiz.length, 1);
  assert.equal(formatoHunk(raiz[0]), '@@ -0,0 +1,317 @@');
  assert.deepEqual(agruparHunks(comparar('1987', '1987'), 1).map((x) => x.tipo), ['pliegue']);
});

test('filasUnificadas and filasDivididas show every line once, pairs together', () => {
  for (const o of comparar('2024', '2025').filter((x) => x.tipo === 'cambio')) {
    const u = filasUnificadas(o);
    assert.equal(u.length, o.eliminadas.length + o.agregadas.length);
    assert.deepEqual(u.filter((f) => f.tipo === 'eliminado').map((f) => f.linea), o.eliminadas.map((e) => e.linea));
    assert.deepEqual(u.filter((f) => f.tipo === 'agregado').map((f) => f.linea), o.agregadas.map((g) => g.linea));
    const d = filasDivididas(o);
    assert.deepEqual(d.filter((f) => f.izq).map((f) => f.izq), o.eliminadas);
    assert.deepEqual(d.filter((f) => f.der).map((f) => f.der), o.agregadas);
    for (const [i, j] of o.pares) {
      assert.ok(d.some((f) => f.izq === o.eliminadas[i] && f.der === o.agregadas[j]));
      const k = u.findIndex((f) => f.linea === o.eliminadas[i].linea);
      assert.equal(u[k + 1].linea, o.agregadas[j].linea);
    }
  }
});
```

2. In `site/tests/lib.test.mjs` change the single line
   `  assert.deepEqual(parsearRuta(''), { vista: 'timeline' });` to
   `  assert.deepEqual(parsearRuta(''), { vista: 'inicio' });`. Change nothing else.

**Verify**:
- `shasum -a 256 site/tests/diff.test.mjs` → `8aeaddf93765d7c5abe55afa7613d57d3661692b86fd225810c8278dab431a4b`
- `shasum -a 256 site/tests/lib.test.mjs` → `4e583e9150685e123fccf13df8d4d289907ecccfd0e061b27ea4d4c25e4d6a1b`
- `node --test site/tests/` → `pass 15`, `fail 0`.

Commit 1.

### Step 3: `site/index.html`

Make exactly these changes and nothing else:

1. `<body>` → `<body class="inicio">`. This avoids the intro appearing late on a cold load; app.js still toggles the class per route.
2. Meta description content →
   `Las constituciones de Nicaragua comparadas como un git diff: elija dos versiones, de 1826 a 2025, y vea las líneas y palabras que cambiaron.`
3. In `.marca`, the `git log` span text → `git diff` (the rest stays `--constituciones --nicaragua`).
4. Replace the `.intro` paragraph's content with:
   `Esta página compara los textos constitucionales de Nicaragua como un <strong>git diff</strong>. Elija dos versiones, cualquier par desde la Constitución de 1826 hasta la de 2025, y verá en rojo las líneas eliminadas y en verde las añadidas, con las palabras que cambiaron resaltadas. El historial lista cada texto publicado como un commit: al elegir uno se compara con el texto anterior.`

### Step 4: `site/app.js`, the compare view

Keep these unchanged, reused as they are:
- the file's conventions: `el()`, `cargarJson` (cached), `anunciar`, `mostrar`, `ponerMigas`, `fechaLarga`, `numero`, `enlaceExterno`, `resumenNodo`, the `token`/`mio` stale-render guard after **every** `await`, no `innerHTML`, and Spanish UI text;
- `vistaVersion`;
- `bloqueArticulo` and `pintarArticulos` with their filter chips and checkboxes.

**Delete** `vistaTimeline`, `tarjetaVersion`, `tarjetaLey` and `tarjetaNueva`,
and the old `vistaCambio`. Import the new helpers from `./lib.js`.

#### Routing (`enrutar`)
- `body.inicio` is on only for `vista === 'inicio'`. Add `body.ancho` for `inicio` and `comparar` (a wider page for the sidebar).
- `inicio` → `vistaComparar(comparacionInicial(timeline.versiones), mio)`. The URL stays `#/`.
- `comparar` → validate: `head` must be a known version id, and `base` must be a known id or `VACIO`. Otherwise call `noEncontrado()`. Then call `vistaComparar({base, head}, mio)`.
- `cambio` (old `#/c/<id>` links): unknown id → `noEncontrado()`. Otherwise:
  - set `opciones.modo = 'articulos'` if `archivoArticulos(base, v)` is non-null, where `base = padreParaComparar(v, timeline.versiones)`;
  - then `location.replace(rutaComparar(base, v.id))` and return. The resulting `hashchange` renders it.
- `version` → `vistaVersion` as today. In `cabeceraVersion`:
  - replace the "Ver cambios" link with `Comparar con el texto anterior` → `rutaComparar(padreParaComparar(v, timeline.versiones), v.id)`;
  - the breadcrumb's first link becomes `Comparar` → `#/`.
- `noEncontrado`: its link text becomes `Volver a la comparación`.

#### Options
`opciones` gains `modo: 'unificado'` (`'unificado' | 'dividido' | 'articulos'`)
and keeps `incluirAlternas`, `mostrarSinCambios`, `mostrarSoloForma` and
`estados`.

#### `vistaComparar({base, head}, mio)`
1. Set `document.title` to `${etiqueta(base)} → ${head} · Historia constitucional de Nicaragua`, where `etiqueta(VACIO)` is `∅`. Clear the breadcrumbs.
2. Load both version files with `cargarJson`. Base `VACIO` means `lineas = []`. While loading, show `Cargando textos…`; after the await, run the `mio !== token` guard.
3. Compute `ops = diffLineas(antes, despues, { diffArrays: Diff.diffArrays, diffWords: Diff.diffWordsWithSpace })`. Cache it in a `Map` keyed `` `${base}...${head}` ``. Then compute `estadisticas(ops)` and `agruparHunks(ops, 1)`.
4. Render this DOM into `main`. Element classes are given so the CSS in Step 5 applies:

```
div.comparar
  div.comparar-principal
    div.rango [role=group, aria-label="Elegir versiones"]
      label[for=sel-base]   span.rango-etiqueta "base"     + select#sel-base
      button.invertir[type=button, aria-label="Invertir base y comparación"] "⇄"
      label[for=sel-head]   span.rango-etiqueta "comparar" + select#sel-head
    div.cabecera-vista
      div.commit-linea  span.hash (head.commit)  h2 "<etiqueta(base)> → <head>"
      p.commit-nota   "<head.nombre>, <fechaLarga(head.fecha)>. Comparado con <base nombre, or 'un texto vacío'>."
      p.aviso         (only if base !== VACIO and familia differs)
                      "Son constituciones distintas: una no reforma a la otra, pero el texto se compara igual, línea por línea."
      ul.leyes-incorporadas  (only if base === head.padre and the head has incorporated laws;
                              entries "Incorpora: <ley link>", from ordenarTimeline's version.leyes)
      div.resumen-conteos
        span.mas "+N líneas"  span.menos "−M líneas"  span.arch-sim "K sin cambios"
        span.barra[aria-hidden=true] with 5 span.cuadro, each .mas/.menos/.neutro
              (green/red share of 5 by lines changed, GitHub-style; rest neutro)
      p.commit-nota   (only if archivoArticulos(base, head) is non-null)
                      "Por artículo: " + resumenNodo(head)
      div.commit-acciones  "Leer el texto de <base>" (unless VACIO) · "Leer el texto de <head>" · head.url "Portal de la Asamblea"
    div.modos [role=group, aria-label="Vista"]
      button.chip[aria-pressed] "Unificado" · "Dividido" · "Por artículo" (last only if archivoArticulos non-null)
    div.resultado
  details.log  (open when matchMedia('(min-width: 1100px)') matches at render time)
    summary "Historial · <n> commits"
    label > input#alternas[type=checkbox] "Mostrar proyectos y textos no vigentes"
    h3.log-titulo "Cambios sin commit"   (pending laws from ordenarTimeline, clase 'ley')
    ol.log-lista > li.log-pendiente: span.hash "sin commit" · law name (link to l.url if any) · time
    h3.log-titulo "Commits"
    ol.log-lista > li > a.log-commit[href=rutaComparar(padreParaComparar(v), v.id)]
                         (+ class 'alterna', and aria-current="page" when v.id === head
                          && base === padreParaComparar(v))
         span.hash v.commit · span.log-id v.id · span.log-nombre v.nombre ·
         span.log-resumen (resumenNodo(v), or "Texto completo" when v has no parent at all) ·
         span.insignia.no-vigente "No vigente" for alterna
```

Details:
- **Selects**: every version is ordered by `fecha` ascending, in two `optgroup`s:
  - `Textos vigentes en su momento` (`linea === 'principal'`);
  - `Proyectos y textos no vigentes` (`alterna`).

  Option text is `${v.id} · ${v.nombre}`. `#sel-base` also has a first option `value=VACIO`, text `∅ Texto vacío`. Selected values are `base` and `head`.

  On `change`, remember which select had focus, then set `location.hash = rutaComparar(sel-base.value, sel-head.value)`. After the next render, focus that same select again (by id). **Invertir** sets the hash to `rutaComparar(head, base)`. Disable it when `base === VACIO`.
- **Identical texts**: if `estadisticas` reports 0 added and 0 removed, `.resultado` shows `p.vacio` "Los dos textos son idénticos." and no table.
- **Modes**: clicking a mode button sets `opciones.modo`, updates `aria-pressed`, repaints only `.resultado`, and announces `Vista unificada`, `Vista dividida` or `Vista por artículo`. Fall back to `unificado` in two cases:
  - `opciones.modo === 'articulos'` but this pair has no article file;
  - `dividido` while the screen is narrow (below).
- **Narrow screens**: `const estrecho = matchMedia('(max-width: 759px)')`.
  - When it matches, hide the "Dividido" button (the `hidden` attribute) and render unified. Keep `opciones.modo` as the user chose, so it returns when the screen widens.
  - Register **one** `estrecho.addEventListener('change', …)` at module level. It calls a module-level `repintarActual` function, which the compare view sets and every other view sets to `null`.
- **"Por artículo" mode**: load `data/${archivoArticulos(base, headVersion)}`, then guard `mio`. Render the existing filter controls (the three `.chip` state buttons and the two checkboxes, exactly as the old `vistaCambio` built them) and `pintarArticulos(...)` into `.resultado`.
- **Unified diff** (`.resultado` content):

```
section.archivo
  div.archivo-cab   span "a/<etiqueta(base)> → b/<head>"  + span.mas "+N" span.menos "−M"
  table.diff.unificado
    caption.solo-lectores "Diferencias entre <etiqueta(base)> y <head>"
    colgroup: col.c-num, col.c-num, col.c-signo, col
    tbody
      for each agruparHunks item:
        hunk    → tr.hunk > td[colspan=4]: span.hunk-rango formatoHunk(h) + " " + span.hunk-ctx h.contexto
                  then for each op:
                    igual  → tr.igual: td.num(a.line) td.num(b.line) td.signo(" ") td.txt(text)
                    cambio → for each filasUnificadas(op) row:
                      eliminado → tr.elim: td.num(linea.line) td.num("") td.signo("−") td.txt
                      agregado  → tr.agr:  td.num("")  td.num(linea.line) td.signo("+") td.txt
        pliegue → tr.pliegue > td[colspan=4] > button.expandir[type=button]
                  "⋯ Mostrar N líneas sin cambios" (N via numero(); singular "1 línea sin cambios")
```

- `td.signo` has `aria-hidden="true"`. `td.txt` of `elim`/`agr` rows starts with `span.solo-lectores` reading `Eliminado: ` / `Añadido: `. Then it holds either the tokens or the plain `linea.text`:
  - with `tokens` (paired line): each `igual` token is a text node, and each changed token is a `<del>` (on an eliminado row) or an `<ins>` (on an agregado row);
  - with no tokens: plain `linea.text`.
- Clicking `button.expandir` replaces its `tr` with that fold's `igual` rows, in the current mode's shape. Then move focus to the first revealed row, which gets `tabindex="-1"`.
- **Split diff**: `table.diff.dividido`, cols `col.c-num, col, col.c-num, col`.
  - `hunk` and `pliegue` rows use `colspan=4`.
  - `igual` → `td.num td.txt td.num td.txt`.
  - `cambio` → for each `filasDivididas(op)` row: the left cell pair is `td.num` + `td.txt.elim`, the right is `td.num` + `td.txt.agr`. A `null` side renders as `td.num` + `td.txt.vacia`, both empty.
  - Use the same tokens and `solo-lectores` prefixes as unified.
- **Announce** after rendering: `${etiqueta(base)} → ${head}: ${N} líneas añadidas, ${M} eliminadas.`
- **Sidebar checkbox** `#alternas`: toggles `opciones.incluirAlternas` and re-renders the same comparison. Focus returns to `#alternas`. (It filters the log list only; the selects always list every version.)

### Step 5: `site/styles.css`

Add these color tokens. Use the light values in `:root` and the dark values
in the existing dark block:

| token | light | dark |
|---|---|---|
| `--rojo-palabra` | `#f2a8a1` | `#7d2b2b` |
| `--verde-palabra` | `#a6e3b4` | `#1f6a35` |

Add rules for:
- `body.ancho .envoltura { max-width: 1280px; }`.
- `.comparar`: a one-column grid with `gap: 1.5rem`. At `min-width: 1100px` it uses `grid-template-columns: minmax(0, 1fr) 300px` and `align-items: start`, and `.log` is `position: sticky; top: 1rem; max-height: calc(100vh - 2rem); overflow: auto`.
- `.rango`: flex with wrap, gap, items aligned to the end, and a margin below.
  - `.rango label` is a column flex that can grow. `min-width: 0`.
  - `.rango-etiqueta` is mono `.8rem` in `--tinta-suave`.
  - `.rango select` uses `font: inherit; max-width: 100%; min-height: 36px`, the `--superficie`/`--tinta` colors, a `1px solid var(--linea)` border and `6px` radius.
  - `.invertir` is a `36px` square button in the same style.
- `.aviso`: `--ambar-fondo` background, `4px` `--ambar` left border, `.5rem .75rem` padding, `max-width: 70ch`, `.9rem`, `4px` radius.
- `.barra .cuadro`: inline-block `10px` squares with a `2px` gap; `.mas` is `--verde`, `.menos` is `--rojo`, `.neutro` is `--linea`, each as the background.
- `.modos`: like `.controles` (flex, wrap, gap).
- `.archivo`: `1px` `--linea` border, `6px` radius, `--superficie` background, `overflow: hidden`.
  - `.archivo-cab` has padding, a `--papel` background, a bottom border, mono `.85rem`, and flex with wrap and gap.
- `.diff`: `width: 100%; border-collapse: collapse; table-layout: fixed; font: .85rem/1.55 var(--mono)`.
  - `col.c-num { width: 3.25rem }` and `col.c-signo { width: 1.25rem }`.
  - `td { vertical-align: top; padding: .1rem .5rem }`.
  - `td.txt { white-space: pre-wrap; overflow-wrap: anywhere }`.
  - `td.num { text-align: right; color: var(--tinta-suave); font-size: .75rem; user-select: none }`.
  - `td.signo { user-select: none }`, colored `--rojo` in `.elim` rows and `--verde` in `.agr` rows.
- Row backgrounds:
  - unified: all cells of `tr.elim` use `--rojo-fondo` and all cells of `tr.agr` use `--verde-fondo`;
  - split: `td.txt.elim` uses `--rojo-fondo`, `td.txt.agr` uses `--verde-fondo`, `td.txt.vacia` uses `--papel`.
- Word highlights inside `.diff`:
  - `del` and `ins` get `text-decoration: none; color: inherit; font-weight: inherit; border-radius: 2px`;
  - `del` uses `--rojo-palabra` and `ins` uses `--verde-palabra`;
  - turn off the global `del::before` and `ins::before` markers inside `.diff` (`content: none`).
- `tr.hunk td`: `--lago-fondo` background, `--lago` color, `.8rem`, `.35rem .75rem` padding. `.hunk-ctx` uses `--tinta-suave`.
- `button.expandir`: full width, left aligned, `font: .8rem var(--mono)`, `--papel` background, no border except a `1px dashed var(--linea)` top and bottom, `--lago` color, `cursor: pointer`, `min-height: 32px`, `.35rem .75rem` padding.
- `.log`: `--superficie` background, a `1px` `--linea` border, `8px` radius, `.75rem 1rem` padding, `.9rem`.
  - `summary` is `600` weight and `min-height: 32px`.
  - `.log-titulo` is mono `.85rem` in `--ambar`, with margin `1rem 0 .5rem`.
  - `.log-lista` has no list style, margin or padding.
  - `.log-commit` is a block link with color inherit and no underline. It has `.4rem .5rem` padding, a `3px solid transparent` left border and a `4px` radius, and is a grid with `grid-template-columns: auto 1fr` and a `.1rem .5rem` gap.
  - `.log-commit .log-nombre` and `.log-commit .log-resumen` span both columns (`grid-column: 1 / -1`) at `.82rem` in `--tinta-suave`.
  - `.log-commit:hover` uses `--papel` as the background.
  - `.log-commit[aria-current]` uses a `--lago-fondo` background and a `--lago` left border.
  - `.log-commit.alterna` shows a dashed left border in `--tinta-suave` when not current.
  - `.log-pendiente` uses `.82rem` and `.35rem .5rem` padding.
- At `max-width: 480px`: `.diff` becomes `.78rem`, `col.c-num` becomes `2.4rem`, and `td` padding becomes `.1rem .3rem`.
- **Delete** the rules nothing references any more: `.registro`, `.seccion-titulo`, the `.commit` and `.commit.*` rules and their `::before`/`::after`, `.commit-cuerpo`, `.commit-nombre`, `.commit-meta`, `.tarjeta-nueva`, `.antes-despues`, and the reduced-motion `.commit` hover block.
- **Keep** `.commit-linea`, `.commit-nota`, `.commit-acciones`, `.hash`, `.insignia*`, `.mas`, `.menos`, `.cambia`, `.leyes-incorporadas`, `.controles`, `.chip`, `.arch*`, and the global `ins`/`del` rules (used by "Por artículo").
- No horizontal page scroll at 360px wide.

### Step 5b: `site/README.md`

Replace the first paragraph (it starts with `Página estática que muestra…` and
ends with `…completo de la anterior.`) with:

```
Página estática que compara los textos constitucionales de Nicaragua como un
`git diff` al estilo de GitHub. Se eligen dos versiones cualesquiera (base y
comparación), incluso de constituciones distintas, y se ven las líneas
eliminadas (rojo) y añadidas (verde), con las palabras cambiadas resaltadas,
en vista unificada o dividida. Para las reformas también hay una vista por
artículo. El historial de commits aparece como barra lateral.
```

In the same file, replace `Si cambian los datos, actualice los conteos en
`site/tests/lib.test.mjs`.` with `Si cambian los datos, actualice los conteos
en `site/tests/lib.test.mjs` y `site/tests/diff.test.mjs`.` (keep the
backticks around the paths).

### Step 6: Verify, then commit 2

1. `node --test site/tests/` → `pass 15`, `fail 0`.
2. `grep -c innerHTML site/app.js` → `0`.
3. `grep -nE 'vistaTimeline|tarjetaNueva|tarjetaVersion|tarjetaLey' site/app.js` → no output.
4. `grep -nE '\.registro|\.tarjeta-nueva|\.antes-despues|\.commit-cuerpo' site/styles.css` → no output.
5. Start the local server in the background. Dump the DOM (see the Commands table) for each URL below and check it with `grep -c` (count ≥ 1 unless stated):
   - `/#/` → contains `class="diff unificado"`, `id="sel-base"` and `@@ -1,9 +1,6 @@`, and the `2025` commit in the log has `aria-current="page"`;
   - `/#/compare/vacio...1826` → contains `@@ -0,0 +1,317 @@` and does **not** contain `class="pliegue"`;
   - `/#/compare/1948...1950` → contains `class="aviso"` and `<del>` or `<ins>`;
   - `/#/compare/1987...1987` → contains `Los dos textos son idénticos.`;
   - `/#/c/2025` → contains `class="arch"`, since an old link opens the article view (the dumped URL may already show the compare route);
   - `/#/v/1987` → contains `Comparar con el texto anterior`;
   - `/#/compare/nope...2025` → contains `No encontrado`.
6. Stop the server. Commit 2.

## Test plan

- New `site/tests/diff.test.mjs` (7 tests) runs on the real data. It covers:
  - routes;
  - parent selection for alterna texts;
  - exact rebuilding of both texts for every consecutive pair plus the empty base and two cross-constitution pairs;
  - pinned line statistics;
  - hunk coverage and headers;
  - every line appearing once in both row layouts, with pairs adjacent.
- The 8 existing tests stay; one route expectation changes.
- The DOM checks in Step 6 smoke-test each route end to end. The reviewer also takes headless screenshots (light, dark, 360 px).

## Done criteria

- [ ] `node --test site/tests/` → `pass 15`, `fail 0`
- [ ] `site/lib.js` and both test files match the hashes above
- [ ] `git diff --name-only "$BASE"` lists only in-scope files
- [ ] all of Step 6's DOM checks pass, or are reported skipped because there is no Chrome
- [ ] no `innerHTML`; every `await` in app.js is followed by the `mio !== token` guard
- [ ] two commits on `advisor/010-git-diff-view`, nothing pushed

## STOP conditions

- The drift check prints anything.
- A hash still mismatches after re-extracting the block.
- `node --test` fails after Step 2. The pinned numbers come from the shipped data; do not edit the expectations.
- Rendering requires changing `site/data/**` or `lib.js`. Report what is missing instead.

## Maintenance notes

- Diffs are computed in the browser, so no new data files are needed. When data changes, update the pinned counts in `diff.test.mjs`.
- `emparejar` uses a similarity threshold of 0.4 to decide which removed and added paragraphs are "the same paragraph edited". Raise it if unrelated paragraphs get paired.
- The article-level JSON in `site/data/cambios/` still powers the "Por artículo" mode. It handles 2025's renumbering better than a line diff.
