# DEKA OS — MASTER.md
## A Constituição do Sistema Nervoso da Berti Construtora

```
Versão:    3.0.0 — Extraordinário
Data:      31 de março de 2026
Autor:     Evandro Luiz Duarte
Status:    VIGENTE — documento vinculante
Empresa:   Berti Construtora LTDA
CNPJ:      59.622.624/0001-93
```

> **Este arquivo é a única fonte de verdade do DEKA OS.**
> Nenhuma decisão de arquitetura, implementação ou mudança de escopo
> é válida sem estar registrada aqui. Claude Code e todos os agentes
> leem este documento antes de qualquer execução.
> Para schemas técnicos do Supabase e padrões de código, consulte ARCHITECTURE.md.

---

## 1. Marco Histórico

```
31 de março de 2026 — Maturidade arquitetural
Após 4 semanas de construção contínua, o DEKA OS atingiu
seu ponto de maturidade arquitetural. Este é o dia em que
o projeto passou de ferramenta para sistema nervoso da operação.
```

### O que foi construído

- Cockpit HTML com sync Supabase operacional
- Agente financeiro com categorização automática
- 12+ tabelas Supabase com obra_id como entidade central
- Pipeline de IA: Claude → Worker → Supabase
- Módulos separados: hub, obra, cockpit, relatorios, brain, comercial
- Definição dos 4 níveis de autonomia e roadmap para operação autônoma
- Agente comercial, orçamento e fluxo completo de vida do cliente arquitetados

### O que muda a partir de hoje

- O DEKA OS não é mais um projeto pessoal — é a infraestrutura da empresa
- Toda decisão de desenvolvimento passa pelo protocolo deste documento
- O Brain assume progressivamente funções operacionais
- A meta é o Nível 4 de autonomia: você como dono, o Brain como gestor

---

## 2. Visão e Propósito

O DEKA OS é o sistema operacional da Berti Construtora — não um software
de gestão, mas a inteligência que conecta cada lead, cada obra, cada real
e cada decisão em um único organismo que aprende e evolui.

### O que nos diferencia de qualquer SaaS

| Dimensão | SaaS genérico | DEKA OS |
|---|---|---|
| **Dados** | Acumula dados | Acumula inteligência |
| **Aprendizado** | Zero — reinicia sempre | Cresce com cada obra |
| **Integração** | Módulos isolados | `obra_id` conecta tudo |
| **IA** | Nenhuma | Brain como gestor operacional |
| **Financeiro** | Por projeto, sem DRE | Por obra + empresa + DRE automático |
| **Memória** | Sem histórico inteligente | Obsidian vault — memória longa |
| **Comercial** | Manual | Agente qualifica, acompanha e converte |
| **Orçamento** | Manual | Agente com base_servicos + SINAPI |
| **Proposta** | Template manual | Gerada automaticamente em HTML Berti |
| **Custo** | Mensalidade crescente | Infraestrutura própria, custo fixo |

---

## 3. Stack Técnica

| Camada | Tecnologia | Função |
|---|---|---|
| **Frontend** | HTML + CSS + JS (modular) | Hub, Obra, Cockpit, Brain, Comercial, Relatórios |
| **Backend** | Supabase (PostgreSQL) | Fonte única de verdade — todas as tabelas |
| **IA Central** | Claude Sonnet 4.6 | Brain — orquestrador e tomador de decisão |
| **IA Dev** | Claude Code | Desenvolvimento e deploy |
| **Proxy API** | Cloudflare Worker | `anthropic-proxy.berti-b52.workers.dev` |
| **Hospedagem** | GitHub Pages | `evandroduarte-deka/deka-os` |
| **Automação** | N8N | Webhooks, cron jobs, orquestração |
| **Memória Longa** | Obsidian vault | Conhecimento persistente entre obras |
| **Entrada Mobile** | Telegram MCP | Campo → Brain sem intermediário |
| **Transcrição** | Whisper / TurboScribe | Áudio de campo → texto estruturado |
| **Fotos** | ImgBB API | Zero base64 em localStorage |
| **Análise visual** | Gemini Vision | Análise de plantas e projetos PDF |
| **Pesquisa real-time** | Perplexity API | Preços de mercado, normas, legislação |
| **Base de serviços** | base_servicos (Supabase) | 162 serviços · 28 categorias |
| **Preços oficiais** | SINAPI API | Base secundária de custos |
| **Índices** | IBGE / INCC | Reajuste automático de contratos |
| **Voz (stand by)** | ElevenLabs | Alertas por áudio — implementação futura |

### Credenciais e endpoints ativos

```
Cloudflare Worker: anthropic-proxy.berti-b52.workers.dev
GitHub:            evandroduarte-deka/deka-os
Supabase:          tdylutdfzgtcfyhynenk — online e operacional
N8N:               criadorderealidades.app.n8n.cloud
ImgBB API Key:     588ec0d66fb7cefc2ee8aea196125c53
```

---

## 4. Arquitetura Central — obra_id

> ⚠️ **DECISÃO IMUTÁVEL**
> A `obra` é a entidade central do DEKA OS. Todos os módulos —
> financeiro, tarefas, clientes, fotos, snapshots, compras, contratos —
> referenciam o mesmo `obra_id`. Esta decisão não pode ser revertida
> sem reescrever o sistema inteiro.

### Tabelas Supabase (inventário completo auditado em 01/04/2026)

**Com dados ativos:**
- `obras` — entidade central, 42 campos
- `obra_servicos` — serviços e progresso, com `dias_marcados` para Gantt
- `obra_visitas` — diário de campo
- `brain_comercial` — leads e WhatsApp
- `base_servicos` — 162 serviços, 28 categorias
- `propostas` — propostas comerciais

**Estrutura criada, aguardando dados:**
- `clientes`, `contratos`, `financeiro`, `financeiro_empresa`
- `obra_compras`, `oportunidades`, `obra_snapshots`
- `obra_fotos`, `obra_pendencias`, `brain_data`
- `orcamentos`, `itens_proposta`

> Para schema completo de cada tabela, consulte ARCHITECTURE.md.

### Funções canônicas — nunca reescrever

```javascript
cacheGet() / cacheSet()   // Cache versionado — prefixo deka_cache_v2_
fetchComTimeout()         // Todo fetch usa AbortController 15s
chamarClaude()            // Toda IA passa pelo Worker
showToast()               // Toda notificação ao gestor
```

---

## 5. O Brain — Inteligência Operacional

O Brain não é um chatbot. É o sistema nervoso central — lê todos os dados,
raciocina e **grava de volta no Supabase**. Diferencial crítico: tem escrita.

### O objeto obra_context

```json
{
  "obra":       { "id, nome, cliente, etapa, status, datas" },
  "servicos":   [{ "cod, nome, pct, custo_previsto, equipe" }],
  "pendencias": [{ "descricao, responsavel, prazo, status" }],
  "snapshots":  [{ "semana, pct_geral, observacoes" }],
  "visitas":    [{ "data, texto, autor" }],
  "fotos":      [{ "url, descricao, etapa" }],
  "compras":    [{ "item, valor, fornecedor, categoria" }],
  "financeiro": { "receitas, despesas, margem, proximo_vencimento" },
  "cliente":    { "nome, contato, historico, contratos" }
}
```

> O Brain recebe este objeto pronto — não acessa o banco diretamente.

### O que o Brain faz

| Função | Output |
|---|---|
| Alerta proativo | Notificação Telegram + pendência automática |
| DRE automático | Relatório todo dia 1° às 8h |
| Relatório cliente | HTML Padrão Berti sem códigos internos |
| Sugestão de decisão | Próximo passo baseado no contexto |
| Fluxo de caixa | Projeção 60 dias |
| Escrita Obsidian | Lições e benchmarks pós-obra |

> ⚠️ **Regra crítica:** Relatórios para o cliente NUNCA expõem códigos
> internos (SRV/EQ/FOR), slugs ou IDs. O Brain sempre traduz para
> linguagem de negócio.

---

## 6. Obsidian — Memória Longa

```
/vault/
  /obras/          ← gerado automaticamente ao fechar obra
  /fornecedores/   ← histórico, avaliação, pontos fortes
  /clientes/       ← histórico de relacionamento
  /benchmarks/     ← custo/m² por tipo, prazos, materiais
  /decisoes/       ← decisões arquiteturais registradas
  /aprendizados/   ← erros, o que funciona, técnicas validadas
```

### Os 3 fluxos de alimentação

1. **Automático:** ao fechar obra, Brain gera nota com benchmarks
2. **Via Telegram:** campo → Brain formata → grava no vault
3. **Leitura pelo Brain:** ao iniciar obra nova, busca notas com tags similares

---

## 7. Financeiro — Obra + Empresa + DRE

### Separação fundamental

| Financeiro por Obra | Financeiro Empresa |
|---|---|
| Receitas de medição por cliente | Pró-labore e distribuição |
| Pagamento de subcontratados | Salários fixos |
| Material de construção | Contador, endereço fiscal |
| Margem e resultado por obra | DRE consolidado da Berti |

### Regras de categorização — imutáveis

```
"HEBRON"        → receita · obra_badida · taxa_administracao
"REGINALDO"     → despesa · empresa · salario
"MCW PARTICIP"  → despesa · empresa · endereco_fiscal
"UNIMED"        → despesa · empresa · saude
PJ → PF         → distribuicao_prolabore
Confiança < 90% → fila de revisão humana → vira regra permanente
```

### Outputs autônomos

1. DRE mensal automático — todo dia 1° às 8h via Telegram
2. Projeção de 60 dias — visão de para-brisa com alertas
3. Alerta de vencimentos — 3 dias antes
4. Relatório financeiro por obra — para o cliente, sem códigos internos

> ⚠️ **Regra estratégica:** Dívidas: sempre estratégia Bola de Neve.
> Nunca renegociar. Sempre amortizar/quitar antecipadamente.

---

## 8. Módulo de Compras de Material

### Entrada via Telegram

```
Você: "Comprei 10 sacos argamassa R$340 Badida, Leroy Merlin"
  ↓
Brain: categoriza → vincula obra_id → registra despesa
       → atualiza resultado da obra → grava em obra_compras
```

### Categorias de material

| Categoria | Exemplos |
|---|---|
| `material_estrutural` | cimento, argamassa, bloco, ferro |
| `material_hidraulico` | tubos, conexões, registros |
| `material_eletrico` | fios, disjuntores, tomadas |
| `material_acabamento` | cerâmica, tinta, massa corrida |
| `material_esquadria` | portas, janelas, vidros |
| `material_outros` | EPI, ferramentas consumíveis |
| `servico_terceiro` | subempreitadas contratadas |

---

## 9. Relatórios Semanais

### Para o cliente — toda sexta às 17h

| Seção | Fonte |
|---|---|
| Progresso geral | `percentual_global` |
| O que foi feito | `obra_visitas` + `obra_servicos` |
| Fotos da semana | `obra_fotos` (ImgBB) |
| Próximos passos | Brain + `obra_servicos` |

### Fluxo de aprovação

```
Sexta 17h → Brain gera rascunho HTML
          → Preview no Telegram
          → Você: "Aprovar" ou "Editar"
          → Brain envia ao cliente
          → Supabase grava histórico
```

---

## 10. Telegram MCP — Entrada de Campo

```
Você (voz/foto/texto)
  → Telegram Bot
  → N8N (orquestra)
  → Whisper (transcrição)
  → Brain (interpreta + roteia)
  → Supabase (tabela correta) + Obsidian (se conhecimento)
```

### Comandos reconhecidos pelo Brain

| Tipo | Exemplo | Ação |
|---|---|---|
| Diário de campo | "Valdeci finalizou demolição" | Visita + serviço + pendência |
| Foto + legenda | Foto com "problema tubulação" | Vision analisa + cria pendência |
| Comando direto | "Marca revestimento 80%" | Atualiza obra_servicos |
| Consulta | "Quanto falta receber da Hebron?" | Responde no Telegram |
| Input Obsidian | "Anotar: Marcos fez retrabalho" | Grava no vault |
| Compra material | "Comprei argamassa R$340 Badida" | obra_compras + financeiro |

---

## 11. Agente Comercial

### Filtragem de leads

| Tipo | Ação |
|---|---|
| Lead qualificado | Abre oportunidade, agenda visita, notifica |
| Solicitação orçamento | Alimenta agente de orçamento |
| Dúvida genérica | Responde com FAQ Berti |
| Spam | Arquiva sem notificar |

### Técnicas aplicadas

- SPIN Selling para levantamento de necessidades
- Ancoragem de valor antes do preço
- Urgência real baseada em agenda e equipe disponível
- Registro de objeções com sugestão de abordagem

---

## 12. Agente de Orçamento e Proposta

### Hierarquia de referência de preços

```
1° base_servicos (Supabase) — 162 serviços validados pela Berti
   ↓ item não encontrado
2° SINAPI API — com flag obrigatória "SINAPI — validar BDI"
   ↓ item específico
3° Perplexity — pesquisa de mercado em tempo real
   ↓ sempre
Aplicação de BDI + percentual de administração Berti
```

### Proposta em HTML Berti

Estrutura obrigatória:
1. Apresentação da Berti Construtora
2. Como trabalhamos
3. Escopo detalhado
4. Cronograma de execução
5. Previsão de desembolso
6. Investimento total
7. Próximos passos

> Gamma.app descartado. Proposta gerada em HTML com identidade Berti.

---

## 13. Fluxo de Vida do Cliente

```
① LEAD → Agente filtra e qualifica → abre oportunidade
② VENDA → Agente acompanha → orçamento → proposta HTML
③ FECHAMENTO → coleta dados pessoais → gera contratos → assinatura
④ ONBOARDING → cadastra cliente + obra + obra_id + orçamento vinculado
⑤ EXECUÇÃO → Cockpit + Telegram + relatórios automáticos
⑥ ENTREGA → relatório final + acerto financeiro
⑦ PÓS-OBRA → Brain gera nota Obsidian com benchmarks
```

> Dados pessoais coletados APENAS ao fechamento (LGPD + fluxo lógico).

---

## 14. Roadmap de Autonomia

| Nível | Nome | O que o sistema faz | Você faz | Prazo |
|---|---|---|---|---|
| **1** | Coleta | Processa, categoriza, alerta | Opera e decide tudo | ← AGORA |
| **2** | Sugestão | Sugere decisões fundamentadas | Aprova ou rejeita | Q2 2026 |
| **3** | Execução | Executa tarefas rotineiras | Aprova só o crítico | Q3 2026 |
| **4** | Gestão | Gerencia com autonomia total | Define estratégia | META |

---

## 15. Decisões Travadas

> Estas decisões não podem ser revertidas sem consenso explícito
> e atualização deste documento.

| Decisão | O que foi decidido | Data |
|---|---|---|
| Entidade central | `obra_id` como chave universal | 31/03/2026 |
| Brain com escrita | Brain grava de volta no Supabase | 31/03/2026 |
| Financeiro vinculado | Financeiro usa obra_id | 31/03/2026 |
| Proposta em HTML | Gamma.app descartado | 31/03/2026 |
| Contrato como gatilho | Dados pessoais só ao fechamento | 31/03/2026 |
| SINAPI como secundária | base_servicos é primária | 31/03/2026 |
| Fotos via ImgBB | Zero base64 em localStorage | Anterior |
| Token do localStorage | `mdo_worker_token` — nunca hardcoded | 01/04/2026 |
| Módulos modulares | Máx 3.000 linhas por arquivo | Anterior |
| Zero try/catch silencioso | Todo catch: console.error + showToast | Anterior |
| Bola de Neve | Estratégia única para dívidas | Anterior |
| ElevenLabs stand by | Áudio incompatível com TDAH | 31/03/2026 |

---

## 16. Estado Atual do Desenvolvimento

> Atualizado em 01/04/2026

### Sessões concluídas

| Sessão | Arquivo | Status |
|---|---|---|
| 1 | ARCHITECTURE.md | ✅ Schema real do Supabase |
| 2 | deka.js | ✅ Token prioriza localStorage |
| 3 | hub.html + hub.js | ✅ Reconstrução completa |
| Doc | MASTER.md | ✅ Este documento |

### Próximas sessões (roadmap)

| Sessão | Arquivo | Objetivo |
|---|---|---|
| 4 | obra.html + obra.js | Dashboard + edição 42 campos |
| 5 | cockpit.html + cockpit.js | Áudio + Whisper + AGT_COCKPIT |
| 6 | relatorios.html + relatorio-pdf.html | PDF Padrão Berti real |
| 7 | brain.html + brain.js | JARVIS + briefing semanal |
| 8 | comercial.html + comercial.js | Leads + propostas |

---

## 17. Identidade Visual e Dados da Empresa

| Elemento | Valor |
|---|---|
| **Empresa** | Berti Construtora LTDA |
| **CNPJ** | 59.622.624/0001-93 |
| **Resp. Técnica** | Jéssica Berti Martins — CAU A129520-9 |
| **Gestor** | Evandro Luiz Duarte |
| **Telefone** | (41) 9183-6651 |
| **Endereço** | R. Mateus Leme, 1970 — Centro Cívico, Curitiba/PR |
| **Preto principal** | `#1A1A1A` — header, texto, fundo dark |
| **Ouro** | `#C8A84B` — acento, números KPI, separadores |
| **Branco** | `#FFFFFF` — fundo geral |
| **Verde status** | `#22C55E` — concluído |
| **Azul escuro** | `#1E3A5F` — em andamento |
| **Tipografia** | Barlow Condensed — todos os documentos |
| **Tom** | Consultoria técnica · sem jargão interno |

---

## 18. Anti-Padrões

> Erros reais vividos — não teóricos.

**❌ base64 para fotos**
Colapsou localStorage com 3 obras simultâneas. Decisão: ImgBB sempre.

**❌ try/catch silencioso**
Bug oculto por dias — sistema aparentava funcionar enquanto falhava.
Decisão: todo catch obrigatoriamente console.error + showToast.

**❌ commit direto no main**
Quebrou produção sem possibilidade de rollback limpo.
Decisão: sempre PR — nunca commit direto.

**❌ arquivo monolítico sem limite**
19.800 linhas impossibilitaram debug e perderam contexto do Claude Code.
Decisão: máximo 3.000 linhas por arquivo.

**❌ token hardcoded no HTML**
Expõe credenciais no código-fonte visível por qualquer pessoa.
Decisão: token sempre do localStorage (`mdo_worker_token`).

---

## 19. SLA dos Agentes

| Operação | SLA máximo | Fallback |
|---|---|---|
| Entrada via Telegram | 15 segundos | Salva texto bruto, processa IA depois |
| Brain — consulta simples | 45 segundos | Cache parcial |
| Brain — obra_context completo | 45 segundos | Contexto reduzido |
| Geração de relatório | 90 segundos | Rascunho parcial |
| Agente financeiro | 30 segundos | Queue background |
| Agente de orçamento | 120 segundos | Orçamento parcial sinalizado |
| Sync Supabase | 15 segundos | Retry 3x com backoff |

---

## 20. Glossário

| Termo | Definição |
|---|---|
| `obra_id` | UUID único — chave que conecta todos os módulos |
| `obra_context` | JSON consolidado que o Brain recebe — não acessa banco direto |
| **Brain** | Claude Sonnet atuando como orquestrador — lê e grava |
| **AGT_** | Prefixo de agente especializado com domínio único |
| **BDI** | Benefícios e Despesas Indiretas — aplicado sobre SINAPI |
| **Padrão Berti** | Tom: consultoria técnica, sem jargão, foco em progresso |
| **SRV / EQ / FOR** | Códigos internos — nunca em documentos de cliente |
| **X-Deka-Token** | Header de autenticação no Worker — vem do localStorage |
| `mdo_worker_token` | Chave localStorage do token — única fonte autorizada |
| `fetchComTimeout` | Todo fetch com AbortController 15s — obrigatório |
| `cacheGet/cacheSet` | Cache versionado — prefixo `deka_cache_v2_` obrigatório |
| **Nível 4** | Meta: Brain como gestor operacional, Evandro como dono |
| **Bola de Neve** | Estratégia de dívidas: menor primeiro, nunca renegociar |

---

## 21. Changelog

| Versão | Data | Decisão |
|---|---|---|
| 1.0.0 | Anterior | `obra_id` como entidade central |
| 1.0.0 | Anterior | ImgBB para fotos — base64 colapsou localStorage |
| 1.1.0 | Anterior | Zero try/catch silenciosos |
| 2.0.0 | 31/03/2026 | Brain com escrita no Supabase |
| 2.0.0 | 31/03/2026 | Proposta em HTML Berti — Gamma descartado |
| 2.0.0 | 31/03/2026 | Contrato como gatilho de onboarding |
| 2.0.0 | 31/03/2026 | SINAPI como base secundária |
| 3.0.0 | 31/03/2026 | SLA dos agentes definido |
| 3.0.0 | 31/03/2026 | Anti-padrões documentados com contexto real |
| 3.0.0 | 31/03/2026 | Glossário e mapa de resiliência criados |
| 3.1.0 | 01/04/2026 | Token hardcoded → localStorage obrigatório |
| 3.1.0 | 01/04/2026 | Schema real Supabase auditado — 12+ tabelas |
| 3.1.0 | 01/04/2026 | Módulos deka-os reconstruídos (hub, deka.js) |

---

```
DEKA OS — MASTER.md v3.1.0
Berti Construtora LTDA · Confidencial
Última atualização: 01/04/2026
```
