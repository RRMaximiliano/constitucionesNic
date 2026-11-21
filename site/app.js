// Rendering and routing. Pure logic lives in lib.js. All data reaches the DOM
// through createElement/textContent only: the texts come from an external site.
import {
  etiquetaTipo, ordenarTimeline, resumenCambio, filtrarCambios,
  agruparPorTitulo, tokensDiff, parsearRuta,
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

function noEncontrado() {
  document.title = 'No encontrado · Historia constitucional de Nicaragua';
  ponerMigas();
  mostrar(el('section', {},
    el('h2', { text: 'No encontrado' }),
    el('p', { text: 'Esa versión no existe en el historial.' }),
    el('p', {}, el('a', { href: '#/', text: 'Volver al historial' }))));
}

// ---------- timeline ----------
function tarjetaVersion(v) {
  const alterna = v.linea === 'alterna';
  const nombre = el('a', { class: 'commit-nombre', href: `#/v/${encodeURIComponent(v.id)}`, text: v.nombre });
  const meta = el('div', { class: 'commit-meta' },
    el('time', { datetime: v.fecha, text: fechaLarga(v.fecha) }),
    el('span', { class: 'insignia', text: etiquetaTipo(v.tipo) }),
    alterna && el('span', { class: 'insignia no-vigente', text: 'No vigente' }),
    resumenNodo(v));
  const acciones = el('div', { class: 'commit-acciones' },
    el('a', { href: `#/v/${encodeURIComponent(v.id)}`, text: 'Leer el texto' }),
    v.padre && v.cambio && el('a', { href: `#/c/${encodeURIComponent(v.id)}`, text: 'Ver cambios' }),
    v.url && enlaceExterno(v.url, 'Portal de la Asamblea'));
  return el('li', { class: `commit${alterna ? ' alterna' : ''}` },
    el('div', { class: 'commit-cuerpo' },
      el('div', { class: 'commit-linea' },
        el('span', { class: 'hash', title: 'Identificador del texto', text: v.commit }), nombre),
      meta,
      v.nota && el('p', { class: 'commit-nota', text: v.nota }),
      v.leyes.length > 0 && el('ul', { class: 'leyes-incorporadas' },
        v.leyes.map((l) => el('li', {}, 'Incorpora: ', l.url ? enlaceExterno(l.url, l.nombre) : l.nombre))),
      acciones));
}

function tarjetaLey(l) {
  return el('li', { class: 'commit pendiente' },
    el('div', { class: 'commit-cuerpo' },
      el('div', { class: 'commit-linea' },
        el('span', { class: 'hash', text: 'sin commit' }),
        l.url ? enlaceExterno(l.url, l.nombre) : el('span', { class: 'commit-nombre', text: l.nombre })),
      el('div', { class: 'commit-meta' },
        el('time', { datetime: l.fecha_publicacion, text: fechaLarga(l.fecha_publicacion) }),
        el('span', { class: 'insignia', text: 'Ley de reforma' }),
        l.publicacion && el('span', { text: l.publicacion })),
      l.nota && el('p', { class: 'commit-nota', text: l.nota })));
}

function vistaTimeline() {
  document.title = 'Historia constitucional de Nicaragua';
  ponerMigas();
  const lista = ordenarTimeline(timeline, { incluirAlternas: opciones.incluirAlternas });
  const pendientes = lista.filter((e) => e.clase === 'ley');
  const versiones = lista.filter((e) => e.clase === 'version');
  const check = el('input', {
    type: 'checkbox', id: 'alternas',
    onchange: (ev) => { opciones.incluirAlternas = ev.target.checked; vistaTimeline(); document.getElementById('alternas').focus(); },
  });
  check.checked = opciones.incluirAlternas;
  const nodos = [
    el('div', { class: 'controles' },
      el('label', { for: 'alternas' }, check, 'Mostrar proyectos y textos no vigentes')),
  ];
  if (pendientes.length) {
    nodos.push(
      el('h2', { class: 'seccion-titulo', text: 'Cambios sin texto consolidado' }),
      el('p', { class: 'commit-nota', text: 'Leyes de reforma aprobadas que aún no tienen un texto consolidado publicado.' }),
      el('ol', { class: 'registro' }, pendientes.map(tarjetaLey)));
  }
  nodos.push(
    el('h2', { class: 'seccion-titulo', text: 'Textos publicados, del más reciente al más antiguo' }),
    el('ol', { class: 'registro' }, versiones.map(tarjetaVersion)));
  mostrar(...nodos);
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
      v.padre && v.cambio && el('a', { href: `#/c/${encodeURIComponent(v.id)}`, text: 'Ver cambios' })));
}

function irA(id) {
  const destino = document.getElementById(id);
  if (!destino) return;
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  destino.scrollIntoView({ behavior: reducir ? 'auto' : 'smooth', block: 'start' });
  destino.setAttribute('tabindex', '-1');
  destino.focus({ preventScroll: true });
}

async function vistaVersion(id) {
  const v = porId.get(id);
  if (!v) return noEncontrado();
  document.title = `${v.nombre} · Historia constitucional de Nicaragua`;
  ponerMigas(el('a', { href: '#/', text: 'Historial' }), el('span', { text: v.nombre }));
  mostrar(el('p', { class: 'estado-carga', text: 'Cargando texto…' }));
  const datos = await cargarJson(`data/versiones/${encodeURIComponent(id)}.json`);

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
  mostrar(cabeceraVersion(v), indice, cuerpo);
}

// ---------- changes ----------
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

function tarjetaNueva(v, padre) {
  const r = v.cambio.resumen;
  const nombrePadre = padre ? padre.nombre : v.padre;
  return el('div', { class: 'tarjeta-nueva' },
    el('h3', { text: `Nueva constitución: reemplaza por completo a la de ${v.padre}` }),
    el('p', { text: `${v.nombre} no es una reforma de ${nombrePadre}. Es un texto nuevo, por eso no se compara artículo por artículo.` }),
    el('div', { class: 'antes-despues' },
      el('div', { class: 'ant' },
        el('div', { text: `Antes (${v.padre})` }),
        el('div', { class: 'cifra', text: numero(r.articulos_antes) }), el('div', { text: 'artículos' }),
        el('div', { class: 'cifra', text: numero(r.palabras_antes) }), el('div', { text: 'palabras' })),
      el('div', { class: 'desp' },
        el('div', { text: `Después (${v.id})` }),
        el('div', { class: 'cifra', text: numero(r.articulos_despues) }), el('div', { text: 'artículos' }),
        el('div', { class: 'cifra', text: numero(r.palabras_despues) }), el('div', { text: 'palabras' }))),
    el('div', { class: 'commit-acciones' },
      el('a', { href: `#/v/${encodeURIComponent(v.padre)}`, text: `Leer el texto de ${v.padre}` }),
      el('a', { href: `#/v/${encodeURIComponent(v.id)}`, text: `Leer el texto de ${v.id}` })));
}

function pintarArticulos(contenedor, articulos) {
  const visibles = filtrarCambios(articulos, {
    mostrarSinCambios: opciones.mostrarSinCambios,
    mostrarSoloForma: opciones.mostrarSoloForma,
    estados: [...opciones.estados, ...(opciones.mostrarSinCambios ? ['sin_cambios'] : [])],
  });
  if (!visibles.length) {
    contenedor.replaceChildren(el('p', { class: 'vacio', text: 'Ningún artículo coincide con los filtros elegidos.' }));
    return;
  }
  const nodos = [el('p', { class: 'commit-nota', text: `${numero(visibles.length)} artículos mostrados.` })];
  for (const g of agruparPorTitulo(visibles)) {
    nodos.push(el('h3', { class: 'grupo-titulo', text: g.titulo }), ...g.articulos.map(bloqueArticulo));
  }
  contenedor.replaceChildren(...nodos);
}

async function vistaCambio(id) {
  const v = porId.get(id);
  if (!v) return noEncontrado();
  if (!v.padre || !v.cambio) return vistaVersion(id);
  document.title = `${v.padre} → ${v.id} · Historia constitucional de Nicaragua`;
  ponerMigas(el('a', { href: '#/', text: 'Historial' }), el('span', { text: `${v.padre} → ${v.id}` }));
  const padre = porId.get(v.padre);
  if (v.cambio.tipo !== 'reforma') {
    mostrar(el('div', { class: 'cabecera-vista' },
      el('div', { class: 'commit-linea' }, el('span', { class: 'hash', text: v.commit }), el('h2', { text: v.nombre }))),
    tarjetaNueva(v, padre));
    return;
  }
  mostrar(el('p', { class: 'estado-carga', text: 'Cargando cambios…' }));
  const datos = await cargarJson(`data/${v.cambio.archivo}`);
  const r = v.cambio.resumen;

  const resultado = el('div', { class: 'resultado' });
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

  mostrar(
    el('div', { class: 'cabecera-vista' },
      el('div', { class: 'commit-linea' },
        el('span', { class: 'hash', text: v.commit }),
        el('h2', { text: `${v.padre} → ${v.id}` })),
      el('p', { class: 'commit-nota', text: `${v.nombre}, ${fechaLarga(v.fecha)}. Comparado con ${padre ? padre.nombre : v.padre}.` }),
      el('div', { class: 'resumen-conteos' },
        el('span', { class: 'mas', text: `+${r.nuevo} nuevos` }),
        el('span', { class: 'menos', text: `−${r.derogado} derogados` }),
        el('span', { class: 'cambia', text: `~${r.modificado} modificados` }),
        el('span', { class: 'arch-sim', text: `${r.solo_forma} solo de forma · ${r.renumerado} renumerados · ${r.sin_cambios} sin cambios` })),
      el('div', { class: 'commit-acciones' },
        el('a', { href: `#/v/${encodeURIComponent(v.id)}`, text: 'Leer el texto completo' }),
        v.url && enlaceExterno(v.url, 'Ver en el portal de la Asamblea'))),
    el('div', { class: 'controles', role: 'group', 'aria-label': 'Filtros' },
      ...chips,
      casilla('sin-cambios', 'Mostrar artículos sin cambios', 'mostrarSinCambios'),
      casilla('solo-forma', 'Incluir cambios de forma', 'mostrarSoloForma')),
    resultado);
  repintar();
}

// ---------- router ----------
let token = 0;
async function enrutar() {
  const mio = ++token;
  if (!timeline) return;
  const ruta = parsearRuta(location.hash);
  try {
    if (ruta.vista === 'version') await vistaVersion(ruta.id);
    else if (ruta.vista === 'cambio') await vistaCambio(ruta.id);
    else vistaTimeline();
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
