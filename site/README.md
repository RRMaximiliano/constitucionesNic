# Sitio web: historia constitucional de Nicaragua

Página estática que compara los textos constitucionales de Nicaragua como un
`git diff` al estilo de GitHub. Se eligen dos versiones cualesquiera (base y
comparación), incluso de constituciones distintas, y se ven las líneas
eliminadas (rojo) y añadidas (verde), con las palabras cambiadas resaltadas,
en vista unificada o dividida. Para las reformas también hay una vista por
artículo. El historial de commits aparece como barra lateral.

No usa frameworks ni herramientas de compilación: HTML, CSS y módulos ES. La
librería de diferencias (jsdiff 5.2.0) está incluida en `vendor/`. La fuente del código, Google Sans Code (licencia SIL OFL 1.1, ver
`vendor/fonts/OFL.txt`), también va incluida en `vendor/fonts/` para no depender
de servicios externos.

## Vista previa local

```sh
python3 -m http.server 8765 -d site
```

Luego abra <http://localhost:8765>.

## Datos

`site/data/` es generado y no debe editarse a mano. Para regenerarlo:

```sh
Rscript data-raw/DATASET.R && Rscript data-raw/site_data.R
```

Si cambian los datos, actualice los conteos en `site/tests/lib.test.mjs` y
`site/tests/diff.test.mjs`.

## Pruebas

```sh
node --test site/tests/
```

## Publicación

El flujo `.github/workflows/pages.yml` publica `site/` en GitHub Pages con cada
cambio a `main` o `master` que toque `site/`. Hay que activar una vez
Settings, Pages, Source: GitHub Actions.
