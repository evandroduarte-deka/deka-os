/**
 * DEKA OS v2.0 — obra.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo: Detalhe e Edição de Obra
 *
 * MODOS:
 *   ?id=<uuid>    → carregar obra existente (visualizar + editar)
 *   ?novo=true    → formulário em branco (criar nova obra)
 *
 * TABELAS SUPABASE:
 *   obras         (read + write)
 *   obra_servicos (read-only)
 *
 * REGRAS DEKA OS:
 *   - Zero DOMContentLoaded aqui (exclusivo do deka.js)
 *   - Cache obra: 5min (chave: obra_<id>)
 *   - Cache servicos: 5min (chave: servicos_<id>)
 */

import {
  supabase,
  showToast,
  cacheGet,
  cacheSet,
  formatarDataBR,
  formatarMoedaBR,
} from './deka.js';

// =============================================================================
// CONSTANTES
// =============================================================================

const CAMPOS_OBRA_SERVICOS = [
  'id', 'codigo', 'descricao_cliente', 'categoria', 'setor',
  'status', 'percentual_concluido', 'data_inicio', 'data_fim', 'dias_marcados',
].join(',');

// =============================================================================
// ESTADO
// =============================================================================

const Estado = {
  obraId:   null,
  modoNovo: false,
  obra:     null,
  servicos: [],
  tabAtiva: 'visao-geral',
};

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

export async function init() {
  console.log('[DEKA][Obra] Inicializando...');

  const params   = new URLSearchParams(window.location.search);
  Estado.obraId  = params.get('id');
  Estado.modoNovo = params.get('novo') === 'true';

  _configurarTabs();

  if (Estado.modoNovo) {
    _mostrarModoNovo();
    return;
  }

  if (!Estado.obraId) {
    _mostrarErro('ID da obra não informado.');
    return;
  }

  await carregarObra();
  console.log('[DEKA][Obra] ✅ Inicializado.');
}

// =============================================================================
// CARREGAMENTO
// =============================================================================

async function carregarObra() {
  try {
    // Cache
    const cacheKeyObra = `obra_${Estado.obraId}`;
    const cached = cacheGet(cacheKeyObra);
    if (cached) {
      Estado.obra = cached;
      renderizarObra();
      carregarServicos(); // em paralelo, sem await
      return;
    }

    // Supabase
    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .eq('id', Estado.obraId)
      .single();

    if (error) {
      console.error('[DEKA][Obra] Erro ao carregar obra:', error);
      showToast('Erro ao carregar obra: ' + error.message, 'error');
      _mostrarErro('Não foi possível carregar a obra.');
      return;
    }

    if (!data) {
      _mostrarErro('Obra não encontrada.');
      return;
    }

    Estado.obra = data;
    cacheSet(cacheKeyObra, data, 5);
    renderizarObra();
    carregarServicos();

  } catch (erro) {
    console.error('[DEKA][Obra] Exceção ao carregar obra:', erro);
    showToast(erro.message || 'Erro inesperado.', 'error');
    _mostrarErro('Erro de conexão.');
  }
}

async function carregarServicos() {
  if (!Estado.obraId) return;

  try {
    const cacheKey = `servicos_${Estado.obraId}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      Estado.servicos = cached;
      renderizarServicos();
      renderizarGantt();
      return;
    }

    const { data, error } = await supabase
      .from('obra_servicos')
      .select(CAMPOS_OBRA_SERVICOS)
      .eq('obra_id', Estado.obraId)
      .order('codigo');

    if (error) {
      console.error('[DEKA][Obra] Erro ao carregar serviços:', error);
      showToast('Erro ao carregar serviços.', 'error');
      return;
    }

    Estado.servicos = data || [];
    cacheSet(cacheKey, Estado.servicos, 5);
    renderizarServicos();
    renderizarGantt();

  } catch (erro) {
    console.error('[DEKA][Obra] Exceção ao carregar serviços:', erro);
    showToast(erro.message || 'Erro ao carregar serviços.', 'error');
  }
}

// =============================================================================
// RENDERIZAÇÃO — HERO E KPIs
// =============================================================================

function renderizarObra() {
  const o = Estado.obra;
  if (!o) return;

  // Oculta loading, mostra conteúdo
  document.getElementById('estado-loading').style.display = 'none';
  document.getElementById('obra-hero').style.display = '';
  document.getElementById('tabs-bar').style.display = '';
  document.querySelectorAll('.tab-content').forEach((t) => {
    if (t.id === 'tab-visao-geral') t.style.display = 'block';
  });

  // Breadcrumb
  document.getElementById('breadcrumb-nome').textContent = o.nome || 'Obra';

  // Capa
  if (o.capa_url) {
    document.getElementById('obra-capa').style.backgroundImage = `url('${o.capa_url}')`;
    document.getElementById('obra-capa-placeholder').style.display = 'none';
  }

  // Badges
  const hoje     = new Date();
  const previsao = o.data_previsao_fim ? new Date(o.data_previsao_fim) : null;
  const atrasada = o.status === 'ativa' && previsao && previsao < hoje;
  const badges   = [];
  if (atrasada) {
    badges.push(`<span class="badge" style="background:rgba(220,38,38,0.15);color:#DC2626;border:1px solid rgba(220,38,38,0.3)">ATRASADA</span>`);
  } else {
    badges.push(`<span class="badge badge-${o.status || 'ativa'}">${(o.status || 'ativa').toUpperCase()}</span>`);
  }
  if (o.semana) {
    badges.push(`<span class="badge badge-semana">SEMANA ${o.semana}</span>`);
  }
  if (o.tipo_obra) {
    badges.push(`<span class="badge" style="background:rgba(200,168,75,0.1);color:var(--ouro-dim);border:1px solid rgba(200,168,75,0.2)">${_esc(o.tipo_obra)}</span>`);
  }
  document.getElementById('obra-badges').innerHTML = badges.join('');

  // Dados principais
  document.getElementById('obra-nome').textContent    = o.nome || '—';
  document.getElementById('obra-cliente').textContent = o.cliente || '';
  document.getElementById('obra-endereco').textContent = o.endereco || '';

  // Progresso
  const pct = Math.min(100, Math.max(0, o.percentual_global || 0));
  document.getElementById('obra-pct').textContent       = `${pct}%`;
  document.getElementById('obra-pct-fill').style.width  = `${pct}%`;

  // KPIs
  _renderizarKPIs(o);

  // Resumo financeiro
  _renderizarResumoFin(o);

  // Preenche formulário
  _preencherFormulario(o);
}

function _renderizarKPIs(o) {
  const concluidos  = Estado.servicos.filter((s) => s.status === 'CONCLUÍDO').length;
  const emAndamento = Estado.servicos.filter((s) => s.status === 'EM ANDAMENTO').length;
  const previsao    = o.data_previsao_fim
    ? new Date(o.data_previsao_fim).toLocaleDateString('pt-BR')
    : '—';

  document.getElementById('kpis-grid').innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Avanço Geral</div>
      <div class="kpi-valor ouro">${o.percentual_global || 0}%</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Concluídos</div>
      <div class="kpi-valor verde">${concluidos}</div>
      <div class="kpi-sub">serviços</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Em Andamento</div>
      <div class="kpi-valor">${emAndamento}</div>
      <div class="kpi-sub">serviços</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Entrega Prevista</div>
      <div class="kpi-valor" style="font-size:18px">${previsao}</div>
    </div>
  `;
}

function _renderizarResumoFin(o) {
  const el = document.getElementById('resumo-fin');
  if (!o.valor_contrato && !o.num_medicoes && !o.forma_pagamento) return;

  el.style.display = '';
  document.getElementById('resumo-fin-grid').innerHTML = `
    <div>
      <div class="resumo-item-label">Valor do Contrato</div>
      <div class="resumo-item-valor ouro">${o.valor_contrato ? formatarMoedaBR(o.valor_contrato) : '—'}</div>
    </div>
    <div>
      <div class="resumo-item-label">Medições Previstas</div>
      <div class="resumo-item-valor">${o.num_medicoes || '—'}</div>
    </div>
    <div>
      <div class="resumo-item-label">Periodicidade</div>
      <div class="resumo-item-valor">${o.periodicidade || '—'}</div>
    </div>
    <div>
      <div class="resumo-item-label">Forma de Pagamento</div>
      <div class="resumo-item-valor">${o.forma_pagamento || '—'}</div>
    </div>
    <div>
      <div class="resumo-item-label">Responsável Técnico</div>
      <div class="resumo-item-valor">${o.responsavel_tecnico || '—'}</div>
    </div>
    <div>
      <div class="resumo-item-label">Gestor</div>
      <div class="resumo-item-valor">${o.nome_gestor || '—'}</div>
    </div>
  `;
}

// =============================================================================
// RENDERIZAÇÃO — SERVIÇOS
// =============================================================================

function renderizarServicos() {
  const tbody = document.getElementById('tbody-servicos');

  if (Estado.servicos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--texto-2)">Nenhum serviço cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = Estado.servicos.map((s) => {
    const pct        = s.percentual_concluido || 0;
    const statusNorm = _normalizarStatus(s.status);
    const dataInicio = s.data_inicio ? new Date(s.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR') : '—';
    const dataFim    = s.data_fim    ? new Date(s.data_fim    + 'T12:00:00').toLocaleDateString('pt-BR') : '—';

    return `<tr>
      <td class="tabela-codigo">${_esc(s.codigo || '—')}</td>
      <td>${_esc(s.descricao_cliente || s.codigo || '—')}</td>
      <td><span class="badge-status ${statusNorm.classe}">${statusNorm.label}</span></td>
      <td>
        <div class="prog-wrap">
          <div class="prog-barra"><div class="prog-fill" style="width:${pct}%"></div></div>
          <span class="prog-pct">${pct}%</span>
        </div>
      </td>
      <td style="font-size:12px;color:var(--texto-2)">${dataInicio}</td>
      <td style="font-size:12px;color:var(--texto-2)">${dataFim}</td>
    </tr>`;
  }).join('');
}

// =============================================================================
// RENDERIZAÇÃO — GANTT
// =============================================================================

function renderizarGantt() {
  const container = document.getElementById('gantt-container');
  const servicos  = Estado.servicos.filter(
    (s) => s.dias_marcados && s.dias_marcados.length > 0
  );

  if (servicos.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--texto-2)">Nenhum serviço com datas marcadas.</div>`;
    return;
  }

  // Calcula range: próximas 2 semanas a partir de hoje
  const hoje    = new Date();
  const inicio  = new Date(hoje);
  const fim     = new Date(hoje);
  fim.setDate(fim.getDate() + 13);

  const hojeStr = hoje.toISOString().split('T')[0];
  const dsem    = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  // Gera array de datas
  const datas = [];
  const cur = new Date(inicio);
  while (cur <= fim) {
    datas.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }

  // Header
  const thDatas = datas.map((dt) => {
    const d2    = new Date(dt + 'T12:00:00');
    const isHoje = dt === hojeStr;
    return `<th class="col-dia${isHoje ? ' col-hoje' : ''}" style="min-width:28px">
      ${d2.getDate()}/${String(d2.getMonth() + 1).padStart(2, '0')}<br>${dsem[d2.getDay()]}
    </th>`;
  }).join('');

  // Linhas
  const linhas = servicos.map((srv) => {
    const diasSet = new Set(srv.dias_marcados || []);
    const cels = datas.map((dt) => {
      const temDia  = diasSet.has(dt);
      const tipo    = dt === hojeStr && temDia ? 'hoje' :
                      temDia && srv.status === 'CONCLUÍDO' ? 'concluido' :
                      temDia ? 'ativo' : 'vazio';
      return `<td><div class="gantt-cel ${tipo}"></div></td>`;
    }).join('');

    const statusNorm = _normalizarStatus(srv.status);
    return `<tr>
      <td class="col-srv">
        <span style="font-size:11px">${_esc(srv.descricao_cliente || srv.codigo || '—')}</span>
        <br><span style="font-size:10px;color:var(--texto-2)">${_esc(srv.codigo || '')}</span>
      </td>
      ${cels}
    </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="gantt-table">
      <thead><tr><th class="col-srv">Serviço</th>${thDatas}</tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div style="display:flex;gap:16px;margin-top:12px;font-size:11px;color:var(--texto-2)">
      <span><span style="display:inline-block;width:12px;height:12px;background:#22C55E;border-radius:2px;vertical-align:middle;margin-right:4px"></span>Ativo</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:#16A34A;border-radius:2px;vertical-align:middle;margin-right:4px"></span>Concluído</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:var(--ouro);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Hoje</span>
    </div>
  `;
}

// =============================================================================
// FORMULÁRIO — PREENCHIMENTO E SALVAMENTO
// =============================================================================

function _preencherFormulario(o) {
  if (!o) return;

  // Mapeia campo → id do input
  const mapa = {
    nome: 'f-nome', tipo_obra: 'f-tipo', status: 'f-status',
    endereco: 'f-endereco', data_inicio: 'f-data-inicio',
    data_previsao_fim: 'f-data-fim', semana: 'f-semana',
    escopo_resumo: 'f-escopo', capa_url: 'f-capa-url',
    cliente: 'f-cliente', razao_cliente: 'f-razao',
    cnpj_cliente: 'f-cnpj', email_cliente: 'f-email',
    telefone_cliente: 'f-telefone',
    valor_contrato: 'f-contrato', taxa_admin: 'f-taxa',
    num_medicoes: 'f-medicoes', periodicidade: 'f-periodicidade',
    forma_pagamento: 'f-pagamento',
    responsavel_tecnico: 'f-resp-tec', nome_gestor: 'f-gestor',
    link_drive: 'f-link-drive', link_proposta: 'f-link-proposta',
    link_contrato: 'f-link-contrato', link_fotos: 'f-link-fotos',
    link_relatorios: 'f-link-relatorios', link_medicoes: 'f-link-medicoes',
    link_orcamento: 'f-link-orcamento', link_portal: 'f-link-portal',
    empresa: 'f-empresa', cnpj_empresa: 'f-cnpj-empresa',
    tel_empresa: 'f-tel-empresa', email_empresa: 'f-email-empresa',
    pix_empresa: 'f-pix-empresa',
  };

  for (const [campo, inputId] of Object.entries(mapa)) {
    const el = document.getElementById(inputId);
    if (!el) continue;
    const val = o[campo];
    if (val !== null && val !== undefined) {
      el.value = val;
    }
  }

  // Configura botão "Ir para configurações"
  document.getElementById('btn-ir-config').addEventListener('click', () => {
    _ativarTab('configuracoes');
  });
}

function _configurarFormulario() {
  const form = document.getElementById('form-obra');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarObra();
  });
}

async function salvarObra() {
  const btn = document.getElementById('btn-salvar');
  btn.disabled = true;
  btn.textContent = '⏳ Salvando...';

  try {
    const dados = _coletarDadosFormulario();

    let resultado;

    if (Estado.modoNovo) {
      // INSERT
      resultado = await supabase.from('obras').insert([dados]).select().single();
    } else {
      // UPDATE
      resultado = await supabase
        .from('obras')
        .update(dados)
        .eq('id', Estado.obraId)
        .select()
        .single();
    }

    const { data, error } = resultado;

    if (error) {
      console.error('[DEKA][Obra] Erro ao salvar obra:', error);
      showToast('Erro ao salvar: ' + error.message, 'error');
      return;
    }

    // Invalida cache
    cacheSet(`obra_${data.id}`, null, 0);

    showToast(Estado.modoNovo ? 'Obra criada com sucesso!' : 'Obra salva com sucesso!', 'success');
    console.log('[DEKA][Obra] ✅ Obra salva:', data.id);

    if (Estado.modoNovo) {
      // Redireciona para a obra criada
      setTimeout(() => {
        window.location.href = `obra.html?id=${data.id}`;
      }, 1000);
    } else {
      Estado.obra = data;
      renderizarObra();
    }

  } catch (erro) {
    console.error('[DEKA][Obra] Exceção ao salvar obra:', erro);
    showToast(erro.message || 'Erro inesperado ao salvar.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Salvar Obra';
  }
}

function _coletarDadosFormulario() {
  const form   = document.getElementById('form-obra');
  const inputs = form.querySelectorAll('[name]');
  const dados  = {};

  inputs.forEach((input) => {
    const nome = input.name;
    let val    = input.value.trim();

    // Converte campos numéricos
    if (['valor_contrato', 'taxa_admin', 'num_medicoes', 'semana'].includes(nome)) {
      val = val === '' ? null : Number(val);
    } else {
      val = val === '' ? null : val;
    }

    dados[nome] = val;
  });

  return dados;
}

// =============================================================================
// MODO NOVO
// =============================================================================

function _mostrarModoNovo() {
  document.getElementById('estado-loading').style.display = 'none';
  document.getElementById('obra-hero').style.display = 'none';
  document.getElementById('tabs-bar').style.display = '';

  // Mostra só a tab de configurações
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    if (btn.dataset.tab !== 'configuracoes') btn.style.display = 'none';
  });

  document.getElementById('tab-configuracoes').classList.add('ativo');
  document.getElementById('tab-configuracoes').style.display = 'block';
  document.getElementById('breadcrumb-nome').textContent = 'Nova Obra';

  _configurarFormulario();
}

// =============================================================================
// TABS
// =============================================================================

function _configurarTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => _ativarTab(btn.dataset.tab));
  });

  document.getElementById('tab-configuracoes')
    .addEventListener('transitionend', _configurarFormulario, { once: true });

  // Configura formulário ao clicar na tab de configurações
  document.querySelector('[data-tab="configuracoes"]')
    .addEventListener('click', _configurarFormulario, { once: true });
}

function _ativarTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('ativo'));
  document.querySelectorAll('.tab-content').forEach((c) => {
    c.classList.remove('ativo');
    c.style.display = 'none';
  });

  const btn = document.querySelector(`[data-tab="${tabId}"]`);
  const tab = document.getElementById(`tab-${tabId}`);

  if (btn) btn.classList.add('ativo');
  if (tab) {
    tab.classList.add('ativo');
    tab.style.display = 'block';
  }

  Estado.tabAtiva = tabId;
}

// =============================================================================
// UTILITÁRIOS
// =============================================================================

function _normalizarStatus(status) {
  const s = (status || '').toUpperCase();
  if (s.includes('CONCLU'))   return { classe: 's-concluido', label: 'CONCLUÍDO' };
  if (s.includes('ANDAMENTO')) return { classe: 's-andamento', label: 'EM ANDAMENTO' };
  if (s.includes('ATRASA'))    return { classe: 's-atrasado',  label: 'ATRASADO' };
  return { classe: 's-executar', label: 'A EXECUTAR' };
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _mostrarErro(mensagem) {
  document.getElementById('estado-loading').style.display = 'none';
  document.getElementById('estado-erro').style.display    = '';
  document.getElementById('erro-mensagem').textContent    = mensagem;
}

// =============================================================================
// FIM DO ARQUIVO
// =============================================================================
