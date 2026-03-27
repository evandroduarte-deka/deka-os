# ============================================================
# DEKA OS v2.0 — Instalador de Skills para Claude Code
# Execute em: C:\Users\User\.App Deka OS
# Comando: powershell -ExecutionPolicy Bypass -File instalar-skills-deka.ps1
# ============================================================

$ProjectRoot = "C:\Users\User\.App Deka OS"
$SkillsDir   = "$ProjectRoot\.claude\skills"

Write-Host ""
Write-Host "DEKA OS — Instalador de Skills Claude Code" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Criar estrutura de pastas
Write-Host "[1/6] Criando estrutura .claude/skills..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "$SkillsDir\frontend-design"  | Out-Null
New-Item -ItemType Directory -Force -Path "$SkillsDir\webapp-testing"   | Out-Null
New-Item -ItemType Directory -Force -Path "$SkillsDir\self-healing"     | Out-Null
New-Item -ItemType Directory -Force -Path "$SkillsDir\cost-reducer"     | Out-Null
New-Item -ItemType Directory -Force -Path "$SkillsDir\n8n-workflows"    | Out-Null
Write-Host "    OK — Pastas criadas." -ForegroundColor Green

# 2. Baixar frontend-design (anthropics/skills — oficial)
Write-Host "[2/6] Baixando frontend-design (anthropics/skills)..." -ForegroundColor Yellow
try {
    Invoke-WebRequest `
        -Uri "https://raw.githubusercontent.com/anthropics/skills/main/skills/frontend-design/SKILL.md" `
        -OutFile "$SkillsDir\frontend-design\SKILL.md" `
        -UseBasicParsing
    Write-Host "    OK — frontend-design instalado." -ForegroundColor Green
} catch {
    Write-Host "    ERRO ao baixar frontend-design: $_" -ForegroundColor Red
}

# 3. Baixar webapp-testing (anthropics/skills — oficial)
Write-Host "[3/6] Baixando webapp-testing (anthropics/skills)..." -ForegroundColor Yellow
try {
    Invoke-WebRequest `
        -Uri "https://raw.githubusercontent.com/anthropics/skills/main/skills/webapp-testing/SKILL.md" `
        -OutFile "$SkillsDir\webapp-testing\SKILL.md" `
        -UseBasicParsing
    Write-Host "    OK — webapp-testing instalado." -ForegroundColor Green
} catch {
    Write-Host "    ERRO ao baixar webapp-testing: $_" -ForegroundColor Red
}

# 4. Criar self-healing customizado para DEKA OS
Write-Host "[4/6] Criando skill self-healing (customizada DEKA OS)..." -ForegroundColor Yellow
$SelfHealingContent = @'
---
name: self-healing
description: >
  Use this skill for ALL error handling in DEKA OS. Every try/catch block,
  every fetch call, every Supabase query MUST follow these patterns.
  Zero tolerance for silent errors. Trigger: any async function, fetch, or
  Supabase call in deka.js, hub.js, obra.js, cockpit.js, brain.js.
---

# Self-Healing — DEKA OS v2.0

## Regra Absoluta

Todo erro DEVE ser capturado, logado E exibido. Nunca silencioso.

## Padrão Obrigatório de try/catch

```js
try {
  const data = await fetchComTimeout(url, opcoes);
} catch (error) {
  console.error('[DEKA][NomeDoModulo] Contexto da operação:', error);
  showToast(error.message || 'Erro inesperado', 'error');
  // Se crítico para o módulo, fazer return ou estado de fallback
}
```

## Classificação de Erros de Rede

```js
catch (error) {
  let msg;
  if (error.name === 'AbortError')           msg = 'Timeout: servidor não respondeu em 15s';
  else if (!navigator.onLine)                msg = 'Sem conexão com a internet';
  else if (error.message.includes('HTTP 5')) msg = 'Erro interno do servidor. Tente novamente.';
  else if (error.message.includes('HTTP 4')) msg = 'Erro de autenticação ou recurso não encontrado.';
  else                                       msg = error.message || 'Erro inesperado';

  console.error('[DEKA][Modulo]', error);
  showToast(msg, 'error');
}
```

## Padrão de Modo Degradado

Quando Supabase ou Worker falha, o módulo deve continuar funcionando
com os dados do cache local (cacheGet), nunca travar a UI.

```js
async function carregarDados() {
  // Tentar cache primeiro
  const cached = cacheGet('deka_cache_v2_obras');
  if (cached) renderizarObras(cached);

  // Tentar Supabase em paralelo
  try {
    const { data, error } = await supabase.from('obras').select('*');
    if (error) throw error;
    cacheSet('deka_cache_v2_obras', data, { ttlMinutes: 15 });
    renderizarObras(data);
  } catch (error) {
    console.error('[DEKA][Hub] Falha ao carregar obras:', error);
    // Só mostrar toast se não tinha cache
    if (!cached) showToast('Falha ao carregar obras: ' + error.message, 'error');
  }
}
```

## Smoke Test de Self-Healing

Antes de fechar qualquer sessão, verificar:
- [ ] Todos os catch logam com `console.error('[DEKA][Modulo]', error)`
- [ ] Todos os catch chamam `showToast(msg, 'error')`
- [ ] Nenhum catch está vazio ou com apenas `console.log`
- [ ] Chamadas de rede usam `fetchComTimeout` com AbortController
'@
$SelfHealingContent | Out-File -FilePath "$SkillsDir\self-healing\SKILL.md" -Encoding UTF8
Write-Host "    OK — self-healing criado." -ForegroundColor Green

# 5. Criar cost-reducer customizado para DEKA OS
Write-Host "[5/6] Criando skill cost-reducer (customizada DEKA OS)..." -ForegroundColor Yellow
$CostReducerContent = @'
---
name: cost-reducer
description: >
  Use this skill when building or modifying any AI agent in DEKA OS
  (AGT_BRAIN, AGT_COCKPIT, AGT_WHATSAPP, AGT_RELATORIO). Optimizes
  token usage, prompt caching, and API call patterns to keep monthly
  costs predictable. Trigger: any call to Cloudflare Worker, Claude API,
  or Whisper API in brain.js, cockpit.js, or N8N workflows.
---

# Cost-Reducer — DEKA OS v2.0

## Princípios de Controle de Custo

### 1. Prompts Curtos e Focados

```js
// RUIM — prompt genérico e verbose
const prompt = `Você é um assistente especialista em construção civil e reformas
residenciais de alto padrão. Sua função é analisar as informações da obra e
gerar um relatório detalhado...`;

// BOM — prompt direto ao ponto
const prompt = `Analise esta obra e gere bullet points de ação para o gestor.
Máximo 5 itens. Foco em: prazo, custo, riscos.\n\nObra: ${JSON.stringify(obra)}`;
```

### 2. Cache de Contexto (prompt caching)

Para prompts de sistema que não mudam (persona, regras), usar cache:
```js
// No Cloudflare Worker — marcar system prompt para cache
{
  "model": "claude-opus-4-5",
  "system": [
    {
      "type": "text",
      "text": "Você é o JARVIS da Berti Construtora...",
      "cache_control": { "type": "ephemeral" }  // Cache por 5 min
    }
  ]
}
```

### 3. Limitar max_tokens por Agente

| Agente         | max_tokens | Justificativa                    |
|----------------|------------|----------------------------------|
| AGT_COCKPIT    | 300        | Respostas curtas de campo        |
| AGT_WHATSAPP   | 500        | Mensagens de cliente             |
| AGT_BRAIN      | 1500       | Análises mais completas          |
| AGT_RELATORIO  | 3000       | Relatório dominical completo     |

### 4. Whisper — Reduzir Custo de Transcrição

- Usar `chunked upload` para áudios > 25MB
- Sempre enviar `language: 'pt'` para evitar detecção automática (mais barato)
- Timeout de 45s no cockpit, 30s no brain

### 5. Monitoramento de Custo no Cloudflare Worker

```js
// Logar tokens usados em cada chamada
const tokensIn  = response.usage?.input_tokens  || 0;
const tokensOut = response.usage?.output_tokens || 0;
console.log(`[DEKA][Cost] ${agente}: in=${tokensIn} out=${tokensOut}`);
```

## Regra de Ouro

Se um agente pode responder com cache local → não chamar a API.
Se pode responder com dados do Supabase → não chamar a API.
Chamar a API apenas quando raciocínio ou linguagem natural é essencial.
'@
$CostReducerContent | Out-File -FilePath "$SkillsDir\cost-reducer\SKILL.md" -Encoding UTF8
Write-Host "    OK — cost-reducer criado." -ForegroundColor Green

# 6. Criar n8n-workflows customizado para DEKA OS
Write-Host "[6/6] Criando skill n8n-workflows (customizada DEKA OS)..." -ForegroundColor Yellow
$N8nContent = @'
---
name: n8n-workflows
description: >
  Use this skill when building or describing N8N workflows for DEKA OS.
  Covers: WhatsApp Inbound Pipeline, Audio Processing (Whisper), and
  Briefing Dominical. Always output valid N8N JSON ready to import.
  Trigger: any mention of N8N, workflow, automação, WhatsApp pipeline,
  briefing dominical, Evolution API in AGENTS.md context.
---

# N8N Workflows — DEKA OS v2.0

## Workflows Existentes (ref: AGENTS.md)

### 1. WhatsApp Inbound Pipeline
- Trigger: Webhook Evolution API
- Steps: Receber msg → Classificar intenção (Claude) → Roteamento
- Destinos: Supabase (log) → Cockpit (se obra) → Gestor (se urgente)

### 2. Audio Processing (Whisper)
- Trigger: Audio > 30s recebido no WhatsApp
- Steps: Download áudio → POST Cloudflare Worker /whisper → Salvar transcrição Supabase
- Fallback: Se Whisper falha → salvar raw_audio_url + flag `transcricao_pendente: true`

### 3. Briefing Dominical
- Trigger: Cron domingo 18h (America/Sao_Paulo)
- Steps: Query Supabase (7 dias) → AGT_RELATORIO (Claude) → WhatsApp gestor

## Padrão de Nós N8N para DEKA OS

```json
{
  "nodes": [
    {
      "name": "Webhook Evolution",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "deka-whatsapp",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Cloudflare Worker",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://anthropic-proxy.berti-b52.workers.dev",
        "method": "POST",
        "headers": {
          "X-Deka-Token": "={{ $env.DEKA_TOKEN }}",
          "Content-Type": "application/json"
        }
      }
    }
  ]
}
```

## Regras de Segurança N8N

- NUNCA hardcodar X-Deka-Token nos nós — usar `$env.DEKA_TOKEN`
- NUNCA hardcodar chaves Supabase — usar credenciais N8N
- Todo nó de HTTP Request DEVE ter timeout de 30s configurado
- Todo workflow DEVE ter nó de Error Trigger conectado ao Supabase (tabela `deka_logs`)
'@
$N8nContent | Out-File -FilePath "$SkillsDir\n8n-workflows\SKILL.md" -Encoding UTF8
Write-Host "    OK — n8n-workflows criado." -ForegroundColor Green

# 7. Criar CLAUDE.md referenciando todas as skills
Write-Host ""
Write-Host "[+] Criando CLAUDE.md com referências às skills..." -ForegroundColor Yellow
$ClaudeMdContent = @'
# DEKA OS v2.0 — Claude Code Configuration

## Skills Ativas

@.claude/skills/frontend-design/SKILL.md
@.claude/skills/webapp-testing/SKILL.md
@.claude/skills/self-healing/SKILL.md
@.claude/skills/cost-reducer/SKILL.md
@.claude/skills/n8n-workflows/SKILL.md

## Contexto do Projeto

@SKILL.md
@ARCHITECTURE.md
@AGENTS.md

## Regra de Sessão

Editar apenas 1 arquivo por sessão. Ver SKILL.md para regras completas.
'@
$ClaudeMdContent | Out-File -FilePath "$ProjectRoot\CLAUDE.md" -Encoding UTF8
Write-Host "    OK — CLAUDE.md criado." -ForegroundColor Green

# Resumo final
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "INSTALACAO CONCLUIDA" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Skills instaladas:" -ForegroundColor White
Write-Host "  [OK] frontend-design   (anthropics/skills — oficial)" -ForegroundColor Green
Write-Host "  [OK] webapp-testing    (anthropics/skills — oficial)" -ForegroundColor Green
Write-Host "  [OK] self-healing      (customizada DEKA OS)" -ForegroundColor Green
Write-Host "  [OK] cost-reducer      (customizada DEKA OS)" -ForegroundColor Green
Write-Host "  [OK] n8n-workflows     (customizada DEKA OS)" -ForegroundColor Green
Write-Host ""
Write-Host "Arquivos criados:" -ForegroundColor White
Write-Host "  $ProjectRoot\CLAUDE.md" -ForegroundColor Gray
Write-Host "  $SkillsDir\frontend-design\SKILL.md" -ForegroundColor Gray
Write-Host "  $SkillsDir\webapp-testing\SKILL.md" -ForegroundColor Gray
Write-Host "  $SkillsDir\self-healing\SKILL.md" -ForegroundColor Gray
Write-Host "  $SkillsDir\cost-reducer\SKILL.md" -ForegroundColor Gray
Write-Host "  $SkillsDir\n8n-workflows\SKILL.md" -ForegroundColor Gray
Write-Host ""
Write-Host "Proximo passo: abrir o Claude Code na pasta do projeto." -ForegroundColor Cyan
Write-Host "As skills serao carregadas automaticamente via CLAUDE.md." -ForegroundColor Cyan
Write-Host ""
