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
