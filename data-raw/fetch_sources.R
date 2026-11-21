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
