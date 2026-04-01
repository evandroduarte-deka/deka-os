/**
 * DEKA OS v4.0 — obra.js
 * Shell do Mestre de Obra — Lazy Loading + Estado Global
 *
 * RESPONSABILIDADES:
 * - Carregar dados básicos da obra
 * - Expor window.DEKA_OBRA para os módulos
 * - Gerenciar lazy loading das 9 tabs
 * - Atualizar topbar com informações da obra
 *
 * ZERO LÓGICA DE NEGÓCIO — apenas orquestração
 */

import {
  supabase,
  showToast,
  cacheGet,
  cacheSet,
} from './deka.js';

// =============================================================================
// ESTADO GLOBAL
// =============================================================================

window.DEKA_OBRA = {
  id:       null,
  nome:     null,
  semana:   null,
  periodo:  null,
  pct:      null,
  servicos: [],
  dados:    null,  // Todos os dados da obra
};

const modulosCarregados = new Set();
let tabAtual = 'visita';  // Tab padrão

// =============================================================================
// INIT
// =============================================================================

export async function init() {
  console.log('[DEKA][Obra] Inicializando Mestre de Obra v4.0...');

  const params = new URLSearchParams(window.location.search);
  const obraId = params.get('id');

  if (!obraId) {
    _mostrarErro('ID da obra não informado.');
    return;
  }

  window.DEKA_OBRA.id = obraId;

  // Carregar dados da obra
  await _carregarDadosObra();

  // Configurar tabs
  _configurarTabs();

  // Atualizar relógio
  _atualizarRelogio();
  setInterval(_atualizarRelogio, 1000);

  // Carregar tab padrão (VISITA)
  await _ativarTab('visita');

  console.log('[DEKA][Obra] ✅ Inicializado.');
}

// =============================================================================
// CARREGAMENTO DE DADOS
// =============================================================================

async function _carregarDadosObra() {
  try {
    const cacheKey = `obra_${window.DEKA_OBRA.id}`;
    const cached   = cacheGet(cacheKey);

    if (cached) {
      _aplicarDados(cached);
      _carregarServicos(); // Em paralelo
      return;
    }

    const { data, error } = await supabase
      .from('obras')
      .select('*')
      .eq('id', window.DEKA_OBRA.id)
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

    cacheSet(cacheKey, data, 5);
    _aplicarDados(data);
    _carregarServicos();

  } catch (erro) {
    console.error('[DEKA][Obra] Exceção ao carregar obra:', erro);
    showToast(erro.message || 'Erro inesperado.', 'error');
    _mostrarErro('Erro de conexão.');
  }
}

async function _carregarServicos() {
  try {
    const cacheKey = `servicos_${window.DEKA_OBRA.id}`;
    const cached   = cacheGet(cacheKey);

    if (cached) {
      window.DEKA_OBRA.servicos = cached;
      return;
    }

    const { data, error } = await supabase
      .from('obra_servicos')
      .select('*')
      .eq('obra_id', window.DEKA_OBRA.id)
      .order('codigo');

    if (error) {
      console.error('[DEKA][Obra] Erro ao carregar serviços:', error);
      showToast('Erro ao carregar serviços.', 'error');
      return;
    }

    window.DEKA_OBRA.servicos = data || [];
    cacheSet(cacheKey, window.DEKA_OBRA.servicos, 5);

  } catch (erro) {
    console.error('[DEKA][Obra] Exceção ao carregar serviços:', erro);
    showToast(erro.message || 'Erro ao carregar serviços.', 'error');
  }
}

function _aplicarDados(obra) {
  window.DEKA_OBRA.dados  = obra;
  window.DEKA_OBRA.nome   = obra.nome || 'Obra sem nome';
  window.DEKA_OBRA.semana = obra.semana || '—';
  window.DEKA_OBRA.pct    = Math.min(100, Math.max(0, obra.percentual_global || 0));

  // Período
  const ini = obra.data_inicio       ? _fmtData(obra.data_inicio)       : '—';
  const fim = obra.data_previsao_fim ? _fmtData(obra.data_previsao_fim) : '—';
  window.DEKA_OBRA.periodo = `${ini} a ${fim}`;

  // Atualizar topbar
  document.getElementById('topbar-titulo').textContent  = window.DEKA_OBRA.nome;
  document.getElementById('topbar-semana').textContent  = window.DEKA_OBRA.semana;
  document.getElementById('topbar-periodo').textContent = window.DEKA_OBRA.periodo;
  document.getElementById('topbar-pct').textContent     = `${window.DEKA_OBRA.pct}%`;
}

// =============================================================================
// GERENCIAMENTO DE TABS
// =============================================================================

function _configurarTabs() {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      _ativarTab(tab);
    });
  });
}

async function _ativarTab(nomeTab) {
  tabAtual = nomeTab;

  // Atualizar visual das tabs
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('ativa'));
  const btn = document.querySelector(`[data-tab="${nomeTab}"]`);
  if (btn) btn.classList.add('ativa');

  // Carregar módulo sob demanda
  if (!modulosCarregados.has(nomeTab)) {
    await _carregarModulo(nomeTab);
  }

  // Mostrar container da tab
  document.querySelectorAll('.tab-content').forEach((c) => {
    c.style.display = 'none';
  });
  const container = document.getElementById(`tab-${nomeTab}`);
  if (container) {
    container.style.display = 'block';
  }
}

async function _carregarModulo(nomeTab) {
  const overlay = document.getElementById('loading-overlay');
  overlay.classList.add('ativo');

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = `./assets/modulos/mod-${nomeTab}.js`;

    script.onload = () => {
      modulosCarregados.add(nomeTab);
      overlay.classList.remove('ativo');
      console.log(`[DEKA][Obra] Módulo carregado: ${nomeTab}`);
      resolve();
    };

    script.onerror = () => {
      console.error(`[DEKA][Obra] Falha ao carregar módulo: ${nomeTab}`);
      showToast(`Erro ao carregar módulo ${nomeTab}`, 'error');
      overlay.classList.remove('ativo');
      resolve();
    };

    document.head.appendChild(script);
  });
}

// =============================================================================
// UTILITÁRIOS
// =============================================================================

function _atualizarRelogio() {
  const agora = new Date();
  const h = String(agora.getHours()).padStart(2, '0');
  const m = String(agora.getMinutes()).padStart(2, '0');
  document.getElementById('topbar-hora').textContent = `${h}:${m}`;
}

function _fmtData(d) {
  if (!d) return '—';
  const p = String(d).split('T')[0].split('-');
  return `${p[2]}/${p[1]}`;
}

function _mostrarErro(msg) {
  document.getElementById('erro-msg').textContent = msg;
  document.getElementById('erro-container').style.display = 'block';
  document.querySelectorAll('.tabs, .tab-content').forEach((el) => {
    el.style.display = 'none';
  });
}

// =============================================================================
// FIM DO ARQUIVO
// =============================================================================
