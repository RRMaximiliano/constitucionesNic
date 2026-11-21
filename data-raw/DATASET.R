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

# Parsing ------------------------------------------------------------------
#
# Each snapshot line becomes one row. Structure of every constitution body:
#
#   TÍTULO <n>                      <- title heading            (tipo "encabezado")
#   [0-2 title-topic lines]         <- become `tema`            (tipo "encabezado")
#   CAPÍTULO <n | ÚNICO>            <- chapter heading          (tipo "encabezado")
#   [0-1 chapter-name line]         <- becomes `cap_tema`       (tipo "encabezado")
#   Arto. <n> ... / Artículo <n>... <- article text, continues until next heading
#
# Rows before the first TÍTULO are the preamble ("preambulo"). Rows from the
# first line starting with "Dado/Dada en" after the last article onward are the
# closing formalities (promulgation, signatures, reform history) ("cierre").

re_titulo <- "^T[ÍI]TULO\\s+[IVXl]+$"
re_cap    <- "^CAP[ÍI]TULO\\s+([IVXl]+|[ÚU]NICO)$"
re_art    <- "^(Artículo|Arto\\.)\\s*([0-9]+)"
re_cierre <- "^(Dad[oa]|DAD[OA])\\s"

# "TITULO Vlll" -> "TÍTULO VIII"; "CAPITULO UNICO" -> "CAPÍTULO ÚNICO".
# The source sometimes types a lowercase L instead of the Roman numeral I.
normalize_label <- function(x) {
  word <- str_extract(x, "^\\S+")
  num  <- str_trim(str_remove(x, "^\\S+"))
  word <- recode(word, "TITULO" = "TÍTULO", "CAPITULO" = "CAPÍTULO")
  num  <- if_else(num %in% c("UNICO", "ÚNICO"), "ÚNICO", str_replace_all(num, "l", "I"))
  if_else(is.na(x), NA_character_, paste(word, num))
}

parse_constitution <- function(lines, year) {
  d <- tibble(year = as.integer(year), line = seq_along(lines), text = lines) %>%
    filter(text != ".") %>%
    mutate(
      is_titulo = str_detect(text, re_titulo),
      is_cap    = str_detect(text, re_cap),
      art_start = as.integer(str_match(text, re_art)[, 3])
    )

  first_titulo <- which(d$is_titulo)[1]
  last_art     <- max(which(!is.na(d$art_start)))
  cierre_rows  <- which(seq_len(nrow(d)) > last_art & str_detect(d$text, re_cierre))
  if (is.na(first_titulo)) stop("No TÍTULO heading found for ", year)
  if (length(cierre_rows) == 0) stop("No closing 'Dado en' line found for ", year)
  first_cierre <- cierre_rows[1]

  d <- d %>%
    mutate(
      idx = row_number(),
      seccion = case_when(
        idx < first_titulo  ~ "preambulo",
        idx >= first_cierre ~ "cierre",
        TRUE                ~ "cuerpo"
      ),
      en_cuerpo  = seccion == "cuerpo",
      titulo_raw = if_else(is_titulo & en_cuerpo, text, NA_character_),
      cap_raw    = if_else(is_cap & en_cuerpo, text, NA_character_)
    )

  # Title: carried down from its heading, only inside the body.
  d <- d %>%
    fill(titulo_raw) %>%
    mutate(titulo_raw = if_else(en_cuerpo, titulo_raw, NA_character_))

  # Chapter: carried down only within its own title, so a new title's
  # heading rows never inherit the previous title's chapter.
  d <- d %>%
    group_by(titulo_raw) %>%
    fill(cap_raw) %>%
    ungroup() %>%
    mutate(cap_raw = if_else(en_cuerpo, cap_raw, NA_character_))

  # Heading rows: the TÍTULO line, title-topic lines (between TÍTULO and the
  # first CAPÍTULO), the CAPÍTULO line, and the chapter-name line (the line
  # right after CAPÍTULO when it is not an article).
  d <- d %>%
    group_by(titulo_raw) %>%
    mutate(tema_line = en_cuerpo & cumsum(is_cap) == 0 & !is_titulo) %>%
    group_by(titulo_raw, cap_raw) %>%
    mutate(cap_tema_line = en_cuerpo & !is.na(cap_raw) & first(is_cap) &
             row_number() == 2 & is.na(art_start)) %>%
    ungroup() %>%
    mutate(tipo = if_else(en_cuerpo & (is_titulo | is_cap | tema_line | cap_tema_line),
                          "encabezado", "texto"))

  # Article: carried down only within its own chapter, never onto headings.
  d <- d %>%
    group_by(titulo_raw, cap_raw) %>%
    fill(art_start) %>%
    ungroup() %>%
    mutate(art = if_else(en_cuerpo & tipo == "texto", art_start, NA_integer_))

  # Topics. `tema` = the title-topic lines joined by a space. If a title has
  # no topic lines but exactly one chapter, the chapter name is the title's
  # topic (1974 layout). Otherwise `tema` is NA.
  temas <- d %>%
    filter(tema_line) %>%
    group_by(titulo_raw) %>%
    summarise(tema_titulo = paste(text, collapse = " "), .groups = "drop")
  cap_temas <- d %>%
    filter(cap_tema_line) %>%
    select(titulo_raw, cap_raw, cap_tema = text)
  n_caps <- d %>%
    filter(is_cap, en_cuerpo) %>%
    count(titulo_raw, name = "n_caps")

  d %>%
    left_join(temas, by = "titulo_raw") %>%
    left_join(cap_temas, by = c("titulo_raw", "cap_raw")) %>%
    left_join(n_caps, by = "titulo_raw") %>%
    group_by(titulo_raw) %>%
    mutate(tema_unico_cap = if (isTRUE(first(n_caps) == 1)) first(na.omit(cap_tema)) else NA_character_) %>%
    ungroup() %>%
    mutate(
      tema = case_when(
        seccion == "preambulo" ~ "PREÁMBULO",
        seccion == "cierre"    ~ NA_character_,
        !is.na(tema_titulo)    ~ tema_titulo,
        TRUE                   ~ tema_unico_cap
      ),
      titulo = if_else(seccion == "preambulo", "PREÁMBULO", normalize_label(titulo_raw)),
      cap    = normalize_label(cap_raw)
    ) %>%
    select(year, line, text, titulo, cap, art, tema, cap_tema, seccion, tipo)
}

df <- years %>%
  map(~ parse_constitution(cons_df$text[cons_df$year == .x], .x)) %>%
  bind_rows()

# Export datasets ---------------------------------------------------------

for (y in years) {
  nm <- paste0("cons_", y)
  assign(nm, filter(df, year == as.integer(y)))
  path <- file.path("data", paste0(nm, ".rda"))
  # version = 2 keeps the files loadable by R < 3.5 (DESCRIPTION: R >= 2.10)
  save(list = nm, file = path, compress = "xz", version = 2)
  message("saved ", path)
}
