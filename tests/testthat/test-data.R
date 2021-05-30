## Testing the datasets to see if they are as expected
library(constitucionesNic)

## constitucion de 1974
test_that("cons_1974 conforms to spec", {
  cons_1974_colnames <- c("year", "line", "text", "titulo", "cap", "art", "tema")
  expect_equal(colnames(cons_1974), cons_1974_colnames)
})

## constitucion de 1987
test_that("cons_1987 conforms to spec", {
  cons_1987_colnames <- c("year", "line", "text", "titulo", "cap", "art", "tema")
  expect_equal(colnames(cons_1987), cons_1987_colnames)
})

## constitucion de 2010
test_that("cons_2010 conforms to spec", {
  cons_2010_colnames <- c("year", "line", "text", "titulo", "cap", "art", "tema")
  expect_equal(colnames(cons_2010), cons_2010_colnames)
})

## constitucion de 2014
test_that("cons_2014 conforms to spec", {
  cons_2014_colnames <- c("year", "line", "text", "titulo", "cap", "art", "tema")
  expect_equal(colnames(cons_2014), cons_2014_colnames)
})
