/* ============================================================
   DB.JS
   Banco de dados LOCAL (localStorage) e troca de ano.
   Sem criação automática de turmas — a criação é exclusivamente
   manual pelo botão "Nova Turma" no app EAP 3º B.C.
   ============================================================ */

let currentYear = 2027;

function storageKeyForYear(year){ return `eap${year}_db_v1`; }

function loadDBForYear(year){
  try {
    const raw = localStorage.getItem(storageKeyForYear(year));
    if (raw){
      const parsed = JSON.parse(raw);
      if (!parsed.officers) parsed.officers = [];
      if (!parsed.turmas)   parsed.turmas   = [];
      return parsed;
    }
  } catch(e){
    console.warn('DB corrompida (ano ' + year + '), iniciando nova.', e);
  }
  return { officers: [], turmas: [] };
}

// Carrega o banco do ano atual
let db = loadDBForYear(currentYear);
db.turmas.forEach(t => {
  if (typeof t.concluida !== 'boolean') t.concluida = false;
  if (typeof t.observacoes !== 'string') t.observacoes = '';
});

// Salva no navegador
function saveDB(){
  localStorage.setItem(storageKeyForYear(currentYear), JSON.stringify(db));
}

// Troca entre 2027, 2028, ...
function switchYear(year){
  if (year === currentYear) return;
  saveDB();
  currentYear = year;
  db = loadDBForYear(year);
  db.turmas.forEach(t => {
    if (typeof t.concluida !== 'boolean') t.concluida = false;
    if (typeof t.observacoes !== 'string') t.observacoes = '';
  });
  updateYearSelector();
  render();
  toast(`Ano alterado para ${year}.`, 'info');
  if (sb && supabaseOnline){
    sincronizarComSupabase({ silencioso: true });
  }
}

function updateYearSelector(){
  const sel = document.getElementById('year-select');
  if (sel) sel.value = String(currentYear);
}

/* ============================================================
   NOTA: a função seedYearIfEmpty() foi REMOVIDA.
   Nenhuma turma é criada automaticamente.
   Toda turma nasce exclusivamente pelo botão "Nova Turma"
   (função openTurmaModal em modals.js → save-turma).
   ============================================================ */