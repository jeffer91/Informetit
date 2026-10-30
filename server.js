'use strict';

// Servidor local sin dependencias: npm run dev
// No envía los datos del navegador a GitHub ni a un servidor externo.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT) || 5500;
// El servidor es solo para diagnóstico: nunca publicar respaldos, credenciales,
// carpetas Git, perfiles ni archivos que contengan datos personales.
const PUBLIC_ROOT = new Set(['index.html','styles.css','app.js','public_summary.js',
  'nucleos_agregados.js','report_institucional.js']);
const PUBLIC_DIRS = new Set(['analysis','data','document','firebase','moodle','vendor']);
function isPublicAsset(name){
  const normalized=String(name||'').replace(/\\/g,'/');
  if(PUBLIC_ROOT.has(normalized))return true;
  const parts=normalized.split('/');
  return parts.length===2 && PUBLIC_DIRS.has(parts[0]) &&
    /^[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*\.js$/.test(parts[1]);
}
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Metodo no permitido');
    return;
  }

  let target;
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.includes('\0') || pathname.includes('\\')) throw new Error('Ruta invalida');
    target = path.resolve(ROOT, '.' + pathname);
    if (target !== ROOT && !target.startsWith(ROOT + path.sep)) throw new Error('Ruta fuera del proyecto');
    if (target === ROOT) target = path.join(ROOT, 'index.html');
    const relative=path.relative(ROOT,target).split(path.sep).join('/');
    if (!isPublicAsset(relative)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Archivo no disponible');
      return;
    }
  } catch {
    res.writeHead(400);
    res.end('Ruta invalida');
    return;
  }

  fs.realpath(target, (realError,realPath) => {
    if (realError || (realPath!==ROOT && !realPath.startsWith(ROOT+path.sep))) {
      res.writeHead(404);res.end('Archivo no disponible');return;
    }
  fs.stat(realPath, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Archivo no encontrado');
      return;
    }
    const mime = TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(realPath).pipe(res);
  });
  });
});

server.listen(PORT, HOST, () => {
  console.log('Informetit disponible en http://' + HOST + ':' + PORT);
  console.log('Para detener el servidor: Ctrl + C');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error('El puerto ' + PORT + ' ya esta en uso. Cierra el otro servidor o establece PORT=5501.');
  } else {
    console.error(err);
  }
  process.exitCode = 1;
});
