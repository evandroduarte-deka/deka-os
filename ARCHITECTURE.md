# DEKA OS — Arquitetura, Segurança e Dados

> Este arquivo é a **referência definitiva** para banco de dados, segurança de API
> e estrutura do backend. Consulte-o ANTES de escrever qualquer código que acesse
> dados ou faça chamadas de rede.

---

## 1. Segurança e Proxy de IA

### Regra absoluta
**Nenhuma** chave da OpenAI, Anthropic ou outro LLM deve aparecer no frontend.
Qualquer violação desta regra é um bug de segurança crítico.

### Cloudflare Worker (Proxy Único)
- **Endpoint:** `https://anthropic-proxy.berti-b52.workers.dev`
- **Header obrigatório:** `X-Deka-Token: <token_do_gestor>`
- **Rotas do Worker:**

| Rota | Serviço | Uso |
|---|---|---|
| `/v1/messages` | Anthropic Claude | Todos os agentes (JARVIS, Cockpit, Relatório) |
| `/v1/audio/transcriptions` | OpenAI Whisper | Transcrição de áudio do Cockpit |

### Padrão de chamada ao Worker

```js
// ✅ PADRÃO OBRIGATÓRIO para chamadas de IA
async function chamarClaude(mensagens, sistemaPrompt) {
  const resposta = await fetchComTimeout(
    'https://anthropic-proxy.berti-b52.workers.dev/v1/messages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Deka-Token': window.DEKA_CONFIG.token, // carregado de variável de ambiente
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: sistemaPrompt,
        messages: mensagens,
      }),
    }
  );
  return resposta.json();
}
```

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
- Timeout recomendado para áudios longos: **45 segundos** (override do padrão de 15s).

---

## 3. Schemas Oficiais do Supabase (Fonte da Verdade)

> ⚠️ **NUNCA assuma um schema.** Se um campo não estiver listado aqui, consulte
> o gestor antes de usar ou criar.

### Tabela: `obras`
Dados gerais de cada obra ativa.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `nome` | `text` | Nome interno da obra (ex: "Vila Madalena - Apt 42") |
| `cliente` | `text` | Nome do cliente |
| `endereco` | `text` | Endereço completo |
| `data_inicio` | `date` | Data de início contratual |
| `data_previsao_fim` | `date` | Previsão de conclusão |
| `status` | `text` | `ativa` \| `pausada` \| `concluida` |
| `percentual_global` | `numeric` | Avanço físico total (0–100) |
| `created_at` | `timestamptz` | Criação automática |
| `updated_at` | `timestamptz` | Atualização automática |

### Tabela: `obra_servicos`
Lista de serviços (linhas de execução) de cada obra.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `obra_id` | `uuid` | FK → `obras.id` |
| `codigo` | `text` | Código interno (ex: "SRV-013") — **nunca exibir ao cliente** |
| `descricao_interna` | `text` | Descrição técnica para o gestor |
| `descricao_cliente` | `text` | Descrição traduzida para o cliente (ex: "Fechamento do forro") |
| `equipe_codigo` | `text` | Código da equipe (ex: "EQ-ACO-01") — **nunca exibir ao cliente** |
| `percentual_concluido` | `numeric` | Progresso do serviço (0–100) |
| `valor_contratado` | `numeric` | Valor em R$ |
| `created_at` | `timestamptz` | Criação automática |

### Tabela: `obra_pendencias`
Fila de prioridades técnicas por obra.

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

### Tabela: `obra_visitas`
Registros diários gerados pelo áudio processado do Cockpit.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `obra_id` | `uuid` | FK → `obras.id` |
| `data_visita` | `date` | Data da visita |
| `transcricao_raw` | `text` | Texto bruto do Whisper |
| `resumo_ia` | `text` | Resumo gerado pelo AGT_COCKPIT |
| `payload_sync` | `jsonb` | JSON validado com atualizações para o Supabase |
| `status_sync` | `text` | `pendente` \| `aplicado` \| `erro` |
| `created_at` | `timestamptz` | Criação automática |

### Tabela: `brain_comercial`
**ÚNICA** tabela para toda a operação Comercial e WhatsApp.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `uuid` | Chave primária |
| `contato_nome` | `text` | Nome do lead/cliente |
| `contato_numero` | `text` | Número WhatsApp (formato: 5511999999999) |
| `mensagem_original` | `text` | Mensagem recebida via Evolution API |
| `resposta_ia` | `text` | Resposta gerada pelo AGT_WHATSAPP |
| `estagio` | `text` | `lead_frio` \| `lead_quente` \| `orcamento` \| `cliente` |
| `proxima_acao` | `text` | Instrução para o gestor aprovar |
| `aprovado_gestor` | `boolean` | Default: false — gestor aprova antes do envio |
| `enviado_em` | `timestamptz` | Timestamp de envio (nullable) |
| `created_at` | `timestamptz` | Criação automática |

> ⛔ **PROIBIDO** usar ou criar a tabela `comercial_data`. Ela não existe.
> Todo dado comercial vai em `brain_comercial`.

### Tabela: `brain_data`
Tarefas, agenda e briefings do JARVIS.

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

> ⛔ **PROIBIDO** usar localStorage para persistir dados do JARVIS.
> Toda tarefa/agenda vai em `brain_data`.

### Tabela legado: `cockpit_obras` (READ-ONLY)
- Esta tabela é **legado** e não deve ser editada.
- O Brain nunca escreve nela.
- Use apenas para leitura de dados históricos se necessário.

---

## 4. Cliente Supabase (Padrão de Inicialização)

```js
// ✅ PADRÃO — inicialização única em um módulo supabase-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = window.DEKA_CONFIG.supabaseUrl;
const SUPABASE_KEY = window.DEKA_CONFIG.supabaseAnonKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
```

---

## 5. Smoke Test — Checklist de Validação Pré-Entrega

Antes de encerrar qualquer sessão de desenvolvimento, valide mentalmente:

```
[ ] O arquivo tem menos de 3.000 linhas?
[ ] Existe apenas 1 DOMContentLoaded (ou 1 ponto de entrada)?
[ ] Todo fetch usa fetchComTimeout (15s padrão)?
[ ] Todo catch tem console.error + showToast?
[ ] Nenhuma chave de API está hardcoded no frontend?
[ ] O localStorage usa apenas cacheGet/cacheSet com TTL?
[ ] As tabelas usadas existem no schema desta seção?
[ ] A tabela comercial_data NÃO foi referenciada?
[ ] Códigos internos (SRV-*, EQ-*) NÃO aparecem em textos de cliente?
[ ] O arquivo foi entregue COMPLETO (não como patch)?
```
