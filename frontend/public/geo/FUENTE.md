# regiones.json
Polígonos de las 16 regiones de Chile (incluye Ñuble), propiedades `codregion` (código INE) y `Region`.
Origen: capa de regiones de la Biblioteca del Congreso Nacional (BCN, "Mapas vectoriales"), tomada del repo
github.com/caracena/chile-geojson (regiones.json, sin archivo LICENSE explícito) y simplificada con mapshaper
(`-simplify 12% keep-shapes`, precisión 0.0001) para pesar ~60 KB. Solo uso interno del CRM.
