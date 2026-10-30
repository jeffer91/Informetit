'use strict';

// Se ejecuta automáticamente con npm install. Copia librerías al directorio local
// para que Informetit funcione sin Internet después de instalarse.
const fs = require('node:fs');
const path = require('node:path');

const project = path.resolve(__dirname, '..');
const dest = path.join(project, 'vendor');
fs.mkdirSync(dest, { recursive: true });

const libs = [
  ['xlsx/dist/xlsx.full.min.js', 'xlsx.full.min.js']
];

for (const [modulePath, output] of libs) {
  const source = path.join(project, 'node_modules', ...modulePath.split('/'));
  if (!fs.existsSync(source)) throw new Error('No se encontró ' + modulePath + '. Ejecuta npm install de nuevo.');
  fs.copyFileSync(source, path.join(dest, output));
  console.log('[Informetit] Preparado: vendor/' + output);
}
console.log('[Informetit] Bibliotecas listas para uso sin Internet.');
