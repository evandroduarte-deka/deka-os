/**
 * EVIS — deka.js
 * Núcleo do sistema. Importado por todos os módulos.
 *
 * EXPORTS:
 *   supabase          Cliente Supabase
 *   fetchComTimeout   Fetch com AbortController (15s)
 *   cacheGet          Lê cache localStorage versionado
 *   cacheSet          Grava cache com TTL
 *   showToast         Notificação visual
 *   chamarClaude      Chama IA via Cloudflare Worker
 *   extrairJSON       Extrai JSON de resposta mista
 *   formatarMoedaBR   Formata R$ brasileiro
 *   formatarDataBR    Formata data dd/mm/aaaa
 *
 * REGRAS ABSOLUTAS:
 *   - Zero chaves hardcoded — token via localStorage
 *   - Zero catch silenciosos — todo catch: console.error + showToast
 *   - Zero DOMContentLoaded aqui — init() chamado pelo HTML
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// =============================================================================
// CONFIGURAÇÃO — lida de window.EVIS_CONFIG (definido no HTML antes do import)
// =============================================================================

const CACHE_PREFIX  = 'evis_cache_v1_';
const WORKER_URL    = 'https://anthropic-proxy.berti-b52.workers.dev';
const MODELO_IA     = 'claude-sonnet-4-20250514';

function lerConfig() {
  const cfg = window.EVIS_CONFIG;
  if (!cfg?.supabaseUrl || !cfg?.supabaseAnonKey) {
    console.error('[EVIS] window.EVIS_CONFIG ausente ou inválido.');
    throw new Error('EVIS_CONFIG não definido. Configure no HTML antes de importar deka.js.');
  }
  return cfg;
}

const cfg = lerConfig();

// =============================================================================
// SUPABASE
// =============================================================================

export const supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);

// Teste de conexão (não bloqueia inicialização)
supabase.from('evis_obras').select('id').limit(1)
  .then(() => console.log('[EVIS] ✅ Supabase conectado.'))
  .catch(e => console.warn('[EVIS] ⚠️ Supabase:', e.message));

// =============================================================================
// FETCH COM TIMEOUT
// =============================================================================

export async function fetchComTimeout(url, opcoes = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...opcoes, signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp;
  } catch (erro) {
    clearTimeout(timer);
    if (erro.name === 'AbortError') throw new Error('Timeout: sem resposta em ' + timeoutMs / 1000 + 's');
    throw erro;
  }
}

// =============================================================================
// CACHE VERSIONADO (localStorage com TTL)
// =============================================================================

export function cacheSet(chave, valor, ttlMinutos = 10) {
  try {
    localStorage.setItem(CACHE_PREFIX + chave, JSON.stringify({
      v: valor,
      e: Date.now() + ttlMinutos * 60 * 1000,
    }));
  } catch (e) {
    console.warn('[EVIS] Cache não gravado (localStorage cheio?):', e.message);
  }
}

export function cacheGet(chave) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + chave);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() > entry.e) {
      localStorage.removeItem(CACHE_PREFIX + chave);
      return null;
    }
    return entry.v;
  } catch {
    return null;
  }
}

// =============================================================================
// TOAST — notificação visual
// =============================================================================

export function showToast(mensagem, tipo = 'info') {
  // Garante container
  let container = document.getElementById('evis-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'evis-toast-container';
    container.style.cssText = [
      'position:fixed', 'bottom:24px', 'right:24px',
      'z-index:9999', 'display:flex', 'flex-direction:column',
      'gap:8px', 'pointer-events:none',
    ].join(';');
    document.body.appendChild(container);
  }

  const cores = {
    success: { bg: '#1A3A2A', borda: '#22C55E', texto: '#fff' },
    error:   { bg: '#7f1d1d', borda: '#DC2626', texto: '#fff' },
    warning: { bg: '#78350f', borda: '#9A7B3A', texto: '#fff' },
    info:    { bg: '#1A3A2A', borda: '#9A7B3A', texto: '#fff' },
  };
  const c = cores[tipo] || cores.info;

  const toast = document.createElement('div');
  toast.style.cssText = [
    `background:${c.bg}`,
    `border-left:3px solid ${c.borda}`,
    `color:${c.texto}`,
    'padding:12px 16px',
    'border-radius:6px',
    'font-family:Barlow Condensed,sans-serif',
    'font-size:14px',
    'font-weight:600',
    'max-width:320px',
    'pointer-events:auto',
    'box-shadow:0 4px 12px rgba(0,0,0,0.3)',
    'opacity:0',
    'transition:opacity 0.2s',
  ].join(';');
  toast.textContent = mensagem;
  container.appendChild(toast);

  requestAnimationFrame(() => { toast.style.opacity = '1'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 4000);
}

// =============================================================================
// CHAMAR CLAUDE (via Cloudflare Worker)
// =============================================================================

export async function chamarClaude(mensagens, sistemaPrompt = '', timeoutMs = 45000) {
  const token = localStorage.getItem('mdo_worker_token') ?? cfg.token ?? '';
  if (!token) {
    showToast('Token de IA não configurado.', 'warning');
    throw new Error('Token ausente. Configure mdo_worker_token no localStorage.');
  }

  const resp = await fetchComTimeout(
    WORKER_URL + '/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Deka-Token': token,
      },
      body: JSON.stringify({
        model:      MODELO_IA,
        max_tokens: 2048,
        system:     sistemaPrompt,
        messages:   mensagens,
      }),
    },
    timeoutMs
  );

  const data = await resp.json();
  return data?.content?.[0]?.text ?? '';
}

// =============================================================================
// EXTRAIR JSON de resposta mista do Claude
// =============================================================================

export function extrairJSON(texto) {
  try {
    const limpo = texto.replace(/```json|```/g, '').trim();
    return JSON.parse(limpo);
  } catch {
    const match = texto.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { return null; }
    }
    return null;
  }
}

// =============================================================================
// FORMATADORES
// =============================================================================

export function formatarMoedaBR(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
  }).format(valor ?? 0);
}

export function formatarDataBR(dataStr) {
  if (!dataStr) return '—';
  const d = new Date(dataStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR');
}
