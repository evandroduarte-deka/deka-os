---
name: n8n-workflows
description: >
  Use when building N8N workflows for DEKA OS. Covers WhatsApp Inbound,
  Audio Processing (Whisper), and Briefing Dominical. Always output valid
  N8N JSON ready to import. Trigger: N8N, workflow, automacao, WhatsApp
  pipeline, Evolution API, briefing dominical.
---

# N8N Workflows - DEKA OS v2.0

## Workflows

1. WhatsApp Inbound
   Trigger: Webhook Evolution API
   Steps: Receber msg -> Classificar intencao (Claude) -> Roteamento
   Destinos: Supabase (log) + Cockpit (se obra) + Gestor (se urgente)

2. Audio Processing
   Trigger: Audio maior que 30s recebido no WhatsApp
   Steps: Download audio -> POST Worker /whisper -> Salvar Supabase
   Fallback: Se Whisper falha -> salvar raw_audio_url + flag transcricao_pendente: true

3. Briefing Dominical
   Trigger: Cron domingo 18h (America/Sao_Paulo)
   Steps: Query Supabase 7 dias -> AGT_RELATORIO (Claude) -> WhatsApp gestor

## Regras de Seguranca

- NUNCA hardcodar X-Deka-Token nos nos - usar $env.DEKA_TOKEN
- NUNCA hardcodar chaves Supabase - usar credenciais N8N
- Todo HTTP Request com timeout de 30s configurado
- Todo workflow com Error Trigger conectado ao Supabase tabela deka_logs
