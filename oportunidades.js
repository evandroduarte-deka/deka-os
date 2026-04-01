/**
 * DEKA OS v2.0 — oportunidades.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo: Funil Kanban de Oportunidades Comerciais
 *
 * TABELA SUPABASE:
 *   - oportunidades → leads e oportunidades de venda
 *   - clientes → lista de clientes para vincular
 *
 * REGRAS DEKA OS:
 *   - Zero try/catch silenciosos (todo erro → console.error + showToast)
 *   - SELECT explícito (nunca SELECT *)
 *   - Cache com TTL via cacheGet/cacheSet
 *   - Comunicação com IA via chamarClaude
 */

import {
  supabase,
  showToast,
  cacheGet,
  cacheSet,
  cacheLimpar,
  chamarClaude,
} from './deka.js';

const CACHE_KEY = 'oportunidades_lista';
const CACHE_TTL_MIN = 5;

const SEQUENCIA_ETAPAS = [
  'novo_lead',
  'qualificado',
  'visita_agendada',
  'proposta_enviada',
  'negociacao',
  'fechado_ganho',
  'fechado_perdido',
];

const LABELS_ETAPAS = {
  novo_lead:        'Novo Lead',
  qualificado:      'Qualificado',
  visita_agendada:  'Visita Agendada',
  proposta_enviada: 'Proposta Enviada',
  negociacao:       'Negociação',
  fechado_ganho:    'Fechado ✓',
  fechado_perdido:  'Perdido ✗',
};

const CORES_ETAPAS = {
  novo_lead:        '#64748b',
  qualificado:      '#3b82f6',
  visita_agendada:  '#8b5cf6',
  proposta_enviada: '#f59e0b',
  negociacao:       '#ef4444',
  fechado_ganho:    '#22c55e',
  fechado_perdido:  '#6b7280',
};

const SYSTEM_PROMPT_PROXIMO_PASSO = `
Você é o assistente comercial da Berti Construtora.
Baseado na etapa e contexto da oportunidade, sugira o próximo passo ideal.

Responda com UMA frase curta e acionável (máximo 80 caracteres).
Exemplos:
- "Ligar para confirmar visita na quinta-feira"
- "Enviar proposta até sexta com validade de 15 dias"
- "Fazer followup — 5 dias sem resposta"

Retorne APENAS a frase. Sem pontuação final. Sem prefixos.
`.trim();

let oportunidadesGlobal = [];
let clientesGlobal = [];
let oportunidadeEditando = null;

// =============================================================================
// SEÇÃO 1 — INICIALIZAÇÃO
// =============================================================================

export async function init() {
  console.log('[DEKA][Oportunidades] Inicializando módulo');

  const btnNova = document.getElementById('btn-nova-oportunidade');
  const btnCancelar = document.getElementById('btn-cancelar');
  const formOportunidade = document.getElementById('form-oportunidade');
  const btnSugerir = document.getElementById('btn-sugerir-passo');

  btnNova?.addEventListener('click', () => abrirModal());
  btnCancelar?.addEventListener('click', fecharModal);
  formOportunidade?.addEventListener('submit', handleSubmitOportunidade);
  btnSugerir?.addEventListener('click', handleSugerirProximoPasso);

  const tipoRadios = document.querySelectorAll('input[name="tipo-lead"]');
  tipoRadios.forEach(radio => {
    radio.addEventListener('change', handleTipoLeadChange);
  });

  await Promise.all([
    carregarOportunidades(),
    carregarClientes(),
  ]);

  verificarNovaOportunidadeUrl();
}

// =============================================================================
// SEÇÃO 2 — CARREGAMENTO DE DADOS
// =============================================================================

async function carregarOportunidades(forcarReload = false) {
  try {
    if (!forcarReload) {
      const cache = cacheGet(CACHE_KEY);
      if (cache) {
        console.log('[DEKA][Oportunidades] Carregando do cache');
        oportunidadesGlobal = cache;
        renderizarKanban(oportunidadesGlobal);
        atualizarResumo(oportunidadesGlobal);
        return;
      }
    }

    console.log('[DEKA][Oportunidades] Buscando no Supabase');

    const { data, error } = await supabase
      .from('oportunidades')
      .select('id, cliente_id, nome_lead, telefone_lead, valor_estimado, etapa, origem, observacoes, proximo_passo, data_ultimo_contato, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    oportunidadesGlobal = data || [];

    for (const op of oportunidadesGlobal) {
      if (op.cliente_id) {
        const { data: cliente } = await supabase
          .from('clientes')
          .select('nome')
          .eq('id', op.cliente_id)
          .single();

        if (cliente) {
          op.cliente_nome = cliente.nome;
        }
      }
    }

    cacheSet(CACHE_KEY, oportunidadesGlobal, CACHE_TTL_MIN);
    renderizarKanban(oportunidadesGlobal);
    atualizarResumo(oportunidadesGlobal);

  } catch (erro) {
    console.error('[DEKA][Oportunidades] Erro ao carregar oportunidades:', erro);
    showToast(erro.message || 'Erro ao carregar oportunidades', 'error');
    const kanban = document.getElementById('oportunidades-kanban');
    if (kanban) {
      kanban.innerHTML = '<div class="estado-vazio">Erro ao carregar oportunidades</div>';
    }
  }
}

async function carregarClientes() {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome')
      .order('nome', { ascending: true });

    if (error) throw error;

    clientesGlobal = data || [];
    preencherSelectClientes();

  } catch (erro) {
    console.error('[DEKA][Oportunidades] Erro ao carregar clientes:', erro);
    showToast('Erro ao carregar lista de clientes', 'error');
  }
}

function preencherSelectClientes() {
  const select = document.getElementById('oportunidade-cliente');
  if (!select) return;

  select.innerHTML = '<option value="">Selecione um cliente...</option>';

  clientesGlobal.forEach(cliente => {
    const option = document.createElement('option');
    option.value = cliente.id;
    option.textContent = cliente.nome;
    select.appendChild(option);
  });
}

// =============================================================================
// SEÇÃO 3 — RENDERIZAÇÃO DO KANBAN
// =============================================================================

function renderizarKanban(oportunidades) {
  const kanban = document.getElementById('oportunidades-kanban');
  if (!kanban) return;

  kanban.innerHTML = '';

  const etapasAtivas = SEQUENCIA_ETAPAS.filter(e => e !== 'fechado_perdido');
  etapasAtivas.push('fechado_perdido');

  etapasAtivas.forEach(etapa => {
    const coluna = criarColuna(etapa, oportunidades);
    kanban.appendChild(coluna);
  });
}

function criarColuna(etapa, oportunidades) {
  const oportsDaEtapa = oportunidades.filter(op => op.etapa === etapa);

  const coluna = document.createElement('div');
  coluna.className = 'kanban-coluna';

  const header = document.createElement('div');
  header.className = 'kanban-coluna__header';
  header.style.borderColor = CORES_ETAPAS[etapa];

  const titulo = document.createElement('div');
  titulo.className = 'kanban-coluna__titulo';
  titulo.textContent = LABELS_ETAPAS[etapa];
  titulo.style.color = CORES_ETAPAS[etapa];

  const contador = document.createElement('div');
  contador.className = 'kanban-coluna__contador';
  contador.textContent = oportsDaEtapa.length;

  header.appendChild(titulo);
  header.appendChild(contador);

  const cards = document.createElement('div');
  cards.className = 'kanban-coluna__cards';

  if (oportsDaEtapa.length === 0) {
    const vazio = document.createElement('div');
    vazio.className = 'estado-vazio';
    vazio.textContent = '—';
    cards.appendChild(vazio);
  } else {
    oportsDaEtapa.forEach(op => {
      const card = renderizarCard(op);
      cards.appendChild(card);
    });
  }

  coluna.appendChild(header);
  coluna.appendChild(cards);

  return coluna;
}

function renderizarCard(oportunidade) {
  const card = document.createElement('div');
  card.className = 'oportunidade-card';

  const nome = document.createElement('div');
  nome.className = 'card__nome';
  nome.textContent = oportunidade.cliente_nome || oportunidade.nome_lead || 'Sem nome';
  card.appendChild(nome);

  if (oportunidade.nome_lead && !oportunidade.cliente_nome) {
    const descricao = document.createElement('div');
    descricao.className = 'card__descricao';
    descricao.textContent = 'Lead novo';
    card.appendChild(descricao);
  }

  if (oportunidade.valor_estimado) {
    const valor = document.createElement('div');
    valor.className = 'card__valor';
    valor.textContent = `R$ ${formatarMoeda(oportunidade.valor_estimado)}`;
    card.appendChild(valor);
  }

  if (oportunidade.data_ultimo_contato) {
    const info = document.createElement('div');
    info.className = 'card__info';
    info.textContent = `📅 Último contato: ${formatarDataCurta(oportunidade.data_ultimo_contato)}`;
    card.appendChild(info);
  }

  if (oportunidade.proximo_passo) {
    const passo = document.createElement('div');
    passo.className = 'card__proximo-passo';
    passo.textContent = `→ ${oportunidade.proximo_passo}`;
    card.appendChild(passo);
  }

  const acoes = document.createElement('div');
  acoes.className = 'card__acoes';

  if (oportunidade.etapa !== 'fechado_ganho' && oportunidade.etapa !== 'fechado_perdido') {
    const btnAvancar = document.createElement('button');
    btnAvancar.className = 'btn btn-card btn--primary';
    btnAvancar.textContent = 'Avançar';
    btnAvancar.onclick = (e) => {
      e.stopPropagation();
      avancarEtapa(oportunidade.id, oportunidade.etapa);
    };
    acoes.appendChild(btnAvancar);
  }

  const btnDetalhes = document.createElement('button');
  btnDetalhes.className = 'btn btn-card';
  btnDetalhes.textContent = 'Editar';
  btnDetalhes.onclick = (e) => {
    e.stopPropagation();
    abrirModal(oportunidade.id);
  };
  acoes.appendChild(btnDetalhes);

  card.appendChild(acoes);

  return card;
}

// =============================================================================
// SEÇÃO 4 — CÁLCULOS E RESUMO
// =============================================================================

function calcularPipeline(oportunidades) {
  const ativas = oportunidades.filter(op =>
    op.etapa !== 'fechado_perdido' && op.etapa !== 'fechado_ganho'
  );

  const total = ativas.reduce((sum, op) => sum + (op.valor_estimado || 0), 0);

  const porEtapa = {};
  SEQUENCIA_ETAPAS.forEach(etapa => {
    const ops = ativas.filter(op => op.etapa === etapa);
    porEtapa[etapa] = {
      count: ops.length,
      valor: ops.reduce((sum, op) => sum + (op.valor_estimado || 0), 0),
    };
  });

  return { total, count: ativas.length, porEtapa };
}

function atualizarResumo(oportunidades) {
  const contador = document.getElementById('oportunidades-contador');
  const valorTotal = document.getElementById('oportunidades-valor-total');

  const pipeline = calcularPipeline(oportunidades);

  if (contador) {
    const texto = pipeline.count === 1 ? '1 oportunidade ativa' : `${pipeline.count} oportunidades ativas`;
    contador.textContent = texto;
  }

  if (valorTotal) {
    valorTotal.textContent = `R$ ${formatarMoeda(pipeline.total)} em pipeline`;
  }
}

// =============================================================================
// SEÇÃO 5 — MODAL E FORMULÁRIO
// =============================================================================

function abrirModal(oportunidadeId = null) {
  const modal = document.getElementById('modal-oportunidade');
  const titulo = document.getElementById('modal-titulo');
  const form = document.getElementById('form-oportunidade');

  oportunidadeEditando = oportunidadeId;

  if (oportunidadeId) {
    titulo.textContent = 'Editar Oportunidade';
    const op = oportunidadesGlobal.find(o => o.id === oportunidadeId);
    if (op) {
      preencherFormulario(op);
    }
  } else {
    titulo.textContent = 'Nova Oportunidade';
    form.reset();
    document.getElementById('oportunidade-id').value = '';
    handleTipoLeadChange();
  }

  modal.classList.add('ativo');
}

function fecharModal() {
  const modal = document.getElementById('modal-oportunidade');
  modal.classList.remove('ativo');
  oportunidadeEditando = null;
}

function handleTipoLeadChange() {
  const tipoSelecionado = document.querySelector('input[name="tipo-lead"]:checked')?.value;

  const campoCliente = document.getElementById('campo-cliente');
  const campoLeadNome = document.getElementById('campo-lead-nome');
  const campoLeadTelefone = document.getElementById('campo-lead-telefone');

  if (tipoSelecionado === 'cliente') {
    campoCliente.style.display = 'block';
    campoLeadNome.style.display = 'none';
    campoLeadTelefone.style.display = 'none';
  } else {
    campoCliente.style.display = 'none';
    campoLeadNome.style.display = 'block';
    campoLeadTelefone.style.display = 'block';
  }
}

function preencherFormulario(oportunidade) {
  document.getElementById('oportunidade-id').value = oportunidade.id || '';
  document.getElementById('oportunidade-valor').value = oportunidade.valor_estimado || '';
  document.getElementById('oportunidade-etapa').value = oportunidade.etapa || 'novo_lead';
  document.getElementById('oportunidade-origem').value = oportunidade.origem || '';
  document.getElementById('oportunidade-proximo-passo').value = oportunidade.proximo_passo || '';
  document.getElementById('oportunidade-observacoes').value = oportunidade.observacoes || '';

  const tipoRadios = document.querySelectorAll('input[name="tipo-lead"]');
  if (oportunidade.cliente_id) {
    tipoRadios.forEach(radio => {
      radio.checked = radio.value === 'cliente';
    });
    document.getElementById('oportunidade-cliente').value = oportunidade.cliente_id;
  } else {
    tipoRadios.forEach(radio => {
      radio.checked = radio.value === 'lead';
    });
    document.getElementById('oportunidade-nome-lead').value = oportunidade.nome_lead || '';
    document.getElementById('oportunidade-telefone-lead').value = oportunidade.telefone_lead || '';
  }

  handleTipoLeadChange();
}

async function handleSubmitOportunidade(e) {
  e.preventDefault();

  const tipoLead = document.querySelector('input[name="tipo-lead"]:checked').value;

  let dados = {
    valor_estimado: parseFloat(document.getElementById('oportunidade-valor').value) || null,
    etapa: document.getElementById('oportunidade-etapa').value,
    origem: document.getElementById('oportunidade-origem').value || null,
    proximo_passo: document.getElementById('oportunidade-proximo-passo').value.trim() || null,
    observacoes: document.getElementById('oportunidade-observacoes').value.trim() || null,
    data_ultimo_contato: new Date().toISOString().split('T')[0],
  };

  if (tipoLead === 'cliente') {
    const clienteId = document.getElementById('oportunidade-cliente').value;
    if (!clienteId) {
      showToast('Selecione um cliente', 'error');
      return;
    }
    dados.cliente_id = clienteId;
    dados.nome_lead = null;
    dados.telefone_lead = null;
  } else {
    const nomeLead = document.getElementById('oportunidade-nome-lead').value.trim();
    const telefoneLead = document.getElementById('oportunidade-telefone-lead').value.trim();

    if (!nomeLead || !telefoneLead) {
      showToast('Preencha nome e telefone do lead', 'error');
      return;
    }

    dados.nome_lead = nomeLead;
    dados.telefone_lead = telefoneLead;
    dados.cliente_id = null;
  }

  await salvarOportunidade(dados);
}

async function salvarOportunidade(dados) {
  try {
    const oportunidadeId = document.getElementById('oportunidade-id').value;

    if (oportunidadeId) {
      const { error } = await supabase
        .from('oportunidades')
        .update(dados)
        .eq('id', oportunidadeId);

      if (error) throw error;

      showToast('Oportunidade atualizada com sucesso', 'success');
    } else {
      const { error } = await supabase
        .from('oportunidades')
        .insert([dados]);

      if (error) throw error;

      showToast('Oportunidade criada com sucesso', 'success');
    }

    cacheLimpar('oportunidades');
    fecharModal();
    await carregarOportunidades(true);

  } catch (erro) {
    console.error('[DEKA][Oportunidades] Erro ao salvar oportunidade:', erro);
    showToast(erro.message || 'Erro ao salvar oportunidade', 'error');
  }
}

// =============================================================================
// SEÇÃO 6 — AVANÇO DE ETAPA
// =============================================================================

async function avancarEtapa(oportunidadeId, etapaAtual) {
  const indiceAtual = SEQUENCIA_ETAPAS.indexOf(etapaAtual);
  if (indiceAtual === -1 || indiceAtual >= SEQUENCIA_ETAPAS.length - 2) {
    showToast('Esta oportunidade não pode avançar mais', 'error');
    return;
  }

  const proximaEtapa = SEQUENCIA_ETAPAS[indiceAtual + 1];

  try {
    const { error } = await supabase
      .from('oportunidades')
      .update({
        etapa: proximaEtapa,
        updated_at: new Date().toISOString(),
      })
      .eq('id', oportunidadeId);

    if (error) throw error;

    showToast(`Oportunidade movida para: ${LABELS_ETAPAS[proximaEtapa]}`, 'success');

    cacheLimpar('oportunidades');
    await carregarOportunidades(true);

  } catch (erro) {
    console.error('[DEKA][Oportunidades] Erro ao avançar etapa:', erro);
    showToast(erro.message || 'Erro ao avançar etapa', 'error');
  }
}

// =============================================================================
// SEÇÃO 7 — SUGESTÃO DE PRÓXIMO PASSO COM IA
// =============================================================================

async function handleSugerirProximoPasso() {
  const btnSugerir = document.getElementById('btn-sugerir-passo');
  const inputPasso = document.getElementById('oportunidade-proximo-passo');
  const etapa = document.getElementById('oportunidade-etapa').value;

  try {
    btnSugerir.disabled = true;
    btnSugerir.textContent = '⏳ Gerando...';

    const contexto = `
Etapa atual: ${LABELS_ETAPAS[etapa]}
Valor estimado: R$ ${document.getElementById('oportunidade-valor').value || '0'}
Origem: ${document.getElementById('oportunidade-origem').value || 'não informada'}
`.trim();

    const resposta = await chamarClaude({
      model: 'claude-haiku-4-5',
      system: SYSTEM_PROMPT_PROXIMO_PASSO,
      messages: [
        {
          role: 'user',
          content: contexto,
        },
      ],
      max_tokens: 100,
    });

    if (resposta?.content?.[0]?.text) {
      const sugestao = resposta.content[0].text.trim();
      inputPasso.value = sugestao;
      showToast('Próximo passo sugerido com sucesso', 'success');
    }

  } catch (erro) {
    console.error('[DEKA][Oportunidades] Erro ao sugerir próximo passo:', erro);
    showToast(erro.message || 'Erro ao gerar sugestão', 'error');
  } finally {
    btnSugerir.disabled = false;
    btnSugerir.textContent = '✨ Sugerir com IA';
  }
}

// =============================================================================
// SEÇÃO 8 — HELPER: NOVA OPORTUNIDADE VIA URL
// =============================================================================

function verificarNovaOportunidadeUrl() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('novo') === '1') {
    const clienteId = params.get('cliente_id');
    if (clienteId) {
      abrirModal();
      document.querySelectorAll('input[name="tipo-lead"]').forEach(radio => {
        radio.checked = radio.value === 'cliente';
      });
      document.getElementById('oportunidade-cliente').value = clienteId;
      handleTipoLeadChange();
      window.history.replaceState({}, '', window.location.pathname);
    }
  }
}

// =============================================================================
// SEÇÃO 9 — FUNÇÕES UTILITÁRIAS
// =============================================================================

function formatarMoeda(valor) {
  if (!valor) return '0';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatarDataCurta(data) {
  if (!data) return '—';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
