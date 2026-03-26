/* ═══════════════════════════════════════════════════════════
   DEKA OS — deka.js | Helpers compartilhados
   Berti Construtora LTDA | v1.0 | 26/03/2026
   ═══════════════════════════════════════════════════════════ */

'use strict'

// ── CONFIG ──────────────────────────────────────────────────
const DEKA = {
  SUPA_URL:  'https://tdylutdfzgtcfyhynenk.supabase.co',
  SUPA_KEY:  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeWx1dGRmemd0Y2Z5aHluZW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODQxMjcsImV4cCI6MjA4ODg2MDEyN30.k44CAV8O8AGhq4lzy-Ms5CF6JsW2fgMqLEegKb4K-pg',
  CF_URL:    'https://anthropic-proxy.berti-b52.workers.dev',
  SONNET:    'claude-sonnet-4-20250514',
  HAIKU:     'claude-haiku-4-5-20251001',
  EMPRESA: {
    nome:   'Berti Construtora LTDA',
    cnpj:   '59.622.624/0001-93',
    rt:     'Jéssica Berti Martins — CAU A129520-9',
    tel:    '(41) 9183-6651'
  }
}

// ── SUPABASE ─────────────────────────────────────────────────
const _sbHeaders = () => ({
  'Content-Type': 'application/json',
  'apikey': DEKA.SUPA_KEY,
  'Authorization': `Bearer ${DEKA.SUPA_KEY}`
})

async function dbGet(table, params = {}) {
  const url = new URL(`${DEKA.SUPA_URL}/rest/v1/${table}`)
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v))
  url.searchParams.set('apikey', DEKA.SUPA_KEY)
  const ctrl = new AbortController()
  const tid = setTimeout(() => ctrl.abort(), 15000)
  try {
    const r = await fetch(url, { headers: _sbHeaders(), signal: ctrl.signal })
    clearTimeout(tid)
    if (!r.ok) throw new Error(`DB GET ${table}: ${r.status}`)
    return await r.json()
  } catch(e) {
    clearTimeout(tid)
    console.error(`[deka.js] dbGet(${table}):`, e)
    if (e.name !== 'AbortError') showToast(`Erro ao carregar ${table}`, 'rk')
    return []
  }
}

async function dbPost(table, data) {
  const ctrl = new AbortController()
  const tid = setTimeout(() => ctrl.abort(), 15000)
  try {
    const r = await fetch(`${DEKA.SUPA_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: { ...`_sbHeaders`(), 'Prefer': 'return=representation' },
      body: JSON.stringify(data),
      signal: ctrl.signal
    })
    clearTimeout(tid)
    if (!r.ok) throw new Error(`DB POST ${table}: ${r.status}`)
    return await r.json()
  } catch(e) {
    clearTimeout(tid)
    console.error(`[deka.js] dbPost(${table}):`, e)
    showToast(`Erro ao salvar em ${table}`, 'rk')
    return null
  }
}

async function dbPatch(table, filters, data) {
  const url = new URL(`${DEKA.SUPA_URL}/rest/v1/${table}`)
  Object.entries(filters).forEach(([k,v]) => url.searchParams.set(k, `eq.${v}`))
  const ctrl = new AbortController()
  const tid = setTimeout(() => ctrl.abort(), 15000)
  try {
    const r = await fetch(url, {
      method: 'PATCH',
      headers: { ..._sbHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify(data),
      signal: ctrl.signal
    })
    clearTimeout(tid)
    if (!r.ok) throw new Error(`DB PATCH ${table}: ${r.status}`)
    return true
  } catch(e) {
    clearTimeout(tid)
    console.error(`[deka.js] dbPatch(${table}):`, e)
    showToast(`Erro ao atualizar ${table}`, 'rk')
    return false
  }
}

async function dbDelete(table, filters) {
  const url = new URL(`${DEKA.SUPA_URL}/rest/v1/${table}`)
  Object.entries(filters).forEach(([k,v]) => url.searchParams.set(k, `eq.${v}`))
  const ctrl = new AbortController()
  const tid = setTimeout(() => ctrl.abort(), 15000)
  try {
    const r = await fetch(url, { method: 'DELETE', headers: _sbHeaders(), signal: ctrl.signal })
    clearTimeout(tid)
    if (!r.ok) throw new Error(`DB DELETE ${table}: ${r.status}`)
    return true
  } catch(e) {
    clearTimeout(tid)
    console.error(`[deka.js] dbDelete(${table}):`, e)
    showToast(`Erro ao remover de ${table}`, 'rk')
    return false
  }
}

// ── CLAUDE ───────────────────────────────────────────────────
async function claudeAsk({ prompt, system = '', model = DEKA.HAIKU, maxTokens = 1000 }) {
  const ctrl = new AbortController()
  const tid = setTimeout(() => ctrl.abort(), 30000)
  try {
    const r = await fetch(DEKA.CF_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: system || undefined,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: ctrl.signal
    })
    clearTimeout(tid)
    if (!r.ok) throw new Error(`Claude API: ${r.status}`)
    const d = await r.json()
    return d.content?.[0]?.text || ''
  } catch(e) {
    clearTimeout(tid)
    console.error('[deka.js] claudeAsk:', e)
    if (e.name === 'AbortError') showToast('IA demorou demais — tente novamente', 'at')
    else showToast('Erro ao chamar IA', 'rk')
    return null
  }
}

// ── UTILS ────────────────────────────────────────────────────
function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/^-|-$/g,'')
}

function calcPctGeral(servicos) {
  if (!servicos?.length) return 0
  const totalValor = servicos.reduce((s,v) => s + (v.valor_total || 0), 0)
  if (!totalValor) {
    const sum = servicos.reduce((s,v) => s + (v.pct_atual || 0), 0)
    return Math.round(sum / servicos.length)
  }
  const weighted = servicos.reduce((s,v) => s + (v.pct_atual||0) * (v.valor_total||0), 0)
  return Math.round(weighted / totalValor)
}

function formatCurrency(val) {
  if (val == null || val === '') return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
}

function formatDate(d) {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d + 'T12:00:00') : d
  return dt.toLocaleDateString('pt-BR')
}

function formatDateISO(d = new Date()) {
  return d.toISOString().split('T')[0]
}

function diasRestantes(dataFim) {
  if (!dataFim) return null
  const diff = new Date(dataFim + 'T12:00:00') - new Date()
  return Math.ceil(diff / 86400000)
}

function validarCampos(obj, campos) {
  const faltando = campos.filter(c => !obj[c])
  if (faltando.length) {
    showToast(`⚠ Campos faltando: ${faltando.join(', ')}`, 'at')
    return false
  }
  return true
}

function getParam(key) {
  return new URLSearchParams(location.search).get(key)
}

function isDev() {
  return new URLSearchParams(location.search).has('dev')
}

// ── TOAST ────────────────────────────────────────────────────
function showToast(msg, tipo = 'ok', duracao = 4000) {
  let container = document.getElementById('deka-toasts')
  if (!container) {
    container = document.createElement('div')
    container.id = 'deka-toasts'
    container.className = 'toast-container'
    document.body.appendChild(container)
  }
  const t = document.createElement('div')
  t.className = `toast ${tipo}`
  t.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      ${tipo==='ok' ? '<polyline points="20 6 9 17 4 12"/>' :
        tipo==='rk' ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' :
        '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'}
    </svg>
    <span>${msg}</span>
  `
  container.appendChild(t)
  setTimeout(() => t.remove(), duracao)
}

// ── MODAL ────────────────────────────────────────────────────
function showModal({ titulo, conteudo, onConfirm = null, largura = '' }) {
  let bd = document.getElementById('deka-modal-bd')
  if (!bd) {
    bd = document.createElement('div')
    bd.id = 'deka-modal-bd'
    bd.className = 'modal-backdrop'
    bd.addEventListener('click', e => { if (e.target === bd) closeModal() })
    document.body.appendChild(bd)
  }
  bd.innerHTML = `
    <div class="modal ${largura}">
      <div class="modal-header">
        <span class="modal-title">${titulo}</span>
        <button class="modal-close" onclick="closeModal()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal-body">${conteudo}</div>
      ${onConfirm ? `
      <div class="modal-footer">
        <button class="btn btn-ghost btn-sm" onclick="closeModal()">Cancelar</button>
        <button class="btn btn-primary btn-sm" id="modal-confirm-btn">Confirmar</button>
      </div>` : ''}
    </div>
  `
  if (onConfirm) document.getElementById('modal-confirm-btn').onclick = onConfirm
  requestAnimationFrame(() => bd.classList.add('open'))
}

function closeModal() {
  const bd = document.getElementById('deka-modal-bd')
  if (bd) { bd.classList.remove('open'); setTimeout(() => bd.innerHTML = '', 220) }
}

// ── LOADING STATE ────────────────────────────────────────────
function setLoading(btn, loading) {
  if (!btn) return
  if (loading) {
    btn._origText = btn.innerHTML
    btn.innerHTML = '<div class="spinner sm white"></div>'
    btn.disabled = true
  } else {
    btn.innerHTML = btn._origText || btn.innerHTML
    btn.disabled = false
  }
}

// ── SIDEBAR NAVIGATION ───────────────────────────────────────
function initSidebarNav(sections) {
  document.querySelectorAll('.sb-item[data-section]').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.dataset.section
      document.querySelectorAll('.sb-item').forEach(i => i.classList.remove('active'))
      item.classList.add('active')
      document.querySelectorAll('[data-page]').forEach(p => {
        p.style.display = p.dataset.page === target ? 'block' : 'none'
      })
      const titleEl = document.querySelector('.topbar-title')
      if (titleEl && sections[target]) titleEl.textContent = sections[target]
    })
  })
}

// ── DADOS DE DESENVOLVIMENTO ─────────────────────────────────
const DEV_OBRA = {
  obra_key: 'reforma-badida-parkshopping-barigui',
  nome: 'Reforma Badida — ParkShopping Barigui',
  cliente: 'TMK Comércio de Alimentos LTDA',
  cnpj_cliente: '20.309.703/0001-03',
  endereco: 'Av. Prof. Pedro Viriato Parigot de Souza, 600 — Loja 303',
  periodo_ini: '2026-03-09',
  periodo_fim: '2026-04-25',
  valor: null,
  taxa_adm: 0.15,
  status: 'ativa'
}

const DEV_SERVICOS = [
  { id:'1', cod:'SRV-001', categoria:'Demolições', descricao:'Demolição de alvenaria', unidade:'m²', quantidade:1, valor_unit:0, pct_atual:100, equipe_cod:'EQ-ALV-01', status:'concluido' },
  { id:'2', cod:'SRV-003', categoria:'PPCI / Incêndio', descricao:'Instalação PPCI', unidade:'vb', quantidade:1, valor_unit:0, pct_atual:100, equipe_cod:'FOR-ESP-01', status:'concluido' },
  { id:'3', cod:'SRV-009', categoria:'Ar-condicionado', descricao:'Infraestrutura de drenos AC', unidade:'vb', quantidade:1, valor_unit:0, pct_atual:90, equipe_cod:'EQ-ACO-01', status:'andamento' },
  { id:'4', cod:'SRV-010', categoria:'Elétrica', descricao:'Infraestrutura elétrica', unidade:'vb', quantidade:1, valor_unit:0, pct_atual:100, equipe_cod:'EQ-ELE-01', status:'concluido' },
  { id:'5', cod:'SRV-011', categoria:'Ar-condicionado', descricao:'Rede frigorífica', unidade:'vb', quantidade:1, valor_unit:0, pct_atual:100, equipe_cod:'EQ-ACO-01', status:'concluido' },
  { id:'6', cod:'SRV-013', categoria:'Drywall / Forro', descricao:'Fechamento de forro', unidade:'m²', quantidade:1, valor_unit:0, pct_atual:100, equipe_cod:'EQ-DRY-01', status:'concluido' },
  { id:'7', cod:'SRV-015', categoria:'Pintura', descricao:'Emassamento e preparação', unidade:'m²', quantidade:1, valor_unit:0, pct_atual:33, equipe_cod:'EQ-PIN-01', status:'andamento' },
  { id:'8', cod:'SRV-016', categoria:'Pintura', descricao:'1ª demão de pintura', unidade:'m²', quantidade:1, valor_unit:0, pct_atual:0, equipe_cod:'EQ-PIN-01', status:'a_executar' },
  { id:'9', cod:'SRV-019', categoria:'Ar-condicionado', descricao:'Instalação AC cassete', unidade:'un', quantidade:1, valor_unit:0, pct_atual:80, equipe_cod:'EQ-ACO-01', status:'andamento' },
  { id:'10', cod:'SRV-022', categoria:'Limpeza', descricao:'Limpeza pós-obra', unidade:'vb', quantidade:1, valor_unit:0, pct_atual:100, equipe_cod:'EQ-LIM-01', status:'concluido' },
]

const DEV_SNAPSHOTS = [
  { semana:1, data_snapshot:'2026-03-09', pct_geral:5,  narrativa:'Mobilização e isolamento concluídos.' },
  { semana:2, data_snapshot:'2026-03-16', pct_geral:20, narrativa:'Demolições, PPCI e infraestrutura AC.' },
  { semana:3, data_snapshot:'2026-03-26', pct_geral:31, narrativa:'Elétrica, forro e sistema de refrigeração.' },
]

const DEV_PENDENCIAS = [
  { id:'p1', titulo:'Condensação na tubulação de drenagem AC', tipo:'outro', prioridade:'alta', status:'aberto', responsavel:'EQ-ACO-01', prazo:'2026-03-27' },
  { id:'p2', titulo:'1ª demão de pintura não iniciada', tipo:'mao_de_obra', prioridade:'media', status:'aberto', responsavel:'EQ-PIN-01', prazo:'2026-04-02' },
  { id:'p3', titulo:'Início do canteiro Salão 2', tipo:'outro', prioridade:'media', status:'aberto', responsavel:'EQ-ALV-01', prazo:'2026-04-02' },
]
