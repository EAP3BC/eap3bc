/* ============================================================
   USUARIOS.JS — Gestão de Usuários Autorizados (EAP 3º B.C.)
   Acesso restrito a dfukuda@policiamilitar.sp.gov.br
   ============================================================ */

const stateUsuarios = {
  loaded: false,
  loading: false,
  lista: []
};

function isCurrentUserAdmin(){
  return String(currentUserEmail || '').toLowerCase().trim() === ADMIN_EMAIL_PRINCIPAL;
}

async function carregarUsuariosAutorizados(){
  if (!sb) return;
  stateUsuarios.loading = true;
  try {
    const { data, error } = await sb.from('eap_usuarios_autorizados')
      .select('*').order('concedido_em', { ascending: false });
    if (error) throw error;
    stateUsuarios.lista = data || [];
    stateUsuarios.loaded = true;
  } catch(e){
    console.error('[usuarios] falha:', e);
    toast('Falha ao carregar usuários: ' + (e.message || e), 'error');
  } finally {
    stateUsuarios.loading = false;
  }
}

async function renderGestaoUsuarios(container){
  if (!isCurrentUserAdmin()){
    container.innerHTML = `<div class="empty-state">
      <h3>Acesso restrito</h3>
      <p>Somente o administrador do EAP 3º B.C. pode acessar esta área.</p>
    </div>`;
    return;
  }

  if (!stateUsuarios.loaded){
    container.innerHTML = `<div class="empty-state">
      <div style="width:48px;height:48px;border:3px solid var(--g200);border-top-color:var(--navy-600);border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px"></div>
      <p>Carregando usuários...</p>
    </div>`;
    await carregarUsuariosAutorizados();
  }

  const ativos = stateUsuarios.lista.filter(u => u.ativo);

  const rows = stateUsuarios.lista.length === 0
    ? '<tr><td colspan="4" class="empty">Nenhum usuário autorizado além do administrador.</td></tr>'
    : stateUsuarios.lista.map(u => {
        const st = u.ativo
          ? { txt: 'Ativo', cls: 'pill-green' }
          : { txt: 'Revogado', cls: 'pill-red' };
        const dt = u.concedido_em ? new Date(u.concedido_em).toLocaleString('pt-BR') : '—';
        return `
          <tr>
            <td class="cell-nome">${escapeHTML(u.email)}</td>
            <td><span class="pill ${st.cls}">${st.txt}</span></td>
            <td class="cell-muted">${dt}</td>
            <td style="text-align:right">
              ${u.ativo
                ? `<button class="btn btn-outline" style="padding:6px 12px;font-size:11px;color:#b91c1c;border-color:rgba(220,38,38,.35)" data-user-action="revogar" data-id="${u.id}">Revogar Acesso</button>`
                : `<button class="btn btn-gold" style="padding:6px 12px;font-size:11px" data-user-action="reativar" data-id="${u.id}">Reativar Acesso</button>`}
            </td>
          </tr>`;
      }).join('');

  container.innerHTML = `
    <div class="gestao-wrap">
      <div class="taf-banner" style="margin-bottom:22px">
        <div class="taf-banner-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
        </div>
        <div>
          <h2>Gestão de Usuários Autorizados</h2>
          <p>Conceda ou revogue permissões de visualização do EAP 3º B.C. para outros usuários. Apenas <strong>${ADMIN_EMAIL_PRINCIPAL}</strong> possui acesso permanente.</p>
        </div>
      </div>

      <div class="card">
        <h2>Conceder Acesso</h2>
        <p class="sub">Informe o e-mail institucional do usuário que poderá visualizar o EAP 3º B.C.</p>
        <div class="row">
          <div class="field" style="flex:3">
            <label for="novo-usuario-email">E-mail institucional</label>
            <input type="email" id="novo-usuario-email" placeholder="exemplo@policiamilitar.sp.gov.br" autocomplete="off">
          </div>
          <div class="field" style="flex:1;justify-content:flex-end">
            <button class="btn btn-gold" id="btn-conceder-acesso" style="height:42px">Conceder Acesso</button>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Usuários Autorizados <span class="pill pill-blue" style="margin-left:8px">${ativos.length} ativo${ativos.length === 1 ? '' : 's'}</span></h2>
        <p class="sub">A revogação tem efeito imediato em novas tentativas de login. Sessões já ativas são encerradas em até 5 minutos.</p>
        <div style="overflow-x:auto">
          <table>
            <thead><tr>
              <th>E-mail</th><th>Status</th><th>Concedido em</th>
              <th style="text-align:right">Ações</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  bindUsuariosEvents(container);
}

function bindUsuariosEvents(container){
  const btn = document.getElementById('btn-conceder-acesso');
  if (btn){
    btn.addEventListener('click', async () => {
      const input = document.getElementById('novo-usuario-email');
      const email = (input.value || '').toLowerCase().trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        toast('Informe um e-mail válido.', 'error'); return;
      }
      if (email === ADMIN_EMAIL_PRINCIPAL){
        toast('O administrador já possui acesso permanente.', 'info'); return;
      }

      btn.disabled = true; btn.textContent = 'Concedendo...';
      try {
        const { data: existing } = await sb.from('eap_usuarios_autorizados')
          .select('id,ativo').eq('email', email).maybeSingle();

        if (existing){
          if (existing.ativo){
            toast('Este usuário já possui acesso ativo.', 'info');
            return;
          }
          const { error } = await sb.from('eap_usuarios_autorizados')
            .update({ ativo: true, concedido_em: new Date().toISOString(),
                      concedido_por: currentUserEmail, revogado_em: null })
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await sb.from('eap_usuarios_autorizados').insert({
            email, concedido_por: currentUserEmail, ativo: true
          });
          if (error) throw error;
        }

        toast(`Acesso concedido a ${email}.`, 'success');
        input.value = '';
        stateUsuarios.loaded = false;
        await renderGestaoUsuarios(container);
      } catch(e){
        console.error('[usuarios] conceder falha:', e);
        toast('Falha: ' + (e.message || e), 'error');
      } finally {
        btn.disabled = false; btn.textContent = 'Conceder Acesso';
      }
    });
  }

  container.querySelectorAll('[data-user-action]').forEach(b => {
    b.addEventListener('click', async () => {
      const action = b.dataset.userAction;
      const id = b.dataset.id;
      const usuario = stateUsuarios.lista.find(u => String(u.id) === String(id));
      if (!usuario) return;

      const ativar = action === 'reativar';
      if (!confirm(ativar
        ? `Reativar acesso de ${usuario.email}?`
        : `Revogar acesso de ${usuario.email}? O usuário não poderá mais entrar no EAP 3º B.C.`)) return;

      b.disabled = true;
      try {
        const payload = ativar
          ? { ativo: true, concedido_em: new Date().toISOString(), revogado_em: null }
          : { ativo: false, revogado_em: new Date().toISOString() };

        const { error } = await sb.from('eap_usuarios_autorizados')
          .update(payload).eq('id', id);
        if (error) throw error;

        toast(ativar ? 'Acesso reativado.' : 'Acesso revogado.', 'success');
        stateUsuarios.loaded = false;
        await renderGestaoUsuarios(container);
      } catch(e){
        console.error('[usuarios] ação falha:', e);
        toast('Falha: ' + (e.message || e), 'error');
        b.disabled = false;
      }
    });
  });
}