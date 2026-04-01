/**
 * DEKA OS v2.0 — relatorios.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo: Relatórios ao Cliente (AGT_RELATORIO)
 *
 * RESPONSABILIDADES:
 *   - Carrega obras ativas do Supabase
 *   - Permite seleção de obra e período
 *   - Gera relatório semanal em Markdown via Claude Haiku
 *   - Renderiza preview com marked.parse()
 *   - Permite copiar para clipboard
 *
 * TABELAS SUPABASE (READ-ONLY):
 *   - obras, obra_servicos, obra_visitas, obra_pendencias
 *
 * REGRAS DEKA OS:
 *   - Zero try/catch silenciosos
 *   - fetchComTimeout obrigatório
 *   - Cache de obras: 15min (chave: deka_cache_v2_obras_ativas)
 *   - Modelo: claude-haiku-4-5 (relatórios simples)
 */

// =============================================================================
// IMPORTS
// =============================================================================

import {
  supabase,
  showToast,
  fetchComTimeout,
  chamarClaude,
  cacheGet,
  cacheSet,
} from './deka.js';

// =============================================================================
// CONSTANTES
// =============================================================================

const CACHE_TTL_OBRAS_MIN = 15;
const CACHE_KEY_OBRAS = 'deka_cache_v2_obras_ativas';
const TEMPLATE_HTML_PATH = './relatorio-cliente-template.html';

const SYSTEM_PROMPT_AGT_RELATORIO = `
Você é o AGT_RELATORIO da Berti Construtora.

Sua tarefa: gerar relatórios semanais de obra para clientes de médio-alto padrão.

REGRAS ABSOLUTAS (PADRÃO BERTI):
1. NUNCA exiba códigos internos ao cliente (SRV-*, EQ-*, UUIDs, IDs técnicos)
2. NUNCA mencione problemas sem apresentar a solução junto
3. Use linguagem profissional mas acessível (sem jargões técnicos não explicados)
4. Seja direto: o cliente lê em menos de 3 minutos
5. Tom positivo e seguro (transmita controle e competência)

TRADUÇÕES OBRIGATÓRIAS:
❌ "SRV-013 — 75% concluído"
✅ "O fechamento do forro da sala está 75% concluído"

❌ "EQ-ACO-01 pendente"
✅ "A equipe de acabamento iniciará os trabalhos na quinta-feira"

❌ "Houve um atraso na entrega do porcelanato"
✅ "O porcelanato teve um pequeno atraso (novo prazo: sexta). Para não impactar o cronograma, adiantamos o trabalho elétrico."

FORMATO OBRIGATÓRIO:
# Atualização Semanal — [Nome da Obra]
📅 Semana de [data início] a [data fim]

## ✅ O que avançamos esta semana
[2-4 bullets com progresso em linguagem simples]

## 📋 O que estamos resolvendo
[Máximo 2 itens — cada um com a solução em andamento]

## 📆 O que esperar na próxima semana
[2-3 bullets com previsão clara]

**Avanço geral da obra: [X]%**
Dúvidas? Estamos à disposição.

IMPORTANTE:
- Retorne APENAS o Markdown formatado
- Use APENAS a estrutura Markdown do template acima. Não adicione formatação extra.
- Máximo 500 palavras

Se os dados da semana estiverem vazios ou insuficientes para gerar um relatório completo, retorne:

# Atualização Semanal — [Nome da Obra]
📅 Semana de [data início] a [data fim]

Esta semana nossa equipe trabalhou nos preparativos internos da obra.
Na próxima atualização, traremos detalhes sobre o andamento dos serviços.

**Avanço geral da obra: [X]%**
Dúvidas? Estamos à disposição.
`.trim();

// =============================================================================
// ESTADO GLOBAL
// =============================================================================

const Estado = {
  // DOM
  dataInicio: null,
  dataFim: null,
  obrasGrid: null,
  obraChip: null,
  btnGerarRelatorio: null,
  btnPreviaHtml: null,
  step1: null,
  step2: null,
  step3: null,
  step4: null,
  previewContent: null,
  previewMeta: null,
  previewRaw: null,
  btnCopiar: null,
  btnNovo: null,

  // Dados
  obraSelecionada: null,
  relatorioGerado: null,
  dadosConsolidados: null,
};

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

export async function init() {
  console.log('[DEKA][Relatorios] Inicializando módulo...');

  carregarElementosDOM();
  configurarEventListeners();
  preencherDatasDefault();
  await carregarObras();

  console.log('[DEKA][Relatorios] ✅ Módulo inicializado.');
}

function carregarElementosDOM() {
  Estado.dataInicio = document.getElementById('data-inicio');
  Estado.dataFim = document.getElementById('data-fim');
  Estado.obrasGrid = document.getElementById('obras-grid');
  Estado.obraChip = document.getElementById('obra-selecionada-chip');
  Estado.btnGerarRelatorio = document.getElementById('btn-gerar-relatorio');
  Estado.btnPreviaHtml = document.getElementById('btn-previa-html');
  Estado.step1 = document.getElementById('step-1');
  Estado.step2 = document.getElementById('step-2');
  Estado.step3 = document.getElementById('step-3');
  Estado.step4 = document.getElementById('step-4');
  Estado.previewContent = document.getElementById('preview-content');
  Estado.previewMeta = document.getElementById('preview-meta');
  Estado.previewRaw = document.getElementById('preview-raw');
  Estado.btnCopiar = document.getElementById('btn-copiar');
  Estado.btnNovo = document.getElementById('btn-novo');
}

function configurarEventListeners() {
  // Event delegation no grid de obras
  Estado.obrasGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.obra-card');
    if (!card) return;

    // Remove seleção anterior
    document.querySelectorAll('.obra-card').forEach((c) => c.classList.remove('selected'));

    // Seleciona nova obra
    card.classList.add('selected');
    Estado.obraSelecionada = {
      id: card.dataset.obraId,
      nome: card.dataset.obraNome,
    };

    // Atualiza chip
    Estado.obraChip.textContent = Estado.obraSelecionada.nome;
    Estado.obraChip.style.display = 'inline-block';

    // Habilita botões
    Estado.btnGerarRelatorio.disabled = false;
    Estado.btnPreviaHtml.disabled = false;
  });

  Estado.btnGerarRelatorio.addEventListener('click', gerarRelatorio);
  Estado.btnPreviaHtml.addEventListener('click', gerarPreviaHTML);
  Estado.btnCopiar.addEventListener('click', copiarParaClipboard);
  Estado.btnNovo.addEventListener('click', resetarUI);
}

function preencherDatasDefault() {
  const hoje = new Date();
  const seteDiasAtras = new Date(hoje);
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  Estado.dataInicio.value = seteDiasAtras.toISOString().split('T')[0];
  Estado.dataFim.value = hoje.toISOString().split('T')[0];
}

// =============================================================================
// CARREGAMENTO DE OBRAS
// =============================================================================

async function carregarObras() {
  try {
    // Cache
    const cached = cacheGet(CACHE_KEY_OBRAS);
    if (cached) {
      console.log('[DEKA][Relatorios] Usando obras do cache.');
      renderizarObras(cached);
      return;
    }

    // Supabase
    const { data, error } = await supabase
      .from('obras')
      .select('id, nome, cliente, percentual_global, status')
      .eq('status', 'ativa')
      .order('nome');

    if (error) {
      console.error('[DEKA][Relatorios] Erro ao carregar obras:', error);
      showToast('Erro ao carregar obras.', 'error');
      return;
    }

    const obras = data || [];
    cacheSet(CACHE_KEY_OBRAS, obras, CACHE_TTL_OBRAS_MIN);
    renderizarObras(obras);

  } catch (erro) {
    console.error('[DEKA][Relatorios] Exceção ao carregar obras:', erro);
    showToast(erro.message || 'Erro inesperado.', 'error');
  }
}

function renderizarObras(obras) {
  Estado.obrasGrid.innerHTML = '';

  if (obras.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'empty-state';
    vazio.textContent = 'Nenhuma obra ativa encontrada.';
    Estado.obrasGrid.appendChild(vazio);
    return;
  }

  obras.forEach((obra) => {
    const card = document.createElement('div');
    card.className = 'obra-card';
    card.dataset.obraId = obra.id;
    card.dataset.obraNome = obra.nome;

    card.innerHTML = `
      <div class="obra-nome">${obra.nome}</div>
      <div class="obra-cliente">${obra.cliente}</div>
      <div class="obra-progresso">${obra.percentual_global || 0}% concluído</div>
    `;

    Estado.obrasGrid.appendChild(card);
  });

  console.log('[DEKA][Relatorios] Obras renderizadas:', obras.length);
}

// =============================================================================
// GERAÇÃO DE RELATÓRIO
// =============================================================================

async function gerarRelatorio() {
  if (!Estado.obraSelecionada) {
    showToast('Selecione uma obra primeiro.', 'warning');
    return;
  }

  try {
    Estado.btnGerarRelatorio.disabled = true;
    Estado.btnGerarRelatorio.textContent = '⏳ Gerando...';

    // Reset steps
    [Estado.step1, Estado.step2, Estado.step3, Estado.step4].forEach((s) => {
      s.classList.remove('active', 'done');
    });

    // Step 1: Coleta de dados
    Estado.step1.classList.add('active');
    showToast('Coletando dados...', 'info');

    // Validar datas
    const dataInicioStr = Estado.dataInicio.value;
    const dataFimStr = Estado.dataFim.value;

    if (!dataInicioStr || !dataFimStr) {
      showToast('Preencha as datas de início e fim.', 'warning');
      Estado.step1.classList.remove('active');
      return;
    }

    const dataInicioDate = new Date(dataInicioStr);
    const dataFimDate = new Date(dataFimStr);

    if (dataFimDate < dataInicioDate) {
      showToast('Data fim deve ser posterior à data início.', 'warning');
      Estado.step1.classList.remove('active');
      return;
    }

    // Busca paralela
    const [obra, servicos, visitas, pendencias] = await Promise.all([
      buscarObra(Estado.obraSelecionada.id),
      buscarServicos(Estado.obraSelecionada.id),
      buscarVisitas(Estado.obraSelecionada.id, dataInicioStr, dataFimStr),
      buscarPendencias(Estado.obraSelecionada.id),
    ]);

    Estado.step1.classList.remove('active');
    Estado.step1.classList.add('done');

    // Step 2: Processamento com IA
    Estado.step2.classList.add('active');
    showToast('Processando com IA...', 'info');

    const contexto = montarContexto(obra, servicos, visitas, pendencias, dataInicioStr, dataFimStr);
    const { texto: relatorioMd } = await chamarClaude({
      mensagens: [{ role: 'user', content: contexto }],
      sistemaPrompt: SYSTEM_PROMPT_AGT_RELATORIO,
      modelo: 'claude-haiku-4-5',
      maxTokens: 2048,
      temperature: 0.3,
      agente: 'AGT_RELATORIO',
    });

    Estado.step2.classList.remove('active');
    Estado.step2.classList.add('done');

    // Step 3: Renderização
    Estado.step3.classList.add('active');
    showToast('Renderizando preview...', 'info');

    renderizarPreview(relatorioMd, obra, dataInicioStr, dataFimStr);

    Estado.step3.classList.remove('active');
    Estado.step3.classList.add('done');

    // Step 4: Finalização
    Estado.step4.classList.add('active');
    Estado.step4.classList.add('done');

    showToast('Relatório gerado com sucesso!', 'success');
    console.log('[DEKA][Relatorios] Relatório gerado.');

  } catch (erro) {
    console.error('[DEKA][Relatorios] Erro ao gerar relatório:', erro);
    showToast(erro.message || 'Erro ao gerar relatório.', 'error');

    // Reset steps em caso de erro
    [Estado.step1, Estado.step2, Estado.step3, Estado.step4].forEach((s) => {
      s.classList.remove('active', 'done');
    });
  } finally {
    Estado.btnGerarRelatorio.disabled = false;
    Estado.btnGerarRelatorio.textContent = '✨ Gerar Relatório';
  }
}

async function buscarObra(obraId) {
  const { data, error } = await supabase
    .from('obras')
    .select('*')
    .eq('id', obraId)
    .single();

  if (error) throw new Error('Erro ao buscar obra: ' + error.message);
  return data;
}

async function buscarServicos(obraId) {
  const { data, error } = await supabase
    .from('obra_servicos')
    .select('*')
    .eq('obra_id', obraId);

  if (error) throw new Error('Erro ao buscar serviços: ' + error.message);
  return data || [];
}

async function buscarVisitas(obraId, dataInicio, dataFim) {
  const { data, error } = await supabase
    .from('obra_visitas')
    .select('*')
    .eq('obra_id', obraId)
    .gte('data_visita', dataInicio)
    .lte('data_visita', dataFim);

  if (error) throw new Error('Erro ao buscar visitas: ' + error.message);
  return data || [];
}

async function buscarPendencias(obraId) {
  const { data, error } = await supabase
    .from('obra_pendencias')
    .select('*')
    .eq('obra_id', obraId)
    .in('status', ['aberta', 'em_andamento']);

  if (error) throw new Error('Erro ao buscar pendências: ' + error.message);
  return data || [];
}

function montarContexto(obra, servicos, visitas, pendencias, dataInicio, dataFim) {
  return `
Gere um relatório semanal para o cliente sobre a obra:

DADOS DA OBRA:
- Nome: ${obra.nome}
- Cliente: ${obra.cliente}
- Avanço geral: ${obra.percentual_global || 0}%
- Período: ${dataInicio} a ${dataFim}

SERVIÇOS (progresso atual):
${servicos.map((s) => `- ${s.descricao_cliente}: ${s.percentual_concluido}%`).join('\n')}

VISITAS NO PERÍODO (resumos):
${visitas.length > 0 ? visitas.map((v) => `- ${v.data_visita}: ${v.resumo_ia || 'Sem resumo'}`).join('\n') : 'Nenhuma visita registrada no período.'}

PENDÊNCIAS ABERTAS:
${pendencias.length > 0 ? pendencias.map((p) => `- ${p.descricao} (${p.prioridade})`).join('\n') : 'Nenhuma pendência aberta.'}

LEMBRE-SE:
- NUNCA exiba códigos internos (SRV-*, EQ-*)
- Use apenas a descrição traduzida para o cliente
- Sempre solução junto ao problema
- Siga o formato obrigatório do Padrão Berti
`.trim();
}

// =============================================================================
// GERAÇÃO DE PRÉVIA HTML
// =============================================================================

/**
 * Gera prévia HTML completa do relatório em nova janela.
 */
async function gerarPreviaHTML() {
  if (!Estado.obraSelecionada) {
    showToast('Selecione uma obra primeiro.', 'warning');
    return;
  }

  try {
    Estado.btnPreviaHtml.disabled = true;
    Estado.btnPreviaHtml.textContent = '⏳ Gerando prévia...';

    // Valida datas
    const dataInicioStr = Estado.dataInicio.value;
    const dataFimStr = Estado.dataFim.value;

    if (!dataInicioStr || !dataFimStr) {
      showToast('Preencha as datas de início e fim.', 'warning');
      return;
    }

    const dataInicioDate = new Date(dataInicioStr);
    const dataFimDate = new Date(dataFimStr);

    if (dataFimDate < dataInicioDate) {
      showToast('Data fim deve ser posterior à data início.', 'warning');
      return;
    }

    showToast('Carregando template HTML...', 'info');

    // 1. Carrega template HTML
    const response = await fetchComTimeout(TEMPLATE_HTML_PATH, {}, 15000);
    const templateHtml = await response.text();

    showToast('Consolidando dados...', 'info');

    // 2. Monta dados consolidados
    const dados = await montarDadosRelatorio(
      Estado.obraSelecionada.id,
      dataInicioStr,
      dataFimStr
    );

    // Guarda dados consolidados para uso futuro
    Estado.dadosConsolidados = dados;

    showToast('Gerando HTML...', 'info');

    // 3. Gera HTML completo
    const htmlCompleto = gerarHTMLRelatorio(dados, templateHtml);

    // 4. Abre em nova janela
    const novaJanela = window.open('', '_blank');
    if (novaJanela) {
      novaJanela.document.write(htmlCompleto);
      novaJanela.document.close();
      showToast('Prévia HTML aberta em nova aba!', 'success');
      console.log('[DEKA][Relatorios] Prévia HTML gerada.');
    } else {
      showToast('Não foi possível abrir nova janela. Verifique bloqueador de pop-ups.', 'warning');
    }

  } catch (erro) {
    console.error('[DEKA][Relatorios] Erro ao gerar prévia HTML:', erro);
    showToast(erro.message || 'Erro ao gerar prévia HTML.', 'error');
  } finally {
    Estado.btnPreviaHtml.disabled = false;
    Estado.btnPreviaHtml.textContent = '👁️ Prévia HTML';
  }
}

// =============================================================================
// MONTAGEM DE DADOS CONSOLIDADOS
// =============================================================================

/**
 * Consolida todos os dados necessários para o relatório HTML.
 * @param {string} obraId - UUID da obra
 * @param {string} dataInicio - Data início no formato YYYY-MM-DD
 * @param {string} dataFim - Data fim no formato YYYY-MM-DD
 * @returns {Promise<Object>} Dados consolidados
 */
async function montarDadosRelatorio(obraId, dataInicio, dataFim) {
  try {
    // Busca paralela de todos os dados
    const [obra, servicos, visitas, pendencias, fotos, compras, snapshotAnterior] = await Promise.all([
      buscarObra(obraId),
      buscarServicos(obraId),
      buscarVisitas(obraId, dataInicio, dataFim),
      buscarPendencias(obraId),
      buscarFotosGracioso(obraId, dataInicio, dataFim),
      buscarComprasGracioso(obraId, dataInicio, dataFim),
      buscarSnapshotAnteriorGracioso(obraId, dataInicio),
    ]);

    // Calcula número da semana
    const semanaNumero = calcularNumeroSemana(dataInicio);

    // Monta objeto consolidado
    return {
      obra,
      servicos,
      visitas,
      pendencias,
      fotos: fotos || [],
      compras: compras || [],
      snapshotAnterior: snapshotAnterior || null,
      periodo: { inicio: dataInicio, fim: dataFim },
      semanaNumero,
    };

  } catch (erro) {
    console.error('[DEKA][Relatorios] Erro ao montar dados:', erro);
    throw new Error('Falha ao consolidar dados do relatório: ' + erro.message);
  }
}

/**
 * Busca fotos com fallback gracioso (não quebra se tabela não existir).
 */
async function buscarFotosGracioso(obraId, dataInicio, dataFim) {
  try {
    const { data, error } = await supabase
      .from('obra_fotos')
      .select('*')
      .eq('obra_id', obraId)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (error) {
      // Se erro for "relation does not exist", retorna null graciosamente
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.warn('[DEKA][Relatorios] Tabela obra_fotos não existe ainda. Continuando sem fotos.');
        return null;
      }
      throw error;
    }

    return data || [];
  } catch (erro) {
    console.warn('[DEKA][Relatorios] Erro ao buscar fotos (continuando):', erro.message);
    return null;
  }
}

/**
 * Busca compras com fallback gracioso (não quebra se tabela não existir).
 */
async function buscarComprasGracioso(obraId, dataInicio, dataFim) {
  try {
    const { data, error } = await supabase
      .from('obra_compras')
      .select('*')
      .eq('obra_id', obraId)
      .gte('data', dataInicio)
      .lte('data', dataFim);

    if (error) {
      // Se erro for "relation does not exist", retorna null graciosamente
      if (error.message.includes('does not exist') || error.code === '42P01') {
        console.warn('[DEKA][Relatorios] Tabela obra_compras não existe ainda. Continuando sem compras.');
        return null;
      }
      throw error;
    }

    return data || [];
  } catch (erro) {
    console.warn('[DEKA][Relatorios] Erro ao buscar compras (continuando):', erro.message);
    return null;
  }
}

/**
 * Busca snapshot anterior com fallback gracioso.
 */
async function buscarSnapshotAnteriorGracioso(obraId, dataInicio) {
  try {
    const { data, error } = await supabase
      .from('obra_snapshots')
      .select('*')
      .eq('obra_id', obraId)
      .lt('semana', dataInicio)
      .order('semana', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42P01' || error.code === 'PGRST116') {
        console.warn('[DEKA][Relatorios] Tabela obra_snapshots não existe ou sem snapshot anterior.');
        return null;
      }
      throw error;
    }

    return data;
  } catch (erro) {
    console.warn('[DEKA][Relatorios] Erro ao buscar snapshot anterior (continuando):', erro.message);
    return null;
  }
}

/**
 * Calcula o número da semana do ano.
 */
function calcularNumeroSemana(dataStr) {
  const data = new Date(dataStr);
  const inicioAno = new Date(data.getFullYear(), 0, 1);
  const diasPassados = Math.floor((data - inicioAno) / (24 * 60 * 60 * 1000));
  return Math.ceil((diasPassados + inicioAno.getDay() + 1) / 7);
}

// =============================================================================
// GERAÇÃO DE HTML A PARTIR DO TEMPLATE
// =============================================================================

/**
 * Gera o HTML do relatório substituindo placeholders no template.
 * @param {Object} dados - Dados consolidados da obra
 * @param {string} templateHtml - HTML do template com placeholders
 * @returns {string} HTML completo pronto para envio
 */
function gerarHTMLRelatorio(dados, templateHtml) {
  let html = templateHtml;

  // Substitui dados básicos
  html = html.replace(/\{\{NOME_OBRA\}\}/g, dados.obra.nome || 'Obra sem nome');
  html = html.replace(/\{\{NOME_CLIENTE\}\}/g, dados.obra.cliente || 'Cliente não informado');
  html = html.replace(/\{\{PERIODO_INICIO\}\}/g, formatarDataBR(dados.periodo.inicio));
  html = html.replace(/\{\{PERIODO_FIM\}\}/g, formatarDataBR(dados.periodo.fim));
  html = html.replace(/\{\{SEMANA_NUMERO\}\}/g, dados.semanaNumero.toString());
  html = html.replace(/\{\{PERCENTUAL_ATUAL\}\}/g, (dados.obra.percentual_global || 0).toString());
  html = html.replace(/\{\{DATA_GERACAO\}\}/g, formatarDataBR(new Date().toISOString().split('T')[0]));

  // Percentual anterior (comparativo)
  const percentualAnterior = dados.snapshotAnterior?.pct_geral || null;
  let textoComparativo = '';
  if (percentualAnterior !== null) {
    const diff = (dados.obra.percentual_global || 0) - percentualAnterior;
    if (diff > 0) {
      textoComparativo = `Avanço de ${diff.toFixed(1)}% em relação à semana anterior`;
    } else if (diff === 0) {
      textoComparativo = 'Mantido em relação à semana anterior';
    } else {
      textoComparativo = '';
    }
  }
  html = html.replace(/\{\{PERCENTUAL_ANTERIOR\}\}/g, textoComparativo);

  // Lista de serviços realizados
  const servicosHtml = gerarListaServicosHTML(dados.servicos, dados.visitas);
  html = html.replace(/\{\{LISTA_SERVICOS_HTML\}\}/g, servicosHtml);

  // Grid de fotos
  const fotosHtml = gerarGridFotosHTML(dados.fotos);
  html = html.replace(/\{\{GRID_FOTOS_HTML\}\}/g, fotosHtml);

  // Lista de compras
  const comprasHtml = gerarListaComprasHTML(dados.compras);
  html = html.replace(/\{\{LISTA_COMPRAS_HTML\}\}/g, comprasHtml);

  // Lista de pendências
  const pendenciasHtml = gerarListaPendenciasHTML(dados.pendencias);
  html = html.replace(/\{\{LISTA_PENDENCIAS_HTML\}\}/g, pendenciasHtml);

  // Próximos passos (baseado em serviços com baixo percentual)
  const proximosHtml = gerarProximosPassosHTML(dados.servicos);
  html = html.replace(/\{\{LISTA_PROXIMOS_PASSOS_HTML\}\}/g, proximosHtml);

  return html;
}

function gerarListaServicosHTML(servicos, visitas) {
  // Filtra serviços com progresso > 0 e ordena por percentual decrescente
  const servicosComProgresso = servicos.filter((s) => (s.percentual_concluido || 0) > 0);

  if (servicosComProgresso.length === 0) {
    return '<p class="empty-state">Nenhum serviço executado no período.</p>';
  }

  const itens = servicosComProgresso
    .sort((a, b) => (b.percentual_concluido || 0) - (a.percentual_concluido || 0))
    .slice(0, 8) // Máximo 8 itens
    .map((s) => {
      const descricao = s.descricao_cliente || s.descricao_interna || 'Serviço sem descrição';
      const percentual = s.percentual_concluido || 0;
      const status = percentual >= 100 ? '(concluído)' : `(${percentual}%)`;
      return `<li>Foram executados os serviços de ${descricao} ${status}</li>`;
    })
    .join('\n');

  return `<ul>${itens}</ul>`;
}

function gerarGridFotosHTML(fotos) {
  if (!fotos || fotos.length === 0) {
    return '<p class="empty-state">Registro fotográfico em breve.</p>';
  }

  // Máximo 6 fotos
  const fotosLimitadas = fotos.slice(0, 6);

  return fotosLimitadas
    .map((foto) => {
      const url = foto.url || '';
      const legenda = foto.descricao || 'Registro da obra';
      return `
        <div class="foto-item">
          <img src="${url}" alt="${legenda}">
          <div class="foto-legenda">${legenda}</div>
        </div>
      `;
    })
    .join('\n');
}

function gerarListaComprasHTML(compras) {
  if (!compras || compras.length === 0) {
    return '<p class="empty-state">Nenhuma compra registrada no período.</p>';
  }

  // Agrupa por categoria
  const comprasPorCategoria = compras.reduce((acc, compra) => {
    const cat = compra.categoria || 'Outros';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(compra);
    return acc;
  }, {});

  return Object.entries(comprasPorCategoria)
    .map(([categoria, itens]) => {
      const listaItens = itens
        .map((item) => item.descricao || 'Item sem descrição')
        .join(', ');
      return `
        <div class="material-item">
          <div class="material-categoria">${categoria}</div>
          <div class="material-descricao">${listaItens}</div>
        </div>
      `;
    })
    .join('\n');
}

function gerarListaPendenciasHTML(pendencias) {
  if (pendencias.length === 0) {
    return '<p class="empty-state">Nenhuma pendência no momento. Obra em andamento normal.</p>';
  }

  // Filtra apenas pendências relevantes para o cliente (prioridades alta e crítica)
  const pendenciasRelevantes = pendencias.filter(
    (p) => p.prioridade === 'alta' || p.prioridade === 'critica'
  );

  if (pendenciasRelevantes.length === 0) {
    return '<p class="empty-state">Nenhuma pendência no momento. Obra em andamento normal.</p>';
  }

  return pendenciasRelevantes
    .slice(0, 3) // Máximo 3 pendências
    .map((p) => {
      const descricao = p.descricao || 'Pendência sem descrição';
      // Sempre apresentar solução junto (fictícia se não houver no banco)
      const solucao = 'Nossa equipe está trabalhando na resolução e acompanhando de perto.';
      return `
        <div class="pendencia-item">
          <div class="pendencia-titulo">${descricao}</div>
          <div class="pendencia-solucao">${solucao}</div>
        </div>
      `;
    })
    .join('\n');
}

function gerarProximosPassosHTML(servicos) {
  // Filtra serviços com percentual < 100 e ordena por percentual decrescente
  const servicosPendentes = servicos
    .filter((s) => (s.percentual_concluido || 0) < 100)
    .sort((a, b) => (b.percentual_concluido || 0) - (a.percentual_concluido || 0))
    .slice(0, 4); // Máximo 4 próximos passos

  if (servicosPendentes.length === 0) {
    return '<li>Finalização e entrega da obra</li>';
  }

  return servicosPendentes
    .map((s) => {
      const descricao = s.descricao_cliente || s.descricao_interna || 'Serviço';
      return `<li>Continuidade dos serviços de ${descricao}</li>`;
    })
    .join('\n');
}

function formatarDataBR(dataStr) {
  if (!dataStr) return '';
  const [ano, mes, dia] = dataStr.split('-');
  return `${dia}/${mes}/${ano}`;
}

// =============================================================================
// RENDERIZAÇÃO DO PREVIEW
// =============================================================================

function renderizarPreview(relatorioMd, obra, dataInicio, dataFim) {
  // Importa marked (assumindo que está disponível globalmente ou via CDN)
  if (typeof marked === 'undefined') {
    throw new Error('Biblioteca marked.js não encontrada. Adicione ao HTML.');
  }

  // Renderiza HTML
  const htmlContent = marked.parse(relatorioMd);
  Estado.previewContent.innerHTML = htmlContent;

  // Preenche meta
  Estado.previewMeta.textContent = `${obra.nome} • ${dataInicio} a ${dataFim}`;

  // Guarda markdown bruto
  Estado.previewRaw.value = relatorioMd;
  Estado.relatorioGerado = relatorioMd;

  // Habilita botões
  Estado.btnCopiar.disabled = false;
  Estado.btnNovo.disabled = false;
}

// =============================================================================
// AÇÕES: COPIAR E NOVO
// =============================================================================

async function copiarParaClipboard() {
  if (!Estado.relatorioGerado) {
    showToast('Nenhum relatório para copiar.', 'warning');
    return;
  }

  try {
    await navigator.clipboard.writeText(Estado.relatorioGerado);
    showToast('Relatório copiado para a área de transferência!', 'success');
    console.log('[DEKA][Relatorios] Relatório copiado.');
  } catch (erro) {
    console.error('[DEKA][Relatorios] Erro ao copiar:', erro);
    showToast('Erro ao copiar. Tente selecionar e copiar manualmente.', 'error');
  }
}

function resetarUI() {
  // Reseta seleção de obra
  document.querySelectorAll('.obra-card').forEach((c) => c.classList.remove('selected'));
  Estado.obraSelecionada = null;
  Estado.obraChip.style.display = 'none';
  Estado.obraChip.textContent = '';

  // Reseta steps
  [Estado.step1, Estado.step2, Estado.step3, Estado.step4].forEach((s) => {
    s.classList.remove('active', 'done');
  });

  // Reseta preview
  Estado.previewContent.innerHTML = '<p class="empty-preview">O relatório aparecerá aqui.</p>';
  Estado.previewMeta.textContent = '';
  Estado.previewRaw.value = '';
  Estado.relatorioGerado = null;

  // Desabilita botões
  Estado.btnGerarRelatorio.disabled = true;
  Estado.btnPreviaHtml.disabled = true;
  Estado.btnCopiar.disabled = true;
  Estado.btnNovo.disabled = true;

  // Limpa dados consolidados
  Estado.dadosConsolidados = null;

  console.log('[DEKA][Relatorios] UI resetada.');
}

// =============================================================================
// FIM DO ARQUIVO
// =============================================================================
