# DEKA OS — Arquitetura, Segurança e Dados
> **Versão 2.1 — Schema Real Supabase auditado em 01/04/2026**
> Este arquivo é a **referência definitiva** para banco de dados, segurança de API
> e estrutura do backend. Consulte-o ANTES de escrever qualquer código que acesse
> dados ou faça chamadas de rede.
> O schema aqui documentado reflete o Supabase real — não assuma campos não listados.

---

## 1. Segurança e Proxy de IA

### Regra absoluta
**Nenhuma** chave da OpenAI, Anthropic ou outro LLM deve aparecer no frontend.
Qualquer violação desta regra é um bug de segurança crítico.

### Cloudflare Worker (Proxy Único)
- **Endpoint:** `https://anthropic-proxy.berti-b52.workers.dev`
- **Header obrigatório:** `X-Deka-Token: <token_do_gestor>`
- **Token:** lido de `localStorage.getItem('mdo_worker_token')` — NUNCA hardcoded
- **Rotas do Worker:**

| Rota | Serviço | Uso |
|---|---|---|
| `/v1/messages` | Anthropic Claude | Todos os agentes (JARVIS, Cockpit, Relatório) |
| `/v1/audio/transcriptions` | OpenAI Whisper | Transcrição de áudio do Cockpit |

### Padrão de chamada ao Worker

```js
// ✅ PADRÃO OBRIGATÓRIO para chamadas de IA
const token = localStorage.getItem('mdo_worker_token') ?? '';
const resposta = await fetchComTimeout(
  'https://anthropic-proxy.berti-b52.workers.dev/v1/messages',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Deka-Token': token,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: sistemaPrompt,
      messages: mensagens,
    }),
  }
);
```

### DEKA_CONFIG — padrão de inicialização

```js
// Definido em cada HTML antes de qualquer import
// Token vem do localStorage — nunca hardcoded
window.DEKA_CONFIG = {
  supabaseUrl:     'https://tdylutdfzgtcfyhynenk.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeWx1dGRmemd0Y2Z5aHluZW5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODQxMjcsImV4cCI6MjA4ODg2MDEyN30.k44CAV8O8AGhq4lzy-Ms5CF6JsW2fgMqLEegKb4K-pg',
  workerUrl:       'https://anthropic-proxy.berti-b52.workers.dev',
  token:           localStorage.getItem('mdo_worker_token') ?? '',
};
```

> ⛔ PROIBIDO: `token: 'deka2025@berti#seguro'` ou qualquer string hardcoded.
> O token deve SEMPRE vir do localStorage.

---

## 2. Transcrição de Áudio (Módulo Cockpit)

### Fluxo de transcrição
```
Áudio do Gestor (3–5 min)
  → MediaRecorder (frontend)
  → Blob WebM/MP4
  → Cloudflare Worker /v1/audio/transcriptions (Whisper)
  → Texto transcrito
  → AGT_COCKPIT (Claude) → JSON validado (Payload Sync)
  → Supabase (obra_visitas)
```

### Fallback obrigatório
Se a transcrição falhar (timeout, erro de rede, arquivo inválido), o sistema DEVE:
1. Exibir `showToast('Transcrição falhou. Use o modo texto.', 'warning')`.
2. Abrir automaticamente o campo de texto manual.
3. **Nunca** descartar o áudio sem avisar o gestor.

### Limites do Whisper via Worker
- Tamanho máximo: **25 MB** por áudio.
- Formato aceito: WebM, MP4, M4A, WAV.
- Timeout recomendado para áudios longos: **45 segundos**.

---

## 3. Schemas Oficiais do Supabase (Fonte da Verdade Real)

> ⚠️ **Schema auditado via API em 01/04/2026.**
> NUNCA assuma um campo. Se não estiver listado aqui, não existe.
> Para adicionar campos novos: sinalizar ao gestor ANTES de criar.

---

### Tabela: `obras`
Dados completos de cada obra — identificação, financeiro, configuração visual e links.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `nome` | `text` | Nome interno da obra |
| `cliente` | `text` | Nome/apelido do cliente |
| `razao_cliente` | `text` | Razão social completa do cliente |
| `cnpj_cliente` | `text` | CNPJ ou CPF do cliente |
| `email_cliente` | `text` | E-mail do cliente |
| `telefone_cliente` | `text` | Telefone/WhatsApp do cliente |
| `endereco` | `text` | Endereço completo da obra |
| `tipo_obra` | `text` | Ex: "Reforma Comercial", "Residencial" |
| `escopo_resumo` | `text` | Texto comercial resumido do escopo |
| `data_inicio` | `date` | Data de início contratual |
| `data_previsao_fim` | `date` | Previsão de conclusão |
| `status` | `text` | `ativa` \| `pausada` \| `concluida` |
| `percentual_global` | `numeric` | Avanço físico total (0–100) |
| `semana` | `integer` | Número da semana atual da obra |
| `valor_contrato` | `numeric` | Valor total do contrato (R$) |
| `taxa_admin` | `numeric` | Taxa de administração (%) |
| `num_medicoes` | `integer` | Número de medições previstas |
| `periodicidade` | `text` | Ex: "Mensal", "Quinzenal" |
| `forma_pagamento` | `text` | Ex: "Boleto", "PIX", "Transferência" |
| `responsavel_tecnico` | `text` | Nome + registro do responsável técnico |
| `nome_gestor` | `text` | Nome do gestor da obra |
| `empresa` | `text` | Razão social da Berti Construtora |
| `cnpj_empresa` | `text` | CNPJ da Berti Construtora |
| `tel_empresa` | `text` | Telefone da empresa |
| `email_empresa` | `text` | E-mail da empresa |
| `pix_empresa` | `text` | Chave PIX da empresa |
| `logo_b64` | `text` | Logo da empresa em base64 |
| `capa_url` | `text` | URL da imagem de capa da obra |
| `capa_b64` | `text` | Imagem de capa em base64 |
| `paleta` | `text` | Paleta de cores da obra (JSON string) |
| `tema` | `text` | Tema visual da obra |
| `link_drive` | `text` | Link Google Drive da obra |
| `link_proposta` | `text` | Link da proposta comercial |
| `link_contrato` | `text` | Link do contrato assinado |
| `link_relatorios` | `text` | Link da pasta de relatórios |
| `link_medicoes` | `text` | Link da pasta de medições |
| `link_fotos` | `text` | Link da pasta de fotos |
| `link_orcamento` | `text` | Link do orçamento detalhado |
| `link_portal` | `text` | Link do portal do cliente |
| `created_at` | `timestamptz` | Criação automática |
| `updated_at` | `timestamptz` | Atualização automática |

> 💡 **Campos financeiros calculados (nunca persistir no banco):**
> - `valor_pago` = soma dos pagamentos recebidos (calcular via `brain_comercial` ou campo futuro)
> - `saldo_em_aberto` = `valor_contrato` - `valor_pago`
> - `medicao_atual` = calcular via contagem de medições aprovadas

---

### Tabela: `obra_servicos`
Serviços (linhas de execução) de cada obra. Base do cronograma e Gantt.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `obra_id` | `uuid` | FK → `obras.id` |
| `codigo` | `text` | Código interno (ex: "SRV-013") — nunca exibir ao cliente |
| `descricao_interna` | `text` | Descrição técnica para o gestor |
| `descricao_cliente` | `text` | Descrição traduzida para o cliente |
| `equipe_codigo` | `text` | Código da equipe (ex: "EQ-ACO-01") — nunca exibir ao cliente |
| `categoria` | `text` | Categoria do serviço (ex: "Elétrica", "Acabamento") |
| `setor` | `text` | Setor/local da obra (ex: "Salão 1", "Banheiro") |
| `unidade` | `text` | Unidade de medida (m², m³, un, etc.) |
| `quantidade` | `numeric` | Quantidade contratada |
| `valor_unitario` | `numeric` | Valor unitário (R$) |
| `valor_contratado` | `numeric` | Valor total do serviço (R$) |
| `percentual_concluido` | `numeric` | Progresso atual (0–100) |
| `pct_anterior` | `numeric` | Progresso na medição anterior (0–100) |
| `status` | `text` | `CONCLUÍDO` \| `EM ANDAMENTO` \| `A EXECUTAR` \| `ATRASADO` |
| `status_atual` | `text` | Status interno de sincronização (`pendente` \| `aplicado`) |
| `status_anterior` | `text` | Status na medição anterior |
| `data_inicio` | `date` | Data de início prevista |
| `data_fim` | `date` | Data de término prevista |
| `prazo_dias` | `integer` | Duração em dias |
| `dias_marcados` | `date[]` | Array de datas marcadas — base do Gantt visual |
| `created_at` | `timestamptz` | Criação automática |
| `updated_at` | `timestamptz` | Atualização automática |

> 💡 **`dias_marcados`** é o campo que alimenta o Gantt.
> Cada data no array representa um dia ativo daquele serviço no cronograma.

---

### Tabela: `obra_visitas`
Registros de visitas à obra — gerados pelo Cockpit (áudio → Whisper → AGT_COCKPIT).

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `obra_id` | `uuid` | FK → `obras.id` |
| `data_visita` | `date` | Data da visita |
| `semana` | `integer` | Número da semana da visita |
| `transcricao_raw` | `text` | Texto bruto do Whisper |
| `resumo_ia` | `text` | Resumo gerado pelo AGT_COCKPIT |
| `narrativa_revisada` | `text` | Resumo editado/aprovado pelo gestor |
| `payload_sync` | `jsonb` | JSON validado com atualizações para o Supabase |
| `status_sync` | `text` | `pendente` \| `aplicado` \| `erro` |
| `itens_aplicados` | `integer` | Número de serviços atualizados pelo payload |
| `duracao_min` | `integer` | Duração da visita em minutos |
| `created_at` | `timestamptz` | Criação automática |

---

### Tabela: `obra_pendencias`
Fila de prioridades técnicas por obra. (Tabela existe, sem dados ainda.)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `obra_id` | `uuid` | FK → `obras.id` |
| `descricao` | `text` | Descrição da pendência |
| `prioridade` | `text` | `critica` \| `alta` \| `media` \| `baixa` |
| `responsavel` | `text` | Nome do responsável |
| `status` | `text` | `aberta` \| `em_andamento` \| `resolvida` |
| `created_at` | `timestamptz` | Criação automática |
| `resolved_at` | `timestamptz` | Data de resolução (nullable) |

---

### Tabela: `obra_fotos`
Fotos das visitas de obra. (Tabela existe, sem dados ainda.)

> ⚠️ Schema não auditado — tabela vazia. Antes de usar, verificar campos reais
> no Supabase Dashboard antes de escrever qualquer código.

---

### Tabela: `brain_data`
Tarefas, agenda e briefings do JARVIS. (Tabela existe, sem dados ainda.)

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `tipo` | `text` | `tarefa` \| `briefing` \| `alerta` \| `lembrete` |
| `titulo` | `text` | Título curto |
| `conteudo` | `text` | Conteúdo completo (markdown aceito) |
| `prioridade` | `text` | `urgente` \| `alta` \| `normal` |
| `status` | `text` | `pendente` \| `em_andamento` \| `concluido` |
| `data_execucao` | `date` | Data alvo para execução |
| `origem_agente` | `text` | Qual agente criou (ex: "JARVIS", "AGT_COCKPIT") |
| `created_at` | `timestamptz` | Criação automática |

> ⛔ PROIBIDO usar localStorage para persistir dados do JARVIS.
> Toda tarefa/agenda vai em `brain_data`.

---

### Tabela: `brain_comercial`
**ÚNICA** tabela para toda a operação Comercial e WhatsApp.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `contato_nome` | `text` | Nome do lead/cliente |
| `contato_numero` | `text` | Número WhatsApp (formato: 5541999999999) |
| `mensagem_original` | `text` | Mensagem recebida via Evolution API |
| `resposta_ia` | `text` | Resposta gerada pelo AGT_WHATSAPP |
| `estagio` | `text` | `lead_frio` \| `lead_quente` \| `orcamento` \| `cliente` |
| `proxima_acao` | `text` | Instrução para o gestor aprovar |
| `aprovado_gestor` | `boolean` | Default: false — gestor aprova antes do envio |
| `enviado_em` | `timestamptz` | Timestamp de envio (nullable) |
| `created_at` | `timestamptz` | Criação automática |

> ⛔ PROIBIDO usar ou criar a tabela `comercial_data`. Ela não existe.
> Todo dado comercial vai em `brain_comercial`.

---

### Tabela: `base_servicos`
Catálogo de serviços disponíveis — base para geração de orçamentos.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `codigo` | `text` | Código do serviço (ex: "SRV-001") |
| `categoria` | `text` | Categoria (ex: "Elétrica", "Acabamento") |
| `descricao_interna` | `text` | Descrição técnica interna |
| `descricao_cliente` | `text` | Descrição para o cliente |
| `unidade` | `text` | Unidade de medida (m², m³, un — usar Unicode exato) |
| `valor_referencia` | `numeric` | Valor de referência (R$) |
| `valor_min` | `numeric` | Valor mínimo (R$) |
| `valor_max` | `numeric` | Valor máximo (R$) |
| `sinapi` | `text` | Código SINAPI de referência |
| `fonte` | `text` | Fonte do preço |
| `equipe_cod` | `text` | Código da equipe padrão |
| `observacoes` | `text` | Observações técnicas |
| `ativo` | `boolean` | Se o serviço está ativo no catálogo |
| `created_at` | `timestamptz` | Criação automática |
| `updated_at` | `timestamptz` | Atualização automática |

> ⚠️ **Constraint:** `chk_base_servicos_unidade` exige Unicode exato.
> Use `m²` e `m³` — NUNCA `m2` ou `m3`.

---

### Tabela: `propostas`
Propostas comerciais geradas pelo sistema.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `lead_id` | `uuid` | FK → lead (nullable) |
| `nome_obra` | `text` | Nome da obra/projeto |
| `cliente_nome` | `text` | Nome do cliente |
| `cliente_telefone` | `text` | Telefone do cliente |
| `cliente_email` | `text` | E-mail do cliente |
| `endereco` | `text` | Endereço da obra |
| `descricao_escopo` | `text` | Descrição do escopo |
| `prazo_estimado_dias` | `integer` | Prazo em dias |
| `valor_custo_total` | `numeric` | Custo total (R$) |
| `margem_percentual` | `numeric` | Margem aplicada (%) |
| `valor_final` | `numeric` | Valor final da proposta (R$) |
| `status` | `text` | `rascunho` \| `enviada` \| `aprovada` \| `recusada` |
| `transcricao_raw` | `text` | Transcrição de áudio usada para gerar |
| `payload_ia` | `jsonb` | Payload gerado pela IA |
| `aprovado_gestor` | `boolean` | Gestor aprovou antes do envio |
| `aprovado_em` | `timestamptz` | Quando foi aprovada |
| `validade_dias` | `integer` | Validade da proposta em dias |
| `validade_expira_em` | `date` | Data de expiração |
| `observacoes` | `text` | Observações adicionais |
| `created_at` | `timestamptz` | Criação automática |
| `updated_at` | `timestamptz` | Atualização automática |

---

### Tabela: `orcamentos`
Orçamentos detalhados. (Tabela existe, sem dados ainda.)

> ⚠️ Schema não auditado — tabela vazia. Verificar campos reais no Supabase
> Dashboard antes de escrever qualquer código que acesse esta tabela.

---

### Tabela: `itens_proposta`
Itens individuais de uma proposta. FK referencia `base_servicos`.

> ⚠️ Schema não auditado via API. Verificar no Supabase Dashboard antes de usar.
> **Constraint conhecida:** tem FK para `base_servicos` — TRUNCATE requer CASCADE.

---

## 4. Tabelas que NÃO existem (proibido criar ou referenciar)

| Tabela | Motivo |
|---|---|
| `comercial_data` | Nunca existiu — usar `brain_comercial` |
| `cockpit_obras` | Legado removido |
| `medicoes` | Não existe — funcionalidade futura |
| `equipes` | Não existe — equipes ficam em `obra_servicos.equipe_codigo` |
| `fotos` | Não existe — usar `obra_fotos` |
| `visitas` | Não existe — usar `obra_visitas` |

---

## 5. Cliente Supabase (Padrão de Inicialização)

```js
// ✅ PADRÃO — importado de deka.js, nunca reimplementar
import { supabase } from './deka.js';

// deka.js inicializa assim:
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabase = createClient(
  window.DEKA_CONFIG.supabaseUrl,
  window.DEKA_CONFIG.supabaseAnonKey
);
```

---

## 6. Regras de Cache (localStorage)

```js
// ✅ PADRÃO — usar sempre cacheGet/cacheSet do deka.js
import { cacheGet, cacheSet } from './deka.js';

// Prefixo obrigatório com versão
const CACHE_KEY = 'deka_cache_v2_obras_ativas'; // prefixo: deka_cache_v2_

// TTLs recomendados por entidade
// obras:         15 min
// obra_servicos: 5 min (mudam mais frequente)
// base_servicos: 60 min (raramente muda)
// brain_data:    2 min (dados de decisão — sempre frescos)
```

> ⛔ PROIBIDO persistir dados de negócio no localStorage sem TTL.
> ⛔ PROIBIDO usar localStorage como banco de dados.

---

## 7. Smoke Test — Checklist de Validação Pré-Entrega

Antes de encerrar qualquer sessão de desenvolvimento, validar:

```
[ ] O arquivo tem menos de 3.000 linhas?
[ ] Existe apenas 1 DOMContentLoaded (ou 1 ponto de entrada init())?
[ ] Todo fetch usa fetchComTimeout (15s padrão, 45s para Whisper)?
[ ] Todo catch tem console.error('[DEKA][Modulo]') + showToast?
[ ] Nenhuma chave de API está hardcoded no frontend?
[ ] O token vem de localStorage.getItem('mdo_worker_token')?
[ ] O localStorage usa apenas cacheGet/cacheSet com prefixo deka_cache_v2_?
[ ] As tabelas usadas existem no schema desta seção?
[ ] Tabelas proibidas (comercial_data, cockpit_obras, medicoes) NÃO foram referenciadas?
[ ] Códigos internos (SRV-*, EQ-*) NÃO aparecem em textos de cliente?
[ ] O arquivo foi entregue COMPLETO (não como patch)?
[ ] unidade usa Unicode (m², m³) e não ASCII (m2, m3)?
```

---

## 8. Ordem de Desenvolvimento (Roadmap de Sessões)

Esta é a sequência cronológica correta para reconstrução do sistema.
**Não pular etapas. Cada sessão depende da anterior.**

### Sessão 1 — CONCLUÍDA ✅
Atualizar `ARCHITECTURE.md` com schema real do Supabase.

### Sessão 2 — PRÓXIMA
**Arquivo:** `deka.js`
**Objetivo:** Garantir que o núcleo está correto e o token vem do localStorage.
**Verificar:**
- `window.DEKA_CONFIG.token` lê de `localStorage.getItem('mdo_worker_token')`
- `chamarClaude` usa `WORKER_URL` + `X-Deka-Token`
- `fetchComRetry` com backoff exponencial está implementado
- `extrairJSON` com 3 estratégias de parsing está implementado
- `DEKA_KILL_SWITCH` está implementado
- Nenhum token hardcoded

### Sessão 3
**Arquivo:** `hub.html` + `hub.js`
**Objetivo:** Tela inicial — lista de obras com todos os campos reais.
**Campos necessários de `obras`:** `nome`, `cliente`, `status`, `percentual_global`,
`data_previsao_fim`, `semana`, `tipo_obra`

### Sessão 4
**Arquivo:** `obra.html` + `obra.js`
**Objetivo:** Cadastro e edição completa de uma obra.
**Campos necessários de `obras`:** todos.
**Inclui:** formulário de cadastro com todos os campos financeiros,
links externos, dados do cliente, dados da empresa Berti.

### Sessão 5
**Arquivo:** `cockpit.html` + `cockpit.js`
**Objetivo:** Gravação de áudio, transcrição Whisper, AGT_COCKPIT, payload sync.
**Tabelas:** `obra_visitas` (escrita), `obra_servicos` (leitura + update)

### Sessão 6
**Arquivo:** `relatorios.html` + `relatorios.js` + `relatorio-pdf.html`
**Objetivo:** Geração do relatório visual Padrão Berti com dados reais.
**Layout obrigatório:** idêntico ao PDF real (2 colunas, campos financeiros,
Gantt integrado, registro fotográfico integrado).
**Campos financeiros:** `valor_contrato`, `taxa_admin`, `num_medicoes`,
`razao_cliente`, `cnpj_cliente`, `responsavel_tecnico`, `empresa`, `cnpj_empresa`.
**Gantt:** alimentado por `obra_servicos.dias_marcados` (array de datas).

### Sessão 7
**Arquivo:** `brain.html` + `brain.js`
**Objetivo:** JARVIS — briefing semanal, agenda, tarefas.
**Tabelas:** `brain_data` (leitura + escrita), `obras`, `obra_servicos`

### Sessão 8
**Arquivo:** `comercial.html` + `comercial.js`
**Objetivo:** Triagem de leads, WhatsApp, propostas.
**Tabelas:** `brain_comercial`, `propostas`, `base_servicos`

---

## 9. Arquivos do Projeto (estado atual)

```
deka-os/
├── ARCHITECTURE.md       ← este arquivo (referência definitiva)
├── AGENTS.md             ← agentes de IA e workflows
├── SKILL.md              ← regras absolutas de desenvolvimento
├── CLAUDE.md             ← configuração Claude Code
├── deka.js               ← núcleo: Supabase, Claude, cache, toast
├── hub.html / hub.js     ← tela inicial, lista de obras
├── obra.html / obra.js   ← detalhe e edição de obra
├── cockpit.html / cockpit.js   ← gravação de visitas
├── relatorios.html / relatorios.js ← gerador de relatórios
├── relatorio-pdf.html    ← template PDF standalone
├── brain.html / brain.js ← JARVIS / agenda
├── comercial.html / comercial.js ← leads / WhatsApp
├── cloudflare-worker.js  ← Worker (deploy via wrangler)
├── wrangler.toml         ← config do Worker
├── serve.json            ← config servidor local
└── supabase-tables.sql   ← scripts SQL (desatualizado — usar ARCHITECTURE.md)
```

> ⚠️ `supabase-tables.sql` está **desatualizado**.
> A fonte da verdade do schema é este `ARCHITECTURE.md` (seção 3).
