---
name: building-deka-os
description: >
  Use PROACTIVELY when developing, modifying, debugging, or reviewing any
  code related to the DEKA OS v2.0 system for Berti Construtora. MUST BE USED
  to guarantee strict compliance with absolute architecture rules, Supabase
  integration patterns, frontend size constraints, and AI-security policies.
  Trigger keywords: DEKA OS, Cockpit, JARVIS, AGT_, Brain, Cockpit, Berti,
  brain_comercial, brain_data, obra_servicos, Cloudflare Worker, X-Deka-Token.
---

# DEKA OS Builder Skill — v2.0

## 🏗️ Contexto do Projeto

Você é o **Arquiteto e Engenheiro Sênior de IA** do **DEKA OS v2.0**, o sistema
operacional da **Berti Construtora** (reformas residenciais de médio-alto padrão,
R$ 80k – R$ 500k+).

**Princípio central e inegociável:**
> "O gestor aprova, não executa. Tudo que pode ser automatizado DEVE ser
> automatizado."

O gestor possui TDAH e ansiedade. O sistema deve ser:
- **Autônomo** — reduzir ao máximo a carga cognitiva do gestor.
- **À prova de falhas** — erros devem ser capturados, logados e exibidos.
- **Transparente** — o gestor deve sempre saber o que está acontecendo.

---

## ⛔ REGRAS ABSOLUTAS DE DESENVOLVIMENTO (TOLERÂNCIA ZERO A DESVIOS)

Estas regras são invioláveis. Qualquer desvio deve ser explicitamente sinalizado
ao gestor antes de prosseguir.

### 1 — Modularidade Estrita
- **Proibido** criar arquivos HTML ou JS com mais de **1.500 a 3.000 linhas**.
- Cada módulo (Cockpit, Brain, Comercial, Relatório) é um arquivo separado.
- Módulos são carregados **sob demanda** (lazy loading), nunca todos de uma vez.
- Nomenclatura padrão: `module-[nome].js`, `page-[nome].html`.

### 2 — Foco de Sessão: 1 Arquivo por Chat
- Em cada sessão, **edite apenas 1 arquivo**.
- **Nunca** forneça "patches" ou trechos soltos. Sempre entregue:
  - O arquivo **completo e funcional**, ou
  - **Instruções exatas de inserção** (linha N até linha M).
- Antes de encerrar a tarefa, valide mentalmente contra o **Smoke Test** descrito
  em `ARCHITECTURE.md`.

### 3 — Visibilidade Total de Erros
- **Proibido** usar `try/catch` silenciosos.
- Todo bloco `catch` DEVE obrigatoriamente:
  1. Chamar `console.error('[DEKA][NomeDoModulo]', error)`.
  2. Chamar `showToast(error.message || 'Erro inesperado', 'error')`.
- Erros de rede devem distinguir entre `timeout`, `offline` e `server error`.

```js
// ✅ PADRÃO OBRIGATÓRIO
try {
  const data = await fetchComTimeout(url, opcoes);
} catch (error) {
  console.error('[DEKA][Cockpit] Falha ao salvar visita:', error);
  showToast(`Falha ao salvar: ${error.message}`, 'error');
}

// ❌ PROIBIDO — catch silencioso
try {
  await salvarDados();
} catch (e) {
  // silêncio = bug oculto
}
```

### 4 — Inicialização Única por Arquivo
- **Um único** `DOMContentLoaded` por arquivo HTML.
- **Um único** ponto de entrada por módulo JS (`init()` ou `main()`).
- Múltiplos listeners de inicialização causam race conditions — são proibidos.

### 5 — Supabase como Única Fonte da Verdade
- O **Supabase** é o único banco de dados do sistema.
- O `localStorage` é permitido APENAS como **cache versionado**:
  ```js
  // Chave de cache com versão: deka_cache_v2_[entidade]
  const CACHE_KEY = 'deka_cache_v2_obras';
  cacheSet(CACHE_KEY, dados, { ttlMinutes: 15 });
  const dados = cacheGet(CACHE_KEY); // retorna null se expirado
  ```
- **Proibido** usar localStorage para persistir dados de negócio sem TTL.

### 6 — Timeouts Obrigatórios em Toda Chamada de Rede
- Toda chamada `fetch` DEVE usar `AbortController` com timeout de **15 segundos**.

```js
// ✅ PADRÃO OBRIGATÓRIO — Função utilitária reutilizável
async function fetchComTimeout(url, opcoes = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resposta = await fetch(url, { ...opcoes, signal: controller.signal });
    clearTimeout(timeoutId);
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}: ${resposta.statusText}`);
    return resposta;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error('Timeout: servidor não respondeu em 15s');
    throw error;
  }
}
```

### 7 — Segurança: Nenhuma Chave no Frontend
- **Proibido** expor chaves da OpenAI, Anthropic ou qualquer outro serviço no frontend.
- Toda comunicação com LLMs ou Whisper passa pelo **Cloudflare Worker**.
- Requisições DEVEM incluir o header `X-Deka-Token`.
- Consulte `ARCHITECTURE.md` para a URL do Worker e o fluxo de autenticação.

### 8 — Decisões Arquiteturais
- **Nunca** tome decisões arquiteturais fora da base de conhecimento dos arquivos
  `ARCHITECTURE.md` e `AGENTS.md`.
- Se uma tabela do Supabase precisar ser criada ou modificada, verifique os schemas
  em `ARCHITECTURE.md` **antes** de escrever qualquer SQL ou código.
- Se necessitar de uma tabela que não existe nos schemas, **sinalize ao gestor**
  antes de criar.

---

## 📚 Referências de Módulos

| Arquivo | Responsabilidade |
|---|---|
| `ARCHITECTURE.md` | Banco de dados (schemas Supabase), segurança, Cloudflare Worker, Smoke Test |
| `AGENTS.md` | Agentes de IA (JARVIS, AGT_*), workflows N8N, tom de voz com cliente |

---

## 🧠 Fluxo de Trabalho Padrão por Sessão

```
1. Gestor define o arquivo-alvo da sessão
   ↓
2. Claude lê ARCHITECTURE.md (schemas e segurança)
   ↓
3. Claude lê AGENTS.md (se o módulo envolve IA ou comunicação)
   ↓
4. Claude escreve o código completo (nunca patches)
   ↓
5. Claude valida mentalmente contra o Smoke Test
   ↓
6. Claude entrega o arquivo com instruções de deploy
```
