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
