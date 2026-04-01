/**
 * DEKA OS v2.0 — financeiro.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo: Agente Financeiro
 * Funções: Upload CSV, Categorização IA, Gravação Supabase, DRE por Obra
 *
 * EXPORTS PÚBLICOS:
 *   init()  Ponto de entrada — chamado pelo financeiro.html
 *
 * REGRAS DEKA OS:
 *   - Todo fetch via fetchComTimeout (15s padrão)
 *   - Todo catch → console.error + showToast
 *   - Campos explícitos em SELECT (nunca SELECT *)
 *   - Cache via cacheGet/cacheSet com TTL
 */

import {
  supabase,
  showToast,
  fetchComTimeout,
  chamarClaude,
  extrairJSON,
  formatarDataBR,
  formatarMoedaBR,
  WORKER_URL,
} from './deka.js';

// =============================================================================
// SEÇÃO 1 — CONSTANTES E REGRAS DE CATEGORIZAÇÃO
// =============================================================================

/** Regras fixas de categorização — determinísticas, executadas antes da IA */
const REGRAS_FIXAS = [
  {
    padrao: /HEBRON/i,
    tipo: 'receita',
    categoria: 'taxa_administracao',
    obra_slug: 'badida',
    confianca: 1.0,
  },
  {
    padrao: /REGINALDO/i,
    tipo: 'despesa',
    categoria: 'salario',
    obra_id: null, // empresa
    confianca: 1.0,
  },
  {
    padrao: /MCW|PARTICIP/i,
    tipo: 'despesa',
    categoria: 'endereco_fiscal',
    obra_id: null, // empresa
    confianca: 1.0,
  },
  {
    padrao: /UNIMED|AMIL/i,
    tipo: 'despesa',
    categoria: 'saude',
    obra_id: null, // empresa
    confianca: 1.0,
  },
];

/** System prompt do AGT_FINANCEIRO */
const SYSTEM_PROMPT_AGT_FINANCEIRO = `
Você é o AGT_FINANCEIRO da Berti Construtora.
Categorize lançamentos bancários de uma construtora.

REGRAS DE CATEGORIZAÇÃO:
- Contém "HEBRON" → tipo: receita, categoria: taxa_administracao
- Contém "REGINALDO" → tipo: despesa, categoria: salario, sem obra_id
- Contém "MCW" ou "PARTICIP" → tipo: despesa, categoria: endereco_fiscal
- Contém "UNIMED" ou "AMIL" → tipo: despesa, categoria: saude
- Transferência para PF (nome próprio, valor redondo) → categoria: prolabore
- Material de construção (Leroy, C&C, Sodimac) → tipo: despesa, categoria: material
- Mão de obra / serviço técnico → tipo: despesa, categoria: mao_de_obra

FORMATO DE RESPOSTA (JSON puro, SEM markdown):
{
  "tipo": "receita" | "despesa",
  "categoria": "categoria_aqui",
  "obra_id": null,
  "confianca": 0.95,
  "sugestao_revisao": false,
  "justificativa": "breve explicação"
}

Se não conseguir categorizar com confiança > 0.7, retorne confianca baixa e sugestao_revisao: true.
`.trim();

// =============================================================================
// SEÇÃO 2 — ESTADO GLOBAL DO MÓDULO
// =============================================================================

/** Estado dos lançamentos carregados do CSV */
let lancamentosCarregados = [];

/** Obras disponíveis para vinculação */
let obrasDisponiveis = [];

/** Obra selecionada no dropdown */
let obraSelecionada = null;

// =============================================================================
// SEÇÃO 3 — PONTO DE ENTRADA (INIT)
// =============================================================================

/**
 * Inicializa o módulo financeiro.
 * Chamado pelo HTML quando o DOM estiver pronto.
 */
export async function init() {
  console.log('[DEKA][Financeiro] Iniciando módulo...');

  try {
    // Configura controle de tema
    configurarTema();

    // Carrega obras do Supabase
    await carregarObras();

    // Configura event listeners
    configurarEventListeners();

    console.log('[DEKA][Financeiro] Módulo inicializado com sucesso');
  } catch (erro) {
    console.error('[DEKA][Financeiro] Erro na inicialização:', erro);
    showToast('Erro ao inicializar módulo financeiro', 'error');
  }
}

// =============================================================================
// SEÇÃO 4 — CONFIGURAÇÃO DE TEMA
// =============================================================================

function configurarTema() {
  const btnTema = document.getElementById('btn-tema');
  const html = document.documentElement;

  // Lê tema salvo ou usa padrão escuro
  const temaSalvo = localStorage.getItem('deka_tema') || 'escuro';
  html.setAttribute('data-tema', temaSalvo);
  atualizarIconeTema(temaSalvo);

  btnTema?.addEventListener('click', () => {
    const temaAtual = html.getAttribute('data-tema');
    const novoTema = temaAtual === 'escuro' ? 'claro' : 'escuro';
    html.setAttribute('data-tema', novoTema);
    localStorage.setItem('deka_tema', novoTema);
    atualizarIconeTema(novoTema);
  });
}

function atualizarIconeTema(tema) {
  const btnTema = document.getElementById('btn-tema');
  if (btnTema) {
    btnTema.textContent = tema === 'escuro' ? '☀️' : '🌙';
  }
}

// =============================================================================
// SEÇÃO 5 — CARREGAR OBRAS DO SUPABASE
// =============================================================================

/**
 * Carrega obras ativas do Supabase e popula o dropdown.
 */
async function carregarObras() {
  try {
    const { data, error } = await supabase
      .from('obras')
      .select('id, nome, cliente, status')
      .in('status', ['ativa', 'pausada'])
      .order('nome', { ascending: true });

    if (error) throw error;

    obrasDisponiveis = data || [];

    // Popula o dropdown
    const select = document.getElementById('obra-selector');
    if (select) {
      select.innerHTML = `
        <option value="">Despesa da empresa (sem vinculação)</option>
        ${obrasDisponiveis
          .map(
            (obra) =>
              `<option value="${obra.id}">${obra.nome} — ${obra.cliente}</option>`
          )
          .join('')}
      `;
    }

    console.log(`[DEKA][Financeiro] ${obrasDisponiveis.length} obras carregadas`);
  } catch (erro) {
    console.error('[DEKA][Financeiro] Erro ao carregar obras:', erro);
    showToast('Erro ao carregar lista de obras', 'error');
  }
}

// =============================================================================
// SEÇÃO 6 — EVENT LISTENERS
// =============================================================================

function configurarEventListeners() {
  // Upload zone — drag & drop
  const uploadZone = document.getElementById('upload-zone');
  const uploadInput = document.getElementById('upload-input');

  uploadZone?.addEventListener('click', () => uploadInput?.click());

  uploadZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });

  uploadZone?.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });

  uploadZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    const arquivo = e.dataTransfer?.files[0];
    if (arquivo) processarCSV(arquivo);
  });

  uploadInput?.addEventListener('change', (e) => {
    const arquivo = e.target.files?.[0];
    if (arquivo) processarCSV(arquivo);
  });

  // Seleção de obra
  const obraSelector = document.getElementById('obra-selector');
  obraSelector?.addEventListener('change', (e) => {
    obraSelecionada = e.target.value || null;
    console.log('[DEKA][Financeiro] Obra selecionada:', obraSelecionada);
  });

  // Selecionar todos
  const selecionarTodos = document.getElementById('selecionar-todos');
  selecionarTodos?.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('#lancamentos-tabela input[type="checkbox"]');
    checkboxes.forEach((cb) => (cb.checked = e.target.checked));
  });

  // Botão gravar
  const btnGravar = document.getElementById('btn-gravar');
  btnGravar?.addEventListener('click', gravarLancamentos);

  // Botão exportar
  const btnExportar = document.getElementById('btn-exportar');
  btnExportar?.addEventListener('click', exportarCSV);
}

// =============================================================================
// SEÇÃO 7 — PROCESSAR CSV
// =============================================================================

/**
 * Processa arquivo CSV — detecta banco e parseia lançamentos.
 * @param {File} file
 */
async function processarCSV(file) {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    showToast('Apenas arquivos CSV são suportados', 'error');
    return;
  }

  try {
    showToast('Processando extrato...', 'info');

    const texto = await file.text();
    const linhas = texto.split('\n').filter((linha) => linha.trim());

    if (linhas.length === 0) {
      showToast('Arquivo CSV vazio', 'error');
      return;
    }

    // Detecta formato do banco
    const cabecalho = linhas[0].toLowerCase();
    let lancamentos = [];

    if (cabecalho.includes('data') && cabecalho.includes('descri')) {
      // Formato genérico: Data, Descrição, Valor
      lancamentos = parsearCSVGenerico(linhas);
    } else {
      showToast('Formato de CSV não reconhecido. Use: Data, Descrição, Valor', 'error');
      return;
    }

    // Categoriza cada lançamento
    for (const lanc of lancamentos) {
      await categorizarLancamento(lanc);
    }

    lancamentosCarregados = lancamentos;

    // Renderiza tabela
    renderizarTabela(lancamentos);

    // Habilita botões
    document.getElementById('btn-gravar').disabled = false;
    document.getElementById('btn-exportar').disabled = false;

    showToast(`${lancamentos.length} lançamentos processados`, 'success');
  } catch (erro) {
    console.error('[DEKA][Financeiro] Erro ao processar CSV:', erro);
    showToast(`Erro ao processar CSV: ${erro.message}`, 'error');
  }
}

/**
 * Parseia CSV genérico (Data, Descrição, Valor).
 * @param {string[]} linhas
 * @returns {Array}
 */
function parsearCSVGenerico(linhas) {
  const lancamentos = [];
  const dados = linhas.slice(1); // pula cabeçalho

  for (const linha of dados) {
    const colunas = linha.split(',').map((c) => c.trim().replace(/"/g, ''));

    if (colunas.length < 3) continue;

    const [dataStr, descricao, valorStr] = colunas;

    // Parse data (formato DD/MM/YYYY ou YYYY-MM-DD)
    let data = null;
    if (dataStr.includes('/')) {
      const [dia, mes, ano] = dataStr.split('/');
      data = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    } else {
      data = dataStr;
    }

    // Parse valor (remove R$, pontos de milhar, converte vírgula em ponto)
    const valor = parseFloat(
      valorStr.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')
    );

    if (!data || isNaN(valor)) continue;

    lancamentos.push({
      data,
      descricao,
      valor: Math.abs(valor),
      tipo: null,
      categoria: null,
      confianca: 0,
      obra_id: null,
      selecionado: true,
    });
  }

  return lancamentos;
}

// =============================================================================
// SEÇÃO 8 — CATEGORIZAR LANÇAMENTO
// =============================================================================

/**
 * Categoriza lançamento via regras fixas ou IA.
 * Modifica o objeto lancamento in-place.
 * @param {Object} lancamento
 */
async function categorizarLancamento(lancamento) {
  // 1. Tenta regras fixas primeiro (determinístico)
  for (const regra of REGRAS_FIXAS) {
    if (regra.padrao.test(lancamento.descricao)) {
      lancamento.tipo = regra.tipo;
      lancamento.categoria = regra.categoria;
      lancamento.confianca = regra.confianca;
      lancamento.obra_id = regra.obra_id;

      // Se tem obra_slug, busca o obra_id
      if (regra.obra_slug) {
        const obra = obrasDisponiveis.find((o) =>
          o.nome.toLowerCase().includes(regra.obra_slug)
        );
        if (obra) lancamento.obra_id = obra.id;
      }

      return;
    }
  }

  // 2. Chama IA se não encontrou regra fixa
  try {
    const prompt = `
Categorize este lançamento bancário:

Data: ${lancamento.data}
Descrição: ${lancamento.descricao}
Valor: R$ ${lancamento.valor.toFixed(2)}

Retorne JSON conforme o formato especificado.
    `.trim();

    const resposta = await chamarClaude(SYSTEM_PROMPT_AGT_FINANCEIRO, prompt, {
      max_tokens: 300,
    });

    const json = extrairJSON(resposta);

    if (json) {
      lancamento.tipo = json.tipo || 'despesa';
      lancamento.categoria = json.categoria || 'outros';
      lancamento.confianca = json.confianca || 0.5;
      lancamento.obra_id = json.obra_id || null;
    } else {
      // Fallback se JSON inválido
      lancamento.tipo = 'despesa';
      lancamento.categoria = 'outros';
      lancamento.confianca = 0.3;
    }
  } catch (erro) {
    console.error('[DEKA][Financeiro] Erro ao categorizar via IA:', erro);
    // Fallback em caso de erro
    lancamento.tipo = 'despesa';
    lancamento.categoria = 'outros';
    lancamento.confianca = 0.3;
  }
}

// =============================================================================
// SEÇÃO 9 — RENDERIZAR TABELA
// =============================================================================

/**
 * Renderiza tabela de lançamentos.
 * @param {Array} lancamentos
 */
function renderizarTabela(lancamentos) {
  const tbody = document.getElementById('lancamentos-tabela');
  if (!tbody) return;

  if (lancamentos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="estado-vazio">
          <div class="estado-vazio__icone" aria-hidden="true">📊</div>
          <p class="estado-vazio__texto">Nenhum lançamento carregado.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lancamentos
    .map((lanc, idx) => {
      const classeLinha = lanc.confianca < 0.9 ? 'revisar' : '';
      const badgeTipo =
        lanc.tipo === 'receita'
          ? '<span class="badge badge--receita">🟢 Receita</span>'
          : lanc.tipo === 'despesa'
          ? '<span class="badge badge--despesa">🔴 Despesa</span>'
          : '<span class="badge badge--revisar">⚠️ Revisar</span>';

      const classeConfianca =
        lanc.confianca >= 0.9
          ? 'confianca--alta'
          : lanc.confianca >= 0.7
          ? 'confianca--media'
          : 'confianca--baixa';

      return `
        <tr class="${classeLinha}">
          <td><input type="checkbox" data-idx="${idx}" ${
        lanc.selecionado ? 'checked' : ''
      }></td>
          <td>${formatarDataBR(lanc.data)}</td>
          <td>${lanc.descricao}</td>
          <td>${formatarMoedaBR(lanc.valor)}</td>
          <td>${badgeTipo}</td>
          <td>${lanc.categoria || '—'}</td>
          <td><span class="confianca ${classeConfianca}">${Math.round(
        lanc.confianca * 100
      )}%</span></td>
        </tr>
      `;
    })
    .join('');

  // Event listeners para checkboxes
  tbody.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const idx = parseInt(e.target.dataset.idx, 10);
      lancamentosCarregados[idx].selecionado = e.target.checked;
    });
  });
}

// =============================================================================
// SEÇÃO 10 — GRAVAR LANÇAMENTOS NO SUPABASE
// =============================================================================

/**
 * Grava lançamentos selecionados no Supabase.
 * Separa entre tabela financeiro (com obra_id) e financeiro_empresa (sem obra_id).
 */
async function gravarLancamentos() {
  const selecionados = lancamentosCarregados.filter((l) => l.selecionado);

  if (selecionados.length === 0) {
    showToast('Nenhum lançamento selecionado', 'error');
    return;
  }

  try {
    showToast('Gravando lançamentos...', 'info');

    let gravadosObra = 0;
    let gravadosEmpresa = 0;

    for (const lanc of selecionados) {
      const payload = {
        tipo: lanc.tipo,
        descricao: lanc.descricao,
        valor: lanc.valor,
        data_lancamento: lanc.data,
        categoria: lanc.categoria,
        confianca: lanc.confianca,
        origem: 'agente',
        revisado: lanc.confianca >= 0.9,
      };

      // Se tem obra_id ou obra foi selecionada no dropdown
      const obraFinal = lanc.obra_id || obraSelecionada;

      if (obraFinal) {
        // Grava em financeiro (com obra_id)
        const { error } = await supabase.from('financeiro').insert({
          ...payload,
          obra_id: obraFinal,
        });

        if (error) throw error;
        gravadosObra++;
      } else {
        // Grava em financeiro_empresa (sem obra_id)
        const { error } = await supabase.from('financeiro_empresa').insert(payload);

        if (error) throw error;
        gravadosEmpresa++;
      }
    }

    showToast(
      `${gravadosObra + gravadosEmpresa} lançamentos gravados (${gravadosObra} obra, ${gravadosEmpresa} empresa)`,
      'success'
    );

    // Limpa tabela
    lancamentosCarregados = [];
    renderizarTabela([]);

    // Atualiza DRE
    if (obraSelecionada) {
      await calcularEExibirDRE(obraSelecionada);
    }
  } catch (erro) {
    console.error('[DEKA][Financeiro] Erro ao gravar lançamentos:', erro);
    showToast(`Erro ao gravar: ${erro.message}`, 'error');
  }
}

// =============================================================================
// SEÇÃO 11 — CALCULAR E EXIBIR DRE
// =============================================================================

/**
 * Calcula DRE de uma obra e exibe no painel.
 * @param {string} obraId
 */
async function calcularEExibirDRE(obraId) {
  try {
    // Busca lançamentos da obra
    const { data: lancamentos, error } = await supabase
      .from('financeiro')
      .select('tipo, valor, status')
      .eq('obra_id', obraId);

    if (error) throw error;

    const receitas = lancamentos
      .filter((l) => l.tipo === 'receita')
      .reduce((acc, l) => acc + l.valor, 0);

    const despesas = lancamentos
      .filter((l) => l.tipo === 'despesa')
      .reduce((acc, l) => acc + l.valor, 0);

    const margem = receitas - despesas;
    const margemPerc = receitas > 0 ? (margem / receitas) * 100 : 0;

    // Renderiza DRE
    const container = document.getElementById('dre-container');
    if (container) {
      container.innerHTML = `
        <div class="dre">
          <div class="dre__item">
            <div class="dre__item-label">Receitas</div>
            <div class="dre__item-valor dre__item-valor--receita">${formatarMoedaBR(
              receitas
            )}</div>
          </div>
          <div class="dre__item">
            <div class="dre__item-label">Despesas Obra</div>
            <div class="dre__item-valor dre__item-valor--despesa">${formatarMoedaBR(
              despesas
            )}</div>
          </div>
          <div class="dre__item">
            <div class="dre__item-label">Margem Obra</div>
            <div class="dre__item-valor dre__item-valor--margem">${formatarMoedaBR(
              margem
            )}</div>
            <div class="dre__item-detalhe">${margemPerc.toFixed(1)}%</div>
          </div>
        </div>
      `;
    }
  } catch (erro) {
    console.error('[DEKA][Financeiro] Erro ao calcular DRE:', erro);
    showToast(`Erro ao calcular DRE: ${erro.message}`, 'error');
  }
}

// =============================================================================
// SEÇÃO 12 — EXPORTAR CSV
// =============================================================================

/**
 * Exporta lançamentos selecionados para CSV.
 */
function exportarCSV() {
  const selecionados = lancamentosCarregados.filter((l) => l.selecionado);

  if (selecionados.length === 0) {
    showToast('Nenhum lançamento selecionado para exportar', 'error');
    return;
  }

  const cabecalho = 'Data,Descrição,Valor,Tipo,Categoria,Confiança\n';
  const linhas = selecionados
    .map(
      (l) =>
        `${l.data},"${l.descricao}",${l.valor},${l.tipo},${l.categoria},${l.confianca}`
    )
    .join('\n');

  const csv = cabecalho + linhas;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `deka_financeiro_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();

  URL.revokeObjectURL(url);
  showToast('CSV exportado com sucesso', 'success');
}
