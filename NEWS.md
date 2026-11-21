# constitucionesNic 0.2.0

## Cambios que rompen compatibilidad

* `year` y `art` ahora son enteros (antes eran texto).
* Las líneas finales (promulgación, firmas e historial de reformas) ya no se
  asignan al último artículo: tienen `seccion == "cierre"` y `titulo`, `cap`,
  `art` y `tema` en `NA`.

## Correcciones

* `cap` y `art` ya no se arrastran de un título al siguiente: las líneas de
  encabezado de un título nuevo ya no heredan el capítulo ni el artículo
  anterior.
* `tema` de 1974 ahora contiene el tema del título (antes contenía, en la
  mayoría de los títulos, el encabezado del capítulo, p. ej. "CAPÍTULO I").
* `titulo` y `cap` están normalizados: "TÍTULO VIII" en vez de "TÍTULO Vlll",
  "CAPÍTULO ÚNICO" en vez de "CAPITULO UNICO".

## Nuevas variables

* `cap_tema`: nombre del capítulo.
* `seccion`: `"preambulo"`, `"cuerpo"` o `"cierre"`.
* `tipo`: `"encabezado"` o `"texto"`, para filtrar los encabezados en análisis
  de texto.

## Documentación

* La documentación de los datos ahora usa el nombre correcto de la columna
  `text` (antes decía `txt`) e incluye la fuente.

# constitucionesNic 0.1.0

* Primera versión.
