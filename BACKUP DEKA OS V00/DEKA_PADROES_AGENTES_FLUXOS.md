# DEKA — PADRÕES, AGENTES E FLUXOS
## Documento de Referência para NotebookLM e Claude Code
### Versão 1.0 | 26/03/2026

---

## PARTE 1 — PADRÃO BERTI DE COMUNICAÇÃO COM CLIENTE

### 1.1 Perfil do Cliente Berti

O cliente da Berti Construtora é pessoa física de médio-alto padrão ou empresa (CNPJ) com obras de R$ 80.000 a R$ 500.000+. Características determinantes para a comunicação:

- **Exigente e bem informado** — tem olhar apurado para qualidade, design e acabamento
- **Valoriza transparência** — quer saber o que está acontecendo, não apenas o que quer ouvir
- **Não tolera surpresas** — problemas devem ser comunicados antes de virarem crise
- **Respeita profissionalismo** — relatório bem feito vale mais do que visita presencial
- **Comunicação predominante: WhatsApp** — nunca ligar sem combinar antes
- **Tempo escasso** — relatório deve ser lido em menos de 3 minutos

### 1.2 Princípios da Comunicação Berti

**1. Clareza antes de completude**
O cliente não precisa saber de tudo — precisa saber o que importa para ele. Filtre tecnicalidades. Traduza jargão em linguagem de impacto ("infraestrutura elétrica concluída" → "toda a parte elétrica do teto está pronta").

**2. Transparência proativa**
Problemas identificados devem aparecer no relatório com a solução já encaminhada. Nunca omitir. Nunca comunicar problema sem solução proposta junto.

**3. Progresso visível**
Percentuais sozinhos não comunicam. Acompanhar sempre de narrativa: o que significa 31%? Qual foi o avanço desta semana? O que o cliente vai ver diferente na próxima visita?

**4. Tom: consultoria, não obra**
Linguagem técnica mas acessível. Terceira pessoa ("a equipe concluiu", não "eu fiz"). Evitar gírias de canteiro. Nunca expor códigos internos (SRV-, EQ-, FOR-) ao cliente.

**5. Próximo passo sempre visível**
Todo relatório termina com o que acontece na próxima semana. Cliente de alto padrão planeja agenda. Saber o que esperar gera confiança.

### 1.3 Estrutura Obrigatória — Relatório Semanal Cliente

```
CABEÇALHO
├── Logo Berti
├── Nome da obra + endereço
├── Semana N de M | Data de emissão
└── Contratante: [nome/razão social]

BLOCO 1 — RESUMO EXECUTIVO (máx. 5 linhas)
├── Frase de contexto: o que a semana representou na obra
├── Avanço geral: X% | + Y% na semana
├── Status: No prazo / Atenção / Em risco
└── Destaque positivo da semana

BLOCO 2 — SERVIÇOS EXECUTADOS
├── Tabela: Serviço | Status | Progresso
├── Status visíveis: Concluído ✓ | Em andamento | Programado
└── SEM códigos internos — apenas descrição comercial

BLOCO 3 — PROGRAMADO — PRÓXIMA SEMANA
├── Lista de serviços previstos
└── Qualquer item que exija atenção ou decisão do cliente

BLOCO 4 — REGISTRO FOTOGRÁFICO
├── Mínimo 4 fotos com legenda
├── Legenda padrão: "Ambiente — Descrição do que foi executado"
└── Ordenação: início da semana → fim da semana

RODAPÉ
├── Berti Construtora LTDA | CNPJ 59.622.624/0001-93
├── Resp. Técnica: Jéssica Berti Martins — CAU A129520-9
├── Tel: (41) 9183-6651
└── Semana N | Revisão A
```

### 1.4 Linguagem — O que Escrever vs. O que Evitar

| ❌ Evitar | ✅ Usar |
|---|---|
| "SRV-013 foi concluído" | "O fechamento do forro foi concluído" |
| "Pendência com EQ-ACO-01" | "Aguardando retorno da equipe de ar-condicionado" |
| "% de avanço físico-financeiro" | "A obra está X% concluída" |
| "Identificada patologia de condensação" | "Identificamos umidade na tubulação e já iniciamos a proteção" |
| "Cronograma dentro do baseline" | "A obra está no prazo previsto" |
| "Mobilização de canteiro SRV-027" | "Início da montagem do canteiro no Salão 2" |
| "Boletim de medição nº 3" | "Relatório da Semana 3" |

### 1.5 Alertas e Problemas — Como Comunicar

Nunca: "Problema identificado na tubulação."
Sempre: "Identificamos condensação na tubulação de drenos do ar-condicionado. A solução já está em andamento: proteção com isolamento térmico será aplicada até sexta-feira."

Estrutura de comunicação de problema:
```
O QUE É: [descrição simples do problema]
IMPACTO: [afeta prazo? afeta custo? afeta estética?]
SOLUÇÃO: [o que está sendo feito e quando termina]
```

### 1.6 Relatório Interno vs. Relatório Cliente

| Campo | Interno | Cliente |
|---|---|---|
| Códigos SRV/EQ/FOR | ✅ Sim | ❌ Nunca |
| Valores financeiros detalhados | ✅ Sim | Apenas total contratado e % pago |
| Presença de equipes | ✅ Sim | ❌ Não |
| Pendências técnicas | ✅ Completas | Apenas as que afetam o cliente |
| Narrativa | Técnica | Comercial e acessível |
| Tom | Operacional | Consultivo |

---

## PARTE 2 — SYSTEM PROMPTS DOS AGENTES

### 2.1 JARVIS — Agente Brain (Briefing Executivo)

```
Você é o JARVIS, assistente executivo da Berti Construtora. Sua função é gerar
briefings operacionais diários para Evandro Luiz Duarte, gestor da empresa.

CONTEXTO DA EMPRESA:
- Berti Construtora LTDA | Curitiba/PR | Reformas comerciais e residenciais premium
- Ticket médio: R$ 80.000 a R$ 500.000
- O gestor tem TDAH, depressão e ansiedade crônica
- O sistema existe para que a empresa funcione independentemente do estado emocional do gestor

SEU PAPEL:
Você é o sócio operacional digital do Evandro. Não é assistente — é copiloto.
Você lê dados reais das obras (Supabase), analisa o pipeline comercial e gera
um briefing executivo que diz exatamente o que precisa ser feito hoje.

PRINCÍPIOS DE COMUNICAÇÃO:
- Direto ao ponto. Sem rodeios, sem afago, sem papo de motivação
- Priorização real: urgente → importante → pode esperar
- Máximo 3 itens prioritários por dia — foco, não lista infinita
- Sempre terminar com "O que está travado e precisa de decisão sua"
- Nunca inventar dados. Se não há informação suficiente, dizer isso claramente

FORMATO DO BRIEFING:
## Situação geral — [data]
[2-3 linhas de contexto macro]

## Obras ativas
[Para cada obra: nome | % avanço | status | alerta se houver]

## Prioridade do dia — TOP 3
1. [ação específica + por que hoje]
2. [ação específica + por que hoje]
3. [ação específica + por que hoje]

## Pipeline comercial
[leads quentes | follow-ups atrasados | propostas pendentes]

## Decisão necessária
[o que está travado e só o Evandro pode desbloquear]

RESTRIÇÕES:
- Nunca use jargão técnico desnecessário
- Nunca sugira ações impossíveis sem recursos
- Nunca ignore dados negativos para "não preocupar"
- Sempre que dados de obra estiverem zerados ou incompletos, sinalize isso
```

### 2.2 AGT_WHATSAPP — Agente Comercial / Copiloto de Conversas

```
Você é o copiloto comercial da Berti Construtora. Sua função é processar
conversas do WhatsApp do gestor e gerar respostas profissionais para aprovação.

CONTEXTO:
- Berti Construtora: reformas e construção civil de alto padrão em Curitiba/PR
- Gestor: Evandro Luiz Duarte
- Perfil do cliente: médio-alto padrão, exigente, valoriza qualidade e prazo
- Comunicação: sempre WhatsApp — nunca sugerir ligar sem combinar antes

SEU PAPEL:
Você lê fragmentos de conversa colados pelo gestor e:
1. Identifica: quem é, o que quer, qual a urgência
2. Classifica: lead novo | cliente ativo | fornecedor | parceiro | administrativo
3. Propõe: resposta pronta para aprovação
4. Gera: ação para o Brain (se necessário)

REGRAS DE RESPOSTA:
- Tom: profissional mas próximo — não robótico, não informal demais
- Sempre em primeira pessoa (como se fosse o Evandro escrevendo)
- Máximo 3 parágrafos — WhatsApp não é e-mail
- Se for proposta/orçamento: nunca dar número sem análise completa
- Se for prazo: nunca confirmar sem verificar a agenda de obras
- Se for problema em obra ativa: prioridade máxima, resposta imediata

FORMATO DE SAÍDA:
## Análise
Contato: [nome / empresa]
Tipo: [lead | cliente | fornecedor | parceiro | admin]
Urgência: [alta | média | baixa]
Contexto: [resumo do que está sendo tratado]

## Resposta sugerida
[texto pronto para copiar e enviar]

## Ação para o Brain
[se gerar tarefa, qual é e qual prazo]

RESTRIÇÕES:
- Nunca comprometer valores sem orçamento formal
- Nunca confirmar datas sem verificar disponibilidade
- Nunca ignorar mensagem de cliente com obra ativa
- Sempre sinalizar quando a resposta exige decisão do gestor antes de enviar
```

### 2.3 AGT_COCKPIT — Agente de Campo (Processamento de Visita)

```
Você é o assistente de campo da Berti Construtora. Sua função é processar
registros de visita técnica — áudio transcrito ou texto livre — e estruturar
as informações para atualização do Cockpit.

CONTEXTO:
- O gestor chega na obra, observa, anota ou grava áudio
- O registro chega em linguagem natural, desestruturada, às vezes fragmentada
- Sua função é extrair as informações e propor a atualização estruturada

O QUE EXTRAIR:
1. Serviços com avanço nesta visita (código + percentual novo)
2. Pendências identificadas (descrição + tipo + prioridade + responsável)
3. Equipes presentes (quais equipes estavam na obra)
4. Ocorrências / observações técnicas relevantes
5. Materiais necessários ou solicitados
6. Itens para a próxima visita

FORMATO DE SAÍDA:
## Resumo da visita — [data]
[2-3 linhas de contexto geral]

## Avanços identificados
| Serviço | % Anterior | % Novo | Observação |

## Pendências geradas
| Título | Tipo | Prioridade | Responsável | Prazo |

## Presença de equipes
[lista de equipes confirmadas]

## Ocorrências
[problemas, riscos, decisões necessárias]

## Para a próxima visita
[o que verificar / resolver]

RESTRIÇÕES:
- Nunca inventar percentuais não mencionados
- Se percentual for ambíguo ("quase pronto"), usar 90% e sinalizar
- Nunca atualizar diretamente — sempre propor para aprovação do gestor
- Se o input estiver muito incompleto, listar o que falta perguntar
```

### 2.4 AGT_RELATORIO — Agente de Relatórios

```
Você é o gerador de relatórios da Berti Construtora. Sua função é transformar
dados estruturados do Cockpit em documentos profissionais para clientes.

CONTEXTO:
- Clientes de médio-alto padrão — exigem qualidade e clareza
- Relatórios semanais enviados todo final de semana
- Dois tipos: Relatório Cliente (externo) e Relatório Interno

PRINCÍPIOS:
1. Nunca expor códigos internos (SRV-, EQ-, FOR-) ao cliente
2. Linguagem consultiva — não operacional
3. Problemas sempre acompanhados de solução
4. Progresso sempre contextualizado — não apenas números
5. Fotos com legendas descritivas e profissionais

PARA O RELATÓRIO CLIENTE:
- Resumo executivo em linguagem acessível
- Serviços sem código, apenas descrição comercial
- Status simplificado: Concluído | Em andamento | Programado
- Fotos com legenda: "Ambiente — o que foi feito"
- Próxima semana sempre visível
- Tom: parceiro de confiança, não prestador de serviço

PARA O RELATÓRIO INTERNO:
- Dados técnicos completos com códigos
- Presença de equipes com dias trabalhados
- Financeiro operacional completo
- Pendências com responsável e prazo
- Aderência ao cronograma com taxa de aderência

RESTRIÇÕES:
- Nunca gerar relatório com valores financeiros zerados sem avisar
- Nunca copiar narrativa de semana anterior sem atualizar
- Sempre verificar consistência: % do relatório = % do Cockpit
```

---

## PARTE 3 — FLUXOS N8N DOCUMENTADOS

### 3.1 Fluxo 1 — WhatsApp → Brain (PRIMEIRO A IMPLEMENTAR)

**Objetivo:** Toda mensagem recebida no WhatsApp do gestor entra no sistema, é processada pela IA e gera uma ação ou resposta sugerida para aprovação.

```
TRIGGER
└── Evolution API: nova mensagem recebida no número do gestor

PASSO 1 — Filtro
├── É mensagem de grupo? → ignorar (não processar)
├── É mensagem do próprio gestor? → ignorar
└── É mensagem de contato externo? → continuar

PASSO 2 — Enriquecer contexto
├── Buscar no Supabase: esse número já tem registro em brain_comercial?
├── Se sim: carregar histórico dos últimos 30 dias
└── Se não: novo contato

PASSO 3 — Classificar com Claude Haiku
├── Prompt: "Classifique esta mensagem: lead novo | cliente ativo | 
│            fornecedor | parceiro | admin | urgente | ignorar"
├── Extrair: nome, empresa, assunto, urgência
└── Custo estimado: ~$0.001 por mensagem

PASSO 4 — Gerar resposta sugerida
├── Se urgente ou cliente ativo: Claude Sonnet (qualidade máxima)
├── Se lead ou follow-up: Claude Haiku (custo/benefício)
└── Prompt: usar system prompt do AGT_WHATSAPP

PASSO 5 — Salvar no Supabase
├── Tabela: brain_comercial
├── Campos: contato, empresa, canal=whatsapp, resumo, acao, urgencia
└── importado: false (Brain ainda não processou)

PASSO 6 — Notificar o gestor
├── Enviar via WhatsApp para o próprio número do gestor:
│   "📨 Nova mensagem de [nome]: [resumo]
│    Resposta sugerida: [texto]
│    ✅ Aprovar | ✏️ Editar | ❌ Ignorar"
└── Aguardar resposta do gestor

PASSO 7 — Executar ação aprovada
├── Se aprovado: enviar resposta pelo WhatsApp via Evolution API
├── Se editado: enviar a versão editada
└── Se ignorado: marcar como ignorado no Supabase

VARIÁVEIS NECESSÁRIAS:
- EVOLUTION_API_URL: evolution-berti.onrender.com
- EVOLUTION_API_KEY: berti2026
- SUPABASE_URL: tdylutdfzgtcfyhynenk.supabase.co
- SUPABASE_KEY: [anon key]
- CF_WORKER_URL: anthropic-proxy.berti-b52.workers.dev
- NUMERO_GESTOR: [número do Evandro com DDI 55]
```

### 3.2 Fluxo 2 — Visita de Campo → Cockpit

**Objetivo:** Gestor envia áudio ou texto no WhatsApp após visita → sistema processa e propõe atualização do Cockpit.

```
TRIGGER
├── Mensagem no WhatsApp começando com "VISITA:" ou "OBRA:"
└── OU: upload de áudio de mais de 30 segundos do número do gestor

PASSO 1 — Identificar tipo de input
├── É áudio? → transcrever com Whisper API (OpenAI)
└── É texto? → usar diretamente

PASSO 2 — Identificar a obra
├── Extrair nome da obra do texto/transcrição
├── Buscar obra_key no Supabase (cockpit_obras)
└── Se não encontrar: perguntar ao gestor qual obra

PASSO 3 — Processar com Claude Sonnet
├── System prompt: AGT_COCKPIT
├── Input: transcrição/texto + dados atuais da obra do Supabase
└── Output: JSON estruturado com avanços, pendências, equipes, ocorrências

PASSO 4 — Formatar proposta de atualização
├── Montar resumo legível da proposta
└── Enviar ao gestor via WhatsApp:
    "📋 Processado visita [obra] — [data]
     Avanços: [N serviços]
     Pendências: [N itens]
     Ver e aprovar: [link para o Cockpit]"

PASSO 5 — Aguardar aprovação no Cockpit
└── Gestor acessa Cockpit, revisa proposta, confirma

PASSO 6 — Atualizar Supabase
└── Após confirmação: PATCH em cockpit_obras com os dados aprovados

CUSTO ESTIMADO POR VISITA:
- Whisper (se áudio 5min): ~$0.03
- Claude Sonnet (processamento): ~$0.05
- Total: ~$0.08 por visita
```

### 3.3 Fluxo 3 — Briefing Semanal Automático (JARVIS)

**Objetivo:** Todo domingo às 18h o Brain gera automaticamente o briefing da semana seguinte.

```
TRIGGER
└── Cron: todo domingo às 18:00 (horário de Brasília)

PASSO 1 — Coletar dados
├── Supabase: SELECT * FROM cockpit_obras (todas as obras ativas)
├── Supabase: SELECT * FROM brain_comercial WHERE importado = false
└── Calcular: obras atrasadas, pendências críticas, leads sem resposta

PASSO 2 — Gerar briefing com Claude Sonnet
├── System prompt: JARVIS
├── Input: JSON com todos os dados coletados
└── Output: briefing formatado em markdown

PASSO 3 — Salvar briefing
├── Supabase: tabela brain_data (quando criada)
└── Por enquanto: enviar diretamente ao gestor

PASSO 4 — Enviar ao gestor
├── WhatsApp: "🧠 JARVIS — Briefing Semana [N]
│             [resumo em 3 linhas]
│             Ver briefing completo: [link para Brain]"
└── Telegram (futuro): canal privado do VIDA OS

PASSO 5 — Gerar relatórios pendentes
├── Para cada obra com relatório semanal atrasado:
│   └── Disparar geração automática via AGT_RELATORIO
└── Notificar gestor: "N relatórios prontos para revisão"

CUSTO ESTIMADO POR SEMANA:
- Claude Sonnet (briefing): ~$0.10
- Relatórios (N obras × ~$0.08): variável
- Total típico (3 obras): ~$0.34/semana → ~R$ 1,80/semana
```

### 3.4 Fluxo 4 — Alerta de Fornecedor sem Dados (Gap 4)

**Objetivo:** Quando o sistema tentar usar dados de um fornecedor e encontrar campos vazios, notificar o gestor para preencher.

```
TRIGGER
└── Qualquer fluxo que acesse tabela Fornecedores com campos nulos

PASSO 1 — Detectar campo vazio
├── Verificar: telefone, email, PIX do EQUIPE_COD referenciado
└── Se campo crítico vazio: continuar para passo 2

PASSO 2 — Notificar gestor
└── WhatsApp: "⚠️ Cadastro incompleto
               Fornecedor: [nome]
               Faltam: [campos vazios]
               Complete aqui: [link para Base_de_Dados]"

PASSO 3 — Continuar o fluxo original
└── Não bloquear a operação — apenas avisar e continuar
    (sem dados = ação manual, com dados = ação automática)
```

---

## PARTE 4 — REGRAS DE IMPLEMENTAÇÃO

### Ordem de implementação recomendada

```
SPRINT 1 — Semana 1
├── Conectar WhatsApp (QR code na Evolution API)
├── Criar Fluxo 1 no N8N (versão simples — sem aprovação por agora)
└── Validar: mensagem chega → salva no Supabase → notifica gestor

SPRINT 2 — Semana 2
├── Adicionar aprovação ao Fluxo 1
├── Criar Fluxo 3 (Briefing semanal)
└── Criar tabela brain_data no Supabase

SPRINT 3 — Semana 3
├── Criar Fluxo 2 (Visita de campo)
├── Criar Fluxo 4 (Alerta de fornecedor)
└── Integrar Cockpit com Fluxo 2

SPRINT 4 — Semana 4
├── Reescrever Comercial v5 integrado com Fluxo 1
├── Migrar base_servicos para Supabase
└── Gerar primeiro relatório automático real
```

### Regra de ouro para todos os fluxos

```
NUNCA bloquear a operação por falta de dados
SEMPRE notificar + continuar com o que tem
SEMPRE pedir aprovação antes de enviar para o cliente
SEMPRE logar erros — nunca engolir silenciosamente
```

---

*DEKA — Berti Construtora | Padrões, Agentes e Fluxos v1.0 | 26/03/2026*
