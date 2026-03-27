# DEKA OS — Agentes, Workflows e Tom de Comunicação

> Este arquivo é a referência para lógica de IA, prompts dos agentes, fluxos N8N
> e padrão de comunicação com clientes de médio-alto padrão.

---

## 1. O Esquadrão de Agentes (Claude)

Os agentes operam como "Skills" isoladas em seus domínios, orquestrados pelo N8N.
Cada agente tem um único domínio de responsabilidade e **nunca** ultrapassa seus limites.

### AGT_BRAIN — JARVIS (Executivo Central)

| Atributo | Valor |
|---|---|
| **Modelo** | `claude-sonnet-4-20250514` |
| **Trigger** | Domingo às 07h via N8N (cron job) |
| **Input** | Dados das tabelas `obras`, `brain_data`, `brain_comercial` (últimos 7 dias) |
| **Output** | Briefing semanal em Markdown → salvo em `brain_data` (tipo: `briefing`) |
| **Tabelas que lê** | `obras`, `obra_servicos`, `obra_pendencias`, `brain_data`, `brain_comercial` |
| **Tabelas que escreve** | `brain_data` |

**System Prompt Base do JARVIS:**
```
Você é o JARVIS, assistente executivo central da Berti Construtora.
Seu papel é sintetizar o estado atual de todas as obras e operações comerciais
em um briefing semanal claro e acionável para o gestor (que tem TDAH).

Regras de formato:
- Use cabeçalhos em Markdown (## e ###)
- Priorize: 🔴 Urgente → 🟡 Atenção → 🟢 OK
- Cada item de ação deve ter: O QUÊ | QUANDO | QUEM
- Máximo 500 palavras no resumo executivo
- Termine com "Próximos 7 dias: [lista de 3-5 prioridades]"
```

---

### AGT_WHATSAPP (Triagem e Copiloto Comercial)

| Atributo | Valor |
|---|---|
| **Modelo** | `claude-haiku-4-5` (triagem) / `claude-sonnet-4-20250514` (redação) |
| **Trigger** | Nova mensagem recebida pelo Evolution API → N8N |
| **Input** | Mensagem do WhatsApp + histórico de `brain_comercial` do contato |
| **Output** | `proxima_acao` e `resposta_ia` em `brain_comercial` (aguarda aprovação do gestor) |
| **Tabelas que lê** | `brain_comercial` |
| **Tabelas que escreve** | `brain_comercial` |

**Fluxo de aprovação obrigatório:**
```
Mensagem recebida
  → AGT_WHATSAPP analisa e rascunha resposta
  → Salva em brain_comercial (aprovado_gestor = false)
  → Gestor recebe notificação no DEKA OS
  → Gestor aprova ou edita a resposta
  → N8N envia via Evolution API (aprovado_gestor = true)
  → Atualiza enviado_em
```

> ⛔ O AGT_WHATSAPP **nunca** envia mensagens sem aprovação do gestor.

---

### AGT_COCKPIT (Processador de Visitas de Obra)

| Atributo | Valor |
|---|---|
| **Modelo** | `claude-sonnet-4-20250514` |
| **Trigger** | Gestor grava áudio no Cockpit → Whisper transcreve → N8N aciona |
| **Input** | Transcrição do Whisper + dados atuais da obra (`obra_servicos`, `obra_pendencias`) |
| **Output** | JSON validado (Payload Sync) → salvo em `obra_visitas.payload_sync` |
| **Tabelas que lê** | `obras`, `obra_servicos`, `obra_pendencias` |
| **Tabelas que escreve** | `obra_visitas` |

**Estrutura do Payload Sync (output obrigatório do AGT_COCKPIT):**
```json
{
  "obra_id": "uuid-da-obra",
  "data_visita": "2025-07-06",
  "resumo": "Texto do resumo para o cliente (sem jargões técnicos)",
  "atualizacoes_servicos": [
    {
      "codigo": "SRV-013",
      "percentual_concluido": 75,
      "observacao": "Forro da sala concluído. Iniciando banheiros."
    }
  ],
  "novas_pendencias": [
    {
      "descricao": "Aguardar entrega do porcelanato (previsto: 08/07)",
      "prioridade": "alta",
      "responsavel": "Fornecedor XYZ"
    }
  ],
  "pendencias_resolvidas": ["uuid-da-pendencia-1"]
}
```

**System Prompt Base do AGT_COCKPIT:**
```
Você é o AGT_COCKPIT da Berti Construtora. Você recebe a transcrição de um
áudio gravado pelo engenheiro responsável durante uma visita à obra.

Sua tarefa é extrair e estruturar APENAS os dados mencionados na transcrição.
NÃO invente informações não mencionadas. Se o gestor não citou um serviço,
não o inclua no payload.

Retorne APENAS o JSON válido com a estrutura do Payload Sync.
Não inclua texto antes ou depois do JSON.
```

---

### AGT_RELATORIO (Gerador de Relatórios ao Cliente)

| Atributo | Valor |
|---|---|
| **Modelo** | `claude-haiku-4-5` |
| **Trigger** | Manual (gestor solicita) ou automático (sexta-feira) |
| **Input** | Dados de `obras`, `obra_servicos`, `obra_visitas` da semana |
| **Output** | Relatório em Markdown → enviado por WhatsApp ou email |
| **Tabelas que lê** | `obras`, `obra_servicos`, `obra_visitas`, `obra_pendencias` |
| **Tabelas que escreve** | Nenhuma (somente leitura) |

---

## 2. Workflows N8N

O N8N orquestra todas as rotinas mecânicas. O gestor **nunca** executa tarefas de integração.

### Fluxo 1 — WhatsApp Inbound (Triagem Comercial)
```
WhatsApp (cliente/lead)
  → Evolution API (webhook)
  → N8N: recebe e valida mensagem
  → N8N: busca histórico em brain_comercial (Supabase)
  → N8N: envia contexto para AGT_WHATSAPP (Cloudflare Worker)
  → N8N: salva resposta_ia em brain_comercial (aprovado_gestor = false)
  → N8N: notifica gestor via DEKA OS (badge no Brain)
```

### Fluxo 2 — Cockpit (Processamento de Áudio de Obra)
```
Gestor grava áudio (3–5 min) no Cockpit
  → Frontend: MediaRecorder → Blob
  → Frontend: envia Blob para Cloudflare Worker (Whisper)
  → Worker: retorna transcrição
  → Frontend: exibe transcrição para revisão do gestor
  → Gestor aprova transcrição
  → Frontend: envia transcrição + contexto da obra para AGT_COCKPIT
  → AGT_COCKPIT: retorna Payload Sync (JSON)
  → Frontend: exibe preview do Payload para aprovação
  → Gestor aprova
  → Frontend: aplica Payload no Supabase
  → Atualiza obra_visitas.status_sync para 'aplicado'
```

### Fluxo 3 — Briefing Semanal (JARVIS / Domingo)
```
N8N: cron job aos domingos às 07:00
  → N8N: coleta dados das últimas 168h do Supabase
  → N8N: envia para JARVIS (Cloudflare Worker)
  → JARVIS: gera briefing em Markdown
  → N8N: salva em brain_data (tipo: 'briefing', status: 'pendente')
  → N8N: notifica gestor no DEKA OS
```

---

## 3. O Padrão Berti de Comunicação (Tom de Voz com o Cliente)

Os clientes da Berti Construtora são do segmento **médio-alto padrão** (R$ 80k – R$ 500k+).
São exigentes, têm agenda ocupada e esperam comunicação clara, direta e profissional.

### Regras Invioláveis de Comunicação

#### 3.1 — Tradução de Jargões Técnicos (OBRIGATÓRIO)
O AGT_RELATORIO e AGT_WHATSAPP **nunca** expõem dados internos ao cliente.

| ❌ NUNCA mostrar ao cliente | ✅ SEMPRE usar com o cliente |
|---|---|
| "SRV-013 — 75% concluído" | "O fechamento do forro da sala está 75% concluído" |
| "EQ-ACO-01 pendente" | "A equipe de acabamento iniciará os trabalhos na quinta-feira" |
| "Pendência P-042 aberta" | "Estamos aguardando a entrega do porcelanato, prevista para sexta" |
| "Obra ID: 8f3a-..." | "Seu apartamento na Vila Madalena" |

#### 3.2 — Transparência Proativa (Nunca Problema Sem Solução)
> **Regra:** Nunca comunicar um problema ao cliente sem apresentar a solução
> (ou o plano de ação) simultaneamente.

```
❌ ERRADO: "Houve um atraso na entrega do porcelanato."

✅ CORRETO: "O porcelanato que escolhemos para seu banheiro teve um pequeno
atraso na entrega (novo prazo: sexta-feira). Para não impactar o cronograma,
nossa equipe adiantará o trabalho elétrico do corredor nesta semana.
A previsão de conclusão permanece inalterada."
```

#### 3.3 — Formato do Relatório Semanal ao Cliente
O relatório deve ser lido em **menos de 3 minutos** e seguir esta estrutura:

```markdown
# Atualização Semanal — [Nome da Obra]
📅 Semana de [data início] a [data fim]

## ✅ O que avançamos esta semana
[2-4 bullets com progresso em linguagem simples]

## 📋 O que estamos resolvendo
[Máximo 2 itens — cada um com a solução em andamento]

## 📆 O que esperar na próxima semana
[2-3 bullets com previsão clara]

**Avanço geral da obra: [X]%**
Dúvidas? Estamos à disposição.
```

#### 3.4 — Tom de Voz
- **Profissional, mas acessível.** Sem termos técnicos não explicados.
- **Direto ao ponto.** O cliente não lê textos longos.
- **Positivo e seguro.** Transmitir controle e competência.
- **Nunca use:** "problema", "erro", "falha", "atrasado" sem solução imediata.
- **Use:** "ajuste", "otimização", "adiantamos", "resolvemos".

---

## 4. Modelos e Contextos de Uso

| Situação | Modelo recomendado | Justificativa |
|---|---|---|
| Briefing semanal JARVIS | `claude-sonnet-4-20250514` | Análise complexa, raciocínio multi-fonte |
| Processamento de áudio (Cockpit) | `claude-sonnet-4-20250514` | Extração estruturada de JSON validado |
| Triagem de WhatsApp | `claude-haiku-4-5` | Alta velocidade, baixo custo, tarefa simples |
| Redação de resposta ao lead | `claude-sonnet-4-20250514` | Qualidade de escrita, contexto de vendas |
| Relatório semanal ao cliente | `claude-haiku-4-5` | Template previsível, baixo custo |
| Análise de contrato/orçamento | `claude-sonnet-4-20250514` | Precisão crítica |
