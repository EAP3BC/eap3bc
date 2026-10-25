/* ============================================================
   CONFIG.JS
   Responsável pela conexão com o Supabase (a "nuvem").
   ============================================================ */

// --- 1. Endereço e chave pública do projeto Supabase ---
const SUPABASE_URL  = 'https://utcmigsegqskmhhcthso.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0Y21pZ3NlZ3Fza21oaGN0aHNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4Nzk3ODQsImV4cCI6MjEwODQ1NTc4NH0.Ns5YqsYBIxEMDMbzKs2gcqH4_TQAybQoFiTrt91PxsA';

// --- 2. Variáveis globais de conexão ---
let sb = null;                    // cliente do Supabase (nulo = desligado)
let supabaseOnline = false;       // guarda se já foi confirmada a conexão
let eapTablesOk = null;           // null = ainda não verificado

// --- 3. Cria o cliente, se a biblioteca carregou ---
try {
  if (window.supabase && SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('SEU-PROJETO')){
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
} catch(e){
  console.warn('Supabase não configurado:', e);
}

// --- 4. Testa se o servidor está respondendo ---
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

  // Corrida: ou o Supabase responde, ou desistimos em 8 segundos
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

// --- 5. Muda o "farol" do canto (verde/vermelho/azul) ---
function setConnStatus(state, text){
  const el = document.getElementById('conn-status');
  if (!el) return;
  if (state === 'syncing'){
    el.textContent = text || 'Sincronizando...';
    el.className = 'conn-status syncing';
  }
}