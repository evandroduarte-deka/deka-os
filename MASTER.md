# DEKA OS — MASTER.md
## A Constituição do Sistema Nervoso da Berti Construtora

```
Versão:    4.0.0 — Unificado
Data:      01 de abril de 2026
Autor:     Evandro Luiz Duarte
Status:    VIGENTE — substitui todas as versões anteriores
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
Após 4 semanas de construção contínua, o DEKA OS atingiu seu ponto
de maturidade arquitetural. O projeto passou de ferramenta para
sistema nervoso da operação.

01 de abril de 2026 — Unificação documental (v4.0)
MASTER.md v3.0 + decisões do dia 01/04 + síntese do NotebookLM
consolidados em documento único. Conflitos entre versões resolvidos.
Decisões travadas com consenso explícito do gestor.
```

---

## 2. Visão e Propósito

O DEKA OS é o sistema operacional da Berti Construtora — não um software
de gestão, mas a inteligência que conecta cada lead, cada obra, cada real
e cada decisão em um único organismo que aprende e evolui.

| Dimensão | SaaS genérico | DEKA OS |
|---|---|---|
| **Dados** | Acumula dados | Acumula inteligência |
| **Aprendizado** | Zero | Cresce com cada obra |
| **Integração** | Módulos isolados | `obra_id` conecta tudo |
| **IA** | Nenhuma | Brain como gestor operacional |
| **Financeiro** | Por projeto, sem DRE | Por obra + empresa + DRE automático |
| **Memória** | Sem histórico | Obsidian vault — memória longa |
| **Comercial** | Manual | Agente qualifica, acompanha e converte |
| **Orçamento** | Manual | Agente com base_servicos + SINAPI |
| **Proposta** | Template manual | HTML Berti gerado automaticamente |
| **Custo** | Mensalidade crescente | Infraestrutura própria, custo fixo |

---

## 3. Stack Técnica

| Camada | Tecnologia | Função |
|---|---|---|
| **Frontend** | HTML + CSS + JS puro (modular) | Sem frameworks — funciona em 3G |
| **Backend** | Supabase (PostgreSQL) | Fonte única de verdade |
| **IA Central** | Claude Sonnet 4.6 | Brain — orquestrador |
| **IA Dev** | Claude Code | Desenvolvimento e deploy |
| **Proxy API** | Cloudflare Worker | `anthropic-proxy.berti-b52.workers.dev` |
| **Hospedagem** | GitHub Pages | `evandroduarte-deka/deka-os` |
| **Automação** | N8N | Webhooks, cron jobs |
| **Memória Longa** | Obsidian vault | Conhecimento entre obras |
| **Entrada Mobile** | Telegram MCP | Campo → Brain |
| **Transcrição** | Whisper | Áudio → texto estruturado |
| **Fotos** | ImgBB API | Zero base64 |
| **Análise visual** | Gemini Vision | Plantas e projetos PDF |
| **Pesquisa** | Perplexity API | Preços e normas em tempo real |
| **Base serviços** | `base_servicos` (Supabase) | 162 serviços · 28 categorias |
| **Preços oficiais** | SINAPI API | Base secundária — sempre com flag |

### Credenciais e endpoints ativos

```
Cloudflare Worker: anthropic-proxy.berti-b52.workers.dev
GitHub:            evandroduarte-deka/deka-os
Supabase:          tdylutdfzgtcfyhynenk
N8N:               criadorderealidades.app.n8n.cloud
ImgBB API Key:     588ec0d66fb7cefc2ee8aea196125c53
Token:             localStorage.getItem('mdo_worker_token') — NUNCA hardcoded
```

---

## 4. Arquitetura de Frontend — Modularidade Estrita

> ⚠️ **DECISÃO CRÍTICA — aprendida na prática**
> O Cockpit cresceu para 19.800 linhas. Debug impossível. Claude Code
> perdia contexto. Edições simples quebravam seções não relacionadas.
> Este foi o Anti-padrão 4. A solução definitiva está abaixo — nunca reverter.

### 4.1 Limites rígidos de tamanho

| Tipo de arquivo | Limite | O que fazer se ultrapassar |
|---|---|---|
| Módulos JS em `assets/modulos/` | **400 linhas** | Dividir em submódulos antes de continuar |
| HTML/JS gerais | **3.000 linhas** | Extrair para `assets/modulos/` |
| Shell `obra.html` (exceção única) | **5.000 linhas** | Contém 9 tabs — única exceção documentada |
| `deka.js` (núcleo global) | **1.500 linhas** | Extrair utilitários para módulos |

### 4.2 Lazy Loading — obrigatório

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

### 4.3 Ponto único de inicialização

- **Um único** `DOMContentLoaded` em todo o sistema — exclusivamente em `deka.js`
- **Um único** `init()` ou `main()` por módulo JS
- Múltiplos listeners causam race conditions — proibido

### 4.4 Nomenclatura padrão

```
assets/modulos/mod-obra.js          ← tab 1
assets/modulos/mod-visita.js        ← tab 2
assets/modulos/mod-orcamento.js     ← tab 3
assets/modulos/mod-cronograma.js    ← tab 4
assets/modulos/mod-equipes.js       ← tab 5
assets/modulos/mod-pagamentos.js    ← tab 6
assets/modulos/mod-registro.js      ← tab 7
assets/modulos/mod-fechamento.js    ← tab 8
assets/modulos/mod-assistente.js    ← tab 9
```

### 4.5 Regras do Claude Code

- **1 arquivo por sessão** — sem exceção
- Entregar arquivo **completo** — nunca patches ou trechos para colar
- Se o arquivo alvo ultrapassar o limite → dividir antes de editar
- Smoke test obrigatório antes de todo commit

---

## 5. Arquitetura Central — obra_id

> ⚠️ **DECISÃO IMUTÁVEL**
> A `obra` é a entidade central. Todos os módulos referenciam o mesmo
> `obra_id`. Esta decisão não pode ser revertida sem reescrever o sistema.

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

> **Regra absoluta:** Qualquer feature que grava no Supabase DEVE
> passar por `_prepararPayloadSync()`. Sem exceção.

---

## 6. Estrutura do Mestre de Obra — 9 Módulos

### Fluxo de navegação

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

### As 9 tabs

| # | Tab | Módulo | Função principal |
|---|---|---|---|
| 1 | **OBRA** | `mod-obra.js` | Dados gerais, cliente, KPIs, financeiro |
| 2 | **VISITA** | `mod-visita.js` | Programação do dia, navegador semanal, áudio |
| 3 | **ORÇAMENTO** | `mod-orcamento.js` | Tabela editável, KPIs, Sync Planilha, PDF |
| 4 | **CRONOGRAMA** | `mod-cronograma.js` | Gantt completo, filtros, cores por equipe |
| 5 | **EQUIPES** | `mod-equipes.js` | Grid presença, cards com PIX e contato |
| 6 | **PAGAMENTOS** | `mod-pagamentos.js` | Entradas/saídas, filtros, Importar IA |
| 7 | **REGISTRO** | `mod-registro.js` | Fotos, pendências, materiais, notas, histórico |
| 8 | **FECHAMENTO** | `mod-fechamento.js` | Fechamento de obra e acerto final |
| 9 | **ASSISTENTE** | `mod-assistente.js` | Chat IA com contexto completo da obra |

### Detalhamento — tab VISITA

```
[REGISTRAR VISITA]                    Semana 4 · 51 serviços

[Timer de visita]  00:00:00  ▶ INICIAR

[PROGRAMAÇÃO DO DIA]                  Quarta 01/04/2026
  Lumitech                            1 serviço
  Infraestrutura Elétrica — Salão 2  0%

[Navegador semanal]
  ◄  Semana atual  ►  Hoje
  SEG    TER    QUA    QUI    SEX    SÁB    DOM
  30/03  31/03  01/04  02/04  03/04  04/04  05/04
  •      •      •      •      •      •      •     ← ponto = visita registrada

[Chips de equipes]
  — Valdeci José E.   — Ademarcos   — Lumitech
  — Claudinei         — Pablo       — [Marcenaria]
  — [Limpeza]         — Roberto

[Área de registro — fundo #1A3A2A]
  [🎤 Toque para gravar]
  [Textarea livre: O que aconteceu hoje?...]
  [✓ Salvar dia]  [★ PROCESSAR COM IA]  [Limpar]  salvo 21:46
```

### Detalhamento — tab ORÇAMENTO

```
[ORÇAMENTO]                           Visão financeira da obra
  R$ 0 Total · R$ 0 Executado · R$ 0 Aditivos · R$ 0 A Executar
  [+ Novo Aditivo]  [PDF]  [↑ SYNC PLANILHA]

Tabela editável — Cód · Descrição · Un · Qtde · R$/Un · Total · Exec.
  PRELIMINARES                                          0%  R$ 0
    SRV-002  Desmobilização de Mobiliário — Salão 1  vb  1  —  0
    SRV-001  Isolamento de Obra                       vb  1  —  0
    ...
  DEMOLIÇÕES                                            0%  R$ 0
    SRV-005  Retirada de Elementos de Parede          vb  1  —  0
    ...
  [+ Serviço]       [Subtotal categoria]
```

### Detalhamento — tab CRONOGRAMA

```
[◄]  09/03 a 26/04  [►]
[Esta semana]  [Todos]  [□ Ocultar 100%]  [Todas equipes ▼]  [Buscar...]
Expandir  Serviço ●── 268   Zoom ●──

Gantt: Serviço · % · Grade de dias com cores por equipe

[SALVAR CRONOGRAMA]
```

### Detalhamento — tab EQUIPES

```
[EQUIPES — PRESENÇA]                  8 equipes

[Grid presença — período completo]
  Equipe              MAR 2026                              Total
  Valdeci José Empr.  ■■■ ■ ■■■■■■■■■■■■■■ ■■ ■■ ■ ■■    17d
  Ademarcos AC        ■■■   ■■  ■■ ■  ■■   ■              7d
  Lumitech            ■■■■■■■■   ■■■ ■■  ■■               7d
  Legenda: ■ Presente  ■ Ausente  ■ Agendado  □ Não marcado

[Cards por equipe]
  EQ-OBR-01  Valdeci José Empreiteiro  Obra Civil / Demolições
  EQ-ACO-01  Ademarcos AC              Ar-condicionado
  EQ-ELE-01  Lumitech                  Elétrica
  [Sem tel]  [📋 Copiar]
```

### Detalhamento — tab PAGAMENTOS

```
[PAGAMENTOS]                          Sem lançamentos
  ENTRADAS  R$ 0    SAÍDAS  R$ 0    SALDO  +R$ 0
  [Todos · Entrada · Saída]  [Todos · Pendente · Pago · Agendado]
  [Todas categorias ▼]
  [+ NOVO LANÇAMENTO]  [↑ IMPORTAR DOCUMENTO (IA)]  [💬 Mensagem Cliente]
```

### Detalhamento — tab REGISTRO

```
[Cockpit Inteligente]    Alertas · Planejamento · Compras · Comunicação
[5  FOTOS]               3 fotos · S4 · 3 na nuvem · 49 anteriores
[6  PENDÊNCIAS]          7 abertas (11 total)
[7  MATERIAIS]           3 itens · 1 a comprar
[8  NOTAS & VISITA]      21 notas
[9  HISTÓRICO DE SEMANAS]  2 semanas · 16 visitas
```

---

## 7. O Brain — Inteligência Operacional

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

### Agentes especializados

```
Brain (Claude Sonnet)    ← orquestrador central
    ├── AGT_COCKPIT      ← processa visitas e áudio de campo
    ├── AGT_WHATSAPP     ← triagem comercial e leads
    ├── AGT_RELATORIO    ← relatório semanal cliente (Haiku)
    ├── AGT_FINANCEIRO   ← categorização 98,5% precisão
    ├── AGT_ORCAMENTO    ← levantamento e proposta
    └── AGT_ASSISTENTE   ← chat com contexto da obra
```

> ⚠️ **Regra crítica:** Relatórios ao cliente NUNCA expõem SRV/EQ/FOR.

---

## 8. Obsidian — Memória Longa

```
/vault/
  /obras/          ← gerado ao fechar obra
  /fornecedores/   ← histórico, avaliação, pontos fortes
  /clientes/       ← histórico de relacionamento
  /benchmarks/     ← custo/m² por tipo, prazos, materiais
  /decisoes/       ← decisões arquiteturais
  /aprendizados/   ← erros, o que funciona, técnicas validadas
```

---

## 9. Financeiro — Obra + Empresa + DRE

| Financeiro por Obra | Financeiro Empresa |
|---|---|
| Receitas de medição | Pró-labore e distribuição |
| Pagamento subcontratados | Salários fixos |
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

> ⚠️ **Regra estratégica:** Dívidas: sempre Bola de Neve. Nunca renegociar.

---

## 10. Módulo de Compras de Material

```
Telegram: "Comprei 10 sacos argamassa R$340 Badida, Leroy Merlin"
    ↓
Brain: categoriza → vincula obra_id → registra despesa → grava em obra_compras
```

---

## 11. Relatórios Semanais

```
Sexta 17h → Brain gera rascunho HTML
          → Preview no Telegram
          → Você: "Aprovar" ou "Editar"
          → Brain envia ao cliente
          → Supabase grava histórico
```

---

## 12. Telegram MCP — Entrada de Campo

| Tipo | Exemplo | Ação |
|---|---|---|
| Diário de campo | "Valdeci finalizou demolição" | Visita + serviço + pendência |
| Foto + legenda | Foto com "problema tubulação" | Vision analisa + cria pendência |
| Comando direto | "Marca revestimento 80%" | Atualiza obra_servicos |
| Consulta | "Quanto falta receber da Hebron?" | Responde no Telegram |
| Compra material | "Comprei argamassa R$340 Badida" | obra_compras + financeiro |

---

## 13. Agente Comercial

| Tipo de contato | Ação |
|---|---|
| Lead qualificado | Abre oportunidade, agenda visita, notifica |
| Solicitação orçamento | Alimenta agente de orçamento |
| Dúvida genérica | Responde com FAQ Berti |
| Spam | Arquiva sem notificar |

---

## 14. Agente de Orçamento e Proposta

### Hierarquia de referência de preços

```
1° base_servicos (Supabase) — 162 serviços validados pela Berti
   ↓ item não encontrado
2° SINAPI API — flag obrigatória "SINAPI — validar BDI"
   ↓ item muito específico
3° Perplexity — pesquisa de mercado em tempo real
   ↓ sempre
Aplicação de BDI + percentual de administração Berti
```

---

## 15. Fluxo de Vida do Cliente

```
① LEAD       → Agente filtra → abre oportunidade
② VENDA      → Orçamento → proposta HTML Berti
③ FECHAMENTO → Coleta dados pessoais → gera contratos
④ ONBOARDING → Cadastra cliente + obra + obra_id + orçamento
⑤ EXECUÇÃO   → Mestre de Obra + Telegram + relatórios automáticos
⑥ ENTREGA    → Relatório final + acerto financeiro
⑦ PÓS-OBRA  → Brain gera nota Obsidian com benchmarks
```

---

## 16. Roadmap de Autonomia

| Nível | Nome | O que o sistema faz | Você faz | Prazo |
|---|---|---|---|---|
| **1** | Coleta | Processa, categoriza, alerta | Opera e decide tudo | ← AGORA |
| **2** | Sugestão | Sugere decisões fundamentadas | Aprova ou rejeita | Q2 2026 |
| **3** | Execução | Executa tarefas rotineiras | Aprova só o crítico | Q3 2026 |
| **4** | Gestão | Gerencia com autonomia total | Define estratégia | META |

---

## 17. Identidade Visual e Dados da Empresa

| Elemento | Valor |
|---|---|
| **Empresa** | Berti Construtora LTDA |
| **CNPJ** | 59.622.624/0001-93 |
| **Resp. Técnica** | Jéssica Berti Martins — CAU A129520-9 |
| **Gestor** | Evandro Luiz Duarte |
| **Telefone** | (41) 9183-6651 |

### Paleta oficial — travada em 01/04/2026

| Token | Hex | Uso |
|---|---|---|
| `--verde-berti` | `#1A3A2A` | Header, topbar, tabs ativas, cabeçalho tabela |
| `--ouro-berti` | `#9A7B3A` | Logo CONSTRUTORA, avanço %, separadores |
| `--branco` | `#FFFFFF` | Fundo geral, KPIs, tabela |
| `--cinza-claro` | `#F5F5F5` | Linhas alternadas, fundo tabs inativas |
| `--cinza-borda` | `#E5E5E5` | Bordas divisórias |
| `--verde-status` | `#22C55E` | Badge CONCLUÍDO, No Prazo |
| `--azul-andamento` | `#1E3A5F` | Badge EM ANDAMENTO |
| `--cinza-executar` | `#374151` | Badge A EXECUTAR |
| `--vermelho-alerta` | `#DC2626` | Atrasado, alertas críticos |

**Tipografia:** Barlow Condensed (Google Fonts) — pesos 300 a 800

---

## 18. Decisões Travadas

| Decisão | Valor | Data |
|---|---|---|
| Entidade central | `obra_id` como chave universal | Anterior |
| Fonte única | Supabase — zero dados em localStorage sem TTL | Anterior |
| Fotos | ImgBB API — zero base64 | Anterior |
| Token | `localStorage.getItem('mdo_worker_token')` — nunca hardcoded | 01/04/2026 |
| Funções canônicas | `calcPctGeral()`, `_prepararPayloadSync()`, `sanitizeState()` | Anterior |
| Frontend | HTML + JS puro — sem frameworks | Anterior |
| Lazy loading | Tab carrega módulo JS só quando ativada | Anterior |
| Limite módulos JS | 400 linhas em `assets/modulos/` | Anterior |
| Limite geral HTML/JS | 3.000 linhas | 01/04/2026 |
| Limite shell obra.html | 5.000 linhas (única exceção) | 01/04/2026 |
| Estrutura navegação | `hub.html` → `obra.html` shell 9 tabs | 01/04/2026 |
| **Ouro Berti** | `#9A7B3A` | 01/04/2026 |
| **Verde Berti** | `#1A3A2A` | 01/04/2026 |
| Brain com escrita | Brain grava de volta no Supabase | 31/03/2026 |
| Proposta em HTML | Gamma.app descartado | 31/03/2026 |
| Contrato como gatilho | Dados pessoais só ao fechamento | 31/03/2026 |
| SINAPI como secundária | base_servicos é primária | 31/03/2026 |
| Bola de Neve | Estratégia única para dívidas | Anterior |
| Zero try/catch silencioso | Todo catch: console.error + showToast | Anterior |
| Zero DOMContentLoaded duplicados | Apenas em deka.js | Anterior |
| Relatórios limpos | Nunca expor SRV/EQ/FOR ao cliente | Anterior |
| 1 arquivo por sessão | Regra absoluta do Claude Code | Anterior |

---

## 19. Estado Atual do Desenvolvimento

> Atualizado em 01/04/2026

### Concluído

| Arquivo | Status |
|---|---|
| `MASTER.md` v4.0 | ✅ Este documento |
| `ARCHITECTURE.md` | ✅ Schema real Supabase auditado |
| `CLAUDE.md` | ✅ Índice para Claude Code |
| `deka.js` | ✅ Token do localStorage |
| `hub.html + hub.js` | ✅ Lista de obras — Padrão Berti |
| `obra.html + obra.js` | ⚠️ Incompleto — 4 tabs, faltam 5 + lazy loading |

### Pendente — ordem de execução

| # | Tarefa | Descrição |
|---|---|---|
| A | Refatorar `obra.html` | Shell das 9 tabs com lazy loading |
| B | `mod-obra.js` | Dados gerais, KPIs, financeiro |
| C | `mod-visita.js` | Programação do dia, navegador, áudio, IA |
| D | `mod-orcamento.js` | Tabela editável, Sync Planilha |
| E | `mod-cronograma.js` | Gantt completo |
| F | `mod-equipes.js` | Grid presença + cards |
| G | `mod-pagamentos.js` | Entradas/saídas + Importar IA |
| H | `mod-registro.js` | Fotos, pendências, materiais, notas |
| I | `mod-fechamento.js` | Fechamento de obra |
| J | `mod-assistente.js` | Chat IA com contexto |
| K | `cockpit.html + cockpit.js` | Hub de operação — JARVIS |
| L | `relatorios.html + relatorio-pdf.html` | PDF Padrão Berti |
| M | `brain.html + brain.js` | Briefing semanal + DRE |
| N | `comercial.html + comercial.js` | Leads + propostas |

---

## 20. SLA dos Agentes

| Operação | SLA máximo | Fallback |
|---|---|---|
| Entrada via Telegram | 15 segundos | Salva texto bruto, processa depois |
| Brain — consulta simples | 45 segundos | Cache parcial |
| Brain — obra_context completo | 45 segundos | Contexto reduzido |
| Geração de relatório | 90 segundos | Rascunho parcial |
| Agente financeiro | 30 segundos | Queue background |
| Agente de orçamento | 120 segundos | Orçamento parcial sinalizado |
| Sync Supabase | 15 segundos | Retry 3x com backoff |

---

## 21. Anti-Padrões

**❌ 1 — base64 para fotos**
Colapsou localStorage com 3 obras. Decisão: ImgBB sempre. Zero base64.

**❌ 2 — try/catch silencioso**
Bug oculto por dias. Decisão: todo catch: console.error + showToast.

**❌ 3 — commit direto no main**
Quebrou produção. Decisão: sempre PR — nunca commit direto.

**❌ 4 — arquivo monolítico**
19.800 linhas — debug impossível, Claude Code perdia contexto.
Decisão: máx 3.000 linhas geral, 400 linhas em `assets/modulos/`.

**❌ 5 — token hardcoded**
Expõe credenciais no código público.
Decisão: token sempre do `localStorage.getItem('mdo_worker_token')`.

---

## 22. Mapa de Resiliência

| Componente | Se falhar | Comportamento esperado |
|---|---|---|
| Supabase | Cache localStorage 10min · modo leitura | Sync ao reconectar |
| Cloudflare Worker | Cockpit sem IA · formulários manuais | Retry backoff 3x |
| N8N | Agentes param · fila acumula | Processa ao voltar |
| ImgBB | Texto salva · foto não sobe | Retry manual |
| Brain (Claude API) | Modo manual · sem IA | Haiku como fallback |

---

## 23. Glossário

| Termo | Definição |
|---|---|
| `obra_id` | UUID único — chave que conecta todos os módulos |
| `obra_context` | JSON consolidado que o Brain recebe — não acessa banco direto |
| **Brain** | Claude Sonnet atuando como orquestrador — lê e grava |
| **AGT_** | Prefixo de agente especializado com domínio único |
| **BDI** | Benefícios e Despesas Indiretas — aplicado sobre SINAPI |
| **Padrão Berti** | Tom: consultoria técnica, sem jargão, foco em progresso |
| **SRV / EQ / FOR** | Códigos internos — nunca em documentos de cliente |
| `mdo_worker_token` | Chave localStorage do token — única fonte autorizada |
| `calcPctGeral()` | Função canônica de progresso — nunca duplicar |
| `_prepararPayloadSync()` | Toda gravação no Supabase passa por aqui |
| `sanitizeState()` | Toda entrada de dados passa por sanitização |
| **Lazy loading** | Tab carrega módulo JS só quando ativada |
| **Shell** | `obra.html` — container das 9 tabs sem lógica própria |
| **Nível 4** | Meta: Brain como gestor operacional, Evandro como dono |
| **Bola de Neve** | Estratégia de dívidas: menor primeiro, nunca renegociar |

---

## 24. Changelog

| Versão | Data | Decisão |
|---|---|---|
| 1.0.0 | Anterior | `obra_id` como entidade central |
| 1.0.0 | Anterior | ImgBB para fotos — base64 colapsou localStorage |
| 1.1.0 | Anterior | Zero try/catch silenciosos |
| 1.1.0 | Anterior | Módulos máx 400 linhas em `assets/modulos/` |
| 2.0.0 | 31/03/2026 | Brain com escrita no Supabase |
| 2.0.0 | 31/03/2026 | Proposta em HTML Berti — Gamma descartado |
| 3.0.0 | 31/03/2026 | SLA dos agentes · Anti-padrões · Glossário |
| 3.1.0 | 01/04/2026 | Token hardcoded → localStorage obrigatório |
| 4.0.0 | 01/04/2026 | MASTER unificado — v3.0 + v3.1 + decisões do dia |
| 4.0.0 | 01/04/2026 | Ouro Berti: `#9A7B3A` · Verde Berti: `#1A3A2A` |
| 4.0.0 | 01/04/2026 | Limite geral: 3.000 linhas · Shell obra.html: 5.000 |
| 4.0.0 | 01/04/2026 | Estrutura: hub.html → obra.html shell 9 tabs com lazy loading |
| 4.0.0 | 01/04/2026 | 9 módulos detalhados com wireframes em texto |
| 4.0.0 | 01/04/2026 | Conflito single-file vs modular resolvido: modular prevalece |

---

```
DEKA OS — MASTER.md v4.0.0 — Unificado
Berti Construtora LTDA · Confidencial
Última atualização: 01/04/2026
```
