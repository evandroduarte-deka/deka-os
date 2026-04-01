/**
 * DEKA OS v2.0 — obra.js
 * Módulo: Detalhe e Edição de Obra
 * Modos: ?id=<uuid> (visualizar/editar) | ?novo=true (criar)
 * Tabelas: obras (read+write), obra_servicos (read), obra_visitas (read)
 */

import {
  supabase,
  showToast,
  cacheGet,
  cacheSet,
  formatarMoedaBR,
} from './deka.js';

// =============================================================================
// CONSTANTES
// =============================================================================

const CAMPOS_SERVICOS =
  'id,codigo,descricao_cliente,setor,status,percentual_concluido,data_inicio,data_fim,dias_marcados';

// =============================================================================
// ESTADO
// =============================================================================

const E = {
  obraId:   null,
  modoNovo: false,
  obra:     null,
  servicos: [],
  tabAtiva: 'visao-geral',
};

// =============================================================================
// INIT
// =============================================================================

export async function init() {
  console.log('[DEKA][Obra] Inicializando...');

  const p      = new URLSearchParams(window.location.search);
  E.obraId     = p.get('id');
  E.modoNovo   = p.get('novo') === 'true';

  _configurarTabs();

  if (E.modoNovo) { _mostrarModoNovo(); return; }

  if (!E.obraId) { _mostrarErro('ID da obra não informado.'); return; }

  await _carregarObra();
  console.log('[DEKA][Obra] ✅ Inicializado.');
}

// =============================================================================
// CARREGAMENTO
// =============================================================================

async function _carregarObra() {
  try {
    const cacheKey = `obra_${E.obraId}`;
    const cached   = cacheGet(cacheKey);

    if (cached) {
      E.obra = cached;
      _renderizarObra();
      _carregarServicos();
      return;
    }

    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .eq('id', E.obraId)
      .single();

    if (error) {
      console.error('[DEKA][Obra] Erro ao carregar obra:', error);
      showToast('Erro ao carregar obra: ' + error.message, 'error');
      _mostrarErro('Não foi possível carregar a obra.');
      return;
    }

    if (!data) { _mostrarErro('Obra não encontrada.'); return; }

    E.obra = data;
    cacheSet(cacheKey, data, 5);
    _renderizarObra();
    _carregarServicos();

  } catch (erro) {
    console.error('[DEKA][Obra] Exceção ao carregar obra:', erro);
    showToast(erro.message || 'Erro inesperado.', 'error');
    _mostrarErro('Erro de conexão.');
  }
}

async function _carregarServicos() {
  if (!E.obraId) return;

  try {
    const cacheKey = `servicos_${E.obraId}`;
    const cached   = cacheGet(cacheKey);

    if (cached) {
      E.servicos = cached;
      _renderizarServicos();
      _renderizarGantt();
      _atualizarKPIsServicos();
      return;
    }

    const { data, error } = await supabase
      .from('obra_servicos')
      .select(CAMPOS_SERVICOS)
      .eq('obra_id', E.obraId)
      .order('codigo');

    if (error) {
      console.error('[DEKA][Obra] Erro ao carregar serviços:', error);
      showToast('Erro ao carregar serviços.', 'error');
      return;
    }

    E.servicos = data || [];
    cacheSet(cacheKey, E.servicos, 5);
    _renderizarServicos();
    _renderizarGantt();
    _atualizarKPIsServicos();

  } catch (erro) {
    console.error('[DEKA][Obra] Exceção ao carregar serviços:', erro);
    showToast(erro.message || 'Erro ao carregar serviços.', 'error');
  }
}

// =============================================================================
// RENDERIZAÇÃO — OBRA
// =============================================================================

function _renderizarObra() {
  const o = E.obra;
  if (!o) return;

  // Mostra conteúdo
  document.getElementById('estado-loading').style.display = 'none';
  document.getElementById('main').style.display = '';

  // Navegação semana
  const navSem = document.getElementById('nav-semana');
  if (o.semana) navSem.innerHTML = `Semana <b>${o.semana}</b>`;

  // Header
  document.getElementById('h-nome').textContent    = o.nome     || '—';
  document.getElementById('h-end').textContent     = o.endereco || '—';
  document.getElementById('h-cliente').textContent = o.razao_cliente || o.cliente || '—';

  const ini = o.data_inicio       ? _fmtData(o.data_inicio)       : '—';
  const fim = o.data_previsao_fim ? _fmtData(o.data_previsao_fim) : '—';
  document.getElementById('h-periodo').textContent = `Período: ${ini} a ${fim}`;
  document.getElementById('h-entrega').textContent = `Entrega prevista: ${fim}`;

  // Financeiro
  const vc = o.valor_contrato || 0;
  document.getElementById('f-contrato').textContent    = formatarMoedaBR(vc);
  document.getElementById('f-medicoes-sub').textContent =
    o.num_medicoes ? `${o.num_medicoes} medições previstas` : '—';
  document.getElementById('f-pago').textContent         = formatarMoedaBR(0);
  document.getElementById('f-saldo').textContent        = formatarMoedaBR(vc);
  document.getElementById('f-prox-medicao').textContent = fim;
  document.getElementById('f-medicao-num').textContent  =
    o.num_medicoes ? `Medição 1 de ${o.num_medicoes}` : '—';
  document.getElementById('f-semana-rev').textContent   =
    o.semana ? `Sem. ${o.semana} — Rev. A` : '—';
  document.getElementById('f-empresa').textContent      = o.empresa || 'Berti Construtora LTDA';

  // KPIs
  const pct = Math.min(100, Math.max(0, o.percentual_global || 0));
  document.getElementById('k-avanco').textContent  = `${pct}%`;
  document.getElementById('k-entrega').textContent = fim;

  // Prazo
  const prazoEl = document.getElementById('k-prazo-status');
  if (o.data_previsao_fim) {
    const hoje     = new Date();
    const previsao = new Date(o.data_previsao_fim + 'T12:00:00');
    const dias     = Math.floor((previsao - hoje) / 86400000);
    if (dias < 0) {
      prazoEl.innerHTML = `<div class="kpi-alert">🔴 Atrasada</div>`;
    } else if (dias < 7) {
      prazoEl.innerHTML = `<div class="kpi-alert">⚠️ ${dias}d restantes</div>`;
    } else {
      prazoEl.innerHTML = `<div class="kpi-ok">✅ No Prazo</div>`;
    }
  }

  // Rodapé
  document.getElementById('rod-centro').textContent =
    `${(o.nome || '').toUpperCase()} — SEMANA ${o.semana || '—'}`;
  document.getElementById('rod-data').textContent =
    `${_fmtData(new Date().toISOString().split('T')[0])} · Rev. A`;

  // Preenche formulário
  _preencherFormulario(o);

  // Configura botão ir para config
  document.getElementById('btn-ir-config').addEventListener('click', () => {
    _ativarTab('configuracoes');
  }, { once: true });
}

function _atualizarKPIsServicos() {
  const concluidos  = E.servicos.filter((s) => (s.status || '').toUpperCase().includes('CONCLU')).length;
  const emAndamento = E.servicos.filter((s) => (s.status || '').toUpperCase().includes('ANDAMENTO')).length;
  document.getElementById('k-concluidos').textContent = concluidos;
  document.getElementById('k-andamento').textContent  = emAndamento;
}

// =============================================================================
// RENDERIZAÇÃO — SERVIÇOS
// =============================================================================

function _renderizarServicos() {
  const tbody = document.getElementById('tbody-servicos');

  if (E.servicos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:30px;color:#999">Nenhum serviço cadastrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = E.servicos.map((s) => {
    const pct    = s.percentual_concluido || 0;
    const status = _normalizarStatus(s.status);
    const ini    = s.data_inicio ? _fmtDataCurta(s.data_inicio) : '—';
    const fim    = s.data_fim    ? _fmtDataCurta(s.data_fim)    : '—';

    return `<tr>
      <td>${_esc(s.descricao_cliente || s.codigo || '—')}</td>
      <td style="color:#999;font-size:12px">${_esc(s.setor || '—')}</td>
      <td><span class="badge ${status.cls}">${status.label}</span></td>
      <td>
        <div class="prog-wrap">
          <div class="prog-barra"><div class="prog-fill" style="width:${pct}%"></div></div>
          <span class="prog-pct">${pct}%</span>
        </div>
      </td>
    </tr>`;
  }).join('');
}

// =============================================================================
// GANTT
// =============================================================================

function _renderizarGantt() {
  const container = document.getElementById('gantt-container');
  const servicos  = E.servicos.filter((s) => s.dias_marcados && s.dias_marcados.length > 0);

  if (servicos.length === 0) {
    container.innerHTML = `<div style="text-align:center;padding:30px;color:#999">Nenhum serviço com datas marcadas.</div>`;
    return;
  }

  const hoje   = new Date();
  const fim    = new Date(hoje);
  fim.setDate(fim.getDate() + 13);
  const hojeStr = hoje.toISOString().split('T')[0];
  const dsem    = ['D','S','T','Q','Q','S','S'];
  const datas   = [];
  const cur     = new Date(hoje);

  while (cur <= fim) {
    datas.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }

  const thDatas = datas.map((dt) => {
    const d2    = new Date(dt + 'T12:00:00');
    const isHj  = dt === hojeStr;
    return `<th class="col-dia${isHj ? ' col-hoje' : ''}" style="min-width:28px">
      ${d2.getDate()}/${String(d2.getMonth()+1).padStart(2,'0')}<br>${dsem[d2.getDay()]}
    </th>`;
  }).join('');

  const linhas = servicos.map((s) => {
    const diasSet = new Set(s.dias_marcados || []);
    const cels = datas.map((dt) => {
      const temDia = diasSet.has(dt);
      const tipo   = dt === hojeStr && temDia ? 'hoje' :
                     temDia && (s.status||'').includes('CONCLU') ? 'concluido' :
                     temDia ? 'ativo' : 'vazio';
      return `<td><div class="gantt-cel ${tipo}"></div></td>`;
    }).join('');

    return `<tr>
      <td class="col-srv">${_esc(s.descricao_cliente || s.codigo || '—')}</td>
      ${cels}
    </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="gantt-table">
      <thead><tr><th class="col-srv">Serviço</th>${thDatas}</tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <div style="display:flex;gap:16px;margin-top:10px;font-size:11px;color:#999">
      <span><span style="display:inline-block;width:12px;height:12px;background:#22C55E;border-radius:2px;vertical-align:middle;margin-right:4px"></span>Ativo</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:#16A34A;border-radius:2px;vertical-align:middle;margin-right:4px"></span>Concluído</span>
      <span><span style="display:inline-block;width:12px;height:12px;background:#1A1A1A;border-radius:2px;vertical-align:middle;margin-right:4px"></span>Hoje</span>
    </div>`;
}

// =============================================================================
// FORMULÁRIO
// =============================================================================

function _preencherFormulario(o) {
  const mapa = {
    nome:'nome', tipo_obra:'tipo_obra', status:'status',
    endereco:'endereco', data_inicio:'data_inicio',
    data_previsao_fim:'data_previsao_fim', semana:'semana',
    escopo_resumo:'escopo_resumo', capa_url:'capa_url',
    cliente:'cliente', razao_cliente:'razao_cliente',
    cnpj_cliente:'cnpj_cliente', email_cliente:'email_cliente',
    telefone_cliente:'telefone_cliente',
    valor_contrato:'valor_contrato', taxa_admin:'taxa_admin',
    num_medicoes:'num_medicoes', periodicidade:'periodicidade',
    forma_pagamento:'forma_pagamento',
    responsavel_tecnico:'responsavel_tecnico', nome_gestor:'nome_gestor',
    link_drive:'link_drive', link_proposta:'link_proposta',
    link_contrato:'link_contrato', link_fotos:'link_fotos',
    link_relatorios:'link_relatorios', link_medicoes:'link_medicoes',
    link_orcamento:'link_orcamento', link_portal:'link_portal',
    empresa:'empresa', cnpj_empresa:'cnpj_empresa',
    tel_empresa:'tel_empresa', email_empresa:'email_empresa',
    pix_empresa:'pix_empresa',
  };

  const form = document.getElementById('form-obra');
  for (const [campo, name] of Object.entries(mapa)) {
    const el = form.querySelector(`[name="${name}"]`);
    if (el && o[campo] != null) el.value = o[campo];
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await _salvarObra();
  });
}

async function _salvarObra() {
  const btn = document.getElementById('btn-salvar');
  btn.disabled    = true;
  btn.textContent = '⏳ Salvando...';

  try {
    const form  = document.getElementById('form-obra');
    const dados = {};

    form.querySelectorAll('[name]').forEach((el) => {
      const v = el.value.trim();
      const numericos = ['valor_contrato','taxa_admin','num_medicoes','semana'];
      dados[el.name] = numericos.includes(el.name)
        ? (v === '' ? null : Number(v))
        : (v === '' ? null : v);
    });

    let res;
    if (E.modoNovo) {
      res = await supabase.from('obras').insert([dados]).select().single();
    } else {
      res = await supabase.from('obras').update(dados).eq('id', E.obraId).select().single();
    }

    const { data, error } = res;

    if (error) {
      console.error('[DEKA][Obra] Erro ao salvar:', error);
      showToast('Erro ao salvar: ' + error.message, 'error');
      return;
    }

    showToast(E.modoNovo ? 'Obra criada!' : 'Obra salva!', 'success');
    cacheSet(`obra_${data.id}`, data, 5);

    if (E.modoNovo) {
      setTimeout(() => { window.location.href = `obra.html?id=${data.id}`; }, 1000);
    } else {
      E.obra = data;
      _renderizarObra();
    }

  } catch (erro) {
    console.error('[DEKA][Obra] Exceção ao salvar:', erro);
    showToast(erro.message || 'Erro inesperado.', 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = '💾 Salvar Obra';
  }
}

// =============================================================================
// TABS
// =============================================================================

function _configurarTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => _ativarTab(btn.dataset.tab));
  });
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
  if (tab) { tab.classList.add('ativo'); tab.style.display = 'block'; }
  E.tabAtiva = tabId;
}

// =============================================================================
// MODO NOVO
// =============================================================================

function _mostrarModoNovo() {
  document.getElementById('estado-loading').style.display = 'none';
  document.getElementById('main').style.display = '';

  document.querySelectorAll('.tab-btn').forEach((b) => {
    if (b.dataset.tab !== 'configuracoes') b.style.display = 'none';
  });

  _ativarTab('configuracoes');
  document.getElementById('h-nome').textContent = 'Nova Obra';

  const form = document.getElementById('form-obra');
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    await _salvarObra();
  });
}

// =============================================================================
// UTILITÁRIOS
// =============================================================================

function _normalizarStatus(s) {
  const u = (s || '').toUpperCase();
  if (u.includes('CONCLU'))    return { cls: 'badge-concluido', label: 'CONCLUÍDO' };
  if (u.includes('ANDAMENTO')) return { cls: 'badge-andamento', label: 'EM ANDAMENTO' };
  if (u.includes('ATRASA'))    return { cls: 'badge-atrasado',  label: 'ATRASADO' };
  return { cls: 'badge-executar', label: 'A EXECUTAR' };
}

function _fmtData(d) {
  if (!d) return '—';
  const p = String(d).split('T')[0].split('-');
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function _fmtDataCurta(d) {
  if (!d) return '—';
  const p = String(d).split('T')[0].split('-');
  return `${p[2]}/${p[1]}`;
}

function _esc(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _mostrarErro(msg) {
  document.getElementById('estado-loading').style.display = 'none';
  document.getElementById('estado-erro').style.display    = '';
  document.getElementById('erro-msg').textContent         = msg;
}

// =============================================================================
// FIM DO ARQUIVO
// =============================================================================
