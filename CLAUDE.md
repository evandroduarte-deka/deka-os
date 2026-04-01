# DEKA OS — Claude Code Configuration
Berti Construtora LTDA · Sistema Operacional v3.1

---

## Leitura obrigatória antes de qualquer execução

Leia estes arquivos NESTA ORDEM antes de escrever qualquer linha de código:

1. **`MASTER.md`** — visão, estratégia, decisões travadas, fluxos, glossário
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

## Mapa de arquivos

| Arquivo | Função |
|---|---|
| `hub.html / hub.js` | Tela inicial — lista de obras |
| `obra.html / obra.js` | Dashboard + edição completa de obra |
| `cockpit.html / cockpit.js` | Gravação de visitas + Whisper + AGT_COCKPIT |
| `relatorios.html / relatorios.js` | Geração de relatórios |
| `relatorio-pdf.html` | Template PDF standalone — Padrão Berti |
| `brain.html / brain.js` | JARVIS + briefing semanal |
| `comercial.html / comercial.js` | Leads + propostas + WhatsApp |
| `deka.js` | Núcleo: Supabase, Claude, cache, toast |
| `cloudflare-worker.js` | Proxy de IA — deploy via wrangler |

---

## Regras críticas (resumo — detalhes em SKILL.md)

- **1 arquivo por sessão** — nunca editar dois arquivos simultaneamente
- **Arquivo completo** — nunca entregar patches ou trechos soltos
- **Token do localStorage** — `localStorage.getItem('mdo_worker_token')`
- **Zero try/catch silenciosos** — todo catch: console.error + showToast
- **Zero DOMContentLoaded duplicados** — apenas em deka.js
- **Máximo 3.000 linhas** por arquivo HTML ou JS
- **Supabase é a única fonte da verdade** — localStorage só para cache com TTL
- **Prefixo de cache obrigatório:** `deka_cache_v2_`
- **Todo fetch:** usar `fetchComTimeout` com AbortController 15s

---

## Estado do projeto (01/04/2026)

### Concluído
- `MASTER.md` — constituição do sistema
- `ARCHITECTURE.md` — schema real do Supabase
- `deka.js` — núcleo corrigido (token do localStorage)
- `hub.html + hub.js` — reconstrução completa

### Próxima sessão
**Sessão 4:** `obra.html + obra.js`
Dashboard da obra com 4 tabs (Visão Geral, Serviços, Cronograma, Configurações)
+ formulário de edição com todos os 42 campos da tabela `obras`
+ Gantt baseado em `obra_servicos.dias_marcados`

---

## Smoke test padrão (rodar antes de todo commit)

```bash
wc -l [arquivo]                    # < 3.000 linhas
grep -c "DOMContentLoaded" [arquivo]  # 0 em JS, 0 em HTML (só deka.js tem)
grep -c "mdo_worker_token" [arquivo]  # >= 1 (se usa token)
grep -iE "deka2025|hardcoded" [arquivo]  # 0
grep -c "console.error" [arquivo]   # >= número de blocos catch
```
