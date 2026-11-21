## Builds the package datasets from the frozen text snapshots in data-raw/raw/:
##   data/cons_1974.rda, cons_1987.rda, cons_2010.rda, cons_2014.rda  (legacy, one per text)
##   data/constituciones.rda  (every text, one row per line)
##   data/fuentes.rda         (registry of texts and reform laws)
## This script does NOT access the network. data-raw/fetch_sources.R downloads
## missing snapshots; see data-raw/README.md.
##
## Run from the package root:
##   Rscript data-raw/DATASET.R

# Packages ----------------------------------------------------------------

library(dplyr)
library(tidyr)
library(stringr)
library(readr)
library(purrr)

# Sources -----------------------------------------------------------------

fuentes_raw <- read.csv("data-raw/fuentes.csv", encoding = "UTF-8",
                        stringsAsFactors = FALSE, colClasses = "character")

fuentes <- fuentes_raw %>%
  as_tibble() %>%
  mutate(
    fecha_aprobacion  = as.Date(na_if(fecha_aprobacion, "")),
    fecha_publicacion = as.Date(fecha_publicacion),
    publicacion       = na_if(publicacion, ""),
    nota              = na_if(nota, ""),
    snapshot          = snapshot == "TRUE",
    url = sprintf("http://legislacion.asamblea.gob.ni/Normaweb.nsf/xpNorma.xsp?documentId=%s&action=openDocument",
                  document_id)
  )

# Read snapshots ----------------------------------------------------------

ids <- fuentes$id[fuentes$snapshot]

textos <- ids %>%
  set_names() %>%
  map(~ read_lines(file.path("data-raw", "raw", paste0("cons_", .x, ".txt"))))

# Parsing ------------------------------------------------------------------
#
# Generic structure of a constitution body (heading words in any case, with or
# without accents; numerals Roman, Arabic with "°", ÚNICO or PRELIMINAR):
#
#   TÍTULO <n> [: name]             <- title heading            (tipo "encabezado")
#   [0-2 title-topic lines]         <- become `tema`            (tipo "encabezado")
#   CAPÍTULO <n> [: name]           <- chapter heading          (tipo "encabezado")
#   [0-1 chapter-name line]         <- becomes `cap_tema`       (tipo "encabezado")
#   SECCIÓN <n>                     <- section heading          (tipo "encabezado")
#   [0-1 section-name line]                                     (tipo "encabezado")
#   Art. <n> / Arto. <n> / Artículo <n> ...  <- article text until next heading
#
# Títulos, capítulos and secciones are each optional: some constitutions have
# only capítulos (1838, 1913), others only títulos (1894, 1905, 1912).
# Rows before the first heading (or first article, if there are no headings)
# are the preamble ("preambulo"). Rows from the first line starting with
# "Dado/Dada en" after the last article onward are the closing ("cierre").

numeral   <- "([IVXL]+|[0-9]+\\s*\\.?\\s*°?|[ÚU]NIC[OA]|PRELIMINAR)"
sep_name  <- "\\s*(?:[:.\\-–]\\s*(.+))?$"
re_titulo <- regex(paste0("^T[ÍI]TULO\\s+", numeral, sep_name), ignore_case = TRUE)
re_cap    <- regex(paste0("^CAP[ÍI]TULO\\s+", numeral, sep_name), ignore_case = TRUE)
re_secc   <- regex(paste0("^SECCI[ÓO]N\\s+", numeral, sep_name), ignore_case = TRUE)
re_art    <- "^(Artículo|Arto\\.|Art\\.)\\s*([0-9]+)"
re_cierre <- "^(Dad[oa]|DAD[OA])\\s"

# Canonical label: "TITULO Vlll" -> "TÍTULO VIII"; "CAPITULO 2.°" -> "CAPÍTULO II";
# "Capítulo unico" -> "CAPÍTULO ÚNICO". The source sometimes types a lowercase
# L instead of the Roman numeral I.
normalize_label <- function(word, num) {
  num <- str_remove_all(num, "[\\s.°]")
  num <- case_when(
    is.na(num)                         ~ NA_character_,
    str_detect(num, "^[0-9]+$")        ~ as.character(utils::as.roman(suppressWarnings(as.integer(num)))),
    str_detect(num, "^[IVXLl]+$")      ~ toupper(str_replace_all(num, "l", "I")),
    toupper(num) %in% c("UNICO", "ÚNICO") ~ "ÚNICO",
    toupper(num) %in% c("UNICA", "ÚNICA") ~ "ÚNICA",
    TRUE                               ~ toupper(num)
  )
  if_else(is.na(num), NA_character_, paste(word, num))
}

parse_constitution <- function(lines, id) {
  m_tit <- str_match(lines, re_titulo)
  m_cap <- str_match(lines, re_cap)
  m_sec <- str_match(lines, re_secc)
  d <- tibble(
    id = id, line = seq_along(lines), text = lines,
    titulo_lab = normalize_label("TÍTULO", m_tit[, 2]),   titulo_nom = m_tit[, 3],
    cap_lab    = normalize_label("CAPÍTULO", m_cap[, 2]), cap_nom    = m_cap[, 3],
    secc_lab   = normalize_label("SECCIÓN", m_sec[, 2])
  ) %>%
    filter(text != ".") %>%
    mutate(
      is_titulo = !is.na(titulo_lab),
      is_cap    = !is.na(cap_lab),
      is_secc   = !is.na(secc_lab),
      art_start = as.integer(str_match(text, re_art)[, 3])
    )

  is_heading   <- d$is_titulo | d$is_cap
  first_body   <- if (any(is_heading)) which(is_heading)[1] else which(!is.na(d$art_start))[1]
  last_art     <- max(which(!is.na(d$art_start)))
  cierre_rows  <- which(seq_len(nrow(d)) > last_art & str_detect(d$text, re_cierre))
  if (is.na(first_body)) stop("No heading or article found for ", id)
  if (length(cierre_rows) == 0) stop("No closing 'Dado en' line found for ", id)
  first_cierre <- cierre_rows[1]

  d <- d %>%
    mutate(
      idx = row_number(),
      seccion = case_when(
        idx < first_body    ~ "preambulo",
        idx >= first_cierre ~ "cierre",
        TRUE                ~ "cuerpo"
      ),
      en_cuerpo  = seccion == "cuerpo",
      titulo_raw = if_else(is_titulo & en_cuerpo, titulo_lab, NA_character_),
      cap_raw    = if_else(is_cap & en_cuerpo, cap_lab, NA_character_),
      secc_raw   = if_else(is_secc & en_cuerpo, secc_lab, NA_character_)
    )

  # Title: carried down from its heading, only inside the body.
  d <- d %>%
    fill(titulo_raw) %>%
    mutate(titulo_raw = if_else(en_cuerpo, titulo_raw, NA_character_))

  # Chapter: carried down only within its own title.
  d <- d %>%
    group_by(titulo_raw) %>%
    fill(cap_raw) %>%
    ungroup() %>%
    mutate(cap_raw = if_else(en_cuerpo, cap_raw, NA_character_))

  # Section: carried down only within its own chapter.
  d <- d %>%
    group_by(titulo_raw, cap_raw) %>%
    fill(secc_raw) %>%
    ungroup() %>%
    mutate(secc_raw = if_else(en_cuerpo, secc_raw, NA_character_))

  # Heading rows: the TÍTULO line; title-topic lines (after TÍTULO, before the
  # title's first CAPÍTULO or first article); the CAPÍTULO line; the
  # chapter-name line (right after CAPÍTULO when not an article); the SECCIÓN
  # line and its name line.
  d <- d %>%
    group_by(titulo_raw) %>%
    mutate(tema_line = en_cuerpo & !is.na(titulo_raw) & !is_titulo &
             cumsum(is_cap | !is.na(art_start)) == 0) %>%
    group_by(titulo_raw, cap_raw) %>%
    mutate(cap_tema_line = en_cuerpo & !is.na(cap_raw) & first(is_cap) &
             row_number() == 2 & is.na(art_start) & !is_secc) %>%
    group_by(titulo_raw, cap_raw, secc_raw) %>%
    mutate(secc_name_line = en_cuerpo & !is.na(secc_raw) & first(is_secc) &
             row_number() == 2 & is.na(art_start)) %>%
    ungroup() %>%
    mutate(tipo = if_else(
      en_cuerpo & (is_titulo | is_cap | is_secc | tema_line | cap_tema_line | secc_name_line),
      "encabezado", "texto"))

  # Article: carried down only within its own chapter, never onto headings.
  d <- d %>%
    group_by(titulo_raw, cap_raw) %>%
    fill(art_start) %>%
    ungroup() %>%
    mutate(art = if_else(en_cuerpo & tipo == "texto", art_start, NA_integer_))

  # Topics. `tema` = the title's inline name or its topic lines joined by a
  # space. If a title has neither but exactly one chapter, the chapter name is
  # the title's topic (1974 layout). Otherwise `tema` is NA.
  # `cap_tema` = the chapter's inline name or its name line.
  temas <- d %>%
    filter(en_cuerpo, !is.na(titulo_raw), is_titulo | tema_line) %>%
    group_by(titulo_raw) %>%
    summarise(
      tema_titulo = {
        parts <- c(na.omit(titulo_nom[is_titulo]), text[tema_line])
        if (length(parts)) paste(parts, collapse = " ") else NA_character_
      },
      .groups = "drop")
  cap_temas <- d %>%
    filter(en_cuerpo, !is.na(cap_raw), (is_cap & !is.na(cap_nom)) | cap_tema_line) %>%
    group_by(titulo_raw, cap_raw) %>%
    summarise(cap_tema = if_else(any(is_cap & !is.na(cap_nom)),
                                 first(cap_nom[is_cap & !is.na(cap_nom)]),
                                 first(text[cap_tema_line])),
              .groups = "drop")
  n_caps <- d %>%
    filter(is_cap, en_cuerpo) %>%
    count(titulo_raw, name = "n_caps")

  d %>%
    left_join(temas, by = "titulo_raw") %>%
    left_join(cap_temas, by = c("titulo_raw", "cap_raw")) %>%
    left_join(n_caps, by = "titulo_raw") %>%
    group_by(titulo_raw) %>%
    mutate(tema_unico_cap = if (!is.na(first(titulo_raw)) && isTRUE(first(n_caps) == 1))
                              first(na.omit(cap_tema)) else NA_character_) %>%
    ungroup() %>%
    mutate(
      tema = case_when(
        seccion == "preambulo" ~ "PREÁMBULO",
        seccion == "cierre"    ~ NA_character_,
        !is.na(tema_titulo)    ~ tema_titulo,
        TRUE                   ~ tema_unico_cap
      ),
      titulo = if_else(seccion == "preambulo", "PREÁMBULO", titulo_raw),
      cap = cap_raw,
      subdivision = secc_raw
    ) %>%
    select(id, line, text, titulo, cap, subdivision, art, tema, cap_tema, seccion, tipo)
}

# Build -------------------------------------------------------------------

parsed <- imap(textos, ~ parse_constitution(.x, .y))

constituciones <- bind_rows(parsed[ids])

legacy_years <- c("1974", "1987", "2010", "2014")
for (y in legacy_years) {
  assign(paste0("cons_", y),
         parsed[[y]] %>%
           mutate(year = as.integer(id)) %>%
           select(year, line, text, titulo, cap, art, tema, cap_tema, seccion, tipo))
}

# Export datasets ---------------------------------------------------------

for (nm in c(paste0("cons_", legacy_years), "constituciones", "fuentes")) {
  path <- file.path("data", paste0(nm, ".rda"))
  # version = 2 keeps the files loadable by R < 3.5 (DESCRIPTION: R >= 2.10)
  save(list = nm, file = path, compress = "xz", version = 2)
  message("saved ", path)
}
