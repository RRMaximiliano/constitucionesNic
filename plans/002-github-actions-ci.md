# Plan 002: Replace defunct Travis CI / AppVeyor with a GitHub Actions `R CMD check`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2f6ba42..HEAD -- .travis.yml appveyor.yml .Rbuildignore README.Rmd README.md .github`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts below against the live files; on a mismatch, treat
> it as a STOP condition. (Plan 001 appends `^plans$` to `.Rbuildignore` and
> edits `DESCRIPTION`. Accept exactly that change, and compare the result
> with the post-001 `.Rbuildignore` excerpt below.)

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-remove-unused-imports.md (CI would fail with an ERROR until 001 lands)
- **Category**: dx
- **Planned at**: commit `2f6ba42`, 2026-11-20

## Why this matters

The repo has two CI configurations and neither runs any more. `.travis.yml`
targets Travis CI, which stopped free builds for open-source projects in
2020–21. `appveyor.yml` relies on the `r-appveyor` bootstrap
(`travis-tool.sh`), downloads an unpinned script over plain HTTP, and has not
been maintained. The README badges point at both services, so visitors see
broken or stale status. Without working CI, nothing checks the data changes
made by later plans (003–005). The standard replacement for R packages is the
`r-lib/actions` GitHub Actions workflow, which runs `R CMD check` on Linux,
macOS and Windows. Windows replaces what AppVeyor used to cover.

## Current state

- `.travis.yml` (entire file):

```yaml
# R for travis: see documentation at https://docs.travis-ci.com/user/languages/r

language: R
cache: packages
```

- `appveyor.yml` — 52-line r-appveyor config. Its `init:` section runs
  `Invoke-WebRequest http://raw.github.com/krlmlr/r-appveyor/master/scripts/appveyor-tool.ps1`.
  Delete the whole file; nothing else references it apart from the README badge
  and `.Rbuildignore`.

- `.Rbuildignore` (entire file after plan 001, which appended `^plans$`):

```
^.*\.Rproj$
^\.Rproj\.user$
^README\.Rmd$
^data-raw$
^\.travis\.yml$
^appveyor\.yml$
^plans$
```

- `README.Rmd` lines 18–21 (the source of `README.md`):

```
<!-- badges: start -->
[![Travis build status](https://travis-ci.com/RRMaximiliano/constitucionesNic.svg?branch=master)](https://travis-ci.com/RRMaximiliano/constitucionesNic)
[![AppVeyor build status](https://ci.appveyor.com/api/projects/status/github/RRMaximiliano/constitucionesNic?branch=master&svg=true)](https://ci.appveyor.com/project/RRMaximiliano/constitucionesNic)
<!-- badges: end -->
```

- `README.md` lines 6–12 (generated from `README.Rmd`; pandoc wrapped the badge alt text):

```
<!-- badges: start -->

[![Travis build
status](https://travis-ci.com/RRMaximiliano/constitucionesNic.svg?branch=master)](https://travis-ci.com/RRMaximiliano/constitucionesNic)
[![AppVeyor build
status](https://ci.appveyor.com/api/projects/status/github/RRMaximiliano/constitucionesNic?branch=master&svg=true)](https://ci.appveyor.com/project/RRMaximiliano/constitucionesNic)
<!-- badges: end -->
```

- The default branch is `master`. The GitHub repo is `RRMaximiliano/constitucionesNic` and is public.
- There is no `.github/` directory yet.

## Commands you will need

Run from the package root.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Validate workflow YAML parses | `Rscript -e 'y <- yaml::read_yaml(".github/workflows/R-CMD-check.yaml"); stopifnot(!is.null(y$jobs[["R-CMD-check"]])); cat("ok\n")'` | prints `ok` |
| Optional lint (only if installed) | `actionlint .github/workflows/R-CMD-check.yaml` | exit 0, no output |
| Build + check locally | `P=$PWD; T=$(mktemp -d) && (cd "$T" && R CMD build "$P" && _R_CHECK_FUTURE_FILE_TIMESTAMPS_=FALSE R CMD check --no-manual constitucionesNic_*.tar.gz)` | ends with `Status: OK` |

`grep -c` prints a count; when the expected count is `0`, grep also exits with status 1. That is normal. Judge by the printed number, not the exit status.

## Scope

**In scope**:
- `.github/workflows/R-CMD-check.yaml` (create)
- `.travis.yml` (delete)
- `appveyor.yml` (delete)
- `.Rbuildignore`
- `README.Rmd` (badge block only)
- `README.md` (badge block only)
- `plans/README.md` (status row only)

**Out of scope** (do NOT touch):
- Everything else in `README.Rmd` / `README.md` (variable list, examples,
  typos). Plan 005 rewrites those sections. Do **not** re-knit `README.md`
  with `rmarkdown::render()` in this plan: re-knitting would regenerate the
  example output and produce a large unrelated diff. Edit the badge lines by hand.
- `DESCRIPTION`, `data/`, `data-raw/`, `R/`, `man/`, `tests/`.
- Adding coverage (codecov), pkgdown, or lint workflows — not requested.

## Git workflow

- Pre-flight: `git status --porcelain --untracked-files=no` must print nothing; otherwise STOP. Then record the starting commit with `BASE=$(git rev-parse HEAD)`. The scope checks below compare against `"$BASE"`.
- Branch: `advisor/002-github-actions-ci`
- One commit. Repo style is short lowercase messages, optionally with a gitmoji
  (e.g. `:pencil: added appveyor.`). Use:
  `:construction_worker: replaced travis and appveyor with github actions`
- Do NOT push or open a PR unless the operator instructed it. The workflow can
  only be proven green on GitHub, and that is the operator's step (see Test plan).
  Note the triggers: the workflow runs on pushes to `main`/`master` and on pull
  requests. Pushing only the `advisor/002-github-actions-ci` branch triggers
  **nothing**. The operator must open a PR from it (or merge it to `master`).

## Steps

### Step 1: Create the workflow

Create `.github/workflows/R-CMD-check.yaml` with exactly this content. It is
the `r-lib/actions` "check-standard" example trimmed to three OSes and without
vignette build arguments (the package has no vignettes):

```yaml
# Based on https://github.com/r-lib/actions/tree/v2/examples (check-standard)
on:
  push:
    branches: [main, master]
  pull_request:

name: R-CMD-check

permissions: read-all

jobs:
  R-CMD-check:
    runs-on: ${{ matrix.config.os }}

    name: ${{ matrix.config.os }} (${{ matrix.config.r }})

    strategy:
      fail-fast: false
      matrix:
        config:
          - {os: ubuntu-latest,  r: 'release'}
          - {os: macos-latest,   r: 'release'}
          - {os: windows-latest, r: 'release'}

    env:
      GITHUB_PAT: ${{ secrets.GITHUB_TOKEN }}
      R_KEEP_PKG_SOURCE: yes

    steps:
      - uses: actions/checkout@v4

      - uses: r-lib/actions/setup-pandoc@v2

      - uses: r-lib/actions/setup-r@v2
        with:
          r-version: ${{ matrix.config.r }}
          use-public-rspm: true

      - uses: r-lib/actions/setup-r-dependencies@v2
        with:
          extra-packages: any::rcmdcheck
          needs: check

      - uses: r-lib/actions/check-r-package@v2
        with:
          upload-snapshots: true
```

Use spaces, not tabs. Use LF line endings.

**Verify**: the "Validate workflow YAML parses" command prints `ok`. If
`actionlint` is installed, it exits 0. If it is not installed, skip it and say
so in your report.

### Step 2: Delete the old CI files

```sh
git rm .travis.yml appveyor.yml
```

**Verify**: `ls .travis.yml appveyor.yml 2>&1` reports both as missing.

### Step 3: Update `.Rbuildignore`

Remove the two lines `^\.travis\.yml$` and `^appveyor\.yml$`, and add `^\.github$`.
The resulting file must be exactly:

```
^.*\.Rproj$
^\.Rproj\.user$
^README\.Rmd$
^data-raw$
^plans$
^\.github$
```

If `^plans$` is missing from the file before you start, plan 001 has not
landed. STOP.

**Verify**: `cat .Rbuildignore` matches the block above exactly.

### Step 4: Replace the README badges

In **`README.Rmd`**, replace the two badge lines between `<!-- badges: start -->`
and `<!-- badges: end -->` with this single line:

```
[![R-CMD-check](https://github.com/RRMaximiliano/constitucionesNic/actions/workflows/R-CMD-check.yaml/badge.svg)](https://github.com/RRMaximiliano/constitucionesNic/actions/workflows/R-CMD-check.yaml)
```

In **`README.md`**, replace the four wrapped badge lines (the two
`[![Travis build` / `[![AppVeyor build` links, lines 8–11) with the same single
line. Keep the blank line after `<!-- badges: start -->` that is already in
`README.md`.

**Verify**:
- `grep -nE 'travis|appveyor' README.Rmd README.md` → no output
- `grep -c 'actions/workflows/R-CMD-check.yaml/badge.svg' README.Rmd README.md` → `README.Rmd:1` and `README.md:1`
- `git diff --stat -- README.Rmd README.md` → only a few lines changed per file (badge block only)

### Step 5: Local check still passes

Run the "Build + check locally" command.

**Verify**: ends with `Status: OK`. If plan 001 has not landed on your base
commit, you will instead see `checking package dependencies ... ERROR` listing
`htm2txt`/`here`. That is a STOP condition: report that 001 must land first.

## Test plan

No R tests change. The verification is:
1. The workflow YAML parses (Step 1).
2. The local `R CMD check` is OK (Step 5).
3. After the operator opens a pull request from the branch (pushing the
   branch alone does not trigger the workflow), all three matrix jobs on
   GitHub Actions finish green. You cannot do this step yourself; list it in your report.

## Done criteria

ALL must hold:

- [ ] `.github/workflows/R-CMD-check.yaml` exists and the YAML validation command prints `ok`
- [ ] `.travis.yml` and `appveyor.yml` no longer exist in the tree
- [ ] `.Rbuildignore` matches the block in Step 3 exactly
- [ ] `git grep -nEi 'travis|appveyor' -- ':!plans'` → no output (searches tracked files only)
- [ ] Local build + check ends with `Status: OK`
- [ ] Changed files ⊆ the in-scope list (`git diff --name-status "$BASE"..HEAD`)
- [ ] `plans/README.md` status row for 002 updated; the note says "green on GitHub pending: operator must open a PR (or merge to master) to trigger the workflow" unless you saw it green

## STOP conditions

Stop and report back (do not improvise) if:

- The working tree is not clean before you start.
- Local `R CMD check` fails with the missing-`Imports` ERROR (plan 001 not applied).
- `yaml` is not installed (`Rscript -e 'library(yaml)'` errors). Report it; do
  not install unrelated tooling just to validate.
- The README badge blocks do not match the excerpts (someone already changed them).
- You feel the need to modify any other README content to "make it consistent". Don't.
- `^plans$` is missing from `.Rbuildignore` before you start (plan 001 has not landed).

## Maintenance notes

- If the maintainer wants coverage of older R releases, add
  `{os: ubuntu-latest, r: 'oldrel-1'}` to the matrix. `Depends: R (>= 2.10)`
  is far older than anything CI can test, which is fine for a data package.
- Plan 005 will add tests that load the package data. Those run automatically
  in this workflow through `check-r-package`.
- The action majors (`@v4`, `@v2`) are pinned to major versions, the
  `r-lib/actions` convention. Bump them when GitHub deprecates a runtime.
- Reviewer focus: confirm the badge URL uses the exact workflow file name
  `R-CMD-check.yaml`. If the name doesn't match, the badge stays grey.
