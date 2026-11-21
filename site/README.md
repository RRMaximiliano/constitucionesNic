# Sitio web: historia constitucional de Nicaragua

Página estática que muestra las constituciones y reformas de Nicaragua como el
historial de un repositorio git. Cada texto publicado es un "commit"; cada
reforma muestra, artículo por artículo, las palabras añadidas (verde) y
eliminadas (rojo). Las constituciones nuevas se presentan como reemplazo
completo de la anterior.

No usa frameworks ni herramientas de compilación: HTML, CSS y módulos ES. La
librería de diferencias (jsdiff 5.2.0) está incluida en `vendor/`.

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

Si cambian los datos, actualice los conteos en `site/tests/lib.test.mjs`.

## Pruebas

```sh
node --test site/tests/
```

## Publicación

El flujo `.github/workflows/pages.yml` publica `site/` en GitHub Pages con cada
cambio a `main` o `master` que toque `site/`. Hay que activar una vez
Settings, Pages, Source: GitHub Actions.
