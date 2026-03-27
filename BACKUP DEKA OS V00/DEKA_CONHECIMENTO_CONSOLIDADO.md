# DEKA — CONHECIMENTO CONSOLIDADO DO PROJETO
## Base de Conhecimento para NotebookLM | Berti Construtora
### Versão 2.0 | 26/03/2026 | Consolidado de 3 inventários de projeto

---

## 1. IDENTIDADE E PROPÓSITO

**Sistema:** DEKA — Sistema Operacional da Berti Construtora
**Empresa:** Berti Construtora LTDA | CNPJ 59.622.624/0001-93
**Gestor:** Evandro Luiz Duarte | Curitiba/PR
**Responsável Técnica:** Jéssica Berti Martins — CAU A129520-9
**Segmento:** Reformas comerciais e residenciais de médio-alto padrão
**Ticket médio:** R$ 80.000 a R$ 500.000+

### Por que o DEKA existe
O gestor opera com TDAH, depressão e ansiedade crônica. Em períodos de crise, deixa de responder clientes, perde controle operacional e entra em colapso. O DEKA foi projetado para que a empresa funcione independentemente do estado emocional do gestor.

**Princípio absoluto:** O gestor aprova — não executa. Tudo que pode ser automatizado deve ser automatizado.

### O que o sistema cobre
1. WhatsApp monitorado por IA → respostas sugeridas → aprovação → envio automático
2. Abertura de obra → orçamento → proposta → contrato → documentação inicial
3. Gestão de campo → registro de visita por voz ou texto → atualização automática da obra
4. Brain central → briefing semanal → distribuição de tarefas por agentes
5. Relatórios automáticos para clientes (semanais + entrega final)
6. Financeiro → extrato → categorização por obra → contabilidade

---

## 2. INFRAESTRUTURA ATUAL

| Serviço | URL | Plataforma | Status |
|---|---|---|---|
| Frontend DEKA | evandroduarte-deka.github.io/deka-berti | GitHub Pages | ✅ Online |
| N8N | primary-production-8754e.up.railway.app | Railway | ✅ Online — sem fluxos criados |
| Evolution API | evolution-berti.onrender.com | Render | ✅ Online — WhatsApp não conectado |
| Supabase | tdylutdfzgtcfyhynenk.supabase.co | Supabase Cloud | ✅ Online |
| Cloudflare Worker | anthropic-proxy.berti-b52.workers.dev | Cloudflare | ✅ Online |

**LLM principal:** claude-sonnet-4-20250514
**Repositório:** github.com/evandroduarte-deka/deka-berti

---

## 3. MÓDULOS DO FRONTEND

| Arquivo | Nome | Função | Linhas | Status |
|---|---|---|---|---|
| hub.html | Hub | Menu central, links rápidos, status da infra, notas | ~400 | ✅ Funcionando |
| index.html | Cockpit | Gestão de campo — serviços, pendências, equipes, fotos, visitas, IA analítica | ~16.070 | ⚠️ Funciona, tem bugs |
| brain.html | Brain | Central de comando — JARVIS, matrix, pipeline, agenda, dump IA | ~2.504 | ✅ Funcionando |
| comercial.html | Comercial | Copiloto de conversas WhatsApp — leads, pipeline, exporta ao Brain | ~441 | ⚠️ Bug crítico de tabela |
| relatorios.html | Relatórios | 9 tipos de relatório para clientes e interno | ~4.641 | ✅ Funcionando |

**Total de código:** ~25.000 linhas

---

## 4. BANCO DE DADOS — SUPABASE

### Tabelas ativas

#### cockpit_obras
```
obra_key    text PRIMARY KEY   — slugify(config.obra)
data        jsonb              — state completo da obra
updated_at  timestamptz
```

**Conteúdo do campo data (jsonb):**
- `config` → nome da obra, cliente, CNPJ, endereço, semana atual, valor contrato, período
- `servicos[]` → código, descrição, percentual execução, valor, equipe, data fim prevista
- `pendencias[]` → título, descrição, tipo, status, prioridade
- `equipes[]` → código, responsável, nome, presença
- `snapshots{}` → S1, S2, S3... estado congelado de cada semana passada
- `diario_historico{}` → texto do dia por data ISO
- `presenca_historico{}` → registro de presença por data
- `fotos[]` → URL, data, semana, legenda
- `visitas[]` → data, narrativa, itens aplicados
- `pagamentos[]` → tipo, categoria, valor, status, data

#### brain_comercial
```sql
id          uuid PRIMARY KEY DEFAULT gen_random_uuid()
data        date DEFAULT CURRENT_DATE
tipo        text  -- lead|follow_up|proposta|cobranca|info|parceiro
contato     text NOT NULL
empresa     text
canal       text  -- whatsapp|email|indicacao|anuncio|telefone
resumo      text NOT NULL
acao        text NOT NULL
agente      text DEFAULT 'EVANDRO'
urgencia    text DEFAULT 'media'  -- alta|media|baixa
prazo       date
valor_est   numeric
importado   boolean DEFAULT false
obra_key    text
notas_socio text
created_at  timestamptz DEFAULT now()
```

### Tabelas planejadas (não criadas)
| Tabela | Conteúdo | Origem atual |
|---|---|---|
| base_servicos | 103 serviços em 20 categorias com SINAPI | Base_de_Dados_v3.xlsx |
| brain_data | Tarefas e agenda do Brain | localStorage brain_v7_berti |

### Tabela com bug (deve ser eliminada)
| Tabela | Problema |
|---|---|
| comercial_data | Criada pelo Comercial por engano. Brain lê brain_comercial. Dados nunca se cruzam. |

### Regras de leitura/escrita — LEI MÁXIMA
```
Cockpit:    cockpit_obras → READ + WRITE  |  brain_comercial → NUNCA
Relatórios: cockpit_obras → READ only     |  brain_comercial → NUNCA
Brain:      cockpit_obras → READ only     |  brain_comercial → READ + marca importado=true
Comercial:  cockpit_obras → READ (ping)   |  brain_comercial → WRITE
Hub:        NUNCA acessa nada             |
```
**REGRA ABSOLUTA: Brain NUNCA escreve em cockpit_obras.**

---

## 5. FLUXO COMPLETO DO SISTEMA

### FASE 0 — Comercial e Leads
```
WhatsApp do gestor → Evolution API captura
    → N8N processa → Claude analisa
    → Gera: resumo, agenda, proposta de resposta
    → Comercial.html exibe para aprovação
    → Gestor aprova com 1 clique
    → N8N envia pelo WhatsApp
    → Ações viram registros em brain_comercial
```

### FASE 1 — Abertura de Obra
```
Briefing do cliente (áudio/texto/PDF)
    → Claude cruza com base_servicos
    → Gera orçamento + cronograma + proposta HTML
    → Exporta JSON da obra
    → JSON importado no Cockpit
    → Cockpit gera proposta formatada para o cliente
    → Cliente aprova → contrato gerado automaticamente
    → Assinatura digital + e-mail automático
    → Documentação inicial: placas, checklists, avisos de obra
```

### FASE 2 — Execução da Obra (Cockpit)
```
Gestor na obra → observa, tira fotos, anota
    → No carro: grava áudio OU digita resumo
    → Cockpit + Claude processa o input
    → Atualiza: percentual, pendências, presença de equipes
    → Salva em cockpit_obras no Supabase (debounce 3s)
    → Relatório semanal gerado automaticamente
    → Relatório enviado para o cliente
```

### FASE 3 — Brain (Central de Comando)
```
Brain lê cockpit_obras + brain_comercial
    → Claude gera briefing semanal executivo
    → Distribui tarefas por agente e categoria
    → Gestor valida as ações propostas
    → Sistema executa: mensagens, alertas, agendamentos
    → Análises: financeiro, previsão de fechamentos, risco
```

### FASE 4 — Relatórios e Entrega Final
```
Relatórios semanais: extração do Cockpit → PDF/HTML para cliente
Relatório fotográfico: fotos organizadas por semana
Manual de obra: gerado via Claude com dados da obra
Documentação de entrega: pacote completo para o cliente
```

### FASE 5 — Financeiro
```
Extrato bancário importado (CSV/OFX)
    → Claude categoriza por obra e centro de custo
    → Gera relatório para contabilidade
    → Dashboard de fluxo de caixa e margens por obra
```

---

## 6. AGENTES DE IA — ARQUITETURA

| Agente | Modelo | Função | Trigger |
|---|---|---|---|
| AGT_WHATSAPP | Claude Haiku | Triagem de mensagens, resumos, proposta de resposta | Nova mensagem WhatsApp |
| AGT_COCKPIT | Claude Sonnet | Processa áudio/texto da visita, atualiza obra | Input do gestor no campo |
| AGT_ORCAMENTO | Claude Sonnet | Lê briefing + base_servicos, gera orçamento | Novo projeto comercial |
| AGT_BRAIN | Claude Sonnet | Consolida dados, gera briefing, prioriza tarefas | Semanal ou manual |
| AGT_RELATORIO | Claude Haiku | Extrai dados do Cockpit, formata relatório cliente | Semanal automático |
| AGT_FINANCEIRO | Claude Sonnet | Categoriza extratos, calcula margens por obra | Upload de extrato |
| AGT_EMAIL | Claude Haiku | Envio de e-mails automáticos | Acionado pelo Brain |
| AGT_LIGACAO | Claude Haiku | Scripts de ligação | Planejado — não implementado |

---

## 7. BUGS CRÍTICOS ATIVOS (A RESOLVER NO REBUILD)

### Bug 1 — Comercial salva na tabela errada
- **Problema:** Comercial escreve em `comercial_data`, Brain lê `brain_comercial`
- **Impacto:** Dados do Comercial nunca chegam ao Brain
- **Resolução no rebuild:** Padronizar para `brain_comercial` em ambos

### Bug 2 — 3 DOMContentLoaded no index.html
- **Problema:** Três pontos de inicialização diferentes no Cockpit
- **Impacto:** Comportamento imprevisível, ordem de carregamento não garantida
- **Resolução no rebuild:** Um único ponto de init

### Bug 3 — 45 blocos catch silenciosos no index.html
- **Problema:** Erros engolidos, sistema parecia funcionar mas falhava
- **Impacto:** Debug impossível
- **Resolução no rebuild:** Logging obrigatório em todos os catch

### Bug 4 — brain_data ainda em localStorage
- **Problema:** Tarefas e agenda do Brain não persistem entre dispositivos
- **Causa:** Tabela brain_data nunca criada no Supabase
- **Resolução no rebuild:** Criar tabela e migrar

### Bug 5 — Comercial v5 tela branca
- **Problema:** IDs HTML e funções JS divergiram (ex: `triage-panel` vs `triage-area`)
- **Causa:** Try/catch silencioso engoliu os erros
- **Resolução no rebuild:** Convenção de nomenclatura obrigatória

### Bug 6 — WhatsApp não conectado
- **Status:** Evolution API no ar, QR code não escaneado
- **Prioridade:** Crítico — bloqueia toda a FASE 0

### Bug 7 — N8N sem nenhum fluxo
- **Status:** N8N online, zero automações criadas
- **Prioridade:** Crítico — sem N8N nada é automatizado

---

## 8. DECISÕES ARQUITETURAIS CONFIRMADAS

| Decisão | Razão |
|---|---|
| N8N Cloud (Railway) | Evitar manutenção de infraestrutura própria |
| Evolution API | Conecta número WhatsApp pessoal via QR sem aprovação Meta |
| GitHub Pages para frontend | Zero custo, deploy automático por push |
| Supabase como banco | PostgreSQL real, API REST nativa, tier gratuito |
| Cloudflare Worker como proxy | Esconde chave Claude API do frontend |
| Claude Sonnet para raciocínio | Melhor custo-benefício para o volume de chamadas |
| Claude Haiku para tarefas simples | Rápido e barato para triagem e formatação |
| HTML/JS vanilla no frontend | Sem framework, sem build, funciona em 3G no campo |
| Cockpit tema claro | Uso sob sol no canteiro de obra |
| Brain/demais tema escuro | Uso em escritório, reduz fadiga visual |

---

## 9. PADRÕES DE DESENVOLVIMENTO — REGRAS DO REBUILD

### Regras absolutas
1. **1 arquivo por sessão de desenvolvimento** — nunca editar dois módulos no mesmo chat
2. **Sempre entregar arquivo completo** — nunca patches ou trechos para colar manualmente
3. **Validar sintaxe antes de entregar** — `node --check arquivo.html`
4. **Sem try/catch silenciosos** — todo catch deve logar o erro
5. **Sem dados mock misturados com dados reais** — ambiente de desenvolvimento separado
6. **Um único DOMContentLoaded por arquivo** — nunca múltiplos pontos de init
7. **Tabelas Supabase alinhadas antes de codar** — nunca criar tabela sem validar com todos os módulos que a leem
8. **Nunca assumir schema do Supabase** — sempre verificar o JSON real antes de acessar campos

### Limites de tamanho por arquivo
| Arquivo | Limite máximo |
|---|---|
| Qualquer módulo HTML | 3.000 linhas |
| index.html (Cockpit) | 5.000 linhas (rebuild em módulos) |
| Funções JS críticas | Documentadas com comentário formal explicando o motivo |

### Convenção de nomenclatura obrigatória
- IDs HTML e referências JS devem usar o mesmo nome exato
- Variáveis Supabase padronizadas: `SUPA_URL` e `SUPA_KEY` em todos os módulos
- Cloudflare Worker: sempre usar URL raiz sem path em todos os módulos
- localStorage keys: `deka_{modulo}_v{versao}` — ex: `deka_brain_v1`

---

## 10. LIÇÕES APRENDIDAS — O QUE NÃO REPETIR

1. **Construir sem arquitetura base definida** — o sistema cresceu por acumulação, não por design
2. **Arquivo de 16.000 linhas** — ingerenciável, qualquer mudança é arriscada
3. **Múltiplas fontes de verdade simultâneas** — Supabase + localStorage + Google Sheets conflitavam
4. **Tabelas criadas sem alinhamento entre módulos** — `comercial_data` vs `brain_comercial`
5. **Variáveis inconsistentes entre módulos** — `SB_URL` vs `SUPA_URL` no mesmo projeto
6. **Crescer horizontalmente antes de estabilizar** — novos módulos antes dos anteriores funcionarem
7. **Múltiplos chats para o mesmo problema** — cada chat gerava solução diferente e conflitante
8. **Confiar em "parecia funcionar nos testes"** — sistema nunca validado de ponta a ponta
9. **Deploy manual via upload** — versões desencontradas entre local e produção
10. **6 projetos paralelos sem controle** — 150+ versões de arquivo sem versionamento claro
11. **Pedir ao Claude para resolver tudo de uma vez** — prompts vagos geravam código que não funcionava em produção

---

## 11. PENDÊNCIAS PRIORITÁRIAS DO REBUILD

### Prioridade 1 — Desbloqueantes
| Item | Descrição |
|---|---|
| Conectar WhatsApp | Escanear QR code na Evolution API |
| Criar primeiro fluxo N8N | WhatsApp → captura → Brain (qualquer mensagem entra no sistema) |
| Corrigir tabela Comercial | Padronizar para brain_comercial, eliminar comercial_data |

### Prioridade 2 — Infraestrutura
| Item | Descrição |
|---|---|
| Criar tabela brain_data | Persistir tarefas do Brain no Supabase |
| Migrar base_servicos | 103 serviços do Excel para Supabase |
| Reescrever Comercial v5 | Copiloto de conversas em tempo real com WhatsApp |

### Prioridade 3 — Novos módulos
| Item | Descrição |
|---|---|
| financeiro.html | Importar extrato, categorizar por obra, gerar relatório contabilidade |
| orcamento.html | Abertura de obra integrada ao sistema |
| Portal do cliente | Dashboard externo para cliente acompanhar obra |

---

## 12. OBRA ATIVA DURANTE O REBUILD

| Campo | Valor |
|---|---|
| Nome | Reforma Badida — ParkShopping Barigui |
| Cliente | TMK Comércio de Alimentos LTDA |
| CNPJ | 20.309.703/0001-03 |
| Endereço | Av. Prof. Pedro Viriato Parigot de Souza, 600 — Loja 303 — Mossungê — Curitiba/PR |
| Período | 09/03/2026 a 25/04/2026 |
| Semana atual | 3 |
| Total de serviços | 51 |
| Avanço | 31% |

---

## 13. GLOSSÁRIO DEKA

| Termo | Significado |
|---|---|
| DEKA | Nome do sistema operacional da Berti Construtora |
| Cockpit | Módulo de gestão de campo (index.html) |
| Brain | Central de comando macro com JARVIS (brain.html) |
| Comercial | Copiloto de conversas WhatsApp e vendas (comercial.html) |
| Relatórios | Geração de documentos para clientes (relatorios.html) |
| Hub | Menu central de navegação (hub.html) |
| JARVIS | Nome do agente de briefing executivo dentro do Brain |
| Evolution API | Gateway que conecta o número WhatsApp real ao N8N |
| brain_comercial | Tabela Supabase de leads e ações comerciais |
| cockpit_obras | Tabela Supabase com estado de todas as obras |
| base_servicos | 103 serviços com preços SINAPI (a migrar para Supabase) |
| Snapshot | Registro congelado do estado de uma obra em uma semana |
| obra_key | Chave primária gerada por slugify(nome da obra) |
| Payload Sync | Estrutura JSON enviada ao Supabase pelo Cockpit |
| CF Worker | Cloudflare Worker — proxy seguro para a Claude API |
| AGT_ | Prefixo dos agentes de automação (AGT_WHATSAPP, AGT_EMAIL etc.) |

---

*DEKA — Berti Construtora | Documento consolidado de 3 inventários de projeto*
*Versão 2.0 | 26/03/2026 | evandroduarte-deka*
