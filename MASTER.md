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
> é válida sem estar registrada aqui. Claude Code, NotebookLM e todos
> os agentes leem este documento antes de qualquer execução.

---

## Índice

1. [Marco Histórico](#1-marco-histórico)
2. [Visão e Propósito](#2-visão-e-propósito)
3. [Stack Técnica](#3-stack-técnica)
4. [Arquitetura Central — obra_id](#4-arquitetura-central--obra_id)
5. [O Brain — Inteligência Operacional](#5-o-brain--inteligência-operacional)
6. [Obsidian — Memória Longa](#6-obsidian--memória-longa)
7. [Financeiro — Obra + Empresa + DRE](#7-financeiro--obra--empresa--dre)
8. [Módulo de Compras de Material](#8-módulo-de-compras-de-material)
9. [Relatórios Semanais](#9-relatórios-semanais)
10. [Telegram MCP — Entrada de Campo](#10-telegram-mcp--entrada-de-campo)
11. [Agente Comercial](#11-agente-comercial)
12. [Agente de Orçamento e Proposta](#12-agente-de-orçamento-e-proposta)
13. [Fluxo de Vida do Cliente](#13-fluxo-de-vida-do-cliente)
14. [Claude Code + CodeClaw — Desenvolvimento Autônomo](#14-claude-code--codeclaw--desenvolvimento-autônomo)
15. [NotebookLM — Árbitro Técnico](#15-notebooklm--árbitro-técnico)
16. [Ecossistema de IAs](#16-ecossistema-de-ias)
17. [Roadmap de Autonomia](#17-roadmap-de-autonomia)
18. [Decisões Travadas](#18-decisões-travadas)
19. [Estado Atual](#19-estado-atual)
20. [Identidade Visual e Dados da Empresa](#20-identidade-visual-e-dados-da-empresa)
21. [Protocolos Operacionais](#21-protocolos-operacionais)
22. [SLA dos Agentes](#22-sla-dos-agentes)
23. [Anti-Padrões](#23-anti-padrões)
24. [Mapa de Resiliência](#24-mapa-de-resiliência)
25. [Glossário](#25-glossário)
26. [Changelog](#26-changelog)

---

## 1. Marco Histórico

```
31 de março de 2026
Após 4 semanas de construção contínua, o DEKA OS atingiu
seu ponto de maturidade arquitetural. Este é o dia em que
o projeto passou de ferramenta para sistema nervoso da operação.
```

### O que foi construído nas 4 semanas anteriores

- Cockpit HTML single-file (~19.800 linhas, v48+) com sync Supabase
- Agente financeiro com 98,5% de precisão na categorização automática
- Arquitetura multi-arquivo com módulos lazy-load em `assets/modulos/`
- 6 tabelas Supabase: `obras`, `obra_servicos`, `obra_snapshots`, `obra_pendencias`, `obra_visitas`, `obra_fotos`
- Pipeline de IA: Claude → NotebookLM → Claude Code
- Auditoria completa da plataforma Vobi (1.709 chamadas de API capturadas e analisadas)
- Diagrama de ecossistema com 7 camadas de operação validadas
- Definição dos 4 níveis de autonomia e roadmap para operação autônoma
- Agente comercial, agente de orçamento e fluxo completo de vida do cliente arquitetados

### O que muda a partir de hoje

- O DEKA OS não é mais um projeto pessoal — é a infraestrutura da empresa
- Toda decisão de desenvolvimento passa pelo protocolo deste documento
- O Brain assume progressivamente funções operacionais
- A meta é o Nível 4 de autonomia: você como dono, o Brain como gestor

---

## 2. Visão e Propósito

O DEKA OS é o sistema operacional da Berti Construtora — não um software de gestão, mas a inteligência que conecta cada lead, cada obra, cada real e cada decisão em um único organismo que aprende e evolui com o tempo.

### O que nos diferencia de qualquer SaaS

| Dimensão | SaaS genérico (ex: Vobi) | DEKA OS |
|---|---|---|
| **Dados** | Acumula dados | Acumula inteligência |
| **Aprendizado** | Zero — reinicia sempre | Cresce com cada obra |
| **Integração** | Módulos isolados | `obra_id` conecta tudo |
| **IA** | Nenhuma | Brain como gestor operacional |
| **Financeiro** | Por projeto, sem DRE | Por obra + empresa + DRE automático |
| **Memória** | Sem histórico inteligente | Obsidian vault — memória longa |
| **Evolução** | Depende do fornecedor | CodeClaw — sistema se auto-aprimora |
| **Comercial** | Manual | Agente qualifica, acompanha e converte |
| **Orçamento** | Manual | Agente orçamentista com SINAPI integrada |
| **Proposta** | Template manual | Gerada automaticamente em HTML Berti |
| **Contrato** | Manual | Gerado ao fechamento, dispara onboarding |
| **Custo** | Mensalidade crescente | Infraestrutura própria, custo fixo |

---

## 3. Stack Técnica

### Infraestrutura

| Camada | Tecnologia | Função |
|---|---|---|
| **Frontend** | HTML + CSS + JS (single-file) | Cockpit, Relatórios, Comercial, Brain, Hub |
| **Backend** | Supabase (PostgreSQL) | Fonte única de verdade — todas as tabelas |
| **IA Central** | Claude Sonnet 4.6 | Brain — orquestrador e tomador de decisão |
| **IA Dev** | Claude Code + CodeClaw | Desenvolvimento e deploy autônomo |
| **Proxy API** | Cloudflare Worker | `anthropic-proxy.berti-b52.workers.dev` |
| **Hospedagem** | GitHub Pages | `evandroduarte-deka/deka-os` |
| **Automação** | N8N | Webhooks, cron jobs, orquestração |
| **Memória Longa** | Obsidian vault | Conhecimento persistente entre obras |
| **Entrada Mobile** | Telegram MCP | Campo → Brain sem intermediário |
| **Transcrição** | Whisper / TurboScribe | Áudio de campo → texto estruturado |
| **Referência** | NotebookLM | Consulta opcional — substituído pelo MASTER.md no Claude |
| **Fotos** | ImgBB API | Zero base64 em localStorage |
| **Financeiro** | agente-financeiro.html | 98,5% precisão categorização automática |
| **CI/CD** | GitHub Actions | Deploy automático após PR aprovado |
| **Análise visual** | Gemini Vision | Análise de plantas e projetos PDF |
| **Pesquisa real-time** | Perplexity API | Preços de mercado, normas, legislação |
| **Base de serviços** | Base_de_Dados_v5.xlsx → Supabase | 162 serviços · 28 categorias · referência primária de orçamento |
| **Preços oficiais** | SINAPI API | Base secundária de custos de obra |
| **Índices** | IBGE / INCC | Reajuste automático de contratos |
| **Voz (stand by)** | ElevenLabs | Alertas por áudio — implementação futura |

### Credenciais e endpoints ativos

```
ImgBB API Key:     588ec0d66fb7cefc2ee8aea196125c53
Cloudflare Worker: anthropic-proxy.berti-b52.workers.dev
GitHub:            evandroduarte-deka/deka-os
Supabase:          online e operacional
N8N:               online e operacional
```

---

## 4. Arquitetura Central — obra_id

> ⚠️ **DECISÃO IMUTÁVEL**
> A `obra` é a entidade central do DEKA OS. Todos os módulos —
> financeiro, tarefas, clientes, fotos, snapshots, compras, contratos —
> referenciam o mesmo `obra_id`. Esta decisão não pode ser revertida
> sem reescrever o sistema inteiro.

### Tabelas Supabase

| Tabela | Descrição | Campos-chave |
|---|---|---|
| `obras` | Entidade central — hub de tudo | `obra_id`, `slug`, `cliente_id`, `status`, `etapa` |
| `obra_servicos` | Serviços e progresso por obra | `obra_id`, `srv_cod`, `pct`, `custo_previsto`, `equipe` |
| `obra_snapshots` | Histórico semanal de progresso | `obra_id`, `semana`, `pct_geral`, `observacoes` |
| `obra_pendencias` | Tarefas e pendências por obra | `obra_id`, `descricao`, `responsavel`, `prazo`, `status` |
| `obra_visitas` | Diário de campo e visitas | `obra_id`, `data`, `texto`, `audio_url`, `autor` |
| `obra_fotos` | Registro fotográfico via ImgBB | `obra_id`, `url`, `descricao`, `data`, `etapa` |
| `obra_compras` | Compras de material por obra | `obra_id`, `item`, `valor`, `fornecedor`, `categoria` |
| `financeiro` | Lançamentos vinculados à obra | `obra_id`, `tipo`, `valor`, `categoria`, `data`, `status` |
| `financeiro_empresa` | Despesas fixas da Berti | `categoria`, `valor`, `data`, `conta_bancaria` |
| `clientes` | CRM — dados completos | `cliente_id`, `nome`, `cpf_cnpj`, `contato`, `historico` |
| `oportunidades` | Funil comercial | `cliente_id`, `valor`, `etapa`, `data`, `responsavel` |
| `contratos` | Contratos gerados ao fechamento | `obra_id`, `cliente_id`, `tipo`, `data`, `status` |
| `orcamentos` | Orçamentos por obra | `obra_id`, `servicos`, `materiais`, `bdi`, `total`, `versao` |

### Funções canônicas — nunca reescrever

```javascript
calcPctGeral()          // Progresso geral da obra — função única e canônica
state.snapshots[]       // Array canônico de histórico semanal
_prepararPayloadSync()  // Toda gravação no Supabase passa por aqui
sanitizeState()         // Toda entrada de dados passa por sanitização
```

> **Regra absoluta:** Qualquer nova feature que grava dados no Supabase
> DEVE passar por `_prepararPayloadSync()`. Sem exceção.

---

## 5. O Brain — Inteligência Operacional

O Brain não é um chatbot. É o sistema nervoso central do DEKA OS — o componente que lê todos os dados, raciocina sobre eles e age de volta no sistema. A diferença fundamental: **ele tem escrita, não só leitura.**

### O objeto obra_context

Antes de qualquer interação, o sistema monta um JSON consolidado:

```json
obra_context {
  obra:        { id, nome, cliente, etapa, status, datas },
  servicos:    [ { cod, nome, pct, custo_previsto, equipe } ],
  pendencias:  [ { descricao, responsavel, prazo, status } ],
  snapshots:   [ { semana, pct_geral, observacoes } ],
  visitas:     [ { data, texto, autor } ],
  fotos:       [ { url, descricao, etapa } ],
  compras:     [ { item, valor, fornecedor, categoria } ],
  financeiro:  { receitas, despesas, margem, proximo_vencimento },
  cliente:     { nome, contato, historico, contratos },
  obsidian:    { benchmarks_similares, licoes_aprendidas, fornecedores }
}
```

> O Brain não acessa o banco diretamente. Ele recebe este objeto pronto
> e raciocina em cima dele. Quanto mais completo, mais precisa a inteligência.

### O que o Brain faz

| Função | Descrição | Output |
|---|---|---|
| **Alerta proativo** | Detecta riscos antes que virem problemas | Notificação Telegram + pendência automática |
| **DRE automático** | Gera demonstrativo todo dia 1° às 8h | Relatório Telegram + gravação Supabase |
| **Relatório cliente** | Documento limpo sem códigos internos | HTML para envio |
| **Sugestão de decisão** | Próximo passo baseado no contexto da obra | Resposta estruturada no cockpit |
| **Fluxo de caixa** | Projeção de 60 dias com base em obras ativas | Visão de para-brisa no cockpit |
| **Escrita Obsidian** | Registra lições e benchmarks pós-obra | Nota .md no vault com tags |
| **Delegação CodeClaw** | Detecta gap, delega ao Claude Code | GitHub Issue automática |
| **Orquestração** | Coordena todos os agentes especializados | Fluxo de trabalho distribuído |

> ⚠️ **Regra crítica:** Relatórios para o cliente NUNCA expõem códigos
> internos (SRV/EQ/FOR), slugs ou IDs do sistema. O Brain sempre
> traduz para linguagem de negócio antes de gerar documentos externos.

---

## 6. Obsidian — Memória Longa

O Obsidian transforma o DEKA OS de um sistema que acumula dados em um sistema que acumula inteligência. Ele persiste o conhecimento entre obras, entre conversas, entre anos.

### Estrutura do vault

```
/vault/
  /obras/
    badida-parkshopping-2025.md      ← gerado automaticamente ao fechar
    croi-to-go-2024.md
    policlinicas-pinhais-2025.md
  /fornecedores/
    valdeci-demolicao.md             ← histórico, avaliação, pontos fortes
    claudinei-refrigeracao.md
    ademarcos-drywall.md
  /clientes/
    tmk-hebron.md                    ← histórico de relacionamento e obras
    luiz-henrique-kruger.md
  /benchmarks/
    reforma-comercial.md             ← custo/m² por tipo de obra
    reforma-residencial.md
    prazos-por-tipo.md
    materiais-por-categoria.md       ← custo médio de material por obra
  /decisoes/
    arquitetura-deka-2025.md         ← este documento
    protocolo-brain.md
  /aprendizados/
    erros-recorrentes.md
    o-que-nunca-fazer.md
    tecnicas-de-venda-validadas.md   ← o que funcionou no comercial
```

### Os 3 fluxos de alimentação

1. **Escrita automática:** ao fechar uma obra, o Brain gera nota com benchmarks, o que funcionou, o que falhou, equipe e cliente
2. **Escrita via Telegram:** você fala no campo, o Brain formata e grava no vault sem abrir o computador
3. **Leitura pelo Brain:** ao iniciar obra nova, o Brain busca notas com tags similares e incorpora no contexto

### O poder da memória acumulada

Após 20 obras registradas, o Brain responde com precisão:

- *"Obras em shopping têm 16% de estouro de prazo por aprovação de concessionária"*
- *"Fornecedor Claudinei/Domínio: melhor custo-benefício em refrigeração nas últimas 3 obras"*
- *"Custo/m² médio para reforma comercial em Curitiba: R$ 1.847"*
- *"Técnica de ancoragem de valor funciona melhor com clientes de reforma residencial acima de R$ 80k"*

---

## 7. Financeiro — Obra + Empresa + DRE

### Separação fundamental

| Financeiro por Obra | Financeiro Empresa |
|---|---|
| Receitas de medição por cliente | Pró-labore e distribuição de lucro |
| Pagamento de subcontratados | Salários fixos |
| Material de construção por projeto | Contador, endereço fiscal, planos |
| Margem e resultado por obra | DRE consolidado da Berti Construtora |
| Taxa de administração | Fluxo de caixa projetado — 60 dias |

### Regras de categorização — imutáveis

```
"HEBRON"        → receita · obra_badida · taxa_administracao
"REGINALDO"     → despesa · empresa · salario
"MCW PARTICIP"  → despesa · empresa · endereco_fiscal
"UNIMED"        → despesa · empresa · saude
PJ → PF         → distribuicao_prolabore
Confiança < 90% → fila de revisão humana → confirma → vira regra permanente
```

### Outputs autônomos do agente financeiro

1. DRE mensal automático — gerado e enviado via Telegram todo dia 1° às 8h
2. Projeção de 60 dias — visão de para-brisa com alertas de saldo negativo
3. Alerta de vencimentos — 3 dias antes de qualquer conta
4. Relatório financeiro por obra — para o cliente, sem códigos internos
5. Análise de margem por tipo de obra — alimenta o Obsidian

> ⚠️ **Regra estratégica:** Dívidas: sempre usar estratégia Bola de Neve.
> Nunca renegociar. Sempre amortizar/quitar antecipadamente.

---

## 8. Módulo de Compras de Material

Todo material comprado para uma obra é dado operacional e financeiro ao mesmo tempo. O módulo fecha o loop entre o que foi orçado, o que foi comprado e o que foi gasto.

### Entrada via Telegram

```
Você (campo):  "Comprei 10 sacos de argamassa R$340 
                para Badida, fornecedor Leroy Merlin"
        ↓
Brain:          categoriza → vincula ao obra_id
                → registra como despesa
                → atualiza resultado da obra
                → grava em obra_compras
```

### Tabela obra_compras

| Campo | Tipo | Descrição |
|---|---|---|
| `obra_id` | FK → obras | Vínculo obrigatório com a obra |
| `data` | date | Data da compra |
| `descricao` | text | O que foi comprado |
| `quantidade` | numeric | Quantidade e unidade |
| `valor_total` | numeric | Valor total pago |
| `fornecedor` | text | Nome do fornecedor |
| `categoria` | text | Categoria do material |
| `nota_fiscal` | text | NF ou cupom fiscal (opcional) |
| `origem` | text | telegram · cockpit · manual |

### Categorias de material

| Categoria | Exemplos |
|---|---|
| `material_estrutural` | cimento, argamassa, bloco, ferro, concreto |
| `material_hidraulico` | tubos, conexões, registros, caixas d'água |
| `material_eletrico` | fios, disjuntores, tomadas, eletrodutos |
| `material_acabamento` | cerâmica, rejunte, tinta, massa corrida, gesso |
| `material_esquadria` | portas, janelas, vidros, ferragens |
| `material_outros` | EPI, ferramentas consumíveis, itens avulsos |
| `servico_terceiro` | subempreitadas contratadas por compra |

### Outputs automáticos

- Relatório de compras por obra — gasto por categoria vs orçado
- Alerta de estouro: compras acima de 110% do orçado por categoria
- Ranking de fornecedores — melhor preço, frequência, confiabilidade
- Exportação para contador — lista com NF agrupada por competência
- Custo médio de material por m² por tipo de obra → Obsidian

---

## 9. Relatórios Semanais

### Relatório para o cliente — toda sexta às 17h

> Gerado automaticamente · preview via Telegram para aprovação ·
> você aprova ou edita antes do envio · enviado via WhatsApp ou e-mail

| Seção | Conteúdo | Fonte |
|---|---|---|
| Progresso geral | Percentual com barra visual | `calcPctGeral()` |
| O que foi feito | Serviços executados na semana | `obra_visitas` + `obra_servicos` |
| Fotos da semana | Galeria de até 6 fotos relevantes | `obra_fotos` (ImgBB) |
| Materiais comprados | Lista de compras sem valores internos | `obra_compras` |
| Pendências resolvidas | Itens concluídos desde o último relatório | `obra_pendencias` |
| Próximos passos | O que acontece na próxima semana | Brain + `obra_servicos` |
| Situação financeira | Resumo de medições e pagamentos (se autorizado) | `financeiro` |

### Relatório operacional interno — toda segunda

- Status de cada obra ativa: % progresso, desvio de prazo, desvio de custo
- Tarefas atrasadas em qualquer obra — com responsável e dias de atraso
- Compras da semana anterior — total por obra e por categoria
- Receitas e despesas previstas para os próximos 7 dias
- Alertas do Brain — riscos identificados em qualquer obra

### Fluxo de aprovação

```
Sexta 17h → Brain gera rascunho HTML
          → Preview enviado no Telegram
          → Você: "Aprovar" ou "Editar"
          → Brain envia ao cliente com assinatura Berti
          → Supabase grava histórico de relatórios enviados
```

---

## 10. Telegram MCP — Entrada de Campo

O Telegram resolve o maior problema operacional: você está no campo, sem tempo de abrir o computador. A voz vira dado estruturado em menos de 10 segundos.

### Fluxo de processamento

```
Você (voz/foto/texto)
        ↓
Telegram Bot
        ↓
N8N (orquestra)
        ↓
Whisper (transcrição de áudio)
        ↓
Brain (interpreta + estrutura + roteia)
        ↓
Supabase (grava na tabela certa) + Obsidian (se for conhecimento)
```

### Comandos que o Brain reconhece

| Tipo | Exemplo | O que o Brain faz |
|---|---|---|
| Diário de campo | *"Valdeci finalizou demolição. Claudinei chega amanhã 8h."* | Cria visita + marca serviço + cria pendência |
| Foto + legenda | Foto com *"problema na tubulação parede B"* | Vision analisa + cria pendência + alerta |
| Comando direto | *"Marca revestimento Badida como 80% concluído"* | Atualiza `obra_servicos` + recalcula progresso |
| Consulta | *"Quanto falta receber da Hebron?"* | Consulta financeiro + responde no Telegram |
| Input Obsidian | *"Anotar: Marcos Azulegista fez retrabalho, 3 dias de atraso"* | Formata + grava em `/vault/fornecedores/` |
| Extrato bancário | CSV: *"extrato nubank março"* | Agente financeiro processa e categoriza |
| Compra de material | *"Comprei argamassa R$340 Badida Leroy Merlin"* | Grava em `obra_compras` + atualiza financeiro |

### Por que Telegram e não WhatsApp

| | Telegram | WhatsApp |
|---|---|---|
| API de bot | Aberta, gratuita, estável | Restrita, paga, instável |
| MCP nativo | Sim | Não |
| Custo | Zero | Por mensagem |

> WhatsApp continua como canal com clientes e equipe.
> Telegram é o canal de comando do sistema — só seu.

---

## 11. Agente Comercial

O agente comercial opera em três frentes simultâneas: qualificação de leads, acompanhamento ativo da venda e geração de contratos no fechamento.

### 11.1 Filtragem e qualificação de leads

Todo contato recebido — WhatsApp, Instagram, indicação, site — passa pelo agente antes de chegar em você.

| Tipo de contato | O que o agente faz |
|---|---|
| Lead qualificado | Abre oportunidade no funil, agenda visita, notifica você |
| Solicitação de orçamento | Coleta informações básicas, alimenta agente de orçamento |
| Dúvida genérica | Responde automaticamente com base no FAQ da Berti |
| Spam / irrelevante | Arquiva e registra sem notificar |
| Fornecedor | Encaminha para cadastro de fornecedores no Supabase |

### 11.2 Acompanhamento do processo de venda

> O agente não fecha vendas por você — ele garante que nenhum lead
> esfrie por falta de followup.

**Técnicas aplicadas:**
- SPIN Selling para levantamento de necessidades reais
- Ancoragem de valor antes da apresentação de preço
- Urgência real baseada em agenda e disponibilidade de equipe
- Perguntas de qualificação progressivas sem pressão
- Registro de objeções e sugestão de abordagem para cada caso

**O que o agente monitora:**
- Tempo sem resposta do lead → sugere retomada com abordagem nova
- Objeção de preço detectada → sugere comparativo de valor, não desconto
- Lead "esfriando" → alerta você com contexto completo da conversa
- Lead pronto para fechar → notifica você com resumo executivo

### 11.3 Contratos — gerados ao fechamento

O contrato não é gerado durante a venda. Ele é o **gatilho de entrada no ecossistema** — gerado apenas quando o cliente aceita a proposta.

**Tipos de contrato gerados:**
- Contrato de prestação de serviços com o cliente final
- Contrato de execução com equipes e subempreiteiros

**Dados coletados pelo agente para geração:**
- CPF/CNPJ, endereço completo, dados do imóvel
- Escopo aprovado no orçamento
- Cronograma e forma de pagamento acordados

> Até o fechamento, o cliente não tem cadastro completo no sistema.
> Os dados pessoais são coletados apenas ao assinar o contrato.

---

## 12. Agente de Orçamento e Proposta

O agente de orçamento é um especialista autônomo — não passa pelo Brain geral. Ele é o **orçamentista da Berti**, com acesso à base de dados de serviços, à SINAPI e ao histórico de obras do Obsidian.

### 12.1 Fluxo completo de orçamentação

```
ENTRADA
  Você envia: projeto PDF/planta + narrativa verbal do escopo
        ↓
ANÁLISE
  Gemini Vision extrai do projeto:
    ambientes · metragens identificadas · sistemas visíveis
        ↓
  Agente identifica o que falta:
    "Área de revestimento do banheiro não identificada.
     Informe manualmente ou descreva verbalmente."
        ↓
LEVANTAMENTO DE QUANTITATIVOS
  Você completa via conversa:
    metragens faltantes · especificações · padrão de acabamento
        ↓
  Agente calcula e apresenta quantitativos para conferência:
    "Revestimento banheiro: 24m² · Pintura paredes: 86m²"
        ↓
COMPOSIÇÃO DO ORÇAMENTO
  1ª referência → Base_de_Dados_v5.xlsx no Supabase
                   (162 serviços · 28 categorias · valores validados da Berti)
  2ª referência → SINAPI (flag: "valor SINAPI — validar BDI")
  Perplexity   → Pesquisa de preços de mercado quando necessário
        ↓
  Agente aplica:
    BDI sobre itens de terceiros
    Percentual de administração
    Equalização final do orçamento
        ↓
COMPOSIÇÃO DO DOCUMENTO
  · Escopo detalhado de serviços
  · Previsão de custos de execução
  · Previsão de desembolso do cliente (cronograma financeiro)
  · Cronograma de obra (fases e prazos)
  · Variações e alertas SINAPI documentados
        ↓
GERAÇÃO DA PROPOSTA
  HTML com identidade visual Berti — enviável direto
    Quem somos · Como trabalhamos
    Escopo aprovado · Valores · Cronograma
    Previsão de desembolso · Próximos passos
        ↓
  Você agenda a apresentação e envia
```

### 12.2 Hierarquia de referência de preços

```
1° Base Supabase (obra_servicos histórico)
   ↓ item não encontrado
2° SINAPI API (com flag de alerta para validação de BDI)
   ↓ item muito específico
3° Perplexity (pesquisa de mercado em tempo real)
   ↓ sempre
Aplicação de BDI + percentual de administração da Berti
```

### 12.3 Proposta em HTML Berti

> Gamma.app descartado. A proposta é gerada em HTML com identidade
> visual padronizada da Berti — enviável via link ou convertível para PDF.
> Sem dependência de plataforma externa.

**Estrutura da proposta:**
1. Apresentação da Berti Construtora
2. Como trabalhamos — processo e comunicação
3. Escopo detalhado da obra
4. Cronograma de execução
5. Previsão de desembolso (cronograma financeiro do cliente)
6. Investimento total
7. Próximos passos

---

## 13. Fluxo de Vida do Cliente

Este é o fluxo completo — do primeiro contato até o relatório pós-obra no Obsidian. Um único fio condutor sem retrabalho de cadastro, sem dado perdido, sem transição manual.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
① LEAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Mensagem recebida (WhatsApp / Instagram / indicação)
          ↓
  Agente comercial filtra e qualifica
          ↓
  Abre oportunidade no funil comercial (Supabase)
          ↓
  Notifica você com resumo e sugestão de abordagem

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
② VENDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agente acompanha com técnicas de venda
          ↓
  Você recebe projeto / briefing do cliente
          ↓
  Agente de orçamento gera orçamento completo
          ↓
  Proposta HTML Berti gerada automaticamente
          ↓
  Você apresenta e negocia

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
③ FECHAMENTO — gatilho de entrada no ecossistema
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Cliente aceita a proposta
          ↓
  Agente coleta dados pessoais completos
  (CPF/CNPJ, endereço, dados do imóvel)
          ↓
  Agente gera contrato cliente + contrato equipe
          ↓
  Assinatura confirmada

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
④ ONBOARDING AUTOMÁTICO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Agente cadastra o cliente no Supabase
  Agente cria a obra com obra_id único
  Agente cadastra o orçamento aprovado
  Agente vincula: cliente + obra + orçamento + contrato
          ↓
  Brain gera narrativa inicial da obra:
    · Tipo de projeto e principais características
    · Equipe sugerida com base no histórico Obsidian
    · Cronograma base com pontos de atenção
    · Riscos identificados para este tipo de projeto
    · Abordagem recomendada para este cliente específico

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⑤ EXECUÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Ecossistema DEKA OS opera normalmente:
    Diário de campo via Telegram
    Compras de material categorizadas
    Relatórios semanais automáticos
    Financeiro vinculado ao obra_id
    Brain monitorando e alertando

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⑥ ENTREGA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Relatório final de obra para o cliente
  Acerto financeiro completo
  Documentação entregue

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⑦ PÓS-OBRA — fechamento do ciclo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Brain gera nota automática no Obsidian:
    · Benchmarks: custo/m², prazo real vs previsto, margem
    · O que funcionou: equipe, fornecedores, processo
    · O que falhou: imprevistos, retrabalhos, atrasos
    · Avaliação de fornecedores e subcontratados
    · Perfil do cliente para referência futura
          ↓
  Próxima obra começa mais inteligente que a anterior
```

---

## 14. Claude Code + CodeClaw — Desenvolvimento Autônomo

O CodeClaw transforma o DEKA de um projeto que você desenvolve para um sistema que **se desenvolve**.

### Ciclo autônomo de desenvolvimento

| Etapa | Ator | O que acontece |
|---|---|---|
| 1. Detecção | Brain | Identifica gap ou bug na operação |
| 2. Issue | Brain → GitHub | Abre Issue documentando problema e solução sugerida |
| 3. Execução | Claude Code | Lê MASTER.md + código → implementa → abre PR |
| 4. Validação | NotebookLM | Verifica conflito com decisões do MASTER.md |
| 5. Aprovação | Você | Revisa o PR — aprova ou rejeita com comentário |
| 6. Deploy | GitHub Actions | Merge no main → deploy automático em < 2 minutos |
| 7. Confirmação | Brain | Verifica que funções críticas continuam operando |
| 8. Registro | Obsidian | Grava: "deploy v52 — funcionalidade X — data" |

### Guardrails — o que impede o sistema de se destruir

- Claude Code **nunca** commita direto no `main` — sempre PR
- PR bloqueado automaticamente se conflitar com MASTER.md
- Rollback automático se função crítica falhar após deploy
- Claude Code opera apenas nos arquivos do repositório `deka-os`

### Protocolo de desenvolvimento — regras imutáveis

1. Entender o problema real antes de qualquer código
2. Verificar se já existe algo similar — nunca duplicar
3. Implementar com mínimo de linhas novas possível
4. Validar sintaxe: chaves, backticks, fechamentos
5. Verificar impacto em `_prepararPayloadSync()` e `sanitizeState()`
6. Entregar arquivo completo pronto — nunca snippets para colar

---

## 15. NotebookLM — Referência de Arquitetura

> **Decisão tomada em 31/03/2026:** O papel de árbitro técnico é exercido
> pelo MASTER.md lido diretamente no Claude — não pelo NotebookLM.
> O Claude Code lê este documento antes de qualquer execução.
> O NotebookLM permanece disponível como referência complementar,
> especialmente útil se o projeto crescer e envolver outras pessoas.

### Papel atual — referência, não gate obrigatório

O NotebookLM pode ser consultado como segunda opinião em decisões complexas, mas não é etapa obrigatória do fluxo de desenvolvimento. O MASTER.md no Claude cobre essa função com mais contexto e menos fricção.

### Quando pode ser útil

| Situação | Uso sugerido |
|---|---|
| Dúvida complexa de arquitetura | Consulta complementar ao Claude |
| Onboarding de colaborador futuro | Fonte de referência para novos membros |
| Auditoria externa do projeto | Documentação consultável por terceiros |
| Conflito entre duas decisões antigas | Segunda opinião imparcial |

### Fontes recomendadas caso use

- `MASTER.md` — este documento
- Schema completo do Supabase
- Changelog de versões
- Código dos módulos principais

---

## 16. Ecossistema de IAs

### IAs ativas no ecossistema

| IA | Função | Status |
|---|---|---|
| **Claude Sonnet 4.6** | Brain — orquestrador central | ✅ Ativo |
| **Claude Code** | Desenvolvimento autônomo via CodeClaw | ✅ Ativo |
| **Whisper / TurboScribe** | Transcrição de áudio de campo | ✅ Ativo |
| **NotebookLM** | Referência de arquitetura — papel assumido pelo MASTER.md no Claude | ⚠️ Referência |
| **N8N** | Orquestração de automações e webhooks | ✅ Ativo |
| **Gemini Vision** | Análise de plantas e projetos PDF | ✅ Confirmado |
| **Perplexity API** | Pesquisa de preços e normas em tempo real | ✅ Confirmado |
| **SINAPI API** | Base secundária de preços de obra (governo federal) | ✅ Confirmado |
| **IBGE / INCC** | Índices para reajuste automático de contratos | ✅ Confirmado |
| **ElevenLabs** | Alertas por áudio sintetizado | ⏸ Stand by |
| **ChatGPT o3** | Argumentação comercial e estrutura de proposta | ⚠️ Ferramenta pessoal |

### Hierarquia de orquestração

```
Brain (Claude Sonnet)          ← orquestrador central
    ↓ delega por especialidade
    ├── Agente Comercial        ← qualificação e venda
    ├── Agente de Orçamento    ← levantamento e proposta
    ├── Agente Financeiro      ← categorização e DRE
    ├── Claude Code            ← desenvolvimento autônomo
    ├── Gemini Vision          ← análise de projetos
    ├── Perplexity             ← pesquisa em tempo real
    └── ChatGPT o3             ← argumentação comercial e proposta
    
Obsidian                       ← memória longa de todos os agentes
NotebookLM                     ← árbitro técnico independente
N8N                            ← orquestrador de automações
```

### SINAPI — como integrar

```
Base primária:  Base_de_Dados_v5.xlsx → Supabase (162 serviços · 28 categorias · valores validados Berti)
Base SINAPI:    Consulta via API quando item não está na base primária
Flag obrigatória: todo item da SINAPI recebe flag "SINAPI — validar BDI"
BDI aplicado:   percentual padrão Berti sobre itens SINAPI
Resultado:      orçamento equalizado com rastreabilidade de fonte
```

---

## 17. Roadmap de Autonomia

| Nível | Nome | O que o sistema faz | Você faz | Prazo |
|---|---|---|---|---|
| **1** | Coleta | Processa dados, categoriza, alerta | Opera e decide tudo | ← AGORA |
| **2** | Sugestão | Sugere decisões fundamentadas | Aprova ou rejeita | Q2 2026 |
| **3** | Execução | Executa tarefas rotineiras autonomamente | Aprova apenas o crítico | Q3 2026 |
| **4** | Gestão | Gerencia a operação com autonomia total | Define estratégia e visão | META |

> **A META — Nível 4**
> Brain como gestor operacional da Berti Construtora.
> Você como dono: define a direção, fecha contratos, cuida dos relacionamentos.
> O sistema: executa, controla, aprende, melhora — sem intervenção manual no dia a dia.

---

## 18. Decisões Travadas

> Estas decisões não podem ser revertidas sem consenso explícito
> e atualização deste documento.

| Decisão | O que foi decidido | Data |
|---|---|---|
| Entidade central | `obra_id` como chave universal em todos os módulos | 31/03/2026 |
| `obra_context` | JSON consolidado alimenta o Brain — ele não acessa o banco | 31/03/2026 |
| Brain com escrita | O Brain grava de volta no Supabase — não só leitura | 31/03/2026 |
| Financeiro vinculado | Financeiro e comercial usam o mesmo `obra_id` | 31/03/2026 |
| Proposta em HTML | Gamma.app descartado — proposta gerada em HTML Berti | 31/03/2026 |
| Contrato como gatilho | Dados pessoais coletados apenas ao fechamento | 31/03/2026 |
| SINAPI como secundária | Base Supabase é primária — SINAPI é secundária com flag | 31/03/2026 |
| Fotos via ImgBB | Zero base64 em localStorage — sempre ImgBB API | Anterior |
| `calcPctGeral()` | Função canônica única — nunca duplicar ou substituir | Anterior |
| Relatórios limpos | Nunca expor SRV/EQ/FOR em documentos de cliente | Anterior |
| Single-file cockpit | HTML único no GitHub Pages — não migrar para framework | Anterior |
| Bola de Neve | Estratégia única para dívidas — nunca renegociar | Anterior |
| Módulos máx 400 linhas | Cada módulo em `assets/modulos/` tem limite de 400 linhas | Anterior |
| ElevenLabs stand by | Registrado mas não implementado — TDAH incompatível com áudio | 31/03/2026 |

---

## 19. Estado Atual

> ⚠️ **Seção dinâmica — atualizada automaticamente pelo Brain.**
> Trigger: todo domingo às 07h via N8N · ou manualmente via Telegram: "Brain, atualiza estado atual"
> Preenchimento manual apenas como fallback se N8N estiver offline.

### 19.1 Obras ativas

| Nome da Obra | Cliente | Etapa | Progresso | Previsão término |
|---|---|---|---|---|
| — | — | — | — | — |

### 19.2 Situação financeira

| Conta | Saldo | Atualizado em |
|---|---|---|
| NuBank PJ | — | — |
| Outras | — | — |
| **TOTAL** | **—** | — |

### 19.3 Oportunidades em andamento

| Lead | Etapa do funil | Valor estimado | Próxima ação |
|---|---|---|---|
| — | — | — | — |

---

## 20. Identidade Visual e Dados da Empresa

| Elemento | Valor |
|---|---|
| **Empresa** | Berti Construtora LTDA |
| **CNPJ** | 59.622.624/0001-93 |
| **Resp. Técnica** | Jéssica Berti Martins — CAU A129520-9 |
| **Telefone** | (41) 9183-6651 |
| **Verde escuro** | `#1A3A2A` — cor primária Berti |
| **Ouro** | `#9A7B3A` — cor secundária relatórios |
| **Azul marinho** | `#0D1F3C` — relatórios opção B2 |
| **Tipografia** | Barlow Condensed — relatórios client-facing |
| **Tom documentos** | Consultoria técnica · terceira pessoa · sem jargão interno |
| **Relatórios cliente** | Nunca expõem códigos internos (SRV/EQ/FOR) |

> ✅ Cores confirmadas por Evandro Luiz Duarte em 31/03/2026.

---

## 21. Protocolos Operacionais

### 21.1 Protocolo de debug

Ao reportar qualquer bug, sempre informar:

1. Versão do cockpit
2. Dispositivo e browser
3. Screenshot ou mensagem do console
4. O que foi feito antes do problema aparecer

> **Regra:** Nunca recriar o arquivo inteiro. Sempre localizar a função,
> corrigir com `str_replace`, validar chaves, entregar `cockpit_vXX.html`.

### 21.2 Protocolo de nova feature

1. Consultar o MASTER.md no Claude: existe algo similar? Conflita com decisão já tomada?
2. Definir qual tabela Supabase recebe os dados — com `obra_id`
3. Implementar mínimo de linhas — sem módulos desnecessários
4. Validar impacto em `_prepararPayloadSync()` e `sanitizeState()`
5. Abrir PR no GitHub — nunca commitar direto no `main`
6. Atualizar este MASTER.md com a nova decisão

### 21.3 Rotina diária com o DEKA

- **Campo:** áudios no Telegram → Brain processa → tudo gravado automaticamente
- **Fim do dia:** revisão do cockpit (5 minutos) — não processamento de dados
- **Todo dia 1°:** DRE automático no Telegram às 8h — você lê e age
- **3 dias antes de vencimento:** alerta automático no Telegram
- **Toda segunda:** relatório operacional interno com visão de todas as obras
- **Toda sexta:** relatório de cliente gerado e enviado para aprovação
- **Ao fechar obra:** Brain gera nota Obsidian — benchmarks atualizados

### 21.4 Princípio fundamental

> **Menos cliques no campo → melhor entrega ao cliente.**
> Nunca inventar módulo que não resolve problema real.
> Nunca criar complexidade onde cabe simplicidade.
> O sistema existe para libertar, não para prender.

---

## 22. SLA dos Agentes

> Tempos máximos aceitáveis de resposta por tipo de operação.
> Se ultrapassar, o sistema informa o usuário e registra o evento.
> Confirmado por Evandro em 31/03/2026.

| Operação | SLA máximo | Comportamento se ultrapassar | Fallback |
|---|---|---|---|
| **Entrada via Telegram** (campo) | 15 segundos | Toast: "Processando... aguarde" | Salva texto bruto, processa IA depois |
| **Brain — consulta simples** | 45 segundos | Spinner + mensagem de espera | Resposta parcial com dados do cache |
| **Brain — obra_context completo** | 45 segundos | Barra de progresso por etapa | Contexto reduzido sem histórico Obsidian |
| **Geração de relatório** | 90 segundos | Steps visuais de progresso | Rascunho parcial para revisão manual |
| **Agente financeiro — categorização** | 30 segundos | Queue — processa em background | Flag "aguardando categorização" |
| **Agente de orçamento** | 120 segundos | Progresso por fase | Orçamento parcial com itens pendentes sinalizados |
| **Deploy (GitHub Actions)** | 2 minutos | Log visível no GitHub | Rollback automático se health check falhar |
| **Sync Supabase** | 15 segundos | Retry automático 3x com backoff | Salva local + sync quando reconectar |

---

## 23. Anti-Padrões

> O que nunca fazer. Cada item tem contexto real de por que existe.
> Estes erros foram vividos — não são teóricos.

### ❌ Anti-padrão 1 — base64 para armazenamento de fotos
**O que aconteceu:** Fotos de obra convertidas para base64 e salvas no localStorage. Com 3 obras simultâneas e 15+ fotos cada, o limite de 5MB foi atingido e o cockpit travou completamente — sem mensagem de erro clara.
**Decisão:** ImgBB API para todas as fotos. Zero base64 no sistema. Nunca.
**Regra:** `obra_fotos.url` armazena apenas a URL do ImgBB. Se vier base64, rejeitar antes de salvar.

### ❌ Anti-padrão 2 — try/catch silencioso
**O que aconteceu:** Um catch vazio fez o sistema aparentar funcionar normalmente enquanto falhava silenciosamente por dias. O dado não era salvo no Supabase, mas a UI não mostrava erro. O problema foi descoberto quando o cliente perguntou sobre informações que não estavam no relatório.
**Decisão:** Todo catch obrigatoriamente chama `console.error` + `showToast`. Sem exceção.
**Regra:** Claude Code rejeita qualquer PR com catch silencioso — bloqueio automático de deploy.

### ❌ Anti-padrão 3 — commit direto no main
**O que aconteceu:** Uma edição "rápida" feita diretamente na branch main quebrou uma função crítica em produção. Sem PR, sem validação prévia. Rollback manual com risco de perda de dados.
**Decisão:** Branch protection ativa. Claude Code nunca commita no main. Sempre PR.
**Regra:** Se não tem PR, não existe. GitHub Actions bloqueia deploy direto no main.

### ❌ Anti-padrão 4 — arquivo monolítico sem limite de tamanho
**O que aconteceu:** O cockpit cresceu para 19.800 linhas em um único arquivo. Debugar uma função exigia busca em todo o arquivo. Qualquer edição tinha risco de quebrar seções não relacionadas. O Claude Code perdia contexto do início ao chegar no final.
**Decisão:** Módulos máximo 400 linhas em `assets/modulos/`. Lazy loading obrigatório.
**Regra:** Arquivo acima de 400 linhas em módulos = Claude Code divide antes de continuar.

---

## 24. Mapa de Resiliência

> O que acontece quando cada componente falha.
> Define o comportamento esperado do sistema em modo degradado.

| Componente | Se falhar | Impacto | Comportamento esperado | Recovery |
|---|---|---|---|---|
| **Supabase** | Offline | Crítico | Cache localStorage serve dados por até 10min · Toast de aviso · Modo somente leitura | Reconecta automaticamente · Sync pendente ao voltar |
| **Cloudflare Worker** | Offline | Alto | Cockpit funciona sem IA · Formulários manuais disponíveis | Retry com backoff exponencial (3 tentativas) |
| **N8N** | Offline | Alto | Agentes param · Relatórios não gerados · Telegram não processa | Fila acumula · Processa quando voltar |
| **Telegram Bot** | Offline | Médio | Cockpit web funciona · Campo sem captura automática | Re-processar áudios manualmente |
| **ImgBB** | Offline | Médio | Texto e dados salvam · Foto não sobe · Toast de aviso | Retry manual ou upload posterior |
| **GitHub Pages** | Offline | Alto | Sistema inacessível · Dados seguros no Supabase | Deploy automático quando voltar |
| **Brain (Claude API)** | Offline | Médio | Modo manual · Formulários funcionam · Sem IA | Retry com backoff · Haiku como fallback |
| **Obsidian** | Offline | Baixo | Brain opera sem contexto histórico · Qualidade reduz | Sync manual quando vault voltar |
| **SINAPI API** | Offline | Baixo | Agente usa apenas base Supabase · Flag de aviso | Consulta manual na tabela SINAPI online |

---

## 25. Glossário

> Termos com significado específico dentro do DEKA OS.
> Leitura obrigatória antes de qualquer sessão de desenvolvimento.

| Termo | Definição |
|---|---|
| **obra_id** | UUID único gerado no fechamento do contrato. Chave que conecta todos os módulos. Sem obra_id, nenhum dado é válido. |
| **obra_context** | Objeto JSON consolidado com todos os dados de uma obra. É o que o Brain recebe — não acessa o banco diretamente. |
| **Brain** | Claude Sonnet atuando como orquestrador central. Lê, raciocina, delega e grava de volta no Supabase. |
| **AGT_** | Prefixo de agente especializado. Ex: AGT_BRAIN, AGT_WHATSAPP, AGT_RELATORIO. Cada AGT tem domínio único. |
| **BDI** | Benefícios e Despesas Indiretas. Percentual aplicado sobre itens de terceiros e SINAPI para equalizar o orçamento. |
| **calcPctGeral()** | Função canônica de cálculo de progresso geral da obra. Uma única instância — nunca duplicar. |
| **_prepararPayloadSync()** | Função canônica de gravação no Supabase. Todo dado que sai do frontend passa por ela. |
| **sanitizeState()** | Garante migração e sanitização de dados legados antes de qualquer processamento. |
| **Padrão Berti** | Tom de comunicação: consultoria técnica, terceira pessoa, sem jargão interno, foco em progresso visível. |
| **SRV / EQ / FOR** | Códigos internos de serviço, equipe e fornecedor. Nunca aparecem em documentos de cliente. |
| **CodeClaw** | Ciclo autônomo: Brain detecta gap → Claude Code implementa → valida → deploy automático. |
| **Bola de Neve** | Estratégia imutável para dívidas: menor primeiro, nunca renegociar, quitar antecipadamente. |
| **X-Deka-Token** | Header de autenticação em toda chamada ao Cloudflare Worker. Nunca exposto no frontend. |
| **DEKA_CONFIG** | Objeto `window.DEKA_CONFIG` com credenciais. Campos: `supabaseUrl`, `supabaseAnonKey`, `workerUrl`, `token`. |
| **cacheGet / cacheSet** | Funções canônicas de cache versionado com TTL. Prefixo `deka_cache_v2_`. Nunca usar localStorage diretamente. |
| **fetchComTimeout** | Wrapper de fetch com AbortController. Timeout padrão 15s. Todo fetch usa esta função. |
| **Nível 4** | Meta de autonomia: Brain como gestor operacional, Evandro como dono estratégico. |
| **Gatilho de entrada** | Assinatura do contrato — momento que dispara o onboarding automático completo. |

---

## 26. Changelog

> Registro imutável de todas as decisões arquiteturais.
> Cada entrada: o que mudou, por que mudou, o que foi descartado.

| Versão | Data | Decisão | Contexto e motivo |
|---|---|---|---|
| 1.0.0 | Anterior | `obra_id` como entidade central | Auditoria da Vobi revelou que módulos isolados impedem inteligência cruzada |
| 1.0.0 | Anterior | ImgBB para fotos | base64 colapsou localStorage com 3 obras simultâneas — cockpit travou |
| 1.0.0 | Anterior | `calcPctGeral()` canônica | Duplicação gerou divergência de % entre módulos — dado errado exibido ao cliente |
| 1.0.0 | Anterior | Single-file cockpit | Framework aumentou complexidade sem ganho operacional real |
| 1.0.0 | Anterior | Bola de Neve para dívidas | Estratégia definida — nunca renegociar, sempre quitar antecipadamente |
| 1.1.0 | Anterior | Módulos máx 400 linhas | Arquivo de 19.800 linhas tornou debug impossível e perdeu contexto do Claude Code |
| 1.2.0 | Anterior | Zero try/catch silenciosos | Bug oculto por dias — sistema aparentava funcionar enquanto falhava |
| 2.0.0 | 31/03/2026 | Brain com escrita no Supabase | Brain só leitura não fecha o loop de aprendizado |
| 2.0.0 | 31/03/2026 | Proposta em HTML Berti | Gamma.app descartado — identidade visual não era padronizável |
| 2.0.0 | 31/03/2026 | Contrato como gatilho de onboarding | Dados pessoais só após fechamento — LGPD e fluxo lógico correto |
| 2.0.0 | 31/03/2026 | SINAPI como base secundária | Base Supabase tem valores reais validados — SINAPI é referência, não verdade |
| 2.0.0 | 31/03/2026 | NotebookLM reposicionado | MASTER.md no Claude cobre a função com mais contexto — operação solo sem fricção |
| 2.0.0 | 31/03/2026 | ElevenLabs em stand by | Alertas por áudio são distração incompatível com TDAH |
| 2.0.0 | 31/03/2026 | ChatGPT o3 como ferramenta pessoal | Melhor para argumentação comercial — não integrado ao pipeline automático |
| 3.0.0 | 31/03/2026 | SLA dos agentes definido | Campo 15s · Brain 45s · Relatório 90s — confirmado por Evandro |
| 3.0.0 | 31/03/2026 | Anti-padrões documentados | 4 erros reais registrados com contexto para nunca repetir |
| 3.0.0 | 31/03/2026 | Glossário criado | Termos do DEKA OS definidos para Claude Code e sessões futuras |
| 3.0.0 | 31/03/2026 | Mapa de resiliência criado | Comportamento de fallback de cada componente documentado |
| 3.0.0 | 31/03/2026 | Cores identidade visual confirmadas | Evandro confirmou paleta em 31/03/2026 |


---
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEKA OS — MASTER.md v3.0.0 — Extraordinário
Marco Principal — 31 de março de 2026
Berti Construtora LTDA · Confidencial
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
