/* Informetit · Código documental según cierre de período + dos meses.
   El consecutivo/prefijo pertenece a la institución y no se genera al azar. */
(function(root){
'use strict';
const MONTHS=['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
const months=MONTHS.map(x=>x.toLowerCase());
const clean=s=>String(s??'').trim().replace(/\s+/g,' ');
function end(period){
 const p=clean(period).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 const found=[...p.matchAll(/\b(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+(20\d{2})\b/g)];
 if(!found.length)throw Error('El período no tiene un mes de finalización reconocible.');
 const last=found[found.length-1],year=Number(last[2]),month=MONTHS.indexOf(last[1])+1;
 if(!month)throw Error('Mes de finalización incorrecto.');
 return {year,month};
}
function issuance(period,offset=2){
 if(!Number.isInteger(offset)||offset<0||offset>12)throw Error('Desplazamiento de meses inválido');
 const e=end(period),date=new Date(Date.UTC(e.year,e.month-1+offset,1));
 const year=date.getUTCFullYear(),month=date.getUTCMonth()+1;
 return {year,month,stamp:year+'-'+String(month).padStart(2,'0'),
   label:months[month-1]+' de '+year,
   periodEnd:months[e.month-1]+' de '+e.year,
   offset};
}
function prefix(value){
 const raw=clean(value).replace(/\s*[-–—]\s*/g,'-').toUpperCase();
 return raw.replace(/-(?:20\d{2})-(?:0[1-9]|1[0-2])$/,'');
}
function validity(value){
 const p=prefix(value);
 if(!p)return {valid:false,prefix:'',reason:'Falta el prefijo y consecutivo institucional'};
 if(!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(p))
  return {valid:false,prefix:p,reason:'Utiliza únicamente letras, números y guiones en el código'};
 return {valid:true,prefix:p,reason:''};
}
function build(value,period){
 const date=issuance(period),v=validity(value);
 return {...date,valid:v.valid,prefix:v.prefix,
   code:v.valid?v.prefix+'-'+date.stamp:'POR ASIGNAR',
   reason:v.reason};
}
function forMode(state,mode){
 const authorized=mode==='online'?'UTET-INF-02-PRO-95':'UTET-INF-01-PRO-95';
 return build(authorized,state?.periodo||'Octubre 2025 - Marzo 2026');
}
root.InformetitCodigo=Object.freeze({MONTHS,end,issuance,prefix,validity,build,forMode});
if(typeof module==='object'&&module.exports)module.exports=root.InformetitCodigo;
})(typeof window!=='undefined'?window:globalThis);
