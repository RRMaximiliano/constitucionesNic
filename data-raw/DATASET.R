## Builds data/cons_1974.rda, data/cons_1987.rda, data/cons_2010.rda and
## data/cons_2014.rda from the frozen text snapshots in data-raw/raw/.
## This script does NOT access the network. See data-raw/README.md for where
## the snapshots came from and how to refresh them.
##
## Run from the package root:
##   Rscript data-raw/DATASET.R

# Packages ----------------------------------------------------------------

library(dplyr)
library(tidyr)
library(stringr)
library(readr)
library(purrr)

# Sources (provenance only; not downloaded by this script) ---------------

fuentes <- c(
  "2014" = "http://legislacion.asamblea.gob.ni/Normaweb.nsf/xpNorma.xsp?documentId=C93CBD0FF408D07306257C8C004F6953&action=openDocument",
  "2010" = "http://legislacion.asamblea.gob.ni/Normaweb.nsf/xpNorma.xsp?documentId=750E20D0698FEB21062577C2006A3D0A&action=openDocument",
  "1987" = "http://legislacion.asamblea.gob.ni/Normaweb.nsf/xpNorma.xsp?documentId=8339762D0F427A1C062573080055FA46&action=openDocument",
  "1974" = "http://legislacion.asamblea.gob.ni/Normaweb.nsf/xpNorma.xsp?documentId=1D6EDDB20A766BCD062573080055146A&action=openDocument"
)

# Read snapshots ----------------------------------------------------------

years <- c("1974", "1987", "2010", "2014")

cons_df <- years %>%
  set_names() %>%
  map(~ tibble(text = read_lines(file.path("data-raw", "raw", paste0("cons_", .x, ".txt"))))) %>%
  bind_rows(.id = "year")

# Cleaning ----------------------------------------------------------------

df <- cons_df %>%
  group_by(year) %>%
  mutate(
    line   = row_number(),
    titulo = if_else(str_detect(text, "TÍTULO|TITULO"),   text, NA_character_),
    cap    = if_else(str_detect(text, "CAPÍTULO|CAPITULO"), text, NA_character_),
    art    = str_extract(text, "^(Artículo\\s*|Arto\\.\\s*)[0-9]+"),
    art    = str_extract(art, "[0-9]+")
  ) %>%
  fill(titulo, cap, art) %>%
  mutate(
    titulo = if_else(is.na(titulo), "PREÁMBULO", titulo)
  ) %>%
  filter(text != ".") %>%
  ungroup() %>%
  group_by(year, titulo) %>%
  mutate(
    tema = if_else(row_number() == 2, text, NA_character_),
    tema = case_when(titulo == "PREÁMBULO" ~ "PREÁMBULO",
                     TRUE ~ tema)
  ) %>%
  fill(tema) %>%
  fill(tema, .direction = "up") %>%
  ungroup() %>%
  select(year, line, everything())

# Export datasets ---------------------------------------------------------

for (y in years) {
  nm <- paste0("cons_", y)
  assign(nm, filter(df, year == y))
  path <- file.path("data", paste0(nm, ".rda"))
  # version = 2 keeps the files loadable by R < 3.5 (DESCRIPTION: R >= 2.10)
  save(list = nm, file = path, compress = "xz", version = 2)
  message("saved ", path)
}
