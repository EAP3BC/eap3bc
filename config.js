/* ============================================================
   CONFIG.JS — Conexão com Supabase (versão corrigida)
   - Sem defineProperty (bug que destruía o cliente)
   - Retry automático caso o CDN do SDK demore
   - Expõe window.sb como propriedade normal
   ============================================================ */

const SUPABASE_URL  = 'https://utcmigsegqskmhhcthso.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y21pZ3NlZ3Fza21oaGN0aHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Nzk3ODQsImV4cCI6MjEwODQ1NTc4NH0.Ns5YqsYBIxEMDMbzKs2gcqH4_TQAybQoFiTrt91PxsA';

// Constantes globais (sem defineProperty, propriedades simples)
window.ADMIN_EMAIL_PRINCIPAL = window.ADMIN_EMAIL_PRINCIPAL || 'dfukuda@policiamilitar.sp.gov.br';
window.currentUserEmail     = window.currentUserEmail || null;
window.sb                   = window.sb || null;
window.supabaseOnline       = false;
window.eapTablesOk          = null;
window.eapTablesCheckedAt   = 0;
window.EAP_TABLES_TTL_MS    = 60000;

function initSupabaseClient(){
  if (window.sb) return true;                        // já criado
  if (typeof window.supabase === 'undefined'){       // SDK do CDN ainda não carregou
    return false;
  }
  try {
    window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    console.log('[config] ✅ Supabase inicializado.');
    return true;
  } catch(e){
    console.error('[config] ❌ Erro ao criar cliente:', e);
    return false;
  }
}

// Tentativa imediata
initSupabaseClient();

// Se não conseguiu (CDN ainda carregando), tenta de novo por 10s
if (!window.sb){
  let tentativas = 0;
  const timer = setInterval(() => {
    tentativas++;
    if (initSupabaseClient() || tentativas > 50){
      clearInterval(timer);
      if (!window.sb){
        console.error('[config] ❌ SDK do Supabase não carregou após 10s. Verifique o CDN.');
      }
    }
  }, 200);
}

/* ============================================================
   AUXILIARES
   ============================================================ */
window.checarConexaoSupabase = async function(){
  const el = document.getElementById('conn-status');

  if (!window.sb){
    if (el){
      el.textContent = 'Local (sem Supabase)';
      el.className = 'conn-status offline';
    }
    window.supabaseOnline = false;
    return false;
  }

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout (8s)')), 8000)
  );

  try {
    const tarefa = window.sb.from('policiais').select('re', { count: 'exact', head: true }).limit(1);
    const { error } = await Promise.race([tarefa, timeout]);
    if (error) throw error;
    if (el){ el.textContent = 'Supabase Online'; el.className = 'conn-status online'; }
    window.supabaseOnline = true;
    return true;
  } catch(err){
    console.error('[conn] falha:', err);
    if (el){ el.textContent = 'Supabase Offline'; el.className = 'conn-status offline'; }
    window.supabaseOnline = false;
    return false;
  }
};

window.setConnStatus = function(state, text){
  const el = document.getElementById('conn-status');
  if (!el) return;
  if (state === 'syncing'){
    el.textContent = text || 'Sincronizando...';
    el.className = 'conn-status syncing';
  }
};