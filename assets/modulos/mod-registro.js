/**
 * DEKA OS v4.0 — mod-registro.js
 * Tab REGISTRO: Acordeão com Cockpit, Fotos, Pendências, Materiais, Histórico
 * Máx: 400 linhas
 */

import { supabase, showToast } from '../../deka.js';

// ===================================================================================
// ESTADO + INIT
// ===================================================================================
let fotos = [], pendencias = [], compras = [], snapshots = [], secaoAberta = null;
const container = document.getElementById('tab-registro');
if (container && !container.dataset.carregado) {
  container.dataset.carregado = 'true';
  await _carregar();
}

// ===================================================================================
// CARREGAMENTO
// ===================================================================================

async function _carregar() {
  try {
    await Promise.all([
      _carregarFotos(),
      _carregarPendencias(),
      _carregarCompras(),
      _carregarSnapshots(),
    ]);
    _renderizar();
  } catch (erro) {
    console.error('[DEKA][Registro] Exceção ao carregar:', erro);
    showToast(erro.message || 'Erro ao carregar registro', 'error');
  }
}

async function _carregarFotos() {
  try {
    const { data, error } = await supabase.from('obra_fotos').select('*').eq('obra_id', window.DEKA_OBRA.id).order('data', { ascending: false });
    if (error) throw error;
    fotos = data || [];
  } catch (erro) { console.error('[DEKA][Registro] Erro ao carregar fotos:', erro); }
}
async function _carregarPendencias() {
  try {
    const { data, error } = await supabase.from('obra_pendencias').select('*').eq('obra_id', window.DEKA_OBRA.id).order('created_at', { ascending: false });
    if (error) throw error;
    pendencias = data || [];
  } catch (erro) { console.error('[DEKA][Registro] Erro ao carregar pendências:', erro); }
}
async function _carregarCompras() {
  try {
    const { data, error } = await supabase.from('obra_compras').select('*').eq('obra_id', window.DEKA_OBRA.id).order('data', { ascending: false });
    if (error) throw error;
    compras = data || [];
  } catch (erro) { console.error('[DEKA][Registro] Erro ao carregar compras:', erro); }
}
async function _carregarSnapshots() {
  try {
    const { data, error } = await supabase.from('obra_snapshots').select('*').eq('obra_id', window.DEKA_OBRA.id).order('semana');
    if (error) throw error;
    snapshots = data || [];
  } catch (erro) { console.error('[DEKA][Registro] Erro ao carregar snapshots:', erro); }
}

// ===================================================================================
// RENDERIZAÇÃO
// ===================================================================================
function _renderizar() {
  const abertas = pendencias.filter(p => p.status !== 'resolvida').length;
  const aComprar = compras.filter(c => c.status === 'a_comprar').length;

  container.innerHTML = `
    <style>
      .reg-container { padding: 24px; background: #fff; max-width: 1400px; margin: 0 auto; }
      .reg-titulo { font-size: 18px; font-weight: 800; color: #1A3A2A; margin-bottom: 6px; }
      .reg-sub { font-size: 13px; color: #999; margin-bottom: 24px; }
      .acordeao-item { margin-bottom: 12px; border: 1px solid #E5E5E5; border-radius: 8px; overflow: hidden; }
      .acordeao-header { padding: 16px 20px; background: #F5F5F5; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.15s; }
      .acordeao-header:hover { background: #EEEEEE; } .acordeao-header.ativo { background: #1A3A2A; color: #fff; }
      .acordeao-titulo { font-size: 14px; font-weight: 700; } .acordeao-info { font-size: 12px; color: #999; }
      .acordeao-header.ativo .acordeao-info { color: rgba(255,255,255,0.7); }
      .acordeao-icone { font-size: 12px; transition: transform 0.2s; } .acordeao-header.ativo .acordeao-icone { transform: rotate(180deg); }
      .acordeao-conteudo { display: none; padding: 20px; } .acordeao-conteudo.ativo { display: block; }
      .btn { padding: 10px 20px; border-radius: 6px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
      .btn-primario { background: #1A3A2A; color: #fff; border: none; } .btn-primario:hover { background: #142d20; }
      .btn-sec { background: transparent; color: #1A3A2A; border: 1px solid #1A3A2A; } .btn-sec:hover { background: #1A3A2A; color: #fff; }
      .grid-fotos { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 16px; }
      .foto-item { position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; border: 1px solid #E5E5E5; cursor: pointer; }
      .foto-item img { width: 100%; height: 100%; object-fit: cover; }
      .lista-pendencias { margin-top: 16px; }
      .pendencia-item { padding: 12px; background: #F5F5F5; border-left: 3px solid #DC2626; margin-bottom: 8px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center; }
      .pendencia-item.resolvida { border-color: #22C55E; opacity: 0.6; } .pendencia-info { flex: 1; }
      .pendencia-desc { font-size: 13px; font-weight: 700; color: #1A3A2A; margin-bottom: 4px; } .pendencia-meta { font-size: 11px; color: #666; }
      .lista-compras { margin-top: 16px; }
      .compra-item { padding: 12px; background: #F5F5F5; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
      .compra-info { flex: 1; } .compra-nome { font-size: 13px; font-weight: 700; color: #1A3A2A; margin-bottom: 4px; }
      .compra-meta { font-size: 11px; color: #666; }
      .compra-badge { padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
      .badge-comprado { background: #22C55E; color: #fff; } .badge-a-comprar { background: #DC2626; color: #fff; }
      .timeline { margin-top: 16px; }
      .timeline-item { padding: 12px; background: #F5F5F5; border-left: 3px solid #9A7B3A; margin-bottom: 8px; border-radius: 4px; }
      .timeline-semana { font-size: 12px; font-weight: 700; color: #1A3A2A; } .timeline-dados { font-size: 11px; color: #666; margin-top: 4px; }
    </style>

    <div class="reg-container">
      <div class="reg-titulo">REGISTRO</div>
      <div class="reg-sub">Cockpit · Fotos · Pendências · Materiais · Histórico</div>

      <div class="acordeao">
        <div class="acordeao-item">
          <div class="acordeao-header" data-secao="cockpit">
            <div>
              <div class="acordeao-titulo">Cockpit Inteligente</div>
              <div class="acordeao-info">Alertas · Planejamento · Compras · Comunicação</div>
            </div>
            <div class="acordeao-icone">▼</div>
          </div>
          <div class="acordeao-conteudo" data-conteudo="cockpit">
            <p style="font-size:13px;color:#666;margin-bottom:16px">Análise inteligente da obra via Brain.</p>
            <button class="btn btn-primario" onclick="alert('Em breve: Gerar Alertas com IA')">🧠 Gerar Alertas</button>
          </div>
        </div>
        <div class="acordeao-item">
          <div class="acordeao-header" data-secao="fotos">
            <div>
              <div class="acordeao-titulo">5 FOTOS</div>
              <div class="acordeao-info">${fotos.length} fotos · Semana ${window.DEKA_OBRA.semana || '—'}</div>
            </div>
            <div class="acordeao-icone">▼</div>
          </div>
          <div class="acordeao-conteudo" data-conteudo="fotos">
            <input type="file" id="input-foto" accept="image/*" style="display:none">
            <button class="btn btn-primario" id="btn-upload-foto">📸 Upload Foto (ImgBB)</button>
            <div class="grid-fotos" id="grid-fotos"></div>
          </div>
        </div>
        <div class="acordeao-item">
          <div class="acordeao-header" data-secao="pendencias">
            <div>
              <div class="acordeao-titulo">6 PENDÊNCIAS</div>
              <div class="acordeao-info">${abertas} abertas (${pendencias.length} total)</div>
            </div>
            <div class="acordeao-icone">▼</div>
          </div>
          <div class="acordeao-conteudo" data-conteudo="pendencias">
            <button class="btn btn-sec" onclick="alert('Em breve: Nova Pendência')">+ Nova Pendência</button>
            <div class="lista-pendencias" id="lista-pendencias"></div>
          </div>
        </div>
        <div class="acordeao-item">
          <div class="acordeao-header" data-secao="materiais">
            <div>
              <div class="acordeao-titulo">7 MATERIAIS</div>
              <div class="acordeao-info">${compras.length} itens · ${aComprar} a comprar</div>
            </div>
            <div class="acordeao-icone">▼</div>
          </div>
          <div class="acordeao-conteudo" data-conteudo="materiais">
            <button class="btn btn-sec" onclick="alert('Em breve: Novo Material')">+ Novo Material</button>
            <div class="lista-compras" id="lista-compras"></div>
          </div>
        </div>
        <div class="acordeao-item">
          <div class="acordeao-header" data-secao="historico">
            <div>
              <div class="acordeao-titulo">9 HISTÓRICO DE SEMANAS</div>
              <div class="acordeao-info">${snapshots.length} semanas registradas</div>
            </div>
            <div class="acordeao-icone">▼</div>
          </div>
          <div class="acordeao-conteudo" data-conteudo="historico">
            <div class="timeline" id="timeline-snapshots"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  _renderizarFotos();
  _renderizarPendencias();
  _renderizarCompras();
  _renderizarHistorico();
  _configurarEventos();
}

function _renderizarFotos() {
  const container = document.getElementById('grid-fotos');
  if (!container) return;

  if (fotos.length === 0) {
    container.innerHTML = '<p style="font-size:12px;color:#999;margin-top:16px">Nenhuma foto enviada.</p>';
    return;
  }

  container.innerHTML = fotos.slice(0, 12).map(f => `
    <div class="foto-item" onclick="window.open('${f.url}', '_blank')">
      <img src="${f.url}" alt="${f.descricao || 'Foto'}" loading="lazy">
    </div>
  `).join('');
}

function _renderizarPendencias() {
  const container = document.getElementById('lista-pendencias');
  if (!container) return;

  if (pendencias.length === 0) {
    container.innerHTML = '<p style="font-size:12px;color:#999;margin-top:16px">Nenhuma pendência registrada.</p>';
    return;
  }

  container.innerHTML = pendencias.map(p => `
    <div class="pendencia-item ${p.status === 'resolvida' ? 'resolvida' : ''}">
      <div class="pendencia-info">
        <div class="pendencia-desc">${_esc(p.descricao || '—')}</div>
        <div class="pendencia-meta">
          ${p.responsavel ? `Resp: ${p.responsavel}` : ''}
          ${p.prazo ? ` · Prazo: ${_fmtData(p.prazo)}` : ''}
          ${p.status === 'resolvida' ? ' · ✓ Resolvida' : ''}
        </div>
      </div>
      ${p.status !== 'resolvida' ? `<button class="btn btn-sec" onclick="window.resolverPendencia('${p.id}')" style="padding:6px 14px;font-size:11px">✓ Resolver</button>` : ''}
    </div>
  `).join('');
}

function _renderizarCompras() {
  const container = document.getElementById('lista-compras');
  if (!container) return;

  if (compras.length === 0) {
    container.innerHTML = '<p style="font-size:12px;color:#999;margin-top:16px">Nenhum material registrado.</p>';
    return;
  }

  container.innerHTML = compras.map(c => `
    <div class="compra-item">
      <div class="compra-info">
        <div class="compra-nome">${_esc(c.item || '—')}</div>
        <div class="compra-meta">
          ${c.fornecedor ? `Fornecedor: ${c.fornecedor}` : ''}
          ${c.valor ? ` · R$ ${c.valor.toFixed(2)}` : ''}
          ${c.data ? ` · ${_fmtData(c.data)}` : ''}
        </div>
      </div>
      <span class="compra-badge ${c.status === 'comprado' ? 'badge-comprado' : 'badge-a-comprar'}">${c.status === 'comprado' ? 'Comprado' : 'A Comprar'}</span>
    </div>
  `).join('');
}

function _renderizarHistorico() {
  const container = document.getElementById('timeline-snapshots');
  if (!container) return;

  if (snapshots.length === 0) {
    container.innerHTML = '<p style="font-size:12px;color:#999">Nenhum snapshot semanal.</p>';
    return;
  }

  container.innerHTML = snapshots.map(s => `
    <div class="timeline-item">
      <div class="timeline-semana">Semana ${s.semana}</div>
      <div class="timeline-dados">
        ${s.data ? _fmtData(s.data) : ''} ·
        ${s.percentual_global ? `${s.percentual_global}% concluído` : ''} ·
        ${s.num_visitas || 0} visitas
      </div>
    </div>
  `).join('');
}

// ===================================================================================
// EVENTOS + AÇÕES
// ===================================================================================
function _configurarEventos() {
  document.querySelectorAll('.acordeao-header').forEach(header => {
    header.addEventListener('click', () => {
      const secao = header.dataset.secao;
      const conteudo = document.querySelector(`[data-conteudo="${secao}"]`);

      const jaAberta = header.classList.contains('ativo');

      document.querySelectorAll('.acordeao-header').forEach(h => h.classList.remove('ativo'));
      document.querySelectorAll('.acordeao-conteudo').forEach(c => c.classList.remove('ativo'));

      if (!jaAberta) {
        header.classList.add('ativo');
        conteudo.classList.add('ativo');
        secaoAberta = secao;
      } else {
        secaoAberta = null;
      }
    });
  });

  document.getElementById('btn-upload-foto')?.addEventListener('click', () => {
    document.getElementById('input-foto').click();
  });

  document.getElementById('input-foto')?.addEventListener('change', async (e) => {
    const arquivo = e.target.files[0];
    if (arquivo) await _uploadFoto(arquivo);
  });
}

window.resolverPendencia = async function(id) {
  try {
    const { error } = await supabase
      .from('obra_pendencias')
      .update({ status: 'resolvida', resolvida_em: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    showToast('Pendência resolvida!', 'success');
    await _carregarPendencias();
    _renderizarPendencias();

  } catch (erro) {
    console.error('[DEKA][Registro] Erro ao resolver pendência:', erro);
    showToast('Erro: ' + erro.message, 'error');
  }
};

async function _uploadFoto(arquivo) {
  const formData = new FormData();
  formData.append('image', arquivo);

  try {
    showToast('Enviando foto...', 'info');

    const resp = await fetch(
      'https://api.imgbb.com/1/upload?key=588ec0d66fb7cefc2ee8aea196125c53',
      { method: 'POST', body: formData }
    );

    const json = await resp.json();
    if (!json.success) throw new Error('ImgBB: ' + json.error?.message);

    const { error } = await supabase
      .from('obra_fotos')
      .insert({
        obra_id: window.DEKA_OBRA.id,
        url: json.data.url,
        descricao: '',
        data: new Date().toISOString().split('T')[0],
        semana: window.DEKA_OBRA.semana,
      });

    if (error) throw error;

    showToast('Foto enviada!', 'success');
    await _carregarFotos();
    _renderizarFotos();

  } catch (erro) {
    console.error('[DEKA][Registro] Erro ao enviar foto:', erro);
    showToast('Erro ao enviar foto: ' + erro.message, 'error');
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

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
