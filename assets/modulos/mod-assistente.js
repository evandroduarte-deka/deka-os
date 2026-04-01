/**
 * DEKA OS v4.0 — mod-assistente.js
 * Tab ASSISTENTE: Chat IA com contexto completo da obra
 * Máx: 400 linhas
 */

import { supabase, showToast, chamarClaude } from '../../deka.js';

// ===================================================================================
// ESTADO + INIT
// ===================================================================================
const historico = [];
const container = document.getElementById('tab-assistente');
if (container && !container.dataset.carregado) {
  container.dataset.carregado = 'true';
  _renderizar();
}

// ===================================================================================
// CONSTANTES
// ===================================================================================
const BOAS_VINDAS = `Olá! Tenho acesso completo aos dados desta obra. Posso responder sobre serviços, equipes, financeiro, pendências e muito mais. O que você precisa?`;

const SUGESTOES = [
  'Resumo da semana atual',
  'Quais serviços estão atrasados?',
  'Como está o financeiro?',
  'Quais são as pendências abertas?',
  'Próximos passos recomendados',
];

// ===================================================================================
// RENDERIZAÇÃO
// ===================================================================================
function _renderizar() {
  container.innerHTML = `
    <style>
      .asst-container { display: flex; flex-direction: column; height: calc(100vh - 180px); max-width: 1000px; margin: 0 auto; background: #fff; }
      .asst-header { padding: 20px 24px; border-bottom: 1px solid #E5E5E5; }
      .asst-titulo { font-size: 18px; font-weight: 800; color: #1A3A2A; margin-bottom: 4px; }
      .asst-sub { font-size: 13px; color: #999; }
      .asst-mensagens { flex: 1; overflow-y: auto; padding: 20px 24px; }
      .msg { margin: 12px 0; }
      .msg-usuario { text-align: right; }
      .msg-brain { text-align: left; }
      .msg-bubble { display: inline-block; max-width: 80%; padding: 12px 16px; border-radius: 12px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
      .msg-usuario .msg-bubble { background: #1A3A2A; color: #fff; border-radius: 12px 12px 0 12px; }
      .msg-brain .msg-bubble { background: #F5F5F5; color: #1A1A1A; border-radius: 12px 12px 12px 0; }
      .msg-brain .msg-icone { font-size: 11px; color: #999; margin-bottom: 4px; }
      .asst-digitando { text-align: left; margin: 12px 0; display: none; }
      .asst-digitando.ativo { display: block; }
      .digitando-bubble { display: inline-block; background: #F5F5F5; padding: 12px 16px; border-radius: 12px; font-size: 14px; color: #999; }
      .asst-sugestoes { padding: 12px 24px; border-top: 1px solid #E5E5E5; display: flex; gap: 8px; flex-wrap: wrap; }
      .sug-chip { padding: 8px 14px; background: #F5F5F5; border: 1px solid #E5E5E5; border-radius: 20px; font-size: 12px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.15s; }
      .sug-chip:hover { background: #1A3A2A; color: #fff; border-color: #1A3A2A; }
      .asst-input-area { padding: 16px 24px; border-top: 2px solid #E5E5E5; display: flex; gap: 12px; }
      .asst-input { flex: 1; padding: 12px 16px; border: 1px solid #E5E5E5; border-radius: 8px; font-size: 14px; font-family: 'Barlow Condensed', sans-serif; }
      .asst-input:focus { outline: none; border-color: #1A3A2A; }
      .asst-btn-enviar { padding: 12px 24px; background: #1A3A2A; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
      .asst-btn-enviar:hover { background: #142d20; }
      .asst-btn-enviar:disabled { background: #999; cursor: not-allowed; }
    </style>

    <div class="asst-container">
      <div class="asst-header">
        <div class="asst-titulo">ASSISTENTE</div>
        <div class="asst-sub">Chat inteligente com contexto da obra</div>
      </div>

      <div class="asst-mensagens" id="chat-mensagens"></div>

      <div class="asst-digitando" id="digitando">
        <div class="digitando-bubble">Brain está digitando...</div>
      </div>

      <div class="asst-sugestoes" id="sugestoes-area"></div>

      <div class="asst-input-area">
        <input type="text" class="asst-input" id="input-msg" placeholder="Pergunte sobre a obra..." />
        <button class="asst-btn-enviar" id="btn-enviar">▶ Enviar</button>
      </div>
    </div>
  `;

  _renderizarSugestoes();
  _renderizarMensagem('brain', BOAS_VINDAS);
  _configurarEventos();
}

function _renderizarSugestoes() {
  const area = document.getElementById('sugestoes-area');
  if (!area) return;

  area.innerHTML = SUGESTOES.map(s => `<div class="sug-chip" data-texto="${_esc(s)}">${_esc(s)}</div>`).join('');

  area.querySelectorAll('.sug-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.getElementById('input-msg').value = chip.dataset.texto;
      document.getElementById('btn-enviar').click();
    });
  });
}

function _renderizarMensagem(tipo, texto) {
  const area = document.getElementById('chat-mensagens');
  if (!area) return;

  const div = document.createElement('div');
  div.className = `msg msg-${tipo}`;

  if (tipo === 'brain') {
    const icone = document.createElement('div');
    icone.className = 'msg-icone';
    icone.textContent = '🤖 Brain';
    div.appendChild(icone);
  }

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  bubble.textContent = texto;
  div.appendChild(bubble);

  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
}

// ===================================================================================
// EVENTOS + AÇÕES
// ===================================================================================
function _configurarEventos() {
  const input = document.getElementById('input-msg');
  const btnEnviar = document.getElementById('btn-enviar');

  btnEnviar?.addEventListener('click', () => {
    const texto = input?.value.trim();
    if (texto) _enviarMensagem(texto);
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const texto = input.value.trim();
      if (texto) _enviarMensagem(texto);
    }
  });
}

async function _enviarMensagem(texto) {
  if (!texto.trim()) return;

  historico.push({ role: 'user', content: texto });
  _renderizarMensagem('usuario', texto);
  _limparInput();
  _mostrarDigitando();

  try {
    const contexto = _montarContexto();
    const sistemaPrompt = `Você é o assistente inteligente da obra "${window.DEKA_OBRA.nome}" da Berti Construtora.

Contexto atual: ${JSON.stringify(contexto)}

Instruções:
- Responda de forma direta e profissional
- NUNCA use códigos internos (SRV/EQ/FOR/OBR) nas respostas
- Use linguagem natural para descrever serviços e equipes
- Se não souber algo, diga que precisa verificar os dados
- Seja conciso mas completo
- Use dados reais do contexto fornecido`;

    const { texto: resposta } = await chamarClaude({
      mensagens: historico,
      sistemaPrompt,
      modelo: 'claude-sonnet-4-20250514',
      maxTokens: 2048,
      temperature: 1.0,
      agente: 'AGT_ASSISTENTE',
    });

    _esconderDigitando();
    historico.push({ role: 'assistant', content: resposta });
    _renderizarMensagem('brain', resposta);

  } catch (erro) {
    _esconderDigitando();
    console.error('[DEKA][Assistente] Erro ao consultar Brain:', erro);
    showToast('Erro ao consultar Brain: ' + erro.message, 'error');
    _renderizarMensagem('brain', 'Desculpe, tive um problema ao processar sua pergunta. Tente novamente.');
  }
}

// ===================================================================================
// CONTEXTO DA OBRA
// ===================================================================================
function _montarContexto() {
  const o = window.DEKA_OBRA;
  const servicos = o.servicos || [];
  const concluidos = servicos.filter(s => (s.percentual_concluido || 0) === 100).length;
  const andamento = servicos.filter(s => (s.percentual_concluido || 0) > 0 && s.percentual_concluido < 100).length;
  const pendentes = servicos.length - concluidos - andamento;

  return {
    obra: {
      nome: o.nome,
      cliente: o.dados?.razao_cliente || o.dados?.cliente,
      semana: o.semana,
      percentual_global: o.pct,
      status: o.dados?.status,
      data_inicio: o.dados?.data_inicio,
      data_previsao_fim: o.dados?.data_previsao_fim,
      valor_contrato: o.dados?.valor_contrato,
    },
    servicos: {
      total: servicos.length,
      concluidos,
      andamento,
      pendentes,
    },
    resumo: {
      top_5_servicos_em_andamento: servicos
        .filter(s => s.percentual_concluido > 0 && s.percentual_concluido < 100)
        .slice(0, 5)
        .map(s => ({
          descricao: s.descricao_cliente,
          percentual: s.percentual_concluido,
        })),
    },
  };
}

// ===================================================================================
// UTILITÁRIOS UI
// ===================================================================================
function _limparInput() {
  const input = document.getElementById('input-msg');
  if (input) input.value = '';
}

function _mostrarDigitando() {
  const el = document.getElementById('digitando');
  if (el) el.classList.add('ativo');
  const area = document.getElementById('chat-mensagens');
  if (area) area.scrollTop = area.scrollHeight;
}

function _esconderDigitando() {
  const el = document.getElementById('digitando');
  if (el) el.classList.remove('ativo');
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
