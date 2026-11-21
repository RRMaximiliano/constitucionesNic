## Builds the data for the website in site/data/ from the package datasets
## (data/constituciones.rda, data/fuentes.rda). Run DATASET.R first.
##
## Output (all JSON, UTF-8):
##   site/data/timeline.json            every version and reform law, in date order
##   site/data/versiones/<id>.json      full text of one version
##   site/data/cambios/<a>__<b>.json    article-level changes for each reform
##
## Run from the package root:
##   Rscript data-raw/site_data.R

# Packages ----------------------------------------------------------------

library(dplyr)
library(stringr)
library(purrr)
library(jsonlite)
library(digest)

e <- new.env()
load("data/constituciones.rda", envir = e)
load("data/fuentes.rda", envir = e)
constituciones <- e$constituciones
fuentes <- e$fuentes

# Article comparison -------------------------------------------------------
#
# Used only to build the website data (site/data/). For each pair of
# consecutive versions of the SAME constitution (a reform), match old and new
# articles one-to-one and classify each one:
#   sin_cambios  same normalized text
#   modificado   matched, text differs (solo_forma = TRUE when only punctuation,
#                case or spacing differ)
#   derogado     old article with no match
#   nuevo        new article with no match
# Matching: word-set Jaccard similarity. Pass 1 pairs any articles with
# similarity >= 0.35, best first. Pass 2 pairs leftover articles that keep the
# same number with similarity >= 0.15. renumerado = matched with a different
# number (e.g. the 2025 text renumbered most articles).

UMBRAL_CONTENIDO <- 0.35
UMBRAL_MISMO_NUM <- 0.15

articles_of <- function(x) {
  x %>%
    filter(seccion == "cuerpo", tipo == "texto", !is.na(art)) %>%
    group_by(id, art) %>%
    summarise(titulo = first(titulo), cap = first(cap),
              texto = paste(text, collapse = "\n"), .groups = "drop")
}

strip_label <- function(t) str_remove(t, "^(Artículo|Arto\\.|Art\\.)\\s*[0-9]+\\s*[.\\-–]*\\s*")

normalize_text <- function(t) {
  t <- strip_label(t)
  t <- str_replace_all(t, "[\u00a0[:space:]]+", " ")
  t <- str_replace_all(t, "[\u201c\u201d\u00ab\u00bb]", "\"")
  str_trim(t)
}

only_letters <- function(t) str_to_lower(str_remove_all(normalize_text(t), "[^[:alnum:]]"))

word_sets <- function(txt) {
  words <- str_split(str_to_lower(strip_label(txt)), "[^[:alnum:]áéíóúüñ]+")
  lapply(words, function(w) unique(w[nchar(w) > 2]))
}

jaccard_matrix <- function(a, b) {
  m <- matrix(0, length(a), length(b))
  for (i in seq_along(a)) for (j in seq_along(b)) {
    u <- length(union(a[[i]], b[[j]]))
    m[i, j] <- if (u == 0) 0 else length(intersect(a[[i]], b[[j]])) / u
  }
  m
}

align_articles <- function(old, new) {
  sim <- jaccard_matrix(word_sets(old$texto), word_sets(new$texto))
  used_o <- rep(FALSE, nrow(old)); used_n <- rep(FALSE, nrow(new))
  pares <- matrix(integer(0), 0, 2)
  take <- function(cand) {
    cand <- cand[order(-sim[cand], abs(old$art[cand[, 1]] - new$art[cand[, 2]])), , drop = FALSE]
    for (k in seq_len(nrow(cand))) {
      i <- cand[k, 1]; j <- cand[k, 2]
      if (!used_o[i] && !used_n[j]) {
        used_o[i] <<- TRUE; used_n[j] <<- TRUE
        pares <<- rbind(pares, c(i, j))
      }
    }
  }
  take(which(sim >= UMBRAL_CONTENIDO, arr.ind = TRUE))
  take(which(outer(old$art, new$art, "==") & sim >= UMBRAL_MISMO_NUM, arr.ind = TRUE))

  i <- pares[, 1]; j <- pares[, 2]
  emparejados <- tibble(
    art_antes = old$art[i], art_despues = new$art[j],
    titulo_antes = old$titulo[i], titulo_despues = new$titulo[j],
    similitud = round(sim[cbind(i, j)], 3),
    texto_antes = old$texto[i], texto_despues = new$texto[j]
  ) %>%
    mutate(
      estado = if_else(normalize_text(texto_antes) == normalize_text(texto_despues), "sin_cambios", "modificado"),
      solo_forma = estado == "modificado" & only_letters(texto_antes) == only_letters(texto_despues)
    )
  bind_rows(
    emparejados,
    tibble(art_antes = old$art[!used_o], titulo_antes = old$titulo[!used_o],
           texto_antes = old$texto[!used_o], estado = "derogado", solo_forma = FALSE),
    tibble(art_despues = new$art[!used_n], titulo_despues = new$titulo[!used_n],
           texto_despues = new$texto[!used_n], estado = "nuevo", solo_forma = FALSE)
  ) %>%
    mutate(renumerado = !is.na(art_antes) & !is.na(art_despues) & art_antes != art_despues) %>%
    arrange(coalesce(art_despues, art_antes + 0.5))
}

# Versions ----------------------------------------------------------------

versiones <- fuentes %>%
  filter(snapshot) %>%
  mutate(fecha = coalesce(fecha_aprobacion, fecha_publicacion)) %>%
  arrange(fecha, id)

articulos <- constituciones %>%
  group_by(id) %>%
  group_split() %>%
  map(articles_of) %>%
  set_names(map_chr(., ~ .x$id[1]))

commit_of <- function(id) {
  txt <- paste(constituciones$text[constituciones$id == id], collapse = "\n")
  substr(digest(txt, algo = "sha1", serialize = FALSE), 1, 7)
}
palabras_of <- function(id) {
  x <- constituciones %>% filter(id == !!id, seccion == "cuerpo", tipo == "texto")
  sum(lengths(str_split(str_squish(x$text), " ")))
}

# Parent of each "principal" version = the previous "principal" version.
principal <- versiones$id[versiones$linea == "principal"]
padre_of <- function(id) {
  i <- match(id, principal)
  if (is.na(i) || i == 1) NA_character_ else principal[i - 1]
}

dir.create("site/data/versiones", recursive = TRUE, showWarnings = FALSE)
dir.create("site/data/cambios", recursive = TRUE, showWarnings = FALSE)

entradas <- list()
for (k in seq_len(nrow(versiones))) {
  v <- versiones[k, ]
  padre <- padre_of(v$id)
  cambio <- NULL
  if (!is.na(padre)) {
    familia_padre <- versiones$familia[versiones$id == padre]
    if (identical(familia_padre, v$familia)) {
      a <- align_articles(articulos[[padre]], articulos[[v$id]])
      archivo <- paste0("cambios/", padre, "__", v$id, ".json")
      write_json(
        list(antes = padre, despues = v$id,
             umbral_contenido = UMBRAL_CONTENIDO, umbral_mismo_numero = UMBRAL_MISMO_NUM,
             articulos = a %>% mutate(texto_antes = if_else(estado == "sin_cambios", NA_character_, texto_antes))),
        file.path("site", "data", archivo), auto_unbox = TRUE, na = "null", digits = NA)
      cambio <- list(
        tipo = "reforma", archivo = archivo,
        resumen = list(sin_cambios = sum(a$estado == "sin_cambios"),
                       modificado  = sum(a$estado == "modificado"),
                       solo_forma  = sum(a$solo_forma),
                       derogado    = sum(a$estado == "derogado"),
                       nuevo       = sum(a$estado == "nuevo"),
                       renumerado  = sum(a$renumerado)))
    } else {
      cambio <- list(
        tipo = "nueva", archivo = NULL,
        resumen = list(articulos_antes = nrow(articulos[[padre]]), articulos_despues = nrow(articulos[[v$id]]),
                       palabras_antes = palabras_of(padre), palabras_despues = palabras_of(v$id)))
    }
  }
  write_json(
    list(id = v$id,
         lineas = constituciones %>% filter(id == v$id) %>%
           select(line, text, titulo, cap, subdivision, art, tema, cap_tema, seccion, tipo)),
    file.path("site", "data", "versiones", paste0(v$id, ".json")),
    auto_unbox = TRUE, na = "null", digits = NA)
  entradas[[k]] <- list(
    id = v$id, nombre = v$nombre, tipo = v$tipo, linea = v$linea, familia = v$familia,
    fecha = format(v$fecha), fecha_aprobacion = format(v$fecha_aprobacion),
    fecha_publicacion = format(v$fecha_publicacion), publicacion = v$publicacion,
    url = v$url, nota = v$nota, commit = commit_of(v$id),
    n_articulos = nrow(articulos[[v$id]]), n_palabras = palabras_of(v$id),
    padre = padre, cambio = cambio)
}

# Reform laws: incorporated in the text published the same day, if any.
leyes <- fuentes %>%
  filter(tipo == "ley_reforma") %>%
  arrange(fecha_publicacion, id) %>%
  mutate(incorporada_en = map_chr(fecha_publicacion, function(d) {
    hit <- versiones$id[versiones$linea == "principal" & versiones$fecha_publicacion == d]
    if (length(hit)) hit[1] else NA_character_
  }))

write_json(
  list(
    generado = format(Sys.Date()),
    portal = "http://legislacion.asamblea.gob.ni",
    versiones = entradas,
    leyes = leyes %>%
      transmute(id, nombre, fecha_aprobacion = format(fecha_aprobacion),
                fecha_publicacion = format(fecha_publicacion), publicacion, url, nota,
                incorporada_en)
  ),
  "site/data/timeline.json", auto_unbox = TRUE, na = "null", digits = NA, null = "null"
)
message("wrote site/data/timeline.json, ", nrow(versiones), " versions, ",
        length(list.files("site/data/cambios")), " change files")
