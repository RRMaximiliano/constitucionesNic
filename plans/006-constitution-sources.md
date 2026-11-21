# Plan 006: Register every Nicaraguan constitution and freeze the missing texts as snapshots

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat b834124..HEAD -- data-raw/`
> If anything under `data-raw/` changed since this plan was written, compare
> it with the "Current state" section; on a mismatch, STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW (adds files only; package data is not touched)
- **Depends on**: plans 001–005 (base: branch `advisor/005-fix-structural-parsing` @ `b834124`, or `master` after it is merged)
- **Category**: direction
- **Planned at**: commit `b834124` (tip of `advisor/005-fix-structural-parsing`), 2026-11-20

## Why this matters

The maintainer wants a website that shows every Nicaraguan constitution as a
"git history": one commit per published text, and real diffs between
reformed versions of the same constitution. Today the package holds only 4
texts: 1974, 1987, 2010 and 2014. The Asamblea Nacional's legislation portal
files **25 documents** under the category "Constituciones Políticas de
Nicaragua". Those are 20 full texts (1826 → 2025) and 5 reform laws. This plan
records all 25 in a registry (`data-raw/fuentes.csv`). It also downloads the
16 missing full texts once and freezes them as snapshot files, the same way
plan 004 froze the first four. Plans 007 (parse them into datasets), 008
(compute diffs) and 009 (website) build on this.

Scope decision (made by the maintainer): **published texts only**. The
timeline shows original constitutions and the official consolidated texts the
Asamblea published. Reform laws appear as linked events. Nobody reconstructs
intermediate texts by applying amendments by hand.

## Current state

- `data-raw/raw/` holds 4 frozen snapshots: `cons_1974.txt` (867 lines),
  `cons_1987.txt` (528), `cons_2010.txt` (665), `cons_2014.txt` (716). They
  come from a 2021 scrape and **must not change** (`data-raw/README.md`
  explains why: the live pages have drifted since).
- `data-raw/DATASET.R` builds the package data offline from those snapshots.
  This plan does not touch it.
- `data-raw/README.md` documents the snapshots (Spanish).
- The advisor ran the exact script and registry below against the live portal
  on 2026-11-20. It downloaded the 16 texts and they matched the advisor's
  independent prototype byte for byte.

How the portal works (verified):
- Each document has a 32-hex-character `document_id`. Its page is
  `http://legislacion.asamblea.gob.ni/Normaweb.nsf/xpNorma.xsp?documentId=<id>&action=openDocument`.
- `htm2txt::gettxt(url)` returns the page as text. It marks its result with
  the encoding `"bytes"`, so the script re-marks it as UTF-8 before any string
  function.
- Every page starts with 4 or 5 navigation lines ("Legislación de
  Nicaragua", "Normas Jurídicas", optionally "Publicación oficial", "Enlace a
  Legislación Relacionada", and "Ver enlace a última versión de Texto
  Publicado" or a line beginning "Última Versión de Texto Publicado"). The
  script strips them.

## Commands you will need

Run from the package root.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Temp library with htm2txt | `export R_LIBS="$(mktemp -d)" && Rscript -e 'install.packages("htm2txt", lib = Sys.getenv("R_LIBS"), repos = "https://cloud.r-project.org")'` | `Rscript -e 'library(htm2txt)'` exits 0 |
| Fetch | `Rscript data-raw/fetch_sources.R` (same shell, so `R_LIBS` is set) | 4 `exists, skipped` and 16 `saved …` messages |
| Tests | `Rscript -e 'testthat::test_local()'` | `FAIL 0` |

`htm2txt` is installed into a **throwaway library** (`R_LIBS`), not the
user's R library. It is needed only for this one download. Network access is
required for the install and the fetch.

## Scope

**In scope**:
- `data-raw/fuentes.csv` (create)
- `data-raw/fetch_sources.R` (create)
- `data-raw/raw/cons_<id>.txt` for the 16 new ids (created by the script)
- `data-raw/README.md` (append one section)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):
- `data-raw/raw/cons_1974.txt`, `cons_1987.txt`, `cons_2010.txt`, `cons_2014.txt` — frozen; must be byte-identical afterwards.
- `data-raw/DATASET.R`, `data/`, `R/`, `man/`, `tests/`, `DESCRIPTION` — plan 007 handles parsing and package data.
- Downloading the reform laws' texts — they are registry entries only (`snapshot = FALSE`).

## Git workflow

- Pre-flight: `git status --porcelain --untracked-files=no` must print nothing; otherwise STOP. Then `BASE=$(git rev-parse HEAD)`.
- Branch: `advisor/006-constitution-sources` (from the base above).
- Commits (repo style: short lowercase, optional gitmoji, e.g. `:pencil: added appveyor.`):
  1. `:card_file_box: added registry of all constitutions and fetch script`
  2. `:card_file_box: froze snapshots of 16 more constitutional texts`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `data-raw/fuentes.csv`

Create it with exactly this content: UTF-8, LF line endings, 26 lines
(header + 25 rows). Column meanings: `tipo` is one of `constitucion`,
`texto_consolidado`, `proyecto`, `non_nata`, `preliminar`, `federal`,
`ley_reforma`. `linea` is `principal` for texts that were in force and for
reform laws, and `alterna` for drafts, never-in-force texts and the federal
constitution. `familia` is the `id` of the original constitution a text
belongs to. Dates are ISO `YYYY-MM-DD`; empty means unknown. `snapshot` says
whether the full text is downloaded.

```csv
id,nombre,tipo,linea,familia,fecha_aprobacion,fecha_publicacion,publicacion,document_id,snapshot,nota
1826,Constitución del Estado de Nicaragua,constitucion,principal,1826,1826-04-08,1861-04-30,Colección Documental Jesús de la Rocha,1369E24CCB70766E062588F0006E7035,TRUE,Constitución de Estado dentro de la Federación Centroamericana
1838,Constitución Política de 1838,constitucion,principal,1838,1838-11-12,1861-04-30,Colección Documental Jesús de la Rocha,91809802EEC04EA5062572A50078EA52,TRUE,
1854-proyecto,Proyecto de Constitución Política de 1854,proyecto,alterna,1854-proyecto,,1854-04-30,,C62AD4FAC36D6F1C06257307006D6CDF,TRUE,Proyecto; no entró en vigor
1858,Constitución Política de 1858,constitucion,principal,1858,1858-08-19,1864-01-01,,6828F700B34F27CF062588F00071F044,TRUE,Fecha de publicación aproximada según el portal
1894,Constitución Política de 1893 (La Libérrima),constitucion,principal,1894,1893-12-10,1894-01-06,La Gaceta N° 2,182AE7D99C5CA8E106257307006E3626,TRUE,
1898-federal,Constitución Política de los Estados Unidos de Centro América,federal,alterna,1898-federal,1898-08-27,1898-10-16,Diario Oficial N° 602-606,A71684068857B77206257307006E8341,TRUE,Constitución federal centroamericana
1905,Constitución Política de 1905,constitucion,principal,1905,1905-03-30,1905-03-30,,9946ED7DA0D34E8706257307006EA693,TRUE,
1912,Constitución Política de 1911,constitucion,principal,1912,1911-11-10,1912-01-17,La Gaceta Oficial N° 13,30391FFF329EC15E06257307006F08B0,TRUE,
1913-non-nata,Constitución "non nata" de 1913,non_nata,alterna,1913-non-nata,,1913-04-03,,C1FB09EA58AAA01B06257307006F2D25,TRUE,Nunca entró en vigor
1939,Constitución Política de 1939,constitucion,principal,1939,1939-03-22,1939-03-23,La Gaceta N° 68,554FC9EB8CBA463D06257307006F438D,TRUE,
1948,Constitución Política de 1948,constitucion,principal,1948,1948-01-21,1948-01-22,La Gaceta N° 16,06C0DB3B7BCFC75706257307006F6C6D,TRUE,
1950,Constitución Política de 1950,constitucion,principal,1950,1950-11-01,1950-11-06,La Gaceta N° 235,74E111DAD8B739200625730700701BA2,TRUE,
1974,Constitución Política de 1974,constitucion,principal,1974,1974-03-14,1974-04-24,La Gaceta N° 89,1D6EDDB20A766BCD062573080055146A,TRUE,Texto congelado de 2021 (ver README)
1987,Constitución Política de 1987,constitucion,principal,1987,1986-11-19,1987-01-09,La Gaceta N° 5,8339762D0F427A1C062573080055FA46,TRUE,Texto congelado de 2021 (ver README)
2010,Texto con reformas incorporadas (2010),texto_consolidado,principal,1987,2010-09-16,2010-09-16,La Gaceta N° 176,750E20D0698FEB21062577C2006A3D0A,TRUE,Texto congelado de 2021 (ver README)
2014,Texto con reformas incorporadas (2014),texto_consolidado,principal,1987,2014-02-10,2014-02-18,La Gaceta N° 32,C93CBD0FF408D07306257C8C004F6953,TRUE,Texto congelado de 2021 (ver README)
2022,Texto consolidado (2022),texto_consolidado,principal,1987,2021-10-27,2022-09-28,La Gaceta N° 181,799683A327E172CD062589E300549408,TRUE,Digesto Jurídico de la materia constitucional (Ley N° 1091)
2024,Texto consolidado (2024),texto_consolidado,principal,1987,2024-03-13,2024-08-30,,51A99B32B259856106258B8C00742382,TRUE,
2024-preliminar,Texto íntegro preliminar (2024),preliminar,alterna,1987,,2024-11-25,La Gaceta N° 218,85B89C89333562CC06258BE2005E5C65,TRUE,Reforma aprobada en primera legislatura; no vigente
2025,Texto íntegro (2025),texto_consolidado,principal,1987,2025-01-30,2025-02-18,La Gaceta N° 32,76AEDE617857465D06258C360052B2E4,TRUE,Incorpora la Ley N° 1234
ley-1234,"Ley N° 1234, de Reforma Parcial a la Constitución Política",ley_reforma,principal,1987,2025-01-30,2025-02-18,La Gaceta N° 32,2798FEE6DACD52B506258C360051E856,FALSE,Incorporada en el texto íntegro de 2025
ley-1268,"Ley N° 1268, de Reforma Parcial a los Artículos 23 y 25",ley_reforma,principal,1987,2026-01-14,2026-01-16,La Gaceta N° 9,0A8606CDF5AC451F06258D5C005CBEE8,FALSE,Sin texto consolidado publicado
ley-1269,"Ley N° 1269, de Reforma a los Artículos 132, 159 y 160",ley_reforma,principal,1987,,2026-01-16,,1C542C6C8834FF1206258D5C007918C4,FALSE,Sin texto consolidado publicado
ley-1270,"Ley N° 1270, de Reforma Parcial al Artículo 125",ley_reforma,principal,1987,,2026-01-19,,F3E19EB1F057532B06258D5C005C0CE6,FALSE,Sin texto consolidado publicado
ley-1271,"Ley N° 1271, de Reforma Parcial al Artículo 118",ley_reforma,principal,1987,,2026-01-19,,2070D3F189509FC106258D5C005C3CB6,FALSE,Sin texto consolidado publicado
```

Copy it mechanically from this plan file (e.g. with a python/awk slice
between the fence lines). Do not retype: accents and quotes must survive.

**Verify**:
- `wc -l < data-raw/fuentes.csv` → `26`
- `Rscript -e 'f <- read.csv("data-raw/fuentes.csv", encoding = "UTF-8", colClasses = "character"); stopifnot(nrow(f) == 25, ncol(f) == 11, !anyDuplicated(f$id), sum(f$snapshot == "TRUE") == 20, all(nchar(f$document_id) == 32)); cat("ok\n")'` → `ok`

### Step 2: Create `data-raw/fetch_sources.R`

Create it with exactly this content (copy mechanically; it contains
non-ASCII characters and a `\u00a0` escape that must stay as written):

```r
## Downloads the texts listed in data-raw/fuentes.csv (snapshot == TRUE) from
## the Asamblea Nacional legislation portal into data-raw/raw/cons_<id>.txt.
##
## Existing snapshot files are NEVER overwritten: the 1974, 1987, 2010 and 2014
## snapshots are frozen from the 2021 scrape (see data-raw/README.md). To refresh
## a text on purpose, delete its file first and review the diff afterwards.
##
## Needs network access and the htm2txt package. Run from the package root:
##   Rscript data-raw/fetch_sources.R

library(htm2txt)

fuentes <- read.csv("data-raw/fuentes.csv", encoding = "UTF-8",
                    stringsAsFactors = FALSE, colClasses = "character")

# Navigation lines the portal prepends to every page (4 or 5 of them).
chrome <- c("Legislación de Nicaragua", "Normas Jurídicas", "Publicación oficial",
            "Enlace a Legislación Relacionada",
            "Ver enlace a última versión de Texto Publicado")
is_chrome <- function(l) l %in% chrome | startsWith(l, "Última Versión de Texto Publicado")

for (k in seq_len(nrow(fuentes))) {
  f <- fuentes[k, ]
  if (f$snapshot != "TRUE") next
  path <- file.path("data-raw", "raw", paste0("cons_", f$id, ".txt"))
  if (file.exists(path)) {
    message("exists, skipped: ", path)
    next
  }
  url <- sprintf(
    "http://legislacion.asamblea.gob.ni/Normaweb.nsf/xpNorma.xsp?documentId=%s&action=openDocument",
    f$document_id
  )
  txt <- gettxt(url)
  Encoding(txt) <- "UTF-8"   # gettxt() marks its result as "bytes"
  lines <- strsplit(txt, "\n", fixed = TRUE)[[1]]
  lines <- trimws(lines, whitespace = "[[:space:]\u00a0]")
  lines <- lines[lines != ""]
  i <- 1
  while (i <= length(lines) && is_chrome(lines[i])) i <- i + 1
  lines <- lines[i:length(lines)]
  if (length(lines) < 100) stop("Suspiciously short text for ", f$id, ": ", length(lines), " lines")
  con <- file(path, open = "wb")
  writeLines(enc2utf8(lines), con, sep = "\n", useBytes = TRUE)
  close(con)
  message("saved ", path, " (", length(lines), " lines)")
  Sys.sleep(1.5)
}
```

**Verify**: `Rscript -e 'invisible(parse("data-raw/fetch_sources.R")); cat("ok\n")'` → `ok`

Commit 1 (`fuentes.csv`, `fetch_sources.R`).

### Step 3: Download the 16 missing texts

Record checksums of the 4 frozen snapshots first:

```sh
shasum data-raw/raw/cons_1974.txt data-raw/raw/cons_1987.txt data-raw/raw/cons_2010.txt data-raw/raw/cons_2014.txt > /tmp/frozen.sha
```

Then set up the throwaway library and run the script (see the Commands table;
same shell session). It sleeps 1.5 s between requests, about 30 s in total.

**Verify**:
- `shasum -c /tmp/frozen.sha` → all four `OK` (frozen snapshots untouched)
- `ls data-raw/raw/*.txt | wc -l` → `20`
- `wc -l data-raw/raw/cons_*.txt` matches exactly:

```
  318 data-raw/raw/cons_1826.txt
  399 data-raw/raw/cons_1838.txt
  288 data-raw/raw/cons_1854-proyecto.txt
  300 data-raw/raw/cons_1858.txt
  341 data-raw/raw/cons_1894.txt
  397 data-raw/raw/cons_1898-federal.txt
  301 data-raw/raw/cons_1905.txt
  472 data-raw/raw/cons_1912.txt
  422 data-raw/raw/cons_1913-non-nata.txt
  807 data-raw/raw/cons_1939.txt
  681 data-raw/raw/cons_1948.txt
  772 data-raw/raw/cons_1950.txt
  867 data-raw/raw/cons_1974.txt
  528 data-raw/raw/cons_1987.txt
  665 data-raw/raw/cons_2010.txt
  716 data-raw/raw/cons_2014.txt
  721 data-raw/raw/cons_2022.txt
  553 data-raw/raw/cons_2024-preliminar.txt
  726 data-raw/raw/cons_2024.txt
  552 data-raw/raw/cons_2025.txt
```

- `file data-raw/raw/*.txt` → every file `UTF-8` (or `ASCII`) text, none with `CRLF`
- `head -1 data-raw/raw/cons_1838.txt` → `CONSTITUCIÓN POLÍTICA EMITIDA EL 12 DE NOVIEMBRE DE 1838`
- `head -1 data-raw/raw/cons_2025.txt` → `TEXTO ÍNTEGRO DE LA CONSTITUCIÓN POLÍTICA DE LA REPÚBLICA DE NICARAGUA`
- `grep -l '^Legislación de Nicaragua$' data-raw/raw/*.txt` → no output (navigation stripped)

### Step 4: Document the new snapshots

Append this section to the end of `data-raw/README.md` (keep everything
already there):

```markdown
## Textos agregados en noviembre de 2026

`fuentes.csv` registra los 25 documentos de la categoría "Constituciones
Políticas de Nicaragua" del portal (consultada el 2026-11-20): 20 textos
completos y 5 leyes de reforma. `fetch_sources.R` descargó los 16 textos que
faltaban en `raw/` (todos menos 1974, 1987, 2010 y 2014, que siguen siendo los
de 2021). El script nunca sobrescribe un archivo existente.

Para descargar de nuevo los textos que falten:

    Rscript data-raw/fetch_sources.R

Requiere internet y el paquete htm2txt.
```

**Verify**: `grep -c 'fetch_sources.R' data-raw/README.md` → at least `1`.

Commit 2 (the 16 new snapshot files and `data-raw/README.md`).

### Step 5: Package unaffected

**Verify**: `Rscript -e 'testthat::test_local()'` → `FAIL 0` (same count as before this plan); `git diff --stat "$BASE" -- data/ R/ man/ tests/ DESCRIPTION data-raw/DATASET.R` → empty.

## Test plan

No package tests change: nothing in the package reads these files yet (plan
007 does). The verification is structural: registry shape (Step 1), exact
line counts and first lines per snapshot (Step 3), frozen files unchanged
(checksums).

## Done criteria

ALL must hold:

- [ ] `data-raw/fuentes.csv` has 25 data rows and passes the Step 1 check
- [ ] `data-raw/raw/` has 20 files; the 16 new ones match the line counts in Step 3
- [ ] `shasum -c /tmp/frozen.sha` → 4 × OK
- [ ] No navigation lines left (`grep -l '^Legislación de Nicaragua$' data-raw/raw/*.txt` → empty)
- [ ] `git diff --name-only "$BASE"..HEAD` ⊆ in-scope list
- [ ] `htm2txt` was installed only into the temp `R_LIBS` (`Rscript --vanilla -e 'cat(requireNamespace("htm2txt", quietly=TRUE))'` in a new shell without `R_LIBS` prints `FALSE` if it wasn't installed there before)
- [ ] `plans/README.md` status row for 006 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The portal is unreachable, or any download errors or is shorter than 100 lines (the script stops itself).
- Any line count differs from the Step 3 table. The live page has changed since 2026-11-20. Report the file names and both counts. Do not adjust the table, and do not commit the changed file.
- A frozen snapshot's checksum changes.
- `install.packages("htm2txt")` fails (CRAN unreachable, or the package is archived).

## Maintenance notes

- `fuentes.csv` is the registry for everything downstream (datasets, website
  timeline). When the Asamblea publishes a new consolidated text (e.g. one
  incorporating the January 2026 reforms, Leyes 1268–1271), add a row with
  `snapshot = TRUE`, run `fetch_sources.R`, and update the expected numbers
  in plan 007's tests.
- The portal's category listing that this registry mirrors:
  `http://legislacion.asamblea.gob.ni/normaweb.nsf/9e314815a08d4a6206257265005d21f9?OpenView&RestrictToCategory=Constituciones%20Pol%C3%ADticas%20de%20Nicaragua&Count=100&ExpandView`
- Dates in the portal's listing are `MM/DD/YYYY`. The registry uses the
  approval and publication dates printed at the top of each text where
  available. 1858's publication date (1864-01-01) is the portal's approximate one.
- Reviewer focus: the 4 frozen snapshots are byte-identical; snapshot files are LF-only UTF-8.
