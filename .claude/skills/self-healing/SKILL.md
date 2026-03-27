---
name: self-healing
description: >
  Use for ALL error handling in DEKA OS. Every try/catch, fetch and
  Supabase query MUST follow these patterns. Zero silent errors.
  Trigger: any async function in deka.js, hub.js, obra.js, cockpit.js, brain.js.
---

# Self-Healing - DEKA OS v2.0

## Padrao Obrigatorio de try/catch

todo catch DEVE ter console.error E showToast. Nunca silencioso.

try { ... }
catch (error) {
  console.error('[DEKA][NomeDoModulo] Contexto:', error);
  showToast(error.message || 'Erro inesperado', 'error');
}

## Classificacao de Erros de Rede

AbortError          -> 'Timeout: 15s sem resposta'
!navigator.onLine   -> 'Sem conexao com internet'
HTTP 5xx            -> 'Erro interno do servidor'
HTTP 4xx            -> 'Erro de autenticacao'
outros              -> error.message || 'Erro inesperado'

## Modo Degradado

Quando Supabase falha, continuar com cacheGet. Nunca travar a UI.
Mostrar toast de erro apenas se nao havia cache disponivel.

## Smoke Test Obrigatorio

Antes de fechar qualquer sessao, verificar:
- Todo catch loga com console.error('[DEKA][Modulo]', error)
- Todo catch chama showToast(msg, 'error')
- Nenhum catch vazio ou silencioso
- Toda chamada de rede usa fetchComTimeout com AbortController
