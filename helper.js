/* ============================================================
   HELPERS.JS
   Constantes e "ferramentas" usadas por todos os outros arquivos.
   ============================================================ */

// --- Listas fixas ---
const AVAILABLE_YEARS = [2027, 2028, 2029, 2030];

const CATEGORIES = [
  { id: 'cb_sd',      label: 'Cb/Sd',           color: '#16a34a' },
  { id: 'subten_sgt', label: 'Subten/Sgt',      color: '#dc2626' },
  { id: 'oficiais',   label: 'Oficiais',        color: '#c9a44a' },
  { id: 'efetivo',    label: 'Efetivo 3º B.C.', color: '#2563eb' }
];
const REAL_CATEGORIES = CATEGORIES.filter(c => c.id !== 'efetivo');

const TAF_IV_OPTIONS = [
  'Lesão Membros Superiores',
  'Lesão Membros Inferiores',
  'Coluna Vertebral',
  'Cardíaco'
];

const POSTOS = ['Cel PM','Ten Cel PM','Maj PM','Cap PM','1° TEN PM','2° TEN PM',
  'Subten PM','1° SGT PM','2° SGT PM','3° SGT PM','CABO PM','SD PM'];

// --- Estado da tela (qual aba, qual busca) ---
const state = { activeCategory: 'efetivo', search: '' };

// --- Gera um identificador único para cada registro ---
function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

// --- Impede que textos com < > virem HTML malicioso ---
function escapeHTML(s){
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

// --- Datas em formatos amigáveis ---
function fmtDate(iso){
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('pt-BR');
}
function fmtDateShort(iso){
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = d.toLocaleString('pt-BR',{month:'short'}).replace('.','').toUpperCase();
  const yy = String(d.getFullYear()).slice(2);
  return `${dd}${mm}${yy}`;
}
function addDays(iso, days){
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}

// --- Algarismos romanos (para numerar turmas: I, II, III...) ---
function romanToInt(r){
  const map = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
  let n = 0;
  const s = String(r||'').toUpperCase();
  if (!s) return 999;
  for (let i=0;i<s.length;i++){
    const c = map[s[i]]; const nx = map[s[i+1]];
    if (!c) return 999;
    if (nx && c < nx) n -= c; else n += c;
  }
  return n || 999;
}
function intToRoman(num){
  if (!num || num < 1 || num > 3999) return String(num);
  const map = [['M',1000],['CM',900],['D',500],['CD',400],['C',100],
               ['XC',90],['L',50],['XL',40],['X',10],['IX',9],['V',5],['IV',4],['I',1]];
  let out = '';
  for (const [sym, val] of map){ while (num >= val){ out += sym; num -= val; } }
  return out;
}
function proximaNumeracaoTurma(categoria){
  const turmas = db.turmas.filter(t => t.categoria === categoria);
  let maior = 0;
  turmas.forEach(t => {
    const s = String(t.numero || '').toUpperCase().trim();
    if (!/^[IVXLCDM]+$/.test(s)) return;
    const n = romanToInt(s);
    if (n !== 999 && n > maior) maior = n;
  });
  return intToRoman(maior + 1);
}

// --- Notificação flutuante (o "torradinha" do canto) ---
function toast(msg, type='info'){
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => { el.style.opacity='0'; el.style.transition='opacity .3s'; }, 3500);
  setTimeout(() => el.remove(), 4000);
}

// --- Ordenação ---
function sortTurmas(a,b){
  const da  = a.dataInicio || '9999-99-99';
  const dbb = b.dataInicio || '9999-99-99';
  if (da !== dbb) return da.localeCompare(dbb);
  return romanToInt(a.numero) - romanToInt(b.numero);
}
function sortOfficersManual(a, b){
  const oa = (typeof a.ordemManual === 'number') ? a.ordemManual : 999999;
  const ob = (typeof b.ordemManual === 'number') ? b.ordemManual : 999999;
  if (oa !== ob) return oa - ob;
  return (a.nome || '').localeCompare(b.nome || '', 'pt-BR');
}