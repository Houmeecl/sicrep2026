// Genera CSV compatible con Excel en español (separador ";", BOM UTF-8).
function celda(valor) {
  if (valor === null || valor === undefined) return '';
  let texto = valor instanceof Date ? valor.toISOString() : String(valor);
  // Evita inyección de fórmulas al abrir el archivo en una planilla.
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  if (/[";\n\r]/.test(texto)) texto = `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export function aCsv(columnas, filas) {
  const encabezado = columnas.map((c) => celda(c.titulo)).join(';');
  const cuerpo = filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(';'));
  return '﻿' + [encabezado, ...cuerpo].join('\r\n');
}
