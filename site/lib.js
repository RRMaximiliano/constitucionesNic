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
