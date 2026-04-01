/**
 * DEKA OS v2.0 — clientes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo: CRM de Clientes Cadastrados
 *
 * TABELA SUPABASE:
 *   - clientes → cadastro completo de clientes PF/PJ
 *
 * REGRAS DEKA OS:
 *   - Zero try/catch silenciosos (todo erro → console.error + showToast)
 *   - SELECT explícito (nunca SELECT *)
 *   - Cache com TTL via cacheGet/cacheSet
 *   - Comunicação via fetchComTimeout
 */

import {
  supabase,
  showToast,
  cacheGet,
  cacheSet,
  cacheLimpar,
} from './deka.js';

const CACHE_KEY = 'clientes_lista';
const CACHE_TTL_MIN = 10;

let clientesGlobal = [];
let clienteEditando = null;

// =============================================================================
// SEÇÃO 1 — INICIALIZAÇÃO
// =============================================================================

export async function init() {
  console.log('[DEKA][Clientes] Inicializando módulo');

  const btnNovoCliente = document.getElementById('btn-novo-cliente');
  const btnRefresh = document.getElementById('btn-refresh');
  const inputBusca = document.getElementById('input-busca');
  const btnCancelar = document.getElementById('btn-cancelar');
  const formCliente = document.getElementById('form-cliente');
  const btnFecharPainel = document.getElementById('btn-fechar-painel');

  btnNovoCliente?.addEventListener('click', () => abrirModalCliente());
  btnRefresh?.addEventListener('click', () => carregarClientes(true));
  btnCancelar?.addEventListener('click', fecharModal);
  btnFecharPainel?.addEventListener('click', fecharPainel);
  formCliente?.addEventListener('submit', handleSubmitCliente);

  inputBusca?.addEventListener('input', (e) => {
    const termo = e.target.value.trim();
    const filtrados = filtrarClientes(termo, clientesGlobal);
    renderizarTabela(filtrados);
  });

  await carregarClientes();
}

// =============================================================================
// SEÇÃO 2 — CARREGAMENTO DE DADOS
// =============================================================================

async function carregarClientes(forcarReload = false) {
  const btnRefresh = document.getElementById('btn-refresh');
  const tabela = document.getElementById('clientes-tabela');
  const contador = document.getElementById('clientes-contador');

  try {
    if (btnRefresh) btnRefresh.disabled = true;

    if (!forcarReload) {
      const cache = cacheGet(CACHE_KEY);
      if (cache) {
        console.log('[DEKA][Clientes] Carregando do cache');
        clientesGlobal = cache;
        renderizarTabela(clientesGlobal);
        atualizarContador(clientesGlobal.length);
        return;
      }
    }

    console.log('[DEKA][Clientes] Buscando no Supabase');

    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, cpf_cnpj, email, telefone, tipo, origem, created_at')
      .order('nome', { ascending: true });

    if (error) throw error;

    clientesGlobal = data || [];
    cacheSet(CACHE_KEY, clientesGlobal, CACHE_TTL_MIN);
    renderizarTabela(clientesGlobal);
    atualizarContador(clientesGlobal.length);

  } catch (erro) {
    console.error('[DEKA][Clientes] Erro ao carregar clientes:', erro);
    showToast(erro.message || 'Erro ao carregar clientes', 'error');
    if (tabela) {
      tabela.innerHTML = '<tr><td colspan="6" class="estado-vazio">Erro ao carregar clientes</td></tr>';
    }
  } finally {
    if (btnRefresh) btnRefresh.disabled = false;
  }
}

// =============================================================================
// SEÇÃO 3 — RENDERIZAÇÃO
// =============================================================================

function renderizarTabela(clientes) {
  const tabela = document.getElementById('clientes-tabela');
  if (!tabela) return;

  if (!clientes || clientes.length === 0) {
    tabela.innerHTML = '<tr><td colspan="6" class="estado-vazio">Nenhum cliente cadastrado</td></tr>';
    return;
  }

  tabela.innerHTML = clientes.map(cliente => {
    const tipoLabel = cliente.tipo === 'pessoa_juridica' ? 'PJ' : 'PF';
    const origemLabel = cliente.origem || '—';
    const telefone = formatarTelefone(cliente.telefone);
    const email = cliente.email || '—';

    return `
      <tr>
        <td><strong>${escapeHtml(cliente.nome)}</strong></td>
        <td>${escapeHtml(telefone)}</td>
        <td>${escapeHtml(email)}</td>
        <td><span class="badge">${tipoLabel}</span></td>
        <td>${escapeHtml(origemLabel)}</td>
        <td>
          <button class="btn btn-tabela" onclick="window.verCliente('${cliente.id}')">Ver</button>
          <button class="btn btn-tabela" onclick="window.editarCliente('${cliente.id}')">Editar</button>
        </td>
      </tr>
    `;
  }).join('');
}

function atualizarContador(total) {
  const contador = document.getElementById('clientes-contador');
  if (contador) {
    contador.textContent = total === 1 ? '1 cliente' : `${total} clientes`;
  }
}

// =============================================================================
// SEÇÃO 4 — FILTROS E BUSCA
// =============================================================================

function filtrarClientes(termo, clientes) {
  if (!termo) return clientes;

  const termoLower = termo.toLowerCase();

  return clientes.filter(cliente => {
    const nome = (cliente.nome || '').toLowerCase();
    const telefone = (cliente.telefone || '').toLowerCase();
    const email = (cliente.email || '').toLowerCase();

    return nome.includes(termoLower) ||
           telefone.includes(termoLower) ||
           email.includes(termoLower);
  });
}

// =============================================================================
// SEÇÃO 5 — MODAL DE CADASTRO/EDIÇÃO
// =============================================================================

function abrirModalCliente(clienteId = null) {
  const modal = document.getElementById('modal-cliente');
  const titulo = document.getElementById('modal-titulo');
  const form = document.getElementById('form-cliente');

  clienteEditando = clienteId;

  if (clienteId) {
    titulo.textContent = 'Editar Cliente';
    const cliente = clientesGlobal.find(c => c.id === clienteId);
    if (cliente) {
      preencherFormulario(cliente);
    }
  } else {
    titulo.textContent = 'Novo Cliente';
    form.reset();
    document.getElementById('cliente-id').value = '';
  }

  modal.classList.add('ativo');
}

function fecharModal() {
  const modal = document.getElementById('modal-cliente');
  modal.classList.remove('ativo');
  clienteEditando = null;
}

function preencherFormulario(cliente) {
  document.getElementById('cliente-id').value = cliente.id || '';
  document.getElementById('cliente-nome').value = cliente.nome || '';
  document.getElementById('cliente-cpf-cnpj').value = cliente.cpf_cnpj || '';
  document.getElementById('cliente-telefone').value = cliente.telefone || '';
  document.getElementById('cliente-email').value = cliente.email || '';
  document.getElementById('cliente-endereco').value = cliente.endereco || '';
  document.getElementById('cliente-origem').value = cliente.origem || '';
  document.getElementById('cliente-observacoes').value = cliente.observacoes || '';

  const tipoRadios = document.querySelectorAll('input[name="cliente-tipo"]');
  tipoRadios.forEach(radio => {
    radio.checked = radio.value === (cliente.tipo || 'pessoa_fisica');
  });
}

async function handleSubmitCliente(e) {
  e.preventDefault();

  const dados = {
    nome: document.getElementById('cliente-nome').value.trim(),
    cpf_cnpj: document.getElementById('cliente-cpf-cnpj').value.trim() || null,
    telefone: document.getElementById('cliente-telefone').value.trim(),
    email: document.getElementById('cliente-email').value.trim() || null,
    endereco: document.getElementById('cliente-endereco').value.trim() || null,
    tipo: document.querySelector('input[name="cliente-tipo"]:checked').value,
    origem: document.getElementById('cliente-origem').value || null,
    observacoes: document.getElementById('cliente-observacoes').value.trim() || null,
  };

  if (!dados.nome || !dados.telefone) {
    showToast('Preencha os campos obrigatórios', 'error');
    return;
  }

  await salvarCliente(dados);
}

async function salvarCliente(dados) {
  try {
    const clienteId = document.getElementById('cliente-id').value;

    if (clienteId) {
      const { error } = await supabase
        .from('clientes')
        .update(dados)
        .eq('id', clienteId);

      if (error) throw error;

      showToast('Cliente atualizado com sucesso', 'success');
    } else {
      const { error } = await supabase
        .from('clientes')
        .insert([dados]);

      if (error) throw error;

      showToast('Cliente cadastrado com sucesso', 'success');
    }

    cacheLimpar('clientes');
    fecharModal();
    await carregarClientes(true);

  } catch (erro) {
    console.error('[DEKA][Clientes] Erro ao salvar cliente:', erro);
    showToast(erro.message || 'Erro ao salvar cliente', 'error');
  }
}

// =============================================================================
// SEÇÃO 6 — PAINEL LATERAL DE DETALHE
// =============================================================================

async function abrirPainelCliente(clienteId) {
  const painel = document.getElementById('painel-cliente');
  const conteudo = document.getElementById('painel-conteudo');

  conteudo.innerHTML = '<p>Carregando...</p>';
  painel.classList.add('ativo');

  try {
    const cliente = clientesGlobal.find(c => c.id === clienteId);
    if (!cliente) {
      throw new Error('Cliente não encontrado');
    }

    const { data: obras, error: erroObras } = await supabase
      .from('obras')
      .select('id, nome, status, percentual_global')
      .eq('cliente', cliente.nome)
      .order('created_at', { ascending: false });

    if (erroObras) throw erroObras;

    const { data: oportunidades, error: erroOport } = await supabase
      .from('oportunidades')
      .select('id, nome_lead, valor_estimado, etapa')
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: false });

    if (erroOport) throw erroOport;

    renderizarPainel(cliente, obras || [], oportunidades || []);

  } catch (erro) {
    console.error('[DEKA][Clientes] Erro ao carregar painel:', erro);
    showToast(erro.message || 'Erro ao carregar detalhes do cliente', 'error');
    conteudo.innerHTML = '<p class="estado-vazio">Erro ao carregar detalhes</p>';
  }
}

function renderizarPainel(cliente, obras, oportunidades) {
  const conteudo = document.getElementById('painel-conteudo');

  let html = `
    <h2 class="painel__titulo">${escapeHtml(cliente.nome)}</h2>
    <div class="painel__info">
      ${cliente.telefone ? escapeHtml(formatarTelefone(cliente.telefone)) : ''}
      ${cliente.email ? ' · ' + escapeHtml(cliente.email) : ''}
    </div>
    ${cliente.origem ? `<div class="painel__info">Origem: ${escapeHtml(cliente.origem)}</div>` : ''}
  `;

  if (obras.length > 0) {
    html += `
      <div class="painel__secao">
        <h3 class="painel__secao-titulo">Obras vinculadas</h3>
        ${obras.map(obra => `
          <div class="painel__item">
            <div class="painel__item-titulo">${escapeHtml(obra.nome)}</div>
            <div class="painel__item-info">${obra.status} · ${obra.percentual_global}% concluído</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (oportunidades.length > 0) {
    html += `
      <div class="painel__secao">
        <h3 class="painel__secao-titulo">Oportunidades</h3>
        ${oportunidades.map(op => `
          <div class="painel__item">
            <div class="painel__item-titulo">${escapeHtml(op.nome_lead || 'Oportunidade')}</div>
            <div class="painel__item-info">${op.etapa}${op.valor_estimado ? ' · R$ ' + formatarMoeda(op.valor_estimado) : ''}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  if (obras.length === 0 && oportunidades.length === 0) {
    html += '<p class="painel__info">Nenhuma obra ou oportunidade vinculada</p>';
  }

  html += `
    <div class="painel__secao">
      <button class="btn btn--primary" onclick="window.novaOportunidade('${cliente.id}')">+ Nova Oportunidade</button>
    </div>
  `;

  conteudo.innerHTML = html;
}

function fecharPainel() {
  const painel = document.getElementById('painel-cliente');
  painel.classList.remove('ativo');
}

// =============================================================================
// SEÇÃO 7 — FUNÇÕES UTILITÁRIAS
// =============================================================================

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatarTelefone(telefone) {
  if (!telefone) return '—';
  const digits = telefone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return telefone;
}

function formatarMoeda(valor) {
  if (!valor) return '0';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

// =============================================================================
// SEÇÃO 8 — EXPORTAÇÕES GLOBAIS (WINDOW)
// =============================================================================

window.verCliente = abrirPainelCliente;
window.editarCliente = abrirModalCliente;
window.novaOportunidade = (clienteId) => {
  window.location.href = `./oportunidades.html?novo=1&cliente_id=${clienteId}`;
};
