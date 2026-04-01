# DEKA OS — Claude Code Configuration
Berti Construtora LTDA · Sistema Operacional v4.0 — Unificado

---

## Leitura obrigatória antes de qualquer execução

Leia estes arquivos NESTA ORDEM antes de escrever qualquer linha de código:

1. **`MASTER.md`** — visão, estratégia, decisões travadas, fluxos, glossário (v4.0 — única fonte de verdade)
2. **`ARCHITECTURE.md`** — schema real do Supabase + padrões de código
3. **`AGENTS.md`** — agentes de IA, prompts, workflows N8N
4. **`SKILL.md`** — regras absolutas de desenvolvimento (tolerância zero)

---

## Contexto do sistema

**Empresa:** Berti Construtora LTDA — reformas residenciais e comerciais médio-alto padrão
**Gestor:** Evandro Luiz Duarte (TDAH e ansiedade — sistema deve ser autônomo e transparente)
**Princípio:** "O gestor aprova, não executa. Tudo que pode ser automatizado DEVE ser."

**Stack:**
- Frontend: HTML + CSS + JS modular (GitHub Pages)
- Backend: Supabase `tdylutdfzgtcfyhynenk`
- IA: Claude via Cloudflare Worker `anthropic-proxy.berti-b52.workers.dev`
- Token: sempre do `localStorage.getItem('mdo_worker_token')` — NUNCA hardcoded

---

## Arquitetura de Modularização — DECISÃO CRÍTICA v4.0

> ⚠️ **Aprendizado da prática:** Cockpit cresceu para 19.800 linhas.
> Debug impossível. Claude Code perdia contexto. Edições quebravam seções não relacionadas.
> **Solução definitiva:** modularização estrita com lazy loading.

### Limites rígidos de tamanho

| Tipo de arquivo | Limite | O que fazer se ultrapassar |
|---|---|---|
| Módulos JS em `assets/modulos/` | **400 linhas** | Dividir em submódulos antes de continuar |
| HTML/JS gerais | **3.000 linhas** | Extrair para `assets/modulos/` |
| `obra.html` (exceção única) | **5.000 linhas** | Contém 9 tabs — única exceção documentada |
| `deka.js` (núcleo global) | **1.500 linhas** | Extrair utilitários para módulos |

### Lazy Loading — obrigatório

Cada tab do Mestre de Obra carrega seu módulo JS **apenas quando ativada**.

```javascript
// ✅ PADRÃO OBRIGATÓRIO
async function carregarModulo(nomeTab) {
  if (modulosCarregados.has(nomeTab)) return;
  const script = document.createElement('script');
  script.type = 'module';
  script.src = `./assets/modulos/mod-${nomeTab}.js`;
  document.head.appendChild(script);
  modulosCarregados.add(nomeTab);
}

// ❌ PROIBIDO — carregar tudo na inicialização
import './assets/modulos/mod-visita.js';
import './assets/modulos/mod-orcamento.js';
```

---

## Mapa de arquivos

### Core do sistema
| Arquivo | Função |
|---|---|
| `deka.js` | Núcleo: Supabase, Claude, cache, toast (máx 1.500 linhas) |
| `cloudflare-worker.js` | Proxy de IA — deploy via wrangler |

### Telas principais
| Arquivo | Função |
|---|---|
| `hub.html / hub.js` | Tela inicial — lista de obras |
| `obra.html` | Shell com topbar + 9 tabs (máx 5.000 linhas) |
| `relatorios.html / relatorios.js` | Geração de relatórios |
| `relatorio-pdf.html` | Template PDF standalone — Padrão Berti |
| `brain.html / brain.js` | JARVIS + briefing semanal |
| `comercial.html / comercial.js` | Leads + propostas + WhatsApp |

### Módulos do Mestre de Obra (assets/modulos/)

Carregados sob demanda — máx 400 linhas cada:

| # | Módulo | Função |
|---|---|---|
| 1 | `mod-obra.js` | Dados gerais, cliente, KPIs, financeiro |
| 2 | `mod-visita.js` | Programação do dia, navegador semanal, áudio |
| 3 | `mod-orcamento.js` | Tabela editável, KPIs, Sync Planilha, PDF |
| 4 | `mod-cronograma.js` | Gantt completo, filtros, cores por equipe |
| 5 | `mod-equipes.js` | Grid presença, cards com PIX e contato |
| 6 | `mod-pagamentos.js` | Entradas/saídas, filtros, Importar IA |
| 7 | `mod-registro.js` | Fotos, pendências, materiais, notas, histórico |
| 8 | `mod-fechamento.js` | Fechamento de obra e acerto final |
| 9 | `mod-assistente.js` | Chat IA com contexto completo da obra |

---

## Regras críticas (resumo — detalhes em SKILL.md)

- **1 arquivo por sessão** — nunca editar dois arquivos simultaneamente
- **Arquivo completo** — nunca entregar patches ou trechos soltos
- **Token do localStorage** — `localStorage.getItem('mdo_worker_token')`
- **Zero try/catch silenciosos** — todo catch: console.error + showToast
- **Zero DOMContentLoaded duplicados** — apenas em deka.js
- **Limites de tamanho:** 400 linhas (módulos) | 3.000 (gerais) | 5.000 (obra.html)
- **Supabase é a única fonte da verdade** — localStorage só para cache com TTL
- **Prefixo de cache obrigatório:** `deka_cache_v2_`
- **Todo fetch:** usar `fetchComTimeout` com AbortController 15s

---

## Arquitetura Central — obra_id

> ⚠️ **DECISÃO IMUTÁVEL**
> A `obra` é a entidade central. Todos os módulos referenciam o mesmo `obra_id`.

### Funções canônicas — nunca reescrever ou duplicar

```javascript
calcPctGeral()           // Progresso geral da obra — instância única
_prepararPayloadSync()   // Toda gravação no Supabase passa por aqui
sanitizeState()          // Toda entrada de dados passa por sanitização
cacheGet() / cacheSet()  // Cache versionado — prefixo deka_cache_v2_
fetchComTimeout()        // Todo fetch com AbortController 15s
chamarClaude()           // Toda IA passa pelo Worker
showToast()              // Toda notificação ao gestor
```

---

## Estado do projeto (01/04/2026)

### Concluído v4.0
- `MASTER.md v4.0` — documento unificado (única fonte de verdade)
- `ARCHITECTURE.md` — schema real do Supabase
- `deka.js` — núcleo corrigido (token do localStorage)
- `hub.html + hub.js` — reconstrução completa
- `obra.html + obra.js` — Padrão Berti visual aprovado, 4 tabs, 42 campos

### Próxima sessão
**Sessão 5:** Modularização do Mestre de Obra
- Criar estrutura `assets/modulos/`
- Dividir `obra.html` em 9 módulos independentes
- Implementar lazy loading por tab
- Garantir limite de 400 linhas por módulo

---

## Smoke test padrão (rodar antes de todo commit)

```bash
# Limites de tamanho
wc -l [arquivo]                                  # Verificar contra limites

# Módulos em assets/modulos/
wc -l assets/modulos/mod-*.js                    # Cada um < 400 linhas

# Qualidade de código
grep -c "DOMContentLoaded" [arquivo]             # 0 em JS, 0 em HTML (só deka.js)
grep -c "mdo_worker_token" [arquivo]             # >= 1 (se usa token)
grep -iE "deka2025|hardcoded" [arquivo]          # 0
grep -c "console.error" [arquivo]                # >= número de blocos catch

# Modularização
grep -c "import.*mod-.*js" [arquivo]             # Verificar imports dinâmicos
```

---

## Fluxo de navegação v4.0

```
hub.html          ← lista todas as obras
    ↓ clica em uma obra
obra.html         ← shell com topbar + 9 tabs (máx 5.000 linhas)
    ↓ ativa tab
assets/modulos/   ← módulo JS carregado sob demanda (máx 400 linhas)
```

### Topbar da obra (sempre visível)

```
← HUB  ◄ Obras  Mestre.  [Nome da Obra]  Semana N · período  47%  18:22
```
