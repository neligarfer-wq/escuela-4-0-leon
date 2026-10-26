/**
 * Escuela 4.0 León · Recepción en Google Sheets.
 * Instalar como Aplicación web (ejecutar como: yo; acceso: cualquier persona).
 * Editar SPREADSHEET_ID con el ID de una hoja de cálculo creada en tu cuenta.
 * El archivo de respuestas permanece privado. Una fila por código de centro.
 */
const SPREADSHEET_ID = 'PEGA_AQUI_EL_ID_DE_TU_HOJA';
const HOJA = 'Centros';
const MATERIALES = [
'mTiny','True-True','Floor Code','micro:bit','LEGO SPIKE Prime',
'SAM Labs STEAM Classroom Kit','Codey Rocky','Impresora 3D Creality K1C',
'mBot2','Kit AI & IoT de mBot2','SAM Labs Learn to Code Classroom Kit',
'Arduino UNO R4','Cortadora láser xTool M1','Purificador de aire xTool','Otro material'
];
const BASE = ['Última actualización','Código','Centro','Etapa(s)','Localidad','Contacto','Correo','Ayuda básica','Detalle de ayuda'];
const HEADERS = BASE.concat(MATERIALES.flatMap(x=>[x+' · Necesita',x+' · Sobra',x+' · Observaciones']));
function doPost(e) {
  const p=(e&&e.parameter)||{};
  try {
    if(p.trampa) throw Error('Envío rechazado');
    if(!/^\d{8}$/.test(p.codigo||''))throw Error('Código no válido');
    if(!['Primaria','Secundaria'].includes(p.etapa))throw Error('Etapa no válida');
    const data=JSON.parse(p.datos||'[]');
    if(!Array.isArray(data)||!data.length||data.length>20)throw Error('Materiales no válidos');
    if(!(p.centro||'').trim()||!(p.contacto||'').trim()||!/^\S+@\S+\.\S+$/.test(p.email||''))throw Error('Identificación incompleta');
    const lock=LockService.getScriptLock();lock.waitLock(15000);
    try{
      const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
      const sh=ss.getSheetByName(HOJA)||ss.insertSheet(HOJA);
      if(sh.getLastRow()===0){sh.appendRow(HEADERS);sh.setFrozenRows(1)}
      let row=0;
      if(sh.getLastRow()>1){const codes=sh.getRange(2,2,sh.getLastRow()-1,1).getDisplayValues();const at=codes.findIndex(a=>a[0]===p.codigo);if(at>=0)row=at+2}
      let values=row?sh.getRange(row,1,1,HEADERS.length).getValues()[0]:Array(HEADERS.length).fill('');
      const clean=x=>String(x||'').slice(0,800).replace(/^[=+@-]/,'\'$&');
      values[0]=new Date();values[1]=p.codigo;values[2]=clean(p.centro);
      const stages=String(values[3]||'').split(', ').filter(Boolean);
      if(!stages.includes(p.etapa))stages.push(p.etapa);
      values[3]=stages.join(', ');
      values[4]=clean(p.localidad);values[5]=clean(p.contacto);values[6]=clean(p.email);
      values[7]=p.ayuda==='Sí'?'Sí':String(values[7]||'No');values[8]=clean(p.detalleAyuda)||values[8];
      for(const d of data) {
        const idx=MATERIALES.indexOf(d.material);
        if(idx<0||!['Necesita','Sobra'].includes(d.situacion)||!Number.isInteger(d.unidades)||d.unidades<1||d.unidades>10000)throw Error('Datos de material incorrectos');
        const col=BASE.length+idx*3+(d.situacion==='Necesita'?0:1);
        // Los envíos posteriores del mismo centro actualizan el valor declarado de ese material.
        values[col]=d.unidades;
        const obs=BASE.length+idx*3+2;
        if(d.observaciones)values[obs]=clean(d.observaciones);
      }
      if(row)sh.getRange(row,1,1,HEADERS.length).setValues([values]);
      else sh.appendRow(values);
    }finally{lock.releaseLock()}
    return HtmlService.createHtmlOutput('<p>Respuesta registrada correctamente.</p>');
  }catch(err){console.error(err);return HtmlService.createHtmlOutput('<p>No se ha podido registrar la respuesta. Contacta con la coordinación provincial.</p>')}
}
