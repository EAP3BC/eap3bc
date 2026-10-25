/* ============================================================
   AUTH.JS
   Login, logout e sessão do usuário.
   ============================================================ */

function mostrarLogin(){
  document.body.classList.remove('autenticado');
  const tela = document.getElementById('login-screen');
  if (tela) tela.classList.remove('hidden');
}
function esconderLogin(){
  document.body.classList.add('autenticado');
  const tela = document.getElementById('login-screen');
  if (tela) tela.classList.add('hidden');
}
function mostrarErroLogin(msg){
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}
function limparErroLogin(){
  const el = document.getElementById('login-error');
  if (!el) return;
  el.textContent = '';
  el.classList.remove('show');
}

// Traduz mensagens do Supabase para português
function traduzirErroAuth(msg){
  const m = String(msg || '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed'))       return 'E-mail ainda não confirmado. Verifique sua caixa de entrada.';
  if (m.includes('too many requests'))         return 'Muitas tentativas. Aguarde alguns minutos.';
  if (m.includes('user not found'))            return 'Usuário não encontrado.';
  if (m.includes('network'))                   return 'Falha de rede. Verifique sua conexão.';
  return 'Não foi possível entrar: ' + msg;
}

async function fazerLogin(email, senha){
  if (!sb) throw new Error('Supabase não está configurado.');
  const { data, error } = await sb.auth.signInWithPassword({
    email: email.trim().toLowerCase(), password: senha
  });
  if (error) throw error;
  return data;
}
async function fazerLogout(){
  if (!sb) return;
  try { await sb.auth.signOut(); } catch(e){ console.warn(e); }
}

function atualizarEmailHeader(user){
  const el = document.getElementById('user-email');
  if (!el) return;
  if (user && user.email){ el.textContent = user.email; el.title = user.email; }
  else                    { el.textContent = '—'; el.title = ''; }
}

// Chamada após login bem-sucedido
async function entrarNoApp(user){
  esconderLogin();
  atualizarEmailHeader(user);
  try {
    if (sb){
      const ok = await checarConexaoSupabase();
      if (ok) await sincronizarComSupabase({ silencioso: true });
    }
  } catch(e){
    console.warn('Falha ao sincronizar após login:', e);
  }
  setActiveTab('cb_sd');
  render();
}