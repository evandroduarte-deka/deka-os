/**
 * DEKA OS v4.0 — mod-cronograma.js
 * Tab CRONOGRAMA: Gantt interativo + Filtros + Semanas
 * Máx: 400 linhas
 */

import { supabase, showToast } from '../../deka.js';

// =============================================================================
// ESTADO
// =============================================================================

let servicos = [];
let datas = [];
let filtros = {
  semana: 'todos',
  ocultarConcluidos: false,
  equipe: 'todas',
  busca: '',
};

// =============================================================================
// INIT
// =============================================================================

const container = document.getElementById('tab-cronograma');

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
      .select('id, codigo, descricao_cliente, percentual_concluido, dias_marcados')
      .eq('obra_id', window.DEKA_OBRA.id)
      .order('codigo');

    if (error) {
      console.error('[DEKA][Cronograma] Erro ao carregar serviços:', error);
      showToast('Erro ao carregar cronograma', 'error');
      return;
    }

    servicos = data || [];
    _calcularDatas();
    _renderizar();

  } catch (erro) {
    console.error('[DEKA][Cronograma] Exceção ao carregar:', erro);
    showToast(erro.message || 'Erro ao carregar cronograma', 'error');
  }
}

function _calcularDatas() {
  const o = window.DEKA_OBRA.dados;
  const ini = o?.data_inicio ? new Date(o.data_inicio + 'T12:00:00') : new Date();
  const fim = o?.data_previsao_fim ? new Date(o.data_previsao_fim + 'T12:00:00') : new Date();

  datas = _gerarDatas(ini, fim);
}

function _gerarDatas(inicio, fim) {
  const arr = [];
  const cur = new Date(inicio);
  while (cur <= fim) {
    arr.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return arr;
}

// =============================================================================
// RENDERIZAÇÃO
// =============================================================================

function _renderizar() {
  const hoje = new Date().toISOString().split('T')[0];
  const [p2, p1, p0] = hoje.split('-');
  const hojeFormatado = `${p0}/${p1}`;

  const datasVisiveis = _aplicarFiltroSemana();
  const servicosVisiveis = _aplicarFiltros();

  container.innerHTML = `
    <style>
      .cron-container { padding: 24px; background: #fff; max-width: 100%; margin: 0 auto; overflow-x: auto; }
      .cron-titulo { font-size: 18px; font-weight: 800; color: #1A3A2A; margin-bottom: 6px; }
      .cron-sub { font-size: 13px; color: #999; margin-bottom: 24px; }
      .cron-nav { display: flex; gap: 12px; align-items: center; margin-bottom: 20px; }
      .cron-nav-btn { padding: 8px 16px; background: #1A3A2A; color: #fff; border: none; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
      .cron-nav-btn:hover { background: #142d20; }
      .cron-periodo { font-size: 15px; font-weight: 700; color: #1A3A2A; flex: 1; text-align: center; }
      .cron-filtros { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
      .btn-filtro { padding: 8px 16px; background: #F5F5F5; border: 1px solid #E5E5E5; border-radius: 6px; font-size: 12px; font-weight: 700; color: #666; cursor: pointer; transition: all 0.15s; }
      .btn-filtro:hover { border-color: #1A3A2A; }
      .btn-filtro.ativo { background: #1A3A2A; color: #fff; border-color: #1A3A2A; }
      .cron-busca { padding: 8px 14px; border: 1px solid #E5E5E5; border-radius: 6px; font-size: 13px; flex: 1; max-width: 300px; }
      .cron-tabela { width: 100%; border-collapse: collapse; font-size: 12px; }
      .cron-tabela thead tr { background: #1A3A2A; color: #fff; }
      .cron-tabela thead th { padding: 10px 8px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); position: sticky; top: 0; z-index: 2; background: #1A3A2A; }
      .cron-tabela thead th:first-child { position: sticky; left: 0; z-index: 3; min-width: 200px; }
      .cron-tabela thead th:nth-child(2) { position: sticky; left: 200px; z-index: 3; width: 50px; }
      .cron-tabela thead th:last-child { border-right: none; }
      .cron-tabela tbody tr { border-bottom: 1px solid #E5E5E5; }
      .cron-tabela tbody tr:nth-child(even) { background: #F5F5F5; }
      .cron-tabela tbody tr:hover { background: #f0f7f0; }
      .cron-tabela tbody td { padding: 8px; border-right: 1px solid #EEEEEE; }
      .cron-tabela tbody td:first-child { position: sticky; left: 0; background: inherit; font-weight: 600; min-width: 200px; z-index: 1; }
      .cron-tabela tbody td:nth-child(2) { position: sticky; left: 200px; background: inherit; text-align: center; font-weight: 700; color: #9A7B3A; z-index: 1; }
      .cron-tabela tbody td:last-child { border-right: none; }
      .cron-celula { width: 30px; height: 30px; cursor: pointer; transition: opacity 0.1s; }
      .cron-celula:hover { opacity: 0.7; }
      .cron-celula-vazia { background: #fff; }
      .cron-celula-executado { background: #22C55E; }
      .cron-celula-andamento { background: #1A3A2A; }
      .cron-celula-agendado { background: #1E3A5F; }
      .cron-celula-hoje { background: #9A7B3A; }
      .cron-hoje-col { position: relative; }
      .cron-hoje-col::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: #DC2626; z-index: 1; }
      .cron-legenda { display: flex; gap: 16px; margin-top: 16px; font-size: 11px; }
      .cron-legenda-item { display: flex; align-items: center; gap: 6px; }
      .cron-legenda-cor { width: 16px; height: 16px; border-radius: 3px; }
    </style>

    <div class="cron-container">
      <div class="cron-titulo">CRONOGRAMA</div>
      <div class="cron-sub">Gantt interativo · ${servicos.length} serviços</div>

      <div class="cron-nav">
        <button class="cron-nav-btn" id="btn-sem-ant">◄</button>
        <div class="cron-periodo" id="periodo-texto">${datasVisiveis[0] ? _fmtData(datasVisiveis[0]) : '—'} a ${datasVisiveis[datasVisiveis.length-1] ? _fmtData(datasVisiveis[datasVisiveis.length-1]) : '—'}</div>
        <button class="cron-nav-btn" id="btn-sem-prox">►</button>
      </div>

      <div class="cron-filtros">
        <button class="btn-filtro ${filtros.semana === 'esta' ? 'ativo' : ''}" id="btn-esta-sem">Esta semana</button>
        <button class="btn-filtro ${filtros.semana === 'todos' ? 'ativo' : ''}" id="btn-todos">Todos</button>
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#666;cursor:pointer">
          <input type="checkbox" id="chk-ocultar" ${filtros.ocultarConcluidos ? 'checked' : ''}> Ocultar 100%
        </label>
        <input type="text" class="cron-busca" id="input-busca" placeholder="Buscar serviço..." value="${filtros.busca}">
      </div>

      <table class="cron-tabela">
        <thead>
          <tr>
            <th>Serviço</th>
            <th>%</th>
            ${datasVisiveis.map(d => {
              const isHoje = d === hoje;
              return `<th class="${isHoje ? 'cron-hoje-col' : ''}">${_fmtData(d)}</th>`;
            }).join('')}
          </tr>
        </thead>
        <tbody id="tbody-cronograma"></tbody>
      </table>

      <div class="cron-legenda">
        <div class="cron-legenda-item">
          <div class="cron-legenda-cor" style="background:#22C55E"></div>
          <span>Executado</span>
        </div>
        <div class="cron-legenda-item">
          <div class="cron-legenda-cor" style="background:#1A3A2A"></div>
          <span>Em andamento</span>
        </div>
        <div class="cron-legenda-item">
          <div class="cron-legenda-cor" style="background:#9A7B3A"></div>
          <span>Hoje</span>
        </div>
        <div class="cron-legenda-item">
          <div class="cron-legenda-cor" style="background:#1E3A5F"></div>
          <span>Agendado</span>
        </div>
        <div class="cron-legenda-item">
          <div class="cron-legenda-cor" style="background:#fff;border:1px solid #E5E5E5"></div>
          <span>Não marcado</span>
        </div>
      </div>
    </div>
  `;

  _renderizarTabela(datasVisiveis, servicosVisiveis);
  _configurarEventos();
}

function _renderizarTabela(datasVisiveis, servicosVisiveis) {
  const tbody = document.getElementById('tbody-cronograma');
  if (!tbody) return;

  const hoje = new Date().toISOString().split('T')[0];
  let html = '';

  servicosVisiveis.forEach(srv => {
    html += `<tr data-id="${srv.id}">
      <td>${_esc(srv.descricao_cliente || srv.codigo || '—')}</td>
      <td>${srv.percentual_concluido || 0}%</td>
      ${datasVisiveis.map(d => {
        const temDia = (srv.dias_marcados || []).includes(d);
        const isHoje = d === hoje;
        const pct = srv.percentual_concluido || 0;

        let classe = 'cron-celula cron-celula-vazia';
        if (temDia) {
          if (isHoje) classe = 'cron-celula cron-celula-hoje';
          else if (pct === 100) classe = 'cron-celula cron-celula-executado';
          else if (pct > 0) classe = 'cron-celula cron-celula-andamento';
          else classe = 'cron-celula cron-celula-agendado';
        }

        return `<td class="${classe}" data-srv="${srv.id}" data-data="${d}"></td>`;
      }).join('')}
    </tr>`;
  });

  tbody.innerHTML = html;
  _configurarCliques();
}

// =============================================================================
// EVENTOS
// =============================================================================

function _configurarEventos() {
  document.getElementById('btn-esta-sem')?.addEventListener('click', () => {
    filtros.semana = 'esta';
    _renderizar();
  });

  document.getElementById('btn-todos')?.addEventListener('click', () => {
    filtros.semana = 'todos';
    _renderizar();
  });

  document.getElementById('chk-ocultar')?.addEventListener('change', (e) => {
    filtros.ocultarConcluidos = e.target.checked;
    _renderizar();
  });

  document.getElementById('input-busca')?.addEventListener('input', (e) => {
    filtros.busca = e.target.value.toLowerCase();
    _renderizar();
  });

  document.getElementById('btn-sem-ant')?.addEventListener('click', () => {
    _navegarSemana(-1);
  });

  document.getElementById('btn-sem-prox')?.addEventListener('click', () => {
    _navegarSemana(1);
  });
}

function _configurarCliques() {
  document.querySelectorAll('.cron-celula').forEach(cel => {
    cel.addEventListener('click', async function() {
      const srvId = this.dataset.srv;
      const data = this.dataset.data;
      await _toggleDia(srvId, data);
    });
  });
}

async function _toggleDia(srvId, data) {
  const srv = servicos.find(s => s.id === srvId);
  if (!srv) return;

  const dias = [...(srv.dias_marcados || [])];
  const idx = dias.indexOf(data);

  if (idx >= 0) {
    dias.splice(idx, 1);
  } else {
    dias.push(data);
  }
  dias.sort();

  try {
    const { error } = await supabase
      .from('obra_servicos')
      .update({ dias_marcados: dias })
      .eq('id', srvId);

    if (error) throw error;

    srv.dias_marcados = dias;

    const datasVisiveis = _aplicarFiltroSemana();
    const servicosVisiveis = _aplicarFiltros();
    _renderizarTabela(datasVisiveis, servicosVisiveis);

  } catch (erro) {
    console.error('[DEKA][Cronograma] Erro ao salvar dia:', erro);
    showToast('Erro ao salvar: ' + erro.message, 'error');
  }
}

// =============================================================================
// FILTROS
// =============================================================================

function _aplicarFiltroSemana() {
  if (filtros.semana === 'esta') {
    return _semanaAtual();
  }
  return datas;
}

function _aplicarFiltros() {
  let resultado = [...servicos];

  if (filtros.ocultarConcluidos) {
    resultado = resultado.filter(s => (s.percentual_concluido || 0) < 100);
  }

  if (filtros.busca) {
    resultado = resultado.filter(s => {
      const desc = (s.descricao_cliente || '').toLowerCase();
      const cod = (s.codigo || '').toLowerCase();
      return desc.includes(filtros.busca) || cod.includes(filtros.busca);
    });
  }

  return resultado;
}

function _semanaAtual() {
  const hoje = new Date();
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - hoje.getDay() + 1);
  const dom = new Date(seg);
  dom.setDate(seg.getDate() + 6);
  return _gerarDatas(seg, dom);
}

function _navegarSemana(direcao) {
  // TODO: implementar navegação entre semanas
  showToast('Navegação de semanas em breve', 'info');
}

// =============================================================================
// UTILITÁRIOS
// =============================================================================

function _fmtData(d) {
  if (!d) return '—';
  const [ano, mes, dia] = String(d).split('T')[0].split('-');
  return `${dia}/${mes}`;
}

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
