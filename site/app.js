// Rendering and routing. Pure logic lives in lib.js. All data reaches the DOM
// through createElement/textContent only: the texts come from an external site.
import {
  etiquetaTipo, ordenarTimeline, resumenCambio, filtrarCambios,
  agruparPorTitulo, tokensDiff, parsearRuta, rutaComparar, VACIO,
  padreParaComparar, comparacionInicial, archivoArticulos, diffLineas,
  estadisticas, filasUnificadas, filasDivididas, agruparHunks, formatoHunk,
} from './lib.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ESTADOS = [
  { id: 'modificado', etiqueta: 'Modificados' },
  { id: 'nuevo', etiqueta: 'Nuevos' },
  { id: 'derogado', etiqueta: 'Derogados' },
];
const ETIQUETA_ESTADO = {
  modificado: 'Modificado', nuevo: 'Nuevo', derogado: 'Derogado', sin_cambios: 'Sin cambios',
};

const main = document.getElementById('principal');
const migas = document.getElementById('migas');
const cache = new Map();
let timeline = null;
let porId = new Map();

// Persistent UI options (kept across re-renders and routes).
const opciones = {
  modo: 'unificado', // 'unificado' | 'dividido' | 'articulos'
  incluirAlternas: true,
  mostrarSinCambios: false,
  mostrarSoloForma: true,
  estados: new Set(ESTADOS.map((e) => e.id)),
};

// ---------- helpers ----------
function el(tag, props = {}, ...hijos) {
  const nodo = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') nodo.className = v;
    else if (k === 'text') nodo.textContent = v;
    else if (k.startsWith('on')) nodo.addEventListener(k.slice(2), v);
    else nodo.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat()) {
    if (h == null || h === false) continue;
    nodo.append(h);
  }
  return nodo;
}

function fechaLarga(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return iso || '';
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

function numero(n) {
  return Number(n).toLocaleString('es');
}

function enlaceExterno(url, texto) {
  return el('a', { href: url, rel: 'noopener', text: texto });
}

function resumenNodo(version) {
  const c = version.cambio;
  if (c && c.tipo === 'reforma') {
    const r = c.resumen;
    return el('span', { 'aria-label': `${r.nuevo} nuevos, ${r.derogado} derogados, ${r.modificado} modificados` },
      el('span', { class: 'mas', text: `+${r.nuevo}` }), ' ',
      el('span', { class: 'menos', text: `−${r.derogado}` }), ' ',
      el('span', { class: 'cambia', text: `~${r.modificado}` }), ' artículos');
  }
  return el('span', { text: resumenCambio(version) });
}

async function cargarJson(ruta) {
  if (!cache.has(ruta)) {
    cache.set(ruta, fetch(ruta).then((r) => {
      if (!r.ok) throw new Error(`${ruta}: HTTP ${r.status}`);
      return r.json();
    }).catch((e) => { cache.delete(ruta); throw e; }));
  }
  return cache.get(ruta);
}

const anuncio = document.getElementById('anuncio');
function anunciar(texto) {
  anuncio.textContent = texto;
}

function mostrar(...nodos) {
  main.replaceChildren(...nodos);
}

function ponerMigas(...partes) {
  const nodos = [];
  partes.forEach((p, i) => {
    if (i) nodos.push(el('span', { class: 'sep', 'aria-hidden': 'true', text: '/' }));
    nodos.push(p);
  });
  migas.replaceChildren(...nodos);
}

// Loading placeholder shaped like the content it stands in for. The text is
// for screen readers; the bars are decoration.
function esqueleto(texto, filas = 8) {
  const anchos = [92, 78, 96, 64, 88, 72, 95, 58, 84, 70];
  return el('div', { class: 'esqueleto', 'aria-busy': 'true' },
    el('span', { class: 'solo-lectores', text: texto }),
    Array.from({ length: filas }, (_, i) => el('span', {
      class: 'esq-linea', 'aria-hidden': 'true', style: `width: ${anchos[i % anchos.length]}%`,
    })));
}

function noEncontrado() {
  document.title = 'No encontrado · Historia constitucional de Nicaragua';
  ponerMigas();
  mostrar(el('section', {},
    el('h2', { text: 'No encontrado' }),
    el('p', { text: 'Esa versión no existe en el historial.' }),
    el('p', {}, el('a', { href: '#/', text: 'Volver a la comparación' }))));
  anunciar('No encontrado');
}

// ---------- version text ----------
function claseEncabezado(l) {
  const t = (l.text || '').trim();
  if (/^T[ÍI]TULO\b/i.test(t)) return 'titulo';
  if (/^CAP[ÍI]TULO\b/i.test(t)) return 'cap';
  if (t && t === l.tema) return 'titulo-nombre';
  if (t && t === l.cap_tema) return 'cap-nombre';
  return 'sub';
}

function cabeceraVersion(v) {
  const datos = [];
  const fila = (k, val) => { if (val) datos.push(el('dt', { text: k }), el('dd', {}, val)); };
  fila('Tipo', etiquetaTipo(v.tipo) + (v.linea === 'alterna' ? ' (no vigente)' : ''));
  fila('Aprobación', v.fecha_aprobacion && fechaLarga(v.fecha_aprobacion));
  fila('Publicación', v.fecha_publicacion && fechaLarga(v.fecha_publicacion));
  fila('Medio', v.publicacion);
  fila('Nota', v.nota);
  fila('Artículos', v.n_articulos != null && `${numero(v.n_articulos)} (${numero(v.n_palabras)} palabras)`);
  return el('div', { class: 'cabecera-vista' },
    el('div', { class: 'commit-linea' }, el('span', { class: 'hash', text: v.commit }), el('h2', { text: v.nombre })),
    el('dl', { class: 'datos' }, datos),
    el('div', { class: 'commit-acciones' },
      v.url && enlaceExterno(v.url, 'Ver en el portal de la Asamblea'),
      el('a', { href: rutaComparar(padreParaComparar(v, timeline.versiones), v.id), text: 'Comparar con el texto anterior' })));
}

function irA(id) {
  const destino = document.getElementById(id);
  if (!destino) return;
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  destino.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
  destino.setAttribute('tabindex', '-1');
  destino.focus({ preventScroll: true });
}

async function vistaVersion(id, mio) {
  const v = porId.get(id);
  if (!v) return noEncontrado();
  document.title = `${v.nombre} · Historia constitucional de Nicaragua`;
  ponerMigas(el('a', { href: '#/', text: 'Comparar' }), el('span', { text: v.nombre }));
  mostrar(esqueleto('Cargando texto…', 10));
  const datos = await cargarJson(`data/versiones/${encodeURIComponent(id)}.json`);
  if (mio !== token) return;

  let encabezados = datos.lineas.filter((l) => l.tipo === 'encabezado' && claseEncabezado(l) === 'titulo');
  if (!encabezados.length) encabezados = datos.lineas.filter((l) => l.tipo === 'encabezado' && claseEncabezado(l) === 'cap');
  const indice = encabezados.length ? el('details', { class: 'indice' },
    el('summary', { text: `Índice (${encabezados.length})` }),
    el('ol', {}, encabezados.map((l) => {
      const a = el('a', {
        href: `#/v/${encodeURIComponent(id)}`, text: l.text,
        onclick: (ev) => { ev.preventDefault(); irA(`l${l.line}`); },
      });
      return el('li', {}, a, l.tema && claseEncabezado(l) === 'titulo' ? `: ${l.tema}` : '');
    }))) : null;

  const cuerpo = el('article', { class: 'texto' });
  let seccionActual = null;
  let contenedor = cuerpo;
  for (const l of datos.lineas) {
    if (l.seccion !== seccionActual) {
      seccionActual = l.seccion;
      if (seccionActual === 'preambulo' || seccionActual === 'cierre') {
        cuerpo.append(el('p', { class: 'sec-etiqueta', text: seccionActual === 'preambulo' ? 'Preámbulo' : 'Cierre' }));
        contenedor = el('div', { class: `sec-${seccionActual}` });
        cuerpo.append(contenedor);
      } else {
        contenedor = cuerpo;
      }
    }
    if (l.tipo === 'encabezado') {
      const c = claseEncabezado(l);
      const tag = c === 'titulo' ? 'h3' : c === 'cap' ? 'h4' : 'p';
      contenedor.append(el(tag, { class: `h-${c}`, id: `l${l.line}`, text: l.text }));
    } else {
      contenedor.append(el('p', { text: l.text }));
    }
  }
  mostrar(cabeceraVersion(v), indice, el('section', { class: 'archivo' },
    el('div', { class: 'archivo-cab' },
      el('span', { class: 'archivo-ruta', text: v.id }),
      el('span', { class: 'archivo-meta', text: `${numero(datos.lineas.length)} líneas` })),
    cuerpo));
  anunciar(document.title);
}

// ---------- article view ----------
function bloqueArticulo(a) {
  const renum = a.renumerado && a.art_antes != null && a.art_despues != null && a.art_antes !== a.art_despues;
  const titulo = renum ? `Art. ${a.art_antes} → Art. ${a.art_despues}` : `Art. ${a.art_despues ?? a.art_antes}`;
  const cab = el('div', { class: 'arch-cab' },
    el('span', { class: 'arch-art', text: titulo }),
    el('span', { class: `insignia estado-${a.estado}`, text: ETIQUETA_ESTADO[a.estado] }),
    a.solo_forma && el('span', { class: 'insignia', text: 'Solo forma' }),
    a.similitud != null && el('span', { class: 'arch-sim', text: `similitud ${Number(a.similitud).toFixed(2).replace('.', ',')}` }));
  let cuerpo;
  if (a.estado === 'modificado') {
    const partes = tokensDiff(a.texto_antes, a.texto_despues, Diff.diffWordsWithSpace).map((t) =>
      t.tipo === 'agregado' ? el('ins', { text: t.texto })
        : t.tipo === 'eliminado' ? el('del', { text: t.texto })
          : document.createTextNode(t.texto));
    cuerpo = el('pre', { class: 'arch-cuerpo' }, partes);
  } else if (a.estado === 'nuevo') {
    cuerpo = el('pre', { class: 'arch-cuerpo todo-nuevo', text: a.texto_despues ?? '' });
  } else if (a.estado === 'derogado') {
    cuerpo = el('pre', { class: 'arch-cuerpo todo-derogado', text: a.texto_antes ?? '' });
  } else {
    cuerpo = el('pre', { class: 'arch-cuerpo', text: a.texto_despues ?? '' });
  }
  return el('section', { class: 'arch' }, cab, cuerpo);
}

function pintarArticulos(contenedor, articulos) {
  const visibles = filtrarCambios(articulos, {
    mostrarSinCambios: opciones.mostrarSinCambios,
    mostrarSoloForma: opciones.mostrarSoloForma,
    estados: [...opciones.estados, ...(opciones.mostrarSinCambios ? ['sin_cambios'] : [])],
  });
  if (!visibles.length) {
    contenedor.replaceChildren(el('p', { class: 'vacio', text: 'Ningún artículo coincide con los filtros elegidos.' }));
    anunciar('Ningún artículo coincide con los filtros elegidos.');
    return;
  }
  const nodos = [el('p', { class: 'commit-nota', text: `${numero(visibles.length)} artículos mostrados.` })];
  for (const g of agruparPorTitulo(visibles)) {
    nodos.push(el('h3', { class: 'grupo-titulo', text: g.titulo }), ...g.articulos.map(bloqueArticulo));
  }
  contenedor.replaceChildren(...nodos);
  anunciar(`Mostrando ${numero(visibles.length)} artículos.`);
}

// ---------- compare (git diff) ----------
const estrecho = matchMedia('(max-width: 759px)');
let repintarActual = null;
estrecho.addEventListener('change', () => { if (repintarActual) repintarActual(); });
const opsCache = new Map();
let focoPendiente = null;

const etiqueta = (id) => (id === VACIO ? '∅' : id);
const MODOS = [
  { id: 'unificado', etiqueta: 'Unificado', anuncio: 'Vista unificada' },
  { id: 'dividido', etiqueta: 'Dividido', anuncio: 'Vista dividida' },
  { id: 'articulos', etiqueta: 'Por artículo', anuncio: 'Vista por artículo' },
];

function celda(clase, ...hijos) {
  return el('td', { class: clase }, ...hijos);
}

// Text cell content: the changed words as <del>/<ins> when the line is
// paired with its edited version, otherwise the plain line.
function contenidoTxt(item, tipo) {
  const prefijo = el('span', { class: 'solo-lectores', text: tipo === 'eliminado' ? 'Eliminado: ' : 'Añadido: ' });
  if (!item.tokens) return [prefijo, item.linea.text];
  return [prefijo, ...item.tokens.map((t) =>
    t.tipo === 'igual' ? document.createTextNode(t.texto)
      : el(tipo === 'eliminado' ? 'del' : 'ins', { text: t.texto }))];
}

function filaIgual(o, dividido) {
  if (dividido) {
    return el('tr', { class: 'igual' },
      celda('num', String(o.a.line)), celda('txt', o.a.text),
      celda('num', String(o.b.line)), celda('txt', o.b.text));
  }
  return el('tr', { class: 'igual' },
    celda('num', String(o.a.line)), celda('num', String(o.b.line)),
    el('td', { class: 'signo', 'aria-hidden': 'true', text: ' ' }), celda('txt', o.b.text));
}

function filasCambio(op, dividido) {
  if (dividido) {
    return filasDivididas(op).map((f) => el('tr', {},
      f.izq ? [celda('num elim', String(f.izq.linea.line)), celda('txt elim', ...contenidoTxt(f.izq, 'eliminado'))]
        : [celda('num vacia'), celda('txt vacia')],
      f.der ? [celda('num agr', String(f.der.linea.line)), celda('txt agr', ...contenidoTxt(f.der, 'agregado'))]
        : [celda('num vacia'), celda('txt vacia')]));
  }
  return filasUnificadas(op).map((f) => {
    const elim = f.tipo === 'eliminado';
    return el('tr', { class: elim ? 'elim' : 'agr' },
      celda('num', elim ? String(f.linea.line) : ''), celda('num', elim ? '' : String(f.linea.line)),
      el('td', { class: 'signo', 'aria-hidden': 'true', text: elim ? '−' : '+' }),
      celda('txt', ...contenidoTxt(f, f.tipo)));
  });
}

function tablaDiff(ctx, dividido) {
  const { base, head, hunks } = ctx;
  const cols = dividido
    ? [el('col', { class: 'c-num' }), el('col'), el('col', { class: 'c-num' }), el('col')]
    : [el('col', { class: 'c-num' }), el('col', { class: 'c-num' }), el('col', { class: 'c-signo' }), el('col')];
  const filas = [];
  for (const item of hunks) {
    if (item.tipo === 'hunk') {
      filas.push(el('tr', { class: 'hunk' }, el('td', { colspan: 4 },
        el('span', { class: 'hunk-rango', text: formatoHunk(item) }), ' ',
        el('span', { class: 'hunk-ctx', text: item.contexto }))));
      for (const o of item.ops) {
        if (o.tipo === 'igual') filas.push(filaIgual(o, dividido));
        else filas.push(...filasCambio(o, dividido));
      }
    } else {
      const n = item.ops.length;
      const boton = el('button', {
        type: 'button', class: 'expandir',
        text: `Mostrar ${n === 1 ? '1 línea' : `${numero(n)} líneas`} sin cambios`,
        onclick: () => {
          const revelar = item.ops.map((o) => filaIgual(o, dividido));
          revelar[0].setAttribute('tabindex', '-1');
          fila.replaceWith(...revelar);
          revelar[0].focus();
        },
      });
      const fila = el('tr', { class: 'pliegue' }, el('td', { colspan: 4 }, boton));
      filas.push(fila);
    }
  }
  return el('table', { class: `diff ${dividido ? 'dividido' : 'unificado'}` },
    el('caption', { class: 'solo-lectores', text: `Diferencias entre ${etiqueta(base)} y ${head}` }),
    el('colgroup', {}, cols),
    el('tbody', {}, filas));
}

function pintarDiff(contenedor, ctx, dividido) {
  const { base, head, stats } = ctx;
  if (!stats.agregadas && !stats.eliminadas) {
    contenedor.replaceChildren(el('p', { class: 'vacio', text: 'Los dos textos son idénticos.' }));
    return;
  }
  contenedor.replaceChildren(el('section', { class: 'archivo' },
    el('div', { class: 'archivo-cab' },
      el('span', { class: 'archivo-ruta', text: `a/${etiqueta(base)} → b/${head}` }),
      el('span', { class: 'archivo-stat' },
        el('span', { class: 'mas', text: `+${numero(stats.agregadas)}` }),
        el('span', { class: 'menos', text: `−${numero(stats.eliminadas)}` }),
        barraCambios(stats))),
    tablaDiff(ctx, dividido)));
}

async function pintarPorArticulo(contenedor, archivo, mio) {
  contenedor.replaceChildren(esqueleto('Cargando cambios…'));
  const datos = await cargarJson(`data/${archivo}`);
  if (mio !== token) return;
  const resultado = el('div', { class: 'resultado-articulos' });
  const repintar = () => pintarArticulos(resultado, datos.articulos);
  const chips = ESTADOS.map((e) => {
    const b = el('button', {
      type: 'button', class: 'chip', 'aria-pressed': String(opciones.estados.has(e.id)), text: e.etiqueta,
      onclick: () => {
        if (opciones.estados.has(e.id)) opciones.estados.delete(e.id); else opciones.estados.add(e.id);
        b.setAttribute('aria-pressed', String(opciones.estados.has(e.id)));
        repintar();
      },
    });
    return b;
  });
  const casilla = (idc, texto, clave) => {
    const i = el('input', { type: 'checkbox', id: idc, onchange: (ev) => { opciones[clave] = ev.target.checked; repintar(); } });
    i.checked = opciones[clave];
    return el('label', { for: idc }, i, texto);
  };
  contenedor.replaceChildren(
    el('div', { class: 'controles', role: 'group', 'aria-label': 'Filtros' },
      ...chips,
      casilla('sin-cambios', 'Mostrar artículos sin cambios', 'mostrarSinCambios'),
      casilla('solo-forma', 'Incluir cambios de forma', 'mostrarSoloForma')),
    resultado);
  repintar();
}

function barraCambios(stats) {
  const total = stats.agregadas + stats.eliminadas;
  let verdes = 0;
  let rojos = 0;
  if (total) {
    verdes = Math.round((5 * stats.agregadas) / total);
    rojos = Math.round((5 * stats.eliminadas) / total);
    if (stats.agregadas && !verdes) verdes = 1;
    if (stats.eliminadas && !rojos) rojos = 1;
    while (verdes + rojos > 5) { if (verdes > rojos) verdes--; else rojos--; }
  }
  const cuadros = [];
  for (let i = 0; i < 5; i++) {
    cuadros.push(el('span', { class: `cuadro ${i < verdes ? 'mas' : i < verdes + rojos ? 'menos' : 'neutro'}` }));
  }
  return el('span', { class: 'barra', 'aria-hidden': 'true' }, cuadros);
}

function construirLog(base, head) {
  const lista = ordenarTimeline(timeline, { incluirAlternas: opciones.incluirAlternas });
  const pendientes = lista.filter((e) => e.clase === 'ley');
  const versiones = lista.filter((e) => e.clase === 'version');
  const check = el('input', {
    type: 'checkbox', id: 'alternas',
    onchange: (ev) => {
      opciones.incluirAlternas = ev.target.checked;
      const abierto = log.open;
      const nuevo = construirLog(base, head);
      nuevo.open = abierto;
      log.replaceWith(nuevo);
      document.getElementById('alternas').focus();
    },
  });
  check.checked = opciones.incluirAlternas;
  const nodos = [
    el('summary', {}, 'Historial',
      el('span', { class: 'contador', text: String(versiones.length) }),
      el('span', { class: 'solo-lectores', text: ' commits' })),
    el('label', { for: 'alternas' }, check, 'Mostrar proyectos y textos no vigentes'),
  ];
  if (pendientes.length) {
    nodos.push(
      el('h3', { class: 'log-titulo', text: 'Cambios sin commit' }),
      el('ol', { class: 'log-lista log-grafo pendientes' }, pendientes.map((l) => el('li', { class: 'log-pendiente' },
        l.url ? enlaceExterno(l.url, l.nombre) : el('span', { text: l.nombre }),
        el('time', { datetime: l.fecha_publicacion, text: fechaLarga(l.fecha_publicacion) })))));
  }
  nodos.push(
    el('h3', { class: 'log-titulo', text: 'Commits' }),
    el('ol', { class: 'log-lista log-grafo' }, versiones.map((v) => {
      const padre = padreParaComparar(v, timeline.versiones);
      const actual = v.id === head && base === padre;
      const clases = [v.linea === 'alterna' && 'alterna', actual && 'actual'].filter(Boolean).join(' ');
      return el('li', { class: clases || null }, el('a', {
        class: `log-commit${v.linea === 'alterna' ? ' alterna' : ''}`,
        href: rutaComparar(padre, v.id),
        'aria-current': actual ? 'page' : null,
      },
      el('span', { class: 'hash', text: v.commit }),
      el('span', { class: 'log-id', text: v.id }),
      el('span', { class: 'log-nombre', text: v.nombre }),
      el('span', { class: 'log-resumen' },
        v.padre ? resumenNodo(v)
          : padre === VACIO ? 'Primera constitución · texto completo' : `Comparado con ${padre}`),
      v.linea === 'alterna' && el('span', { class: 'insignia no-vigente', text: 'No vigente' })));
    })));
  const log = el('details', { class: 'log' }, nodos);
  log.open = matchMedia('(min-width: 1100px)').matches;
  return log;
}

function selectorVersion(idSel, valor, conVacio) {
  const orden = [...timeline.versiones].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id.localeCompare(b.id));
  const grupo = (titulo, linea) => el('optgroup', { label: titulo },
    orden.filter((v) => v.linea === linea).map((v) => el('option', { value: v.id, text: `${v.id} · ${v.nombre}` })));
  const sel = el('select', {
    id: idSel,
    onchange: (ev) => {
      focoPendiente = ev.target.id;
      location.hash = rutaComparar(document.getElementById('sel-base').value, document.getElementById('sel-head').value);
    },
  },
  conVacio && el('option', { value: VACIO, text: '∅ Texto vacío' }),
  grupo('Textos vigentes en su momento', 'principal'),
  grupo('Proyectos y textos no vigentes', 'alterna'));
  sel.value = valor;
  return sel;
}

async function vistaComparar({ base, head }, mio) {
  const headV = porId.get(head);
  const baseV = base === VACIO ? null : porId.get(base);
  document.title = `${etiqueta(base)} → ${head} · Historia constitucional de Nicaragua`;
  ponerMigas();
  mostrar(esqueleto('Cargando textos…', 12));
  const [datosBase, datosHead] = await Promise.all([
    baseV ? cargarJson(`data/versiones/${encodeURIComponent(base)}.json`) : { lineas: [] },
    cargarJson(`data/versiones/${encodeURIComponent(head)}.json`),
  ]);
  if (mio !== token) return;

  const clave = `${base}...${head}`;
  if (!opsCache.has(clave)) {
    opsCache.set(clave, diffLineas(datosBase.lineas, datosHead.lineas, { diffArrays: Diff.diffArrays, diffWords: Diff.diffWordsWithSpace }));
  }
  const ops = opsCache.get(clave);
  const stats = estadisticas(ops);
  const ctx = { base, head, ops, stats, hunks: agruparHunks(ops, 1) };
  const archivo = archivoArticulos(base, headV);

  const incorporadas = base === headV.padre
    ? ordenarTimeline(timeline).find((e) => e.clase === 'version' && e.id === head)?.leyes ?? []
    : [];

  const resultado = el('div', { class: 'resultado' });
  const botones = [];
  const modoEfectivo = () => {
    if (opciones.modo === 'articulos' && archivo) return 'articulos';
    if (opciones.modo === 'dividido' && !estrecho.matches) return 'dividido';
    return 'unificado';
  };
  const repintar = () => {
    const modo = modoEfectivo();
    for (const [m, b] of botones) {
      b.setAttribute('aria-pressed', String(m.id === modo));
      if (m.id === 'dividido') b.hidden = estrecho.matches;
    }
    if (modo === 'articulos') {
      pintarPorArticulo(resultado, archivo, mio).catch((e) => {
        if (mio !== token) return;
        console.error(e);
        resultado.replaceChildren(el('p', { class: 'estado-error', role: 'alert', text: 'No se pudieron cargar los cambios por artículo.' }));
      });
    } else {
      pintarDiff(resultado, ctx, modo === 'dividido');
    }
  };
  repintarActual = repintar;

  for (const m of MODOS) {
    if (m.id === 'articulos' && !archivo) continue;
    const b = el('button', {
      type: 'button', class: 'segmento', 'aria-pressed': 'false', text: m.etiqueta,
      onclick: () => { opciones.modo = m.id; repintar(); anunciar(m.anuncio); },
    });
    botones.push([m, b]);
  }

  const selBase = selectorVersion('sel-base', base, true);
  const selHead = selectorVersion('sel-head', head, false);
  const rango = el('div', { class: 'rango', role: 'group', 'aria-label': 'Elegir versiones' },
    el('label', { for: 'sel-base' }, el('span', { class: 'rango-etiqueta', text: 'base' }), selBase),
    el('button', {
      type: 'button', class: 'invertir', 'aria-label': 'Invertir base y comparación', text: '⇄',
      disabled: base === VACIO,
      onclick: () => { location.hash = rutaComparar(head, base); },
    }),
    el('label', { for: 'sel-head' }, el('span', { class: 'rango-etiqueta', text: 'comparar' }), selHead));

  const cabecera = el('div', { class: 'cabecera-vista' },
    el('div', { class: 'commit-linea' },
      el('span', { class: 'hash', title: 'Identificador del texto', text: headV.commit }),
      el('h2', { text: `${etiqueta(base)} → ${head}` })),
    el('p', { class: 'commit-nota', text: `${headV.nombre}, ${fechaLarga(headV.fecha)}. Comparado con ${baseV ? baseV.nombre : 'un texto vacío'}.` }),
    baseV && baseV.familia !== headV.familia && el('p', { class: 'aviso', text: 'Son constituciones distintas: una no reforma a la otra, pero el texto se compara igual, línea por línea.' }),
    incorporadas.length > 0 && el('ul', { class: 'leyes-incorporadas' },
      incorporadas.map((l) => el('li', {}, 'Incorpora: ', l.url ? enlaceExterno(l.url, l.nombre) : l.nombre))),
    el('div', { class: 'resumen-conteos' },
      el('span', { class: 'mas', text: `+${numero(stats.agregadas)} líneas` }),
      el('span', { class: 'menos', text: `−${numero(stats.eliminadas)} líneas` }),
      el('span', { class: 'arch-sim', text: `${numero(stats.iguales)} sin cambios` })),
    archivo && el('p', { class: 'commit-nota' }, 'Por artículo: ', resumenNodo(headV)),
    el('div', { class: 'commit-acciones' },
      baseV && el('a', { href: `#/v/${encodeURIComponent(base)}`, text: `Leer el texto de ${base}` }),
      el('a', { href: `#/v/${encodeURIComponent(head)}`, text: `Leer el texto de ${head}` }),
      headV.url && enlaceExterno(headV.url, 'Portal de la Asamblea')));

  mostrar(el('div', { class: 'comparar' },
    el('div', { class: 'comparar-principal' },
      rango, cabecera,
      el('div', { class: 'modos', role: 'group', 'aria-label': 'Vista' }, botones.map(([, b]) => b)),
      resultado),
    construirLog(base, head)));
  repintar();
  anunciar(`${etiqueta(base)} → ${head}: ${numero(stats.agregadas)} líneas añadidas, ${numero(stats.eliminadas)} eliminadas.`);
  if (focoPendiente) {
    document.getElementById(focoPendiente)?.focus();
    focoPendiente = null;
  }
}

// ---------- router ----------
let token = 0;
async function enrutar() {
  const mio = ++token;
  if (!timeline) return;
  const ruta = parsearRuta(location.hash);
  document.body.classList.toggle('inicio', ruta.vista === 'inicio');
  document.body.classList.toggle('ancho', ruta.vista === 'inicio' || ruta.vista === 'comparar');
  repintarActual = null;
  try {
    if (ruta.vista === 'version') await vistaVersion(ruta.id, mio);
    else if (ruta.vista === 'cambio') {
      const v = porId.get(ruta.id);
      if (!v) return noEncontrado();
      const base = padreParaComparar(v, timeline.versiones);
      if (archivoArticulos(base, v)) opciones.modo = 'articulos';
      location.replace(rutaComparar(base, v.id));
    } else if (ruta.vista === 'comparar') {
      if (!porId.has(ruta.head) || !(ruta.base === VACIO || porId.has(ruta.base))) return noEncontrado();
      await vistaComparar({ base: ruta.base, head: ruta.head }, mio);
    } else {
      await vistaComparar(comparacionInicial(timeline.versiones), mio);
    }
  } catch (e) {
    if (mio !== token) return;
    console.error(e);
    mostrar(el('p', { class: 'estado-error', role: 'alert', text: 'No se pudieron cargar los datos. Revise su conexión y recargue la página.' }));
    return;
  }
}

document.querySelector('[data-saltar]').addEventListener('click', (ev) => {
  ev.preventDefault();
  main.focus();
});

async function iniciar() {
  try {
    timeline = await cargarJson('data/timeline.json');
  } catch (e) {
    console.error(e);
    mostrar(el('p', { class: 'estado-error', role: 'alert', text: 'No se pudo cargar el historial. Recargue la página.' }));
    return;
  }
  porId = new Map(timeline.versiones.map((v) => [v.id, v]));
  document.getElementById('generado').textContent = `Datos generados el ${fechaLarga(timeline.generado)}.`;
  window.addEventListener('hashchange', () => { enrutar(); window.scrollTo(0, 0); });
  enrutar();
}

iniciar();
