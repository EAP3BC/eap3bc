============================================================
 GUIA DO SISTEMA — GESTÃO EAP
 Estágio de Atualização Profissional
 3º Batalhão de Caçadores
============================================================

LEIA ESTE GUIA ANTES DE MEXER EM QUALQUER ARQUIVO.
Ele foi escrito para quem NUNCA programou na vida.

============================================================
 1. O QUE ESTE SISTEMA FAZ
============================================================

É o SISTEMA PRINCIPAL do EAP. Ele serve para:

  ▸ Cadastrar e organizar o efetivo do 3º B.C.
  ▸ Criar turmas do estágio (Turma I, II, III...)
  ▸ Lançar os resultados de TAF (III e IV)
  ▸ Controle de EAD (inserido/concluído)
  ▸ Importar/Exportar planilhas de Excel
  ▸ GERENCIAR as matrículas feitas pelo outro app
    (aprovar, reprovar/devolver e ver o log)

Existe também um SEGUNDO app (chamado "Matrícula EAP"),
que é onde os policiais se inscrevem. Este aqui é onde
o GESTOR aprova ou devolve as inscrições.

============================================================
 2. COMO O PROJETO É FEITO (a analogia)
============================================================

Imagine uma CASA:

  ▸ INDEX.HTML   = a PLANTA da casa
                   (o que existe em cada lugar)
  ▸ STYLE.CSS    = a DECORAÇÃO
                   (cores, tamanhos, fontes)
  ▸ *.JS         = os MORADORES
                   (fazem as coisas funcionarem)

Os arquivos terminados em ".js" são "os moradores".
Cada um tem uma função específica. Se você mexer no
lugar errado, pode quebrar uma parte sem afetar outras.

REGRA DE OURO:
Se não entendeu, NÃO MEXA. Sempre faça uma CÓPIA do
arquivo antes de editar (ex.: copie style.css para
style_copia.css e guarde).

============================================================
 3. GUIA DE CADA ARQUIVO
============================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ INDEX.HTML   —  A ESTRUTURA DA TELA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: Tudo que você VÊ na tela começa aqui. Menu,
botões, tabelas, campos.

QUANDO MEXER AQUI:
  ✓ Trocar TÍTULOS que aparecem no topo
  ✓ Trocar o nome "3º BATALHÃO DE CAÇADORES"
  ✓ Adicionar/remover BOTÕES do menu lateral
  ✓ Trocar TEXTOS das abas (Cb/Sd, Subten/Sgt, Oficiais)
  ✓ Trocar ANOS do menu lateral
       (procure por <option value="2027">)
       ATENÇÃO: também precisa atualizar em helper.js
  ✓ Trocar placeholders ("Ex.: ...")

NÃO MEXA:
  ✗ Na lista de <script src=...> no final
    (a ORDEM importa — é o que faz tudo funcionar)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ STYLE.CSS   —  A APARÊNCIA (cores, fontes, tamanhos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: Define CORES, FONTES, TAMANHOS, ESPAÇAMENTOS,
e como fica no CELULAR.

QUANDO MEXER AQUI:
  ✓ Trocar CORES DO SISTEMA
       → procure no TOPO do arquivo por :root { ... }
       → ali estão todas as cores principais
       → use um "color picker" do Google para escolher
  ✓ Mudar FONTES, TAMANHOS, ESPAÇAMENTOS
  ✓ Ajustar como fica no CELULAR
       → procure por @media (max-width: 768px)

CORES PRINCIPAIS (bloco :root no topo):
  --navy-900 (azul escuro)     → cor dos cabeçalhos
  --gold-500 (dourado)          → cor dos detalhes
  --green    (verde)            → cor do "ok/apto"
  --red      (vermelho)         → cor do "restrição"
  --amber    (laranja)          → cor do "pendente"

CORES DAS CATEGORIAS:
  --cat-cb-sd       = verde
  --cat-subten-sgt  = vermelho
  --cat-oficiais    = dourado
  --cat-efetivo     = azul

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ CONFIG.JS   —  A "CHAVE DA NUVEM"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: Guarda o endereço e a senha do banco ONLINE
(Supabase). É o "link com a internet".

QUANDO MEXER AQUI:
  ✓ Trocar de projeto Supabase (só se for mudar de
    servidor — o que raramente acontece)
  ✓ Se o sistema disser "Supabase Offline" e a internet
    estiver ok, o problema pode estar aqui.

NÃO MEXA:
  ✗ NUNCA altere SUPABASE_URL ou SUPABASE_ANON sem
    saber o que está fazendo — pode desconectar tudo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ HELPER.JS   —  AS LISTAS FIXAS E FERRAMENTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: Um arquivo com LISTAS FIXAS (anos, categorias,
postos, restrições) e ferramentas pequenas.

QUANDO MEXER AQUI:

  ✓ LISTA DE ANOS:
       procure por: const AVAILABLE_YEARS = [...]
       ALTERE TAMBÉM em index.html (é o mesmo item
       em 2 lugares diferentes)

  ✓ NOME DAS CATEGORIAS (Cb/Sd, Subten/Sgt, Oficiais):
       procure por: const CATEGORIES = [...]
       → cada linha tem "label" (o que aparece) e
         "color" (a cor). Só troque o texto do "label".

  ✓ TIPOS DE RESTRIÇÃO DO TAF IV:
       procure por: const TAF_IV_OPTIONS = [...]
       → é a lista que aparece no menu "Tipo de
         Restrição" quando você marca TAF IV

  ✓ LISTA DE POSTOS/GRADUAÇÕES:
       procure por: const POSTOS = [...]
       → é a sugestão que aparece quando você começa a
         digitar o posto (1° SGT PM, CABO PM, etc.)
       → também define a ORDEM em que eles são
         ordenados nas turmas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ DB.JS   —  O "CADERNO" LOCAL DO NAVEGADOR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: Salva os dados DENTRO DO SEU NAVEGADOR
(localStorage), para funcionar mesmo offline.

Também controla a TROCA DE ANO (2027, 2028...). Cada
ano tem seus próprios dados guardados separadamente.

QUANDO MEXER AQUI:
  ✓ Mudar o ANO PADRÃO (o que abre ao iniciar)
       procure por: let currentYear = 2027;
       troque o "2027" pelo ano que quiser
  ✓ Mudar as TURMAS "semente" (as que aparecem no
    primeiro uso, quando está vazio)
       procure por: function seedYearIfEmpty()

NÃO MEXA:
  ✗ No resto da lógica (é complexo e raramente precisa)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ AUTH.JS   —  LOGIN E LOGOUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: Cuida da TELA DE LOGIN (entrar e sair).
Controla se o usuário está autenticado.

QUANDO MEXER AQUI:
  ✓ Mudar MENSAGENS DE ERRO do login
       procure por: traduzirErroAuth
  ✓ Mudar o que acontece DEPOIS do login
       procure por: entrarNoApp

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ SYNC.JS   —  SINCRONIZAÇÃO COM A NUVEM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: Envia e busca dados do banco ONLINE (Supabase).
É o que faz o botão "Sincronizar" funcionar.

QUANDO MEXER AQUI:
  ✗ Raramente precisa. Só mexa se o sistema der erro
    do tipo "tabela não existe" (aí é sinal de banco
    mal configurado)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ IMPORTEXPORT.JS   —  PLANILHAS (IMPORTAR/EXPORTAR)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: Lê arquivos Excel/CSV, exporta planilhas e
baixa o "modelo" de planilha.

QUANDO MEXER AQUI:

  ✓ MUDAR AS COLUNAS DO EXCEL EXPORTADO
       procure por: exportOfficersList e buildExportRows
       → a variável "headers" define as colunas
       → ao adicionar uma coluna aqui, adicione também
         no HTML (para aparecer na tela) e no importador
         (para funcionar a volta)

  ✓ MUDAR QUAIS COLUNAS SÃO RECONHECIDAS NA IMPORTAÇÃO
       procure por: normalizeHeader
       → tem uma "tabela" que associa nomes diferentes
         ao mesmo campo (ex.: "RE", "Registro", "RE PM"
         viram todos o mesmo campo "re")

  ✓ MUDAR O MODELO DE PLANILHA (o que baixa)
       procure por: downloadTemplate

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ RENDER.JS   —  DESENHA A TELA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: Monta o que você VÊ: estatísticas do topo,
turmas, tabelas, tela de TAF.

QUANDO MEXER AQUI:

  ✓ MUDAR OS CARDS DE ESTATÍSTICA DO TOPO
       procure por: renderStats
       → tem vários blocos "if" para cada tipo de tela

  ✓ MUDAR AS COLUNAS DA TABELA DE POLICIAIS
       procure por: renderOfficerRow
       → cada <td> é uma coluna
       → ao adicionar uma coluna, atualize também o
         <thead> em renderTurma() e o exportador em
         importexport.js

  ✓ MUDAR O VISUAL DO CABEÇALHO DA TURMA
       procure por: renderTurma

  ✓ MUDAR OS CAMPOS DO FORMULÁRIO DE TAF
       procure por: getTafDynamicFields
       → aqui é onde as provas mudam conforme a
         modalidade (TAF III, IV lesão, etc.)

  ✓ MUDAR A ORDEM AUTOMÁTICA DOS POLICIAIS
       procure por: resetOrdemTurma
       → hoje ordena por Cia/Seção e depois por posto

  ✓ MUDAR O QUE ACONTECE AO MARCAR "CONCLUÍDA"
       procure por: toggleTurmaConcluida

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ MODALS.JS   —  JANELAS POP-UP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: As janelas que aparecem por cima da tela para
cadastrar/editar policial, criar/editar turma, ou
confirmar exclusão.

QUANDO MEXER AQUI:

  ✓ MUDAR OS CAMPOS DO CADASTRO DE POLICIAL
       procure por: openOfficerModal
       → o formulário está na variável "body"
       → CADA CAMPO é uma <div class="field">

  ✓ MUDAR OS CAMPOS DA TURMA
       procure por: openTurmaModal

  ✓ MUDAR A DURAÇÃO PADRÃO DA TURMA (hoje: 3 dias)
       dentro de openTurmaModal(), procure por:
       addDays(inicio.value, 2)
       → "2" significa 2 dias depois do início
         (início + 2 = 3 dias totais)

  ✓ MUDAR QUAIS CAMPOS SÃO OBRIGATÓRIOS
       remova a palavra "required" dos <input>

  ✓ MUDAR O TEXTO DAS CONFIRMAÇÕES DE EXCLUSÃO
       procure por: confirmDeleteOfficer e
                    confirmDeleteTurma

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ APP.JS   —  LIGA OS BOTÕES (o "gerente")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: É quem LIGA cada botão à sua ação. "Quando
alguém clica aqui, faça aquilo".

É carregado POR ÚLTIMO (chega depois dos outros
"funcionários" e conecta tudo).

QUANDO MEXER AQUI:
  ✓ Adicionar um BOTÃO novo no HTML? A ação precisa
    ser registrada aqui
  ✓ Mudar o que acontece ao clicar em um botão
  ✓ Mudar o que acontece ao ABRIR o sistema
       procure por: (async function boot)
  ✓ Mudar o que acontece ao LOGAR/DESLOGAR
       procure por: configurarAutenticacao

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
▸ MATRICULAS.JS   —  GESTÃO DE MATRÍCULAS (NOVO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O QUE É: A seção "Gestão de Matrículas" do menu
lateral. Mostra as matrículas feitas pelo outro app
(Matrícula EAP) e permite APROVAR ou DEVOLVER.

REGRAS IMPORTANTES:
  ▸ Ao APROVAR: o policial é alocado na turma
    escolhida (aparece dentro da turma na tela de
    Turmas — após sincronizar)
  ▸ Ao DEVOLVER: o policial vê a matrícula com o
    motivo na seção "Matrículas Devolvidas" do app
    de Matrícula e pode reenviar

ABAS DA SEÇÃO:
  ┌─ Matrículas ──────────────────────────────┐
  │ Lista com botões ✓ (aprovar) ✕ (devolver) │
  │ e 👁 (detalhes). Filtros por status.       │
  ├─ Log de Auditoria ────────────────────────┤
  │ Histórico de TUDO que aconteceu (criada,  │
  │ aprovada, devolvida, reenviada).           │
  └────────────────────────────────────────────┘

QUANDO MEXER AQUI:

  ✓ MUDAR O TEXTO DO MOTIVO DE DEVOLUÇÃO
       procure por: reprovarMatricula
       → o "prompt(...)" tem o texto que aparece

  ✓ MUDAR OS NOMES DAS ABAS / FILTROS
       procure por: renderTabelaMatriculas
       → "Todas", "Pendentes", "Aprovadas", "Devolvidas"

  ✓ MUDAR O QUE ACONTECE AO APROVAR
       procure por: aprovarMatricula
       → ele chama alocarNaTurmaGestao, que grava
         em eap_alocacoes (é o que "entra na turma")

  ✓ MUDAR AS CORES DOS BOTÕES / PÍLULAS
       procure por: APROVACAO_LABEL
       → "pendente" = amarelo, "aprovada" = verde,
         "reprovada" = vermelho

NÃO MEXA:
  ✗ Sem saber, NÃO altere alocarNaTurmaGestao nem
    removerDaTurmaGestao. Eles são a única ponte entre
    a matrícula aprovada e a turma do sistema antigo.

============================================================
 4. ONDE MEXO PARA MUDAR... (tabela rápida)
============================================================

┌──────────────────────────────────────────┬─────────────────┐
│ QUERO MUDAR...                           │ ARQUIVO         │
├──────────────────────────────────────────┼─────────────────┤
│ Título do topo                           │ index.html      │
│ Nome do batalhão                         │ index.html      │
│ Textos do menu lateral                   │ index.html      │
│ Anos do seletor (menu)                   │ index.html +    │
│                                          │ helper.js       │
│ Cores do sistema                         │ style.css       │
│ Cor de cada categoria                    │ style.css       │
│ Aparência no celular                     │ style.css       │
│ Senha/endereço do Supabase               │ config.js       │
│ Lista de anos (regra)                    │ helper.js       │
│ Nome das categorias                      │ helper.js       │
│ Tipos de restrição TAF IV                │ helper.js       │
│ Lista de postos/graduações               │ helper.js       │
│ Ano inicial ao abrir o sistema           │ db.js           │
│ Turmas-semente iniciais                  │ db.js           │
│ Mensagens de erro do login               │ auth.js         │
│ O que acontece após login                │ auth.js         │
│ Colunas do Excel exportado               │ importexport.js │
│ Modelo de planilha (download)            │ importexport.js │
│ Colunas da tabela na tela                │ render.js       │
│ Cards do topo (estatísticas)             │ render.js       │
│ Provas do TAF                            │ render.js       │
│ Duração padrão da turma                  │ modals.js       │
│ Campos do cadastro de policial           │ modals.js       │
│ Campos da turma                          │ modals.js       │
│ Auto-busca por RE                        │ modals.js       │
│ Ligação botão → ação                     │ app.js          │
│ Botões do menu                           │ app.js          │
│ Aprovar/devolver matrícula               │ matriculas.js   │
│ Motivo da devolução (texto)              │ matriculas.js   │
│ Log da gestão (filtros, textos)          │ matriculas.js   │
└──────────────────────────────────────────┴─────────────────┘

============================================================
 5. COMO TESTAR (o que fazer depois de mexer)
============================================================

Depois de QUALQUER mudança, siga o checklist abaixo:

  1. Recarregue a página com Ctrl+Shift+R
     (força o navegador a não usar cache antigo)

  2. Faça login (se não estiver logado)

  3. Teste a função que você alterou
     - Mexeu nas cores? Abra a tela e confira.
     - Mexeu nos anos? Troque o ano no menu.
     - Mexeu nos campos da turma? Crie uma turma nova.
     - Mexeu na gestão de matrículas? Aprove/devolva
       uma matrícula de teste.

  4. Se quebrou, veja o "Console":
     - Aperte F12 → aba "Console"
     - Textos em vermelho indicam erro
     - O número da linha ajuda a achar o problema

  5. Se não conseguiu resolver, restaure a CÓPIA
     que você fez antes (é por isso que a gente faz
     cópia!)

============================================================
 6. PROBLEMAS COMUNS E SOLUÇÕES
============================================================

┌──────────────────────────────────┬──────────────────────┐
│ PROBLEMA                         │ O QUE FAZER          │
├──────────────────────────────────┼──────────────────────┤
│ "Supabase Offline"               │ 1. Verifique internet│
│                                  │ 2. Confira config.js │
│                                  │ 3. Espere 5 min      │
│                                  │    (pode ser timeout)│
├──────────────────────────────────┼──────────────────────┤
│ "E-mail ou senha incorretos"     │ 1. Confirme o e-mail │
│ mesmo com senha certa            │    no Supabase       │
│                                  │ 2. Verifique se o    │
│                                  │    e-mail está       │
│                                  │    "Confirmed"       │
├──────────────────────────────────┼──────────────────────┤
│ Sistema abriu em branco          │ 1. F12 → Console →   │
│                                  │    veja o erro       │
│                                  │ 2. Algum arquivo .js │
│                                  │    pode estar como   │
│                                  │    .js.txt           │
├──────────────────────────────────┼──────────────────────┤
│ Botão não faz nada               │ 1. F12 → Console     │
│                                  │ 2. O "app.js" deve   │
│                                  │    estar carregado   │
│                                  │    POR ÚLTIMO        │
├──────────────────────────────────┼──────────────────────┤
│ Importação falha                 │ 1. A planilha tem    │
│                                  │    cabeçalho "RE"?   │
│                                  │ 2. Está no formato   │
│                                  │    .xlsx ou .csv?    │
├──────────────────────────────────┼──────────────────────┤
│ Policial não aparece na turma    │ 1. Foi aprovado na   │
│ após aprovar matrícula           │    Gestão?           │
│                                  │ 2. Clicou em         │
│                                  │    Sincronizar?      │
│                                  │ 3. A turma é do      │
│                                  │    mesmo ano?        │
└──────────────────────────────────┴──────────────────────┘

============================================================
 7. AVISOS IMPORTANTES
============================================================

⚠ NUNCA mexa em dois arquivos ao mesmo tempo sem
  entender o que cada um faz.

⚠ ANTES de alterar, faça uma CÓPIA do arquivo original
  (ex.: style.css → style_copia.css).

⚠ Se mudar os ANOS, mude em DOIS lugares:
  - index.html (as <option>)
  - helper.js (a lista AVAILABLE_YEARS)

⚠ Se adicionar uma COLUNA nova na tabela de policiais,
  atualize TAMBÉM:
  - render.js (renderOfficerRow e o <thead>)
  - importexport.js (exportOfficersList)
  senão a coluna aparece na tela mas não sai no Excel.

⚠ Se adicionar um CAMPO novo no cadastro de policial,
  atualize também:
  - importexport.js (normalizeHeader e exportação)
  - render.js (renderOfficerRow)
  - sync.js (buildAlocacaoRow)
  senão não salva na nuvem.

⚠ O APP.JS precisa ser o ÚLTIMO da lista de <script>
  no index.html. Não mude essa ordem.

============================================================
 8. SIGLAS E TERMOS
============================================================

▸ EAP     = Estágio de Atualização Profissional
▸ TAF     = Teste de Aptidão Física
▸ TAF III = TAF sem restrição (apto)
▸ TAF IV  = TAF com restrição (lesão, cardíaco...)
▸ IAS     = Inspeção de Saúde (médico/odonto)
▸ EAD     = Ensino a Distância
▸ RE      = Registro do policial (6 dígitos)
▸ Dg      = Dígito verificador do RE
▸ Cia     = Companhia
▸ Supabase= O banco de dados na nuvem
▸ localStorage = O "caderno" que fica no navegador
▸ Deploy  = Publicar o site na internet
▸ Modal   = Janela pop-up

============================================================
 9. FLUXO DAS MATRÍCULAS (para o gestor)
============================================================

O ciclo completo é assim:

  [1] POLICIAL se inscreve no app "Matrícula EAP"
       → aparece aqui com "Pendente"
           │
           ▼
  [2] GESTOR aprova ou devolve (aqui)
       │
       ├── APROVADO ──────────────────────────────
       │   • O policial entra na turma
       │   (aparece na tela "Turmas" após
       │   Sincronizar)
       │
       └── DEVOLVIDO ─────────────────────────────
           • Vai para "Matrículas Devolvidas"
             no app do policial
           • O policial lê o motivo, corrige e
             clica em "Reenviar"
           • Volta como "Pendente" para você
             aprovar de novo

Se precisar REABRIR (voltar para Pendente), o gestor
pode fazer isso também (ele reverte a alocação).

============================================================
 10. CHECKLIST DE SEGURANÇA
============================================================

Antes de fazer qualquer mudança, responda:

  [ ] Eu sei QUAL arquivo abrir (consulte a tabela
      do item 4)?
  [ ] Fiz uma CÓPIA do arquivo?
  [ ] Sei o que exatamente quero mudar?
  [ ] Vou conseguir TESTAR depois de salvar?

Se a resposta foi SIM para as 4, pode ir em frente.
Se alguma foi NÃO, pare e pense novamente.

============================================================
 FIM DO GUIA
============================================================

Regra final: quando em dúvida sobre QUAL arquivo abrir,
volte na tabela do item 4 (é a mais importante).

Bom trabalho!