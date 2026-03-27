-- ============================================================================
-- DEKA OS — Scripts SQL para Supabase
-- Tabelas: obra_servicos, obra_pendencias, obra_visitas
-- ============================================================================
-- Referência: ARCHITECTURE.md (schemas oficiais)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabela: obra_servicos
-- Lista de serviços (linhas de execução) de cada obra
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS obra_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  descricao_interna text NOT NULL,
  descricao_cliente text NOT NULL,
  equipe_codigo text NOT NULL,
  percentual_concluido numeric NOT NULL DEFAULT 0 CHECK (percentual_concluido >= 0 AND percentual_concluido <= 100),
  valor_contratado numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_obra_servicos_obra_id ON obra_servicos(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_servicos_codigo ON obra_servicos(codigo);

-- RLS (Row Level Security)
ALTER TABLE obra_servicos ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "Permitir leitura pública de obra_servicos"
  ON obra_servicos
  FOR SELECT
  USING (true);

-- ----------------------------------------------------------------------------
-- 2. Tabela: obra_pendencias
-- Fila de prioridades técnicas por obra
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS obra_pendencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  prioridade text NOT NULL CHECK (prioridade IN ('critica', 'alta', 'media', 'baixa')),
  responsavel text NOT NULL,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'resolvida')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_obra_pendencias_obra_id ON obra_pendencias(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_pendencias_status ON obra_pendencias(status);
CREATE INDEX IF NOT EXISTS idx_obra_pendencias_prioridade ON obra_pendencias(prioridade);

-- RLS (Row Level Security)
ALTER TABLE obra_pendencias ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "Permitir leitura pública de obra_pendencias"
  ON obra_pendencias
  FOR SELECT
  USING (true);

-- ----------------------------------------------------------------------------
-- 3. Tabela: obra_visitas
-- Registros diários gerados pelo áudio processado do Cockpit
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS obra_visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data_visita date NOT NULL,
  transcricao_raw text,
  resumo_ia text,
  payload_sync jsonb,
  status_sync text NOT NULL DEFAULT 'pendente' CHECK (status_sync IN ('pendente', 'aplicado', 'erro')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_obra_visitas_obra_id ON obra_visitas(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_visitas_data_visita ON obra_visitas(data_visita);
CREATE INDEX IF NOT EXISTS idx_obra_visitas_status_sync ON obra_visitas(status_sync);

-- RLS (Row Level Security)
ALTER TABLE obra_visitas ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública
CREATE POLICY "Permitir leitura pública de obra_visitas"
  ON obra_visitas
  FOR SELECT
  USING (true);

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================
-- Instruções:
-- 1. Acesse o Supabase SQL Editor
-- 2. Cole este script completo
-- 3. Execute
-- 4. Verifique se as 3 tabelas foram criadas com sucesso
-- ============================================================================
