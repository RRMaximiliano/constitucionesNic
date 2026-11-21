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
