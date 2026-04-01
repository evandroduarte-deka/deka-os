/**
 * DEKA OS v4.0 — mod-obra.js
 * Tab OBRA: Dados gerais, KPIs, Financeiro
 * Máx: 400 linhas
 */

import { supabase, showToast, formatarMoedaBR } from '../../deka.js';

// =============================================================================
// INIT
// =============================================================================

const container = document.getElementById('tab-obra');

if (container && !container.dataset.carregado) {
  container.dataset.carregado = 'true';
  _renderizar();
}

// =============================================================================
// RENDERIZAÇÃO
// =============================================================================

function _renderizar() {
  const o = window.DEKA_OBRA.dados;
  if (!o) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:#999">Dados da obra não disponíveis.</div>';
    return;
  }

  const ini = o.data_inicio       ? _fmtData(o.data_inicio)       : '—';
  const fim = o.data_previsao_fim ? _fmtData(o.data_previsao_fim) : '—';
  const pct = window.DEKA_OBRA.pct || 0;

  // Cálculos financeiros
  const vc = o.valor_contrato || 0;
  const pago = 0;  // TODO: calcular de obra_pagamentos
  const saldo = vc - pago;

  // KPIs de serviços
  const servicos = window.DEKA_OBRA.servicos;
  const concluidos  = servicos.filter((s) => (s.status || '').toUpperCase().includes('CONCLU')).length;
  const emAndamento = servicos.filter((s) => (s.status || '').toUpperCase().includes('ANDAMENTO')).length;

  // Status de prazo
  const prazoHTML = _calcularPrazo(o);

  container.innerHTML = `
    <style>
      .obra-header {
        background: #1A3A2A;
        padding: 22px 24px;
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 24px;
        align-items: center;
      }
      .obra-logo-bloco { border-right: 1px solid rgba(255,255,255,0.2); padding-right: 24px; }
      .obra-logo-nome  { font-size: 32px; font-weight: 800; letter-spacing: 3px; color: #fff; }
      .obra-logo-sub   { font-size: 9px; letter-spacing: 4px; color: #9A7B3A; text-transform: uppercase; margin-top: 2px; }
      .obra-tag        { font-size: 10px; font-weight: 700; color: #9A7B3A; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
      .obra-nome       { font-size: 22px; font-weight: 700; color: #fff; line-height: 1.2; }
      .obra-end        { font-size: 11px; color: #999; margin-top: 4px; }
      .obra-meta       { text-align: right; font-size: 13px; color: #999; line-height: 1.8; }
      .obra-meta b     { display: block; font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 2px; }

      .linha-ouro { height: 2px; background: #9A7B3A; }

      .obra-financeiro {
        background: #1A3A2A;
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        border-bottom: 1px solid rgba(255,255,255,0.1);
      }
      .fin-item { padding: 14px 18px; border-right: 1px solid rgba(255,255,255,0.1); }
      .fin-item:last-child { border-right: none; }
      .fin-label { font-size: 9px; font-weight: 700; color: #666; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; line-height: 1.3; }
      .fin-valor { font-size: 20px; font-weight: 800; color: #fff; line-height: 1; }
      .fin-sub   { font-size: 10px; color: #888; margin-top: 4px; }

      .obra-kpis {
        background: #fff;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border-bottom: 1px solid #E5E5E5;
      }
      .kpi { padding: 20px 24px; border-right: 1px solid #E5E5E5; }
      .kpi:last-child { border-right: none; }
      .kpi-label { font-size: 10px; font-weight: 700; color: #999; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px; }
      .kpi-val   { font-size: 52px; font-weight: 800; color: #1A1A1A; line-height: 1; }
      .kpi-val.ouro  { color: #9A7B3A; }
      .kpi-data  { font-size: 22px; font-weight: 800; color: #1A1A1A; margin-top: 6px; }
      .kpi-ok    { font-size: 13px; font-weight: 700; color: #22C55E; margin-top: 6px; }
      .kpi-alert { font-size: 13px; font-weight: 700; color: #DC2626; margin-top: 6px; }

      .obra-acoes {
        padding: 24px;
        background: #fff;
        display: flex;
        gap: 12px;
      }
      .btn-acao {
        padding: 10px 20px;
        border: 1px solid #1A3A2A;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 700;
        color: #1A3A2A;
        background: transparent;
        transition: all 0.15s;
        cursor: pointer;
      }
      .btn-acao:hover { background: #1A3A2A; color: #fff; }
      .btn-acao.primario { background: #1A3A2A; color: #fff; }
      .btn-acao.primario:hover { background: #142d20; }
    </style>

    <!-- HEADER -->
    <div class="obra-header">
      <div class="obra-logo-bloco">
        <div class="obra-logo-nome">BERTI.</div>
        <div class="obra-logo-sub">Construtora</div>
      </div>
      <div>
        <div class="obra-tag">Acompanhamento de Obra</div>
        <div class="obra-nome">${_esc(o.nome || '—')}</div>
        <div class="obra-end">${_esc(o.endereco || '—')}</div>
      </div>
      <div class="obra-meta">
        <b>${_esc(o.razao_cliente || o.cliente || '—')}</b>
        <span>Período: ${ini} a ${fim}</span><br>
        <span>Entrega prevista: ${fim}</span>
      </div>
    </div>

    <div class="linha-ouro"></div>

    <!-- FINANCEIRO -->
    <div class="obra-financeiro">
      <div class="fin-item">
        <div class="fin-label">Valor do Contrato</div>
        <div class="fin-valor">${formatarMoedaBR(vc)}</div>
        <div class="fin-sub">${o.num_medicoes || 0} medições previstas</div>
      </div>
      <div class="fin-item">
        <div class="fin-label">Valor Pago</div>
        <div class="fin-valor">${formatarMoedaBR(pago)}</div>
        <div class="fin-sub">${vc > 0 ? Math.round((pago/vc)*100) : 0}% do contrato</div>
      </div>
      <div class="fin-item">
        <div class="fin-label">Saldo em Aberto</div>
        <div class="fin-valor">${formatarMoedaBR(saldo)}</div>
        <div class="fin-sub">${vc > 0 ? Math.round((saldo/vc)*100) : 100}% restante</div>
      </div>
      <div class="fin-item">
        <div class="fin-label">Próx. Medição</div>
        <div class="fin-valor" style="font-size:16px;margin-top:3px">${fim}</div>
        <div class="fin-sub">Medição 1 de ${o.num_medicoes || 0}</div>
      </div>
      <div class="fin-item">
        <div class="fin-label">Semana / Rev.</div>
        <div class="fin-valor" style="font-size:16px;margin-top:3px">Sem. ${o.semana || '—'} — Rev. A</div>
      </div>
      <div class="fin-item">
        <div class="fin-label">Contratada</div>
        <div class="fin-valor" style="font-size:14px;margin-top:3px;line-height:1.2">${_esc(o.empresa || 'Berti Construtora LTDA')}</div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="obra-kpis">
      <div class="kpi">
        <div class="kpi-label">Avanço Geral</div>
        <div class="kpi-val ouro">${pct}%</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Serviços Concluídos</div>
        <div class="kpi-val">${concluidos}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Em Andamento</div>
        <div class="kpi-val">${emAndamento}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Entrega Prevista</div>
        <div class="kpi-data">${fim}</div>
        ${prazoHTML}
      </div>
    </div>

    <!-- AÇÕES -->
    <div class="obra-acoes">
      <button class="btn-acao" onclick="window.location.href='relatorios.html?id=${o.id}'">📄 Relatório PDF</button>
      <button class="btn-acao" onclick="alert('Em breve: Configurações da Obra')">⚙️ Configurações</button>
    </div>
  `;

  console.log('[DEKA][mod-obra] ✅ Tab OBRA renderizada.');
}

// =============================================================================
// UTILITÁRIOS
// =============================================================================

function _calcularPrazo(o) {
  if (!o.data_previsao_fim) return '';

  const hoje     = new Date();
  const previsao = new Date(o.data_previsao_fim + 'T12:00:00');
  const dias     = Math.floor((previsao - hoje) / 86400000);

  if (dias < 0) {
    return '<div class="kpi-alert">🔴 Atrasada</div>';
  } else if (dias < 7) {
    return `<div class="kpi-alert">⚠️ ${dias}d restantes</div>`;
  } else {
    return '<div class="kpi-ok">✅ No Prazo</div>';
  }
}

function _fmtData(d) {
  if (!d) return '—';
  const p = String(d).split('T')[0].split('-');
  return `${p[2]}/${p[1]}/${p[0]}`;
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
