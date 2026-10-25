/* ============================================================
   MATRICULAS.JS — Gestão de Matrículas
   - Aprovar  → grava em eap_alocacoes (o policial entra na turma)
   - Reprovar → mantém status='confirmada' e aprovacao='reprovada'
                (o policial vê em "Matrículas Devolvidas" no app)
   ============================================================ */

const stateMatriculas = {
  tab: 'matriculas',
  filtro: 'todas',
  search: '',
  loading: false,
  loaded: false,
  loadedYear: null,
  matriculas: [],
  log: [],
  policiais: {}
};

const ACAO_LABEL_GESTAO = {
  criada:                   { txt: 'Matrícula criada',       cls: 'pill-blue'  },
  cancelada:                { txt: 'Cancelada',              cls: 'pill-amber' },
  reativada:                { txt: 'Reativada',              cls: 'pill-green' },
  atualizada:               { txt: 'Atualizada',             cls: 'pill-blue'  },
  excluida:                 { txt: 'Excluída',               cls: 'pill-red'   },
  tentativa_duplicada:      { txt: 'Tentativa duplicada',    cls: 'pill-red'   },
  tentativa_re_inexistente: { txt: 'RE inexistente',         cls: 'pill-amber' },
  aprovada:                 { txt: 'Aprovada',               cls: 'pill-green' },
  reprovada:                { txt: 'Reprovada',              cls: 'pill-red'   },
  reenviada:                { txt: 'Reenviada',              cls: 'pill-blue'  }
};

const APROVACAO_LABEL = {
  pendente:  { txt: 'Pendente',  cls: 'pill-amber' },
  aprovada:  { txt: 'Aprovada',  cls: 'pill-green' },
  reprovada: { txt: 'Reprovada', cls: 'pill-red'   }
};

function inferirCategoriaGestao(postoGrad){
  if (!postoGrad) return 'cb_sd';
  const s = String(postoGrad).toUpperCase();
  if (/(CEL|MAJ|CAP|TEN)\s*PM/.test(s) && !/SUB/.test(s)) return 'oficiais';
  if (/(SUB|SGT)/.test(s)) return 'subten_sgt';
  return 'cb_sd';
}

async function getCurrentUserGestao(){
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getUser();
    return data && data.user ? data.user : null;
  } catch(e){ return null; }
}

async function carregarMatriculasGestao(){
  if (!sb) return;
  stateMatriculas.loading = true;
  try {
    const { data: mats, error: errM } = await sb.from('eap_matriculas')
      .select('*').eq('ano', currentYear)
      .order('created_at', { ascending: false });
    if (errM) throw errM;
    stateMatriculas.matriculas = mats || [];

    const res = Array.from(new Set(stateMatriculas.matriculas.map(m => String(m.re))));
    stateMatriculas.policiais = {};
    if (res.length){
      const { data: pols, error: errP } = await sb.from('policiais')
        .select('re,dg,posto_grad,nome,cia_secao').in('re', res);
      if (errP) console.warn('[gestao] policiais:', errP);
      (pols || []).forEach(p => { stateMatriculas.policiais[String(p.re)] = p; });
    }

    const { data: logs, error: errL } = await sb.from('vw_eap_matriculas_log_auditoria')
      .select('*').eq('ano', currentYear)
      .order('created_at', { ascending: false }).limit(300);
    if (errL) console.warn('[gestao] log:', errL);
    stateMatriculas.log = logs || [];

    stateMatriculas.loaded = true;
    stateMatriculas.loadedYear = currentYear;
  } catch(e){
    console.error('[gestao] falha:', e);
    toast('Falha ao carregar matrículas: ' + (e.message || e), 'error');
  } finally {
    stateMatriculas.loading = false;
  }
}

async function renderGestaoMatriculas(container){
  if (stateMatriculas.loadedYear !== currentYear) stateMatriculas.loaded = false;

  if (!stateMatriculas.loaded){
    container.innerHTML = `
      <div class="empty-state">
        <div style="width:48px;height:48px;border:3px solid var(--g200);border-top-color:var(--navy-600);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px"></div>
        <p>Carregando matrículas...</p>
      </div>`;
    await carregarMatriculasGestao();
  }

  const ativas = stateMatriculas.matriculas.filter(m => m.status === 'confirmada');
  const pendentes  = ativas.filter(m => (m.aprovacao || 'pendente') === 'pendente');
  const aprovadas  = ativas.filter(m => m.aprovacao === 'aprovada');
  const reprovadas = ativas.filter(m => m.aprovacao === 'reprovada');

  container.innerHTML = `
    <div class="gestao-wrap">
      <div class="stats-row" style="margin-bottom:22px">
        <div class="stat cat-primary"><span class="stat-label">Total do Ano</span><span class="stat-value">${ativas.length}</span></div>
        <div class="stat amber"><span class="stat-label">Pendentes</span><span class="stat-value">${pendentes.length}</span></div>
        <div class="stat green"><span class="stat-label">Aprovadas</span><span class="stat-value">${aprovadas.length}</span></div>
        <div class="stat red"><span class="stat-label">Devolvidas</span><span class="stat-value">${reprovadas.length}</span></div>
      </div>

      <div class="gestao-tabs">
        <button class="gestao-tab ${stateMatriculas.tab === 'matriculas' ? 'active' : ''}" data-gestao-tab="matriculas">Matrículas</button>
        <button class="gestao-tab ${stateMatriculas.tab === 'log' ? 'active' : ''}" data-gestao-tab="log">Log de Auditoria</button>
      </div>

      <div id="gestao-body">
        ${stateMatriculas.tab === 'matriculas'
          ? renderTabelaMatriculas(pendentes, aprovadas, reprovadas)
          : renderTabelaLog()}
      </div>
    </div>
  `;

  bindGestaoEvents(container);
}

function renderTabelaMatriculas(pendentes, aprovadas, reprovadas){
  let lista = stateMatriculas.matriculas.filter(m => m.status === 'confirmada');
  if (stateMatriculas.filtro === 'pendentes')  lista = pendentes;
  else if (stateMatriculas.filtro === 'aprovadas')  lista = aprovadas;
  else if (stateMatriculas.filtro === 'reprovadas') lista = reprovadas;

  const q = stateMatriculas.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  if (q){
    lista = lista.filter(m => {
      const p = stateMatriculas.policiais[String(m.re)] || {};
      return [m.re, p.nome, p.cia_secao, p.posto_grad, m.turma_numero].map(v =>
        String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      ).join(' ').includes(q);
    });
  }

  const rows = lista.length === 0
    ? '<tr><td colspan="8" class="empty">Nenhuma matrícula encontrada.</td></tr>'
    : lista.map(m => {
        const p = stateMatriculas.policiais[String(m.re)] || {};
        const apr = APROVACAO_LABEL[m.aprovacao || 'pendente'] || APROVACAO_LABEL.pendente;
        const pend = (m.aprovacao || 'pendente') === 'pendente';
        return `
          <tr>
            <td class="cell-re">${escapeHTML(m.re)}${p.dg ? '-' + escapeHTML(p.dg) : ''}</td>
            <td>${escapeHTML(p.posto_grad||'—')}</td>
            <td class="cell-nome">${escapeHTML(p.nome||'—')}</td>
            <td>${escapeHTML(p.cia_secao||'—')}</td>
            <td>${m.turma_numero ? `<span class="pill pill-blue">Turma ${escapeHTML(m.turma_numero)}</span>` : '<span class="cell-muted">—</span>'}</td>
            <td><span class="pill ${apr.cls}">${apr.txt}</span></td>
            <td class="cell-muted">${fmtDate(m.created_at)}</td>
            <td>
              <div class="row-actions">
                ${pend ? `
                  <button class="row-btn" title="Aprovar e alocar na turma" data-gestao-action="aprovar" data-id="${m.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button class="row-btn danger" title="Reprovar (devolver)" data-gestao-action="reprovar" data-id="${m.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                ` : `
                  <button class="row-btn" title="Reabrir para análise" data-gestao-action="reabrir" data-id="${m.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                  </button>
                `}
                <button class="row-btn" title="Ver detalhes" data-gestao-action="detalhes" data-id="${m.id}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </button>
              </div>
            </td>
          </tr>`;
      }).join('');

  return `
    <div class="gestao-toolbar">
      <div class="search-box" style="flex:1;min-width:200px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input type="search" id="gestao-search" placeholder="Buscar por RE, nome, Cia, turma..." value="${escapeHTML(stateMatriculas.search)}">
      </div>
      <div class="gestao-filtros">
        <button class="gestao-filtro ${stateMatriculas.filtro==='todas'?'active':''}" data-filtro="todas">Todas</button>
        <button class="gestao-filtro ${stateMatriculas.filtro==='pendentes'?'active':''}" data-filtro="pendentes">Pendentes (${pendentes.length})</button>
        <button class="gestao-filtro ${stateMatriculas.filtro==='aprovadas'?'active':''}" data-filtro="aprovadas">Aprovadas</button>
        <button class="gestao-filtro ${stateMatriculas.filtro==='reprovadas'?'active':''}" data-filtro="reprovadas">Devolvidas</button>
      </div>
      <button class="btn btn-outline" id="btn-atualizar-gestao">Atualizar</button>
      <button class="btn btn-export" id="btn-export-gestao">Exportar Excel</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>RE</th><th>Posto/Grad</th><th>Nome</th><th>Cia/Seção</th>
          <th>Turma</th><th>Aprovação</th><th>Data Matrícula</th>
          <th style="text-align:right">Ações</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderTabelaLog(){
  const q = stateMatriculas.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let lista = stateMatriculas.log;
  if (q){
    lista = lista.filter(l => {
      const det = l.detalhes || {};
      return [l.re, l.policial_nome, l.policial_cia, l.feito_por_email, l.acao, det.turma_numero].map(v =>
        String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
      ).join(' ').includes(q);
    });
  }

  const rows = lista.length === 0
    ? '<tr><td colspan="6" class="empty">Sem registros de auditoria.</td></tr>'
    : lista.map(l => {
        const meta = ACAO_LABEL_GESTAO[l.acao] || { txt: l.acao, cls: 'pill-blue' };
        const dt = l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '—';
        const det = l.detalhes || {};
        const alvo = l.re
          ? `${escapeHTML(l.re)}${l.policial_nome ? ' — ' + escapeHTML(l.policial_nome) : ''}${det.turma_numero ? ` <span class="pill pill-blue" style="font-size:10px">T ${escapeHTML(det.turma_numero)}</span>` : ''}`
          : '—';
        return `
          <tr>
            <td class="cell-muted">${dt}</td>
            <td><span class="pill ${meta.cls}">${meta.txt}</span></td>
            <td>${alvo}</td>
            <td class="cell-muted">${escapeHTML(l.feito_por_email || '—')}</td>
            <td class="cell-muted">${l.status_anterior || '—'} → ${l.status_novo || '—'}</td>
            <td style="text-align:right">
              <button class="btn btn-outline" style="padding:6px 12px;font-size:12px"
                      data-gestao-detalhes="${escapeHTML(JSON.stringify(det))}">Ver</button>
            </td>
          </tr>`;
      }).join('');

  return `
    <div class="gestao-toolbar">
      <div class="search-box" style="flex:1;min-width:200px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
        <input type="search" id="gestao-search" placeholder="Buscar no log..." value="${escapeHTML(stateMatriculas.search)}">
      </div>
      <button class="btn btn-outline" id="btn-atualizar-log">Atualizar</button>
      <button class="btn btn-export" id="btn-export-log-gestao">Exportar Log em Excel</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Data / Hora</th><th>Ação</th><th>RE — Policial</th>
          <th>Feito por</th><th>Status</th>
          <th style="text-align:right">Detalhes</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function bindGestaoEvents(container){
  container.querySelectorAll('[data-gestao-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      stateMatriculas.tab = btn.dataset.gestaoTab;
      stateMatriculas.search = '';
      renderGestaoMatriculas(container);
    });
  });

  container.querySelectorAll('[data-filtro]').forEach(btn => {
    btn.addEventListener('click', () => {
      stateMatriculas.filtro = btn.dataset.filtro;
      const body = document.getElementById('gestao-body');
      if (body){
        const ativas = stateMatriculas.matriculas.filter(m => m.status === 'confirmada');
        const pendentes  = ativas.filter(m => (m.aprovacao || 'pendente') === 'pendente');
        const aprovadas  = ativas.filter(m => m.aprovacao === 'aprovada');
        const reprovadas = ativas.filter(m => m.aprovacao === 'reprovada');
        body.innerHTML = renderTabelaMatriculas(pendentes, aprovadas, reprovadas);
        bindGestaoEvents(body);
      }
    });
  });

  const search = document.getElementById('gestao-search');
  if (search){
    search.addEventListener('input', e => {
      stateMatriculas.search = e.target.value;
      const body = document.getElementById('gestao-body');
      if (body){
        const ativas = stateMatriculas.matriculas.filter(m => m.status === 'confirmada');
        const pendentes  = ativas.filter(m => (m.aprovacao || 'pendente') === 'pendente');
        const aprovadas  = ativas.filter(m => m.aprovacao === 'aprovada');
        const reprovadas = ativas.filter(m => m.aprovacao === 'reprovada');
        body.innerHTML = stateMatriculas.tab === 'matriculas'
          ? renderTabelaMatriculas(pendentes, aprovadas, reprovadas)
          : renderTabelaLog();
        bindGestaoEvents(body);
      }
    });
  }

  const btnRefresh = document.getElementById('btn-atualizar-gestao')
                  || document.getElementById('btn-atualizar-log');
  if (btnRefresh){
    btnRefresh.addEventListener('click', async () => {
      stateMatriculas.loaded = false;
      await renderGestaoMatriculas(container);
    });
  }

  const btnExp = document.getElementById('btn-export-gestao');
  if (btnExp) btnExp.addEventListener('click', exportarMatriculasGestao);
  const btnExpLog = document.getElementById('btn-export-log-gestao');
  if (btnExpLog) btnExpLog.addEventListener('click', exportarLogGestao);

  container.querySelectorAll('[data-gestao-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.gestaoAction;
      const id = btn.dataset.id;
      if (action === 'aprovar') await aprovarMatricula(id);
      else if (action === 'reprovar') await reprovarMatricula(id);
      else if (action === 'reabrir') await reabrirMatricula(id);
      else if (action === 'detalhes') mostrarDetalhesMatricula(id);
    });
  });

  container.querySelectorAll('[data-gestao-detalhes]').forEach(btn => {
    btn.addEventListener('click', () => {
      try { alert(JSON.stringify(JSON.parse(btn.dataset.gestaoDetalhes), null, 2)); }
      catch(_){ alert(btn.dataset.gestaoDetalhes); }
    });
  });
}

/* ============ ALOCAÇÃO NA TURMA ============ */
async function alocarNaTurmaGestao(matricula){
  const p = stateMatriculas.policiais[String(matricula.re)] || {};
  const categoria = inferirCategoriaGestao(p.posto_grad);

  let existing = null;
  try {
    const { data } = await sb.from('eap_alocacoes')
      .select('*').eq('re', String(matricula.re)).eq('ano', matricula.ano).maybeSingle();
    existing = data;
  } catch(e){ console.warn('[gestao] read aloc:', e); }

  const row = {
    re: String(matricula.re),
    ano: matricula.ano,
    turma_id: matricula.turma_id,
    categoria: (existing && existing.categoria) || categoria,
    taf: (existing && existing.taf) || 'III',
    taf_iv_tipo: (existing && existing.taf_iv_tipo) || '',
    taf_resultados: (existing && existing.taf_resultados) || null,
    inserido_ead: (existing && existing.inserido_ead) || 'Não',
    concluiu_ead: (existing && existing.concluiu_ead) || 'Não',
    nota_ead: (existing && existing.nota_ead) || '',
    data_conclusao_ead: (existing && existing.data_conclusao_ead) || null,
    ordem_manual: null,
    updated_at: new Date().toISOString()
  };
  const { error } = await sb.from('eap_alocacoes').upsert(row);
  if (error) throw error;
}

async function removerDaTurmaGestao(matricula){
  if (!matricula || !matricula.turma_id) return;
  try {
    const { data } = await sb.from('eap_alocacoes')
      .select('*').eq('re', String(matricula.re)).eq('ano', matricula.ano).maybeSingle();
    if (!data) return;
    if (String(data.turma_id) !== String(matricula.turma_id)) return;
    await sb.from('eap_alocacoes').update({
      turma_id: null, updated_at: new Date().toISOString()
    }).eq('re', String(matricula.re)).eq('ano', matricula.ano);
  } catch(e){ console.warn('[gestao] remove aloc:', e); }
}

/* ============ AÇÕES ============ */
async function aprovarMatricula(id){
  if (!sb) return;
  const user = await getCurrentUserGestao();
  if (!user){ toast('Faça login primeiro.', 'error'); return; }
  const m = stateMatriculas.matriculas.find(x => String(x.id) === String(id));
  if (!m){ toast('Matrícula não encontrada.', 'error'); return; }

  try {
    const { error: errM } = await sb.from('eap_matriculas').update({
      aprovacao: 'aprovada',
      aprovado_por: user.id,
      aprovado_em: new Date().toISOString(),
      motivo_reprovacao: ''
    }).eq('id', id);
    if (errM) throw errM;

    try {
      await alocarNaTurmaGestao(m);
    } catch(allocErr){
      console.error('[gestao] falha na alocação:', allocErr);
      toast('Aprovada, mas houve falha ao alocar. Reabra e aprove novamente.', 'error');
      stateMatriculas.loaded = false;
      await renderGestaoMatriculas(document.getElementById('content'));
      return;
    }

    toast(`Matrícula APROVADA — policial alocado na Turma ${m.turma_numero || '—'}.`, 'success');
    stateMatriculas.loaded = false;
    await renderGestaoMatriculas(document.getElementById('content'));

    setTimeout(() => {
      if (typeof sincronizarComSupabase === 'function'){
        sincronizarComSupabase({ silencioso: true }).catch(()=>{});
      }
    }, 500);
  } catch(e){
    toast('Falha ao aprovar: ' + (e.message||e), 'error');
  }
}

async function reprovarMatricula(id){
  const motivo = prompt('Motivo da devolução (obrigatório):');
  if (motivo === null) return;
  if (!motivo.trim()){ toast('Informe o motivo da devolução.', 'error'); return; }

  const m = stateMatriculas.matriculas.find(x => String(x.id) === String(id));
  if (!m){ toast('Matrícula não encontrada.', 'error'); return; }

  const user = await getCurrentUserGestao();
  if (!user){ toast('Faça login primeiro.', 'error'); return; }

  try {
    const { error } = await sb.from('eap_matriculas').update({
      aprovacao: 'reprovada',
      aprovado_por: user.id,
      aprovado_em: new Date().toISOString(),
      motivo_reprovacao: motivo.trim()
    }).eq('id', id);
    if (error) throw error;

    await removerDaTurmaGestao(m);

    toast('Matrícula DEVOLVIDA ao policial. Ele verá em "Matrículas Devolvidas".', 'info');
    stateMatriculas.loaded = false;
    await renderGestaoMatriculas(document.getElementById('content'));
  } catch(e){
    toast('Falha ao devolver: ' + (e.message||e), 'error');
  }
}

async function reabrirMatricula(id){
  if (!confirm('Reabrir esta matrícula para análise? Ela voltará a "Pendente".')) return;
  const m = stateMatriculas.matriculas.find(x => String(x.id) === String(id));
  if (!m) return;
  try {
    const { error } = await sb.from('eap_matriculas').update({
      aprovacao: 'pendente',
      aprovado_por: null,
      aprovado_em: null,
      motivo_reprovacao: ''
    }).eq('id', id);
    if (error) throw error;

    await removerDaTurmaGestao(m);

    toast('Matrícula reaberta para análise.', 'info');
    stateMatriculas.loaded = false;
    await renderGestaoMatriculas(document.getElementById('content'));
  } catch(e){
    toast('Falha ao reabrir: ' + (e.message||e), 'error');
  }
}

function mostrarDetalhesMatricula(id){
  const m = stateMatriculas.matriculas.find(x => String(x.id) === String(id));
  if (!m) return;
  const p = stateMatriculas.policiais[String(m.re)] || {};
  const apr = m.aprovacao || 'pendente';
  const alvo = document.getElementById('modal-root') || document.body;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal sm" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h2>Detalhes da Matrícula</h2>
        <button class="modal-close" data-close title="Fechar">✕</button>
      </div>
      <div class="modal-body">
        <div class="preview" style="margin:0">
          <div class="preview-grid">
            <div class="preview-item"><div class="lbl">RE</div><div class="val">${escapeHTML(m.re)}${p.dg ? '-' + escapeHTML(p.dg) : ''}</div></div>
            <div class="preview-item"><div class="lbl">Posto/Grad</div><div class="val">${escapeHTML(p.posto_grad||'—')}</div></div>
            <div class="preview-item" style="grid-column:1/-1"><div class="lbl">Nome</div><div class="val">${escapeHTML(p.nome||'—')}</div></div>
            <div class="preview-item"><div class="lbl">Cia/Seção</div><div class="val">${escapeHTML(p.cia_secao||'—')}</div></div>
            <div class="preview-item"><div class="lbl">Turma</div><div class="val">${m.turma_numero ? 'Turma ' + escapeHTML(m.turma_numero) : '—'}</div></div>
            <div class="preview-item"><div class="lbl">Aprovação</div><div class="val"><span class="pill ${APROVACAO_LABEL[apr].cls}">${APROVACAO_LABEL[apr].txt}</span></div></div>
            <div class="preview-item"><div class="lbl">Data Matrícula</div><div class="val">${m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '—'}</div></div>
            ${m.aprovado_em ? `<div class="preview-item"><div class="lbl">Última ação</div><div class="val">${new Date(m.aprovado_em).toLocaleString('pt-BR')}</div></div>` : ''}
            ${m.motivo_reprovacao ? `<div class="preview-item" style="grid-column:1/-1"><div class="lbl">Motivo da Devolução</div><div class="val" style="color:#b91c1c">${escapeHTML(m.motivo_reprovacao)}</div></div>` : ''}
            ${m.observacao ? `<div class="preview-item" style="grid-column:1/-1"><div class="lbl">Observação do Policial</div><div class="val">${escapeHTML(m.observacao)}</div></div>` : ''}
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-primary" data-close>Fechar</button>
      </div>
    </div>`;
  alvo.innerHTML = '';
  alvo.appendChild(overlay);
  const close = () => { alvo.innerHTML = ''; };
  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

/* ============ EXPORTAÇÃO ============ */
function exportarMatriculasGestao(){
  const rows = [['RE','Dg','Posto/Grad','Nome','Cia/Seção','Turma','Aprovação','Data Matrícula','Motivo Devolução','Observação']];
  stateMatriculas.matriculas.filter(m => m.status === 'confirmada').forEach(m => {
    const p = stateMatriculas.policiais[String(m.re)] || {};
    const apr = m.aprovacao || 'pendente';
    rows.push([
      m.re, p.dg || '', p.posto_grad || '', p.nome || '', p.cia_secao || '',
      m.turma_numero || '', APROVACAO_LABEL[apr].txt,
      m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '',
      m.motivo_reprovacao || '', m.observacao || ''
    ]);
  });
  if (rows.length === 1){ toast('Nenhuma matrícula para exportar.', 'error'); return; }
  downloadXLSX([{ name: `Matriculas ${currentYear}`, rows }],
    `EAP${currentYear}_Matriculas_${todayStamp()}.xlsx`);
  toast(`${rows.length - 1} matrícula(s) exportada(s).`, 'success');
}

function exportarLogGestao(){
  const rows = [['Data/Hora','Ação','RE','Policial','Turma','Feito por','Status Anterior','Status Novo','Detalhes']];
  stateMatriculas.log.forEach(l => {
    const det = l.detalhes || {};
    rows.push([
      l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '',
      (ACAO_LABEL_GESTAO[l.acao] || {}).txt || l.acao,
      l.re || '', l.policial_nome || '', det.turma_numero || '',
      l.feito_por_email || '',
      l.status_anterior || '', l.status_novo || '',
      JSON.stringify(det)
    ]);
  });
  if (rows.length === 1){ toast('Nenhum log para exportar.', 'error'); return; }
  downloadXLSX([{ name: `Log Matriculas ${currentYear}`, rows }],
    `EAP${currentYear}_LogMatriculas_${todayStamp()}.xlsx`);
  toast(`${rows.length - 1} registro(s) exportado(s).`, 'success');
}