'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;
const M=require('../data/model.js');require('../document/codigo.js');require('../document/logo-default.js');
const D=require('../document/institutional.js');
test('logo ITSQMET entregado se utiliza de forma predeterminada en las dos modalidades',()=>{
 const s=M.empty();
 for(const mode of ['presencial','online']){
  assert.ok(D.fields(s,mode).logo.startsWith('data:image/webp;base64,'));
  assert.match(D.cover(s,mode),/class="inf-cover-logo"/);
  assert.match(D.printHeader(s,mode),/class="inf-logo"/);
  assert.ok(!D.pending(s,mode).some(x=>x.includes('Logo institucional pendiente')));
 }
});
test('un logo personalizado prevalece y no cambia la versión original',()=>{
 const s=M.empty();const fallback=D.fields(s,'online').logo;
 s.config.logoDataUrl='data:image/png;base64,AAAA';
 assert.equal(D.fields(s,'online').logo,s.config.logoDataUrl);
 delete s.config.logoDataUrl;
 assert.equal(D.fields(s,'online').logo,fallback);
});
