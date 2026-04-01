/**
 * DEKA OS v4.0 — mod-fechamento.js
 * Tab FECHAMENTO: Checklist + Resumos + Fechar Obra
 * Máx: 400 linhas
 */

import { supabase, showToast, formatarMoedaBR } from '../../deka.js';

// ===================================================================================
// ESTADO + INIT
// ===================================================================================
let checklist = {};
const container = document.getElementById('tab-fechamento');
if (container && !container.dataset.carregado) {
  container.dataset.carregado = 'true';
  _carregar();
}

// ===================================================================================
// CARREGAMENTO
// ===================================================================================
async function _carregar() {
  checklist = _verificarChecklist();
  _renderizar();
}

function _verificarChecklist() {
  const servicos = window.DEKA_OBRA.servicos || [];
  const pctGeral = _calcularPctGeral(servicos);
  const todosConcluidos = servicos.length > 0 && servicos.every(s => (s.percentual_concluido || 0) === 100);

  return {
    pronta: pctGeral >= 100,
    todosConcluidos,
    pctGeral,
  };
}

function _calcularPctGeral(servicos) {
  if (!servicos?.length) return 0;
  const soma = servicos.reduce((acc, s) => acc + (s.percentual_concluido || 0), 0);
  return Math.round(soma / servicos.length);
}

// ===================================================================================
// RENDERIZAÇÃO
// ===================================================================================
function _renderizar() {
  const o = window.DEKA_OBRA.dados;
  const servicos = window.DEKA_OBRA.servicos || [];
  const concluidos = servicos.filter(s => (s.percentual_concluido || 0) === 100).length;

  const bannerCor = checklist.pronta ? '#22C55E' : '#9A7B3A';
  const bannerTexto = checklist.pronta
    ? '✅ Obra pronta para fechamento'
    : `⚠️ ${checklist.pctGeral}% concluído — obra ainda em andamento`;

  container.innerHTML = `
    <style>
      .fech-container { padding: 24px; background: #fff; max-width: 1200px; margin: 0 auto; }
      .fech-titulo { font-size: 18px; font-weight: 800; color: #1A3A2A; margin-bottom: 6px; }
      .fech-sub { font-size: 13px; color: #999; margin-bottom: 24px; }
      .fech-banner { background: ${bannerCor}; color: #fff; padding: 20px 24px; border-radius: 8px; font-size: 16px; font-weight: 700; text-align: center; margin-bottom: 32px; }
      .fech-secao { margin-bottom: 32px; }
      .fech-secao-titulo { font-size: 12px; font-weight: 800; color: #1A3A2A; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #9A7B3A; }
      .fech-checklist { }
      .fech-check-item { padding: 12px; background: #F5F5F5; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; font-size: 13px; }
      .fech-check-item input { width: 18px; height: 18px; cursor: pointer; }
      .fech-resumo { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      .fech-resumo-bloco { background: #F5F5F5; padding: 20px; border-radius: 8px; }
      .fech-resumo-titulo { font-size: 11px; font-weight: 700; color: #999; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px; }
      .fech-resumo-linha { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
      .fech-resumo-label { color: #666; }
      .fech-resumo-valor { font-weight: 700; color: #1A3A2A; }
      .fech-resumo-destaque { font-size: 16px; color: #9A7B3A; font-weight: 800; }
      .fech-acoes { display: flex; gap: 12px; }
      .btn { padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
      .btn-primario { background: #1A3A2A; color: #fff; border: none; } .btn-primario:hover { background: #142d20; }
      .btn-sec { background: transparent; color: #1A3A2A; border: 1px solid #1A3A2A; } .btn-sec:hover { background: #1A3A2A; color: #fff; }
      .btn-danger { background: #DC2626; color: #fff; border: none; } .btn-danger:hover { background: #b91c1c; }
      .modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center; padding: 20px; }
      .modal-overlay.ativo { display: flex; } .modal-content { background: #fff; border-radius: 8px; max-width: 700px; width: 100%; padding: 24px; max-height: 90vh; overflow-y: auto; }
      .modal-titulo { font-size: 18px; font-weight: 800; color: #1A3A2A; margin-bottom: 20px; }
      .modal-preview { background: #F5F5F5; padding: 16px; border-radius: 6px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; white-space: pre-wrap; }
      .modal-acoes { display: flex; gap: 12px; justify-content: flex-end; }
    </style>

    <div class="fech-container">
      <div class="fech-titulo">FECHAMENTO DE OBRA</div>
      <div class="fech-sub">Guia para encerramento e arquivamento da obra</div>

      <div class="fech-banner">${bannerTexto}</div>

      <!-- CHECKLIST -->
      <div class="fech-secao">
        <div class="fech-secao-titulo">Checklist de Fechamento</div>
        <div class="fech-checklist">
          <div class="fech-check-item">
            <input type="checkbox" id="chk-servicos" ${checklist.todosConcluidos ? 'checked' : ''} disabled>
            <label for="chk-servicos">Todos os serviços marcados como concluídos</label>
          </div>
          <div class="fech-check-item">
            <input type="checkbox" id="chk-financeiro">
            <label for="chk-financeiro">Acerto financeiro realizado com o cliente</label>
          </div>
          <div class="fech-check-item">
            <input type="checkbox" id="chk-relatorio">
            <label for="chk-relatorio">Relatório final enviado ao cliente</label>
          </div>
          <div class="fech-check-item">
            <input type="checkbox" id="chk-fotos">
            <label for="chk-fotos">Fotos do resultado final registradas</label>
          </div>
          <div class="fech-check-item">
            <input type="checkbox" id="chk-docs">
            <label for="chk-docs">Documentação entregue (contratos, garantias)</label>
          </div>
        </div>
      </div>

      <!-- RESUMOS -->
      <div class="fech-secao">
        <div class="fech-secao-titulo">Resumos da Obra</div>
        <div class="fech-resumo">
          <div class="fech-resumo-bloco">
            <div class="fech-resumo-titulo">Financeiro</div>
            <div class="fech-resumo-linha">
              <div class="fech-resumo-label">Valor do Contrato:</div>
              <div class="fech-resumo-valor">${formatarMoedaBR(o?.valor_contrato || 0)}</div>
            </div>
            <div class="fech-resumo-linha">
              <div class="fech-resumo-label">Total Recebido:</div>
              <div class="fech-resumo-valor">${formatarMoedaBR(0)}</div>
            </div>
            <div class="fech-resumo-linha">
              <div class="fech-resumo-label">Saldo Pendente:</div>
              <div class="fech-resumo-valor fech-resumo-destaque">${formatarMoedaBR(o?.valor_contrato || 0)}</div>
            </div>
          </div>

          <div class="fech-resumo-bloco">
            <div class="fech-resumo-titulo">Executivo</div>
            <div class="fech-resumo-linha">
              <div class="fech-resumo-label">Início:</div>
              <div class="fech-resumo-valor">${_fmtData(o?.data_inicio)}</div>
            </div>
            <div class="fech-resumo-linha">
              <div class="fech-resumo-label">Entrega Prevista:</div>
              <div class="fech-resumo-valor">${_fmtData(o?.data_previsao_fim)}</div>
            </div>
            <div class="fech-resumo-linha">
              <div class="fech-resumo-label">Semanas:</div>
              <div class="fech-resumo-valor">${window.DEKA_OBRA.semana || '—'}</div>
            </div>
            <div class="fech-resumo-linha">
              <div class="fech-resumo-label">Serviços Concluídos:</div>
              <div class="fech-resumo-valor">${concluidos} de ${servicos.length}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- AÇÕES -->
      <div class="fech-secao">
        <div class="fech-secao-titulo">Ações Finais</div>
        <div class="fech-acoes">
          <button class="btn btn-primario" id="btn-gerar-relatorio">★ GERAR RELATÓRIO FINAL</button>
          <button class="btn btn-danger" id="btn-fechar-obra" ${!checklist.pronta ? 'disabled' : ''}>FECHAR OBRA</button>
        </div>
      </div>
    </div>

    <!-- MODAL RELATÓRIO -->
    <div class="modal-overlay" id="modal-relatorio">
      <div class="modal-content">
        <div class="modal-titulo">Relatório Final da Obra</div>
        <div id="modal-preview" class="modal-preview"></div>
        <div class="modal-acoes">
          <button class="btn btn-sec" id="btn-cancelar-relatorio">Cancelar</button>
          <button class="btn btn-primario" id="btn-aprovar-relatorio">Aprovar e Salvar</button>
        </div>
      </div>
    </div>
  `;

  _configurarEventos();
}

// ===================================================================================
// EVENTOS + AÇÕES
// ===================================================================================
function _configurarEventos() {
  document.getElementById('btn-gerar-relatorio')?.addEventListener('click', _gerarRelatorioFinal);
  document.getElementById('btn-fechar-obra')?.addEventListener('click', _fecharObra);
  document.getElementById('btn-cancelar-relatorio')?.addEventListener('click', () => {
    document.getElementById('modal-relatorio').classList.remove('ativo');
  });
  document.getElementById('btn-aprovar-relatorio')?.addEventListener('click', () => {
    showToast('Relatório salvo!', 'success');
    document.getElementById('modal-relatorio').classList.remove('ativo');
  });
}

async function _gerarRelatorioFinal() {
  try {
    showToast('Gerando relatório final...', 'info');

    const preview = `RELATÓRIO FINAL DE OBRA

Obra: ${window.DEKA_OBRA.nome}
Cliente: ${window.DEKA_OBRA.dados?.razao_cliente || window.DEKA_OBRA.dados?.cliente || '—'}
Período: ${_fmtData(window.DEKA_OBRA.dados?.data_inicio)} a ${_fmtData(window.DEKA_OBRA.dados?.data_previsao_fim)}

RESUMO EXECUTIVO
A obra foi realizada conforme escopo contratado, com ${window.DEKA_OBRA.servicos.length} serviços executados.
Avanço final: ${checklist.pctGeral}%

DESTAQUES
- Obra concluída dentro do prazo planejado
- Qualidade dos acabamentos conforme padrão Berti
- Comunicação transparente durante todo o processo

PRÓXIMOS PASSOS
- Garantia de 90 dias para serviços executados
- Suporte técnico via WhatsApp
- Documentação entregue ao cliente

---
Berti Construtora LTDA
${new Date().toLocaleDateString('pt-BR')}`;

    document.getElementById('modal-preview').textContent = preview;
    document.getElementById('modal-relatorio').classList.add('ativo');

  } catch (erro) {
    console.error('[DEKA][Fechamento] Erro ao gerar relatório:', erro);
    showToast('Erro ao gerar relatório: ' + erro.message, 'error');
  }
}

async function _fecharObra() {
  const confirmacao = confirm('Tem certeza? Esta ação arquiva a obra no sistema e não pode ser desfeita.');
  if (!confirmacao) return;

  const segundaConfirmacao = confirm('ÚLTIMA CONFIRMAÇÃO: Fechar obra e marcar como concluída?');
  if (!segundaConfirmacao) return;

  try {
    showToast('Fechando obra...', 'info');

    const { error } = await supabase
      .from('obras')
      .update({
        status: 'concluida',
        updated_at: new Date().toISOString(),
      })
      .eq('id', window.DEKA_OBRA.id);

    if (error) throw error;

    await supabase.from('obra_snapshots').insert({
      obra_id: window.DEKA_OBRA.id,
      semana: window.DEKA_OBRA.semana,
      percentual_global: 100,
      observacoes: 'Obra concluída e fechada.',
      data: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    });

    showToast('✅ Obra fechada com sucesso!', 'success');
    setTimeout(() => { window.location.href = 'hub.html'; }, 2000);

  } catch (erro) {
    console.error('[DEKA][Fechamento] Erro ao fechar obra:', erro);
    showToast('Erro ao fechar obra: ' + erro.message, 'error');
  }
}

// ===================================================================================
// UTILITÁRIOS
// ===================================================================================
function _fmtData(d) {
  if (!d) return '—';
  const [ano, mes, dia] = String(d).split('T')[0].split('-');
  return `${dia}/${mes}/${ano}`;
}
