/* ============================================================
   SYNC.JS
   Comunicação com o Supabase (envio e recebimento).
   ============================================================ */

// Verifica se as tabelas novas existem.
// Tem TTL: se deu false antes, re-checa depois de 60s.
async function checkEapTables(force = false){
  const agora = Date.now();
  if (!force && eapTablesOk !== null && (agora - eapTablesCheckedAt) < EAP_TABLES_TTL_MS){
    return eapTablesOk;
  }
  if (!sb){ eapTablesOk = false; eapTablesCheckedAt = agora; return false; }
  try {
    const { error } = await sb.from('eap_turmas').select('id').limit(1);
    if (error && (error.code === '42P01' || /does not exist/i.test(error.message || ''))){
      eapTablesOk = false;
    } else if (error){
      console.warn('[eap] check:', error);
      eapTablesOk = false;
    } else {
      eapTablesOk = true;
    }
  } catch {
    eapTablesOk = false;
  }
  eapTablesCheckedAt = agora;
  return eapTablesOk;
}

function turmaToRow(t){
  return {
    id: String(t.id),
    ano: currentYear,
    categoria: t.categoria,
    numero: t.numero,
    data_inicio: t.dataInicio || null,
    data_fim: t.dataFim || null,
    concluida: !!t.concluida,
    observacoes: t.observacoes || '',
    updated_at: new Date().toISOString()
  };
}

function buildAlocacaoRow(o){
  return {
    re: String(o.re),
    ano: currentYear,
    turma_id: o.turmaId || null,
    categoria: o.categoria || null,
    taf: o.taf || 'III',
    taf_iv_tipo: o.tafIVTipo || '',
    taf_resultados: o.tafResultados || null,
    inserido_ead: o.inseridoEAD || 'Não',
    concluiu_ead: o.concluiuEAD || 'Não',
    nota_ead: o.notaEAD || '',
    data_conclusao_ead: o.dataConclusaoEAD || null,
    ordem_manual: (typeof o.ordemManual === 'number') ? o.ordemManual : null,
    updated_at: new Date().toISOString()
  };
}

// NÃO checa mais supabaseOnline: se estiver offline, o try/catch trata
async function syncTurmaSupabase(turma){
  if (!sb || !turma) return;
  if (!(await checkEapTables())) return;
  try {
    const { error } = await sb.from('eap_turmas').upsert(turmaToRow(turma)).select().single();
    if (error) console.warn('syncTurma:', error);
  } catch(e){ console.warn('syncTurma:', e); }
}

async function deleteTurmaSupabase(turmaId){
  if (!sb) return;
  if (!(await checkEapTables())) return;
  try {
    const { error } = await sb.from('eap_turmas')
      .delete().eq('id', turmaId).eq('ano', currentYear).select();
    if (error) console.warn('deleteTurma:', error);
    await sb.from('eap_alocacoes')
      .update({ turma_id: null })
      .eq('ano', currentYear).eq('turma_id', turmaId);
  } catch(e){ console.warn('deleteTurma:', e); }
}

async function syncAlocacaoSupabase(o){
  if (!sb || !o || !o.re) return;
  if (!(await checkEapTables())) return;
  try {
    const { error } = await sb.from('eap_alocacoes')
      .upsert(buildAlocacaoRow(o), { onConflict: 're,ano' })
      .select().single();
    if (error) console.warn('syncAlocacao:', error);
  } catch(e){ console.warn('syncAlocacao:', e); }
}

async function deleteAlocacaoSupabase(re){
  if (!sb || !re) return;
  if (!(await checkEapTables())) return;
  try {
    const { error } = await sb.from('eap_alocacoes')
      .delete().eq('re', String(re)).eq('ano', currentYear).select();
    if (error) console.warn('deleteAlocacao:', error);
  } catch(e){ console.warn('deleteAlocacao:', e); }
}

async function migrarLocalParaCloudUmaVez(){
  const key = `eap_migrated_v3_${currentYear}`;
  if (localStorage.getItem(key) === '1') return;
  if (!(await checkEapTables())) return;
  try {
    const { data: cloudT } = await sb.from('eap_turmas')
      .select('id,categoria,numero').eq('ano', currentYear);

    const cloudIds    = new Set((cloudT || []).map(t => String(t.id)));
    const cloudCatNum = new Set((cloudT || []).map(t => `${t.categoria}|${t.numero}`));

    const turmasPend = db.turmas.filter(t => {
      if (cloudIds.has(String(t.id)))                    return false;
      if (cloudCatNum.has(`${t.categoria}|${t.numero}`)) return false;
      return true;
    });

    if (turmasPend.length){
      const { error } = await sb.from('eap_turmas').upsert(turmasPend.map(turmaToRow));
      if (error) console.warn('[migrate] turmas:', error);
    }

    const { data: cloudA } = await sb.from('eap_alocacoes').select('re').eq('ano', currentYear);
    const cloudREs = new Set((cloudA || []).map(a => String(a.re)));
    const alocPend = db.officers
      .filter(o => o.re && !cloudREs.has(String(o.re)))
      .filter(o => o.turmaId || o.taf === 'IV' || o.inseridoEAD === 'Sim' ||
                   o.concluiuEAD === 'Sim' || typeof o.ordemManual === 'number');

    if (alocPend.length){
      const LOTE = 100;
      for (let i = 0; i < alocPend.length; i += LOTE){
        const lote = alocPend.slice(i, i + LOTE).map(buildAlocacaoRow);
        const { error } = await sb.from('eap_alocacoes')
          .upsert(lote, { onConflict: 're,ano' });
        if (error) console.warn('[migrate] alocacoes:', error);
      }
    }
    localStorage.setItem(key, '1');
  } catch(e){
    console.warn('[migrate] falha:', e);
  }
}

async function enviarOrdemTurmaSupabase(officers){
  if (!sb) return;
  if (!(await checkEapTables())) return;
  try {
    const LOTE = 20;
    for (let i = 0; i < officers.length; i += LOTE){
      const lote = officers.slice(i, i + LOTE).filter(o => o.re).map(buildAlocacaoRow);
      if (!lote.length) continue;
      const { error } = await sb.from('eap_alocacoes')
        .upsert(lote, { onConflict: 're,ano' });
      if (error) console.warn('[ordem] upsert:', error);
    }
  } catch(e){
    console.warn('Falha ao sincronizar ordem automática:', e);
  }
}

async function aplicarOrdemManual(listaIds){
  listaIds.forEach((id, idx) => {
    const o = db.officers.find(x => x.id === id);
    if (o) o.ordemManual = idx;
  });
  saveDB();
  if (sb){
    const officers = listaIds.map(id => db.officers.find(x => x.id === id)).filter(Boolean);
    await enviarOrdemTurmaSupabase(officers);
  }
}

async function sincronizarComSupabase({silencioso = false} = {}){
  if (!sb){
    if (!silencioso) toast('Supabase não configurado.', 'error');
    return false;
  }
  const btn = document.getElementById('btn-sync');
  if (btn) btn.classList.add('spinning');
  setConnStatus('syncing', 'Sincronizando...');

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout: Supabase não respondeu em 15s')), 15000)
  );

  try {
    const tarefa = (async () => {
      const tablesOk = await checkEapTables(true);
      if (!tablesOk && !silencioso){
        console.warn('[sync] Tabelas eap_turmas/eap_alocacoes não encontradas.');
      }
      if (tablesOk) await migrarLocalParaCloudUmaVez();

      const PAGE = 1000;
      let from = 0, todos = [];
      while (true){
        const { data, error } = await sb
          .from('policiais')
          .select('re,dg,posto_grad,nome,cia_secao,data_nascimento,ias_odonto,ias_medico,validade_ias,ordem_manual')
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        todos = todos.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }

      let turmasCloud = [];
      if (tablesOk){
        const { data: tData, error: tErr } = await sb
          .from('eap_turmas').select('*').eq('ano', currentYear);
        if (tErr) console.warn('[sync] turmas:', tErr);
        turmasCloud = Array.isArray(tData) ? tData : [];

        const { data: alocTodas } = await sb.from('eap_alocacoes')
          .select('turma_id').eq('ano', currentYear);
        const alunosPorTurma = new Map();
        (alocTodas || []).forEach(a => {
          if (a.turma_id){
            alunosPorTurma.set(String(a.turma_id),
              (alunosPorTurma.get(String(a.turma_id)) || 0) + 1);
          }
        });

        const grupos = new Map();
        turmasCloud.forEach(t => {
          const key = `${t.categoria}|${t.numero}`;
          if (!grupos.has(key)) grupos.set(key, []);
          grupos.get(key).push(t);
        });

        const finais = [];
        for (const [key, lista] of grupos){
          if (lista.length === 1){ finais.push(lista[0]); continue; }
          lista.sort((a, b) => {
            const qa = alunosPorTurma.get(String(a.id)) || 0;
            const qb = alunosPorTurma.get(String(b.id)) || 0;
            if (qa !== qb) return qb - qa;
            const da = a.data_inicio ? 1 : 0;
            const db_ = b.data_inicio ? 1 : 0;
            if (da !== db_) return db_ - da;
            return new Date(a.created_at || 0) - new Date(b.created_at || 0);
          });
          const vencedora = lista[0];
          finais.push(vencedora);
          const perdedoras = lista.slice(1).map(t => String(t.id));
          if (perdedoras.length){
            try {
              await sb.from('eap_alocacoes')
                .update({ turma_id: vencedora.id })
                .in('turma_id', perdedoras)
                .eq('ano', currentYear);
            } catch(e){ console.warn('[sync] merge alocações:', e); }
          }
        }
        turmasCloud = finais;

        if (turmasCloud.length > 0 || db.turmas.length === 0){
          db.turmas = turmasCloud.map(t => ({
            id: String(t.id),
            categoria: t.categoria,
            numero: t.numero,
            dataInicio: t.data_inicio || '',
            dataFim: t.data_fim || '',
            concluida: !!t.concluida,
            observacoes: t.observacoes || ''
          }));
        }
      }

      let alocCloud = [];
      if (tablesOk){
        const { data: aData, error: aErr } = await sb
          .from('eap_alocacoes').select('*').eq('ano', currentYear);
        if (aErr) console.warn('[sync] alocacoes:', aErr);
        alocCloud = Array.isArray(aData) ? aData : [];
      }
      const alocPorRE = new Map();
      alocCloud.forEach(a => alocPorRE.set(String(a.re), a));

      if (todos.length === 0 && turmasCloud.length === 0){
        if (!silencioso) toast('A base central está vazia.', 'info');
        return true;
      }

      const porRE = new Map();
      db.officers.forEach(o => porRE.set(o.re, o));
      let atualizados = 0, novos = 0;
      const inferirCategoria = (pg) => {
        if (!pg) return 'cb_sd';
        const s = String(pg).toUpperCase();
        if (/(CEL|MAJ|CAP|TEN)\s*PM/.test(s) && !/SUB/.test(s)) return 'oficiais';
        if (/(SUB|SGT)/.test(s)) return 'subten_sgt';
        return 'cb_sd';
      };

      todos.forEach(d => {
        const re = String(d.re || '').trim();
        if (!re) return;
        const aloc = alocPorRE.get(re);
        const existing = porRE.get(re);

        if (existing){
          if (d.dg)              existing.dg = d.dg;
          if (d.posto_grad)      existing.postoGrad = d.posto_grad;
          if (d.nome)            existing.nome = d.nome;
          if (d.cia_secao)       existing.ciaSecao = d.cia_secao;
          if (d.data_nascimento) existing.dataNascimento = d.data_nascimento;
          if (d.ias_odonto)      existing.dataExameOdonto = d.ias_odonto;
          if (d.ias_medico)      existing.dataExameMedico = d.ias_medico;
          if (d.validade_ias)    existing.validadeIAS = d.validade_ias;

          if (aloc){
            existing.turmaId         = aloc.turma_id || '';
            existing.categoria       = aloc.categoria || existing.categoria || inferirCategoria(d.posto_grad);
            existing.taf             = aloc.taf || 'III';
            existing.tafIVTipo       = aloc.taf_iv_tipo || '';
            existing.tafResultados   = aloc.taf_resultados || existing.tafResultados || null;
            existing.inseridoEAD     = aloc.inserido_ead || 'Não';
            existing.concluiuEAD     = aloc.concluiu_ead || 'Não';
            existing.notaEAD         = aloc.nota_ead || '';
            existing.dataConclusaoEAD= aloc.data_conclusao_ead || '';
            if (typeof aloc.ordem_manual === 'number') existing.ordemManual = aloc.ordem_manual;
          } else if (typeof existing.ordemManual !== 'number' && typeof d.ordem_manual === 'number'){
            existing.ordemManual = d.ordem_manual;
          }
          atualizados++;
        } else {
          const ordemLegacy = (typeof d.ordem_manual === 'number') ? d.ordem_manual : undefined;
          const novo = {
            id: uid(), re,
            dg: d.dg || '', postoGrad: d.posto_grad || '', nome: d.nome || '',
            ciaSecao: d.cia_secao || '',
            dataNascimento: d.data_nascimento || '',
            dataExameOdonto: d.ias_odonto || '',
            dataExameMedico: d.ias_medico || '',
            validadeIAS: d.validade_ias || '',
            categoria: (aloc && aloc.categoria) || inferirCategoria(d.posto_grad),
            turmaId:   (aloc && aloc.turma_id) || '',
            taf:       (aloc && aloc.taf) || 'III',
            tafIVTipo: (aloc && aloc.taf_iv_tipo) || '',
            tafResultados: (aloc && aloc.taf_resultados) || null,
            inseridoEAD: (aloc && aloc.inserido_ead) || 'Não',
            concluiuEAD: (aloc && aloc.concluiu_ead) || 'Não',
            notaEAD:    (aloc && aloc.nota_ead) || '',
            dataConclusaoEAD: (aloc && aloc.data_conclusao_ead) || '',
            ordemManual: (aloc && typeof aloc.ordem_manual === 'number') ? aloc.ordem_manual : ordemLegacy
          };
          db.officers.push(novo);
          porRE.set(re, novo);
          novos++;
        }
      });

      saveDB(); render();
      if (!silencioso){
        toast(`Sincronização: ${novos} novo(s), ${atualizados} atualizado(s), ${db.turmas.length} turma(s).`, 'success');
      }
      return true;
    })();

    const resultado = await Promise.race([tarefa, timeout]);
    const el = document.getElementById('conn-status');
    if (el){
      el.textContent = 'Supabase Online';
      el.className = 'conn-status online';
      el.title = 'Sincronizado com a base central.';
    }
    return resultado;
  } catch(err){
    console.error('[sync] falha:', err);
    const el = document.getElementById('conn-status');
    if (el){
      el.textContent = 'Supabase Offline';
      el.className = 'conn-status offline';
      el.title = 'Falha ao sincronizar: ' + (err.message || err);
    }
    if (!silencioso) toast('Falha ao sincronizar: ' + (err.message || err), 'error');
    return false;
  } finally {
    if (btn) btn.classList.remove('spinning');
  }
}

function showImportOverlay(msg){
  const el = document.createElement('div');
  el.className = 'imp-overlay'; el.id = 'imp-overlay';
  el.innerHTML = `<div class="imp-spinner"></div><p>${escapeHTML(msg)}</p><small>Aguarde, enviando e sincronizando dados...</small>`;
  document.body.appendChild(el);
}
function hideImportOverlay(){
  const el = document.getElementById('imp-overlay'); if (el) el.remove();
}