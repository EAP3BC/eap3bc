/* ============================================================
   APP.JS
   Liga todos os botões, inicia o app, verifica autenticação.
   ESTE ARQUIVO DEVE SER CARREGADO POR ÚLTIMO.
   ============================================================ */

// ---------- 1. Abas ----------
document.getElementById('tabs').addEventListener('click', e => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  setActiveTab(tab.dataset.cat);
  render();
});

// ---------- 2. Busca ----------
let searchTimeout;
document.getElementById('search').addEventListener('input', e => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.search = e.target.value;
    renderContent();
  }, 200);
});

// ---------- 3. Botões do cabeçalho ----------
document.getElementById('btn-new-turma').addEventListener('click', () => openTurmaModal());
document.getElementById('btn-import').addEventListener('click', importBase);
document.getElementById('btn-template').addEventListener('click', downloadTemplate);
document.getElementById('btn-sync').addEventListener('click', () => sincronizarComSupabase());

// ---------- 4. Seletor de ano ----------
const yearSelectEl = document.getElementById('year-select');
if (yearSelectEl){
  yearSelectEl.addEventListener('change', () => {
    const year = Number(yearSelectEl.value);
    if (AVAILABLE_YEARS.includes(year)) switchYear(year);
  });
}
updateYearSelector();

// ---------- 5. Menu lateral (Modos de Visualização) ----------
function handleNavClick(cat){
  setActiveTab(cat);
  render();
  if (window.innerWidth <= 768) closeSidebar();
}

const sideNavTurmas = document.getElementById('side-nav-turmas');
if (sideNavTurmas){
  sideNavTurmas.addEventListener('click', () => handleNavClick(state.lastTurmaCategory || 'cb_sd'));
}

const sideNavTaf = document.getElementById('side-nav-taf');
if (sideNavTaf){
  sideNavTaf.addEventListener('click', () => handleNavClick('insercao_taf'));
}

const sideNavEfetivo = document.getElementById('side-nav-efetivo');
if (sideNavEfetivo){
  sideNavEfetivo.addEventListener('click', () => handleNavClick('efetivo'));
}

const sideNavAptos = document.getElementById('side-nav-aptos');
if (sideNavAptos){
  sideNavAptos.addEventListener('click', () => handleNavClick('efetivo_aptos'));
}

const sideNavRestricoes = document.getElementById('side-nav-restricoes');
if (sideNavRestricoes){
  sideNavRestricoes.addEventListener('click', () => handleNavClick('efetivo_restricoes'));
}

const sideNavMatriculas = document.getElementById('side-nav-matriculas');
if (sideNavMatriculas){
  sideNavMatriculas.addEventListener('click', () => handleNavClick('gestao_matriculas'));
}

// NOVO — Gestão de Usuários (só admin enxerga o botão)
const sideNavUsuarios = document.getElementById('side-nav-usuarios');
if (sideNavUsuarios){
  sideNavUsuarios.addEventListener('click', () => handleNavClick('gestao_usuarios'));
}

document.querySelectorAll('.side-check').forEach(label => {
  const input = label.querySelector('input[type="checkbox"]');
  if (!input) return;
  input.addEventListener('change', () => {
    label.classList.toggle('checked', input.checked);
  });
});
document.getElementById('btn-export-all').addEventListener('click', exportMultiCategory);

const sidebarEl  = document.getElementById('sidebar');
const backdropEl = document.getElementById('sidebar-backdrop');
const toggleEl   = document.getElementById('sidebar-toggle');
function openSidebar(){ sidebarEl.classList.add('open'); backdropEl.classList.add('show'); }
function closeSidebar(){ sidebarEl.classList.remove('open'); backdropEl.classList.remove('show'); }
if (toggleEl){
  toggleEl.addEventListener('click', () => {
    if (sidebarEl.classList.contains('open')) closeSidebar();
    else openSidebar();
  });
}
if (backdropEl) backdropEl.addEventListener('click', closeSidebar);

// ---------- 6. Estado inicial (Página Inicial: Turmas) ----------
// NÃO criamos turmas automaticamente. As turmas são criadas
// exclusivamente pelo botão "Nova Turma".
setActiveTab('cb_sd');
render();

// ---------- 7. Autenticação ----------
(function configurarAutenticacao(){
  const form      = document.getElementById('login-form');
  const btnLogin  = document.getElementById('login-btn');
  const btnLogout = document.getElementById('btn-logout');

  if (form){
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      limparErroLogin();
      const email = document.getElementById('login-email').value;
      const senha = document.getElementById('login-password').value;
      if (!email || !senha){ mostrarErroLogin('Preencha e-mail e senha.'); return; }
      if (btnLogin){ btnLogin.classList.add('loading'); btnLogin.disabled = true; }
      try {
        const data = await fazerLogin(email, senha);
        document.getElementById('login-password').value = '';
        await entrarNoApp(data.user);
      } catch(err){
        console.error('Erro no login:', err);
        mostrarErroLogin(traduzirErroAuth(err.message));
        document.getElementById('login-password').value = '';
      } finally {
        if (btnLogin){ btnLogin.classList.remove('loading'); btnLogin.disabled = false; }
      }
    });
  }

  if (btnLogout){
    btnLogout.addEventListener('click', async () => {
      if (!confirm('Deseja realmente sair do sistema?')) return;
      await fazerLogout();
      atualizarEmailHeader(null);
      mostrarLogin();
    });
  }
})();

// ---------- 8. Boot ----------
(async function boot(){
  if (!window.sb){
    console.warn('Supabase ausente — entrando em modo local sem login.');
    window.esconderLogin();
    await window.checarConexaoSupabase();
    window.render();
    return;
  }
  window.sb.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT'){
      window.currentUserEmail = null;
      window.atualizarEmailHeader(null);
      const s = document.getElementById('section-gestao-usuarios');
      if (s) s.style.display = 'none';
      window.mostrarLogin();
    }
    if (event === 'SIGNED_IN' && session && session.user){
      window.atualizarEmailHeader(session.user);
      if (!window.currentUserEmail){
        window.currentUserEmail = String(session.user.email || '').toLowerCase().trim();
      }
      window.atualizarVisibilidadeAdmin();
    }
  });
  try {
    const { data } = await window.sb.auth.getSession();
    if (data && data.session && data.session.user){
      await window.entrarNoApp(data.session.user);
      setTimeout(window.atualizarVisibilidadeAdmin, 300);
    } else {
      window.mostrarLogin();
    }
  } catch(e){
    console.warn('Falha ao recuperar sessão:', e);
    window.mostrarLogin();
  }

  setInterval(async () => {
    if (!window.sb || !window.currentUserEmail) return;
    if (window.currentUserEmail === window.ADMIN_EMAIL_PRINCIPAL) return;
    try {
      const ok = await window.verificarPermissaoAcesso({ email: window.currentUserEmail });
      if (!ok){
        await window.sb.auth.signOut();
        window.mostrarLogin();
        window.mostrarErroLogin('Seu acesso foi revogado pelo administrador.');
      }
    } catch(e){ console.warn('[perm-check] falha:', e); }
  }, 5 * 60 * 1000);
})();

// ---------- 8. Boot ----------
(async function boot(){
  // Cria a seção "Gestão de Usuários" no sidebar (fica escondida)
  try { if (typeof window.garantirSecaoAdminSidebar === 'function') window.garantirSecaoAdminSidebar(); } catch(e){}

  if (!window.sb){
    console.warn('Supabase ausente — entrando em modo local sem login.');
    window.esconderLogin();
    await window.checarConexaoSupabase();
    window.render();
    return;
  }
  // ...resto do boot permanece igual (versão com window.X)
})();