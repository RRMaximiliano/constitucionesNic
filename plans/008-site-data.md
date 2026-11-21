# Plan 008: Generate the website's data — timeline, full texts and article-level changes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat b834124..HEAD -- site/ .Rbuildignore data-raw/site_data.R`
> The output must be empty (plans 006/007 don't touch these). Otherwise STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (new files only; no package code or data changes)
- **Depends on**: plans/007-all-constitutions-datasets.md (`data/constituciones.rda`, `data/fuentes.rda`)
- **Category**: direction
- **Planned at**: commit `b834124` (tip of `advisor/005-fix-structural-parsing`), 2026-11-20

## Why this matters

The website (plan 009) presents Nicaragua's constitutional history as a git
log: one "commit" per published text, and a diff for each reform. It is a
static page with no server, so everything it shows must be precomputed into
JSON files. This plan writes `data-raw/site_data.R`, which turns the package
datasets into:

- `site/data/timeline.json` — every version (date, type, a 7-character
  "commit hash" derived from its text, parent version, change summary) and
  every reform law;
- `site/data/versiones/<id>.json` — the full text of each version;
- `site/data/cambios/<antes>__<despues>.json` — for each **reform** (two
  consecutive versions of the same constitution), every article classified as
  `sin_cambios`, `modificado` (with `solo_forma` when only punctuation or case
  changed), `derogado` or `nuevo`, with both texts, so the page can draw a
  word-level diff.

Between **different** constitutions (e.g. 1950 → 1974), a line diff would be
meaningless: everything removed, everything added. Those transitions get a
summary instead (articles and words before/after), like a git commit that
replaces a whole file.

## Current state

- `data/constituciones.rda` — 10,809 rows, 20 texts, columns `id, line, text, titulo, cap, subdivision, art, tema, cap_tema, seccion, tipo`.
- `data/fuentes.rda` — 25-row registry: `id, nombre, tipo, linea, familia, fecha_aprobacion, fecha_publicacion, publicacion, document_id, snapshot, nota, url`. `linea == "principal"` marks texts that were in force (and reform laws). `familia` groups the versions of one constitution: `"1987"` for 1987, 2010, 2014, 2022, 2024, 2025.
- `.Rbuildignore` ends with `^plans$` and `^\.github$` (plans 001/002). There is no `site/` directory yet.
- Article matching was calibrated by the advisor. Word-set Jaccard similarity: pass 1 pairs articles with similarity ≥ 0.35, best first; pass 2 pairs leftovers that keep their number with similarity ≥ 0.15. This keeps stable numbering in the 2010–2024 consolidations and also handles **2025, which renumbered most articles** (2024 had 202 articles, 2025 has 184). Same-number similarity there has a median of only 0.05, so number-only matching would be wrong. Spot checks of borderline pairs at 0.30 showed one false match in four; 0.35 is the chosen compromise, and the JSON exposes each pair's `similitud` so the page can show it.
- `jsonlite` and `digest` are installed (data-raw only; not package dependencies).

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Generate | `Rscript data-raw/site_data.R` | last message `wrote site/data/timeline.json, 20 versions, 5 change files` |
| Summary | see Step 2 snippet | matches the expected block exactly |
| Tests | `Rscript -e 'testthat::test_local()'` | `FAIL 0` (unchanged) |
| Build + check | `P=$PWD; T=$(mktemp -d) && (cd "$T" && R CMD build "$P" && _R_CHECK_FUTURE_FILE_TIMESTAMPS_=FALSE R CMD check --no-manual constitucionesNic_*.tar.gz)` | `Status: OK` |

## Scope

**In scope**:
- `data-raw/site_data.R` (create)
- `site/data/timeline.json`, `site/data/versiones/*.json` (20), `site/data/cambios/*.json` (5) — generated, committed
- `.Rbuildignore` (append `^site$`)
- `plans/README.md` (status row only)

**Out of scope**: `data/`, `R/`, `tests/`, `DESCRIPTION`, `data-raw/DATASET.R`, any HTML/JS/CSS (plan 009).

## Git workflow

- Pre-flight: clean tree (`git status --porcelain --untracked-files=no` empty), `BASE=$(git rev-parse HEAD)`.
- Branch: `advisor/008-site-data` (from the branch where plan 007 landed).
- One commit: `:card_file_box: generated website data (timeline, texts, changes)`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create `data-raw/site_data.R`

Create it with exactly this content (copy mechanically; it contains non-ASCII
characters and `\u` escapes in regexes that must stay as written):

```r
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
```

**Verify**: `Rscript -e 'invisible(parse("data-raw/site_data.R")); cat("ok\n")'` → `ok`.

### Step 2: Generate and check the data

```sh
Rscript data-raw/site_data.R
```

Then print the summary:

```sh
Rscript -e '
library(jsonlite)
t <- fromJSON("site/data/timeline.json", simplifyVector = FALSE)
for (v in t$versiones) cat(sprintf("%-16s %s %s %-9s %-6s %s\n", v$id, v$fecha, v$commit, v$linea,
  if (is.null(v$padre)) "-" else v$padre,
  if (is.null(v$cambio)) "" else paste(v$cambio$tipo, paste(unlist(v$cambio$resumen), collapse = "/"))))
for (l in t$leyes) cat(l$id, l$fecha_publicacion, if (is.null(l$incorporada_en)) "pendiente" else l$incorporada_en, "\n")'
```

**Verify**: the output matches exactly (trailing spaces aside):

```
1826             1826-04-08 d08e2b5 principal -
1838             1838-11-12 05b30f7 principal 1826   nueva 167/198/7631/8953
1854-proyecto    1854-04-30 1e3a035 alterna   -
1858             1858-08-19 d0007ce principal 1838   nueva 198/105/8953/6524
1894             1893-12-10 39edeab principal 1858   nueva 105/162/6524/6315
1898-federal     1898-08-27 1631c26 alterna   -
1905             1905-03-30 340e236 principal 1894   nueva 162/122/6315/5635
1912             1911-11-10 5b46a50 principal 1905   nueva 122/172/5635/8890
1913-non-nata    1913-04-03 581c770 alterna   -
1939             1939-03-22 206f835 principal 1912   nueva 172/352/8890/18352
1948             1948-01-21 126bcc7 principal 1939   nueva 352/289/18352/16590
1950             1950-11-01 ca02d37 principal 1948   nueva 289/336/16590/19172
1974             1974-03-14 be26bcf principal 1950   nueva 336/343/19172/23118
1987             1986-11-19 c570a3e principal 1974   nueva 343/202/23118/10323
2010             2010-09-16 72e8170 principal 1987   reforma 101/90/13/11/11/0
2014             2014-02-10 1c5cee4 principal 2010   reforma 127/67/14/8/8/1
2022             2021-10-27 ec82f4e principal 2014   reforma 185/17/14/0/0/0
2024             2024-03-13 d6c97c5 principal 2022   reforma 196/6/1/0/0/0
2024-preliminar  2024-11-25 8f9406e alterna   -
2025             2025-01-30 9ccb770 principal 2024   reforma 9/102/4/91/73/103
ley-1234 2025-02-18 2025
ley-1268 2026-01-16 pendiente
ley-1269 2026-01-16 pendiente
ley-1270 2026-01-19 pendiente
ley-1271 2026-01-19 pendiente
```

How to read it: `nueva a/b/c/d` = articles before/after, words before/after.
`reforma a/b/c/d/e/f` = unchanged / modified / of which format-only / deleted
/ new / renumbered.

Also:
- `ls site/data/versiones | wc -l` → `20`; `ls site/data/cambios` → the 5 files `1987__2010.json`, `2010__2014.json`, `2014__2022.json`, `2022__2024.json`, `2024__2025.json`
- `du -sh site/data` → about 5 MB (anything from 4 to 6 MB is fine)
- `Rscript -e 'x <- jsonlite::fromJSON("site/data/cambios/2024__2025.json"); stopifnot(nrow(x$articulos) == 275, all(x$articulos$estado %in% c("sin_cambios","modificado","derogado","nuevo"))); cat("ok\n")'` → `ok`

### Step 3: Keep `site/` out of the R package build

Append `^site$` as the last line of `.Rbuildignore`.

**Verify**: `tail -1 .Rbuildignore` → `^site$`; Build + check → `Status: OK` (no NOTE about a top-level `site` directory).

Commit.

## Test plan

No testthat tests: this is a `data-raw/` export, not package code. Two checks
gate it. The exact summary in Step 2 covers every version, parent link,
change type, count and commit hash. The schema assertions cover the largest
change file (2024 → 2025). Plan 009 adds a Node smoke test that reads these
files the way the page does.

## Done criteria

- [ ] Step 2 summary matches exactly
- [ ] 20 version files, 5 change files, `timeline.json`
- [ ] `tail -1 .Rbuildignore` → `^site$`; Build + check → `Status: OK`
- [ ] `Rscript -e 'testthat::test_local()'` → `FAIL 0`, same count as before (382)
- [ ] Changed files ⊆ in-scope list
- [ ] `plans/README.md` status row for 008 updated

## STOP conditions

- Any line of the Step 2 summary differs (counts, hashes or parents). The datasets differ from plan 007's, or the matching code was altered. Report the diff; don't adjust the expected block.
- `jsonlite` or `digest` missing (`Rscript -e 'library(jsonlite); library(digest)'`).
- The generated data is far outside 4–6 MB.

## Maintenance notes

- **Regenerate whenever the datasets change**: `Rscript data-raw/DATASET.R && Rscript data-raw/site_data.R`, then commit `site/data/`. The website reads only these files.
- The matching thresholds (`UMBRAL_CONTENIDO`, `UMBRAL_MISMO_NUM`) are written into every change file. Changing them changes the counts above, so update this plan's expected block and plan 009's smoke test together.
- The "commit hash" is the first 7 hex characters of the SHA-1 of the version's full text. It changes only if the text changes, which makes accidental text edits visible.
- Reform laws are attached to the text published on the same day (`incorporada_en`). The four January 2026 laws are `pendiente` until the Asamblea publishes a consolidated text. When it does, add it via plans 006/007's process and regenerate.
