# Plan 003: Add invariant tests that pin the shipped datasets' content and article structure

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2f6ba42..HEAD -- data/ tests/`
> If anything under `data/` or `tests/` changed since this plan was written,
> STOP: the expected numbers below were measured on the data at `2f6ba42`.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-remove-unused-imports.md (**hard**: until 001 lands, `testthat::test_local()` aborts while loading the package unless the unused `Imports` `htm2txt` and `here` happen to be installed)
- **Category**: tests
- **Planned at**: commit `2f6ba42`, 2026-11-20

## Why this matters

The package exists to ship four datasets: `cons_1974`, `cons_1987`,
`cons_2010` and `cons_2014`. Each holds the full text of one Nicaraguan
constitution, one row per line. The only tests today check column names.
Nothing would catch dropped rows, altered text, a broken article sequence, or
a type change. Plan 005 will rewrite the parsing that derives the structural
columns (`titulo`, `cap`, `art`, `tema`). These tests are its safety net. They
pin properties that must stay **true both before and after** plan 005: the
text is unchanged, and every article appears exactly once and in order. That
way a refactor that silently loses or corrupts text fails loudly.

## Current state

- `tests/testthat.R` — standard testthat runner (do not modify):

```r
library(testthat)
library(constitucionesNic)

test_check("constitucionesNic")
```

- `tests/testthat/test-data.R` — the existing tests. Pattern to follow (one
  `test_that()` per dataset, datasets referenced by name):

```r
## Testing the datasets to see if they are as expected
library(constitucionesNic)

## constitucion de 1974
test_that("cons_1974 conforms to spec", {
  cons_1974_colnames <- c("year", "line", "text", "titulo", "cap", "art", "tema")
  expect_equal(colnames(cons_1974), cons_1974_colnames)
})
## ... same block repeated for cons_1987, cons_2010, cons_2014
```

- `DESCRIPTION` has `Config/testthat/edition: 3` and `Suggests: testthat (>= 3.0.0)`.
- The datasets (lazy-loaded from `data/*.rda`) are tibbles with columns
  `year <chr>`, `line <int>`, `text <chr>`, `titulo <chr>`, `cap <chr>`,
  `art <chr>`, `tema <chr>`. `art` holds the article number as a **string**
  (e.g. `"15"`), or `NA`.
- Facts measured at `2f6ba42`. The tests pin these exact values:

| dataset | rows | `sum(nchar(text))` | articles (distinct `art`) | `line` notes |
|---|---|---|---|---|
| `cons_1974` | 867 | 148651 | 1..343, contiguous | `1..867` |
| `cons_1987` | 528 | 71415 | 1..202, contiguous | `1..528` |
| `cons_2010` | 665 | 119745 | 1..202, contiguous | `1..665` |
| `cons_2014` | 715 | 136256 | 1..202, contiguous | `1..716` with **one gap at 93** (a `"."` line was removed after numbering; this is expected) |

- Article-start lines begin with `Arto.` (1974, 1987, 2010) or `Artículo`
  (2014), followed by optional whitespace and the number, e.g.
  `Arto. 1.- Nicaragua es...`, `Arto. 6 Nicaragua es...`,
  `Artículo 15. Los nicaragüenses...`.
- In every dataset the first row's `titulo` is `"PREÁMBULO"`.

**Why the tests must be written type-agnostically:** plan 005 changes `year`
and `art` from character to integer. Every comparison below therefore goes
through `as.integer()` / `as.character()`, so these tests pass against both
the current data and plan 005's output. Do **not** assert column types or
column names in the new tests. The existing column-name tests stay as they are
(plan 005 updates them).

**Non-ASCII in test code:** write non-ASCII characters as `\u` escapes
(`"Art\u00edculo"`, `"PRE\u00c1MBULO"`) so the test file is pure ASCII. This
avoids encoding problems on Windows CI.

## Commands you will need

Run from the package root.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Tests | `Rscript -e 'testthat::test_local()'` | `FAIL 0`, `WARN 0`, `SKIP 0` |
| One file | `Rscript -e 'testthat::test_local(filter = "invariants")'` | `FAIL 0` |
| Build + check | `P=$PWD; T=$(mktemp -d) && (cd "$T" && R CMD build "$P" && _R_CHECK_FUTURE_FILE_TIMESTAMPS_=FALSE R CMD check --no-manual constitucionesNic_*.tar.gz)` | ends with `Status: OK` |
| ASCII check | `LC_ALL=C grep -n '[^ -~]' tests/testthat/test-invariants.R` | no output |

`grep -c` prints a count; when the expected count is `0`, grep also exits with status 1. That is normal. Judge by the printed number, not the exit status.

## Scope

**In scope**:
- `tests/testthat/test-invariants.R` (create)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):
- `tests/testthat/test-data.R` — keep the existing column-name tests unchanged. Plan 005 owns them.
- `tests/testthat.R`
- `data/*.rda` — never regenerate or edit data in this plan. If a test fails,
  the test is wrong (or the data drifted): STOP, do not "fix" the data.
- `DESCRIPTION` — no new dependencies. Use only base R and testthat. Do not use
  `dplyr`, `stringr`, or `digest`.

## Git workflow

- Pre-flight: `git status --porcelain --untracked-files=no` must print nothing; otherwise STOP. Then record the starting commit with `BASE=$(git rev-parse HEAD)`. The scope checks below compare against `"$BASE"`.
- Branch: `advisor/003-data-invariant-tests`
- One commit, repo style (short, lowercase, optional gitmoji; e.g. `:pencil: added appveyor.`):
  `:white_check_mark: added invariant tests for constitution datasets`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create `tests/testthat/test-invariants.R`

Create the file with exactly this content:

```r
## Invariants that must hold for every constitution dataset.
## These are written to be independent of column types (year/art may be
## character or integer) so they survive changes to the parsing in data-raw/.

datasets <- list(
  "1974" = cons_1974,
  "1987" = cons_1987,
  "2010" = cons_2010,
  "2014" = cons_2014
)

expected <- list(
  "1974" = list(n_rows = 867L, n_chars = 148651L, n_art = 343L),
  "1987" = list(n_rows = 528L, n_chars = 71415L,  n_art = 202L),
  "2010" = list(n_rows = 665L, n_chars = 119745L, n_art = 202L),
  "2014" = list(n_rows = 715L, n_chars = 136256L, n_art = 202L)
)

article_re <- "^(Art\u00edculo|Arto\\.)\\s*([0-9]+)"

for (y in names(datasets)) {
  d <- datasets[[y]]
  e <- expected[[y]]

  test_that(paste0("cons_", y, " is a non-empty data frame with the expected row count"), {
    expect_s3_class(d, "data.frame")
    expect_identical(nrow(d), e$n_rows)
  })

  test_that(paste0("cons_", y, " text is complete and unchanged"), {
    expect_false(anyNA(d$text))
    expect_false(any(d$text == ""))
    expect_false(any(d$text == "."))
    expect_identical(d$text, trimws(d$text))
    expect_identical(sum(nchar(d$text)), e$n_chars)
  })

  test_that(paste0("cons_", y, " has a single year and strictly increasing line numbers"), {
    expect_identical(unique(as.character(d$year)), y)
    expect_false(anyNA(d$line))
    expect_true(all(diff(as.integer(d$line)) > 0))
  })

  test_that(paste0("cons_", y, " contains every article exactly once, in order"), {
    art <- as.integer(d$art)
    present <- sort(unique(art[!is.na(art)]))
    expect_identical(present, seq_len(e$n_art))
    # Article numbers never decrease going down the text.
    expect_false(is.unsorted(art[!is.na(art)]))
  })

  test_that(paste0("cons_", y, " assigns each article-start line its own number"), {
    m <- regmatches(d$text, regexec(article_re, d$text))
    starts <- vapply(m, function(x) if (length(x) == 3) x[3] else NA_character_, character(1))
    is_start <- !is.na(starts)
    expect_identical(sum(is_start), e$n_art)
    expect_identical(as.integer(d$art[is_start]), as.integer(starts[is_start]))
  })

  test_that(paste0("cons_", y, " starts with the preamble"), {
    expect_identical(d$titulo[1], "PRE\u00c1MBULO")
  })
}
```

Notes for the executor:
- `cons_1974` etc. are lazy-loaded package data. `testthat::test_local()` and
  `R CMD check` both make them available by name, the same way the existing
  `test-data.R` uses them.
- `sum(nchar(...))` returns an integer, and the expected values are written
  with an `L` suffix, so `expect_identical` compares integer to integer.

**Verify**:
- `LC_ALL=C grep -n '[^ -~]' tests/testthat/test-invariants.R` → no output (file is pure ASCII)
- `Rscript -e 'testthat::test_local(filter = "invariants")'` → `FAIL 0 | WARN 0 | SKIP 0 | PASS 60`
  (15 expectations × 4 datasets). If the PASS count differs but FAIL is 0, record the actual number in your report. That is fine.

### Step 2: Run the whole suite and the package check

**Verify**:
- `Rscript -e 'testthat::test_local()'` → `FAIL 0`
- Build + check command → ends with `Status: OK`. If you see a missing-`Imports` ERROR (`htm2txt`, `here`), plan 001 has not landed: STOP.

### Step 3: Prove the tests can fail (sanity check, no commit)

Temporarily change one expected value, e.g. `n_chars = 148651L` → `148650L`,
then run `Rscript -e 'testthat::test_local(filter = "invariants")'`.

**Verify**: exactly 1 failure, in "cons_1974 text is complete and
unchanged". Then **revert the change** and re-run → `FAIL 0`. The new file is
untracked until you commit, so `git diff` will not show it. Instead:
- `grep -c '148651L' tests/testthat/test-invariants.R` → `1` (the revert took effect)
- `git status --short` → exactly one line: `?? tests/testthat/test-invariants.R` (plus `plans/README.md` if you already updated it)

## Test plan

This plan *is* the test plan: 6 `test_that` blocks × 4 datasets = 24 tests. They cover:
- row count (catches dropped or duplicated rows),
- text fingerprint `sum(nchar(text))` (total character count) plus no empty, `"."`, or whitespace-padded lines. This catches dropped, added or re-scraped text. It cannot catch a same-length substitution, so plans that regenerate data must add an exact `identical(old$text, new$text)` gate (plan 005 does),
- single year value and strictly increasing `line` (catches row reordering; tolerates the known gap at 2014 line 93; does not catch a renumbering that stays increasing),
- articles 1..N present, contiguous, monotonic (catches parser losing or mis-numbering articles),
- each article-start line carries its own article number,
- the first row is the preamble.

Pattern source: `tests/testthat/test-data.R` (direct references to the datasets, testthat 3rd edition).

## Done criteria

ALL must hold:

- [ ] `tests/testthat/test-invariants.R` exists and is pure ASCII
- [ ] `Rscript -e 'testthat::test_local()'` → `FAIL 0`, `WARN 0`
- [ ] Step 3 sanity check was performed and reverted (report it)
- [ ] `git diff --name-only "$BASE"..HEAD -- . ':!plans'` → only `tests/testthat/test-invariants.R`
- [ ] `plans/README.md` status row for 003 updated

## STOP conditions

Stop and report back (do not improvise) if:

- Any invariant fails against the **unchanged** data. The table in "Current
  state" was measured at `2f6ba42`. A failure means the data or the
  environment differs (e.g. the data was regenerated). Report which test and
  the actual value. Do NOT edit the expected numbers to make it pass, and do
  NOT touch `data/`.
- `cons_1974` (etc.) is not found when tests run. This indicates a packaging
  or LazyData problem outside this plan's scope.
- You find yourself wanting to add a dependency (dplyr, stringr, digest) to `DESCRIPTION`.

## Maintenance notes

- **These numbers are a deliberate tripwire.** If the maintainer intentionally
  changes the text, for example by re-scraping the Asamblea Nacional site (the
  live pages have drifted since 2021, see `data-raw/README.md` once plan 004
  lands), the `n_rows`/`n_chars` values must be updated **in the same
  commit**, and the reviewer should confirm the text change was intended.
- Plan 005 (parser fix) must keep every test in this file green without
  editing it. If 005 needs to change this file, that is a red flag worth
  questioning in review.
- When a new constitution dataset is added (e.g. a post-2014 version), add it
  to both `datasets` and `expected`.
