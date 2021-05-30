## code to prepare `DATASET` dataset goes here

# Packages ----------------------------------------------------------------

library(htm2txt)
library(tidyverse)
library(tidytext)
library(zoo)
library(tidylog)
library(here)

# Function ----------------------------------------------------------------

get_text <- function(url) {
  url = url
  text = gettxt(url)

  all_lines = tibble(text = read_lines(text))
}


# List --------------------------------------------------------------------

constituciones <- list(
  "2014" = "http://legislacion.asamblea.gob.ni/Normaweb.nsf/xpNorma.xsp?documentId=C93CBD0FF408D07306257C8C004F6953&action=openDocument",
  "2010" = "http://legislacion.asamblea.gob.ni/Normaweb.nsf/xpNorma.xsp?documentId=750E20D0698FEB21062577C2006A3D0A&action=openDocument",
  "1987" = "http://legislacion.asamblea.gob.ni/Normaweb.nsf/xpNorma.xsp?documentId=8339762D0F427A1C062573080055FA46&action=openDocument",
  "1974" = "http://legislacion.asamblea.gob.ni/Normaweb.nsf/xpNorma.xsp?documentId=1D6EDDB20A766BCD062573080055146A&action=openDocument"
)

cons_df <- constituciones %>%
  map(~ get_text(.x)) %>%
  bind_rows(.id = "year")

# Cleaning ----------------------------------------------------------------

df <- cons_df %>%
  group_by(year) %>%
  filter(text != "") %>%
  slice(-c(1:2)) %>%
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
    tema = if_else(row_number()==2, text, NA_character_),
    tema = case_when(titulo == "PREÁMBULO" ~ "PREÁMBULO",
                     TRUE ~ tema)
  ) %>%
  fill(tema) %>%
  fill(tema, .direction = "up") %>%
  ungroup() %>%
  select(year, line, everything())

# Export dataset ----------------------------------------------------------

## List ----
df_list <- df %>%
  group_split(year)

cons_1974 <- df_list[[1]]
cons_1987 <- df_list[[2]]
cons_2010 <- df_list[[3]]
cons_2014 <- df_list[[4]]

## Use this ----

usethis::use_data(cons_1974, overwrite = TRUE, compress = "xz")
usethis::use_data(cons_1987, overwrite = TRUE, compress = "xz")
usethis::use_data(cons_2010, overwrite = TRUE, compress = "xz")
usethis::use_data(cons_2014, overwrite = TRUE, compress = "xz")


