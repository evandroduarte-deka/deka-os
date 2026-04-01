/**
 * DEKA OS v4.0 — mod-pagamentos.js
 * Tab PAGAMENTOS: Financeiro + Importar IA + Mensagem Cliente
 * Máx: 400 linhas
 */

import { supabase, showToast, formatarMoedaBR } from '../../deka.js';

// ===================================================================================
// ESTADO + INIT
// ===================================================================================
let lancamentos = [];
let filtros = { tipo: 'todos', status: 'todos', categoria: 'todas' };
const container = document.getElementById('tab-pagamentos');
if (container && !container.dataset.carregado) {
  container.dataset.carregado = 'true';
  await _carregar();
}

// ===================================================================================
// CARREGAMENTO
// ===================================================================================

async function _carregar() {
  try {
    const { data, error } = await supabase
      .from('financeiro')
      .select('*')
      .eq('obra_id', window.DEKA_OBRA.id)
      .order('data', { ascending: false });

    if (error) {
      console.error('[DEKA][Pagamentos] Erro ao carregar lançamentos:', error);
      showToast('Erro ao carregar pagamentos', 'error');
      return;
    }

    lancamentos = data || [];
    _renderizar();

  } catch (erro) {
    console.error('[DEKA][Pagamentos] Exceção ao carregar:', erro);
    showToast(erro.message || 'Erro ao carregar pagamentos', 'error');
  }
}

// ===================================================================================
// RENDERIZAÇÃO
// ===================================================================================
function _renderizar() {
  const kpis = _calcularKPIs();
  const lancamentosFiltrados = _aplicarFiltros();

  container.innerHTML = `
    <style>
      .pag-container { padding: 24px; background: #fff; max-width: 1400px; margin: 0 auto; }
      .pag-titulo { font-size: 18px; font-weight: 800; color: #1A3A2A; margin-bottom: 6px; }
      .pag-sub { font-size: 13px; color: #999; margin-bottom: 24px; }
      .pag-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
      .pag-kpi { background: #fff; border: 1px solid #E5E5E5; border-radius: 8px; padding: 20px; }
      .pag-kpi-valor { font-size: 32px; font-weight: 800; line-height: 1; margin-bottom: 8px; }
      .pag-kpi-label { font-size: 11px; font-weight: 700; color: #999; letter-spacing: 1px; text-transform: uppercase; }
      .kpi-entrada { color: #22C55E; } .kpi-saida { color: #DC2626; }
      .kpi-saldo { color: ${kpis.saldo >= 0 ? '#22C55E' : '#DC2626'}; }
      .pag-filtros { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
      .btn-filtro { padding: 8px 16px; background: #F5F5F5; border: 1px solid #E5E5E5; border-radius: 6px; font-size: 12px; font-weight: 700; color: #666; cursor: pointer; transition: all 0.15s; }
      .btn-filtro:hover { border-color: #1A3A2A; } .btn-filtro.ativo { background: #1A3A2A; color: #fff; border-color: #1A3A2A; }
      .pag-acoes { display: flex; gap: 12px; margin-bottom: 24px; }
      .btn { padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
      .btn-primario { background: #1A3A2A; color: #fff; border: none; } .btn-primario:hover { background: #142d20; }
      .btn-sec { background: transparent; color: #1A3A2A; border: 1px solid #1A3A2A; } .btn-sec:hover { background: #1A3A2A; color: #fff; }
      .pag-vazio { text-align: center; padding: 60px 20px; color: #999; } .pag-vazio-icone { font-size: 48px; margin-bottom: 16px; }
      .pag-tabela { width: 100%; border-collapse: collapse; font-size: 13px; }
      .pag-tabela thead tr { background: #1A3A2A; color: #fff; }
      .pag-tabela thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
      .pag-tabela tbody tr { border-bottom: 1px solid #E5E5E5; } .pag-tabela tbody tr:nth-child(even) { background: #F5F5F5; }
      .pag-tabela tbody tr:hover { background: #f0f7f0; } .pag-tabela tbody td { padding: 10px 12px; }
      .pag-badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
      .badge-entrada { background: #22C55E; color: #fff; } .badge-saida { background: #DC2626; color: #fff; }
      .badge-pago { background: #22C55E; color: #fff; } .badge-pendente { background: #DC2626; color: #fff; }
      .badge-agendado { background: #1E3A5F; color: #fff; }
      .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center; padding: 20px; }
      .modal-overlay.ativo { display: flex; } .modal-content { background: #fff; border-radius: 8px; max-width: 500px; width: 100%; padding: 24px; }
      .modal-titulo { font-size: 18px; font-weight: 800; color: #1A3A2A; margin-bottom: 20px; }
      .form-grupo { margin-bottom: 16px; }
      .form-label { display: block; font-size: 12px; font-weight: 700; color: #666; margin-bottom: 6px; }
      .form-input { width: 100%; padding: 10px; border: 1px solid #E5E5E5; border-radius: 6px; font-size: 13px; }
      .form-input:focus { outline: none; border-color: #1A3A2A; } .form-radios { display: flex; gap: 16px; }
      .form-radio { display: flex; align-items: center; gap: 6px; cursor: pointer; }
      .modal-acoes { display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end; }
    </style>

    <div class="pag-container">
      <div class="pag-titulo">PAGAMENTOS</div>
      <div class="pag-sub">${lancamentos.length === 0 ? 'Sem Lançamentos' : `${lancamentos.length} lançamentos`}</div>

      <div class="pag-kpis">
        <div class="pag-kpi">
          <div class="pag-kpi-valor kpi-entrada">${formatarMoedaBR(kpis.entradas)}</div>
          <div class="pag-kpi-label">Entradas</div>
        </div>
        <div class="pag-kpi">
          <div class="pag-kpi-valor kpi-saida">${formatarMoedaBR(kpis.saidas)}</div>
          <div class="pag-kpi-label">Saídas</div>
        </div>
        <div class="pag-kpi">
          <div class="pag-kpi-valor kpi-saldo">${kpis.saldo >= 0 ? '+' : ''}${formatarMoedaBR(kpis.saldo)}</div>
          <div class="pag-kpi-label">Saldo</div>
        </div>
      </div>

      <div class="pag-filtros">
        <button class="btn-filtro ${filtros.tipo === 'todos' ? 'ativo' : ''}" data-filtro="tipo" data-val="todos">Todos</button>
        <button class="btn-filtro ${filtros.tipo === 'entrada' ? 'ativo' : ''}" data-filtro="tipo" data-val="entrada">Entrada</button>
        <button class="btn-filtro ${filtros.tipo === 'saida' ? 'ativo' : ''}" data-filtro="tipo" data-val="saida">Saída</button>
        <span style="color:#E5E5E5;margin:0 8px">|</span>
        <button class="btn-filtro ${filtros.status === 'todos' ? 'ativo' : ''}" data-filtro="status" data-val="todos">Todos</button>
        <button class="btn-filtro ${filtros.status === 'pendente' ? 'ativo' : ''}" data-filtro="status" data-val="pendente">Pendente</button>
        <button class="btn-filtro ${filtros.status === 'pago' ? 'ativo' : ''}" data-filtro="status" data-val="pago">Pago</button>
        <button class="btn-filtro ${filtros.status === 'agendado' ? 'ativo' : ''}" data-filtro="status" data-val="agendado">Agendado</button>
      </div>

      <div class="pag-acoes">
        <button class="btn btn-primario" id="btn-novo-lanc">+ NOVO LANÇAMENTO</button>
        <button class="btn btn-sec" id="btn-importar">↑ IMPORTAR DOCUMENTO (IA)</button>
        <button class="btn btn-sec" onclick="alert('Em breve: Mensagem Cliente')">💬 Mensagem Cliente</button>
      </div>

      <div class="pag-lista" id="lista-lancamentos"></div>
    </div>

    <!-- MODAL NOVO LANÇAMENTO -->
    <div class="modal-overlay" id="modal-lanc">
      <div class="modal-content">
        <div class="modal-titulo">Novo Lançamento</div>
        <form id="form-lanc">
          <div class="form-grupo">
            <div class="form-label">Tipo</div>
            <div class="form-radios">
              <label class="form-radio"><input type="radio" name="tipo" value="entrada" checked> Entrada</label>
              <label class="form-radio"><input type="radio" name="tipo" value="saida"> Saída</label>
            </div>
          </div>
          <div class="form-grupo">
            <label class="form-label">Descrição</label>
            <input type="text" class="form-input" name="descricao" required>
          </div>
          <div class="form-grupo">
            <label class="form-label">Valor R$</label>
            <input type="number" class="form-input" name="valor" step="0.01" min="0" required>
          </div>
          <div class="form-grupo">
            <label class="form-label">Data</label>
            <input type="date" class="form-input" name="data" required>
          </div>
          <div class="form-grupo">
            <label class="form-label">Categoria</label>
            <select class="form-input" name="categoria">
              <option value="material">Material</option>
              <option value="mao_de_obra">Mão de Obra</option>
              <option value="taxa_admin">Taxa Admin</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <div class="form-grupo">
            <label class="form-label">Status</label>
            <select class="form-input" name="status">
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="agendado">Agendado</option>
            </select>
          </div>
          <div class="modal-acoes">
            <button type="button" class="btn btn-sec" id="btn-cancelar">Cancelar</button>
            <button type="submit" class="btn btn-primario">Salvar Lançamento</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL IMPORTAR -->
    <div class="modal-overlay" id="modal-importar">
      <div class="modal-content">
        <div class="modal-titulo">Importar Documento (IA)</div>
        <input type="file" id="input-arquivo" accept="image/*,application/pdf" style="margin-bottom:20px">
        <div class="modal-acoes">
          <button type="button" class="btn btn-sec" id="btn-cancelar-import">Cancelar</button>
          <button type="button" class="btn btn-primario" id="btn-processar-doc">Processar com IA</button>
        </div>
      </div>
    </div>
  `;

  _renderizarLista(lancamentosFiltrados);
  _configurarEventos();
}

function _renderizarLista(lancs) {
  const container = document.getElementById('lista-lancamentos');
  if (!container) return;

  if (lancs.length === 0) {
    container.innerHTML = `
      <div class="pag-vazio">
        <div class="pag-vazio-icone">💵</div>
        <div>Nenhum lançamento. Clique em "+ Novo Lançamento".</div>
      </div>
    `;
    return;
  }

  let html = `
    <table class="pag-tabela">
      <thead>
        <tr>
          <th>Data</th>
          <th>Descrição</th>
          <th>Tipo</th>
          <th>Categoria</th>
          <th>Valor</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
  `;

  lancs.forEach(l => {
    html += `<tr>
      <td>${_fmtData(l.data)}</td>
      <td>${_esc(l.descricao || '—')}</td>
      <td><span class="pag-badge badge-${l.tipo}">${l.tipo === 'entrada' ? 'Entrada' : 'Saída'}</span></td>
      <td>${_fmtCategoria(l.categoria)}</td>
      <td style="font-weight:700;color:${l.tipo === 'entrada' ? '#22C55E' : '#DC2626'}">${l.tipo === 'entrada' ? '+' : '-'}${formatarMoedaBR(Math.abs(l.valor || 0))}</td>
      <td><span class="pag-badge badge-${l.status}">${_fmtStatus(l.status)}</span></td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ===================================================================================
// EVENTOS + AÇÕES
// ===================================================================================
function _configurarEventos() {
  document.querySelectorAll('[data-filtro]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tipo = btn.dataset.filtro;
      const val = btn.dataset.val;
      filtros[tipo] = val;
      _renderizar();
    });
  });

  document.getElementById('btn-novo-lanc')?.addEventListener('click', () => {
    document.getElementById('modal-lanc').classList.add('ativo');
  });

  document.getElementById('btn-cancelar')?.addEventListener('click', () => {
    document.getElementById('modal-lanc').classList.remove('ativo');
  });

  document.getElementById('form-lanc')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await _salvarLancamento(new FormData(e.target));
  });

  document.getElementById('btn-importar')?.addEventListener('click', () => {
    document.getElementById('modal-importar').classList.add('ativo');
  });

  document.getElementById('btn-cancelar-import')?.addEventListener('click', () => {
    document.getElementById('modal-importar').classList.remove('ativo');
  });

  document.getElementById('btn-processar-doc')?.addEventListener('click', async () => {
    const input = document.getElementById('input-arquivo');
    if (!input.files[0]) {
      showToast('Selecione um arquivo', 'warning');
      return;
    }
    await _importarDocumento(input.files[0]);
  });
}

async function _salvarLancamento(formData) {
  try {
    const dados = {
      obra_id: window.DEKA_OBRA.id,
      descricao: formData.get('descricao'),
      valor: parseFloat(formData.get('valor')),
      data: formData.get('data'),
      tipo: formData.get('tipo'),
      categoria: formData.get('categoria'),
      status: formData.get('status'),
    };

    const { error } = await supabase
      .from('financeiro')
      .insert(dados);

    if (error) throw error;

    showToast('Lançamento salvo!', 'success');
    document.getElementById('modal-lanc').classList.remove('ativo');
    await _carregar();

  } catch (erro) {
    console.error('[DEKA][Pagamentos] Erro ao salvar lançamento:', erro);
    showToast('Erro ao salvar: ' + erro.message, 'error');
  }
}

async function _importarDocumento(arquivo) {
  try {
    showToast('Analisando documento...', 'info');
    showToast('Funcionalidade em desenvolvimento', 'info');
    document.getElementById('modal-importar').classList.remove('ativo');

  } catch (erro) {
    console.error('[DEKA][Pagamentos] Erro ao importar:', erro);
    showToast('Erro ao importar: ' + erro.message, 'error');
  }
}

// ===================================================================================
// CÁLCULOS + FILTROS
// ===================================================================================
function _calcularKPIs() {
  const entradas = lancamentos
    .filter(l => l.tipo === 'entrada')
    .reduce((sum, l) => sum + (l.valor || 0), 0);

  const saidas = lancamentos
    .filter(l => l.tipo === 'saida')
    .reduce((sum, l) => sum + (l.valor || 0), 0);

  return {
    entradas,
    saidas,
    saldo: entradas - saidas,
  };
}

function _aplicarFiltros() {
  let resultado = [...lancamentos];

  if (filtros.tipo !== 'todos') {
    resultado = resultado.filter(l => l.tipo === filtros.tipo);
  }

  if (filtros.status !== 'todos') {
    resultado = resultado.filter(l => l.status === filtros.status);
  }

  if (filtros.categoria !== 'todas') {
    resultado = resultado.filter(l => l.categoria === filtros.categoria);
  }

  return resultado;
}

// ===================================================================================
// UTILITÁRIOS
// ===================================================================================
function _fmtData(d) {
  if (!d) return '—';
  const [ano, mes, dia] = String(d).split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}

function _fmtCategoria(cat) {
  const map = {
    material: 'Material',
    mao_de_obra: 'Mão de Obra',
    taxa_admin: 'Taxa Admin',
    outros: 'Outros',
  };
  return map[cat] || cat || '—';
}

function _fmtStatus(st) {
  const map = {
    pendente: 'Pendente',
    pago: 'Pago',
    agendado: 'Agendado',
  };
  return map[st] || st || '—';
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
