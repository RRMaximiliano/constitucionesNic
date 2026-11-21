
<!-- README.md is generated from README.Rmd. Please edit that file -->

# constitucionesNic

<!-- badges: start -->

[![R-CMD-check](https://github.com/RRMaximiliano/constitucionesNic/actions/workflows/R-CMD-check.yaml/badge.svg)](https://github.com/RRMaximiliano/constitucionesNic/actions/workflows/R-CMD-check.yaml)
<!-- badges: end -->

`constitucionesNic` reúne los textos constitucionales de Nicaragua, de
la Constitución de 1826 al texto íntegro de 2025, como bases de datos
ordenadas: una fila por línea del texto oficial, con su título,
capítulo, artículo y tema. Sirve para análisis de texto y para comparar
cómo cambió la Constitución.

**Sitio web:**
[rrmaximiliano.com/constitucionesNic](https://www.rrmaximiliano.com/constitucionesNic/)
compara dos textos cualesquiera como un `git diff`: líneas eliminadas en
rojo, añadidas en verde y las palabras que cambiaron resaltadas.

## Instalación

Puede instalar `constitucionesNic` desde GitHub con:

``` r
remotes::install_github("RRMaximiliano/constitucionesNic")
```

## Catálogo

El paquete incluye 20 textos completos: las 11 constituciones que
estuvieron vigentes, los 5 textos consolidados de la Constitución de
1987 con sus reformas, y 4 textos que nunca entraron en vigor (un
proyecto, una constitución federal, la constitución “non nata” de 1913 y
el texto preliminar de 2024).

| id | Texto | Tipo | Fecha | Artículos |
|:---|:---|:---|:---|---:|
| `1826` | Constitución del Estado de Nicaragua | Constitución | 1826-04-08 | 167 |
| `1838` | Constitución Política de 1838 | Constitución | 1838-11-12 | 198 |
| `1854-proyecto` | Proyecto de Constitución Política de 1854 | Proyecto | 1854-04-30 | 112 |
| `1858` | Constitución Política de 1858 | Constitución | 1858-08-19 | 105 |
| `1894` | Constitución Política de 1893 (La Libérrima) | Constitución | 1893-12-10 | 162 |
| `1898-federal` | Constitución Política de los Estados Unidos de Centro América | Constitución federal | 1898-08-27 | 161 |
| `1905` | Constitución Política de 1905 | Constitución | 1905-03-30 | 122 |
| `1912` | Constitución Política de 1911 | Constitución | 1911-11-10 | 172 |
| `1913-non-nata` | Constitución non nata de 1913 | No entró en vigor | 1913-04-03 | 184 |
| `1939` | Constitución Política de 1939 | Constitución | 1939-03-22 | 352 |
| `1948` | Constitución Política de 1948 | Constitución | 1948-01-21 | 289 |
| `1950` | Constitución Política de 1950 | Constitución | 1950-11-01 | 336 |
| `1974` | Constitución Política de 1974 | Constitución | 1974-03-14 | 343 |
| `1987` | Constitución Política de 1987 | Constitución | 1986-11-19 | 202 |
| `2010` | Texto con reformas incorporadas (2010) | Texto consolidado | 2010-09-16 | 202 |
| `2014` | Texto con reformas incorporadas (2014) | Texto consolidado | 2014-02-10 | 202 |
| `2022` | Texto consolidado (2022) | Texto consolidado | 2021-10-27 | 202 |
| `2024` | Texto consolidado (2024) | Texto consolidado | 2024-03-13 | 202 |
| `2024-preliminar` | Texto íntegro preliminar (2024) | Texto preliminar | 2024-11-25 | 184 |
| `2025` | Texto íntegro (2025) | Texto consolidado | 2025-01-30 | 184 |

`fuentes` también registra las 5 leyes de reforma más recientes. La Ley
N° 1234 está incorporada en el texto de 2025; las Leyes N° 1268 a 1271
(enero de 2026) aún no tienen un texto consolidado publicado.

## Datos

- **`constituciones`**: todos los textos en una sola base (10,809
  filas). Una fila por línea del texto oficial, con estas variables:
  1.  `id`: identificador del texto (p. ej. `"1987"`, `"2025"`,
      `"1854-proyecto"`); se une con `fuentes$id`.
  2.  `line`: línea en el texto de la Asamblea Nacional (entero).
  3.  `text`: texto de la línea, sin modificar.
  4.  `titulo`: título, normalizado (p. ej. “TÍTULO VIII”); “PREÁMBULO”
      antes del primer título.
  5.  `cap`: capítulo dentro del título, normalizado (p. ej. “CAPÍTULO
      ÚNICO”).
  6.  `subdivision`: sección dentro del capítulo, cuando existe.
  7.  `art`: número del artículo (entero).
  8.  `tema`: tema del título.
  9.  `cap_tema`: nombre del capítulo, cuando el texto lo indica.
  10. `seccion`: “preambulo”, “cuerpo” o “cierre” (promulgación, firmas
      e historial de reformas).
  11. `tipo`: “encabezado” (líneas de título, tema o capítulo) o
      “texto”.
- **`fuentes`**: un registro por documento: nombre, tipo, fechas de
  aprobación y publicación, medio de publicación, enlace al portal de la
  Asamblea Nacional (`url`) y si el paquete incluye su texto
  (`snapshot`).
- **`cons_1974`, `cons_1987`, `cons_2010`, `cons_2014`**: las bases
  originales del paquete, que se mantienen por compatibilidad. Tienen
  las mismas variables que `constituciones`, con `year` en lugar de
  `id`.

Ver `?constituciones`, `?fuentes` y `?cons_2014` para el detalle.

## Ejemplos

``` r
library(dplyr)
library(constitucionesNic)

constituciones
#> # A tibble: 10,809 × 11
#>    id     line text  titulo cap   subdivision   art tema  cap_tema seccion tipo 
#>    <chr> <int> <chr> <chr>  <chr> <chr>       <int> <chr> <chr>    <chr>   <chr>
#>  1 1826      1 CONS… PREÁM… <NA>  <NA>           NA PREÁ… <NA>     preamb… texto
#>  2 1826      2 Apro… PREÁM… <NA>  <NA>           NA PREÁ… <NA>     preamb… texto
#>  3 1826      3 Publ… PREÁM… <NA>  <NA>           NA PREÁ… <NA>     preamb… texto
#>  4 1826      4 En p… PREÁM… <NA>  <NA>           NA PREÁ… <NA>     preamb… texto
#>  5 1826      5 Noso… PREÁM… <NA>  <NA>           NA PREÁ… <NA>     preamb… texto
#>  6 1826      6 Cons… PREÁM… <NA>  <NA>           NA PREÁ… <NA>     preamb… texto
#>  7 1826      7 TITU… TÍTUL… <NA>  <NA>           NA Del … <NA>     cuerpo  enca…
#>  8 1826      8 Del … TÍTUL… <NA>  <NA>           NA Del … <NA>     cuerpo  enca…
#>  9 1826      9 CAPI… TÍTUL… CAPÍ… <NA>           NA Del … Del Est… cuerpo  enca…
#> 10 1826     10 Del … TÍTUL… CAPÍ… <NA>           NA Del … Del Est… cuerpo  enca…
#> # ℹ 10,799 more rows
```

``` r
# Número de artículos de cada constitución vigente
constituciones %>%
  inner_join(fuentes %>% filter(tipo == "constitucion"), by = "id") %>%
  filter(!is.na(art)) %>%
  distinct(id, art) %>%
  count(id, name = "articulos")
#> # A tibble: 11 × 2
#>    id    articulos
#>    <chr>     <int>
#>  1 1826        167
#>  2 1838        198
#>  3 1858        105
#>  4 1894        162
#>  5 1905        122
#>  6 1912        172
#>  7 1939        352
#>  8 1948        289
#>  9 1950        336
#> 10 1974        343
#> 11 1987        202
```

``` r
# Líneas de texto por tema en el texto de 2025 (sin encabezados, preámbulo ni cierre)
constituciones %>%
  filter(id == "2025", seccion == "cuerpo", tipo == "texto") %>%
  count(tema, sort = TRUE)
#> # A tibble: 11 × 2
#>    tema                                                                        n
#>    <chr>                                                                   <int>
#>  1 DE LA ORGANIZACIÓN DEL ESTADO                                             176
#>  2 DERECHOS, DEBERES Y GARANTÍAS DEL PUEBLO NICARAGÜENSE                      99
#>  3 ECONOMÍA NACIONAL Y FINANZAS PÚBLICAS                                      30
#>  4 PRINCIPIOS FUNDAMENTALES                                                   24
#>  5 SUPREMACÍA DE LA CONSTITUCIÓN, SU REFORMA Y DE LAS LEYES CONSTITUCIONA…    24
#>  6 DEFENSA Y SEGURIDAD NACIONAL. SEGURIDAD CIUDADANA                          23
#>  7 DIVISIÓN POLÍTICO ADMINISTRATIVA                                           22
#>  8 SOBRE EL ESTADO                                                            15
#>  9 EDUCACIÓN Y CULTURA                                                         9
#> 10 LA NACIONALIDAD NICARAGÜENSE                                                6
#> 11 DISPOSICIONES FINALES                                                       4
```

## Fuentes y reproducibilidad

Los textos provienen del portal de legislación de la Asamblea Nacional
(<http://legislacion.asamblea.gob.ni>). Cada texto se guardó tal como se
descargó en `data-raw/raw/`, y las bases se reconstruyen sin conexión a
partir de esas copias con `data-raw/DATASET.R`. El portal ha cambiado
algunos textos desde que se descargaron, así que las copias guardadas
son la referencia. Ver `data-raw/README.md`.

El sitio web se genera a partir de estas mismas bases
(`data-raw/site_data.R`) y su código está en `site/`.

# Comentarios y sugerencias

Para realizar comentarios o sugerencias sobre la base de datos puedes
abrir un issue en este repositorio:
<https://github.com/RRMaximiliano/constitucionesNic/issues>
