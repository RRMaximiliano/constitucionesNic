# data-raw

Este directorio contiene el código y los insumos para construir los datos del
paquete. No forma parte del paquete instalado (`.Rbuildignore`).

## Archivos

- `raw/cons_<año>.txt`: texto congelado de cada constitución, una línea por
  fila, UTF-8. Una línea que contiene solo `.` se conserva para mantener la
  numeración original de `line`, y se elimina al construir los datos.
- `DATASET.R`: construye `data/cons_<año>.rda` a partir de `raw/`. No accede a
  internet.

## Cómo reconstruir los datos

Desde la raíz del paquete:

    Rscript data-raw/DATASET.R

Paquetes necesarios: dplyr, tidyr, stringr, readr, purrr.

## Procedencia de `raw/`

El texto se extrajo en 2021 de <http://legislacion.asamblea.gob.ni> con
`htm2txt::gettxt()` (direcciones en `DATASET.R`, objeto `fuentes`). Los
archivos de `raw/` se generaron el 2026-11-20 a partir de los datos publicados en
la versión 0.1.0 del paquete (`data/*.rda`), para que la construcción sea
reproducible.

**Aviso:** las páginas en línea ya no coinciden con el texto de 2021. En
noviembre de 2026 las páginas incluían cinco líneas de navegación al inicio, y
varias líneas del texto habían cambiado (1974: 9 de 867; 1987: 56 de 528;
2010: 18 de 665; 2014: 4 de 715). Actualizar `raw/` desde el sitio cambiará los
datos publicados. Hágalo solo de forma intencional, revise las diferencias y
actualice las pruebas en `tests/testthat/test-invariants.R`.
