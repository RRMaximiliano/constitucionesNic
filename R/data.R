#' @title Constitución Política de Nicaragua, 1974
#'
#' @description Un \code{tibble} con el texto completo de la constitución
#' política de Nicaragua de 1974, una fila por línea del texto oficial.
#'
#' @format Un \code{tibble} con 10 variables:
#'
#' \describe{
#' \item{year}{(entero) Año de la constitución.}
#' \item{line}{(entero) Número de línea en el texto extraído de la Asamblea
#'   Nacional. Puede tener saltos donde se eliminó una línea con solo un punto.}
#' \item{text}{(texto) Texto de la línea, sin modificar.}
#' \item{titulo}{(texto) Título al que pertenece la línea, normalizado
#'   (p. ej. \code{"TÍTULO VIII"}). \code{"PREÁMBULO"} antes del primer
#'   título; \code{NA} en el cierre.}
#' \item{cap}{(texto) Capítulo dentro del título, normalizado (p. ej.
#'   \code{"CAPÍTULO ÚNICO"}). \code{NA} fuera del cuerpo y en las líneas de
#'   encabezado del título.}
#' \item{art}{(entero) Número del artículo. \code{NA} en encabezados, en
#'   el preámbulo y en el cierre.}
#' \item{tema}{(texto) Tema del título según el texto oficial.
#'   \code{"PREÁMBULO"} en el preámbulo. Si el título no tiene tema propio y
#'   consta de un solo capítulo, se usa el nombre de ese capítulo.
#'   \code{NA} en el cierre o si no hay tema aplicable.}
#' \item{cap_tema}{(texto) Nombre del capítulo, cuando el texto lo indica;
#'   \code{NA} en otro caso.}
#' \item{seccion}{(texto) \code{"preambulo"}, \code{"cuerpo"} o
#'   \code{"cierre"} (promulgación, firmas e historial de reformas).}
#' \item{tipo}{(texto) \code{"encabezado"} para líneas de título, tema o
#'   capítulo; \code{"texto"} para el resto.}
#' }
#'
#' @source Asamblea Nacional de Nicaragua, Legislación de Nicaragua
#'   (\url{http://legislacion.asamblea.gob.ni}), texto extraído en 2021.
#'   Ver \code{data-raw/README.md} en el repositorio.
"cons_1974"

#' @title Constitución Política de Nicaragua, 1987
#'
#' @description Un \code{tibble} con el texto completo de la constitución
#' política de Nicaragua de 1987, una fila por línea del texto oficial.
#'
#' @format Un \code{tibble} con 10 variables:
#'
#' \describe{
#' \item{year}{(entero) Año de la constitución.}
#' \item{line}{(entero) Número de línea en el texto extraído de la Asamblea
#'   Nacional. Puede tener saltos donde se eliminó una línea con solo un punto.}
#' \item{text}{(texto) Texto de la línea, sin modificar.}
#' \item{titulo}{(texto) Título al que pertenece la línea, normalizado
#'   (p. ej. \code{"TÍTULO VIII"}). \code{"PREÁMBULO"} antes del primer
#'   título; \code{NA} en el cierre.}
#' \item{cap}{(texto) Capítulo dentro del título, normalizado (p. ej.
#'   \code{"CAPÍTULO ÚNICO"}). \code{NA} fuera del cuerpo y en las líneas de
#'   encabezado del título.}
#' \item{art}{(entero) Número del artículo. \code{NA} en encabezados, en
#'   el preámbulo y en el cierre.}
#' \item{tema}{(texto) Tema del título según el texto oficial.
#'   \code{"PREÁMBULO"} en el preámbulo. Si el título no tiene tema propio y
#'   consta de un solo capítulo, se usa el nombre de ese capítulo.
#'   \code{NA} en el cierre o si no hay tema aplicable.}
#' \item{cap_tema}{(texto) Nombre del capítulo, cuando el texto lo indica;
#'   \code{NA} en otro caso.}
#' \item{seccion}{(texto) \code{"preambulo"}, \code{"cuerpo"} o
#'   \code{"cierre"} (promulgación, firmas e historial de reformas).}
#' \item{tipo}{(texto) \code{"encabezado"} para líneas de título, tema o
#'   capítulo; \code{"texto"} para el resto.}
#' }
#'
#' @source Asamblea Nacional de Nicaragua, Legislación de Nicaragua
#'   (\url{http://legislacion.asamblea.gob.ni}), texto extraído en 2021.
#'   Ver \code{data-raw/README.md} en el repositorio.
"cons_1987"

#' @title Constitución Política de Nicaragua, 2010
#'
#' @description Un \code{tibble} con el texto completo de la constitución
#' política de Nicaragua de 2010, una fila por línea del texto oficial.
#'
#' @format Un \code{tibble} con 10 variables:
#'
#' \describe{
#' \item{year}{(entero) Año de la constitución.}
#' \item{line}{(entero) Número de línea en el texto extraído de la Asamblea
#'   Nacional. Puede tener saltos donde se eliminó una línea con solo un punto.}
#' \item{text}{(texto) Texto de la línea, sin modificar.}
#' \item{titulo}{(texto) Título al que pertenece la línea, normalizado
#'   (p. ej. \code{"TÍTULO VIII"}). \code{"PREÁMBULO"} antes del primer
#'   título; \code{NA} en el cierre.}
#' \item{cap}{(texto) Capítulo dentro del título, normalizado (p. ej.
#'   \code{"CAPÍTULO ÚNICO"}). \code{NA} fuera del cuerpo y en las líneas de
#'   encabezado del título.}
#' \item{art}{(entero) Número del artículo. \code{NA} en encabezados, en
#'   el preámbulo y en el cierre.}
#' \item{tema}{(texto) Tema del título según el texto oficial.
#'   \code{"PREÁMBULO"} en el preámbulo. Si el título no tiene tema propio y
#'   consta de un solo capítulo, se usa el nombre de ese capítulo.
#'   \code{NA} en el cierre o si no hay tema aplicable.}
#' \item{cap_tema}{(texto) Nombre del capítulo, cuando el texto lo indica;
#'   \code{NA} en otro caso.}
#' \item{seccion}{(texto) \code{"preambulo"}, \code{"cuerpo"} o
#'   \code{"cierre"} (promulgación, firmas e historial de reformas).}
#' \item{tipo}{(texto) \code{"encabezado"} para líneas de título, tema o
#'   capítulo; \code{"texto"} para el resto.}
#' }
#'
#' @source Asamblea Nacional de Nicaragua, Legislación de Nicaragua
#'   (\url{http://legislacion.asamblea.gob.ni}), texto extraído en 2021.
#'   Ver \code{data-raw/README.md} en el repositorio.
"cons_2010"

#' @title Constitución Política de Nicaragua, 2014
#'
#' @description Un \code{tibble} con el texto completo de la constitución
#' política de Nicaragua de 2014, una fila por línea del texto oficial.
#'
#' @format Un \code{tibble} con 10 variables:
#'
#' \describe{
#' \item{year}{(entero) Año de la constitución.}
#' \item{line}{(entero) Número de línea en el texto extraído de la Asamblea
#'   Nacional. Puede tener saltos donde se eliminó una línea con solo un punto.}
#' \item{text}{(texto) Texto de la línea, sin modificar.}
#' \item{titulo}{(texto) Título al que pertenece la línea, normalizado
#'   (p. ej. \code{"TÍTULO VIII"}). \code{"PREÁMBULO"} antes del primer
#'   título; \code{NA} en el cierre.}
#' \item{cap}{(texto) Capítulo dentro del título, normalizado (p. ej.
#'   \code{"CAPÍTULO ÚNICO"}). \code{NA} fuera del cuerpo y en las líneas de
#'   encabezado del título.}
#' \item{art}{(entero) Número del artículo. \code{NA} en encabezados, en
#'   el preámbulo y en el cierre.}
#' \item{tema}{(texto) Tema del título según el texto oficial.
#'   \code{"PREÁMBULO"} en el preámbulo. Si el título no tiene tema propio y
#'   consta de un solo capítulo, se usa el nombre de ese capítulo.
#'   \code{NA} en el cierre o si no hay tema aplicable.}
#' \item{cap_tema}{(texto) Nombre del capítulo, cuando el texto lo indica;
#'   \code{NA} en otro caso.}
#' \item{seccion}{(texto) \code{"preambulo"}, \code{"cuerpo"} o
#'   \code{"cierre"} (promulgación, firmas e historial de reformas).}
#' \item{tipo}{(texto) \code{"encabezado"} para líneas de título, tema o
#'   capítulo; \code{"texto"} para el resto.}
#' }
#'
#' @source Asamblea Nacional de Nicaragua, Legislación de Nicaragua
#'   (\url{http://legislacion.asamblea.gob.ni}), texto extraído en 2021.
#'   Ver \code{data-raw/README.md} en el repositorio.
"cons_2014"

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
