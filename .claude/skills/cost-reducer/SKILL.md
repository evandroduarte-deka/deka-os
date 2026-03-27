---
name: cost-reducer
description: >
  Use when building any AI agent in DEKA OS (AGT_BRAIN, AGT_COCKPIT,
  AGT_WHATSAPP, AGT_RELATORIO). Optimizes token usage and API costs.
  Trigger: any call to Cloudflare Worker or Claude API in brain.js, cockpit.js.
---

# Cost-Reducer - DEKA OS v2.0

## Limites de max_tokens por Agente

AGT_COCKPIT   -> 300   (respostas curtas de campo)
AGT_WHATSAPP  -> 500   (mensagens de cliente)
AGT_BRAIN     -> 1500  (analises mais completas)
AGT_RELATORIO -> 3000  (relatorio dominical completo)

## Regra de Ouro

Cache local disponivel? Nao chamar API.
Supabase resolve? Nao chamar API.
Chamar API apenas quando raciocinio ou linguagem natural e essencial.

## Whisper

Sempre enviar language: 'pt' para evitar deteccao automatica (mais barato).
Timeout: 45s no cockpit, 30s no brain.

## Log de Custo no Worker

Logar tokens em cada chamada:
console.log('[DEKA][Cost] agente: in=X out=Y');

Usar response.usage.input_tokens e response.usage.output_tokens.
