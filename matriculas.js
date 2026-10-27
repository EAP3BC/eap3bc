/* ============================================================
   MATRICULAS.JS — Gestão de Matrículas
   Usa RPCs atômicas do Supabase (scripts 01 + 02).
   ============================================================ */

const stateMatriculas = {
  tab: 'matriculas',
  filtro: 'todas',
  filtroSolic: 'pendentes',
  search: '',
  loading: false,
  loaded: false,
  loadedYear: null,
  matriculas: [],
  solicitacoes: [],
  log: [],
  policiais: {}
};

const ACAO_LABEL_GESTAO = {
  criada:                    { txt: 'Matrícula criada',        cls: 'pill-blue'  },
  cancelada:                 { txt: 'Cancelada',               cls: 'pill-amber' },
  reativada:                 { txt: 'Reativada',               cls: 'pill-green' },
  atualizada:                { txt: 'Atualizada',              cls: 'pill-blue'  },
  excluida:                  { txt: 'Excluída',                cls: 'pill-red'   },
  tentativa_duplicada:       { txt: 'Tentativa duplicada',     cls: 'pill-red'   },
  tentativa_re_inexistente:  { txt: 'RE inexistente',          cls: 'pill-amber' },
  aprovada:                  { txt: 'Aprovada',                cls: 'pill-green' },
  reprovada:                 { txt: 'Reprovada',               cls: 'pill-red'   },
  reenviada:                 { txt: 'Reenviada',               cls: 'pill-blue'  },
  solicitacao_transferencia: { txt: 'Solicitou transferência', cls: 'pill-amber' },
  solicitacao_exclusao:      { txt: 'Solicitou exclusão',      cls: 'pill-amber' },
  solicitacao_aprovada:      { txt: 'Solicitação aprovada',    cls: 'pill-green' },
  solicitacao_reprovada:     { txt: 'Solicitação reprovada',   cls: 'pill-red'   },
  solicitacao_cancelada:     { txt: 'Solicitação cancelada',   cls: 'pill-gray'  }
};

const APROVACAO_LABEL = {
  pendente:  { txt: 'Pendente',  cls: 'pill-amber' },
  aprovada:  { txt: 'Aprovada',  cls: 'pill-green' },
  reprovada: { txt: 'Reprovada', cls: 'pill-red'   }
};

const SOLIC_STATUS_LABEL = {
  pendente:  { txt: 'Aguardando', cls: 'pill-amber' },
  aprovada:  { txt: 'Aprovada',   cls: 'pill-green' },
  reprovada: { txt: 'Reprovada',  cls: 'pill-red'   },
  cancelada: { txt: 'Cancelada',  cls: 'pill-gray'  }
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

    const { data: sols, error: errS } = await sb.from('eap_solicitacoes')
      .select('*').eq('ano', currentYear)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });
    if (errS) console.warn('[gestao] solicitacoes:', errS);
    stateMatriculas.solicitacoes = sols || [];

    const resMats = stateMatriculas.matriculas.map(m => String(m.re));
    const resSols = stateMatriculas.solicitacoes.map(s => String(s.re));
    const res = Array.from(new Set([...resMats, ...resSols]));

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
  // Garante que o polling está ativo (idempotente).
  iniciarPollingGestao();

  if (stateMatriculas.loadedYear !== currentYear) stateMatriculas.loaded = false;

  if (!stateMatriculas.loaded){
    container.innerHTML = `
      <div class="empty-state">
        <div style="width:48px;height:48px;border:3px solid var(--g200);border-top-color:var(--navy-600);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px"></div>
        <p>Carregando matrículas...</p>
      </div>`;
    await carregarMatriculasGestao();
  }

  const ativas     = stateMatriculas.matriculas.filter(m => m.status === 'confirmada');
  const pendentes  = ativas.filter(m => (m.aprovacao || 'pendente') === 'pendente');
  const aprovadas  = ativas.filter(m => m.aprovacao === 'aprovada');
  const canceladas = stateMatriculas.matriculas.filter(m => m.status === 'cancelada');
  const solicPend  = stateMatriculas.solicitacoes.filter(s => s.status === 'pendente');

  container.innerHTML = `
    <div class="gestao-wrap">
      <div class="stats-row" style="margin-bottom:22px">
        <div class="stat cat-primary"><span class="stat-label">Total do Ano</span><span class="stat-value">${ativas.length}</span></div>
        <div class="stat amber"><span class="stat-label">Pendentes</span><span class="stat-value">${pendentes.length}</span></div>
        <div class="stat green"><span class="stat-label">Aprovadas</span><span class="stat-value">${aprovadas.length}</span></div>
        <div class="stat red"><span class="stat-label">Canceladas</span><span class="stat-value">${canceladas.length}</span></div>
      </div>

      <div class="gestao-tabs">
        <!-- NOTIFICAÇÃO: pill na aba Matrículas, idêntica à de Solicitações -->
        <button class="gestao-tab ${stateMatriculas.tab === 'matriculas' ? 'active' : ''}" data-gestao-tab="matriculas">
          Matrículas ${pendentes.length ? `<span class="pill pill-amber" style="margin-left:6px">${pendentes.length}</span>` : ''}
        </button>
        <button class="gestao-tab ${stateMatriculas.tab === 'solicitacoes' ? 'active' : ''}" data-gestao-tab="solicitacoes">
          Solicitações ${solicPend.length ? `<span class="pill pill-amber" style="margin-left:6px">${solicPend.length}</span>` : ''}
        </button>
        <button class="gestao-tab ${stateMatriculas.tab === 'log' ? 'active' : ''}" data-gestao-tab="log">Log de Auditoria</button>
      </div>

      <div id="gestao-body">
        ${stateMatriculas.tab === 'matriculas'
          ? renderTabelaMatriculas(pendentes, aprovadas, canceladas)
          : stateMatriculas.tab === 'solicitacoes'
            ? renderTabelaSolicitacoes()
            : renderTabelaLog()}
      </div>
    </div>
  `;

  bindGestaoEvents(container);
}

function renderTabelaMatriculas(pendentes, aprovadas, canceladas = []){
  let lista;
  if (stateMatriculas.filtro === 'pendentes')       lista = pendentes;
  else if (stateMatriculas.filtro === 'aprovadas')  lista = aprovadas;
  else if (stateMatriculas.filtro === 'canceladas') lista = canceladas;
  else lista = stateMatriculas.matriculas.filter(m => m.status === 'confirmada');

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
        const isCancelled = m.status === 'cancelada';
        const apr = isCancelled
          ? { txt: 'Cancelada', cls: 'pill-red' }
          : (APROVACAO_LABEL[m.aprovacao || 'pendente'] || APROVACAO_LABEL.pendente);
        const pend = !isCancelled && (m.aprovacao || 'pendente') === 'pendente';

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
                  <button class="row-btn danger" title="Reprovar e cancelar matrícula (libera o policial para nova matrícula)" data-gestao-action="reprovar" data-id="${m.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                ` : isCancelled ? '' : `
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
        <button class="gestao-filtro ${stateMatriculas.filtro==='canceladas'?'active':''}" data-filtro="canceladas">Canceladas (${canceladas.length})</button>
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

function renderTabelaSolicitacoes(){
  const q = stateMatriculas.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  let lista = stateMatriculas.solicitacoes;
  if (stateMatriculas.filtroSolic === 'pendentes'){
    lista = lista.filter(s => s.status === 'pendente');
  }

  if (q){
    lista = lista.filter(s => {
      const p = stateMatriculas.policiais[String(s.re)] || {};
      return [s.re, p.nome, p.cia_secao, s.solicitado_por_email, s.solicitado_por_cia,
              s.turma_atual_numero, s.turma_nova_numero, s.motivo]
        .map(v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())
        .join(' ').includes(q);
    });
  }

  const rows = lista.length === 0
    ? `<tr><td colspan="10" class="empty">${
        stateMatriculas.filtroSolic === 'pendentes'
          ? 'Nenhuma solicitação pendente.'
          : 'Nenhuma solicitação registrada.'
      }</td></tr>`
    : lista.map(s => {
        const p = stateMatriculas.policiais[String(s.re)] || {};
        const st = SOLIC_STATUS_LABEL[s.status] || SOLIC_STATUS_LABEL.pendente;
        const tipoBadge = s.tipo === 'transferencia'
          ? '<span class="pill pill-blue">Transferência</span>'
          : '<span class="pill pill-red">Exclusão</span>';
        const isPend = s.status === 'pendente';

        return `
          <tr>
            <td>${tipoBadge}</td>
            <td class="cell-re">${escapeHTML(s.re)}${p.dg ? '-' + escapeHTML(p.dg) : ''}</td>
            <td class="cell-nome">${escapeHTML(p.nome||'—')}</td>
            <td>${escapeHTML(p.cia_secao||'—')}</td>
            <td>${s.turma_atual_numero ? `<span class="pill pill-blue">T ${escapeHTML(s.turma_atual_numero)}</span>` : '—'}</td>
            <td>${s.turma_nova_numero ? `<span class="pill pill-blue">T ${escapeHTML(s.turma_nova_numero)}</span>` : '—'}</td>
            <td class="cell-muted" style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHTML(s.motivo||'')}">${escapeHTML(s.motivo||'—')}</td>
            <td class="cell-muted">${escapeHTML(s.solicitado_por_cia||'—')}</td>
            <td>
              <span class="pill ${st.cls}">${st.txt}</span>
              ${s.status === 'reprovada' && s.motivo_decisao
                ? `<div style="font-size:11px;color:#b91c1c;margin-top:2px">${escapeHTML(s.motivo_decisao)}</div>`
                : ''}
            </td>
            <td>
              <div class="row-actions">
                ${isPend ? `
                  <button class="row-btn" title="Aprovar" data-solic-action="aprovar" data-id="${s.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  </button>
                  <button class="row-btn danger" title="Reprovar" data-solic-action="reprovar" data-id="${s.id}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                ` : ''}
                <button class="row-btn" title="Ver detalhes" data-solic-action="detalhes" data-id="${s.id}">
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
        <input type="search" id="gestao-search" placeholder="Buscar em solicitações..." value="${escapeHTML(stateMatriculas.search)}">
      </div>
      <div class="gestao-filtros">
        <button class="gestao-filtro ${stateMatriculas.filtroSolic==='pendentes'?'active':''}" data-filtro-solic="pendentes">Pendentes</button>
        <button class="gestao-filtro ${stateMatriculas.filtroSolic==='todas'?'active':''}" data-filtro-solic="todas">Todas</button>
      </div>
      <button class="btn btn-outline" id="btn-atualizar-gestao">Atualizar</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Tipo</th><th>RE</th><th>Nome</th><th>Cia/Seção</th>
          <th>Turma Atual</th><th>Turma Nova</th><th>Motivo</th>
          <th>Solicitado por</th><th>Status</th>
          <th style="text-align:right">Ações</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderTabelaLog(){
  const q = stateMatriculas.search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

  let lista = stateMatriculas.log.map(l => ({ ...l, _source: 'log' }));

  /* ---------- Fallback sintético: SOLICITAÇÕES ---------- */
  const solicLogs = (stateMatriculas.solicitacoes || [])
    .filter(s => {
      const isTransf = s.tipo === 'transferencia';
      let acaoEsperada;
      if (s.status === 'pendente')       acaoEsperada = isTransf ? 'solicitacao_transferencia' : 'solicitacao_exclusao';
      else if (s.status === 'aprovada')  acaoEsperada = 'solicitacao_aprovada';
      else if (s.status === 'reprovada') acaoEsperada = 'solicitacao_reprovada';
      else                               acaoEsperada = 'solicitacao_cancelada';

      return !stateMatriculas.log.some(l => {
        if (l.acao !== acaoEsperada) return false;
        if (String(l.re) !== String(s.re)) return false;
        const det = l.detalhes || {};
        return det.solicitacao_id && String(det.solicitacao_id) === String(s.id);
      });
    })
    .map(s => {
      const p = stateMatriculas.policiais[String(s.re)] || {};
      const isTransf = s.tipo === 'transferencia';
      let acao;
      if (s.status === 'pendente')       acao = isTransf ? 'solicitacao_transferencia' : 'solicitacao_exclusao';
      else if (s.status === 'aprovada')  acao = 'solicitacao_aprovada';
      else if (s.status === 'reprovada') acao = 'solicitacao_reprovada';
      else                               acao = 'solicitacao_cancelada';

      return {
        _source: 'solicitacao',
        id: 'sol_' + s.id,
        created_at: s.status === 'pendente' ? s.created_at : (s.decidido_em || s.updated_at || s.created_at),
        acao,
        re: s.re,
        policial_nome: p.nome || null,
        policial_cia: p.cia_secao || null,
        feito_por_email: s.status === 'pendente'
          ? s.solicitado_por_email
          : (s.decidido_por_email || s.solicitado_por_email),
        status_anterior: s.status === 'pendente' ? '—' : 'pendente',
        status_novo: s.status,
        detalhes: {
          solicitacao_id: s.id,
          tipo: s.tipo,
          turma_atual: s.turma_atual_numero,
          turma_nova: s.turma_nova_numero,
          motivo: s.motivo,
          motivo_decisao: s.motivo_decisao,
          solicitado_por: s.solicitado_por_email,
          solicitado_por_cia: s.solicitado_por_cia
        }
      };
    });

  /* ---------- Fallback sintético: MATRÍCULAS aprovadas/reprovadas ---------- */
  const matriculaLogs = (stateMatriculas.matriculas || [])
    .filter(m => m.aprovacao === 'aprovada' || m.aprovacao === 'reprovada')
    .filter(m => {
      const acaoEsperada = m.aprovacao === 'aprovada' ? 'aprovada' : 'reprovada';
      return !stateMatriculas.log.some(l => {
        if (l.acao !== acaoEsperada) return false;
        if (String(l.re) !== String(m.re)) return false;
        const det = l.detalhes || {};
        return det.matricula_id && String(det.matricula_id) === String(m.id);
      });
    })
    .map(m => {
      const p = stateMatriculas.policiais[String(m.re)] || {};
      const acao = m.aprovacao === 'aprovada' ? 'aprovada' : 'reprovada';
      return {
        _source: 'matricula',
        id: 'mat_' + m.id,
        created_at: m.aprovado_em || m.updated_at || m.created_at,
        acao,
        re: m.re,
        policial_nome: p.nome || null,
        policial_cia: p.cia_secao || null,
        feito_por_email: null,
        status_anterior: 'pendente',
        status_novo: m.aprovacao,
        detalhes: {
          matricula_id: m.id,
          turma_numero: m.turma_numero || null,
          motivo: m.motivo_reprovacao || null,
          tipo: 'matricula_' + acao
        }
      };
    });

  lista = lista.concat(solicLogs).concat(matriculaLogs);

  lista.sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at).getTime() : 0;
    const db_ = b.created_at ? new Date(b.created_at).getTime() : 0;
    return db_ - da;
  });

  if (q){
    lista = lista.filter(l => {
      const det = l.detalhes || {};
      return [l.re, l.policial_nome, l.policial_cia, l.feito_por_email, l.acao,
              det.turma_numero, det.turma_atual, det.turma_nova, det.motivo]
        .map(v => String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())
        .join(' ').includes(q);
    });
  }

  const rows = lista.length === 0
    ? '<tr><td colspan="6" class="empty">Sem registros de auditoria.</td></tr>'
    : lista.map(l => {
        const meta = ACAO_LABEL_GESTAO[l.acao] || { txt: l.acao, cls: 'pill-blue' };
        const dt = l.created_at ? new Date(l.created_at).toLocaleString('pt-BR') : '—';
        const det = l.detalhes || {};
        const turmaTag = det.turma_numero
          ? ` <span class="pill pill-blue" style="font-size:10px">T ${escapeHTML(det.turma_numero)}</span>`
          : (det.turma_atual || det.turma_nova)
            ? ` <span class="pill pill-blue" style="font-size:10px">T ${escapeHTML(det.turma_atual||'—')} → ${escapeHTML(det.turma_nova||'—')}</span>`
            : '';
        const alvo = l.re
          ? `${escapeHTML(l.re)}${l.policial_nome ? ' — ' + escapeHTML(l.policial_nome) : ''}${turmaTag}`
          : '—';

        const sourceTag = l._source === 'solicitacao'
          ? '<span class="pill pill-amber" style="font-size:9px;margin-left:4px">SOLIC</span>'
          : l._source === 'matricula'
            ? '<span class="pill pill-blue" style="font-size:9px;margin-left:4px">MATR</span>'
            : '';

        return `
          <tr>
            <td class="cell-muted">${dt}</td>
            <td><span class="pill ${meta.cls}">${meta.txt}</span>${sourceTag}</td>
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
        const ativas     = stateMatriculas.matriculas.filter(m => m.status === 'confirmada');
        const pendentes  = ativas.filter(m => (m.aprovacao || 'pendente') === 'pendente');
        const aprovadas  = ativas.filter(m => m.aprovacao === 'aprovada');
        const canceladas = stateMatriculas.matriculas.filter(m => m.status === 'cancelada');
        body.innerHTML = renderTabelaMatriculas(pendentes, aprovadas, canceladas);
        bindGestaoEvents(body);
      }
    });
  });

  container.querySelectorAll('[data-filtro-solic]').forEach(btn => {
    btn.addEventListener('click', () => {
      stateMatriculas.filtroSolic = btn.dataset.filtroSolic;
      const body = document.getElementById('gestao-body');
      if (body){
        body.innerHTML = renderTabelaSolicitacoes();
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
        if (stateMatriculas.tab === 'matriculas'){
          const ativas     = stateMatriculas.matriculas.filter(m => m.status === 'confirmada');
          const pendentes  = ativas.filter(m => (m.aprovacao || 'pendente') === 'pendente');
          const aprovadas  = ativas.filter(m => m.aprovacao === 'aprovada');
          const canceladas = stateMatriculas.matriculas.filter(m => m.status === 'cancelada');
          body.innerHTML = renderTabelaMatriculas(pendentes, aprovadas, canceladas);
        } else if (stateMatriculas.tab === 'solicitacoes'){
          body.innerHTML = renderTabelaSolicitacoes();
        } else {
          body.innerHTML = renderTabelaLog();
        }
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
      if (action === 'aprovar')        await aprovarMatricula(id, btn);
      else if (action === 'reprovar')  await reprovarMatricula(id, btn);
      else if (action === 'reabrir')   await reabrirMatricula(id, btn);
      else if (action === 'detalhes')  mostrarDetalhesMatricula(id);
    });
  });

  container.querySelectorAll('[data-solic-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.solicAction;
      const id = btn.dataset.id;
      if (action === 'aprovar')  await aprovarSolicitacao(id, btn);
      else if (action === 'reprovar') await reprovarSolicitacao(id, btn);
      else if (action === 'detalhes') mostrarDetalhesSolicitacao(id);
    });
  });

  container.querySelectorAll('[data-gestao-detalhes]').forEach(btn => {
    btn.addEventListener('click', () => {
      try { alert(JSON.stringify(JSON.parse(btn.dataset.gestaoDetalhes), null, 2)); }
      catch(_){ alert(btn.dataset.gestaoDetalhes); }
    });
  });
}

/* ============ AÇÕES (via RPC) ============ */

async function aprovarMatricula(id, btn = null){
  if (!sb) return;
  if (btn) btn.disabled = true;
  try {
    const { data, error } = await sb.rpc('eap_aprovar_matricula', { p_matricula_id: id });
    if (error) throw error;
    toast('Matrícula APROVADA — policial alocado na turma.', 'success');
    stateMatriculas.loaded = false;
    await renderGestaoMatriculas(document.getElementById('content'));
    setTimeout(() => {
      if (typeof sincronizarComSupabase === 'function'){
        sincronizarComSupabase({ silencioso: true }).catch(()=>{});
      }
    }, 500);
  } catch(e){
    console.error('[aprovar] falha:', e);
    toast('Falha ao aprovar: ' + (e.message||e), 'error');
    if (btn) btn.disabled = false;
  }
}

async function reprovarMatricula(id, btn = null){
  if (!sb) return;

  const m = stateMatriculas.matriculas.find(x => String(x.id) === String(id));
  if (!m) return;

  const p = stateMatriculas.policiais[String(m.re)] || {};
  const motivo = await abrirModalMotivoReprovacao({
    titulo: 'Reprovar Matrícula',
    placeholder: 'Ex.: dados incorretos, matrícula duplicada, requisição do gestor'
  });
  if (motivo === null) return;
  if (!motivo.trim()){ toast('Informe o motivo da reprovação.', 'error'); return; }

  if (btn) btn.disabled = true;
  try {
    const { error } = await sb.from('eap_matriculas')
      .update({
        status: 'cancelada',
        aprovacao: 'reprovada',
        motivo_reprovacao: motivo.trim(),
        aprovado_em: new Date().toISOString()
      })
      .eq('id', id);
    if (error) throw error;

    toast(
      `Matrícula de ${p.nome || m.re} REPROVADA. ` +
      `Policial liberado para nova matrícula.`,
      'success'
    );

    stateMatriculas.loaded = false;
    await renderGestaoMatriculas(document.getElementById('content'));

    setTimeout(() => {
      if (typeof sincronizarComSupabase === 'function'){
        sincronizarComSupabase({ silencioso: true }).catch(()=>{});
      }
    }, 500);
  } catch(e){
    console.error('[reprovar-matricula] falha:', e);
    toast('Falha ao reprovar: ' + (e.message||e), 'error');
    if (btn) btn.disabled = false;
  }
}

async function reabrirMatricula(id, btn = null){
  if (!confirm('Reabrir esta matrícula para análise? Ela voltará a "Pendente".')) return;
  if (!sb) return;
  if (btn) btn.disabled = true;
  try {
    const { error } = await sb.rpc('eap_reabrir_matricula', { p_matricula_id: id });
    if (error) throw error;
    toast('Matrícula reaberta para análise.', 'info');
    stateMatriculas.loaded = false;
    await renderGestaoMatriculas(document.getElementById('content'));
  } catch(e){
    console.error('[reabrir] falha:', e);
    toast('Falha ao reabrir: ' + (e.message||e), 'error');
    if (btn) btn.disabled = false;
  }
}

async function aprovarSolicitacao(id, btn = null){
  const sol = stateMatriculas.solicitacoes.find(s => String(s.id) === String(id));
  if (!sol) return;

  const p = stateMatriculas.policiais[String(sol.re)] || {};
  const tipoTxt = sol.tipo === 'transferencia' ? 'transferência' : 'exclusão';
  if (!confirm(`Aprovar ${tipoTxt} do RE ${sol.re}${p.nome ? ' (' + p.nome + ')' : ''}?`)) return;

  if (btn) btn.disabled = true;
  try {
    const { error } = await sb.rpc('eap_aprovar_solicitacao', { p_solicitacao_id: id });
    if (error) throw error;
    toast('Solicitação aprovada e efetivada.', 'success');
    stateMatriculas.loaded = false;
    await renderGestaoMatriculas(document.getElementById('content'));
    setTimeout(() => {
      if (typeof sincronizarComSupabase === 'function'){
        sincronizarComSupabase({ silencioso: true }).catch(()=>{});
      }
    }, 500);
  } catch(e){
    console.error('[aprov-solic] falha:', e);
    toast('Falha ao aprovar: ' + (e.message||e), 'error');
    if (btn) btn.disabled = false;
  }
}

async function reprovarSolicitacao(id, btn = null){
  const sol = stateMatriculas.solicitacoes.find(s => String(s.id) === String(id));
  if (!sol) return;

  const motivo = await abrirModalMotivoReprovacao();
  if (motivo === null) return;
  if (!motivo.trim()){ toast('Informe o motivo.', 'error'); return; }

  if (btn) btn.disabled = true;
  try {
    const { error } = await sb.rpc('eap_reprovar_solicitacao', {
      p_solicitacao_id: id,
      p_motivo: motivo.trim()
    });
    if (error) throw error;
    toast('Solicitação reprovada.', 'info');
    stateMatriculas.loaded = false;
    await renderGestaoMatriculas(document.getElementById('content'));
  } catch(e){
    console.error('[reprov-solic] falha:', e);
    toast('Falha ao reprovar: ' + (e.message||e), 'error');
    if (btn) btn.disabled = false;
  }
}

function abrirModalMotivoReprovacao(opts = {}){
  const titulo      = opts.titulo      || 'Motivo da Reprovação';
  const placeholder = opts.placeholder || 'Ex.: turma de destino lotada';

  return new Promise(resolve => {
    const alvo = document.getElementById('modal-root') || document.body;
    alvo.innerHTML = `
      <div class="modal-overlay">
        <div class="modal sm" role="dialog" aria-modal="true">
          <div class="modal-head">
            <h2>${escapeHTML(titulo)}</h2>
            <button class="modal-close" data-close>✕</button>
          </div>
          <div class="modal-body">
            <div class="field">
              <label for="reprov-motivo">Motivo <span class="req" style="color:var(--red)">*</span></label>
              <input type="text" id="reprov-motivo" maxlength="300" placeholder="${escapeHTML(placeholder)}">
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-outline" id="reprov-cancel">Cancelar</button>
            <button class="btn btn-danger" id="reprov-ok">Reprovar</button>
          </div>
        </div>
      </div>`;
    const close = (v) => { alvo.innerHTML = ''; resolve(v); };
    alvo.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => close(null)));
    alvo.querySelector('#reprov-cancel').addEventListener('click', () => close(null));
    alvo.querySelector('#reprov-ok').addEventListener('click', () => {
      const v = alvo.querySelector('#reprov-motivo').value;
      close(v);
    });
    alvo.querySelector('#reprov-motivo').focus();
  });
}

/* ============ DETALHES ============ */

function mostrarDetalhesSolicitacao(id){
  const s = stateMatriculas.solicitacoes.find(x => String(x.id) === String(id));
  if (!s) return;

  const p = stateMatriculas.policiais[String(s.re)] || {};
  const st = SOLIC_STATUS_LABEL[s.status] || SOLIC_STATUS_LABEL.pendente;
  const isTransf = s.tipo === 'transferencia';
  const tipoClass = isTransf ? 'transf' : 'excl';
  const tipoLabel = isTransf ? 'Transferência' : 'Exclusão';

  const initials = (p.nome || '?')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(n => n[0]).join('').toUpperCase();

  let routeHTML = '';
  if (isTransf && s.turma_nova_numero) {
    routeHTML = `
      <div class="sol-detail-route">
        <div class="sol-detail-turma from"><small>Turma Atual</small><strong>${escapeHTML(s.turma_atual_numero || '—')}</strong></div>
        <div class="sol-detail-arrow"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
        <div class="sol-detail-turma to"><small>Turma Destino</small><strong>${escapeHTML(s.turma_nova_numero)}</strong></div>
      </div>`;
  } else if (!isTransf) {
    routeHTML = `
      <div class="sol-detail-route">
        <div class="sol-detail-turma from"><small>Turma Atual</small><strong>${escapeHTML(s.turma_atual_numero || '—')}</strong></div>
        <div class="sol-detail-arrow"><svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></div>
        <div class="sol-detail-turma" style="border-color:#dc2626;background:linear-gradient(180deg,#fef2f2,#fee2e2)"><small>Destino</small><strong style="color:#b91c1c;font-size:16px">EXCLUSÃO</strong></div>
      </div>`;
  } else {
    routeHTML = `<div class="sol-detail-text empty">Turma de destino não informada.</div>`;
  }

  let decisionHTML = '';
  if (s.status === 'aprovada' || s.status === 'reprovada') {
    const decClass = s.status === 'aprovada' ? 'aprovada' : '';
    const decLabel = s.status === 'aprovada' ? 'Solicitação Aprovada' : 'Solicitação Reprovada';
    const decIcon = s.status === 'aprovada'
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    const decDate = s.decidido_em ? new Date(s.decidido_em).toLocaleString('pt-BR') : '—';

    decisionHTML = `
      <div class="sol-detail-section">
        <div class="sol-detail-label">Decisão do Gestor</div>
        <div class="sol-detail-decision ${decClass}">
          <div class="sol-detail-decision-head">${decIcon} ${decLabel}</div>
          <div class="sol-detail-decision-body">
            <div style="margin-bottom:6px"><strong>Em:</strong> ${decDate}</div>
            <div style="margin-bottom:6px"><strong>Por:</strong> ${escapeHTML(s.decidido_por_email || '—')}</div>
            ${s.motivo_decisao ? `<div><strong>Motivo:</strong> ${escapeHTML(s.motivo_decisao)}</div>` : ''}
          </div>
        </div>
      </div>`;
  }

  const envioDate = s.created_at ? new Date(s.created_at).toLocaleString('pt-BR') : '—';
  const timelineHTML = `
    <div class="sol-detail-section">
      <div class="sol-detail-label">Histórico</div>
      <div class="sol-detail-timeline">
        <div class="sol-detail-timeline-item done">
          <div class="sol-detail-timeline-time">${envioDate}</div>
          <div class="sol-detail-timeline-text">Solicitação enviada por ${escapeHTML(s.solicitado_por_email || '—')}</div>
        </div>
        <div class="sol-detail-timeline-item ${
          s.status === 'aprovada' ? 'done'
          : s.status === 'reprovada' ? 'rejected'
          : 'current'
        }">
          <div class="sol-detail-timeline-time">${
            s.decidido_em ? new Date(s.decidido_em).toLocaleString('pt-BR')
            : 'Aguardando decisão'
          }</div>
          <div class="sol-detail-timeline-text">${
            s.status === 'aprovada' ? 'Aprovada pelo gestor'
            : s.status === 'reprovada' ? 'Reprovada pelo gestor'
            : s.status === 'cancelada' ? 'Cancelada'
            : 'Pendente de análise'
          }</div>
        </div>
      </div>
    </div>`;

  const alvo = document.getElementById('modal-root') || document.body;
  alvo.innerHTML = `
    <div class="modal-overlay">
      <div class="modal sm sol-detail-modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2>Detalhes da Solicitação</h2>
          <button class="modal-close" data-close>✕</button>
        </div>
        <div class="modal-body">
          <div class="sol-detail-hero">
            <div class="sol-detail-tags">
              <span class="sol-detail-tag ${tipoClass}">${tipoLabel}</span>
              <span class="sol-detail-tag status-${s.status}">${st.txt}</span>
            </div>
            <div class="sol-detail-police">
              <div class="sol-detail-avatar">${escapeHTML(initials || '?')}</div>
              <div class="sol-detail-police-info">
                <div class="sol-detail-police-name">${escapeHTML(p.nome || '—')}</div>
                <div class="sol-detail-police-meta">
                  <span>RE ${escapeHTML(s.re)}${p.dg ? '-' + escapeHTML(p.dg) : ''}</span>
                  ${p.posto_grad ? `<span>${escapeHTML(p.posto_grad)}</span>` : ''}
                  ${p.cia_secao ? `<span>${escapeHTML(p.cia_secao)}</span>` : ''}
                </div>
              </div>
            </div>
          </div>
          <div class="sol-detail-section">
            <div class="sol-detail-label">Trajeto da Solicitação</div>
            ${routeHTML}
          </div>
          <div class="sol-detail-section">
            <div class="sol-detail-label">Motivo Informado</div>
            <div class="sol-detail-text ${s.motivo ? '' : 'empty'}">${escapeHTML(s.motivo || 'Nenhum motivo informado.')}</div>
          </div>
          ${decisionHTML}
          ${timelineHTML}
        </div>
        <div class="modal-foot">
          <button class="btn btn-primary" data-close>Fechar</button>
        </div>
      </div>
    </div>`;

  const close = () => { alvo.innerHTML = ''; };
  alvo.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  alvo.querySelector('.modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) close();
  });
}

function mostrarDetalhesMatricula(id){
  const m = stateMatriculas.matriculas.find(x => String(x.id) === String(id));
  if (!m) return;
  const p = stateMatriculas.policiais[String(m.re)] || {};
  const isCancelled = m.status === 'cancelada';
  const apr = isCancelled ? 'cancelada' : (m.aprovacao || 'pendente');
  const aprLabel = isCancelled
    ? { txt: 'Cancelada', cls: 'pill-red' }
    : (APROVACAO_LABEL[apr] || APROVACAO_LABEL.pendente);

  const alvo = document.getElementById('modal-root') || document.body;
  alvo.innerHTML = `
    <div class="modal-overlay">
      <div class="modal sm" role="dialog" aria-modal="true">
        <div class="modal-head">
          <h2>Detalhes da Matrícula</h2>
          <button class="modal-close" data-close>✕</button>
        </div>
        <div class="modal-body">
          <div class="preview" style="margin:0">
            <div class="preview-grid">
              <div class="preview-item"><div class="lbl">RE</div><div class="val">${escapeHTML(m.re)}${p.dg ? '-' + escapeHTML(p.dg) : ''}</div></div>
              <div class="preview-item"><div class="lbl">Posto/Grad</div><div class="val">${escapeHTML(p.posto_grad||'—')}</div></div>
              <div class="preview-item" style="grid-column:1/-1"><div class="lbl">Nome</div><div class="val">${escapeHTML(p.nome||'—')}</div></div>
              <div class="preview-item"><div class="lbl">Cia/Seção</div><div class="val">${escapeHTML(p.cia_secao||'—')}</div></div>
              <div class="preview-item"><div class="lbl">Turma</div><div class="val">${m.turma_numero ? 'Turma ' + escapeHTML(m.turma_numero) : '—'}</div></div>
              <div class="preview-item"><div class="lbl">Aprovação</div><div class="val"><span class="pill ${aprLabel.cls}">${aprLabel.txt}</span></div></div>
              <div class="preview-item"><div class="lbl">Data Matrícula</div><div class="val">${m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '—'}</div></div>
              ${m.aprovado_em ? `<div class="preview-item"><div class="lbl">Última ação</div><div class="val">${new Date(m.aprovado_em).toLocaleString('pt-BR')}</div></div>` : ''}
              ${m.motivo_reprovacao ? `<div class="preview-item" style="grid-column:1/-1"><div class="lbl">Motivo / Observação</div><div class="val" style="color:#b91c1c">${escapeHTML(m.motivo_reprovacao)}</div></div>` : ''}
              ${m.observacao ? `<div class="preview-item" style="grid-column:1/-1"><div class="lbl">Observação do Policial</div><div class="val">${escapeHTML(m.observacao)}</div></div>` : ''}
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn btn-primary" data-close>Fechar</button>
        </div>
      </div>
    </div>`;
  const close = () => { alvo.innerHTML = ''; };
  alvo.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  alvo.querySelector('.modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) close();
  });
}

/* ============ EXPORTAÇÃO ============ */

function exportarMatriculasGestao(){
  const rows = [['RE','Dg','Posto/Grad','Nome','Cia/Seção','Turma','Status','Aprovação','Data Matrícula','Motivo/Devolução','Observação']];
  const todas = stateMatriculas.matriculas.filter(m => m.status === 'confirmada' || m.status === 'cancelada');
  todas.forEach(m => {
    const p = stateMatriculas.policiais[String(m.re)] || {};
    const isCancelled = m.status === 'cancelada';
    const aprTxt = isCancelled
      ? 'Cancelada'
      : ((APROVACAO_LABEL[m.aprovacao || 'pendente'] || APROVACAO_LABEL.pendente).txt);
    rows.push([
      m.re, p.dg || '', p.posto_grad || '', p.nome || '', p.cia_secao || '',
      m.turma_numero || '',
      isCancelled ? 'cancelada' : 'confirmada',
      aprTxt,
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

/* ============================================================
   POLLING DE NOTIFICAÇÕES DA GESTÃO
   Atualiza as pills das abas (Matrículas e Solicitações) sem
   exigir refresh manual. Só roda quando o usuário está na tela
   "gestão de matrículas" e não está digitando.
   ============================================================ */
let __gestaoPollingStarted = false;

function iniciarPollingGestao(){
  if (__gestaoPollingStarted) return;
  __gestaoPollingStarted = true;

  const refresh = async () => {
    if (!sb) return;
    if (document.visibilityState !== 'visible') return;
    if (state.activeCategory !== 'gestao_matriculas') return;

    // Não interrompe o usuário enquanto ele digita em algum campo
    const focused = document.activeElement;
    if (focused && ['INPUT','TEXTAREA','SELECT'].includes(focused.tagName)) return;

    try {
      await carregarMatriculasGestao();
      const container = document.getElementById('content');
      if (container) await renderGestaoMatriculas(container);
    } catch(e){
      console.warn('[gestao-poll] falha:', e);
    }
  };

  // A cada 60s — mesma cadência do matriculaeap
  setInterval(refresh, 60000);

  // Ao voltar para a aba do navegador
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh();
  });

  // Ao voltar o foco para a janela
  window.addEventListener('focus', refresh);
}