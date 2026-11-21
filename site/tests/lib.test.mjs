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
  assert.deepEqual(parsearRuta(''), { vista: 'inicio' });
  assert.deepEqual(parsearRuta('#/v/1838'), { vista: 'version', id: '1838' });
  assert.deepEqual(parsearRuta('#/c/2025'), { vista: 'cambio', id: '2025' });
  assert.equal(etiquetaTipo('non_nata'), 'No entró en vigor');
});
