/* ============================================================
   MODALS.JS
   Janelas pop-up (cadastro de policial e de turma).
   ============================================================ */

function openModal({ title, bodyHTML, footerHTML, size='' }){
  const root = document.getElementById('modal-root');
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal ${size}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div class="modal-head">
        <h2 id="modal-title">${escapeHTML(title)}</h2>
        <button class="modal-close" data-close title="Fechar janela (Esc)" aria-label="Fechar janela">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${footerHTML ? `<div class="modal-foot">${footerHTML}</div>` : ''}
    </div>`;
  root.innerHTML = '';
  root.appendChild(overlay);

  const onEsc = e => {
    if (e.key === 'Escape'){
      close();
    }
  };

  const close = () => {
    document.removeEventListener('keydown', onEsc);
    root.innerHTML = '';
  };

  document.addEventListener('keydown', onEsc);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));

  // Foca automaticamente no primeiro elemento editável
  setTimeout(() => {
    const firstField = overlay.querySelector('input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled])');
    if (firstField) firstField.focus();
  }, 60);

  return { close, overlay };
}

// ============ MODAL DE POLICIAL ============
function openOfficerModal(officer = null, presetTurmaId = null){
  const isEdit = !!officer;
  const categoriaInicial = isEdit ? officer.categoria : (state.activeCategory === 'efetivo' ? 'cb_sd' : state.activeCategory);
  const o = officer || {
    categoria: categoriaInicial, turmaId: presetTurmaId || '',
    postoGrad:'', re:'', dg:'', nome:'', taf:'III', tafIVTipo:'', ciaSecao:'',
    dataNascimento:'', dataExameMedico:'', dataExameOdonto:'', validadeIAS:'',
    inseridoEAD:'Não', concluiuEAD:'Não', notaEAD:'', dataConclusaoEAD:''
  };

  const turmas = db.turmas.filter(t => t.categoria === o.categoria).sort(sortTurmas);
  const turmaOptions = ['<option value="">— Sem turma (Efetivo 3º B.C.) —</option>']
    .concat(turmas.map(t => `<option value="${t.id}" ${t.id===o.turmaId?'selected':''}>Turma ${escapeHTML(t.numero)}</option>`)).join('');
  const catOptions = REAL_CATEGORIES.map(c =>
    `<option value="${c.id}" ${c.id===o.categoria?'selected':''}>${c.label}</option>`).join('');
  const postosOptions = POSTOS.map(p => `<option value="${p}">`).join('');
  const tafIVOptions = TAF_IV_OPTIONS.map(t =>
    `<option value="${t}" ${t===o.tafIVTipo?'selected':''}>${t}</option>`).join('');

  const body = `
    <form id="officer-form" autocomplete="off">
      <div class="form-grid">
        <div class="field col-6">
          <label for="f-categoria">Categoria <span class="req">*</span></label>
          <select id="f-categoria" name="categoria" required>${catOptions}</select>
        </div>
        <div class="field col-6">
          <label for="f-turmaId">Turma</label>
          <select id="f-turmaId" name="turmaId">${turmaOptions}</select>
          <span class="hint">Deixe em "Sem turma" para o policial aparecer apenas no Efetivo 3º B.C.</span>
        </div>
        <div class="section-title">Identificação</div>
        <div class="field col-4">
          <label for="f-postoGrad">Posto / Graduação <span class="req">*</span></label>
          <input id="f-postoGrad" name="postoGrad" list="postos" required value="${escapeHTML(o.postoGrad)}" placeholder="Ex.: 1° SGT PM">
          <datalist id="postos">${postosOptions}</datalist>
        </div>
        <div class="field col-4">
          <label for="f-re">RE <span class="req">*</span></label>
          <input id="f-re" name="re" maxlength="6" pattern="\\d{6}" inputmode="numeric" required
                 value="${escapeHTML(o.re)}" placeholder="6 dígitos">
          <div class="re-autofill" id="re-autofill" role="status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
            <span id="re-autofill-text">Dados preenchidos automaticamente</span>
          </div>
        </div>
        <div class="field col-4">
          <label for="f-dg">Dg <span class="req">*</span></label>
          <input id="f-dg" name="dg" maxlength="1" required value="${escapeHTML(o.dg)}" placeholder="Ex.: A">
        </div>
        <div class="field col-12">
          <label for="f-nome">Nome Completo <span class="req">*</span></label>
          <input id="f-nome" name="nome" required value="${escapeHTML(o.nome)}" placeholder="Nome de guerra ou completo">
        </div>
        <div class="field col-6">
          <label for="f-ciaSecao">Cia / Seção <span class="req">*</span></label>
          <input id="f-ciaSecao" name="ciaSecao" required value="${escapeHTML(o.ciaSecao)}" placeholder="Ex.: 3 CIA PM">
        </div>
        <div class="field col-3">
          <label for="f-taf">TAF <span class="req">*</span></label>
          <select id="f-taf" name="taf" required>
            <option value="III" ${o.taf==='III'?'selected':''}>III</option>
            <option value="IV"  ${o.taf==='IV'?'selected':''}>IV</option>
          </select>
        </div>
        <div class="field col-3"></div>
        <div class="conditional-group" id="taf-iv-group">
          <div class="field col-12">
            <label for="tafIVTipo">Tipo de Restrição (TAF IV) <span class="req">*</span></label>
            <select name="tafIVTipo" id="tafIVTipo">
              <option value="">— Selecione a restrição —</option>
              ${tafIVOptions}
            </select>
          </div>
        </div>
        <div class="section-title">Datas e Exames</div>
        <div class="field col-3"><label for="f-dataNascimento">Nascimento</label><input type="date" id="f-dataNascimento" name="dataNascimento" value="${o.dataNascimento||''}"></div>
        <div class="field col-3"><label for="f-dataExameMedico">Exame Médico</label><input type="date" id="f-dataExameMedico" name="dataExameMedico" value="${o.dataExameMedico||''}"></div>
        <div class="field col-3"><label for="f-dataExameOdonto">Exame Odontológico</label><input type="date" id="f-dataExameOdonto" name="dataExameOdonto" value="${o.dataExameOdonto||''}"></div>
        <div class="field col-3"><label for="f-validadeIAS">Validade IAS</label><input type="date" id="f-validadeIAS" name="validadeIAS" value="${o.validadeIAS||''}"></div>
        <div class="section-title">EAD (Ensino a Distância)</div>
        <div class="field col-6">
          <label id="lbl-inserido">Inserido no EAD?</label>
          <label class="checkbox-wrap ${o.inseridoEAD==='Sim'?'checked':''}" id="wrap-inserido">
            <input type="checkbox" name="inseridoEAD" id="inseridoEAD" aria-labelledby="lbl-inserido" ${o.inseridoEAD==='Sim'?'checked':''}>
            <span>Sim, inserido no EAD</span>
          </label>
        </div>
        <div class="field col-6">
          <label id="lbl-concluiu">Concluiu o EAD?</label>
          <label class="checkbox-wrap ${o.concluiuEAD==='Sim'?'checked':''}" id="wrap-concluiu">
            <input type="checkbox" name="concluiuEAD" id="concluiuEAD" aria-labelledby="lbl-concluiu" ${o.concluiuEAD==='Sim'?'checked':''}>
            <span>Sim, concluiu o EAD</span>
          </label>
        </div>
        <div class="conditional-group" id="ead-concluido-group">
          <div class="field col-4"><label for="f-notaEAD">Nota EAD</label><input id="f-notaEAD" name="notaEAD" value="${escapeHTML(o.notaEAD)}" placeholder="Ex.: 9,5"></div>
          <div class="field col-8"><label for="f-dataConclusaoEAD">Data de Conclusão do EAD</label><input type="date" id="f-dataConclusaoEAD" name="dataConclusaoEAD" value="${o.dataConclusaoEAD||''}"></div>
        </div>
      </div>
    </form>`;

  const footer = `
    <button class="btn btn-outline" data-close type="button">Cancelar</button>
    <button class="btn btn-primary" id="save-officer" type="button">${isEdit?'Salvar Alterações':'Adicionar Policial'}</button>`;

  const { close } = openModal({
    title: isEdit ? 'Editar Policial' : 'Novo Policial',
    bodyHTML: body, footerHTML: footer
  });

  const form        = document.getElementById('officer-form');
  const tafSel      = form.querySelector('[name="taf"]');
  const tafIVGroup  = document.getElementById('taf-iv-group');
  const tafIVSel    = document.getElementById('tafIVTipo');
  const inseridoSel = form.querySelector('[name="inseridoEAD"]');
  const concluiuSel = form.querySelector('[name="concluiuEAD"]');
  const wrapInserido = document.getElementById('wrap-inserido');
  const wrapConcluiu = document.getElementById('wrap-concluiu');
  const eadGroup    = document.getElementById('ead-concluido-group');
  const reInput     = form.querySelector('[name="re"]');
  const autoFillBadge = document.getElementById('re-autofill');
  const autoFillText  = document.getElementById('re-autofill-text');
  const catSel      = form.querySelector('[name="categoria"]');
  const turmaSel    = form.querySelector('[name="turmaId"]');

  function refreshTurmas(){
    const lista = db.turmas.filter(t => t.categoria === catSel.value).sort(sortTurmas);
    const atual = turmaSel.value;
    turmaSel.innerHTML = '<option value="">— Sem turma (Efetivo 3º B.C.) —</option>' +
      lista.map(t => `<option value="${t.id}">Turma ${escapeHTML(t.numero)}</option>`).join('');
    if (atual && lista.find(t => t.id === atual)) turmaSel.value = atual;
  }
  catSel.addEventListener('change', refreshTurmas);

  function updateTafIV(){
    const isIV = tafSel.value === 'IV';
    tafIVGroup.classList.toggle('show', isIV);
    tafIVSel.required = isIV;
  }
  function updateEAD(){
    const showEAD = concluiuSel.checked;
    eadGroup.classList.toggle('show', showEAD);
    form.querySelector('[name="notaEAD"]').disabled          = !showEAD;
    form.querySelector('[name="dataConclusaoEAD"]').disabled = !showEAD;
    wrapInserido.classList.toggle('checked', inseridoSel.checked);
    wrapConcluiu.classList.toggle('checked', concluiuSel.checked);
  }
  tafSel.addEventListener('change', updateTafIV);
  inseridoSel.addEventListener('change', () => { if (!inseridoSel.checked) concluiuSel.checked = false; updateEAD(); });
  concluiuSel.addEventListener('change', () => { if (concluiuSel.checked) inseridoSel.checked = true; updateEAD(); });
  updateTafIV(); updateEAD();

  // Auto-preenchimento por RE (consulta Supabase e depois local)
  let autoFillTimeout;
  reInput.addEventListener('input', async () => {
    clearTimeout(autoFillTimeout);
    autoFillTimeout = setTimeout(async () => {
      const re = reInput.value.trim();
      autoFillBadge.classList.remove('show', 'warn', 'info');
      if (re.length !== 6) return;

      let found = null, origem = '';
      if (sb){
        try {
          const { data, error } = await sb.from('policiais').select('*').eq('re', re).maybeSingle();
          if (!error && data){
            found = {
              re: data.re, dg: data.dg, postoGrad: data.posto_grad, nome: data.nome,
              ciaSecao: data.cia_secao || '', dataNascimento: data.data_nascimento || '',
              dataExameOdonto: data.ias_odonto || '', dataExameMedico: data.ias_medico || '',
              validadeIAS: data.validade_ias || ''
            };
            origem = 'supabase';
          }
        } catch(e){ console.warn('Falha ao consultar Supabase:', e); }
      }
      if (!found){
        const localFound = db.officers.find(x => x.re === re && (!officer || x.id !== officer.id));
        if (localFound){ found = localFound; origem = 'local'; }
      }
      if (!found) return;

      const setVal = (name, val) => { const el = form.elements[name]; if (el) el.value = val || ''; };
      setVal('dg', found.dg); setVal('nome', found.nome);
      setVal('ciaSecao', found.ciaSecao || form.elements.ciaSecao.value);
      setVal('postoGrad', found.postoGrad); setVal('dataNascimento', found.dataNascimento);
      setVal('dataExameMedico', found.dataExameMedico); setVal('dataExameOdonto', found.dataExameOdonto);
      setVal('validadeIAS', found.validadeIAS);

      if (found.categoria){
        catSel.value = found.categoria; refreshTurmas();
        turmaSel.value = found.turmaId || '';
      }
      if (found.taf){
        form.elements.taf.value = found.taf;
        if (found.taf === 'IV') form.elements.tafIVTipo.value = found.tafIVTipo || '';
        else                    form.elements.tafIVTipo.value = '';
      }
      if (origem === 'local'){
        inseridoSel.checked = (found.inseridoEAD === 'Sim');
        concluiuSel.checked = (found.concluiuEAD === 'Sim');
        if (concluiuSel.checked){
          form.elements.notaEAD.value          = found.notaEAD || '';
          form.elements.dataConclusaoEAD.value = found.dataConclusaoEAD || '';
        } else {
          form.elements.notaEAD.value = ''; form.elements.dataConclusaoEAD.value = '';
        }
      }
      updateTafIV(); updateEAD();
      if (origem === 'supabase'){
        autoFillText.textContent = 'Dados carregados da base central (Supabase)';
        autoFillBadge.classList.add('show');
      } else {
        autoFillText.textContent = 'Dados carregados do cache local';
        autoFillBadge.classList.add('show', 'warn');
      }
    }, 350);
  });

  document.getElementById('save-officer').addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    data.inseridoEAD = inseridoSel.checked ? 'Sim' : 'Não';
    data.concluiuEAD = concluiuSel.checked ? 'Sim' : 'Não';
    if (data.taf !== 'IV') data.tafIVTipo = '';
    if (data.concluiuEAD !== 'Sim'){ data.notaEAD=''; data.dataConclusaoEAD=''; }
    if (data.inseridoEAD !== 'Sim'){ data.concluiuEAD='Não'; data.notaEAD=''; data.dataConclusaoEAD=''; }
    if (isEdit) data.ordemManual = officer.ordemManual;

    let enviadoBase = false;
    if (sb){
      try {
        const { error } = await sb.rpc('importar_policial', {
          p_re: data.re, p_dg: data.dg, p_posto_grad: data.postoGrad,
          p_nome: data.nome, p_su: null, p_cia_secao: data.ciaSecao || null,
          p_data_nascimento: data.dataNascimento || null,
          p_ias_odonto: data.dataExameOdonto || null,
          p_ias_medico: data.dataExameMedico || null,
          p_validade_ias: data.validadeIAS || null
        });
        if (!error) enviadoBase = true;
      } catch(e){ console.warn('Falha RPC:', e); }
    }

    let finalOfficer;
    if (isEdit){
      Object.assign(officer, data);
      finalOfficer = officer;
      toast('Policial atualizado.' + (enviadoBase ? ' Base central sincronizada.' : ''), 'success');
    } else {
      const existing = db.officers.find(x => x.re === data.re);
      if (existing){
        Object.assign(existing, data);
        finalOfficer = existing;
        toast('Policial atualizado (RE já cadastrado).', 'success');
      } else {
        data.id = uid();
        db.officers.push(data);
        finalOfficer = data;
        toast('Policial adicionado.', 'success');
      }
    }
    saveDB(); render(); close();
    await syncAlocacaoSupabase(finalOfficer);
  });
}

// ============ MODAL DE TURMA ============
function openTurmaModal(turma = null){
  const isEdit = !!turma;
  const categoria = isEdit ? turma.categoria : (state.activeCategory === 'efetivo' ? 'cb_sd' : state.activeCategory);
  const proximaNum = isEdit ? turma.numero : proximaNumeracaoTurma(categoria);
  const t = turma || { categoria, numero: proximaNum, dataInicio: '', dataFim: '', observacoes: '' };

  const catOptions = REAL_CATEGORIES.map(c =>
    `<option value="${c.id}" ${c.id===t.categoria?'selected':''}>${c.label}</option>`).join('');

  const body = `
    <form id="turma-form">
      <div class="form-grid">
        <div class="field col-6">
          <label for="t-categoria">Categoria <span class="req">*</span></label>
          <select id="t-categoria" name="categoria" required ${isEdit?'disabled':''}>${catOptions}</select>
        </div>
        <div class="field col-6">
          <label for="t-numero">Identificação da Turma <span class="req">*</span></label>
          <input id="t-numero" name="numero" required value="${escapeHTML(t.numero)}" placeholder="Ex.: I, II, III, IC...">
          ${!isEdit ? `
            <div class="auto-number-badge" id="auto-num-badge" role="status">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>
              Sugestão automática: <strong style="margin-left:3px">${escapeHTML(proximaNum)}</strong>
            </div>` : ''}
        </div>
        <div class="field col-6">
          <label for="dataInicio">Data de Início <span class="req">*</span></label>
          <input type="date" name="dataInicio" id="dataInicio" required value="${t.dataInicio||''}">
        </div>
        <div class="field col-6">
          <label for="dataFim">Data de Término</label>
          <input type="date" name="dataFim" id="dataFim" value="${t.dataFim||''}" readonly>
          <span class="hint">Preenchida automaticamente — duração de 3 dias.</span>
        </div>
        <div class="field col-12">
          <label for="t-observacoes">Observações da Turma</label>
          <textarea id="t-observacoes" name="observacoes" rows="4" placeholder="Adicione avisos ou notas específicas para esta turma...">${escapeHTML(t.observacoes||'')}</textarea>
        </div>
      </div>
    </form>`;

  const footer = `
    <button class="btn btn-outline" data-close type="button">Cancelar</button>
    <button class="btn btn-primary" id="save-turma" type="button">${isEdit?'Salvar Alterações':'Criar Turma'}</button>`;

  const { close } = openModal({
    title: isEdit ? `Editar Turma ${turma.numero}` : `Nova Turma — ${(CATEGORIES.find(c=>c.id===categoria)||{}).label || ''}`,
    bodyHTML: body, footerHTML: footer, size: 'sm'
  });

  const form   = document.getElementById('turma-form');
  const inicio = document.getElementById('dataInicio');
  const fim    = document.getElementById('dataFim');
  const numInput = form.querySelector('[name="numero"]');
  const autoBadge = document.getElementById('auto-num-badge');
  const catSel = form.querySelector('[name="categoria"]');

  if (!isEdit){
    catSel.addEventListener('change', () => {
      const nova = proximaNumeracaoTurma(catSel.value);
      numInput.value = nova;
      if (autoBadge){
        autoBadge.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>Sugestão automática: <strong style="margin-left:3px">${escapeHTML(nova)}</strong>`;
      }
    });
    numInput.addEventListener('input', () => { if (autoBadge) autoBadge.style.display = 'none'; });
  }
  inicio.addEventListener('change', () => { fim.value = inicio.value ? addDays(inicio.value, 2) : ''; });
  if (inicio.value) fim.value = addDays(inicio.value, 2);

  document.getElementById('save-turma').addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    const fd = new FormData(form);
    const data = {
      categoria:  isEdit ? turma.categoria : fd.get('categoria'),
      numero:     fd.get('numero').trim(),
      dataInicio: fd.get('dataInicio'),
      dataFim:    fd.get('dataFim') || addDays(fd.get('dataInicio'), 2),
      observacoes: (fd.get('observacoes') || '').trim()
    };
    if (isEdit){
      Object.assign(turma, data);
      toast('Turma atualizada.', 'success');
      saveDB(); render(); close();
      await syncTurmaSupabase(turma);
    } else {
      data.id = uid();
      data.concluida = false;
      db.turmas.push(data);
      toast(`Turma ${data.numero} criada.`, 'success');
      saveDB(); render(); close();
      await syncTurmaSupabase(data);
    }
  });
}

// ============ CONFIRMAÇÕES ============
function confirmDeleteOfficer(id){
  const o = db.officers.find(x => x.id === id);
  if (!o) return;
  const { close } = openModal({
    title: 'Confirmar Exclusão',
    bodyHTML: `<p style="font-size:14px;line-height:1.6">Deseja excluir o policial <strong>${escapeHTML(o.nome)}</strong> (RE ${escapeHTML(o.re)}) deste ano?</p>`,
    footerHTML: `<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-danger" id="confirm-del">Excluir</button>`,
    size: 'sm'
  });
  document.getElementById('confirm-del').addEventListener('click', async () => {
    db.officers = db.officers.filter(x => x.id !== id);
    saveDB(); render(); close();
    toast('Policial removido.', 'info');
    await deleteAlocacaoSupabase(o.re);
  });
}

function confirmDeleteTurma(id){
  const t = db.turmas.find(x => x.id === id);
  if (!t) return;
  const count = db.officers.filter(o => o.turmaId === id).length;
  const { close } = openModal({
    title: 'Excluir Turma',
    bodyHTML: `<p style="font-size:14px;line-height:1.6">Deseja excluir a <strong>Turma ${escapeHTML(t.numero)}</strong>?
      ${count>0 ? `<br><span style="color:var(--red);font-size:13px">Atenção: ${count} policial(is) ficarão sem turma.</span>` : ''}</p>`,
    footerHTML: `<button class="btn btn-outline" data-close>Cancelar</button><button class="btn btn-danger" id="confirm-del">Excluir Turma</button>`,
    size: 'sm'
  });
  document.getElementById('confirm-del').addEventListener('click', async () => {
    db.turmas = db.turmas.filter(x => x.id !== id);
    db.officers.forEach(o => { if (o.turmaId === id) o.turmaId = ''; });
    saveDB(); render(); close();
    toast('Turma removida.', 'info');
    await deleteTurmaSupabase(id);
  });
}