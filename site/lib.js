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
