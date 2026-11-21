
<!-- README.md is generated from README.Rmd. Please edit that file -->

# constitucionesNic

<!-- badges: start -->

[![R-CMD-check](https://github.com/RRMaximiliano/constitucionesNic/actions/workflows/R-CMD-check.yaml/badge.svg)](https://github.com/RRMaximiliano/constitucionesNic/actions/workflows/R-CMD-check.yaml)
<!-- badges: end -->

El objetivo de `constitucionesNic` es tener las constituciones políticas
de Nicaragua como bases de datos. Esto permite que la constitución se
pueda utilizar para análisis de texto.

## Instalación

### Instalar directamente desde GitHub

Puede instalar `constitucionesNic` desde GitHub con:

``` r
remotes::install_github("RRMaximiliano/constitucionesNic")
```

## Datos

El paquete contiene las constituciones políticas de los años 1974, 1987,
2010 y 2014 (`cons_1974`, `cons_1987`, `cons_2010`, `cons_2014`). Cada
base tiene una fila por línea del texto oficial y las siguientes
variables:

1.  `year`: Año de la constitución (entero).
2.  `line`: Línea en el texto extraído de la Asamblea Nacional (entero).
3.  `text`: Texto de la línea, sin modificar.
4.  `titulo`: Título de la constitución, normalizado (p. ej. “TÍTULO
    VIII”); “PREÁMBULO” antes del primer título.
5.  `cap`: Capítulo dentro del título, normalizado (p. ej. “CAPÍTULO
    ÚNICO”).
6.  `art`: Número del artículo (entero).
7.  `tema`: Tema del título.
8.  `cap_tema`: Nombre del capítulo, cuando el texto lo indica.
9.  `seccion`: “preambulo”, “cuerpo” o “cierre” (promulgación, firmas e
    historial de reformas).
10. `tipo`: “encabezado” (líneas de título, tema o capítulo) o “texto”.

Ver `?cons_2014` para el detalle de cada variable.

## Cargando los datos

``` r
library(tidyverse)
#> ── Attaching core tidyverse packages ──────────────────────── tidyverse 2.0.0 ──
#> ✔ dplyr     1.2.1     ✔ readr     2.2.0
#> ✔ forcats   1.0.1     ✔ stringr   1.6.0
#> ✔ ggplot2   4.0.3     ✔ tibble    3.3.1
#> ✔ lubridate 1.9.5     ✔ tidyr     1.3.2
#> ✔ purrr     1.2.2     
#> ── Conflicts ────────────────────────────────────────── tidyverse_conflicts() ──
#> ✖ dplyr::filter() masks stats::filter()
#> ✖ dplyr::lag()    masks stats::lag()
#> ℹ Use the conflicted package (<http://conflicted.r-lib.org/>) to force all conflicts to become errors
library(constitucionesNic)

cons_2014
#> # A tibble: 715 × 10
#>     year  line text              titulo cap     art tema  cap_tema seccion tipo 
#>    <int> <int> <chr>             <chr>  <chr> <int> <chr> <chr>    <chr>   <chr>
#>  1  2014     1 TEXTO DE LA CONS… PREÁM… <NA>     NA PREÁ… <NA>     preamb… texto
#>  2  2014     2 CONSTITUCIÓN POL… PREÁM… <NA>     NA PREÁ… <NA>     preamb… texto
#>  3  2014     3 Publicada en La … PREÁM… <NA>     NA PREÁ… <NA>     preamb… texto
#>  4  2014     4 “El Presidente d… PREÁM… <NA>     NA PREÁ… <NA>     preamb… texto
#>  5  2014     5 Hace saber al pu… PREÁM… <NA>     NA PREÁ… <NA>     preamb… texto
#>  6  2014     6 CONSTITUCIÓN POL… PREÁM… <NA>     NA PREÁ… <NA>     preamb… texto
#>  7  2014     7 Preámbulo         PREÁM… <NA>     NA PREÁ… <NA>     preamb… texto
#>  8  2014     8 NOSOTROS,         PREÁM… <NA>     NA PREÁ… <NA>     preamb… texto
#>  9  2014     9 Representantes d… PREÁM… <NA>     NA PREÁ… <NA>     preamb… texto
#> 10  2014    10 Evocando          PREÁM… <NA>     NA PREÁ… <NA>     preamb… texto
#> # ℹ 705 more rows
```

``` r
# Cantidad de líneas de texto por tema (sin encabezados, preámbulo ni cierre)
cons_2014 %>% 
  filter(seccion == "cuerpo", tipo == "texto") %>% 
  count(tema, sort = TRUE)
#> # A tibble: 11 × 2
#>    tema                                                                        n
#>    <chr>                                                                   <int>
#>  1 DE LA ORGANIZACIÓN DEL ESTADO                                             272
#>  2 DERECHOS, DEBERES Y GARANTÍAS DEL PUEBLO NICARAGÜENSE                     150
#>  3 ECONOMÍA NACIONAL, REFORMA AGRARIA Y FINANZAS PÚBLICAS                     38
#>  4 DIVISIÓN POLÍTICO ADMINISTRATIVA                                           34
#>  5 SUPREMACÍA DE LA CONSTITUCIÓN, SU REFORMA Y DE LAS LEYES CONSTITUCIONA…    24
#>  6 DEFENSA Y SEGURIDAD NACIONAL. SEGURIDAD CIUDADANA                          22
#>  7 EDUCACIÓN Y CULTURA                                                        19
#>  8 SOBRE EL ESTADO                                                            15
#>  9 PRINCIPIOS FUNDAMENTALES                                                   14
#> 10 LA NACIONALIDAD NICARAGÜENSE                                               13
#> 11 DISPOSICIONES FINALES                                                       8
```

# Comentarios y sugerencias

Para realizar comentarios o sugerencias sobre la base de datos puedes
abrir un issue en este repositorio:
<https://github.com/RRMaximiliano/constitucionesNic/issues>
