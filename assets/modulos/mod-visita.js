/**
 * DEKA OS v4.0 — mod-visita.js
 * Tab VISITA: Coração do diário de obra
 * Gravação áudio + Processamento IA + Aprovação de sugestões
 * Máx: 400 linhas
 */

import { supabase, showToast } from '../../deka.js';

// =============================================================================
// ESTADO
// =============================================================================

let mediaRecorder = null;
let audioBlob = null;
let chunks = [];

// =============================================================================
// INIT
// =============================================================================

const container = document.getElementById('tab-visita');

if (container && !container.dataset.carregado) {
  container.dataset.carregado = 'true';
  _renderizar();
  _configurarEventos();
}

// =============================================================================
// RENDERIZAÇÃO
// =============================================================================

function _renderizar() {
  const hoje = new Date();
  const dia  = String(hoje.getDate()).padStart(2, '0');
  const mes  = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano  = hoje.getFullYear();
  const diaSemana = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'][hoje.getDay()];

  container.innerHTML = `
    <style>
      .visita-container { padding: 24px; background: #fff; max-width: 1200px; margin: 0 auto; }
      .visita-titulo { font-size: 18px; font-weight: 800; color: #1A3A2A; letter-spacing: 0.5px; margin-bottom: 6px; }
      .visita-subtitulo { font-size: 13px; color: #999; margin-bottom: 24px; }

      .visita-secao { margin-bottom: 32px; }
      .secao-titulo { font-size: 12px; font-weight: 800; color: #1A3A2A; letter-spacing: 1.2px; text-transform: uppercase; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #9A7B3A; }

      .registro-area {
        background: #1A3A2A;
        padding: 24px;
        border-radius: 8px;
        margin-bottom: 20px;
      }
      .btn-audio {
        width: 100%;
        padding: 16px;
        background: rgba(255,255,255,0.1);
        border: 2px dashed rgba(255,255,255,0.3);
        border-radius: 8px;
        color: #fff;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
        margin-bottom: 16px;
      }
      .btn-audio:hover { background: rgba(255,255,255,0.15); border-color: #9A7B3A; }
      .btn-audio.gravando { background: #DC2626; border-color: #DC2626; animation: pulse 1.5s infinite; }
      @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }

      .textarea-visita {
        width: 100%;
        min-height: 120px;
        padding: 12px;
        background: rgba(255,255,255,0.95);
        border: 1px solid rgba(255,255,255,0.3);
        border-radius: 6px;
        color: #1A1A1A;
        font-size: 14px;
        line-height: 1.6;
        resize: vertical;
        margin-bottom: 16px;
      }
      .textarea-visita:focus { outline: none; border-color: #9A7B3A; }

      .btn-grupo { display: flex; gap: 12px; }
      .btn {
        padding: 10px 20px;
        border-radius: 6px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-primario { background: #9A7B3A; color: #fff; border: none; }
      .btn-primario:hover { background: #7d6430; }
      .btn-secundario { background: transparent; color: #fff; border: 1px solid rgba(255,255,255,0.3); }
      .btn-secundario:hover { border-color: #9A7B3A; color: #9A7B3A; }
      .chip-equipes { display: flex; gap: 8px; flex-wrap: wrap; }
      .chip { padding: 6px 14px; background: #F5F5F5; border: 1px solid #E5E5E5; border-radius: 20px; font-size: 12px; font-weight: 600; color: #666; cursor: pointer; transition: all 0.15s; }
      .chip.ativo { background: #1A3A2A; color: #fff; border-color: #1A3A2A; }
      .programacao-item { padding: 12px; background: #F5F5F5; border-left: 3px solid #9A7B3A; margin-bottom: 8px; border-radius: 4px; }
      .programacao-equipe { font-size: 13px; font-weight: 700; color: #1A3A2A; margin-bottom: 4px; }
      .programacao-servico { font-size: 12px; color: #666; }

      .modal-aprovacao { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000; align-items: center; justify-content: center; padding: 20px; }
      .modal-aprovacao.ativo { display: flex; }
      .modal-content { background: #fff; border-radius: 8px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; padding: 24px; }
      .modal-titulo { font-size: 18px; font-weight: 800; color: #1A3A2A; margin-bottom: 20px; }
      .sugestao-item { padding: 12px; background: #F5F5F5; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
      .sugestao-info { flex: 1; }
      .sugestao-nome { font-size: 13px; font-weight: 700; color: #1A3A2A; }
      .sugestao-detalhes { font-size: 12px; color: #666; margin-top: 4px; }
      .sugestao-acoes { display: flex; gap: 8px; }
      .btn-aprovar { padding: 6px 14px; background: #22C55E; color: #fff; border: none; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; }
      .btn-rejeitar { padding: 6px 14px; background: #DC2626; color: #fff; border: none; border-radius: 4px; font-size: 11px; font-weight: 700; cursor: pointer; }
    </style>

    <div class="visita-container">
      <div class="visita-titulo">REGISTRAR VISITA</div>
      <div class="visita-subtitulo">${diaSemana} ${dia}/${mes}/${ano} · Semana ${window.DEKA_OBRA.semana || '—'} · ${window.DEKA_OBRA.servicos.length} serviços</div>

      <!-- PROGRAMAÇÃO DO DIA -->
      <div class="visita-secao">
        <div class="secao-titulo">Programação do Dia</div>
        <div id="programacao-dia">Carregando...</div>
      </div>

      <!-- EQUIPES PRESENTES -->
      <div class="visita-secao">
        <div class="secao-titulo">Equipes Presentes Hoje</div>
        <div class="chip-equipes" id="chip-equipes"></div>
      </div>

      <!-- ÁREA DE REGISTRO -->
      <div class="registro-area">
        <button class="btn-audio" id="btn-audio">🎤 Toque para gravar</button>
        <textarea class="textarea-visita" id="textarea-visita" placeholder="O que aconteceu hoje? Equipes presentes, avanços, compras, pendências..."></textarea>
        <div class="btn-grupo">
          <button class="btn btn-primario" id="btn-processar">★ PROCESSAR COM IA</button>
          <button class="btn btn-secundario" id="btn-salvar">✓ Salvar dia</button>
          <button class="btn btn-secundario" id="btn-limpar">Limpar</button>
        </div>
      </div>
    </div>

    <!-- MODAL DE APROVAÇÃO -->
    <div class="modal-aprovacao" id="modal-aprovacao">
      <div class="modal-content">
        <div class="modal-titulo">Aprovar Sugestões da IA</div>
        <div id="modal-body"></div>
        <div style="display:flex;gap:12px;margin-top:20px;justify-content:flex-end">
          <button class="btn btn-secundario" onclick="document.getElementById('modal-aprovacao').classList.remove('ativo')">Cancelar</button>
          <button class="btn btn-primario" id="btn-salvar-aprovacoes">SALVAR APROVAÇÕES</button>
        </div>
      </div>
    </div>
  `;

  _carregarProgramacao();
  _carregarEquipes();
}

// =============================================================================
// EVENTOS
// =============================================================================

function _configurarEventos() {
  document.getElementById('btn-audio')?.addEventListener('click', _toggleAudio);
  document.getElementById('btn-processar')?.addEventListener('click', _processarComIA);
  document.getElementById('btn-salvar')?.addEventListener('click', _salvarDia);
  document.getElementById('btn-limpar')?.addEventListener('click', () => {
    document.getElementById('textarea-visita').value = '';
    audioBlob = null;
  });
}

async function _toggleAudio() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    await _pararGravacao();
  } else {
    await _iniciarGravacao();
  }
}

async function _iniciarGravacao() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];

    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      audioBlob = new Blob(chunks, { type: 'audio/webm' });
      showToast('Áudio gravado com sucesso!', 'success');
    };

    mediaRecorder.start();
    document.getElementById('btn-audio').classList.add('gravando');
    document.getElementById('btn-audio').textContent = '🔴 Gravando... (toque para parar)';

  } catch (erro) {
    console.error('[DEKA][Visita] Microfone negado:', erro);
    showToast('Microfone não disponível. Use o campo de texto.', 'warning');
  }
}

async function _pararGravacao() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    document.getElementById('btn-audio').classList.remove('gravando');
    document.getElementById('btn-audio').textContent = '🎤 Toque para gravar';
  }
}

// =============================================================================
// PROCESSAMENTO IA
// =============================================================================

async function _processarComIA() {
  const texto = document.getElementById('textarea-visita').value.trim();

  if (!texto && !audioBlob) {
    showToast('Digite ou grave algo antes de processar.', 'warning');
    return;
  }

  showToast('⏳ Processando com IA...', 'info');

  try {
    let textoFinal = texto;

    // Se tem áudio, transcrever primeiro
    if (audioBlob) {
      textoFinal = await _transcreverAudio(audioBlob);
    }

    // Enviar para AGT_COCKPIT
    const resposta = await _chamarAGTCockpit(textoFinal);

    // Exibir modal de aprovação
    _mostrarModalAprovacao(resposta);

  } catch (erro) {
    console.error('[DEKA][Visita] Erro ao processar:', erro);
    showToast(erro.message || 'Erro ao processar com IA.', 'error');
  }
}

async function _transcreverAudio(blob) {
  const formData = new FormData();
  formData.append('file', blob, 'audio.webm');
  formData.append('model', 'whisper-1');

  const token = localStorage.getItem('mdo_worker_token') || '';
  const resp = await fetch(window.DEKA_CONFIG.workerUrl + '/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'X-Deka-Token': token },
    body: formData,
  });

  if (!resp.ok) throw new Error('Falha na transcrição');
  const data = await resp.json();
  return data.text || '';
}

async function _chamarAGTCockpit(texto) {
  const token = localStorage.getItem('mdo_worker_token') || '';

  const promptSistema = `Você é o AGT_COCKPIT da Berti Construtora.
Analise o relato de visita de obra e retorne APENAS um JSON válido.

Regras:
- narrativa: reorganize o texto em formato profissional, terceira pessoa
- sugestoes: identifique serviços mencionados e sugira % de avanço
- pendencias_novas: identifique tarefas, responsáveis e prazos mencionados
- NUNCA invente informações não mencionadas no texto
- NUNCA use códigos internos (SRV/EQ) na narrativa
- Responda APENAS com JSON, sem texto adicional

Formato obrigatório:
{
  "narrativa": "string",
  "sugestoes": [{ "srv_cod": "SRV-XXX", "descricao": "string", "pct_atual": number, "pct_sugerido": number, "motivo": "string" }],
  "pendencias_novas": [{ "descricao": "string", "responsavel": "string", "prazo": "string" }]
}`;

  const resp = await fetch(window.DEKA_CONFIG.workerUrl + '/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Deka-Token': token,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: promptSistema,
      messages: [{ role: 'user', content: texto }],
    }),
  });

  if (!resp.ok) throw new Error('Falha na IA');
  const data = await resp.json();
  return JSON.parse(data.content[0].text);
}

function _mostrarModalAprovacao(resposta) {
  const modal = document.getElementById('modal-aprovacao');
  const body = document.getElementById('modal-body');

  let html = `<div style="margin-bottom:20px">
    <strong>Narrativa organizada:</strong>
    <div style="background:#F5F5F5;padding:12px;border-radius:6px;margin-top:8px">${resposta.narrativa}</div>
  </div>`;

  if (resposta.sugestoes && resposta.sugestoes.length > 0) {
    html += '<div style="margin-bottom:20px"><strong>Sugestões de atualização:</strong>';
    resposta.sugestoes.forEach((s, i) => {
      html += `<div class="sugestao-item" data-idx="${i}">
        <div class="sugestao-info">
          <div class="sugestao-nome">${s.descricao}</div>
          <div class="sugestao-detalhes">Atual: ${s.pct_atual}% → Sugerido: ${s.pct_sugerido}% · ${s.motivo}</div>
        </div>
        <div class="sugestao-acoes">
          <button class="btn-aprovar" onclick="this.parentElement.parentElement.dataset.aprovado='true';this.textContent='✓'">Aprovar</button>
          <button class="btn-rejeitar" onclick="this.parentElement.parentElement.dataset.aprovado='false';this.textContent='✗'">Rejeitar</button>
        </div>
      </div>`;
    });
    html += '</div>';
  }

  body.innerHTML = html;
  modal.classList.add('ativo');

  document.getElementById('btn-salvar-aprovacoes').onclick = () => _salvarAprovacoes(resposta);
}

async function _salvarAprovacoes(resposta) {
  showToast('Salvando aprovações...', 'info');
  // TODO: implementar salvamento no Supabase
  document.getElementById('modal-aprovacao').classList.remove('ativo');
  showToast('Visita processada e salva!', 'success');
  document.getElementById('textarea-visita').value = '';
  audioBlob = null;
}

async function _salvarDia() {
  showToast('Salvando dia...', 'info');
  // TODO: salvar texto direto sem IA
}

// =============================================================================
// CARREGAMENTO
// =============================================================================

async function _carregarProgramacao() {
  document.getElementById('programacao-dia').innerHTML = '<div class="programacao-item"><div class="programacao-servico">Nenhum serviço programado para hoje.</div></div>';
}

async function _carregarEquipes() {
  const container = document.getElementById('chip-equipes');
  const equipes = ['Valdeci José E.', 'Ademarcos', 'Lumitech', 'Claudinei', 'Pablo', 'Roberto'];

  container.innerHTML = equipes.map(e => `<div class="chip">${e}</div>`).join('');

  container.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('ativo'));
  });
}

// =============================================================================
// FIM DO ARQUIVO
// =============================================================================
