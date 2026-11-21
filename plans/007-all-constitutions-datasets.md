# Plan 007: Parse every constitution into the package (`constituciones` and `fuentes` datasets)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat b834124..HEAD -- data-raw/DATASET.R data/ R/ man/ tests/ DESCRIPTION NEWS.md README.Rmd`
> Only plan 006 should have run since `b834124`, and it does not touch these
> paths, so the output must be empty. Otherwise compare against "Current
> state" and STOP on a mismatch.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (rewrites the data build; the 4 existing datasets must stay identical)
- **Depends on**: plans/006-constitution-sources.md (the registry and 20 snapshots); plans 001–005
- **Category**: direction
- **Planned at**: commit `b834124` (tip of `advisor/005-fix-structural-parsing`), 2026-11-20

## Why this matters

After plan 006, `data-raw/` holds 20 constitutional texts (1826 → 2025) and a
registry, `data-raw/fuentes.csv`. The parser in `data-raw/DATASET.R` only
understands the layout of the 1974–2014 texts. Older texts use other heading
forms:
- chapters only, no títulos (1838, 1913);
- títulos only, no chapters (1894, 1905, 1912);
- `SECCIÓN` subdivisions (1838);
- mixed case and inline names (`Capítulo I: De la República…`);
- Arabic numerals with a degree sign (`TITULO 1 °`, `CAPITULO 2.°`);
- `TÍTULO PRELIMINAR`.

This plan generalizes the parser. It adds two datasets: `constituciones`
(every text, one row per line, same structural columns as `cons_2014`) and
`fuentes` (the registry). Plans 008/009 build the website from them. The
existing datasets `cons_1974`…`cons_2014` must come out **identical**. The
advisor prototyped this exact end state: identical legacy datasets, 382 test
expectations passing, `R CMD check` → `Status: OK`.

## Current state

- `data-raw/fuentes.csv` — 25 rows (plan 006). Columns: `id, nombre, tipo, linea, familia, fecha_aprobacion, fecha_publicacion, publicacion, document_id, snapshot, nota`. 20 rows have `snapshot = TRUE`.
- `data-raw/raw/cons_<id>.txt` — 20 snapshot files, one per `snapshot = TRUE` id (`1826`, `1838`, `1854-proyecto`, `1858`, `1894`, `1898-federal`, `1905`, `1912`, `1913-non-nata`, `1939`, `1948`, `1950`, `1974`, `1987`, `2010`, `2014`, `2022`, `2024-preliminar`, `2024`, `2025`).
- `data-raw/DATASET.R` (from plan 005). It reads only the 4 legacy snapshots, defines `parse_constitution(lines, year)` and saves `data/cons_1974.rda` … `cons_2014.rda`. This plan **replaces the whole file**.
- `R/data.R` — roxygen docs for the 4 legacy datasets; this plan **appends** two blocks.
- `tests/testthat/` — `test-data.R`, `test-invariants.R`, `test-structure.R`. All must keep passing **unchanged**.
- `DESCRIPTION` — `Version: 0.2.0`. `NEWS.md` starts with `# constitucionesNic 0.2.0`.
- Known source quirks the tests encode (verified by the advisor):
  - 1826: Article 73 is printed without its `Art. 73.` label, so its text is part of Article 72 and 73 is missing from `art`.
  - 1939 and 1948 end with transitional provisions not numbered as articles, so 17 and 10 body-text rows respectively have `art = NA`.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Rebuild data | `Rscript data-raw/DATASET.R` | 6 `saved data/…` messages |
| Tests | `Rscript -e 'testthat::test_local()'` | `FAIL 0` |
| Docs | `Rscript -e 'roxygen2::roxygenise()'` | writes `man/constituciones.Rd`, `man/fuentes.Rd` |
| Build + check | `P=$PWD; T=$(mktemp -d) && (cd "$T" && R CMD build "$P" && _R_CHECK_FUTURE_FILE_TIMESTAMPS_=FALSE R CMD check --no-manual constitucionesNic_*.tar.gz)` | `Status: OK` |

Required R packages: dplyr, tidyr, stringr, readr, purrr, testthat, roxygen2, rmarkdown, knitr; tidyverse + pandoc for the README re-knit. No network.

## Scope

**In scope**:
- `data-raw/DATASET.R` (replace)
- `data/constituciones.rda`, `data/fuentes.rda` (create); `data/cons_*.rda` (regenerated, then restored — see Step 2)
- `R/data.R` (append), `man/constituciones.Rd`, `man/fuentes.Rd` (generated)
- `tests/testthat/test-constituciones.R` (create)
- `DESCRIPTION` (version), `NEWS.md`, `README.Rmd`, `README.md` (re-knit)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):
- `data-raw/raw/*`, `data-raw/fuentes.csv`, `data-raw/fetch_sources.R` — inputs from plan 006.
- `tests/testthat/test-data.R`, `test-invariants.R`, `test-structure.R` — must pass unchanged.
- Any change in `cons_1974` … `cons_2014` values. If they change, STOP.
- Website files (`site/`) — plans 008/009.

## Git workflow

- Pre-flight: `git status --porcelain --untracked-files=no` must print nothing; otherwise STOP. `BASE=$(git rev-parse HEAD)`.
- Branch: `advisor/007-all-constitutions-datasets` (from the branch where plan 006 landed).
- Commits: 1. `:sparkles: parse every constitution into constituciones and fuentes`; 2. `:memo: documented new datasets, bumped to 0.3.0`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Replace `data-raw/DATASET.R`

Replace the whole file with the block below. **Copy it mechanically** from
this plan file (python/awk slice between the fences). It contains non-ASCII
characters (`Í`, `Ó`, `Ú`, `°`, `–`) inside regexes that must survive exactly.

```r
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
```

**Verify**: `grep -c 'parse_constitution' data-raw/DATASET.R` → `2`; `grep -c 'fuentes.csv' data-raw/DATASET.R` → at least `1`; `file data-raw/DATASET.R` → UTF-8, no CRLF.

### Step 2: Rebuild and prove the legacy datasets are identical

```sh
Rscript data-raw/DATASET.R
Rscript -e '
for (y in c("1974", "1987", "2010", "2014")) {
  nm <- paste0("cons_", y); f <- file.path("data", paste0(nm, ".rda"))
  o <- tempfile(fileext = ".rda"); stopifnot(system2("git", c("show", paste0("HEAD:", f)), stdout = o) == 0)
  a <- new.env(); b <- new.env(); load(o, envir = a); load(f, envir = b)
  cat(y, "legacy identical:", identical(get(nm, a), get(nm, b)), "\n")
}
e <- new.env(); load("data/constituciones.rda", envir = e); load("data/fuentes.rda", envir = e)
cat("constituciones", nrow(e$constituciones), "rows,", ncol(e$constituciones), "cols,", length(unique(e$constituciones$id)), "ids\n")
cat("fuentes", nrow(e$fuentes), "rows,", ncol(e$fuentes), "cols\n")'
```

**Verify**: output is exactly

```
1974 legacy identical: TRUE
1987 legacy identical: TRUE
2010 legacy identical: TRUE
2014 legacy identical: TRUE
constituciones 10809 rows, 11 cols, 20 ids
fuentes 25 rows, 12 cols
```

Then restore the legacy files so the commit doesn't carry byte-only churn (the
objects are identical; `.rda` bytes differ across R versions):
`git checkout -- data/cons_1974.rda data/cons_1987.rda data/cons_2010.rda data/cons_2014.rda`.
Keep the two new files. **Verify**: `git status --porcelain data/` → exactly
`?? data/constituciones.rda` and `?? data/fuentes.rda`.

If any line says `FALSE`, run `git checkout -- data/`, delete the two new
`.rda` files, and STOP.

### Step 3: Add the tests

Create `tests/testthat/test-constituciones.R` with exactly this content (pure
ASCII; keep the `\u` escapes as literal backslash-u text, so copy mechanically):

```r
## Every text in `constituciones` and the `fuentes` registry.
## Non-ASCII characters are written as \u escapes.

expected <- data.frame(
  id = c("1826", "1838", "1854-proyecto", "1858", "1894", "1898-federal", "1905",
         "1912", "1913-non-nata", "1939", "1948", "1950", "1974", "1987", "2010",
         "2014", "2022", "2024-preliminar", "2024", "2025"),
  filas = c(317L, 398L, 287L, 299L, 340L, 396L, 300L, 471L, 421L, 806L, 680L,
            771L, 867L, 528L, 665L, 715L, 720L, 552L, 725L, 551L),
  encabezado = c(79L, 75L, 22L, 54L, 42L, 50L, 38L, 50L, 50L, 75L, 65L, 71L,
                 89L, 68L, 68L, 69L, 68L, 66L, 68L, 66L),
  n_art = c(168L, 198L, 112L, 105L, 162L, 161L, 122L, 172L, 184L, 352L, 289L,
            336L, 343L, 202L, 202L, 202L, 202L, 184L, 202L, 184L),
  sin_art = c(0L, 0L, 0L, 0L, 0L, 0L, 0L, 0L, 0L, 17L, 10L, 0L, 0L, 0L, 0L,
              0L, 0L, 0L, 0L, 0L),
  stringsAsFactors = FALSE
)

test_that("constituciones has the expected columns and every snapshot text", {
  expect_identical(names(constituciones),
                   c("id", "line", "text", "titulo", "cap", "subdivision", "art",
                     "tema", "cap_tema", "seccion", "tipo"))
  expect_type(constituciones$art, "integer")
  expect_setequal(unique(constituciones$id), expected$id)
  expect_setequal(unique(constituciones$id), fuentes$id[fuentes$snapshot])
})

for (k in seq_len(nrow(expected))) {
  e <- expected[k, ]
  d <- constituciones[constituciones$id == e$id, ]
  cuerpo <- d$seccion == "cuerpo"

  test_that(paste0(e$id, " has the expected size and structure"), {
    expect_identical(nrow(d), e$filas)
    expect_identical(sum(d$tipo == "encabezado"), e$encabezado)
    expect_identical(rle(d$seccion)$values, c("preambulo", "cuerpo", "cierre"))
    expect_identical(max(d$art, na.rm = TRUE), e$n_art)
    expect_identical(sum(is.na(d$art) & cuerpo & d$tipo == "texto"), e$sin_art)
    expect_true(all(is.na(d$art[d$tipo == "encabezado"])))
    expect_false(is.unsorted(d$art[!is.na(d$art)]))
  })

  test_that(paste0(e$id, " numbers its articles 1..N"), {
    present <- sort(unique(d$art[!is.na(d$art)]))
    missing <- setdiff(seq_len(e$n_art), present)
    # 1826: article 73 is printed without its number in the source.
    expect_identical(missing, if (e$id == "1826") 73L else integer(0))
  })
}

test_that("constituciones reproduces the legacy datasets", {
  legacy <- list("1974" = cons_1974, "1987" = cons_1987, "2010" = cons_2010, "2014" = cons_2014)
  cols <- c("line", "text", "titulo", "cap", "art", "tema", "cap_tema", "seccion", "tipo")
  for (y in names(legacy)) {
    d <- constituciones[constituciones$id == y, ]
    for (cc in cols) expect_identical(d[[cc]], legacy[[y]][[cc]], info = paste(y, cc))
  }
})

test_that("heading labels are normalized in every text", {
  expect_true(all(is.na(constituciones$cap) |
                    grepl("^CAP\u00cdTULO ([IVXL]+|\u00daNICO)$", constituciones$cap)))
  tit <- constituciones$titulo[constituciones$seccion == "cuerpo"]
  expect_true(all(is.na(tit) | grepl("^T\u00cdTULO ([IVXL]+|PRELIMINAR)$", tit)))
  sub <- constituciones$subdivision
  expect_true(all(is.na(sub) | grepl("^SECCI\u00d3N [IVXL]+$", sub)))
})

test_that("fuentes is a consistent registry", {
  expect_identical(nrow(fuentes), 25L)
  expect_false(anyDuplicated(fuentes$id) > 0)
  expect_s3_class(fuentes$fecha_publicacion, "Date")
  expect_false(anyNA(fuentes$fecha_publicacion))
  expect_true(all(fuentes$tipo %in% c("constitucion", "texto_consolidado", "proyecto",
                                      "non_nata", "preliminar", "federal", "ley_reforma")))
  expect_true(all(fuentes$linea %in% c("principal", "alterna")))
  expect_true(all(fuentes$familia %in% fuentes$id))
  expect_identical(sum(fuentes$tipo == "ley_reforma"), 5L)
  expect_true(all(!fuentes$snapshot[fuentes$tipo == "ley_reforma"]))
})
```

**Verify**: `LC_ALL=C grep -c '[^ -~]' tests/testthat/test-constituciones.R` → `0`; `Rscript -e 'testthat::test_local()'` → `[ FAIL 0 | WARN 0 | SKIP 0 | PASS 382 ]`; `git diff --exit-code "$BASE" -- tests/testthat/test-data.R tests/testthat/test-invariants.R tests/testthat/test-structure.R` → exit 0.

Commit 1 (DATASET.R, the two new `.rda`, the new test file).

### Step 4: Document the datasets

Append this block to the end of `R/data.R` (keep the existing four blocks):

```r
#' @title Todas las constituciones políticas de Nicaragua
#'
#' @description Un \code{tibble} con el texto completo de cada constitución,
#' texto consolidado y proyecto registrado en \code{\link{fuentes}}, una fila
#' por línea del texto oficial. Las columnas tienen el mismo significado que en
#' \code{\link{cons_2014}}, con \code{id} en lugar de \code{year} y una columna
#' adicional, \code{subdivision}.
#'
#' @format Un \code{tibble} con 11 variables:
#'
#' \describe{
#' \item{id}{(texto) Identificador del texto; ver \code{fuentes$id}
#'   (p. ej. \code{"1838"}, \code{"1913-non-nata"}, \code{"2025"}).}
#' \item{line}{(entero) Número de línea en el texto extraído.}
#' \item{text}{(texto) Texto de la línea, sin modificar (ortografía original).}
#' \item{titulo}{(texto) Título normalizado; \code{NA} si la constitución no
#'   se divide en títulos.}
#' \item{cap}{(texto) Capítulo normalizado; \code{NA} si no hay capítulos.}
#' \item{subdivision}{(texto) Sección normalizada (p. ej. \code{"SECCIÓN I"}),
#'   solo en los textos que la usan.}
#' \item{art}{(entero) Número del artículo. \code{NA} en encabezados,
#'   preámbulo, cierre y disposiciones transitorias sin número.}
#' \item{tema}{(texto) Tema del título.}
#' \item{cap_tema}{(texto) Nombre del capítulo.}
#' \item{seccion}{(texto) \code{"preambulo"}, \code{"cuerpo"} o \code{"cierre"}.}
#' \item{tipo}{(texto) \code{"encabezado"} o \code{"texto"}.}
#' }
#'
#' @details Los textos de 1974, 1987, 2010 y 2014 provienen de la extracción
#' de 2021 y coinciden con \code{cons_1974} a \code{cons_2014}. Los demás se
#' extrajeron en noviembre de 2026. En el texto de 1826, el artículo 73 aparece
#' sin su número en la fuente y queda incluido en el artículo 72.
#'
#' @source Asamblea Nacional de Nicaragua, Legislación de Nicaragua
#'   (\url{http://legislacion.asamblea.gob.ni}), categoría "Constituciones
#'   Políticas de Nicaragua".
"constituciones"

#' @title Registro de constituciones, textos consolidados y leyes de reforma
#'
#' @description Un \code{tibble} con una fila por documento de la categoría
#' "Constituciones Políticas de Nicaragua" del portal de la Asamblea Nacional.
#'
#' @format Un \code{tibble} con 12 variables:
#'
#' \describe{
#' \item{id}{(texto) Identificador; clave para \code{constituciones$id}.}
#' \item{nombre}{(texto) Nombre del documento.}
#' \item{tipo}{(texto) \code{"constitucion"}, \code{"texto_consolidado"},
#'   \code{"proyecto"}, \code{"non_nata"}, \code{"preliminar"},
#'   \code{"federal"} o \code{"ley_reforma"}.}
#' \item{linea}{(texto) \code{"principal"} para los textos que estuvieron
#'   vigentes y las leyes de reforma; \code{"alterna"} para proyectos, textos
#'   no vigentes y la constitución federal.}
#' \item{familia}{(texto) \code{id} de la constitución original a la que
#'   pertenece el texto (p. ej. \code{"1987"} para los textos de 2010 a 2025).}
#' \item{fecha_aprobacion}{(fecha) Fecha de aprobación, si se conoce.}
#' \item{fecha_publicacion}{(fecha) Fecha de publicación según el portal.}
#' \item{publicacion}{(texto) Medio de publicación (p. ej. La Gaceta).}
#' \item{document_id}{(texto) Identificador del documento en el portal.}
#' \item{snapshot}{(lógico) \code{TRUE} si el texto completo está en
#'   \code{constituciones}.}
#' \item{nota}{(texto) Observaciones.}
#' \item{url}{(texto) Dirección del documento en el portal.}
#' }
#'
#' @source \url{http://legislacion.asamblea.gob.ni}
"fuentes"
```

Run `Rscript -e 'roxygen2::roxygenise()'`.

**Verify**: `ls man/constituciones.Rd man/fuentes.Rd` → both exist; `git status --porcelain --untracked-files=no -- NAMESPACE` → empty.

### Step 5: Version, NEWS, README

1. `DESCRIPTION`: `Version: 0.2.0` → `Version: 0.3.0`.
2. Prepend to `NEWS.md` (above `# constitucionesNic 0.2.0`):

```markdown
# constitucionesNic 0.3.0

## Nuevos datos

* `constituciones`: el texto completo de las 20 constituciones, textos
  consolidados y proyectos publicados por la Asamblea Nacional, de 1826 a 2025,
  una fila por línea, con las mismas columnas estructurales que `cons_2014`
  (más `id` y `subdivision`).
* `fuentes`: registro de los 25 documentos de la categoría "Constituciones
  Políticas de Nicaragua" (constituciones, textos consolidados, proyectos y
  leyes de reforma), con fechas, tipo y enlace al portal.

## Cambios internos

* `data-raw/fetch_sources.R` descarga los textos que faltan; `DATASET.R`
  reconoce más formatos de encabezados (mayúsculas o minúsculas, numeración
  arábiga, "SECCIÓN", "TÍTULO PRELIMINAR", nombres en la misma línea).
  `cons_1974`, `cons_1987`, `cons_2010` y `cons_2014` no cambian.
```

3. In `README.Rmd`, insert this section immediately before the line `# Comentarios y sugerencias`:

````markdown
## Todas las constituciones

`constituciones` reúne todos los textos (de 1826 a 2025) y `fuentes` describe
cada documento: tipo, fechas y enlace al portal de la Asamblea Nacional.

```{r}
fuentes %>% 
  filter(snapshot) %>% 
  select(id, tipo, fecha_publicacion)
```

```{r}
# Número de artículos por texto
constituciones %>% 
  filter(!is.na(art)) %>% 
  distinct(id, art) %>% 
  count(id)
```
````

4. Re-knit: `L=$(mktemp -d) && R CMD INSTALL --library="$L" . && R_LIBS="$L${R_LIBS:+:$R_LIBS}" Rscript -e 'rmarkdown::render("README.Rmd", output_options = list(html_preview = FALSE), quiet = TRUE)'`

**Verify**: `grep -c 'Todas las constituciones' README.md` → `1`; `grep -c '1913-non-nata' README.md` → at least `1`; no `README.html`. If rendering fails, STOP before commit 2 (do not hand-edit `README.md`).

Commit 2.

### Step 6: Full check

**Verify**: Build + check → `Status: OK`.

## Test plan

`tests/testthat/test-constituciones.R` (new):
- column set and types;
- every registry snapshot present;
- per text: exact row count, heading count, preamble/body/closing order, max article, articles in order, no article on headings, articles 1..N complete (1826 allowed to miss 73), exact count of unnumbered body rows (1939: 17, 1948: 10);
- `constituciones` reproduces `cons_1974`…`cons_2014` column by column;
- heading labels normalized everywhere;
- `fuentes` registry consistency.

Existing tests (`test-data.R`, `test-invariants.R`, `test-structure.R`) must pass unchanged. Pattern: `test-structure.R`.

## Done criteria

- [ ] Step 2 output exactly as shown (4 × `TRUE`, sizes)
- [ ] `git diff --stat "$BASE"..HEAD -- data/cons_1974.rda data/cons_1987.rda data/cons_2010.rda data/cons_2014.rda` → empty
- [ ] `Rscript -e 'testthat::test_local()'` → `FAIL 0` (expected `PASS 382`)
- [ ] Existing test files unchanged
- [ ] `Version: 0.3.0`; `NEWS.md` starts with `# constitucionesNic 0.3.0`
- [ ] Build + check → `Status: OK`
- [ ] Changed files ⊆ in-scope list
- [ ] `plans/README.md` status row for 007 updated

## STOP conditions

- Any legacy dataset not identical (Step 2).
- `parse_constitution()` errors (`No heading or article found` / `No closing 'Dado en' line found`) — snapshot set differs from plan 006's.
- Any per-text number in the tests fails after a faithful copy — report the test name and actual values; do not edit expected numbers.
- roxygen2 changes `NAMESPACE`.

## Maintenance notes

- Adding a text later: add the row to `fuentes.csv`, run `fetch_sources.R`, rebuild, and add its expected numbers to `test-constituciones.R`.
- The heading regexes (`re_titulo`, `re_cap`, `re_secc`) require the label to be the whole line, optionally followed by `:`/`.`/`-` and a name. A future text with a different heading style needs a regex extension plus a test row.
- `cons_1974`…`cons_2014` are kept for backward compatibility; `constituciones` supersedes them. Don't remove them without a deprecation note in NEWS.
- Reviewer focus: legacy `.rda` untouched in the diff; DATASET.R matches the plan block; the three old test files untouched.
