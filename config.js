/* ============================================================
   CONFIG.JS
   Responsável pela conexão com o Supabase (a "nuvem").
   ============================================================ */

const SUPABASE_URL  = 'https://utcmigsegqskmhhcthso.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y21pZ3NlZ3Fza21oaGN0aHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Nzk3ODQsImV4cCI6MjEwODQ1NTc4NH0.Ns5YqsYBIxEMDMbzKs2gcqH4_TQAybQoFiTrt91PxsA';

let sb = null;
let supabaseOnline = false;     // só um "indicador" — não é um gate de sync
let eapTablesOk = null;
let eapTablesCheckedAt = 0;
const EAP_TABLES_TTL_MS = 60000; // re-checa a cada 60s

try {
  if (window.supabase && SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('SEU-PROJETO')){
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
} catch(e){
  console.warn('Supabase não configurado:', e);
}

async function checarConexaoSupabase(){
  const el = document.getElementById('conn-status');

  if (!sb){
    if (el){
      el.textContent = 'Local (sem Supabase)';
      el.className = 'conn-status offline';
      el.title = 'Configure SUPABASE_URL e SUPABASE_ANON para ativar a base central.';
    }
    supabaseOnline = false;
    return false;
  }

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout ao verificar conexão (8s)')), 8000)
  );

  try {
    const tarefa = sb.from('policiais').select('re', { count: 'exact', head: true }).limit(1);
    const { error } = await Promise.race([tarefa, timeout]);
    if (error) throw error;

    if (el){
      el.textContent = 'Supabase Online';
      el.className = 'conn-status online';
      el.title = 'Conectado à base central de policiais.';
    }
    supabaseOnline = true;
    return true;
  } catch(err){
    console.error('[conn] falha:', err);
    if (el){
      el.textContent = 'Supabase Offline';
      el.className = 'conn-status offline';
      el.title = 'Sem conexão com o Supabase: ' + (err.message || err);
    }
    supabaseOnline = false;
    return false;
  }
}

function setConnStatus(state, text){
  const el = document.getElementById('conn-status');
  if (!el) return;
  if (state === 'syncing'){
    el.textContent = text || 'Sincronizando...';
    el.className = 'conn-status syncing';
  }
}