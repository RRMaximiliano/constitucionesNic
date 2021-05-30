
<!-- README.md is generated from README.Rmd. Please edit that file -->

# constitucionesNic

<!-- badges: start -->
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

Por ejempo, el paquete contiene las constituciones políticas de los años
1974, 1987, 2010, y 2014. Cada una de estas bases tienen las siguientes
variables:

1.  `year`: Año de publicación.
2.  `line`: Línea en el texto extraído de la Asamblea Nacional.
3.  `text`: Texto de la constitución de acuerdo a la línea.
4.  `titulo`: Título de la constitución.
5.  `cap`: Capítulo de la constitución (por Título).
6.  `art`: Artículo de la constitución.
7.  `tema`: Tema de la constitución (por Título).

## Cargando los datos

``` r
library(tidyverse)
#> -- Attaching packages --------------------------------------- tidyverse 1.3.1 --
#> v ggplot2 3.3.3     v purrr   0.3.4
#> v tibble  3.1.2     v dplyr   1.0.6
#> v tidyr   1.1.3     v stringr 1.4.0
#> v readr   1.4.0     v forcats 0.5.1
#> -- Conflicts ------------------------------------------ tidyverse_conflicts() --
#> x dplyr::filter() masks stats::filter()
#> x dplyr::lag()    masks stats::lag()
library(constitucionesNic)

cons_1974
#> # A tibble: 867 x 7
#>    year   line text                                titulo  cap     art   tema   
#>    <chr> <int> <chr>                               <chr>   <chr>   <chr> <chr>  
#>  1 1974      1 CONSTITUCIÓN POLÍTICA               PREÁMB~ <NA>    <NA>  PREÁMB~
#>  2 1974      2 Aprobado el 14 de Marzo de 1974     PREÁMB~ <NA>    <NA>  PREÁMB~
#>  3 1974      3 Publicado en La Gaceta, Diario Ofi~ PREÁMB~ <NA>    <NA>  PREÁMB~
#>  4 1974      4 Bajo la Protección de Dios, Nosotr~ PREÁMB~ <NA>    <NA>  PREÁMB~
#>  5 1974      5 CONSTITUCIÓN POLÍTICA               PREÁMB~ <NA>    <NA>  PREÁMB~
#>  6 1974      6 TÍTULO I                            TÍTULO~ <NA>    <NA>  CAPÍTU~
#>  7 1974      7 CAPÍTULO I                          TÍTULO~ CAPÍTU~ <NA>  CAPÍTU~
#>  8 1974      8 Nación y Estado                     TÍTULO~ CAPÍTU~ <NA>  CAPÍTU~
#>  9 1974      9 Arto. 1.- Nicaragua es una Nación ~ TÍTULO~ CAPÍTU~ 1     CAPÍTU~
#> 10 1974     10 Arto. 2.- El poder político reside~ TÍTULO~ CAPÍTU~ 2     CAPÍTU~
#> # ... with 857 more rows
```

# Comentarios y sugerencias

Para realizar comentarios o sugerencias sobre la base de datos puedes
abrir un issue en este repositorio:
<https://github.com/RRMaximiliano/constitucionesNic/issues>
