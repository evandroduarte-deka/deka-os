/**
 * DEKA OS v4.0 — mod-orcamento.js
 * Tab ORÇAMENTO: Visão financeira + edição inline + export
 * Máx: 400 linhas
 */

import { supabase, showToast, formatarMoedaBR } from '../../deka.js';

// =============================================================================
// ESTADO
// =============================================================================

let servicos = [];
let grupos = {};

// =============================================================================
// INIT
// =============================================================================

const container = document.getElementById('tab-orcamento');

if (container && !container.dataset.carregado) {
  container.dataset.carregado = 'true';
  await _carregar();
}

// =============================================================================
// CARREGAMENTO
// =============================================================================

async function _carregar() {
  try {
    const { data, error } = await supabase
      .from('obra_servicos')
      .select('id, codigo, descricao_cliente, unidade, quantidade, valor_unitario, percentual_concluido, categoria')
      .eq('obra_id', window.DEKA_OBRA.id)
      .order('categoria')
      .order('codigo');

    if (error) {
      console.error('[DEKA][Orcamento] Erro ao carregar serviços:', error);
      showToast('Erro ao carregar orçamento', 'error');
      return;
    }

    servicos = data || [];
    _agruparPorCategoria();
    _renderizar();

  } catch (erro) {
    console.error('[DEKA][Orcamento] Exceção ao carregar:', erro);
    showToast(erro.message || 'Erro ao carregar orçamento', 'error');
  }
}

function _agruparPorCategoria() {
  grupos = servicos.reduce((acc, srv) => {
    const cat = srv.categoria || 'OUTROS';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(srv);
    return acc;
  }, {});
}

// =============================================================================
// RENDERIZAÇÃO
// =============================================================================

function _renderizar() {
  const kpis = _calcularKPIs();

  container.innerHTML = `
    <style>
      .orc-container { padding: 24px; background: #fff; max-width: 1400px; margin: 0 auto; }
      .orc-titulo { font-size: 18px; font-weight: 800; color: #1A3A2A; margin-bottom: 6px; }
      .orc-sub { font-size: 13px; color: #999; margin-bottom: 24px; }
      .orc-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
      .orc-kpi { background: #fff; border: 1px solid #E5E5E5; border-radius: 8px; padding: 16px; }
      .orc-kpi-valor { font-size: 28px; font-weight: 800; color: #9A7B3A; line-height: 1; margin-bottom: 6px; }
      .orc-kpi-label { font-size: 11px; font-weight: 700; color: #999; letter-spacing: 1px; text-transform: uppercase; }
      .orc-acoes { display: flex; gap: 12px; margin-bottom: 24px; }
      .btn { padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
      .btn-primario { background: #1A3A2A; color: #fff; border: none; }
      .btn-primario:hover { background: #142d20; }
      .btn-sec { background: transparent; color: #1A3A2A; border: 1px solid #1A3A2A; }
      .btn-sec:hover { background: #1A3A2A; color: #fff; }
      .orc-instrucao { font-size: 13px; color: #666; margin-bottom: 12px; }
      .orc-tabela { width: 100%; border-collapse: collapse; font-size: 13px; }
      .orc-tabela thead tr { background: #1A3A2A; color: #fff; }
      .orc-tabela thead th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); }
      .orc-tabela thead th:last-child { border-right: none; }
      .orc-cat-hdr { background: #1A3A2A; color: #fff; font-weight: 800; }
      .orc-cat-hdr td { padding: 10px 12px; }
      .orc-tabela tbody tr { border-bottom: 1px solid #E5E5E5; }
      .orc-tabela tbody tr:nth-child(even) { background: #F5F5F5; }
      .orc-tabela tbody tr:hover { background: #f0f7f0; }
      .orc-tabela tbody td { padding: 8px 12px; border-right: 1px solid #EEEEEE; }
      .orc-tabela tbody td:last-child { border-right: none; }
      .orc-tabela .td-edit { cursor: pointer; transition: background 0.1s; }
      .orc-tabela .td-edit:hover { background: #fffde7; }
      .orc-subtotal { background: #F5F5F5 !important; font-weight: 700; color: #1A3A2A; }
    </style>

    <div class="orc-container">
      <div class="orc-titulo">ORÇAMENTO</div>
      <div class="orc-sub">Visão financeira da obra</div>

      <div class="orc-kpis">
        <div class="orc-kpi">
          <div class="orc-kpi-valor">${formatarMoedaBR(kpis.total)}</div>
          <div class="orc-kpi-label">Orçamento Total</div>
        </div>
        <div class="orc-kpi">
          <div class="orc-kpi-valor">${formatarMoedaBR(kpis.executado)}</div>
          <div class="orc-kpi-label">Executado</div>
        </div>
        <div class="orc-kpi">
          <div class="orc-kpi-valor">${formatarMoedaBR(kpis.aditivos)}</div>
          <div class="orc-kpi-label">Aditivos</div>
        </div>
        <div class="orc-kpi">
          <div class="orc-kpi-valor">${formatarMoedaBR(kpis.aExecutar)}</div>
          <div class="orc-kpi-label">A Executar</div>
        </div>
      </div>

      <div class="orc-acoes">
        <button class="btn btn-sec" onclick="alert('Em breve: Novo Aditivo')">+ Novo Aditivo</button>
        <button class="btn btn-sec" onclick="alert('Em breve: PDF')">📄 PDF</button>
        <button class="btn btn-primario" id="btn-sync">↑ SYNC PLANILHA</button>
      </div>

      <div class="orc-instrucao">✏️ Edite diretamente na tabela · ${servicos.length} serviços</div>

      <table class="orc-tabela" id="tabela-orcamento">
        <thead>
          <tr>
            <th style="width:8%">Cód</th>
            <th style="width:40%">Descrição</th>
            <th style="width:6%">Un</th>
            <th style="width:8%">Qtde</th>
            <th style="width:12%">R$/Un</th>
            <th style="width:14%">Total</th>
            <th style="width:12%">Exec.</th>
          </tr>
        </thead>
        <tbody id="tbody-orcamento"></tbody>
      </table>
    </div>
  `;

  _renderizarTabela();
  document.getElementById('btn-sync')?.addEventListener('click', _exportarCSV);
}

function _renderizarTabela() {
  const tbody = document.getElementById('tbody-orcamento');
  if (!tbody) return;

  let html = '';

  for (const [cat, items] of Object.entries(grupos)) {
    const subtotal = items.reduce((s, r) => s + ((r.quantidade || 0) * (r.valor_unitario || 0)), 0);
    const pctCat = items.reduce((s, r) => s + (r.percentual_concluido || 0), 0) / items.length;

    html += `<tr class="orc-cat-hdr">
      <td colspan="5">${_esc(cat)}</td>
      <td style="text-align:right">${formatarMoedaBR(subtotal)}</td>
      <td style="text-align:right">${Math.round(pctCat)}%</td>
    </tr>`;

    items.forEach(srv => {
      const total = (srv.quantidade || 0) * (srv.valor_unitario || 0);
      html += `<tr data-id="${srv.id}">
        <td style="font-family:monospace;font-size:11px;color:#999">${_esc(srv.codigo || '—')}</td>
        <td>${_esc(srv.descricao_cliente || '—')}</td>
        <td style="text-align:center">${_esc(srv.unidade || '—')}</td>
        <td class="td-edit" data-campo="quantidade" style="text-align:right">${srv.quantidade || 0}</td>
        <td class="td-edit" data-campo="valor_unitario" style="text-align:right">${formatarMoedaBR(srv.valor_unitario || 0)}</td>
        <td style="text-align:right;font-weight:700;color:#1A3A2A">${formatarMoedaBR(total)}</td>
        <td class="td-edit" data-campo="percentual_concluido" style="text-align:right">${srv.percentual_concluido || 0}%</td>
      </tr>`;
    });

    html += `<tr class="orc-subtotal">
      <td colspan="5">Subtotal ${_esc(cat)}</td>
      <td style="text-align:right">${formatarMoedaBR(subtotal)}</td>
      <td></td>
    </tr>`;
  }

  tbody.innerHTML = html;
  _configurarEdicao();
}

// =============================================================================
// EDIÇÃO INLINE
// =============================================================================

function _configurarEdicao() {
  document.querySelectorAll('.td-edit').forEach(td => {
    td.addEventListener('click', function() {
      const tr = this.closest('tr');
      const id = tr.dataset.id;
      const campo = this.dataset.campo;
      const srv = servicos.find(s => s.id === id);
      if (!srv) return;

      _tornarEditavel(this, srv, campo);
    });
  });
}

function _tornarEditavel(td, srv, campo) {
  const valorAtual = srv[campo] || 0;
  const input = document.createElement('input');
  input.type = 'number';
  input.value = valorAtual;
  input.style.cssText = 'width:100%;border:none;background:#fffde7;font:inherit;text-align:right;padding:4px';
  input.min = '0';
  if (campo === 'percentual_concluido') input.max = '100';
  input.step = campo === 'valor_unitario' ? '0.01' : '1';

  td.innerHTML = '';
  td.appendChild(input);
  input.focus();
  input.select();

  input.addEventListener('blur', async () => {
    await _salvarCampo(srv, campo, parseFloat(input.value) || 0, td);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') {
      td.textContent = campo === 'percentual_concluido'
        ? `${valorAtual}%`
        : campo === 'valor_unitario' ? formatarMoedaBR(valorAtual)
        : valorAtual;
    }
  });
}

async function _salvarCampo(srv, campo, novoValor, td) {
  try {
    const { error } = await supabase
      .from('obra_servicos')
      .update({ [campo]: novoValor })
      .eq('id', srv.id);

    if (error) throw error;

    srv[campo] = novoValor;
    td.textContent = campo === 'percentual_concluido'
      ? `${novoValor}%`
      : campo === 'valor_unitario' ? formatarMoedaBR(novoValor)
      : novoValor;

    showToast('Salvo!', 'success');
    _atualizarKPIs();

  } catch (erro) {
    console.error('[DEKA][Orcamento] Erro ao salvar:', erro);
    showToast('Erro ao salvar: ' + erro.message, 'error');
    td.textContent = srv[campo] || '—';
  }
}

// =============================================================================
// KPIs
// =============================================================================

function _calcularKPIs() {
  const total = servicos.reduce((s, r) => s + ((r.quantidade || 0) * (r.valor_unitario || 0)), 0);
  const executado = servicos.reduce((s, r) => {
    const valor = (r.quantidade || 0) * (r.valor_unitario || 0);
    return s + (valor * (r.percentual_concluido || 0) / 100);
  }, 0);
  const aditivos = 0;
  const aExecutar = total - executado;

  return { total, executado, aditivos, aExecutar };
}

function _atualizarKPIs() {
  const kpis = _calcularKPIs();
  const els = document.querySelectorAll('.orc-kpi-valor');
  if (els[0]) els[0].textContent = formatarMoedaBR(kpis.total);
  if (els[1]) els[1].textContent = formatarMoedaBR(kpis.executado);
  if (els[2]) els[2].textContent = formatarMoedaBR(kpis.aditivos);
  if (els[3]) els[3].textContent = formatarMoedaBR(kpis.aExecutar);
}

// =============================================================================
// EXPORT CSV
// =============================================================================

function _exportarCSV() {
  const linhas = [['Código', 'Descrição', 'Un', 'Qtde', 'R$/Un', 'Total', 'Exec%']];

  servicos.forEach(s => {
    const total = ((s.quantidade || 0) * (s.valor_unitario || 0)).toFixed(2);
    linhas.push([
      s.codigo || '',
      s.descricao_cliente || '',
      s.unidade || '',
      s.quantidade || 0,
      (s.valor_unitario || 0).toFixed(2),
      total,
      s.percentual_concluido || 0
    ]);
  });

  const csv = linhas.map(l => l.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orcamento-${window.DEKA_OBRA.nome || 'obra'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Planilha exportada!', 'success');
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

// =============================================================================
// FIM DO ARQUIVO
// =============================================================================
