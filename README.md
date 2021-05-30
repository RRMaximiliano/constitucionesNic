
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

cons_2014
#> # A tibble: 715 x 7
#>    year   line text                                  titulo   cap   art   tema  
#>    <chr> <int> <chr>                                 <chr>    <chr> <chr> <chr> 
#>  1 2014      1 TEXTO DE LA CONSTITUCIÓN POLÍTICA DE~ PREÁMBU~ <NA>  <NA>  PREÁM~
#>  2 2014      2 CONSTITUCIÓN POLÍTICA DE NICARAGUA, ~ PREÁMBU~ <NA>  <NA>  PREÁM~
#>  3 2014      3 Publicada en La Gaceta, Diario Ofici~ PREÁMBU~ <NA>  <NA>  PREÁM~
#>  4 2014      4 “El Presidente de la República        PREÁMBU~ <NA>  <NA>  PREÁM~
#>  5 2014      5 Hace saber al pueblo de Nicaragua qu~ PREÁMBU~ <NA>  <NA>  PREÁM~
#>  6 2014      6 CONSTITUCIÓN POLÍTICA:                PREÁMBU~ <NA>  <NA>  PREÁM~
#>  7 2014      7 Preámbulo                             PREÁMBU~ <NA>  <NA>  PREÁM~
#>  8 2014      8 NOSOTROS,                             PREÁMBU~ <NA>  <NA>  PREÁM~
#>  9 2014      9 Representantes del Pueblo de Nicarag~ PREÁMBU~ <NA>  <NA>  PREÁM~
#> 10 2014     10 Evocando                              PREÁMBU~ <NA>  <NA>  PREÁM~
#> # ... with 705 more rows
```

``` r
# Cantidad de lineas por Temas
cons_2014 %>% 
  count(tema, sort = TRUE)
#> # A tibble: 12 x 2
#>    tema                                                                        n
#>    <chr>                                                                   <int>
#>  1 DE LA ORGANIZACIÓN DEL ESTADO                                             286
#>  2 DERECHOS, DEBERES Y GARANTÍAS DEL PUEBLO NICARAGÜENSE                     164
#>  3 ECONOMÍA NACIONAL, REFORMA AGRARIA Y FINANZAS PÚBLICAS                     46
#>  4 DIVISIÓN POLÍTICO ADMINISTRATIVA                                           40
#>  5 SUPREMACÍA DE LA CONSTITUCIÓN, SU REFORMA Y DE LAS LEYES CONSTITUCIONA~    32
#>  6 PREÁMBULO                                                                  28
#>  7 DEFENSA Y SEGURIDAD NACIONAL.                                              26
#>  8 EDUCACIÓN Y CULTURA                                                        22
#>  9 DISPOSICIONES FINALES                                                      20
#> 10 SOBRE EL ESTADO                                                            18
#> 11 PRINCIPIOS FUNDAMENTALES                                                   17
#> 12 LA NACIONALIDAD NICARAGÜENSE                                               16
```

# Comentarios y sugerencias

Para realizar comentarios o sugerencias sobre la base de datos puedes
abrir un issue en este repositorio:
<https://github.com/RRMaximiliano/constitucionesNic/issues>
