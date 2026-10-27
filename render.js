/* ============================================================
   RENDER.JS
   Desenha a tela (estatísticas, turmas, tabelas).
   ============================================================ */

function render(){ renderStats(); renderContent(); }

function renderStats(){
  if (state.activeCategory === 'gestao_matriculas' ||
      state.activeCategory === 'gestao_usuarios'){
    document.getElementById('stats').style.display = 'none';
    return;
  }
  document.getElementById('stats').style.display = '';

  if (state.activeCategory === 'insercao_taf'){
    const totalPoliciais = db.officers.length;
    const tafRegistrados = db.officers.filter(o => o.tafResultados).length;
    const tafIII = db.officers.filter(o => o.tafResultados && o.tafResultados.modalidade === 'TAF III').length;
    const tafIV  = db.officers.filter(o => o.tafResultados && String(o.tafResultados.modalidade||'').startsWith('TAF IV')).length;
    const pendentes = totalPoliciais - tafRegistrados;

    document.getElementById('stats').innerHTML = `
      <div class="stat cat-primary"><span class="stat-label">TAFs Registrados</span><span class="stat-value">${tafRegistrados}</span></div>
      <div class="stat"><span class="stat-label">Efetivo Total</span><span class="stat-value">${totalPoliciais}</span></div>
      <div class="stat green"><span class="stat-label">TAF III Realizados</span><span class="stat-value">${tafIII}</span></div>
      <div class="stat red"><span class="stat-label">TAF IV (Restrições)</span><span class="stat-value">${tafIV}</span></div>
      <div class="stat amber"><span class="stat-label">Pendentes</span><span class="stat-value">${pendentes > 0 ? pendentes : 0}</span></div>
    `;
    return;
  }

  if (state.activeCategory === 'efetivo_aptos'){
    const aptos = db.officers.filter(o => o.taf !== 'IV');
    const total = aptos.length;
    const eadConcluidos = aptos.filter(o => o.concluiuEAD === 'Sim').length;
    const eadInseridos  = aptos.filter(o => o.inseridoEAD === 'Sim').length;

    document.getElementById('stats').innerHTML = `
      <div class="stat cat-primary green"><span class="stat-label">Efetivo Aptos (TAF III)</span><span class="stat-value">${total}</span></div>
      <div class="stat"><span class="stat-label">Efetivo Total 3º B.C.</span><span class="stat-value">${db.officers.length}</span></div>
      <div class="stat green"><span class="stat-label">EAD Concluído</span><span class="stat-value">${eadConcluidos}</span></div>
      <div class="stat amber"><span class="stat-label">EAD Inserido</span><span class="stat-value">${eadInseridos}</span></div>
      <div class="stat red"><span class="stat-label">Restrições (TAF IV)</span><span class="stat-value">${db.officers.filter(o => o.taf === 'IV').length}</span></div>
    `;
    return;
  }

  if (state.activeCategory === 'efetivo_restricoes'){
    const restritos = db.officers.filter(o => o.taf === 'IV');
    const total = restritos.length;
    const ms  = restritos.filter(o => o.tafIVTipo === 'Lesão Membros Superiores').length;
    const mi  = restritos.filter(o => o.tafIVTipo === 'Lesão Membros Inferiores').length;
    const col = restritos.filter(o => o.tafIVTipo === 'Coluna Vertebral').length;
    const card= restritos.filter(o => o.tafIVTipo === 'Cardíaco').length;

    document.getElementById('stats').innerHTML = `
      <div class="stat cat-primary red"><span class="stat-label">Efetivo Restrições (TAF IV)</span><span class="stat-value">${total}</span></div>
      <div class="stat"><span class="stat-label">Efetivo Total 3º B.C.</span><span class="stat-value">${db.officers.length}</span></div>
      <div class="stat amber"><span class="stat-label">Membros Sup.</span><span class="stat-value">${ms}</span></div>
      <div class="stat amber"><span class="stat-label">Membros Inf.</span><span class="stat-value">${mi}</span></div>
      <div class="stat red"><span class="stat-label">Coluna / Cardíaco</span><span class="stat-value">${col + card}</span></div>
    `;
    return;
  }

  const isEfetivo = state.activeCategory === 'efetivo';
  const officers = isEfetivo ? db.officers : db.officers.filter(o => o.categoria === state.activeCategory);
  const turmas   = isEfetivo ? db.turmas   : db.turmas.filter(t => t.categoria === state.activeCategory);
  const total          = officers.length;
  const eadInseridos   = officers.filter(o => o.inseridoEAD === 'Sim').length;
  const eadConcluidos  = officers.filter(o => o.concluiuEAD === 'Sim').length;
  const tafIV          = officers.filter(o => o.taf === 'IV').length;

  document.getElementById('stats').innerHTML = `
    <div class="stat cat-primary"><span class="stat-label">${isEfetivo ? 'Total Cadastrado' : 'Turmas'}</span><span class="stat-value">${isEfetivo ? total : turmas.length}</span></div>
    <div class="stat"><span class="stat-label">Efetivo Total</span><span class="stat-value">${total}</span></div>
    <div class="stat green"><span class="stat-label">EAD Concluído</span><span class="stat-value">${eadConcluidos}</span></div>
    <div class="stat amber"><span class="stat-label">EAD Inserido</span><span class="stat-value">${eadInseridos}</span></div>
    <div class="stat red"><span class="stat-label">TAF IV (Restrições)</span><span class="stat-value">${tafIV}</span></div>
  `;
}

function renderContent(){
  const container = document.getElementById('content');

  if (state.activeCategory === 'gestao_matriculas'){
    renderGestaoMatriculas(container);
    return;
  }

  if (state.activeCategory === 'gestao_usuarios'){
    renderGestaoUsuarios(container);
    return;
  }

  if (state.activeCategory === 'insercao_taf'){
    renderInsercaoTAF(container);
    return;
  }

  const normalizeText = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const q = normalizeText(state.search);
  const officerMatches = o => {
    if (!q) return true;
    return [o.re, o.nome, o.ciaSecao, o.postoGrad, o.turma, o.taf, o.tafIVTipo].some(v =>
      normalizeText(v).includes(q)
    );
  };

  const isEfetivoBase = ['efetivo', 'efetivo_aptos', 'efetivo_restricoes'].includes(state.activeCategory);
  if (isEfetivoBase){
    let filteredOfficers = db.officers.filter(officerMatches);
    let titlePrefix = 'Efetivo 3º B.C.';
    let emptyMsg = 'Nenhum policial no Efetivo 3º B.C.';

    if (state.activeCategory === 'efetivo_aptos'){
      filteredOfficers = filteredOfficers.filter(o => o.taf !== 'IV');
      titlePrefix = 'Efetivo Aptos (TAF III)';
      emptyMsg = 'Nenhum policial apto (TAF III) encontrado.';
    } else if (state.activeCategory === 'efetivo_restricoes'){
      filteredOfficers = filteredOfficers.filter(o => o.taf === 'IV');
      titlePrefix = 'Efetivo Restrições (TAF IV)';
      emptyMsg = 'Nenhum policial com restrição (TAF IV) encontrado.';
    }

    const todos = filteredOfficers.sort(sortOfficersManual);
    if (todos.length === 0){
      container.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
          <h3>${emptyMsg}</h3>
          <p>Clique em <strong>"Importar Base"</strong> para carregar a planilha.</p>
        </div>`;
      return;
    }
    let html = '';
    const prefixId = state.activeCategory === 'efetivo_aptos' ? '__efetivo_aptos_' : (state.activeCategory === 'efetivo_restricoes' ? '__efetivo_restricoes_' : '__efetivo_');
    REAL_CATEGORIES.forEach(cat => {
      const grupo = todos.filter(o => o.categoria === cat.id).sort(sortOfficersManual);
      if (grupo.length === 0) return;
      html += renderTurma({
        id: prefixId + cat.id,
        numero: cat.label, categoria: cat.id,
        dataInicio: '', dataFim: '',
        _virtual: true,
        _tituloCustom: `${titlePrefix} — ${cat.label}`
      }, grupo);
    });
    const semCat = todos.filter(o => !REAL_CATEGORIES.find(c => c.id === o.categoria)).sort(sortOfficersManual);
    if (semCat.length){
      html += renderTurma({
        id: prefixId + 'outros', numero: '—', categoria: 'cb_sd',
        dataInicio: '', dataFim: '', _virtual: true,
        _tituloCustom: `${titlePrefix} — Não classificados`
      }, semCat);
    }
    container.innerHTML = html;
    bindTurmaEvents(container);
    return;
  }

  let turmas = db.turmas.filter(t => t.categoria === state.activeCategory).sort(sortTurmas);
  if (q){
    turmas = turmas.map(t => ({
      ...t,
      _filtered: db.officers.filter(o => o.turmaId === t.id && officerMatches(o)).sort(sortOfficersManual)
    })).filter(t => t._filtered.length > 0);
  } else {
    turmas = turmas.map(t => ({
      ...t,
      _filtered: db.officers.filter(o => o.turmaId === t.id).sort(sortOfficersManual)
    }));
  }
  if (turmas.length === 0){
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
        <h3>Nenhuma turma cadastrada</h3>
        <p>Clique em <strong>"Nova Turma"</strong> para começar.</p>
      </div>`;
    return;
  }
  let html = '';
  turmas.forEach(t => html += renderTurma(t, t._filtered));
  container.innerHTML = html;
  bindTurmaEvents(container);
}

function bindTurmaEvents(container){
  container.querySelectorAll('.turma-head').forEach(head => {
    head.addEventListener('click', e => {
      if (e.target.closest('.turma-actions, .turma-check')) return;
      head.closest('.turma').classList.toggle('collapsed');
    });
  });
  container.querySelectorAll('[data-action]:not(input[type="checkbox"])').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const action  = btn.dataset.action;
      const id      = btn.dataset.id;
      const turmaId = btn.dataset.turma;
      if (action === 'edit-officer')  openOfficerModal(db.officers.find(o => o.id === id));
      if (action === 'del-officer')   confirmDeleteOfficer(id);
      if (action === 'edit-turma')    openTurmaModal(db.turmas.find(t => t.id === turmaId));
      if (action === 'del-turma')     confirmDeleteTurma(turmaId);
      if (action === 'add-to-turma')  openOfficerModal(null, turmaId);
      if (action === 'export-turma')  exportTurma(turmaId);
      if (action === 'reset-ordem')   resetOrdemTurma(turmaId);
    });
  });
  container.querySelectorAll('input[type="checkbox"][data-action="toggle-concluida"]').forEach(cb => {
    cb.addEventListener('click', e => e.stopPropagation());
    cb.addEventListener('change', e => {
      e.stopPropagation();
      toggleTurmaConcluida(cb.dataset.turma, cb.checked);
    });
  });

  // Drag & drop desktop
  container.querySelectorAll('tbody').forEach(tbody => {
    let draggedRow = null;
    tbody.querySelectorAll('tr[draggable="true"]').forEach(tr => {
      tr.addEventListener('dragstart', e => {
        draggedRow = tr; tr.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', tr.dataset.officerId); } catch(_){}
      });
      tr.addEventListener('dragend', () => {
        if (draggedRow) draggedRow.style.opacity = '';
        draggedRow = null;
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('drag-over'));
      });
      tr.addEventListener('dragover', e => {
        e.preventDefault(); e.dataTransfer.dropEffect = 'move';
        if (!draggedRow || draggedRow === tr) return;
        tr.classList.add('drag-over');
      });
      tr.addEventListener('dragleave', () => tr.classList.remove('drag-over'));
      tr.addEventListener('drop', e => {
        e.preventDefault(); tr.classList.remove('drag-over');
        if (!draggedRow || draggedRow === tr) return;
        const rect = tr.getBoundingClientRect();
        const before = e.clientY < rect.top + rect.height / 2;
        if (before) tbody.insertBefore(draggedRow, tr);
        else        tbody.insertBefore(draggedRow, tr.nextSibling);
        salvarOrdemDoTbody(tbody);
      });
    });
  });

  // Drag & drop touch
  container.querySelectorAll('tbody').forEach(tbody => {
    let touchRow = null;
    tbody.querySelectorAll('tr[draggable="true"]').forEach(tr => {
      const handle = tr.querySelector('.drag-handle');
      if (!handle) return;
      handle.addEventListener('touchstart', () => {
        touchRow = tr; tr.style.opacity = '0.6'; tr.style.background = 'rgba(201,164,74,.08)';
      }, { passive: true });
      handle.addEventListener('touchmove', e => {
        if (!touchRow) return;
        e.preventDefault();
        const y = e.touches[0].clientY;
        const el = document.elementFromPoint(e.touches[0].clientX, y);
        const targetRow = el && el.closest('tr[draggable="true"]');
        if (!targetRow || targetRow === touchRow) return;
        const rect = targetRow.getBoundingClientRect();
        const before = y < rect.top + rect.height / 2;
        if (before) tbody.insertBefore(touchRow, targetRow);
        else        tbody.insertBefore(touchRow, targetRow.nextSibling);
      }, { passive: false });
      handle.addEventListener('touchend', () => {
        if (!touchRow) return;
        touchRow.style.opacity = ''; touchRow.style.background = '';
        salvarOrdemDoTbody(tbody); touchRow = null;
      });
    });
  });
}

async function salvarOrdemDoTbody(tbody){
  const ids = Array.from(tbody.querySelectorAll('tr[data-officer-id]'))
    .map(tr => tr.dataset.officerId).filter(Boolean);
  if (!ids.length) return;
  await aplicarOrdemManual(ids);
  toast('Ordem da turma salva.', 'success');
}

function renderTurma(t, officers){
  const isVirtual = !!t._virtual;
  const isConcluida = !!t.concluida;
  const obs = (t.observacoes || '').trim();
  const titulo = t._tituloCustom || ('Turma ' + t.numero);
  const badgeNum = isVirtual ? '★' : t.numero;

  const rows = officers.length === 0
    ? `<tr><td colspan="13" style="text-align:center;color:var(--g500);padding:28px;font-size:13px">Nenhum policial nesta turma.</td></tr>`
    : officers.map(o => renderOfficerRow(o)).join('');

  const obsBlock = obs ? `
    <div class="turma-obs">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
      <div class="turma-obs-content">
        <div class="turma-obs-label">Observações da Turma</div>
        <div class="turma-obs-text">${escapeHTML(obs)}</div>
      </div>
    </div>` : '';

  return `
    <div class="turma ${isConcluida ? 'concluida' : ''}">
      <div class="turma-head">
        <div class="turma-num">${escapeHTML(badgeNum)}</div>
        <div class="turma-info">
          <div class="turma-title">
            ${escapeHTML(titulo)}
            ${isConcluida ? '<span style="margin-left:8px;font-size:10px;background:#4ade80;color:#052e16;padding:3px 9px;border-radius:20px;font-weight:800;letter-spacing:.5px">✓ CONCLUÍDA</span>' : ''}
          </div>
          <div class="turma-dates">
            ${t.dataInicio ? `<span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
              ${fmtDateShort(t.dataInicio)} a ${fmtDateShort(t.dataFim)}
            </span>` : ''}
          </div>
        </div>
        <div class="turma-count">${officers.length} ${officers.length === 1 ? 'policial' : 'policiais'}</div>
        ${!isVirtual ? `
          <label class="turma-check" title="Marcar turma como concluída" onclick="event.stopPropagation()">
            <input type="checkbox" data-action="toggle-concluida" data-turma="${t.id}" ${isConcluida?'checked':''}>
            <span>Concluída</span>
          </label>
          <div class="turma-actions">
            <button class="btn" title="Incluir policial" data-action="add-to-turma" data-turma="${t.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg> Incluir
            </button>
            <button class="btn btn-export" title="Extrair Excel" data-action="export-turma" data-turma="${t.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg> Extrair Excel
            </button>
            <button class="btn" title="Ordem automática" data-action="reset-ordem" data-turma="${t.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg> Ordem
            </button>
            <button class="btn" title="Editar" data-action="edit-turma" data-turma="${t.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> Editar
            </button>
            <button class="btn" title="Excluir" data-action="del-turma" data-turma="${t.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg> Excluir
            </button>
          </div>` : `
          <div class="turma-actions">
            <button class="btn btn-export" title="Extrair Excel" data-action="export-turma" data-turma="${t.id}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg> Extrair Excel
            </button>
          </div>`}
        <svg class="turma-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      ${obsBlock}
      <div class="turma-body">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th style="width:28px"></th>
              <th>Posto/Grad</th><th>RE</th><th>Dg</th><th>Nome</th><th>TAF</th>
              <th>Cia/Seção</th><th>Nasc.</th><th>Ex. Méd.</th><th>Ex. Odon.</th>
              <th>Val. IAS</th><th>EAD</th><th style="text-align:right">Ações</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>`;
}

function renderOfficerRow(o){
  const tafPill = o.taf === 'IV'
    ? `<span class="pill pill-red" title="${escapeHTML(o.tafIVTipo||'')}">IV — ${escapeHTML(o.tafIVTipo||'Restrição')}</span>`
    : `<span class="pill pill-blue">${escapeHTML(o.taf||'—')}</span>`;

  let ead = '<span class="pill pill-gray">Não inserido</span>';
  if (o.inseridoEAD === 'Sim'){
    if (o.concluiuEAD === 'Sim'){
      ead = `<span class="pill pill-green" title="Nota: ${escapeHTML(o.notaEAD||'—')} • Concluído: ${fmtDate(o.dataConclusaoEAD)}">Concluído${o.notaEAD?` • ${escapeHTML(o.notaEAD)}`:''}</span>`;
    } else {
      ead = `<span class="pill pill-amber">Inserido, não concluiu</span>`;
    }
  }

  return `
    <tr draggable="true" data-officer-id="${o.id}">
      <td class="drag-handle" title="Arraste para reordenar">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/></svg>
      </td>
      <td>${escapeHTML(o.postoGrad||'—')}</td>
      <td class="cell-re">${escapeHTML(o.re||'—')}</td>
      <td>${escapeHTML(o.dg||'—')}</td>
      <td class="cell-nome">${escapeHTML(o.nome||'—')}</td>
      <td>${tafPill}</td>
      <td>${escapeHTML(o.ciaSecao||'—')}</td>
      <td class="cell-muted">${fmtDate(o.dataNascimento)}</td>
      <td class="cell-muted">${fmtDate(o.dataExameMedico)}</td>
      <td class="cell-muted">${fmtDate(o.dataExameOdonto)}</td>
      <td class="cell-muted">${fmtDate(o.validadeIAS)}</td>
      <td>${ead}</td>
      <td>
        <div class="row-actions">
          <button class="row-btn" title="Editar" data-action="edit-officer" data-id="${o.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button class="row-btn danger" title="Excluir" data-action="del-officer" data-id="${o.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>
          </button>
        </div>
      </td>
    </tr>`;
}

async function resetOrdemTurma(turmaId){
  if (!turmaId || String(turmaId).startsWith('__efetivo_')){
    toast('Ação disponível apenas em turmas reais.', 'info');
    return;
  }
  const officers = db.officers.filter(o => o.turmaId === turmaId);
  if (!officers.length){
    toast('Turma sem policiais para reordenar.', 'info');
    return;
  }
  const norm = v => String(v||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  officers.sort((a,b) => {
    const ca = norm(a.ciaSecao), cb = norm(b.ciaSecao);
    if (ca !== cb){
      if (!ca) return 1; if (!cb) return -1;
      return ca.localeCompare(cb, 'pt-BR', { numeric:true });
    }
    const ordemPosto = {}; POSTOS.forEach((p,i)=>{ordemPosto[p]=i;});
    const pa = ordemPosto[a.postoGrad] ?? 999;
    const pb = ordemPosto[b.postoGrad] ?? 999;
    if (pa !== pb) return pa - pb;
    return (a.nome||'').localeCompare(b.nome||'', 'pt-BR');
  });
  officers.forEach((o,i) => { o.ordemManual = i; });
  saveDB();
  await enviarOrdemTurmaSupabase(officers);
  render();
  toast('Ordem automática (Cia/Seção) restaurada.', 'info');
}

async function toggleTurmaConcluida(turmaId, concluida){
  const turma = db.turmas.find(t => t.id === turmaId);
  if (!turma) return;
  turma.concluida = !!concluida;
  saveDB(); render();
  toast(concluida ? `Turma ${turma.numero} CONCLUÍDA.` : `Turma ${turma.numero} reaberta.`,
        concluida ? 'success' : 'info');
  await syncTurmaSupabase(turma);
}

function setActiveTab(cat){
  if (['cb_sd', 'subten_sgt', 'oficiais'].includes(cat)){
    state.lastTurmaCategory = cat;
  }
  state.activeCategory = cat;
  document.body.dataset.cat = cat;

  const isTurma = ['cb_sd', 'subten_sgt', 'oficiais'].includes(cat);
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.cat === cat));
  document.querySelectorAll('.side-nav').forEach(b => {
    if (b.dataset.cat === 'turmas'){
      b.classList.toggle('active', isTurma);
    } else {
      b.classList.toggle('active', b.dataset.cat === cat);
    }
  });
}

// ============================================================
// INSERÇÃO E GESTÃO DE TAF (TAF III e TAF IV)
// ============================================================

function getTafDynamicFields(modalidade, sexo, current = {}){
  const isMasc = (sexo !== 'F');

  const fBarra = `
    <div class="field col-6">
      <label for="taf-barra">Barra Fixa (Quantitativo) <span class="req">*</span></label>
      <input type="number" min="0" step="1" id="taf-barra" name="barra" placeholder="Ex.: 8 repetições" required value="${escapeHTML(current.barra||'')}">
      <span class="hint">Quantidade de repetições corretas (Masculino)</span>
    </div>`;

  const fIsometria = `
    <div class="field col-6">
      <label for="taf-isometria">Isometria na Barra (Segundos e Centésimos) <span class="req">*</span></label>
      <input type="text" id="taf-isometria" name="isometria" placeholder="Ex.: 35.40s" required value="${escapeHTML(current.isometria||'')}">
      <span class="hint">Tempo em segundos e centésimos (Feminino)</span>
    </div>`;

  const fAbdominal = `
    <div class="field col-6">
      <label for="taf-abdominal">Abdominal Remador (Quantitativo) <span class="req">*</span></label>
      <input type="number" min="0" step="1" id="taf-abdominal" name="abdominal" placeholder="Ex.: 42 repetições" required value="${escapeHTML(current.abdominal||'')}">
      <span class="hint">Quantidade de repetições em 1 minuto</span>
    </div>`;

  const fCorrida12 = `
    <div class="field col-6">
      <label for="taf-corrida12">Corrida 12 min (Minutos e Segundos) <span class="req">*</span></label>
      <input type="text" id="taf-corrida12" name="corrida12" placeholder="Ex.: 12:00" required value="${escapeHTML(current.corrida12||'')}">
      <span class="hint">Tempo em minutos e segundos (MM:SS)</span>
    </div>`;

  const fCorrida50 = `
    <div class="field col-6">
      <label for="taf-corrida50">Corrida 50m (Segundos e Centésimos) <span class="req">*</span></label>
      <input type="text" id="taf-corrida50" name="corrida50" placeholder="Ex.: 07.45s" required value="${escapeHTML(current.corrida50||'')}">
      <span class="hint">Tempo em segundos e centésimos (SS.CC)</span>
    </div>`;

  const fNatacao = `
    <div class="field col-6">
      <label for="taf-natacao">Natação (Minutos e Segundos) <span class="req">*</span></label>
      <input type="text" id="taf-natacao" name="natacao" placeholder="Ex.: 01:15" required value="${escapeHTML(current.natacao||'')}">
      <span class="hint">Tempo em minutos e segundos (MM:SS)</span>
    </div>`;

  if (modalidade === 'TAF III'){
    return `
      ${isMasc ? fBarra : fIsometria}
      ${fAbdominal}
      ${fCorrida12}
      ${fCorrida50}
      ${fNatacao}
    `;
  } else if (modalidade === 'TAF IV (Lesão Membros Superiores)'){
    return `
      ${fCorrida12}
      ${fCorrida50}
      ${fAbdominal}
    `;
  } else if (modalidade === 'TAF IV (Lesão Membros Inferiores)'){
    return `
      ${fNatacao}
      ${fAbdominal}
      ${isMasc ? fBarra : fIsometria}
    `;
  } else if (modalidade === 'TAF IV (Coluna Vertebral)'){
    return `
      <div class="field col-12">
        <label for="taf-natacao">Natação (Minutos e Segundos) <span class="req">*</span></label>
        <input type="text" id="taf-natacao" name="natacao" placeholder="Ex.: 01:10" required value="${escapeHTML(current.natacao||'')}">
        <span class="hint">Prova única exigida para Coluna Vertebral (MM:SS)</span>
      </div>
    `;
  }
  return '';
}

function renderInsercaoTAF(container){
  const officersWithTaf = db.officers.filter(o => o.tafResultados).sort((a,b) => {
    return (a.nome||'').localeCompare(b.nome||'', 'pt-BR');
  });

  const rows = officersWithTaf.length === 0
    ? `<tr><td colspan="10" style="text-align:center;color:var(--g500);padding:32px">Nenhum resultado de TAF cadastrado para o ano de ${currentYear}. Utilize o formulário acima para inserir.</td></tr>`
    : officersWithTaf.map(o => {
        const res = o.tafResultados || {};
        let resumo = [];
        if (res.barra)      resumo.push(`Barra: ${escapeHTML(res.barra)} rep`);
        if (res.isometria)  resumo.push(`Isometria: ${escapeHTML(res.isometria)}`);
        if (res.abdominal)  resumo.push(`Abdom.: ${escapeHTML(res.abdominal)} rep`);
        if (res.corrida12)  resumo.push(`C. 12min: ${escapeHTML(res.corrida12)}`);
        if (res.corrida50)  resumo.push(`C. 50m: ${escapeHTML(res.corrida50)}`);
        if (res.natacao)    resumo.push(`Natação: ${escapeHTML(res.natacao)}`);

        return `
          <tr>
            <td><strong>${escapeHTML(o.postoGrad||'—')}</strong></td>
            <td class="cell-re">${escapeHTML(o.re)}</td>
            <td>${escapeHTML(o.dg||'—')}</td>
            <td class="cell-nome">${escapeHTML(o.nome||'—')}</td>
            <td>${escapeHTML(o.ciaSecao||'—')}</td>
            <td><span class="pill ${String(res.modalidade).startsWith('TAF IV') ? 'pill-red' : 'pill-green'}">${escapeHTML(res.modalidade||'TAF III')}</span></td>
            <td><span class="pill pill-blue">${res.sexo === 'F' ? 'Fem' : 'Masc'}</span></td>
            <td style="font-size:12px;line-height:1.4">${resumo.join(' • ')}</td>
            <td class="cell-muted">${res.dataAvaliacao ? fmtDate(res.dataAvaliacao) : '—'}</td>
            <td>
              <div class="row-actions">
                <button class="row-btn" title="Editar resultados" data-taf-action="edit" data-re="${o.re}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button class="row-btn danger" title="Remover TAF" data-taf-action="del" data-re="${o.re}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z"/></svg>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

  container.innerHTML = `
    <div class="taf-container">
      <div class="taf-banner">
        <div class="taf-banner-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>
        <div>
          <h2>Lançamento e Inserção de TAF — Ano ${currentYear}</h2>
          <p>Consulte pelo RE para autocompletar os dados e lançar os índices físicos do policial militar conforme as provas específicas.</p>
        </div>
      </div>

      <div class="taf-grid">
        <!-- CARD 1: IDENTIFICAÇÃO DO POLICIAL -->
        <div class="taf-card">
          <div class="taf-card-head">
            <div class="taf-card-num">1</div>
            <div>
              <h3>Identificação do Policial</h3>
              <p>Digite os 6 dígitos do RE para carregar as informações</p>
            </div>
          </div>
          <div class="taf-card-body">
            <div class="form-grid">
              <div class="field col-6">
                <label for="taf-input-re">Inserir o RE (6 dígitos) <span class="req">*</span></label>
                <input type="text" id="taf-input-re" maxlength="6" pattern="\\d{6}" inputmode="numeric" placeholder="Ex.: 110627" autocomplete="off" autofocus>
                <div id="taf-re-badge" class="re-autofill" role="status">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
                  <span id="taf-re-badge-text">Aguardando digitação</span>
                </div>
              </div>

              <div class="field col-6">
                <label for="taf-select-sexo">Gênero / Sexo para Provas <span class="req">*</span></label>
                <select id="taf-select-sexo">
                  <option value="M">Masculino (Barra Fixa)</option>
                  <option value="F">Feminino (Isometria na Barra)</option>
                </select>
              </div>

              <div class="field col-3">
                <label>DG</label>
                <input type="text" id="taf-dg" readonly placeholder="—" class="input-readonly">
              </div>
              <div class="field col-4">
                <label>Posto / Graduação</label>
                <input type="text" id="taf-postograd" readonly placeholder="—" class="input-readonly">
              </div>
              <div class="field col-5">
                <label>Cia / Seção</label>
                <input type="text" id="taf-ciasecao" readonly placeholder="—" class="input-readonly">
              </div>

              <div class="field col-12">
                <label>Nome Completo</label>
                <input type="text" id="taf-nome" readonly placeholder="—" class="input-readonly">
              </div>

              <div class="field col-12">
                <label for="taf-select-modalidade">Modalidade do TAF <span class="req">*</span></label>
                <select id="taf-select-modalidade">
                  <option value="TAF III">TAF III (Sem restrições)</option>
                  <option value="TAF IV (Lesão Membros Superiores)">TAF IV (Lesão Membros Superiores)</option>
                  <option value="TAF IV (Lesão Membros Inferiores)">TAF IV (Lesão Membros Inferiores)</option>
                  <option value="TAF IV (Coluna Vertebral)">TAF IV (Coluna Vertebral)</option>
                </select>
                <span class="hint">A seleção define quais provas deverão ser informadas.</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CARD 2: RESULTADOS DAS PROVAS -->
        <div class="taf-card">
          <div class="taf-card-head">
            <div class="taf-card-num">2</div>
            <div style="flex:1">
              <h3>Resultados das Provas</h3>
              <p>Insira os índices e tempos correspondentes à modalidade</p>
            </div>
            <span id="taf-modalidade-pill" class="pill pill-green">TAF III</span>
          </div>
          <div class="taf-card-body">
            <form id="taf-form" autocomplete="off">
              <div class="form-grid" id="taf-dynamic-fields">
                ${getTafDynamicFields('TAF III', 'M')}
              </div>

              <div class="section-title" style="margin-top:20px">Dados Complementares</div>
              <div class="form-grid">
                <div class="field col-6">
                  <label for="taf-data-avaliacao">Data da Avaliação</label>
                  <input type="date" id="taf-data-avaliacao" value="${new Date().toISOString().slice(0,10)}">
                </div>
                <div class="field col-6">
                  <label for="taf-avaliador">Avaliador / Observações</label>
                  <input type="text" id="taf-avaliador" placeholder="Ex.: Apto com louvor / Cap PM Silva">
                </div>
              </div>

              <div class="taf-card-actions">
                <button type="button" class="btn btn-outline" id="btn-limpar-taf">Limpar Formulário</button>
                <button type="submit" class="btn btn-primary btn-gold" id="btn-salvar-taf">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  Salvar Resultados do TAF
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- CARD 3: TABELA DE RESULTADOS CADASTRADOS -->
      <div class="taf-table-card">
        <div class="taf-table-head">
          <div>
            <h3>Policiais com TAF Registrado no Ano ${currentYear}</h3>
            <p>Total de ${officersWithTaf.length} policial(is) com índices cadastrados</p>
          </div>
          <button class="btn btn-export" id="btn-export-taf-excel">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6M9 8h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/></svg>
            Exportar Planilha TAF
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Posto/Grad</th>
                <th>RE</th>
                <th>Dg</th>
                <th>Nome</th>
                <th>Cia/Seção</th>
                <th>Modalidade</th>
                <th>Sexo</th>
                <th>Resultados das Provas</th>
                <th>Data</th>
                <th style="text-align:right">Ações</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  bindTafEvents(container);
}

function bindTafEvents(container){
  const reInput        = document.getElementById('taf-input-re');
  const badge          = document.getElementById('taf-re-badge');
  const badgeText      = document.getElementById('taf-re-badge-text');
  const sexoSelect     = document.getElementById('taf-select-sexo');
  const modalidadeSelect = document.getElementById('taf-select-modalidade');
  const modalidadePill = document.getElementById('taf-modalidade-pill');
  const fieldsContainer= document.getElementById('taf-dynamic-fields');
  const tafForm        = document.getElementById('taf-form');
  const btnLimpar      = document.getElementById('btn-limpar-taf');
  const btnExport      = document.getElementById('btn-export-taf-excel');

  let currentOfficer = null;
  let reTimeout;

  function collectCurrentFormValues(){
    const data = {};
    fieldsContainer.querySelectorAll('input').forEach(inp => {
      if (inp.name) data[inp.name] = inp.value;
    });
    return data;
  }

  function updateFields(presetValues = null){
    const mod = modalidadeSelect.value;
    const sexo = sexoSelect.value;
    const vals = presetValues || collectCurrentFormValues();
    fieldsContainer.innerHTML = getTafDynamicFields(mod, sexo, vals);
    if (modalidadePill){
      modalidadePill.textContent = mod;
      modalidadePill.className = 'pill ' + (mod.startsWith('TAF IV') ? 'pill-red' : 'pill-green');
    }
  }

  sexoSelect.addEventListener('change', () => updateFields());
  modalidadeSelect.addEventListener('change', () => updateFields());

  function setOfficerFields(o){
    document.getElementById('taf-dg').value        = o ? (o.dg || '') : '';
    document.getElementById('taf-postograd').value = o ? (o.postoGrad || '') : '';
    document.getElementById('taf-ciasecao').value  = o ? (o.ciaSecao || '') : '';
    document.getElementById('taf-nome').value      = o ? (o.nome || '') : '';
  }

  function limparFormulario(){
    currentOfficer = null;
    reInput.value = '';
    badge.className = 're-autofill';
    setOfficerFields(null);
    sexoSelect.value = 'M';
    modalidadeSelect.value = 'TAF III';
    document.getElementById('taf-data-avaliacao').value = new Date().toISOString().slice(0,10);
    document.getElementById('taf-avaliador').value = '';
    updateFields({});
    reInput.focus();
  }

  if (btnLimpar) btnLimpar.addEventListener('click', limparFormulario);

  reInput.addEventListener('input', () => {
    clearTimeout(reTimeout);
    reTimeout = setTimeout(async () => {
      const re = reInput.value.trim();
      badge.className = 're-autofill';
      if (re.length !== 6){
        setOfficerFields(null);
        currentOfficer = null;
        return;
      }

      let found = db.officers.find(x => x.re === re);
      if (!found && sb){
        try {
          const { data, error } = await sb.from('policiais').select('*').eq('re', re).maybeSingle();
          if (!error && data){
            found = {
              id: uid(), re: data.re, dg: data.dg, postoGrad: data.posto_grad, nome: data.nome,
              ciaSecao: data.cia_secao || '', taf: 'III', categoria: 'cb_sd'
            };
            db.officers.push(found);
            saveDB();
          }
        } catch(e){ console.warn('Busca Supabase TAF:', e); }
      }

      if (found){
        currentOfficer = found;
        setOfficerFields(found);
        badgeText.textContent = `✓ Policial: ${found.postoGrad || ''} ${found.nome || ''}`;
        badge.className = 're-autofill show';

        if (found.tafResultados){
          const r = found.tafResultados;
          sexoSelect.value = r.sexo || 'M';
          if (r.modalidade) modalidadeSelect.value = r.modalidade;
          if (r.dataAvaliacao) document.getElementById('taf-data-avaliacao').value = r.dataAvaliacao;
          if (r.avaliador) document.getElementById('taf-avaliador').value = r.avaliador;
          updateFields(r);
        } else {
          if (found.taf === 'IV'){
            if (found.tafIVTipo === 'Lesão Membros Superiores') modalidadeSelect.value = 'TAF IV (Lesão Membros Superiores)';
            else if (found.tafIVTipo === 'Lesão Membros Inferiores') modalidadeSelect.value = 'TAF IV (Lesão Membros Inferiores)';
            else if (found.tafIVTipo === 'Coluna Vertebral') modalidadeSelect.value = 'TAF IV (Coluna Vertebral)';
            else modalidadeSelect.value = 'TAF IV (Lesão Membros Superiores)';
          } else {
            modalidadeSelect.value = 'TAF III';
          }
          updateFields({});
        }
      } else {
        currentOfficer = null;
        setOfficerFields(null);
        badgeText.textContent = 'RE não encontrado no efetivo cadastrado.';
        badge.className = 're-autofill show warn';
      }
    }, 300);
  });

  tafForm.addEventListener('submit', async e => {
    e.preventDefault();
    const re = reInput.value.trim();
    if (re.length !== 6){
      toast('Informe o RE completo de 6 dígitos.', 'error');
      reInput.focus();
      return;
    }
    if (!currentOfficer){
      toast('Localize um policial válido pelo RE antes de salvar.', 'error');
      reInput.focus();
      return;
    }

    const modalidade = modalidadeSelect.value;
    const sexo = sexoSelect.value;
    const fd = new FormData(tafForm);
    const resultados = {
      modalidade,
      sexo,
      dataAvaliacao: document.getElementById('taf-data-avaliacao').value,
      avaliador: document.getElementById('taf-avaliador').value.trim()
    };

    fieldsContainer.querySelectorAll('input').forEach(inp => {
      if (inp.name) resultados[inp.name] = inp.value.trim();
    });

    currentOfficer.tafResultados = resultados;

    if (modalidade === 'TAF III'){
      currentOfficer.taf = 'III';
      currentOfficer.tafIVTipo = '';
    } else {
      currentOfficer.taf = 'IV';
      currentOfficer.tafIVTipo = modalidade.replace('TAF IV (', '').replace(')', '').trim();
    }

    saveDB();
    renderStats();
    toast(`TAF de ${currentOfficer.nome} salvo com sucesso!`, 'success');
    await syncAlocacaoSupabase(currentOfficer);

    renderContent();
  });

  container.querySelectorAll('[data-taf-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.tafAction;
      const re = btn.dataset.re;
      const o = db.officers.find(x => x.re === re);
      if (!o) return;

      if (action === 'edit'){
        reInput.value = o.re;
        reInput.dispatchEvent(new Event('input'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (action === 'del'){
        if (confirm(`Deseja remover os resultados de TAF de ${o.nome} (RE ${o.re})?`)){
          delete o.tafResultados;
          saveDB();
          renderStats();
          renderContent();
          toast('Resultado de TAF removido.', 'info');
        }
      }
    });
  });

  if (btnExport){
    btnExport.addEventListener('click', () => {
      const officersWithTaf = db.officers.filter(o => o.tafResultados);
      if (!officersWithTaf.length){
        toast('Nenhum resultado de TAF registrado para exportar.', 'error');
        return;
      }

      const headers = [
        'Posto/Grad','RE','DG','Nome','Cia/Seção','Modalidade','Sexo',
        'Barra (quant.)','Isometria (s)','Abdominal (quant.)','Corrida 12min','Corrida 50m (s)','Natação','Data Avaliação','Avaliador/Obs'
      ];

      const rows = [headers];
      officersWithTaf.forEach(o => {
        const r = o.tafResultados || {};
        rows.push([
          o.postoGrad || '',
          o.re || '',
          o.dg || '',
          o.nome || '',
          o.ciaSecao || '',
          r.modalidade || '',
          r.sexo === 'F' ? 'Feminino' : 'Masculino',
          r.barra || '',
          r.isometria || '',
          r.abdominal || '',
          r.corrida12 || '',
          r.corrida50 || '',
          r.natacao || '',
          r.dataAvaliacao ? fmtDate(r.dataAvaliacao) : '',
          r.avaliador || ''
        ]);
      });

      downloadXLSX([{ name: `TAF ${currentYear}`, rows }], `EAP${currentYear}_Resultados_TAF_${todayStamp()}.xlsx`);
      toast(`${officersWithTaf.length} registro(s) de TAF exportados com sucesso!`, 'success');
    });
  }
} 