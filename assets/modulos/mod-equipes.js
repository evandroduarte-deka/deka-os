/**
 * DEKA OS v4.0 — mod-equipes.js
 * Tab EQUIPES: Grid de presença + Cards de contato
 * Máx: 400 linhas
 */

import { supabase, showToast } from '../../deka.js';

// =============================================================================
// ESTADO
// =============================================================================

let visitas = [];
let equipes = [];
let datas = [];

// =============================================================================
// INIT
// =============================================================================

const container = document.getElementById('tab-equipes');

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
      .from('obra_visitas')
      .select('data, equipes_presentes, itens_aplicados')
      .eq('obra_id', window.DEKA_OBRA.id)
      .order('data');

    if (error) {
      console.error('[DEKA][Equipes] Erro ao carregar visitas:', error);
      showToast('Erro ao carregar presenças', 'error');
      return;
    }

    visitas = data || [];
    _extrairEquipes();
    _calcularDatas();
    _renderizar();

  } catch (erro) {
    console.error('[DEKA][Equipes] Exceção ao carregar:', erro);
    showToast(erro.message || 'Erro ao carregar equipes', 'error');
  }
}

function _extrairEquipes() {
  const equipesSet = new Set();
  visitas.forEach(v => {
    (v.equipes_presentes || []).forEach(eq => equipesSet.add(eq));
  });
  equipes = Array.from(equipesSet).sort();
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
  container.innerHTML = `
    <style>
      .eq-container { padding: 24px; background: #fff; max-width: 100%; margin: 0 auto; }
      .eq-titulo { font-size: 18px; font-weight: 800; color: #1A3A2A; margin-bottom: 6px; }
      .eq-sub { font-size: 13px; color: #999; margin-bottom: 24px; }
      .eq-secao-titulo { font-size: 12px; font-weight: 800; color: #1A3A2A; letter-spacing: 1.2px; text-transform: uppercase; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #9A7B3A; }
      .eq-tabela-container { overflow-x: auto; margin-bottom: 32px; }
      .eq-tabela { width: 100%; border-collapse: collapse; font-size: 12px; }
      .eq-tabela thead tr { background: #1A3A2A; color: #fff; }
      .eq-tabela thead th { padding: 10px 8px; text-align: left; font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; border-right: 1px solid rgba(255,255,255,0.2); position: sticky; top: 0; background: #1A3A2A; }
      .eq-tabela thead th:first-child { position: sticky; left: 0; z-index: 2; min-width: 150px; }
      .eq-tabela thead th:last-child { border-right: none; }
      .eq-tabela tbody tr { border-bottom: 1px solid #E5E5E5; }
      .eq-tabela tbody tr:nth-child(even) { background: #F5F5F5; }
      .eq-tabela tbody tr:hover { background: #f0f7f0; }
      .eq-tabela tbody td { padding: 6px 8px; border-right: 1px solid #EEEEEE; text-align: center; }
      .eq-tabela tbody td:first-child { position: sticky; left: 0; background: inherit; font-weight: 600; text-align: left; z-index: 1; }
      .eq-tabela tbody td:last-child { border-right: none; font-weight: 700; color: #1A3A2A; }
      .eq-cel-presente { background: #1A3A2A; }
      .eq-cel-ausente { background: #DC2626; }
      .eq-cel-agendado { background: #1E3A5F; }
      .eq-cel-vazio { background: #fff; }
      .eq-legenda { display: flex; gap: 16px; margin-bottom: 24px; font-size: 11px; flex-wrap: wrap; }
      .eq-legenda-item { display: flex; align-items: center; gap: 6px; }
      .eq-legenda-cor { width: 16px; height: 16px; border-radius: 3px; }
      .eq-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
      .eq-card { background: #fff; border: 1px solid #E5E5E5; border-radius: 8px; padding: 20px; transition: all 0.15s; }
      .eq-card:hover { border-color: #9A7B3A; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
      .eq-card-id { font-size: 10px; font-weight: 700; color: #999; letter-spacing: 1px; margin-bottom: 8px; }
      .eq-card-nome { font-size: 16px; font-weight: 800; color: #1A3A2A; margin-bottom: 16px; line-height: 1.3; }
      .eq-card-linha { font-size: 12px; color: #666; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
      .eq-card-label { font-weight: 700; min-width: 80px; color: #999; }
      .eq-card-separador { height: 1px; background: #E5E5E5; margin: 16px 0; }
      .eq-card-acoes { display: flex; gap: 8px; }
      .btn-card { padding: 8px 14px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; flex: 1; text-align: center; }
      .btn-card-primario { background: #1A3A2A; color: #fff; border: none; }
      .btn-card-primario:hover { background: #142d20; }
      .btn-card-sec { background: transparent; color: #1A3A2A; border: 1px solid #1A3A2A; }
      .btn-card-sec:hover { background: #1A3A2A; color: #fff; }
    </style>

    <div class="eq-container">
      <div class="eq-titulo">EQUIPES — PRESENÇA</div>
      <div class="eq-sub">${equipes.length} equipes registradas</div>

      <div class="eq-secao-titulo">Grid de Presença</div>

      <div class="eq-legenda">
        <div class="eq-legenda-item">
          <div class="eq-legenda-cor" style="background:#1A3A2A"></div>
          <span>Presente</span>
        </div>
        <div class="eq-legenda-item">
          <div class="eq-legenda-cor" style="background:#DC2626"></div>
          <span>Ausente</span>
        </div>
        <div class="eq-legenda-item">
          <div class="eq-legenda-cor" style="background:#1E3A5F"></div>
          <span>Agendado</span>
        </div>
        <div class="eq-legenda-item">
          <div class="eq-legenda-cor" style="background:#fff;border:1px solid #E5E5E5"></div>
          <span>Não marcado</span>
        </div>
      </div>

      <div class="eq-tabela-container">
        <table class="eq-tabela">
          <thead>
            <tr>
              <th>Equipe</th>
              ${datas.map(d => `<th>${_fmtData(d)}</th>`).join('')}
              <th>Total</th>
            </tr>
          </thead>
          <tbody id="tbody-equipes"></tbody>
        </table>
      </div>

      <div class="eq-secao-titulo">Contatos das Equipes</div>
      <div class="eq-cards" id="cards-equipes"></div>
    </div>
  `;

  _renderizarTabela();
  _renderizarCards();
}

function _renderizarTabela() {
  const tbody = document.getElementById('tbody-equipes');
  if (!tbody) return;

  let html = '';

  equipes.forEach(eq => {
    let totalPresencas = 0;

    html += `<tr>
      <td>${_esc(eq)}</td>
      ${datas.map(d => {
        const status = _statusEquipeDia(eq, d);
        if (status === 'presente') totalPresencas++;

        let classe = 'eq-cel-vazio';
        if (status === 'presente') classe = 'eq-cel-presente';
        else if (status === 'ausente') classe = 'eq-cel-ausente';
        else if (status === 'agendado') classe = 'eq-cel-agendado';

        return `<td class="${classe}"></td>`;
      }).join('')}
      <td>${totalPresencas}</td>
    </tr>`;
  });

  tbody.innerHTML = html || '<tr><td colspan="999" style="text-align:center;color:#999;padding:20px">Nenhuma equipe registrada</td></tr>';
}

function _renderizarCards() {
  const container = document.getElementById('cards-equipes');
  if (!container) return;

  if (equipes.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:#999;padding:40px">Nenhuma equipe registrada nas visitas</div>';
    return;
  }

  // Gerar dados fictícios para demonstração
  const cardsHTML = equipes.map((eq, idx) => {
    const id = `EQ-OBR-${String(idx + 1).padStart(2, '0')}`;
    const dados = _gerarDadosEquipe(eq);

    return `
      <div class="eq-card">
        <div class="eq-card-id">${id}</div>
        <div class="eq-card-nome">${_esc(eq)}</div>

        <div class="eq-card-linha">
          <div class="eq-card-label">Especialidade:</div>
          <div>${dados.especialidade}</div>
        </div>

        <div class="eq-card-linha">
          <div class="eq-card-label">Telefone:</div>
          <div>${dados.telefone || 'Não informado'}</div>
        </div>

        <div class="eq-card-linha">
          <div class="eq-card-label">E-mail:</div>
          <div>${dados.email || 'Não informado'}</div>
        </div>

        <div class="eq-card-linha">
          <div class="eq-card-label">Chave PIX:</div>
          <div>${dados.pix || 'Não informado'}</div>
        </div>

        <div class="eq-card-separador"></div>

        <div class="eq-card-linha" style="margin-bottom:16px">
          <div style="font-size:11px;color:#999">${dados.nota}</div>
        </div>

        <div class="eq-card-acoes">
          <button class="btn-card btn-card-sec" onclick="alert('Em breve: WhatsApp')">📱 WhatsApp</button>
          <button class="btn-card btn-card-primario" data-equipe="${_esc(eq)}" data-contato="${_esc(JSON.stringify(dados))}" onclick="window.copiarContatoEquipe(this)">📋 Copiar</button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cardsHTML;
}

// =============================================================================
// LÓGICA DE NEGÓCIO
// =============================================================================

function _statusEquipeDia(equipe, data) {
  const visita = visitas.find(v => v.data?.startsWith(data));
  if (!visita) return 'vazio';
  if ((visita.equipes_presentes || []).includes(equipe)) return 'presente';
  return 'vazio';
}

function _gerarDadosEquipe(nome) {
  // Dados fictícios para demonstração — em produção viria de tabela 'equipes'
  const especialidades = ['Alvenaria', 'Elétrica', 'Hidráulica', 'Pintura', 'Gesso', 'Serralheria'];
  const esp = especialidades[Math.floor(Math.random() * especialidades.length)];

  return {
    especialidade: esp,
    telefone: '',
    email: '',
    pix: '',
    nota: 'Última atividade: ' + (visitas[visitas.length - 1]?.data || '—'),
  };
}

// =============================================================================
// AÇÕES
// =============================================================================

window.copiarContatoEquipe = function(btn) {
  try {
    const equipe = btn.dataset.equipe;
    const dados = JSON.parse(btn.dataset.contato);

    const texto = [
      equipe,
      dados.especialidade,
      dados.telefone || '',
      dados.email || '',
      dados.pix || '',
    ].filter(Boolean).join('\n');

    navigator.clipboard.writeText(texto)
      .then(() => showToast('Contato copiado!', 'success'))
      .catch(erro => {
        console.error('[DEKA][Equipes] Erro ao copiar:', erro);
        showToast('Erro ao copiar contato', 'error');
      });

  } catch (erro) {
    console.error('[DEKA][Equipes] Erro ao copiar contato:', erro);
    showToast('Erro ao copiar contato', 'error');
  }
};

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
