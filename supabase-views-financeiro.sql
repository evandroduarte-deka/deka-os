-- ============================================================================
-- DEKA OS — Views financeiras para DRE automático
-- ============================================================================
-- Arquivo: supabase-views-financeiro.sql
-- Versão: 1.0
-- Data: 2026-04-01
--
-- INSTRUÇÕES DE USO:
-- 1. Acesse: https://app.supabase.com/project/tdylutdfzgtcfyhynenk/sql/new
-- 2. Cole este arquivo completo
-- 3. Execute (botão "Run" ou Ctrl+Enter)
--
-- VIEWS CRIADAS:
--   v_dre_por_obra          → DRE consolidado por obra (receitas, despesas, margem)
--   v_vencimentos_proximos  → Contas a pagar/receber nos próximos 30 dias
--   v_saldo_por_conta       → Saldo atual por conta bancária
-- ============================================================================

-- ============================================================================
-- 1. VIEW: DRE por obra (receitas e despesas vinculadas)
-- ============================================================================

CREATE OR REPLACE VIEW v_dre_por_obra AS
SELECT
  o.id AS obra_id,
  o.nome AS obra_nome,
  o.cliente,
  o.status,
  COALESCE(SUM(CASE WHEN f.tipo = 'receita' THEN f.valor END), 0) AS total_receitas,
  COALESCE(SUM(CASE WHEN f.tipo = 'despesa' THEN f.valor END), 0) AS total_despesas,
  COALESCE(SUM(CASE WHEN f.tipo = 'receita' THEN f.valor END), 0) -
  COALESCE(SUM(CASE WHEN f.tipo = 'despesa' THEN f.valor END), 0) AS margem_obra,
  CASE
    WHEN COALESCE(SUM(CASE WHEN f.tipo = 'receita' THEN f.valor END), 0) > 0
    THEN ROUND(
      (COALESCE(SUM(CASE WHEN f.tipo = 'receita' THEN f.valor END), 0) -
       COALESCE(SUM(CASE WHEN f.tipo = 'despesa' THEN f.valor END), 0)) /
      COALESCE(SUM(CASE WHEN f.tipo = 'receita' THEN f.valor END), 1) * 100, 2
    )
    ELSE 0
  END AS margem_percentual,
  COUNT(DISTINCT f.id) AS total_lancamentos
FROM obras o
LEFT JOIN financeiro f ON f.obra_id = o.id
GROUP BY o.id, o.nome, o.cliente, o.status
ORDER BY o.nome;

COMMENT ON VIEW v_dre_por_obra IS
'DRE consolidado por obra. Calcula receitas, despesas, margem absoluta e percentual. Usado pelo módulo financeiro para exibir resumos por obra.';

-- ============================================================================
-- 2. VIEW: Vencimentos próximos (próximos 30 dias)
-- ============================================================================

CREATE OR REPLACE VIEW v_vencimentos_proximos AS
SELECT
  'obra' AS origem,
  f.id,
  o.nome AS referencia,
  f.descricao,
  f.tipo,
  f.valor,
  f.data_vencimento,
  f.status,
  f.categoria,
  (f.data_vencimento - CURRENT_DATE) AS dias_ate_vencimento,
  CASE
    WHEN f.data_vencimento < CURRENT_DATE THEN 'vencido'
    WHEN f.data_vencimento <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgente'
    WHEN f.data_vencimento <= CURRENT_DATE + INTERVAL '15 days' THEN 'proximo'
    ELSE 'planejado'
  END AS criticidade
FROM financeiro f
JOIN obras o ON o.id = f.obra_id
WHERE f.status IN ('em_aberto', 'vencido')
  AND f.data_vencimento IS NOT NULL
  AND f.data_vencimento <= CURRENT_DATE + INTERVAL '30 days'

UNION ALL

SELECT
  'empresa' AS origem,
  fe.id,
  'Berti Construtora' AS referencia,
  fe.descricao,
  'despesa' AS tipo,
  fe.valor,
  fe.data_vencimento,
  fe.status,
  fe.categoria,
  (fe.data_vencimento - CURRENT_DATE) AS dias_ate_vencimento,
  CASE
    WHEN fe.data_vencimento < CURRENT_DATE THEN 'vencido'
    WHEN fe.data_vencimento <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgente'
    WHEN fe.data_vencimento <= CURRENT_DATE + INTERVAL '15 days' THEN 'proximo'
    ELSE 'planejado'
  END AS criticidade
FROM financeiro_empresa fe
WHERE fe.status IN ('em_aberto', 'vencido')
  AND fe.data_vencimento IS NOT NULL
  AND fe.data_vencimento <= CURRENT_DATE + INTERVAL '30 days'

ORDER BY dias_ate_vencimento ASC;

COMMENT ON VIEW v_vencimentos_proximos IS
'Lista de contas a pagar/receber nos próximos 30 dias. Inclui lançamentos de obras e da empresa. Usado para alertas proativos de vencimento.';

-- ============================================================================
-- 3. VIEW: Saldo por conta bancária
-- ============================================================================

CREATE OR REPLACE VIEW v_saldo_por_conta AS
WITH lancamentos_obra AS (
  SELECT
    conta_bancaria,
    SUM(CASE WHEN tipo = 'receita' AND status = 'recebido' THEN valor ELSE 0 END) AS receitas,
    SUM(CASE WHEN tipo = 'despesa' AND status = 'pago' THEN valor ELSE 0 END) AS despesas,
    COUNT(*) AS total_lancamentos
  FROM financeiro
  WHERE conta_bancaria IS NOT NULL
  GROUP BY conta_bancaria
),
lancamentos_empresa AS (
  SELECT
    conta_bancaria,
    0 AS receitas,
    SUM(CASE WHEN status = 'pago' THEN valor ELSE 0 END) AS despesas,
    COUNT(*) AS total_lancamentos
  FROM financeiro_empresa
  WHERE conta_bancaria IS NOT NULL
  GROUP BY conta_bancaria
)
SELECT
  COALESCE(lo.conta_bancaria, le.conta_bancaria) AS conta_bancaria,
  COALESCE(lo.receitas, 0) + COALESCE(le.receitas, 0) AS total_receitas,
  COALESCE(lo.despesas, 0) + COALESCE(le.despesas, 0) AS total_despesas,
  (COALESCE(lo.receitas, 0) + COALESCE(le.receitas, 0)) -
  (COALESCE(lo.despesas, 0) + COALESCE(le.despesas, 0)) AS saldo_atual,
  COALESCE(lo.total_lancamentos, 0) + COALESCE(le.total_lancamentos, 0) AS total_lancamentos
FROM lancamentos_obra lo
FULL OUTER JOIN lancamentos_empresa le
  ON lo.conta_bancaria = le.conta_bancaria
ORDER BY saldo_atual DESC;

COMMENT ON VIEW v_saldo_por_conta IS
'Saldo consolidado por conta bancária. Soma receitas e despesas de obras e da empresa. Usado para conciliação bancária e visão de caixa.';

-- ============================================================================
-- 4. PERMISSÕES (RLS — Read-Only para Anon)
-- ============================================================================

-- As views herdam as permissões das tabelas base.
-- Como financeiro e financeiro_empresa têm RLS habilitado com política de
-- leitura pública (anon), as views também são acessíveis.

-- Caso precise de políticas explícitas no futuro, descomentar:
-- ALTER VIEW v_dre_por_obra OWNER TO postgres;
-- ALTER VIEW v_vencimentos_proximos OWNER TO postgres;
-- ALTER VIEW v_saldo_por_conta OWNER TO postgres;

-- ============================================================================
-- FIM DO ARQUIVO
-- ============================================================================

-- SMOKE TEST (executar manualmente para validar):
-- SELECT * FROM v_dre_por_obra LIMIT 5;
-- SELECT * FROM v_vencimentos_proximos LIMIT 10;
-- SELECT * FROM v_saldo_por_conta;
