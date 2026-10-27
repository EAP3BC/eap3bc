/* ============================================================
   AUTH.JS — Login, logout, sessão e CONTROLE DE ACESSO
   Versão "à prova de escopo": tudo em window.X explícito.
   ============================================================ */

// ---------- Constantes globais (garantidas em window) ----------
window.ADMIN_EMAIL_PRINCIPAL = 'dfukuda@policiamilitar.sp.gov.br';
window.currentUserEmail = window.currentUserEmail || null;

// ---------- Funções utilitárias ----------
window.mostrarLogin = function(){
  document.body.classList.remove('autenticado');
  const tela = document.getElementById('login-screen');
  if (tela) tela.classList.remove('hidden');
};

window.esconderLogin = function(){
  document.body.classList.add('autenticado');
  const tela = document.getElementById('login-screen');
  if (tela) tela.classList.add('hidden');
};

window.mostrarErroLogin = function(msg){
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
};

window.limparErroLogin = function(){
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = '';
  el.classList.remove('show');
};

window.traduzirErroAuth = function(msg){
  const m = String(msg || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed'))       return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  if (m.includes('too many requests'))         return 'Muitas tentativas. Aguarde alguns minutos.';
  if (m.includes('user not found'))            return 'Usuário não encontrado.';
  if (m.includes('network'))                   return 'Falha de rede. Verifique sua conexão.';
  return 'Não foi possível entrar: ' + msg;
};

window.fazerLogin = async function(email, senha){
  if (!window.sb) throw new Error('Supabase não está configurado.');
  const { data, error } = await window.sb.auth.signInWithPassword({
    email: email.trim().toLowerCase(), password: senha
  });
  if (error) throw error;
  return data;
};

window.fazerLogout = async function(){
  if (!window.sb) return;
  try { await window.sb.auth.signOut(); } catch(e){ console.warn(e); }
};

window.atualizarEmailHeader = function(user){
  const el = document.getElementById('user-email');
  if (!el) return;
  if (user && user.email){ el.textContent = user.email; el.title = user.email; }
  else                    { el.textContent = '—'; el.title = ''; }
};

/* ============================================================
   VERIFICAÇÃO DE PERMISSÃO
   ============================================================ */
window.verificarPermissaoAcesso = async function(user){
  if (!user || !user.email) return false;
  const email = String(user.email).toLowerCase().trim();

  if (email === window.ADMIN_EMAIL_PRINCIPAL) return true;
  if (!window.sb) return false;

  try {
    const { data, error } = await window.sb.from('eap_usuarios_autorizados')
      .select('id,ativo').eq('email', email).eq('ativo', true).maybeSingle();

    if (error){
      if (error.code === '42P01' || /does not exist/i.test(error.message || '')){
        console.warn('[auth] Tabela eap_usuarios_autorizados ausente.');
        return false;
      }
      throw error;
    }
    return !!data;
  } catch(e){
    console.warn('[auth] falha ao verificar permissão:', e);
    return false;
  }
};

/* ============================================================
   GARANTE QUE A SEÇÃO "GESTÃO DE USUÁRIOS" EXISTE NO SIDEBAR
   ============================================================ */
window.garantirSecaoAdminSidebar = function(){
  let section = document.getElementById('section-gestao-usuarios');
  if (section) return section;

  const sidebar = document.getElementById('sidebar');
  if (!sidebar){
    console.warn('[auth] sidebar não encontrado no DOM.');
    return null;
  }

  section = document.createElement('div');
  section.className = 'sidebar-section';
  section.id = 'section-gestao-usuarios';
  section.style.display = 'none';
  section.innerHTML = `
    <div class="sidebar-title">Gestão de Usuários</div>
    <button class="side-nav" data-cat="gestao_usuarios" id="side-nav-usuarios" title="Gerenciar permissões de acesso ao EAP">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
      </svg>
      <span>Gestão de Usuários</span>
    </button>
  `;

  const extrairSection = Array.from(sidebar.querySelectorAll('.sidebar-section'))
    .find(s => {
      const t = s.querySelector('.sidebar-title');
      return t && /extrair/i.test(t.textContent);
    });
  if (extrairSection) sidebar.insertBefore(section, extrairSection);
  else                sidebar.appendChild(section);

  const btn = section.querySelector('#side-nav-usuarios');
  if (btn){
    btn.addEventListener('click', () => {
      if (typeof window.handleNavClick === 'function'){
        window.handleNavClick('gestao_usuarios');
      } else {
        if (typeof window.setActiveTab === 'function') window.setActiveTab('gestao_usuarios');
        if (typeof window.render === 'function') window.render();
      }
      if (window.innerWidth <= 768 && typeof window.closeSidebar === 'function') window.closeSidebar();
    });
  }

  console.log('[auth] Seção "Gestão de Usuários" criada dinamicamente.');
  return section;
};

/* ============================================================
   MOSTRA/ESCONDE A SEÇÃO "GESTÃO DE USUÁRIOS"
   ============================================================ */
window.atualizarVisibilidadeAdmin = function(){
  const isAdmin = String(window.currentUserEmail || '').toLowerCase().trim() === window.ADMIN_EMAIL_PRINCIPAL;
  const section = window.garantirSecaoAdminSidebar();
  if (!section) return;
  section.style.display = isAdmin ? '' : 'none';
  console.log('[auth] Visibilidade do menu admin:', {
    isAdmin,
    email: window.currentUserEmail,
    display: section.style.display || '(padrão = visível)'
  });
};

/* ============================================================
   ENTRAR NO APP
   ============================================================ */
window.entrarNoApp = async function(user){
  console.log('[auth] entrarNoApp chamado para:', user && user.email);

  const autorizado = await window.verificarPermissaoAcesso(user);

  if (!autorizado){
    try { if (window.sb) await window.sb.auth.signOut(); } catch(e){}
    window.mostrarLogin();
    window.mostrarErroLogin('Acesso não autorizado. Solicite permissão ao administrador (' + window.ADMIN_EMAIL_PRINCIPAL + ').');
    console.warn('[auth] acesso negado para', user && user.email);
    return false;
  }

  window.currentUserEmail = String(user.email || '').toLowerCase().trim();

  window.esconderLogin();
  window.atualizarEmailHeader(user);

  // Reforça a exibição em vários momentos (DOM pode não estar pronto)
  window.atualizarVisibilidadeAdmin();
  setTimeout(window.atualizarVisibilidadeAdmin, 0);
  setTimeout(window.atualizarVisibilidadeAdmin, 100);
  setTimeout(window.atualizarVisibilidadeAdmin, 300);

  try {
    if (window.sb){
      const ok = await window.checarConexaoSupabase();
      if (ok) await window.sincronizarComSupabase({ silencioso: true });
    }
  } catch(e){
    console.warn('Falha ao sincronizar após login:', e);
  }

  if (typeof window.setActiveTab === 'function') window.setActiveTab('cb_sd');
  if (typeof window.render === 'function') window.render();

  setTimeout(window.atualizarVisibilidadeAdmin, 500);
  return true;
};

/* ============================================================
   DIAGNÓSTICO — rode no console: debugAdmin()
   ============================================================ */
window.debugAdmin = function(){
  const section = document.getElementById('section-gestao-usuarios');
  const info = {
    '1. ADMIN_EMAIL_PRINCIPAL': window.ADMIN_EMAIL_PRINCIPAL,
    '2. currentUserEmail':      window.currentUserEmail,
    '3. É admin?':              String(window.currentUserEmail||'').toLowerCase().trim() === window.ADMIN_EMAIL_PRINCIPAL,
    '4. Section existe?':       !!section,
    '5. Section display':       section ? (section.style.display || '(padrão)') : 'N/A',
    '6. Botão side-nav-usuarios existe?': !!document.getElementById('side-nav-usuarios'),
    '7. Supabase (sb) existe?': !!window.sb,
    '8. verificarPermissaoAcesso é function?': typeof window.verificarPermissaoAcesso === 'function',
    '9. entrarNoApp é function?': typeof window.entrarNoApp === 'function'
  };
  console.table(info);
  return info;
};

/* ============================================================
   GARANTE QUE A SEÇÃO EXISTA NO DOM ASSIM QUE A PÁGINA CARREGAR
   (independente de login — só cria o nó, fica escondida)
   ============================================================ */
if (document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.garantirSecaoAdminSidebar(), 100);
  });
} else {
  setTimeout(() => window.garantirSecaoAdminSidebar(), 100);
}

// Fallback adicional: tenta de novo após 1.5s (caso algum script
// reescreva o sidebar durante o boot)
setTimeout(() => window.garantirSecaoAdminSidebar(), 1500);

console.log('[auth] auth.js carregado. Rode debugAdmin() para diagnosticar.');