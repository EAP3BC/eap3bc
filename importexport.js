/* ============================================================
   IMPORTEXPORT.JS
   Ler planilhas, exportar Excel, baixar modelo.
   ============================================================ */

function normalizeDate(v){
  if (!v) return '';
  v = String(v).trim();
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m){
    let [_, d, mo, y] = m;
    if (y.length === 2) y = (parseInt(y, 10) > 50 ? '19' : '20') + y;
    return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  return '';
}

function normalizeHeader(h){
  if (!h) return null;
  const s = String(h).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const tabela = {
    'postograd':'postoGrad','posto':'postoGrad','graduacao':'postoGrad','postograduacao':'postoGrad',
    're':'re','registro':'re','registropolicial':'re','registropm':'re','renumero':'re','numerore':'re','nre':'re','numre':'re','repm':'re',
    'dg':'dg','digito':'dg',
    'nome':'nome','nomedeguerra':'nome','nomecompleto':'nome',
    'su':'su','secao':'ciaSecao','ciasecao':'ciaSecao','cia':'ciaSecao','ciaseccao':'ciaSecao','ciasecaopm':'ciaSecao',
    'taf':'taf',
    'restricaotafiv':'tafIVTipo','restricao':'tafIVTipo','restricaoseiftafiv':'tafIVTipo','tafiv':'tafIVTipo','tafivtipo':'tafIVTipo','tipoderestricao':'tafIVTipo',
    'datadenascimento':'dataNascimento','datanascimento':'dataNascimento','nascimento':'dataNascimento',
    'datadoexamedemedico':'dataExameMedico','dataexamedemedico':'dataExameMedico','examedemedico':'dataExameMedico','examedico':'dataExameMedico','iasmedico':'dataExameMedico','iasmed':'dataExameMedico',
    'datadoexameodonto':'dataExameOdonto','dataexameodonto':'dataExameOdonto','examedeodonto':'dataExameOdonto','exameodonto':'dataExameOdonto','iasodonto':'dataExameOdonto','iasodon':'dataExameOdonto',
    'validadeias':'validadeIAS','ias':'validadeIAS',
    'inseridoead':'inseridoEAD','inseridono':'inseridoEAD',
    'concluiuead':'concluiuEAD','concluiuoead':'concluiuEAD',
    'notaead':'notaEAD',
    'datadeconclusaoead':'dataConclusaoEAD','dataconclusaoead':'dataConclusaoEAD','conclusaoead':'dataConclusaoEAD',
    'categoria':'categoria','turma':'turma','ordemmanual':'ordemManual','ordem':'ordemManual'
  };
  return tabela[s] || null;
}

// Lê CSV respeitando vírgulas dentro de aspas
function parseCSV(text){
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i=0;i<text.length;i++){
    const c = text[i];
    if (inQuotes){
      if (c === '"'){ if (text[i+1] === '"'){ field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',' || c === ';'){ row.push(field); field=''; }
      else if (c === '\n'){ row.push(field); rows.push(row); row=[]; field=''; }
      else if (c === '\r') {}
      else field += c;
    }
  }
  if (field !== '' || row.length){ row.push(field); rows.push(row); }
  return rows.filter(r => r.length && r.some(c => c !== ''));
}

function downloadCSV(rows, filename){
  const esc = v => {
    v = v == null ? '' : String(v);
    if (/[",;\n]/.test(v)) return '"' + v.replace(/"/g,'""') + '"';
    return v;
  };
  const csv = rows.map(r => r.map(esc).join(';')).join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadXLSX(sheets, filename){
  if (typeof XLSX === 'undefined'){
    toast('Biblioteca de Excel não carregada.', 'error'); return;
  }
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const colWidths = [];
    rows.forEach(r => {
      (r || []).forEach((c, i) => {
        const len = String(c ?? '').length + 2;
        if (!colWidths[i] || colWidths[i] < len) colWidths[i] = len;
      });
    });
    ws['!cols'] = colWidths.map(w => ({ wch: Math.min(Math.max(w || 10, 10), 60) }));
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  XLSX.writeFile(wb, filename);
}

function todayStamp(){
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

// --- Baixar modelo de planilha ---
function downloadTemplate(){
  const headers = ['RE','Dg','Posto/Grad','Nome','SU',
    'Data de Nascimento','IAS Odonto','IAS Médico','Validade IAS'];
  const exemplos = [
    ['110627','9','1° SGT PM','RICARDO LOBO SELEGHIM','12345','20/06/1980','26/06/2025','27/06/2025','26/06/2026'],
    ['134330','A','1° SGT PM','EZEQUIEL PARDINHO SANTOS','54321','08/12/1984','','13/10/2025','13/10/2026']
  ];
  downloadCSV([headers, ...exemplos], `EAP_ModeloBase_${todayStamp()}.csv`);
  toast('Modelo baixado. Preencha no Excel e clique em "Importar Base".', 'info');
}

// --- Escolher arquivo e ler ---
function importBase(){
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/plain';
  input.style.position = 'fixed'; input.style.left = '-9999px'; input.style.opacity = '0';
  document.body.appendChild(input);
  const cleanup = () => { try { input.remove(); } catch(e){} };

  input.addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file){ cleanup(); return; }
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    if (ext === 'xlsx' || ext === 'xls'){
      if (typeof XLSX === 'undefined'){ toast('Biblioteca de Excel não carregada.', 'error'); cleanup(); return; }
      const reader = new FileReader();
      reader.onerror = () => { toast('Falha ao ler o arquivo.', 'error'); cleanup(); };
      reader.onload = ev => {
        try {
          const data = new Uint8Array(ev.target.result);
          const wb = XLSX.read(data, { type:'array', cellDates:true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header:1, raw:true, defval:'' });
          handleParsedRows(rows);
        } catch(err){ console.error(err); toast('Erro ao interpretar Excel: ' + err.message, 'error'); }
        cleanup();
      };
      reader.readAsArrayBuffer(file); return;
    }

    const reader = new FileReader();
    reader.onerror = () => { toast('Falha ao ler o arquivo.', 'error'); cleanup(); };
    reader.onload = ev => {
      try {
        const text = ev.target.result.replace(/^\uFEFF/, '');
        handleParsedRows(parseCSV(text));
      } catch(err){ console.error(err); toast('Erro ao processar arquivo: ' + err.message, 'error'); }
      cleanup();
    };
    reader.readAsText(file, 'UTF-8');
  });
  input.click();
}

// Encontra a linha do cabeçalho e mapeia colunas
function handleParsedRows(rows){
  if (!rows || rows.length < 2){ toast('Arquivo vazio ou sem dados.', 'error'); return; }
  while (rows.length && (!rows[0] || rows[0].every(c => c == null || String(c).trim() === ''))) rows.shift();
  if (rows.length && rows[0].length === 1 && /^sep=/i.test(String(rows[0][0] || '').trim())){
    rows.shift();
    while (rows.length && (!rows[0] || rows[0].every(c => c == null || String(c).trim() === ''))) rows.shift();
  }
  if (rows.length < 2){ toast('Arquivo vazio ou sem dados.', 'error'); return; }

  const KNOWN = new Set(['re','postoGrad','nome','dg','su','taf','ciaSecao',
    'dataNascimento','dataExameMedico','dataExameOdonto','validadeIAS',
    'inseridoEAD','concluiuEAD','notaEAD','dataConclusaoEAD','tafIVTipo',
    'categoria','turma','ordemManual']);

  const SCAN = Math.min(6, rows.length - 1);
  let headerRowIdx = 0, bestScore = -1;
  for (let i = 0; i < SCAN; i++){
    const score = (rows[i] || []).reduce((acc, h) => {
      const k = normalizeHeader(h);
      return acc + (k && KNOWN.has(k) ? 1 : 0);
    }, 0);
    if (score > bestScore){ bestScore = score; headerRowIdx = i; }
  }

  const rawHeaders = (rows[headerRowIdx] || []).map(h => String(h == null ? '' : h).trim());
  const dataRows = rows.slice(headerRowIdx + 1);
  const map = {};
  rawHeaders.forEach((h, i) => {
    const key = normalizeHeader(h);
    if (key && map[key] === undefined) map[key] = i;
  });
  if (map.re === undefined){
    const detected = rawHeaders.filter(Boolean).slice(0, 15).join(' | ') || '(nenhum)';
    toast('Coluna "RE" não encontrada. Cabeçalhos detectados: ' + detected, 'error');
    return;
  }
  if (dataRows.length === 0){ toast('Nenhum registro abaixo do cabeçalho.', 'error'); return; }
  processImport(dataRows, map);
}

async function processImport(rows, map){
  let enviados = 0, atualizadosLocal = 0, novosLocal = 0, ignorados = 0, erros = 0;
  const total = rows.length;
  const usarSupabase = !!sb;
  showImportOverlay(`Enviando ${total} registro(s)${usarSupabase ? ' para o Supabase' : ' (modo local)'}...`);

  function inferirCategoria(postoGrad){
    if (!postoGrad) return 'cb_sd';
    const s = String(postoGrad).toUpperCase();
    if (/(CEL|MAJ|CAP|TEN)\s*PM/.test(s) && !/SUB/.test(s)) return 'oficiais';
    if (/(SUB|SGT)/.test(s)) return 'subten_sgt';
    return 'cb_sd';
  }

  const registros = [];
  rows.forEach(r => {
    if (!r || r.length === 0) return;
    const get = k => {
      if (map[k] === undefined) return '';
      let v = r[map[k]];
      if (v instanceof Date && !isNaN(v)){
        return `${v.getFullYear()}-${String(v.getMonth()+1).padStart(2,'0')}-${String(v.getDate()).padStart(2,'0')}`;
      }
      if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
      return String(v ?? '').trim();
    };
    const re = get('re');
    if (!re){ ignorados++; return; }
    const postoGrad = get('postoGrad');
    registros.push({
      re, dg: get('dg'), postoGrad, nome: get('nome'), ciaSecao: get('ciaSecao'), su: get('su'),
      dataNascimento:  normalizeDate(get('dataNascimento')),
      dataExameOdonto: normalizeDate(get('dataExameOdonto')),
      dataExameMedico: normalizeDate(get('dataExameMedico')),
      validadeIAS:     normalizeDate(get('validadeIAS')),
      categoria: inferirCategoria(postoGrad),
      turmaId: ''
    });
  });

  if (usarSupabase){
    const LOTE = 20;
    for (let i = 0; i < registros.length; i += LOTE){
      const lote = registros.slice(i, i + LOTE);
      await Promise.all(lote.map(async reg => {
        try {
          const { data, error } = await sb.rpc('importar_policial', {
            p_re: reg.re, p_dg: reg.dg, p_posto_grad: reg.postoGrad, p_nome: reg.nome,
            p_su: reg.su || null, p_cia_secao: reg.ciaSecao || null,
            p_data_nascimento: reg.dataNascimento || null,
            p_ias_odonto: reg.dataExameOdonto || null,
            p_ias_medico: reg.dataExameMedico || null,
            p_validade_ias: reg.validadeIAS || null
          });
          if (error) throw error;
          if (data && data.ok === false){ erros++; } else { enviados++; }
        } catch(err){ console.error('Falha RE', reg.re, err); erros++; }
      }));
    }
  }

  registros.forEach(reg => {
    const existing = db.officers.find(x => x.re === reg.re);
    const base = {
      re: reg.re, dg: reg.dg, postoGrad: reg.postoGrad, nome: reg.nome,
      ciaSecao: reg.ciaSecao,
      dataNascimento: reg.dataNascimento, dataExameOdonto: reg.dataExameOdonto,
      dataExameMedico: reg.dataExameMedico, validadeIAS: reg.validadeIAS,
      categoria: reg.categoria, turmaId: '',
      taf: 'III', tafIVTipo: '',
      inseridoEAD: 'Não', concluiuEAD: 'Não', notaEAD: '', dataConclusaoEAD: ''
    };
    if (existing){
      Object.assign(existing, {
        re: base.re, dg: base.dg, postoGrad: base.postoGrad, nome: base.nome,
        ciaSecao: base.ciaSecao || existing.ciaSecao,
        dataNascimento: base.dataNascimento || existing.dataNascimento,
        dataExameOdonto: base.dataExameOdonto || existing.dataExameOdonto,
        dataExameMedico: base.dataExameMedico || existing.dataExameMedico,
        validadeIAS: base.validadeIAS || existing.validadeIAS,
        categoria: existing.categoria || base.categoria
      });
      atualizadosLocal++;
    } else {
      db.officers.push({ id: uid(), ...base });
      novosLocal++;
    }
  });

  saveDB(); render(); hideImportOverlay();
  const partes = [
    usarSupabase ? `${enviados} enviado(s) ao Supabase` : null,
    `${novosLocal} novo(s) local`,
    atualizadosLocal ? `${atualizadosLocal} atualizado(s) local` : null,
    erros ? `${erros} erro(s) Supabase` : null,
    ignorados ? `${ignorados} ignorado(s)` : null
  ].filter(Boolean).join(' • ');
  toast(`Importação concluída: ${partes}.`, erros ? 'error' : 'success');
  setActiveTab('efetivo'); render();
}

// --- Exportar ---
function exportTurma(turmaId){
  if (String(turmaId).startsWith('__efetivo_')){
    let sub = turmaId.replace('__efetivo_', '');
    let filterType = 'all';
    if (sub.startsWith('aptos_')){
      filterType = 'aptos';
      sub = sub.replace('aptos_', '');
    } else if (sub.startsWith('restricoes_')){
      filterType = 'restricoes';
      sub = sub.replace('restricoes_', '');
    }
    const catId = sub;
    const catLabel = catId === 'outros' ? 'Não classificados' : ((CATEGORIES.find(c => c.id === catId) || {}).label || catId);
    let officers = catId === 'outros'
      ? db.officers.filter(o => !REAL_CATEGORIES.find(c => c.id === o.categoria))
      : db.officers.filter(o => o.categoria === catId);
    if (filterType === 'aptos') officers = officers.filter(o => o.taf !== 'IV');
    if (filterType === 'restricoes') officers = officers.filter(o => o.taf === 'IV');

    let titleTag = 'Efetivo 3º B.C.';
    if (filterType === 'aptos') titleTag = 'Efetivo Aptos (TAF III)';
    if (filterType === 'restricoes') titleTag = 'Efetivo Restrições (TAF IV)';

    if (officers.length === 0){ toast('Nenhum policial para exportar.', 'error'); return; }
    exportOfficersList(
      officers,
      `${titleTag} — ${catLabel}`,
      `EAP${currentYear}_${titleTag.replace(/[^\w]+/g,'-')}_${catLabel.replace(/[^\w]+/g,'-')}_${todayStamp()}.xlsx`
    );
    return;
  }
  const turma = db.turmas.find(t => t.id === turmaId);
  if (!turma) return;
  const officers = db.officers.filter(o => o.turmaId === turmaId);
  if (officers.length === 0){ toast('Esta turma não possui policiais.', 'error'); return; }
  const catLabel = (CATEGORIES.find(c => c.id === turma.categoria) || {}).label || turma.categoria;
  const nomeTurma = String(turma.numero || 'sem-numero').replace(/[^\w\-]+/g,'_');
  const filename = `EAP${currentYear}_${catLabel.replace(/[^\w]+/g,'-')}_Turma-${nomeTurma}_${todayStamp()}.xlsx`;
  exportOfficersList(officers, `Turma ${turma.numero}`, filename);
  toast(`Turma ${turma.numero}: ${officers.length} exportados em Excel.`, 'success');
}

function exportOfficersList(officers, sheetTitle, filename){
  const ordenados = officers.slice().sort(sortOfficersManual);
  const headers = ['Posto/Grad','RE','DG','Nome','TAF','Restrição (TAF IV)','Cia/Seção','Nascimento','Validade IAS','Nota EAD','Observações'];
  const rows = [headers];
  ordenados.forEach(o => {
    let observacao = '';
    if (o.taf === 'IV'){
      if (['Lesão Membros Inferiores','Lesão Membros Superiores','Coluna Vertebral'].includes(o.tafIVTipo))
        observacao = 'Regularização de TAF IV e TAT';
      else if (o.tafIVTipo === 'Cardíaco') observacao = 'Regularização de TAT';
    }
    rows.push([
      o.postoGrad || '', o.re || '', o.dg || '', o.nome || '', o.taf || '', o.tafIVTipo || '',
      o.ciaSecao || '',
      o.dataNascimento ? fmtDate(o.dataNascimento) : '',
      o.validadeIAS    ? fmtDate(o.validadeIAS)    : '',
      o.notaEAD || '', observacao
    ]);
  });
  const sheetName = String(sheetTitle).slice(0, 31);
  downloadXLSX([{ name: sheetName, rows }], filename);
}

function buildExportRows(officers){
  const headers = ['Posto/Grad','RE','DG','Nome','TAF','Restrição (TAF IV)','Cia/Seção','Nascimento','Validade IAS','Nota EAD','Observações'];
  const rows = [headers];
  officers.forEach(o => {
    let observacao = '';
    if (o.taf === 'IV'){
      if (['Lesão Membros Inferiores','Lesão Membros Superiores','Coluna Vertebral'].includes(o.tafIVTipo))
        observacao = 'Regularização de TAF IV e TAT';
      else if (o.tafIVTipo === 'Cardíaco') observacao = 'Regularização de TAT';
    }
    rows.push([
      o.postoGrad || '', o.re || '', o.dg || '', o.nome || '', o.taf || '', o.tafIVTipo || '',
      o.ciaSecao || '',
      o.dataNascimento ? fmtDate(o.dataNascimento) : '',
      o.validadeIAS    ? fmtDate(o.validadeIAS)    : '',
      o.notaEAD || '', observacao
    ]);
  });
  return rows;
}

function exportMultiCategory(){
  const selected = Array.from(document.querySelectorAll('.side-check input[type="checkbox"]:checked'))
    .map(cb => cb.dataset.exportCat).filter(Boolean);
  if (selected.length === 0){ toast('Selecione ao menos uma categoria.', 'error'); return; }

  const sheets = []; const usedNames = new Set();
  function makeSheetName(raw){
    let base = String(raw || 'Planilha').replace(/[*?:\/\\\[\]]/g, '-').slice(0, 31).trim();
    if (!base) base = 'Planilha';
    let name = base, i = 1;
    while (usedNames.has(name)){
      const suffix = `_${i++}`;
      name = base.slice(0, Math.max(1, 31 - suffix.length)) + suffix;
    }
    usedNames.add(name);
    return name;
  }

  let totalPoliciais = 0;
  selected.forEach(catId => {
    const catLabel = (CATEGORIES.find(c => c.id === catId) || {}).label || catId;
    const turmas = db.turmas.filter(t => t.categoria === catId).sort(sortTurmas);
    turmas.forEach(t => {
      const officers = db.officers.filter(o => o.turmaId === t.id).sort(sortOfficersManual);
      if (officers.length === 0) return;
      sheets.push({ name: makeSheetName(`${catLabel} - T${t.numero}`), rows: buildExportRows(officers) });
      totalPoliciais += officers.length;
    });
    const semTurma = db.officers.filter(o => !o.turmaId && o.categoria === catId).sort(sortOfficersManual);
    if (semTurma.length > 0){
      sheets.push({ name: makeSheetName(`${catLabel} - Sem Turma`), rows: buildExportRows(semTurma) });
      totalPoliciais += semTurma.length;
    }
  });
  if (sheets.length === 0){ toast('Nenhum policial encontrado.', 'error'); return; }
  downloadXLSX(sheets, `EAP${currentYear}_Exportacao_${todayStamp()}.xlsx`);
  toast(`${totalPoliciais} exportado(s) em ${sheets.length} aba(s).`, 'success');
}