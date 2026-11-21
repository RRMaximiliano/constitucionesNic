## Structural columns derived by data-raw/DATASET.R (titulo, cap, art, tema,
## cap_tema, seccion, tipo). Non-ASCII characters are written as \u escapes.

datasets <- list(
  "1974" = cons_1974,
  "1987" = cons_1987,
  "2010" = cons_2010,
  "2014" = cons_2014
)

expected <- list(
  "1974" = list(preambulo = 5L,  cierre = 4L,  encabezado = 89L, n_titulos = 17L),
  "1987" = list(preambulo = 24L, cierre = 59L, encabezado = 68L, n_titulos = 11L),
  "2010" = list(preambulo = 25L, cierre = 11L, encabezado = 68L, n_titulos = 11L),
  "2014" = list(preambulo = 28L, cierre = 9L,  encabezado = 69L, n_titulos = 11L)
)

PREAMBULO   <- "PRE\u00c1MBULO"
re_titulo   <- "^T\u00cdTULO [IVX]+$"
re_cap      <- "^CAP\u00cdTULO ([IVX]+|\u00daNICO)$"
re_heading  <- "^(T[\u00cdI]TULO|CAP[\u00cdI]TULO)\\s"

for (y in names(datasets)) {
  d <- datasets[[y]]
  e <- expected[[y]]
  cuerpo <- d$seccion == "cuerpo"

  test_that(paste0("cons_", y, " has integer year and art"), {
    expect_type(d$year, "integer")
    expect_type(d$art, "integer")
  })

  test_that(paste0("cons_", y, " seccion and tipo take only known values, in order"), {
    expect_setequal(unique(d$seccion), c("preambulo", "cuerpo", "cierre"))
    expect_setequal(unique(d$tipo), c("encabezado", "texto"))
    expect_identical(rle(d$seccion)$values, c("preambulo", "cuerpo", "cierre"))
    expect_identical(sum(d$seccion == "preambulo"), e$preambulo)
    expect_identical(sum(d$seccion == "cierre"), e$cierre)
    expect_identical(sum(d$tipo == "encabezado"), e$encabezado)
    expect_true(all(d$tipo[!cuerpo] == "texto"))
  })

  test_that(paste0("cons_", y, " titulo is normalized and scoped to its section"), {
    expect_true(all(d$titulo[d$seccion == "preambulo"] == PREAMBULO))
    expect_true(all(is.na(d$titulo[d$seccion == "cierre"])))
    expect_true(all(grepl(re_titulo, d$titulo[cuerpo])))
    expect_identical(length(unique(d$titulo[cuerpo])), e$n_titulos)
  })

  test_that(paste0("cons_", y, " cap is normalized and never leaks across titles"), {
    expect_true(all(is.na(d$cap) | grepl(re_cap, d$cap)))
    expect_true(all(is.na(d$cap[!cuerpo])))
    # The TITULO heading row of every title has no chapter yet.
    titulo_rows <- cuerpo & grepl("^T[\u00cdI]TULO\\s", d$text)
    expect_true(all(is.na(d$cap[titulo_rows])))
  })

  test_that(paste0("cons_", y, " art is set on every body text row and only there"), {
    expect_true(all(is.na(d$art[d$tipo == "encabezado"])))
    expect_true(all(is.na(d$art[!cuerpo])))
    expect_false(anyNA(d$art[cuerpo & d$tipo == "texto"]))
    # Every heading line is classified as a heading.
    expect_true(all(d$tipo[cuerpo & grepl(re_heading, d$text)] == "encabezado"))
  })

  test_that(paste0("cons_", y, " tema never holds a chapter heading"), {
    expect_false(any(grepl("^CAP[\u00cdI]TULO", d$tema)))
    expect_true(all(d$tema[d$seccion == "preambulo"] == PREAMBULO))
    expect_true(all(is.na(d$tema[d$seccion == "cierre"])))
  })

  test_that(paste0("cons_", y, " closing section starts at the 'Dado en' line"), {
    first_cierre <- d$text[d$seccion == "cierre"][1]
    expect_match(first_cierre, "^(Dad[oa]|DAD[OA])\\s")
  })
}

test_that("regression: 1974 TITULO II heading does not inherit TITULO I values", {
  row <- cons_1974[cons_1974$line == 30, ]
  expect_identical(row$text, "T\u00cdTULO II")
  expect_true(is.na(row$art))
  expect_true(is.na(row$cap))
  expect_identical(row$tema, "Nacionalidad")
})

test_that("regression: 1974 Roman numerals typed with a lowercase L are normalized", {
  expect_true("T\u00cdTULO VIII" %in% cons_1974$titulo)
  expect_false(any(grepl("l", cons_1974$titulo[cons_1974$seccion == "cuerpo"])))
})

test_that("known tema values", {
  tema_of <- function(d, t) unique(d$tema[d$titulo %in% t])
  expect_identical(tema_of(cons_1974, "T\u00cdTULO V"), "Derechos y Garant\u00edas")
  expect_identical(tema_of(cons_1974, "T\u00cdTULO I"), NA_character_)
  expect_identical(tema_of(cons_2014, "T\u00cdTULO V"),
                   "DEFENSA Y SEGURIDAD NACIONAL. SEGURIDAD CIUDADANA")
  expect_identical(tema_of(cons_1987, "T\u00cdTULO I"), "PRINCIPIOS FUNDAMENTALES")
})
