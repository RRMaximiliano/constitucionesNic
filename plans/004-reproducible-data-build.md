# Plan 004: Make the data build reproducible offline from frozen text snapshots

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2f6ba42..HEAD -- data/ data-raw/`
> If anything under `data/` or `data-raw/` changed since this plan was
> written, STOP: this plan's main check compares against the data at `2f6ba42`.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (the shipped `data/*.rda` files must end up unchanged)
- **Depends on**: none (plan 003 is a useful extra safety net but not required)
- **Category**: tech-debt
- **Planned at**: commit `2f6ba42`, 2026-11-20

## Why this matters

The four datasets in `data/` were produced in 2021 by `data-raw/DATASET.R`,
which scrapes the Nicaraguan National Assembly's legislation website live and
saves no raw copy. **The data can no longer be reproduced.** The advisor
re-ran the original script logic on 2026-11-20. The live pages now start with
five navigation lines ("Legislación de Nicaragua", "Normas Jurídicas",
"Publicación oficial", "Enlace a Legislación Relacionada", "Ver enlace a
última versión de Texto Publicado"), and the constitutional text itself has
been edited since 2021. These shipped lines are no longer found verbatim in
the live pages:

| year | shipped lines not found verbatim live |
|---|---|
| 1974 | 9 of 867 |
| 1987 | 56 of 528 |
| 2010 | 18 of 665 |
| 2014 | 4 of 715 |

So any rerun of `DATASET.R` today would silently change the shipped text. Any
fix to the parsing logic (plan 005) needs a stable input to work against. This
plan freezes the exact text that is shipped today into plain-text snapshot
files under `data-raw/raw/`, and rewrites `DATASET.R` to build from those
files with no network access. Success is defined strictly: the rebuilt
datasets must be `identical()` to the shipped ones.

## Current state

- `data-raw/DATASET.R` — current build script (excluded from the package by
  `.Rbuildignore` entry `^data-raw$`). Full content today:

```r
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
```

  Problems besides the live scrape: `tidytext`, `zoo`, `tidylog` and `here`
  are loaded but unused. `usethis` is required but never loaded. The datasets
  are picked by list position (`df_list[[1]]`), which only works because
  `group_split()` sorts the year strings.

- Key facts the snapshot must preserve (all verified by the advisor):
  - `line` was assigned **before** rows equal to `"."` were dropped. In
    `cons_2014`, `line` therefore runs 1..716 with a gap at **93**: that row's
    text was exactly `"."`. The other three datasets have no gaps (`line` =
    `1..nrow`). Any gap in `line` was a `"."` row, because the `"."` filter is
    the only step after `line` is assigned that removes rows.
  - Shipped `text` values contain no newlines and no leading or trailing
    whitespace.
  - `data/*.rda` were saved with serialization **version 2** (`Rscript -e 'con <- xzfile("data/cons_1974.rda", "rb"); cat(readLines(con, n = 1, warn = FALSE), "\n"); close(con)'` prints `RDX2`) and xz compression. Keep version 2 so `Depends: R (>= 2.10)` stays valid. Version 3 would trigger an R CMD check NOTE requiring R >= 3.5.0.
  - Re-saving identical objects does **not** give byte-identical `.rda`
    files (serialization headers differ across R versions). So success is
    checked by comparing loaded objects with `identical()`, and the
    regenerated `.rda` files are then discarded rather than committed.
- The advisor prototyped this exact approach (snapshot → offline rebuild →
  compare). All four datasets came out `identical()` to the shipped ones.

## Commands you will need

Run from the package root. Required R packages for this plan: `dplyr`,
`tidyr`, `stringr`, `readr`, `purrr` (check with
`Rscript -e 'for (p in c("dplyr","tidyr","stringr","readr","purrr")) stopifnot(requireNamespace(p, quietly = TRUE)); cat("ok\n")'`).
`htm2txt`, `usethis`, `tidyverse`, and network access are **not** needed.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Rebuild data | `Rscript data-raw/DATASET.R` | exit 0; prints 4 `saved data/cons_YYYY.rda` lines |
| Compare to committed data | see Step 4 snippet | prints `1974 identical: TRUE` … `2014 identical: TRUE` |
| Tests | `Rscript -e 'testthat::test_local()'` | `FAIL 0` |

`grep -c` prints a count; when the expected count is `0`, grep also exits with status 1. That is normal. Judge by the printed number, not the exit status.

## Scope

**In scope**:
- `data-raw/raw/cons_1974.txt`, `cons_1987.txt`, `cons_2010.txt`, `cons_2014.txt` (create)
- `data-raw/DATASET.R` (rewrite)
- `data-raw/README.md` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):
- `data/*.rda` — must be **unchanged** in your final commit. You will
  regenerate them temporarily to verify, then restore them with
  `git checkout -- data/`.
- The cleaning logic's *behavior*. Reproduce it exactly, including its known
  bugs (chapter/article values leaking across titles, wrong `tema` in 1974).
  Plan 005 fixes those. Fixing them here would make the identical-output
  check impossible.
- Writing a new scraper or fetching the live site. A live-refresh workflow is
  explicitly deferred (see Maintenance notes).
- `DESCRIPTION`, `R/`, `man/`, `tests/`, `README*`.

## Git workflow

- Pre-flight: `git status --porcelain --untracked-files=no` must print nothing; otherwise STOP. Then record the starting commit with `BASE=$(git rev-parse HEAD)`. The scope checks below compare against `"$BASE"`.
- Branch: `advisor/004-reproducible-data-build`
- Commits (repo style is short lowercase messages, optional gitmoji, e.g. `:pencil: added appveyor.`):
  1. `:card_file_box: froze constitution text snapshots in data-raw/raw`
  2. `:recycle: build datasets offline from snapshots`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the text snapshots from the shipped data

Run this one-off command from the package root. **Do not commit it as a
script.** Its job is recorded in `data-raw/README.md` (Step 3).

```sh
mkdir -p data-raw/raw && Rscript -e '
for (y in c("1974", "1987", "2010", "2014")) {
  nm <- paste0("cons_", y)
  e <- new.env()
  load(file.path("data", paste0(nm, ".rda")), envir = e)
  x <- get(nm, envir = e)
  lines <- rep(".", max(x$line))   # gaps in `line` were "." rows
  lines[x$line] <- x$text
  con <- file(file.path("data-raw", "raw", paste0(nm, ".txt")), open = "wb")
  writeLines(enc2utf8(lines), con, sep = "\n", useBytes = TRUE)
  close(con)
  cat(nm, length(lines), "lines\n")
}'
```

**Verify**:
- Output is exactly:
  ```
  cons_1974 867 lines
  cons_1987 528 lines
  cons_2010 665 lines
  cons_2014 716 lines
  ```
- `wc -l data-raw/raw/*.txt` → 867, 528, 665, 716
- `sed -n 93p data-raw/raw/cons_2014.txt` → `.`
- `file data-raw/raw/*.txt` → each says `UTF-8` text and none says `CRLF`
- `head -1 data-raw/raw/cons_1974.txt` → `CONSTITUCIÓN POLÍTICA`

Commit these four files (commit 1).

### Step 2: Rewrite `data-raw/DATASET.R`

Replace the entire file with the content below. The cleaning pipeline keeps
the original logic, with two scrape-specific steps removed because the
snapshots already reflect them: `filter(text != "")` (snapshots contain no
empty lines) and `slice(-c(1:2))` (the two dropped header lines are not in the
snapshots). Do not "improve" anything else.

```r
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
```

The file contains non-ASCII characters (`Í`, `Á`) inside regexes, exactly as
the original did. Save it as UTF-8 with LF line endings.

**Verify**:
- `grep -nwE 'htm2txt|tidyverse|tidytext|zoo|tidylog|here|usethis|gettxt' data-raw/DATASET.R` → no output (`-w` matches whole words, so the word "where" in a comment does not count)
- `file data-raw/DATASET.R` → UTF-8, no CRLF

### Step 3: Write `data-raw/README.md`

Create it with this content (Spanish headings match the package; body in
Spanish to match `README.Rmd`):

```markdown
# data-raw

Este directorio contiene el código y los insumos para construir los datos del
paquete. No forma parte del paquete instalado (`.Rbuildignore`).

## Archivos

- `raw/cons_<año>.txt`: texto congelado de cada constitución, una línea por
  fila, UTF-8. Una línea que contiene solo `.` se conserva para mantener la
  numeración original de `line`, y se elimina al construir los datos.
- `DATASET.R`: construye `data/cons_<año>.rda` a partir de `raw/`. No accede a
  internet.

## Cómo reconstruir los datos

Desde la raíz del paquete:

    Rscript data-raw/DATASET.R

Paquetes necesarios: dplyr, tidyr, stringr, readr, purrr.

## Procedencia de `raw/`

El texto se extrajo en 2021 de <http://legislacion.asamblea.gob.ni> con
`htm2txt::gettxt()` (direcciones en `DATASET.R`, objeto `fuentes`). Los
archivos de `raw/` se generaron el <FECHA> a partir de los datos publicados en
la versión 0.1.0 del paquete (`data/*.rda`), para que la construcción sea
reproducible.

**Aviso:** las páginas en línea ya no coinciden con el texto de 2021. En
noviembre de 2026 las páginas incluían cinco líneas de navegación al inicio, y
varias líneas del texto habían cambiado (1974: 9 de 867; 1987: 56 de 528;
2010: 18 de 665; 2014: 4 de 715). Actualizar `raw/` desde el sitio cambiará los
datos publicados. Hágalo solo de forma intencional, revise las diferencias y
actualice las pruebas en `tests/testthat/test-invariants.R`.
```

Replace `<FECHA>` with today's date in `YYYY-MM-DD` format.

**Verify**: `test -f data-raw/README.md && grep -c 'Rscript data-raw/DATASET.R' data-raw/README.md` → `1`, and `grep -c '<FECHA>' data-raw/README.md` → `0`

### Step 4: Rebuild and prove the output is identical to the shipped data

This step overwrites `data/*.rda` in your working tree. Whatever happens next,
including a failure or STOP partway through, you must run
`git checkout -- data/` before you stop or commit. Step 5 does this on the
success path.

```sh
Rscript data-raw/DATASET.R
```

Expect four `saved data/cons_YYYY.rda` messages. Then compare the regenerated
objects against the committed ones:

```sh
Rscript -e '
for (y in c("1974", "1987", "2010", "2014")) {
  nm <- paste0("cons_", y)
  f  <- file.path("data", paste0(nm, ".rda"))
  committed <- tempfile(fileext = ".rda")
  status <- system2("git", c("show", paste0("HEAD:", f)), stdout = committed)
  stopifnot(status == 0)
  a <- new.env(); b <- new.env()
  load(committed, envir = a); load(f, envir = b)
  cat(y, "identical:", identical(get(nm, a), get(nm, b)), "\n")
}'
```

**Verify**: output is exactly

```
1974 identical: TRUE
1987 identical: TRUE
2010 identical: TRUE
2014 identical: TRUE
```

Then also check the serialization version: `Rscript -e 'con <- xzfile("data/cons_1974.rda", "rb"); cat(readLines(con, n = 1, warn = FALSE), "\n"); close(con)'` → `RDX2`.

### Step 5: Restore the committed `.rda` files

The regenerated files hold identical objects but different bytes. Do not
commit that churn:

```sh
git checkout -- data/
```

**Verify**: `git status --porcelain data/` → no output.

Commit `data-raw/DATASET.R` and `data-raw/README.md` (commit 2).

### Step 6: Package still checks

Only if plan 001 has landed (`grep -c '^Imports' DESCRIPTION` → `0`). Before
001, loading the package for tests aborts on the unused `Imports`, which has
nothing to do with this plan. In that case skip this step and say so in your
report. Step 4 is this plan's real gate.

**Verify**:
- `Rscript -e 'testthat::test_local()'` → `FAIL 0`
- Build + check: `P=$PWD; T=$(mktemp -d) && (cd "$T" && R CMD build "$P" && _R_CHECK_FUTURE_FILE_TIMESTAMPS_=FALSE R CMD check --no-manual constitucionesNic_*.tar.gz)` → `Status: OK`

## Test plan

- The decisive test is Step 4: `identical()` between rebuilt and committed
  objects for all four datasets.
- If plan 003 has landed, its invariant tests (`tests/testthat/test-invariants.R`)
  pin row counts and text fingerprints and must stay green.
- No new testthat tests: `data-raw/` is not part of the package, so package
  tests cannot exercise it.

## Done criteria

ALL must hold:

- [ ] `data-raw/raw/` contains exactly 4 files with 867 / 528 / 665 / 716 lines; line 93 of `cons_2014.txt` is `.`
- [ ] `data-raw/DATASET.R` contains no `htm2txt`, `gettxt`, `usethis`, `tidyverse`, `tidylog`, `zoo`, `tidytext`, `here`
- [ ] Step 4 printed `identical: TRUE` for all four years
- [ ] `git diff --stat "$BASE"..HEAD -- data/` → empty (no `.rda` changes committed)
- [ ] `data-raw/README.md` exists with the date filled in
- [ ] `Rscript -e 'testthat::test_local()'` → `FAIL 0` (only if plan 001 has landed; otherwise state that it was skipped)
- [ ] `git status --porcelain data/` → empty (regenerated `.rda` restored)
- [ ] Changed files ⊆ in-scope list
- [ ] `plans/README.md` status row for 004 updated

## STOP conditions

Stop and report back (do not improvise) if:

- Step 1 line counts differ from 867 / 528 / 665 / 716, or line 93 of `cons_2014.txt` is not `.`.
- Any year prints `identical: FALSE` in Step 4, or `DATASET.R` errors partway.
  Do NOT tweak the cleaning logic until it matches. Capture the `all.equal()`
  output for that year (replace `identical(...)` with
  `all.equal(get(nm, a), get(nm, b))` and re-run the comparison), **then run
  `git checkout -- data/`**, and only then stop and report.
- A required package (`dplyr`, `tidyr`, `stringr`, `readr`, `purrr`) is missing.
  Report it; the operator decides whether to install.
- You feel the need to fetch anything from the internet.

## Maintenance notes

- **From now on, `data-raw/raw/*.txt` is the source of truth for the text.**
  `DATASET.R` is a pure function of those files. Review changes to `raw/` as
  content changes.
- Deferred follow-up: a `data-raw/fetch.R` that refreshes snapshots from the
  live site would need to strip the five navigation lines and the two header
  lines, and it would change the shipped text (see the drift table). It is
  intentionally not part of this plan. Add it only when the maintainer decides
  to update the text, and update `tests/testthat/test-invariants.R` numbers in
  the same change.
- Plan 005 replaces the "Cleaning" section of this script. It relies on the
  "Read snapshots" section and the `for (y in years)` export loop staying as
  written here.
- Reviewer focus: confirm `data/` is untouched in the diff, and that the
  snapshot files are LF-only UTF-8.
