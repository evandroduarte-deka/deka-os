# DEKA OS — ARQUITETURA COMPLETA v2.0
## Documento de Referência para Claude Code | CLAUDE.md
### Berti Construtora LTDA | 26/03/2026
### ⚠ Este documento substitui completamente a v1.0

---

## ⛔ O QUE NÃO FAZER — LEIA PRIMEIRO

> Estas regras estão no topo porque o projeto anterior quebrou exatamente por ignorá-las.

| ❌ Proibido | ✅ Correto |
|---|---|
| Arquivo HTML com mais de 1.500 linhas | Cada módulo é um arquivo JS separado, carregado sob demanda |
| Múltiplos `DOMContentLoaded` no mesmo arquivo | Um único ponto de inicialização por arquivo |
| `try/catch` silencioso | Sempre `console.error` + `showToast` |
| `localStorage` como fonte de verdade | Supabase é a fonte. localStorage é cache versionado |
| Dados mock misturados com produção | `?dev=true` ativa dados de teste |
| Editar 2 arquivos no mesmo chat Claude Code | 1 arquivo por sessão |
| Nomes de tabela diferentes entre módulos | Definidos aqui, imutáveis |
| `fetch` sem timeout | `AbortController` com 15s em todo fetch |
| Crescer antes de estabilizar | Smoke test obrigatório antes de avançar o sprint |
| Construir sem definir spec | Nenhum agente ou fluxo é implementado sem spec aqui |

---

## 1. VISÃO DO SISTEMA

DEKA OS é o sistema operacional completo da Berti Construtora. Um único acesso web cobre toda a jornada — da captação de leads até a entrega da obra.

**URL base:** `evandroduarte-deka.github.io/deka-os`
**Repositório:** `github.com/evandroduarte-deka/deka-os` ← novo, limpo
**Deploy:** GitHub Pages (push automático via Actions)
**Backend:** Supabase (PostgreSQL + REST)
**Proxy IA:** Cloudflare Worker `anthropic-proxy.berti-b52.workers.dev`

---

## 2. ESTRUTURA DE ARQUIVOS

```
deka-os/
├── index.html              ← Hub central (seletor de obras + visão macro)
├── comercial.html          ← Pipeline comercial e leads
├── obra.html               ← Shell da obra (rota via ?obra=slug)
├── cliente.html            ← Portal público (rota via ?obra=slug&t=TOKEN)
├── brain.html              ← Central de comando JARVIS
├── assets/
│   ├── deka.css            ← Design system unificado (tokens CSS)
│   ├── deka.js             ← Helpers compartilhados
│   └── modulos/            ← Módulos lazy-loaded por obra.html
│       ├── dashboard.js
│       ├── campo.js
│       ├── orcamento.js
│       ├── cronograma.js
│       ├── financeiro.js
│       ├── equipes.js
│       ├── fotos.js
│       ├── pendencias.js
│       └── relatorios.js
└── CLAUDE.md               ← Este documento
```

### 2.1 Regra de tamanho — lei absoluta

```
obra.html:          máx 300 linhas  (shell + nav + init)
cada modulo/*.js:   máx 400 linhas  (lógica + render de uma aba)
deka.css:           máx 500 linhas
deka.js:            máx 400 linhas
index.html:         máx 600 linhas
comercial.html:     máx 800 linhas
```

**Como obra.html funciona:**
```javascript
// obra.html carrega módulos apenas quando a aba é acessada
async function switchTab(section) {
  if (!modulosCarregados[section]) {
    await loadScript(`assets/modulos/${section}.js`)
    modulosCarregados[section] = true
  }
  renderizarAba(section)
}
```

---

## 3. SEGURANÇA

### 3.1 Portal do cliente — Token UUID por obra

**Decisão:** Token UUID na URL, validado no Supabase.

O `obra_key` (slug legível) NUNCA é suficiente para acesso ao portal cliente. Todo link de cliente inclui um token UUID gerado uma vez por obra.

**Fluxo:**
```
Gestor gera link → sistema cria token UUID → salva em obras.token_cliente
Link enviado: cliente.html?obra=reforma-badida&t=a3f9c2d1-...
Cliente acessa → sistema valida token contra obras.token_cliente
Token inválido → página 403 sem expor nenhum dado
```

**Coluna adicional na tabela `obras`:**
```sql
token_cliente  uuid DEFAULT gen_random_uuid()
```

**Validação no frontend:**
```javascript
// cliente.html — primeira coisa que roda
async function validarAcesso() {
  const token = getParam('t')
  const obraKey = getParam('obra')
  if (!token || !obraKey) return bloquear()

  const obras = await dbGet('obras', {
    'obra_key': `eq.${obraKey}`,
    'token_cliente': `eq.${token}`,
    'select': 'obra_key'
  })
  if (!obras.length) return bloquear()
}

function bloquear() {
  document.body.innerHTML = '<div style="...">Acesso não autorizado.</div>'
  throw new Error('Acesso bloqueado')
}
```

### 3.2 Cloudflare Worker — autenticação por header secreto

**Problema:** O proxy está acessível publicamente, qualquer um pode usar a chave Anthropic.

**Solução:** Header `X-Deka-Token` validado no Worker antes de repassar.

**No Worker (pseudocódigo):**
```javascript
// anthropic-proxy.berti-b52.workers.dev
export default {
  async fetch(request, env) {
    const token = request.headers.get('X-Deka-Token')
    if (token !== env.DEKA_SECRET_TOKEN) {
      return new Response('Unauthorized', { status: 401 })
    }
    // ... repassar para Anthropic API
  }
}
```

**`DEKA_SECRET_TOKEN`** é uma variável de ambiente no painel do Cloudflare. Nunca exposta no frontend.

**No `deka.js`:**
```javascript
const DEKA_WORKER_TOKEN = '...' // string aleatória de 32 chars — definida antes do Sprint 1A
// Toda chamada ao Worker inclui:
headers: { 'X-Deka-Token': DEKA_WORKER_TOKEN, 'Content-Type': 'application/json' }
```

> ⚠ Antes de abrir o Claude Code: gerar o token, configurar no Worker, atualizar `deka.js`.

### 3.3 O que cliente.html NUNCA expõe

Validado no smoke test de cada sprint:

```
- Códigos internos SRV-, EQ-, FOR-
- Presença de equipes e dias trabalhados
- Valores de custo operacional e margens
- Pendências internas
- Dados do Supabase além de: obras (filtrado), obra_servicos (sem valor_unit), obra_fotos, obra_snapshots
```

---

## 4. MODELOS DE IA — STRINGS CORRETAS

```javascript
// deka.js — valores atuais e válidos
const DEKA = {
  SONNET: 'claude-sonnet-4-6',           // análise profunda, relatórios, campo
  HAIKU:  'claude-haiku-4-5-20251001',   // triagem, classificação, respostas rápidas
}
```

> Verificar em `https://docs.anthropic.com/en/docs/models-overview` antes do primeiro deploy.

---

## 5. TRANSCRIÇÃO DE ÁUDIO — DECISÃO

**Provider:** OpenAI Whisper via Cloudflare Worker (mesmo proxy do Claude)

**Racional:** Sem expor key no frontend. Mesmo proxy já existente. Custo ~$0.006/min.

**Fluxo:**
```
Frontend grava áudio (MediaRecorder API)
→ envia blob para CF Worker com X-Deka-Token
→ Worker repassa para OpenAI Whisper API
→ retorna texto transcrito
→ Frontend passa texto para Claude processar
```

**Custo estimado por visita:**
- Áudio médio: 3-5 min → ~$0.02-0.03
- Claude Sonnet (processamento): ~$0.05
- Total por visita: ~$0.08

**Endpoint no Worker:**
```
POST /transcribe
Body: FormData com campo 'audio' (blob webm/mp4)
Header: X-Deka-Token: ...
Response: { text: "transcrição aqui" }
```

**Fallback:** Se Worker falhar → input de texto manual. Nunca bloquear a operação.

---

## 6. BANCO DE DADOS — SUPABASE

**URL:** `https://tdylutdfzgtcfyhynenk.supabase.co`
**Anon Key:** no `.env` e no `deka.js`

### 6.1 Tabela `obras`

```sql
CREATE TABLE obras (
  obra_key       text PRIMARY KEY,
  nome           text NOT NULL,
  cliente        text,
  cnpj_cliente   text,
  endereco       text,
  periodo_ini    date,
  periodo_fim    date,
  valor          numeric,
  taxa_adm       numeric DEFAULT 0.15,
  status         text DEFAULT 'ativa',
  token_cliente  uuid DEFAULT gen_random_uuid(),  -- ← SEGURANÇA
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);
```

### 6.2 Tabela `obra_servicos`

```sql
CREATE TABLE obra_servicos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_key    text REFERENCES obras(obra_key) ON DELETE CASCADE,
  cod         text,
  categoria   text,
  descricao   text NOT NULL,
  unidade     text DEFAULT 'vb',
  quantidade  numeric DEFAULT 1,
  valor_unit  numeric DEFAULT 0,
  pct_atual   numeric DEFAULT 0 CHECK (pct_atual BETWEEN 0 AND 100),
  equipe_cod  text,
  data_ini    date,
  data_fim    date,
  status      text DEFAULT 'a_executar',
  created_at  timestamptz DEFAULT now()
);
```

### 6.3 Tabela `obra_snapshots`

```sql
CREATE TABLE obra_snapshots (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_key      text REFERENCES obras(obra_key) ON DELETE CASCADE,
  semana        integer NOT NULL,
  data_snapshot date NOT NULL,
  pct_geral     numeric,
  narrativa     text,
  dados_json    jsonb,
  created_at    timestamptz DEFAULT now()
);
```

### 6.4 Tabela `obra_pendencias`

```sql
CREATE TABLE obra_pendencias (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_key    text REFERENCES obras(obra_key) ON DELETE CASCADE,
  titulo      text NOT NULL,
  descricao   text,
  tipo        text DEFAULT 'outro',
  prioridade  text DEFAULT 'media' CHECK (prioridade IN ('alta','media','baixa')),
  status      text DEFAULT 'aberto' CHECK (status IN ('aberto','resolvido')),
  responsavel text,
  prazo       date,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
```

### 6.5 Tabela `obra_visitas`

```sql
CREATE TABLE obra_visitas (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_key      text REFERENCES obras(obra_key) ON DELETE CASCADE,
  data_visita   date NOT NULL,
  semana        integer,
  transcricao   text,
  narrativa_ia  text,
  itens_json    jsonb,
  aprovada      boolean DEFAULT false,
  created_at    timestamptz DEFAULT now()
);
```

### 6.6 Tabela `obra_fotos`

```sql
CREATE TABLE obra_fotos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_key    text REFERENCES obras(obra_key) ON DELETE CASCADE,
  semana      integer,
  data_foto   date,
  url         text NOT NULL,
  legenda     text,
  ambiente    text,
  created_at  timestamptz DEFAULT now()
);
```

### 6.7 Tabela `obra_financeiro`

```sql
CREATE TABLE obra_financeiro (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_key    text REFERENCES obras(obra_key) ON DELETE CASCADE,
  data        date NOT NULL,
  tipo        text CHECK (tipo IN ('entrada','saida')),
  categoria   text,
  descricao   text NOT NULL,
  fornecedor  text,
  srv_cod     text,
  valor       numeric NOT NULL,
  status      text DEFAULT 'pago' CHECK (status IN ('pago','a_pagar','cancelado')),
  created_at  timestamptz DEFAULT now()
);
```

### 6.8 Tabelas existentes (manter sem alteração)

- `cockpit_obras` — legado, não tocar
- `brain_comercial` — em uso, schema definido na v1.0

### 6.9 Regras de leitura/escrita — LEI MÁXIMA

```
index.html:      obras R+W
comercial.html:  brain_comercial R+W  |  obras R
obra.html:       obra_* R+W  |  brain_comercial NUNCA
brain.html:      TUDO R  |  brain_comercial importado=true W
cliente.html:    obras R (validar token)  |  obra_servicos R  |
                 obra_fotos R  |  obra_snapshots R  |
                 obra_financeiro NUNCA  |  obra_visitas NUNCA
```

---

## 7. CACHE LOCAL — VERSIONAMENTO

**Problema da v1.0:** schema muda entre sprints → cache stale silencioso.

**Solução:**

```javascript
// deka.js
const SCHEMA_VERSION = '2.0.0'  // incrementar a cada mudança de schema

function cacheSet(key, data) {
  localStorage.setItem(key, JSON.stringify({ v: SCHEMA_VERSION, ts: Date.now(), data }))
}

function cacheGet(key, maxAgeMs = 5 * 60 * 1000) {  // 5 min padrão
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cached = JSON.parse(raw)
    if (cached.v !== SCHEMA_VERSION) { localStorage.removeItem(key); return null }
    if (Date.now() - cached.ts > maxAgeMs) return null
    return cached.data
  } catch { return null }
}

function cacheClear(prefix = '') {
  Object.keys(localStorage)
    .filter(k => k.startsWith(`deka_${prefix}`))
    .forEach(k => localStorage.removeItem(k))
}

// Ao trocar de obra, invalidar cache da obra anterior:
// cacheClear(`obra_${obraKeyAnterior}`)
```

---

## 8. AGENTES DE IA — SPECS COMPLETAS

### 8.1 JARVIS — Brain executivo

**Model:** Sonnet | **Acionado:** domingo 18h via N8N + manualmente no brain.html

```
Sistema: Você é o JARVIS, assistente executivo da Berti Construtora.
Gestor: Evandro Luiz Duarte. TDAH, depressão, ansiedade crônica.
O sistema existe para que a empresa funcione independentemente do estado do gestor.

Gere briefing executivo com:
1. Situação geral (2-3 linhas)
2. Obras ativas: nome | % | status | alerta
3. TOP 3 prioridades do dia (ação específica + por que hoje)
4. Pipeline: leads quentes, follow-ups atrasados
5. Decisão necessária (o que só o Evandro pode desbloquear)

Regras: direto, sem motivação, máx 3 prioridades, nunca inventar dados.
Se dados ausentes: dizer explicitamente.
```

### 8.2 AGT_WHATSAPP — Copiloto comercial

**Model:** Haiku (triagem) → Sonnet (resposta final) | **Acionado:** N8N ao receber mensagem

```
Sistema: Copiloto comercial da Berti Construtora. Processa fragmentos de conversa WhatsApp.
Classifique: lead|cliente_ativo|fornecedor|parceiro|admin|urgente|ignorar
Extraia: contato, empresa, assunto, urgência
Gere resposta em primeira pessoa (como se fosse o Evandro)
Máx 3 parágrafos. Tom: profissional mas próximo.

NUNCA: confirmar valor sem orçamento formal
NUNCA: confirmar prazo sem verificar agenda de obras
SEMPRE: sinalizar quando exige decisão antes de enviar

Output: JSON { classificacao, contato, empresa, resumo, resposta_sugerida, acao_brain }
```

### 8.3 AGT_COCKPIT — Processador de visita de campo

**Model:** Sonnet | **Acionado:** módulo campo.js após transcrição

```
Sistema: Processador de visitas técnicas da Berti Construtora.
Recebe: relato de visita (texto ou transcrição de áudio)
Extrai e retorna JSON:
{
  "resumo": "frase curta da visita",
  "avancos": [{ "cod": "SRV-XXX", "descricao": "...", "pct_novo": 85 }],
  "pendencias": [{ "titulo": "...", "prioridade": "alta|media|baixa", "responsavel": "..." }],
  "equipes": ["nome da equipe presente"],
  "observacoes": "observação técnica se houver"
}

Regras:
- Nunca inventar percentuais não mencionados
- Ambíguo ("quase pronto") → 90% e sinalizar
- Se input incompleto → listar o que falta
- Retornar APENAS o JSON, sem texto adicional
```

### 8.4 AGT_RELATORIO — Gerador de relatórios

**Model:** Sonnet | **Acionado:** aba Relatórios do obra.html

**Tipos de relatório e suas especificações:**

#### Relatório Semanal Cliente
```
Input: { obra, servicos[], snapshots[], pendencias_cliente[], fotos[] }
Output: HTML formatado com:
- Resumo executivo (linguagem acessível, sem jargão técnico)
- Serviços SEM código interno — apenas descrição comercial
- Status simplificado: Concluído | Em andamento | Programado
- Programado para próxima semana
- Espaço para fotos com legendas

Proibido no output:
- Códigos SRV-, EQ-, FOR-
- Valores de custo e margem
- Dados de presença de equipes
- Pendências internas não relevantes ao cliente
```

#### Medição Formal
```
Input: { obra, servicos[], periodo }
Output: tabela de serviços medidos no período + valores + totais
Inclui: subtotal, taxa ADM (%), BDI (%), total a faturar
```

#### Relatório Fotográfico
```
Input: { obra, fotos[], semana }
Output: grid de fotos com título, ambiente e data
4 fotos por linha, legenda editável antes de gerar PDF
```

#### Relatório Semanal Interno
```
Input: { obra, servicos[], equipes[], pendencias[], snapshots[], financeiro[] }
Output: documento completo com dados internos
Inclui: códigos SRV, aderência ao cronograma, taxa de avanço, presença, financeiro operacional
```

---

## 9. FLUXOS N8N — SPECS

### 9.1 Fluxo 1 — WhatsApp → Brain

```
TRIGGER: Evolution API webhook → nova mensagem recebida
  URL do webhook: [configurar no Evolution API]
  Payload: { from, message, type, timestamp }

FILTROS:
  - É de grupo? → parar
  - É do próprio número do gestor? → parar
  - type = 'audio'? → chamar Whisper antes de continuar

PASSO 1 — Enriquecer
  GET Supabase brain_comercial WHERE contato = from
  Montar contexto com histórico (últimas 5 entradas)

PASSO 2 — Classificar (Claude Haiku)
  Se urgente ou cliente_ativo → usar Sonnet no próximo passo

PASSO 3 — Gerar resposta (Claude Sonnet/Haiku)
  System: AGT_WHATSAPP

PASSO 4 — Salvar em brain_comercial
  POST Supabase brain_comercial

PASSO 5 — Notificar gestor
  Enviar para número do gestor via Evolution API:
  "📨 [contato]: [resumo]\n✅ Aprovar | ✏ Editar | ❌ Ignorar"

VARIÁVEIS:
  EVOLUTION_URL: evolution-berti.onrender.com
  EVOLUTION_KEY: berti2026
  NUMERO_GESTOR: 5541918366510
  SUPABASE_URL / SUPABASE_KEY
  CF_WORKER_URL / DEKA_WORKER_TOKEN
```

### 9.2 Fluxo 2 — Briefing semanal (JARVIS)

```
TRIGGER: Cron — domingo 18:00 BRT

PASSO 1 — Coletar dados
  GET obras WHERE status = 'ativa'
  GET brain_comercial WHERE importado = false

PASSO 2 — Gerar briefing (Claude Sonnet)
  System: JARVIS

PASSO 3 — Enviar ao gestor
  WhatsApp: "🧠 JARVIS — Semana [N]\n[primeiras 3 linhas]\nBriefing completo: [link brain.html]"

PASSO 4 — Criar snapshots automáticos
  Para cada obra ativa: POST obra_snapshots com pct_geral calculado
```

### 9.3 Tratamento de erros em fluxos N8N

```
- Qualquer etapa que falha → log no N8N + notificação WhatsApp ao gestor
- Nunca engolir erro silenciosamente
- Retry máximo: 2x com intervalo de 30s
- Se Evolution API offline: salvar em brain_comercial com flag 'falha_envio'
```

---

## 10. PLANO DE SPRINTS REVISADO

### Sprint 1A — Fundação técnica (3 dias)

```
[ ] Criar repositório deka-os no GitHub
[ ] Configurar GitHub Actions para deploy automático
[ ] Gerar DEKA_WORKER_TOKEN e configurar no Worker CF
[ ] Adicionar autenticação X-Deka-Token no Worker
[ ] Adicionar endpoint /transcribe no Worker (Whisper)
[ ] Criar deka.css com design system completo
[ ] Criar deka.js com helpers + cache versionado
[ ] Criar 6 tabelas novas no Supabase (script SQL)
[ ] Adicionar token_cliente na tabela obras
[ ] Criar pasta assets/modulos/ vazia
```

**Smoke Test 1A:**
- [ ] Worker retorna 401 sem token
- [ ] Worker retorna 200 com token correto
- [ ] 6 tabelas existem no Supabase com colunas corretas
- [ ] deka.js carrega sem erros no console
- [ ] cacheGet/cacheSet funcionam com versionamento

### Sprint 1B — Hub de obras (4 dias)

```
[ ] index.html com grid de obras real (lê tabela obras)
[ ] Modal de nova obra funcional (POST em obras)
[ ] Navegação para obra.html?obra={slug}
[ ] obra.html shell com sidebar + topbar + lazy-load
[ ] dashboard.js — KPIs + gráfico + pendências + timeline
[ ] Dados da obra Badida migrados para tabela obras
[ ] Dados dos serviços Badida migrados para obra_servicos
```

**Smoke Test 1B:**
- [ ] index.html carrega obras do Supabase corretamente
- [ ] Nova obra criada aparece no grid
- [ ] obra.html?obra=reforma-badida carrega sem erro
- [ ] dashboard.js renderiza KPIs com dados reais
- [ ] Trocar de obra invalida cache corretamente

### Sprint 2 — Campo (5 dias)

```
[ ] campo.js — gravação áudio completa
[ ] Integração Whisper via CF Worker
[ ] Claude Sonnet processa transcrição → JSON
[ ] Modal de aprovação com proposta editável
[ ] POST em obra_visitas + PATCH em obra_servicos
[ ] Fallback: input de texto se áudio falhar
[ ] Histórico de visitas na sidebar
```

**Smoke Test 2:**
- [ ] Gravar áudio 30s → transcrição retorna em <10s
- [ ] IA processa texto livre → JSON válido
- [ ] Aprovar visita → obra_servicos atualizado no Supabase
- [ ] Dashboard atualiza % após aprovação
- [ ] Fallback de texto funciona sem microfone

### Sprint 3 — Comercial (5 dias)

```
[ ] comercial.html com kanban 5 colunas
[ ] Input de conversa + painel AGT_WHATSAPP
[ ] POST em brain_comercial
[ ] Conectar WhatsApp via QR na Evolution API
[ ] Criar Fluxo 1 no N8N (básico sem aprovação)
[ ] Validar: mensagem chega → salva → notifica
```

**Smoke Test 3:**
- [ ] Colar conversa → IA classifica + gera resposta em <5s
- [ ] Entrada salva em brain_comercial com campos corretos
- [ ] Evolution API conectada (QR lido)
- [ ] N8N: mensagem WhatsApp → entrada no Supabase

### Sprint 4 — Brain + Multi-obras (4 dias)

```
[ ] brain.html com JARVIS + matrix + pipeline
[ ] Briefing automático via N8N (Fluxo 2)
[ ] index.html com visão macro e KPIs consolidados
[ ] cliente.html com validação de token UUID
```

**Smoke Test 4:**
- [ ] brain.html gera briefing com dados reais
- [ ] N8N dispara briefing no horário correto
- [ ] cliente.html sem token → bloqueio imediato
- [ ] cliente.html com token inválido → bloqueio
- [ ] cliente.html com token válido → dados corretos sem dados internos

### Sprint 5 — Financeiro + Relatórios (5 dias)

```
[ ] financeiro.js completo com lançamentos
[ ] Controle de medições
[ ] relatorios.js com AGT_RELATORIO
[ ] Geração de HTML imprimível para cada tipo
[ ] Export PDF via window.print()
```

**Smoke Test 5:**
- [ ] Lançamento financeiro salva e aparece no dashboard
- [ ] Relatório semanal cliente não contém SRV- no DOM
- [ ] PDF gerado com layout correto

---

## 11. SMOKE TEST PADRÃO — CHECKLIST

Executar ao final de cada sprint antes de avançar:

```markdown
## Checklist Sprint [N]
- [ ] Todas as rotas carregam sem erro no console (F12)
- [ ] CRUD básico na tabela principal do sprint funciona (criar, ler, atualizar)
- [ ] Claude responde em <5s na ação principal
- [ ] localStorage invalida corretamente ao trocar de obra
- [ ] Nenhuma chamada ao Worker sem X-Deka-Token
- [ ] cliente.html: inspecionar DOM e confirmar ausência de SRV-, EQ-, FOR-
- [ ] cliente.html: token inválido → bloqueio imediato sem dados
- [ ] Tamanho de cada arquivo dentro do limite (wc -l)
- [ ] ?dev=true funciona sem chamar Supabase
- [ ] Nenhum catch silencioso (buscar por "catch(e) {}" no código)
```

---

## 12. DESIGN SYSTEM

### Variáveis CSS (deka.css)

```css
:root {
  --azul:     #0D1F3C;   /* dominante */
  --azul-m:   #162B52;
  --azul-l:   #1E3A6E;
  --d:        #9A7B3A;   /* dourado queimado */
  --d2:       #C8A86A;   /* dourado claro */
  --d-bg:     #F7F2E8;
  --c1:       #F5F4F2;   /* bg página */
  --c2:       #E3E1DC;   /* bordas */
  --c4:       #8A8880;   /* labels */
  --c7:       #2A2926;   /* corpo */
  --bk:       #14120F;   /* títulos */
  --w:        #FEFDFB;   /* cards */
  --ok:       #1A6B42;   --ok-bg: #E8F5EE;
  --at:       #8A5E16;   --at-bg: #FBF0E0;
  --rk:       #8B2020;   --rk-bg: #FDEAEA;
  --sidebar-w: 240px;
  --hdr-h:     60px;
}
```

### Tipografia

```
Títulos / labels:  Barlow Condensed  (condensada, técnica, sem serifa)
Corpo:             Barlow            (legível, peso 300-600)
Números / códigos: IBM Plex Mono     (monoespacada, precisa)
```

---

## 13. EMPRESA E CONTATOS

```
Berti Construtora LTDA
CNPJ: 59.622.624/0001-93
Resp. Técnica: Jéssica Berti Martins — CAU A129520-9
Tel: (41) 9183-6651
Gestor: Evandro Luiz Duarte

Supabase: tdylutdfzgtcfyhynenk.supabase.co
Evolution API: evolution-berti.onrender.com | Key: berti2026
N8N: primary-production-8754e.up.railway.app
CF Worker: anthropic-proxy.berti-b52.workers.dev
```

---

*DEKA OS — Arquitetura v2.0 | 26/03/2026*
*Substituição total da v1.0. Toda decisão técnica validada contra este documento.*
*Próxima atualização: após Smoke Test do Sprint 1A.*
