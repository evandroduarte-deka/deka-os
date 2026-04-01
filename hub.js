/**
 * DEKA OS v2.0 — hub.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo: Hub de Obras
 * Responsabilidade: carregar obras do Supabase, renderizar cards,
 *                   filtrar por status, navegar para obra.html
 *
 * TABELAS SUPABASE (READ-ONLY):
 *   - obras (select com campos específicos)
 *
 * REGRAS DEKA OS:
 *   - Zero DOMContentLoaded aqui (exclusivo do deka.js)
 *   - Cache: 5 min (chave: obras_hub)
 *   - Navegação: window.location.href = '/obra.html?id=<uuid>'
 */

import {
  supabase,
  showToast,
  cacheGet,
  cacheSet,
} from './deka.js';

// =============================================================================
// CONSTANTES
// =============================================================================

const CACHE_KEY     = 'obras_hub';
const CACHE_TTL_MIN = 5;

const CAMPOS_OBRA = [
  'id', 'nome', 'cliente', 'status', 'percentual_global',
  'data_inicio', 'data_previsao_fim', 'semana', 'tipo_obra',
  'valor_contrato', 'capa_url',
].join(',');

// =============================================================================
// ESTADO
// =============================================================================

const Estado = {
  obras:        [],
  filtroAtivo:  'todas',
  grid:         null,
  contador:     null,
};

// =============================================================================
// INICIALIZAÇÃO
// =============================================================================

export async function init() {
  console.log('[DEKA][Hub] Inicializando...');

  Estado.grid    = document.getElementById('obras-grid');
  Estado.contador = document.getElementById('hub-contador');

  _configurarFiltros();
  _configurarIntegracoes();
  _configurarNovaObra();

  await carregarObras();

  console.log('[DEKA][Hub] ✅ Inicializado.');
}

// =============================================================================
// CARREGAMENTO DE OBRAS
// =============================================================================

async function carregarObras(forcarRefresh = false) {
  try {
    // Cache
    if (!forcarRefresh) {
      const cached = cacheGet(CACHE_KEY);
      if (cached) {
        console.log('[DEKA][Hub] Usando obras do cache.');
        Estado.obras = cached;
        renderizarObras();
        return;
      }
    }

    // Supabase
    const { data, error } = await supabase
      .from('obras')
      .select(CAMPOS_OBRA)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DEKA][Hub] Erro ao carregar obras:', error);
      showToast('Erro ao carregar obras: ' + error.message, 'error');
      _mostrarEstadoVazio('Erro ao carregar obras.');
      return;
    }

    Estado.obras = data || [];
    cacheSet(CACHE_KEY, Estado.obras, CACHE_TTL_MIN);
    renderizarObras();

  } catch (erro) {
    console.error('[DEKA][Hub] Exceção ao carregar obras:', erro);
    showToast(erro.message || 'Erro inesperado ao carregar obras.', 'error');
    _mostrarEstadoVazio('Erro de conexão.');
  }
}

// =============================================================================
// RENDERIZAÇÃO
// =============================================================================

function renderizarObras() {
  const obras = _filtrarObras();

  // Contador
  if (Estado.contador) {
    Estado.contador.textContent = `(${Estado.obras.length})`;
  }

  // Grid vazio
  if (obras.length === 0) {
    _mostrarEstadoVazio(
      Estado.filtroAtivo === 'todas'
        ? 'Nenhuma obra cadastrada ainda.'
        : `Nenhuma obra com status "${Estado.filtroAtivo}".`
    );
    return;
  }

  Estado.grid.innerHTML = obras.map(criarCardHTML).join('');

  // Event delegation — 1 listener no grid
  Estado.grid.addEventListener('click', (e) => {
    const card = e.target.closest('.obra-card[data-id]');
    if (card) navegarParaObra(card.dataset.id);
  }, { once: true }); // recriado a cada render — garante 1 listener
}

function criarCardHTML(obra) {
  const pct         = Math.min(100, Math.max(0, obra.percentual_global || 0));
  const status      = obra.status || 'ativa';
  const hoje        = new Date();
  const previsao    = obra.data_previsao_fim ? new Date(obra.data_previsao_fim) : null;
  const atrasada    = status === 'ativa' && previsao && previsao < hoje;
  const badgeStatus = atrasada ? 'atrasada' : status;
  const badgeLabel  = atrasada ? 'ATRASADA' : status.toUpperCase();

  const capaStyle = obra.capa_url
    ? `background-image:url('${obra.capa_url}')`
    : '';

  const previsaoStr = previsao
    ? previsao.toLocaleDateString('pt-BR')
    : '—';

  return `
    <article class="obra-card" data-id="${obra.id}" role="button" tabindex="0"
             aria-label="Abrir obra: ${_esc(obra.nome)}">
      <div class="obra-card-capa" style="${capaStyle}">
        ${!obra.capa_url ? '<div class="obra-card-capa-placeholder">🏗️</div>' : ''}
        <span class="obra-card-badge badge-${badgeStatus}">${badgeLabel}</span>
      </div>
      <div class="obra-card-body">
        ${obra.tipo_obra ? `<div class="obra-card-tipo">${_esc(obra.tipo_obra)}</div>` : ''}
        <div class="obra-card-nome">${_esc(obra.nome)}</div>
        <div class="obra-card-cliente">${_esc(obra.cliente || '—')}</div>
        <div class="progresso-label">
          <span>Avanço geral</span>
          <span class="progresso-valor">${pct}%</span>
        </div>
        <div class="progresso-barra">
          <div class="progresso-fill" style="width:${pct}%"></div>
        </div>
        <div class="obra-card-footer">
          <span>Entrega: ${previsaoStr}</span>
          ${obra.semana ? `<span class="obra-card-semana">Sem. ${obra.semana}</span>` : ''}
        </div>
      </div>
    </article>
  `;
}

// =============================================================================
// FILTROS
// =============================================================================

function _filtrarObras() {
  if (Estado.filtroAtivo === 'todas') return Estado.obras;
  return Estado.obras.filter((o) => o.status === Estado.filtroAtivo);
}

function _configurarFiltros() {
  document.querySelectorAll('.filtro-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filtro-btn').forEach((b) => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      Estado.filtroAtivo = btn.dataset.filtro;
      renderizarObras();
    });
  });
}

// =============================================================================
// NAVEGAÇÃO
// =============================================================================

function navegarParaObra(obraId) {
  console.log('[DEKA][Hub] Navegando para obra:', obraId);
  window.location.href = `obra.html?id=${encodeURIComponent(obraId)}`;
}

// =============================================================================
// MODAL INTEGRAÇÕES (TOKEN)
// =============================================================================

function _configurarIntegracoes() {
  const modal      = document.getElementById('modal-integracoes');
  const btnAbrir   = document.getElementById('btn-integracoes');
  const btnCancelar = document.getElementById('btn-cancelar-token');
  const btnSalvar  = document.getElementById('btn-salvar-token');
  const inputToken = document.getElementById('input-token');

  btnAbrir.addEventListener('click', () => {
    inputToken.value = localStorage.getItem('mdo_worker_token') ?? '';
    modal.classList.remove('oculto');
    inputToken.focus();
  });

  btnCancelar.addEventListener('click', () => {
    modal.classList.add('oculto');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('oculto');
  });

  btnSalvar.addEventListener('click', () => {
    const token = inputToken.value.trim();
    if (!token) {
      showToast('Token não pode ser vazio.', 'warning');
      return;
    }
    localStorage.setItem('mdo_worker_token', token);
    // Atualiza o config em runtime para a sessão atual
    if (window.DEKA_CONFIG) window.DEKA_CONFIG.token = token;
    modal.classList.add('oculto');
    showToast('Token salvo com sucesso!', 'success');
    console.log('[DEKA][Hub] Token atualizado no localStorage.');
  });
}

// =============================================================================
// NOVA OBRA
// =============================================================================

function _configurarNovaObra() {
  document.getElementById('btn-nova-obra').addEventListener('click', () => {
    window.location.href = 'obra.html?novo=true';
  });
}

// =============================================================================
// UTILITÁRIOS
// =============================================================================

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _mostrarEstadoVazio(mensagem) {
  Estado.grid.innerHTML = `
    <div class="estado-vazio">
      <div class="estado-vazio-icone">🏗️</div>
      <div class="estado-vazio-titulo">${mensagem}</div>
      <div class="estado-vazio-sub">Clique em "+ Nova Obra" para começar.</div>
    </div>
  `;
}

// =============================================================================
// FIM DO ARQUIVO
// =============================================================================
