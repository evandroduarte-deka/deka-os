# DEKA OS v2.0 — Arquitetura Técnica e Infraestrutura

> **Documento oficial da arquitetura técnica do sistema.**
> Última atualização: 2026-03-27
> Referência obrigatória antes de escrever ou modificar qualquer código.

---

## 1. Stack Tecnológico e URLs de Produção

### Frontend

| Componente | Tecnologia | URL Produção |
|---|---|---|
| **Runtime** | Vanilla JavaScript ES Modules | — |
| **Hospedagem** | Cloudflare Pages | https://deka-os.pages.dev |
| **Banco de Dados** | Supabase PostgreSQL | https://tdylutdfzgtcfyhynenk.supabase.co |
| **Proxy de IA** | Cloudflare Worker | https://anthropic-proxy.berti-b52.workers.dev |
| **Design System** | CSS Variables + System Fonts | — |

### Backend / APIs

| Serviço | Propósito | Autenticação |
|---|---|---|
| **Supabase** | PostgreSQL + REST API | Anon Key (RLS ativo) |
| **Cloudflare Worker** | Proxy seguro para Anthropic/OpenAI | X-Deka-Token (timing-safe) |
| **Anthropic Claude** | LLM (Sonnet 4, Haiku 4.5) | Via Worker (chave oculta) |
| **OpenAI Whisper** | Transcrição de áudio | Via Worker (chave oculta) |
| **Evolution API** | WhatsApp Business (via N8N) | Webhook autenticado |

### Segurança — Regra Absoluta

**PROIBIDO** expor chaves de API no frontend. Todo acesso a LLMs ou Whisper passa pelo Cloudflare Worker.

```
Frontend (deka-os.pages.dev)
  ↓ X-Deka-Token
Cloudflare Worker (anthropic-proxy.berti-b52.workers.dev)
  ↓ x-api-key (oculta)
Anthropic API / OpenAI API
```

**Variáveis de ambiente do Worker** (Cloudflare Dashboard → Settings → Variables):
- `DEKA_SECRET_TOKEN` — Validado via `crypto.subtle.timingSafeEqual`
- `ANTHROPIC_API_KEY` — Nunca exposta ao frontend
- `OPENAI_API_KEY` — Nunca exposta ao frontend
- `ALLOWED_ORIGIN` — `https://deka-os.pages.dev` (CORS)

---

## 2. Módulos do Sistema — Status Atual

| Módulo | Arquivo | Status | Responsabilidade |
|---|---|---|---|
| **Hub** | hub.html + hub.js | ✅ COMPLETO | Lista obras ativas, pausadas, concluídas |
| **Obra** | obra.html + obra.js | ✅ COMPLETO | Detalhe de obra individual (serviços, pendências, visitas) |
| **Cockpit** | cockpit.html + cockpit.js | ✅ COMPLETO | Registro de visitas por áudio (Whisper + AGT_COCKPIT) |
| **Brain** | brain.html + brain.js | ✅ COMPLETO | JARVIS, Matrix (tarefas), Pipeline comercial, Agenda |
| **Oportunidades** | oportunidades.html + oportunidades.js | ✅ COMPLETO | Pipeline de propostas comerciais (rascunho → aceito) |
| **Chat Orçamento** | chat-orcamento.html + chat-orcamento.js | ✅ COMPLETO | AGT_INTAKE — elaboração de propostas via chat multimodal |
| **Catálogo** | catalogo.html + catalogo.js | ✅ COMPLETO | Aprovação de novos serviços detectados em propostas |
| **Relatórios** | relatorios.html + relatorios.js | ✅ COMPLETO | Relatórios semanais ao cliente (gerados por IA) |
| **Comercial** | comercial.html + comercial.js | ⏸️ STANDBY | Interface para WhatsApp (substituído pelo Brain → Pipeline) |
| **Orçamento** | orcamento.html + orcamento.js | ⏸️ STANDBY | Gerador direto (substituído por chat-orcamento.js) |

**Módulo Fundação:**
- `deka.js` — Runtime global (supabase, cache, toast, fetchComTimeout, chamarClaude)
- `cloudflare-worker.js` — Proxy de segurança (3 rotas: /v1/messages, /v1/audio/transcriptions, /v1/orcamento)

---

## 3. Schemas do Supabase — Fonte da Verdade

### 3.1 Tabela: `obras`
Obras ativas, pausadas e concluídas.

| Campo | Tipo | Descrição | Constraints |
|---|---|---|---|
| `id` | uuid | PK, auto-gerado | PRIMARY KEY |
| `nome` | text | Nome interno da obra | NOT NULL |
| `cliente` | text | Nome do cliente | NOT NULL |
| `endereco` | text | Endereço completo | — |
| `data_inicio` | date | Data de início contratual | — |
| `data_previsao_fim` | date | Previsão de conclusão | — |
| `status` | text | `ativa` \| `pausada` \| `concluida` | NOT NULL, DEFAULT 'ativa' |
| `percentual_global` | numeric | Avanço físico total (0-100) | DEFAULT 0, CHECK >= 0 AND <= 100 |
| `created_at` | timestamptz | Timestamp de criação | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | Timestamp de última atualização | NOT NULL, DEFAULT now() |

**Política RLS:** Leitura pública (todas as queries funcionam sem auth).

---

### 3.2 Tabela: `obra_servicos`
Lista de serviços (linhas de execução) de cada obra.

| Campo | Tipo | Descrição | Constraints |
|---|---|---|---|
| `id` | uuid | PK, auto-gerado | PRIMARY KEY |
| `obra_id` | uuid | FK → `obras.id` | NOT NULL, ON DELETE CASCADE |
| `codigo` | text | Código do serviço (ex: SRV-013) | NOT NULL |
| `descricao_interna` | text | Descrição técnica (pode conter códigos) | NOT NULL |
| `descricao_cliente` | text | Descrição acessível (SEM códigos SRV-*, EQ-*) | NOT NULL |
| `equipe_codigo` | text | Código da equipe (ex: EQ-ACO-01) | NOT NULL |
| `percentual_concluido` | numeric | Progresso do serviço (0-100) | DEFAULT 0, CHECK >= 0 AND <= 100 |
| `valor_contratado` | numeric | Valor em R$ | DEFAULT 0 |
| `created_at` | timestamptz | Timestamp de criação | NOT NULL, DEFAULT now() |

**Índices:** `idx_obra_servicos_obra_id`, `idx_obra_servicos_codigo`
**Política RLS:** Leitura pública.

---

### 3.3 Tabela: `obra_pendencias`
Fila de prioridades técnicas por obra.

| Campo | Tipo | Descrição | Constraints |
|---|---|---|---|
| `id` | uuid | PK, auto-gerado | PRIMARY KEY |
| `obra_id` | uuid | FK → `obras.id` | NOT NULL, ON DELETE CASCADE |
| `descricao` | text | Descrição da pendência | NOT NULL |
| `prioridade` | text | `critica` \| `alta` \| `media` \| `baixa` | NOT NULL, CHECK IN (...) |
| `responsavel` | text | Nome do responsável | NOT NULL |
| `status` | text | `aberta` \| `em_andamento` \| `resolvida` | DEFAULT 'aberta', CHECK IN (...) |
| `created_at` | timestamptz | Timestamp de criação | NOT NULL, DEFAULT now() |
| `resolved_at` | timestamptz | Data de resolução (nullable) | — |

**Índices:** `idx_obra_pendencias_obra_id`, `idx_obra_pendencias_status`, `idx_obra_pendencias_prioridade`
**Política RLS:** Leitura pública.

---

### 3.4 Tabela: `obra_visitas`
Registros diários gerados pelo áudio processado do Cockpit.

| Campo | Tipo | Descrição | Constraints |
|---|---|---|---|
| `id` | uuid | PK, auto-gerado | PRIMARY KEY |
| `obra_id` | uuid | FK → `obras.id` | NOT NULL, ON DELETE CASCADE |
| `data_visita` | date | Data da visita | NOT NULL |
| `transcricao_raw` | text | Texto bruto do Whisper | — |
| `resumo_ia` | text | Resumo gerado pelo AGT_COCKPIT | — |
| `payload_sync` | jsonb | JSON validado com atualizações | — |
| `status_sync` | text | `pendente` \| `aplicado` \| `erro` | DEFAULT 'pendente', CHECK IN (...) |
| `created_at` | timestamptz | Timestamp de criação | NOT NULL, DEFAULT now() |

**Índices:** `idx_obra_visitas_obra_id`, `idx_obra_visitas_data_visita`, `idx_obra_visitas_status_sync`
**Política RLS:** Leitura pública.

**Estrutura do `payload_sync`:**
```json
{
  "percentual_global": 45,
  "servicos_atualizados": [
    { "codigo": "SRV-013", "percentual_concluido": 80 }
  ],
  "pendencias_novas": [
    { "descricao": "Falta material elétrico", "prioridade": "alta", "responsavel": "João" }
  ]
}
```

---

### 3.5 Tabela: `propostas`
Propostas comerciais (pipeline de vendas).

| Campo | Tipo | Descrição | Constraints |
|---|---|---|---|
| `id` | uuid | PK, auto-gerado | PRIMARY KEY |
| `nome_obra` | text | Nome da obra (ex: "Loja Barigui") | NOT NULL |
| `cliente_nome` | text | Nome do cliente | — |
| `cliente_email` | text | Email do cliente | — |
| `cliente_telefone` | text | Telefone (formato: 5541999999999) | — |
| `endereco` | text | Endereço da obra | — |
| `descricao_escopo` | text | Resumo executivo do escopo (3-5 frases) | — |
| `prazo_estimado_dias` | integer | Prazo em dias úteis | — |
| `valor_custo_total` | numeric | Custo total dos serviços (sem margem) | DEFAULT 0 |
| `margem_percentual` | numeric | Margem de lucro aplicada (ex: 30 = 30%) | DEFAULT 0 |
| `valor_final` | numeric | Valor final da proposta (custo + margem) | DEFAULT 0 |
| `status` | text | `rascunho` \| `enviado_cliente` \| `aguardando_aprovacao` \| `aceito` \| `recusado` \| `expirado` | DEFAULT 'rascunho' |
| `aprovado_gestor` | boolean | Se o gestor aprovou antes de enviar ao cliente | DEFAULT false |
| `data_envio` | date | Data de envio ao cliente | — |
| `data_validade` | date | Validade da proposta | — |
| `created_at` | timestamptz | Timestamp de criação | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | Timestamp de última atualização | NOT NULL, DEFAULT now() |

**Política RLS:** Leitura pública.

---

### 3.6 Tabela: `itens_proposta`
Linhas de serviços de cada proposta.

| Campo | Tipo | Descrição | Constraints |
|---|---|---|---|
| `id` | uuid | PK, auto-gerado | PRIMARY KEY |
| `proposta_id` | uuid | FK → `propostas.id` | NOT NULL, ON DELETE CASCADE |
| `codigo_servico` | text | Código do serviço (ex: DM-01, IF-03) | NOT NULL |
| `categoria` | text | Uma das 20 categorias oficiais | NOT NULL |
| `descricao_interna` | text | Descrição técnica | NOT NULL |
| `descricao_cliente` | text | Descrição SEM códigos técnicos | NOT NULL |
| `unidade` | text | Unidade de medida (m², m, un, etc.) | NOT NULL |
| `quantidade` | numeric | Quantidade estimada | DEFAULT 0 |
| `valor_unitario_custo` | numeric | Custo unitário | DEFAULT 0 |
| `valor_unitario_final` | numeric | Preço unitário (custo + margem) | DEFAULT 0 |
| `valor_total_custo` | numeric | quantidade × valor_unitario_custo | DEFAULT 0 |
| `valor_total_final` | numeric | quantidade × valor_unitario_final | DEFAULT 0 |
| `observacao_ia` | text | Premissas ou contexto da IA | — |
| `created_at` | timestamptz | Timestamp de criação | NOT NULL, DEFAULT now() |

**Índices:** `idx_itens_proposta_proposta_id`, `idx_itens_proposta_codigo_servico`
**Política RLS:** Leitura pública.

---

### 3.7 Tabela: `base_servicos`
Catálogo oficial de serviços aprovados pelo gestor.

| Campo | Tipo | Descrição | Constraints |
|---|---|---|---|
| `id` | uuid | PK, auto-gerado | PRIMARY KEY |
| `codigo` | text | Código único (ex: DM-01, IF-03) | UNIQUE, NOT NULL |
| `categoria` | text | Uma das 20 categorias oficiais | NOT NULL |
| `descricao_interna` | text | Descrição técnica | NOT NULL |
| `descricao_cliente` | text | Descrição acessível (SEM códigos) | NOT NULL |
| `unidade` | text | Unidade de medida | NOT NULL |
| `valor_referencia` | numeric | Valor de referência (atualizado periodicamente) | DEFAULT 0 |
| `ativo` | boolean | Se o serviço está ativo no catálogo | DEFAULT true |
| `fonte` | text | Origem do serviço (ex: 'Gestor-Aprovado', 'AGT_ORCAMENTO', 'Importacao-Antiga') | — |
| `created_at` | timestamptz | Timestamp de criação | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | Timestamp de última atualização | NOT NULL, DEFAULT now() |

**Índices:** `idx_base_servicos_codigo`, `idx_base_servicos_categoria`, `idx_base_servicos_ativo`
**Política RLS:** Leitura pública.

**Fluxo de aprovação de novos serviços:**
1. AGT_ORCAMENTO ou AGT_INTAKE usa códigos novos em `itens_proposta`
2. Módulo `catalogo.js` lista códigos em `itens_proposta` que NÃO existem em `base_servicos`
3. Gestor aprova ou rejeita no módulo Catálogo
4. Se aprovado: INSERT em `base_servicos` com `fonte='Gestor-Aprovado'`

---

### 3.8 Tabela: `brain_data`
Tarefas, briefings, alertas, lembretes e agenda do JARVIS.

| Campo | Tipo | Descrição | Constraints |
|---|---|---|---|
| `id` | uuid | PK, auto-gerado | PRIMARY KEY |
| `tipo` | text | `tarefa` \| `briefing` \| `alerta` \| `lembrete` \| `agenda` | NOT NULL |
| `titulo` | text | Título curto | NOT NULL |
| `conteudo` | text | Conteúdo completo (markdown aceito) | — |
| `prioridade` | text | `urgente` \| `alta` \| `normal` | DEFAULT 'normal' |
| `status` | text | `pendente` \| `em_andamento` \| `concluido` | DEFAULT 'pendente' |
| `data_execucao` | date | Data alvo para execução | — |
| `origem_agente` | text | Qual agente criou (ex: 'JARVIS', 'AGT_COCKPIT') | — |
| `created_at` | timestamptz | Timestamp de criação | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | Timestamp de última atualização | NOT NULL, DEFAULT now() |

**Índices:** `idx_brain_data_tipo`, `idx_brain_data_status`, `idx_brain_data_data_execucao`
**Política RLS:** Leitura pública.

---

### 3.9 Tabela: `brain_comercial`
Leads comerciais do WhatsApp (via Evolution API + N8N).

| Campo | Tipo | Descrição | Constraints |
|---|---|---|---|
| `id` | uuid | PK, auto-gerado | PRIMARY KEY |
| `contato_nome` | text | Nome do lead/cliente | NOT NULL |
| `contato_numero` | text | Número WhatsApp (formato: 5541999999999) | NOT NULL |
| `mensagem_original` | text | Mensagem recebida via Evolution API | — |
| `resposta_ia` | text | Resposta gerada pelo AGT_WHATSAPP | — |
| `estagio` | text | `lead_frio` \| `lead_quente` \| `orcamento` \| `cliente` | DEFAULT 'lead_frio' |
| `proxima_acao` | text | Instrução para o gestor aprovar | — |
| `aprovado_gestor` | boolean | Se o gestor aprovou antes do envio | DEFAULT false |
| `enviado_em` | timestamptz | Timestamp de envio (nullable) | — |
| `created_at` | timestamptz | Timestamp de criação | NOT NULL, DEFAULT now() |
| `updated_at` | timestamptz | Timestamp de última atualização | NOT NULL, DEFAULT now() |

**Índices:** `idx_brain_comercial_contato_numero`, `idx_brain_comercial_estagio`, `idx_brain_comercial_aprovado_gestor`
**Política RLS:** Leitura pública.

**Fluxo de aprovação obrigatório:**
1. Mensagem recebida → N8N aciona AGT_WHATSAPP
2. AGT_WHATSAPP gera `resposta_ia` e salva em `brain_comercial` com `aprovado_gestor=false`
3. Gestor recebe notificação no Brain → Pipeline
4. Gestor aprova ou edita a resposta
5. N8N envia via Evolution API e atualiza `aprovado_gestor=true` + `enviado_em`

---

## 4. Categorias de Serviços — 20 Categorias Oficiais

Codificação: `XX-NN` onde XX = código da categoria, NN = número sequencial.

| Código | Categoria | Descrição |
|---|---|---|
| `PR-01` | Preliminares | Limpeza inicial, tapumes, placa de obra |
| `DM-01` | Demolições | Demolição de paredes, pisos, forros, remoção de entulho |
| `IF-01` | Infraestrutura | Fundações, escavações, contenções, drenagem |
| `AL-01` | Alvenaria | Paredes de tijolo, blocos, fechamentos |
| `CR-01` | Construções e Regularizações | Documentação, aprovação de projetos, licenças |
| `IM-01` | Impermeabilização | Mantas, membranas, tratamentos anti-umidade |
| `PI-01` | Pintura | Pintura de paredes, tetos, esquadrias, textura |
| `HI-01` | Hidráulica | Instalações de água, esgoto, tubulações |
| `EL-01` | Elétrica | Instalações elétricas, quadros, fiação, luminárias |
| `AC-01` | Ar-condicionado | Split, VRF, dutos, ventilação mecânica |
| `DR-01` | Drywall / Forro | Divisórias, forros de gesso, sancas |
| `RV-01` | Revestimento | Pisos, azulejos, porcelanatos, pastilhas |
| `CO-01` | Cobertura | Telhados, lajes, rufos, calhas |
| `SE-01` | Serralheria | Portas, janelas, guarda-corpos, grades |
| `ES-01` | Estruturas Especiais | Estruturas metálicas, mezaninos, coberturas especiais |
| `PP-01` | PPCI / Incêndio | Projeto de prevenção contra incêndio, extintores, hidrantes |
| `PJ-01` | Projetos | Projetos arquitetônicos, estruturais, complementares |
| `MA-01` | Marcenaria | Armários planejados, móveis sob medida |
| `LI-01` | Limpeza | Limpeza final, polimento, lavagem de vidros |
| `AD-01` | Administração | Taxa de administração, BDI |

**Uso obrigatório:**
- Todo serviço em `itens_proposta` DEVE usar um código de categoria válido.
- AGT_INTAKE e AGT_ORCAMENTO DEVEM seguir esta codificação.
- Novos códigos são aceitos (ex: DM-12, EL-23), mas a categoria DEVE ser uma das 20 acima.

---

## 5. Fluxo Comercial Completo — Claude.ai → Obra

```
┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 1: Estudo de Orçamento com Claude.ai (externo)          │
└─────────────────────────────────────────────────────────────────┘
Gestor acessa Claude.ai (fora do DEKA OS)
  → Anexa PDFs do projeto
  → Cola o Prompt AGT_INTAKE (via botão "📋 Prompt IA" em oportunidades.html)
  → Claude conduz entrevista e gera JSON final em bloco ```json

┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 2: Importação no DEKA OS                                 │
└─────────────────────────────────────────────────────────────────┘
Gestor copia JSON do Claude
  → Abre oportunidades.html → botão "📥 Importar do Claude"
  → Cola JSON no modal de importação
  → Sistema valida:
      • nova_proposta (campos obrigatórios)
      • novos_itens (array não vazio, campos válidos)
  → INSERT em `propostas` com status='rascunho'
  → INSERT em `itens_proposta` (todos os itens)
  → Limpa cache de oportunidades
  → Exibe toast de sucesso

┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 3: Pipeline Visual (oportunidades.html)                  │
└─────────────────────────────────────────────────────────────────┘
Proposta aparece no card "Em Estudo" (status=rascunho)
  → Gestor pode:
      • Editar valores/descrições
      • Mudar status → enviado_cliente
      • Mudar status → aguardando_aprovacao
      • Mudar status → aceito (fecha negócio)
      • Mudar status → recusado (arquiva)

┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 4: Fechar Negócio (status → aceito)                      │
└─────────────────────────────────────────────────────────────────┘
Gestor clica "Fechar Negócio" (botão aparece ao mudar status para aceito)
  → Sistema executa:
      1. INSERT em `obras` (nome, cliente, endereco, data_inicio, data_previsao_fim, status='ativa')
      2. INSERT em `obra_servicos` (copia todos os itens de itens_proposta)
      3. Opcional: INSERT em `brain_data` (alerta: "Nova obra criada")
      4. Atualiza propostas.updated_at
      5. Limpa cache de obras + oportunidades
      6. Exibe toast de sucesso
      7. Redireciona para obra.html?id=NOVA_OBRA_ID

┌─────────────────────────────────────────────────────────────────┐
│ ETAPA 5: Obra Ativa no Hub                                     │
└─────────────────────────────────────────────────────────────────┘
Obra aparece em hub.html com status='ativa'
  → Gestor pode:
      • Ver detalhe (obra.html)
      • Registrar visitas (cockpit.html)
      • Atualizar percentuais de serviços
      • Criar pendências
      • Gerar relatórios ao cliente (relatorios.html)
```

**Regra crítica:** AGT_ORCAMENTO (/v1/orcamento do Worker) NÃO é usado no fluxo principal. Ele existe como alternativa para geração automática via API, mas o fluxo padrão é Claude.ai externo → JSON → importação manual.

---

## 6. Cloudflare Worker — Rotas e Responsabilidades

Arquivo: `cloudflare-worker.js`
Endpoint: `https://anthropic-proxy.berti-b52.workers.dev`

### Rotas Disponíveis

| Rota | Método | Autenticação | Serviço Upstream | Uso |
|---|---|---|---|---|
| `/v1/messages` | POST | X-Deka-Token | Anthropic Claude | Todos os agentes (JARVIS, Cockpit, Comercial, Relatório) |
| `/v1/audio/transcriptions` | POST | X-Deka-Token | OpenAI Whisper | Cockpit (transcrição de áudio) |
| `/v1/orcamento` | POST | X-Deka-Token | Anthropic Claude | AGT_ORCAMENTO (alternativa ao fluxo Claude.ai externo) |
| `/health` | GET | — (pública) | — | Health check do N8N |
| `OPTIONS *` | OPTIONS | — (pública) | — | CORS preflight |

### Validação de Token (timing-safe)

Todo request (exceto `/health` e `OPTIONS`) valida `X-Deka-Token` via:
```javascript
crypto.subtle.timingSafeEqual(bufferRecebido, bufferEsperado)
```

Previne ataques de temporização (timing attacks).

### Limites e Timeouts

| Rota | Tamanho Máximo | Timeout | Erro Retornado |
|---|---|---|---|
| `/v1/messages` | — | 30s (no frontend) | TIMEOUT ou FALHA_UPSTREAM_ANTHROPIC |
| `/v1/audio/transcriptions` | 25 MB | 45s (no frontend) | AUDIO_MUITO_GRANDE ou TIMEOUT |
| `/v1/orcamento` | — | 30s (no frontend) | JSON_INVALIDO_IA ou TIMEOUT |

### Headers CORS (aplicados em todas as respostas)

```
Access-Control-Allow-Origin: https://deka-os.pages.dev
Access-Control-Allow-Methods: POST, GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, X-Deka-Token
Access-Control-Max-Age: 86400
```

---

## 7. Sistema de Cache — localStorage Versionado

**Regra:** NUNCA usar `localStorage.setItem` diretamente. Sempre via `cacheSet` com TTL obrigatório.

### Estrutura de um item de cache

```json
{
  "v": 2,
  "data": { ... },
  "expiresAt": 1711546800000
}
```

### Funções (deka.js)

| Função | Parâmetros | Comportamento |
|---|---|---|
| `cacheGet(chave)` | chave: string | Retorna `data` se válido, `null` se expirado/ausente |
| `cacheSet(chave, dados, ttlMinutes)` | chave: string, dados: any, ttlMinutes: number | Grava com TTL. Retorna `boolean` (sucesso) |
| `cacheLimpar(prefixoChave)` | prefixoChave: string | Remove entradas que começam com o prefixo |

### TTLs por Módulo

| Módulo | Chave | TTL (minutos) | Motivo |
|---|---|---|---|
| Hub | `obras` | 10 | Dados de obras mudam pouco |
| Oportunidades | `oportunidades` | 5 | Pipeline comercial muda rápido |
| Brain (JARVIS) | `briefing` | 5 | Briefing atualizado semanalmente via N8N |
| Brain (Leads) | `leads_comercial` | 2 | Mensagens de WhatsApp chegam continuamente |
| Catálogo | (sem cache) | — | Sempre busca no Supabase (dados críticos) |

### Invalidação de cache

Cache é limpo automaticamente:
- Ao mudar status de proposta (oportunidades)
- Ao fechar negócio (propostas → obras)
- Ao salvar visita (cockpit)
- Ao aprovar serviço no catálogo

Chamada: `cacheLimpar('oportunidades')` ou `cacheLimpar('obras')`.

---

## 8. Regras Absolutas de Desenvolvimento — Tolerância Zero

### 8.1 — Try/Catch Obrigatórios

❌ **PROIBIDO** — catch silencioso:
```javascript
try {
  await salvarDados();
} catch (e) {
  // silêncio = bug oculto
}
```

✅ **OBRIGATÓRIO** — log + toast:
```javascript
try {
  await salvarDados();
} catch (erro) {
  console.error('[DEKA][NomeDoModulo] Contexto:', erro);
  showToast(erro.message || 'Erro inesperado', 'error');
}
```

---

### 8.2 — Timeout em Todo Fetch

❌ **PROIBIDO** — fetch sem AbortController:
```javascript
const resposta = await fetch(url, { method: 'POST', body });
```

✅ **OBRIGATÓRIO** — usar `fetchComTimeout`:
```javascript
const resposta = await fetchComTimeout(url, { method: 'POST', body }, 15000);
```

Timeouts padrão (deka.js):
- Genérico: 15s
- Claude: 30s (override)
- Whisper: 45s (override)

---

### 8.3 — Cache com TTL Obrigatório

❌ **PROIBIDO** — localStorage direto:
```javascript
localStorage.setItem('obras', JSON.stringify(dados));
```

✅ **OBRIGATÓRIO** — usar `cacheSet`:
```javascript
cacheSet('obras', dados, 10); // TTL 10 min
```

---

### 8.4 — SELECT Explícito (nunca SELECT *)

❌ **PROIBIDO**:
```javascript
const { data } = await supabase.from('obras').select('*');
```

✅ **OBRIGATÓRIO**:
```javascript
const { data } = await supabase
  .from('obras')
  .select('id, nome, cliente, status, percentual_global');
```

---

### 8.5 — Códigos Internos NÃO Vão para o Cliente

❌ **PROIBIDO** em `descricao_cliente`:
- "SRV-013 — Aplicação de massa corrida"
- "EQ-ACO-01 — Equipe de acabamento"

✅ **CORRETO**:
- "Aplicação de massa corrida nas paredes da sala"
- "Equipe de acabamento" (sem código)

---

### 8.6 — Segurança: Chaves NUNCA no Frontend

❌ **PROIBIDO**:
```javascript
const ANTHROPIC_API_KEY = 'sk-ant-...';
```

✅ **CORRETO**:
- Frontend envia para Worker com `X-Deka-Token`
- Worker injeta `x-api-key` e `anthropic-version`
- Chaves ficam em `env.*` do Worker (Cloudflare Dashboard)

---

### 8.7 — XSS Protection: createElement, Nunca innerHTML

❌ **PROIBIDO** com dados do usuário/Supabase:
```javascript
card.innerHTML = `<h3>${obra.nome}</h3>`;
```

✅ **CORRETO**:
```javascript
const h3 = document.createElement('h3');
h3.textContent = obra.nome; // textContent escapa HTML automaticamente
card.appendChild(h3);
```

---

### 8.8 — Um Único DOMContentLoaded por Arquivo

❌ **PROIBIDO**:
```javascript
document.addEventListener('DOMContentLoaded', init1);
document.addEventListener('DOMContentLoaded', init2);
```

✅ **CORRETO**:
```javascript
// deka.js tem o único DOMContentLoaded global
// Módulos exportam init() e são chamados explicitamente:
<script type="module">
  import { init } from './hub.js';
  init();
</script>
```

---

### 8.9 — Smoke Test Pré-Commit

Antes de commitar qualquer módulo, validar mentalmente:

```
[ ] Arquivo < 3.000 linhas?
[ ] Apenas 1 ponto de entrada (init ou DOMContentLoaded)?
[ ] Todo fetch usa fetchComTimeout?
[ ] Todo catch tem console.error + showToast?
[ ] Nenhuma chave hardcoded?
[ ] Cache usa cacheGet/cacheSet com TTL?
[ ] SELECT é explícito (não SELECT *)?
[ ] descricao_cliente não contém códigos SRV-*, EQ-*?
[ ] innerHTML só com dados estáticos (nunca dados externos)?
```

---

## 9. Smoke Test — Checklist de Validação Pós-Deploy

Após deploy em https://deka-os.pages.dev:

```
[ ] Hub carrega lista de obras do Supabase
[ ] Obra abre detalhe com serviços e pendências
[ ] Cockpit grava áudio → Whisper → Claude → obra_visitas
[ ] Brain exibe JARVIS + Matrix + Pipeline + Agenda
[ ] Oportunidades lista propostas em pipeline visual
[ ] Importar do Claude valida JSON e cria proposta
[ ] Fechar Negócio cria obra + obra_servicos
[ ] Catálogo lista códigos pendentes de aprovação
[ ] Relatórios gera relatório ao cliente (intervalo de datas)
[ ] Nenhum erro CORS no DevTools → Network
[ ] Nenhum erro de autenticação (X-Deka-Token)
[ ] Cache funciona (2ª carga mais rápida que 1ª)
[ ] Toast aparece em todos os erros (não há catch silencioso)
```

---

## 10. Rollback e Contingência

### Reverter Deploy do Worker

Se o Worker falhar após deploy:

```bash
# Opção 1: Revert via git
git revert HEAD
git push origin main
npx wrangler deploy

# Opção 2: Rollback manual no Cloudflare Dashboard
# Workers → anthropic-proxy → Deployments → Rollback to version
```

### Reverter Frontend (Cloudflare Pages)

```bash
# Opção 1: Revert via git
git revert HEAD
git push origin main
# Cloudflare Pages detecta e deploya automaticamente

# Opção 2: Rollback manual no Cloudflare Dashboard
# Pages → deka-os → Deployments → Rollback to deployment
```

### Modo Degradado (sem IA)

Se o Worker estiver offline:
- Hub, Obra, Oportunidades continuam funcionando (Supabase direto)
- Cockpit usa fallback de texto manual (sem áudio)
- Brain exibe dados do Supabase (sem gerar briefing novo)
- Relatórios usa template estático (sem geração por IA)

---

**FIM DO ARQUIVO — ARCHITECTURE.md**

Smoke Test de Documentação:
- [x] Todos os módulos listados com status
- [x] Todas as 9 tabelas do Supabase documentadas
- [x] 20 categorias com códigos documentadas
- [x] Fluxo comercial completo (Claude.ai → obra)
- [x] Rotas do Worker + autenticação
- [x] Regras absolutas de desenvolvimento
- [x] URLs de produção corretas
