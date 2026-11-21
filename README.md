
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

## Todas las constituciones

`constituciones` reúne todos los textos (de 1826 a 2025) y `fuentes`
describe cada documento: tipo, fechas y enlace al portal de la Asamblea
Nacional.

``` r
fuentes %>% 
  filter(snapshot) %>% 
  select(id, tipo, fecha_publicacion)
#> # A tibble: 20 × 3
#>    id              tipo              fecha_publicacion
#>    <chr>           <chr>             <date>           
#>  1 1826            constitucion      1861-04-30       
#>  2 1838            constitucion      1861-04-30       
#>  3 1854-proyecto   proyecto          1854-04-30       
#>  4 1858            constitucion      1864-01-01       
#>  5 1894            constitucion      1894-01-06       
#>  6 1898-federal    federal           1898-10-16       
#>  7 1905            constitucion      1905-03-30       
#>  8 1912            constitucion      1912-01-17       
#>  9 1913-non-nata   non_nata          1913-04-03       
#> 10 1939            constitucion      1939-03-23       
#> 11 1948            constitucion      1948-01-22       
#> 12 1950            constitucion      1950-11-06       
#> 13 1974            constitucion      1974-04-24       
#> 14 1987            constitucion      1987-01-09       
#> 15 2010            texto_consolidado 2010-09-16       
#> 16 2014            texto_consolidado 2014-02-18       
#> 17 2022            texto_consolidado 2022-09-28       
#> 18 2024            texto_consolidado 2024-08-30       
#> 19 2024-preliminar preliminar        2024-11-25       
#> 20 2025            texto_consolidado 2025-02-18
```

``` r
# Número de artículos por texto
constituciones %>% 
  filter(!is.na(art)) %>% 
  distinct(id, art) %>% 
  count(id)
#> # A tibble: 20 × 2
#>    id                  n
#>    <chr>           <int>
#>  1 1826              167
#>  2 1838              198
#>  3 1854-proyecto     112
#>  4 1858              105
#>  5 1894              162
#>  6 1898-federal      161
#>  7 1905              122
#>  8 1912              172
#>  9 1913-non-nata     184
#> 10 1939              352
#> 11 1948              289
#> 12 1950              336
#> 13 1974              343
#> 14 1987              202
#> 15 2010              202
#> 16 2014              202
#> 17 2022              202
#> 18 2024              202
#> 19 2024-preliminar   184
#> 20 2025              184
```

# Comentarios y sugerencias

Para realizar comentarios o sugerencias sobre la base de datos puedes
abrir un issue en este repositorio:
<https://github.com/RRMaximiliano/constitucionesNic/issues>
