-- ============================================================================
-- DEKA OS v3.0.0 — Novas tabelas conforme MASTER.md
-- Execute no Supabase SQL Editor: https://app.supabase.com
-- Projeto: tdylutdfzgtcfyhynenk
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. obra_fotos — registro fotográfico via ImgBB
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS obra_fotos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id       uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  url           text NOT NULL,                    -- URL ImgBB — NUNCA base64
  url_thumb     text,                             -- URL thumbnail ImgBB
  descricao     text,
  etapa         text,                             -- fase da obra quando tirada
  origem        text DEFAULT 'cockpit'            -- cockpit | telegram | manual
                CHECK (origem IN ('cockpit','telegram','manual')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obra_fotos_obra_id    ON obra_fotos(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_fotos_created_at ON obra_fotos(created_at DESC);

ALTER TABLE obra_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública obra_fotos"
  ON obra_fotos FOR SELECT USING (true);
CREATE POLICY "Insert obra_fotos via anon"
  ON obra_fotos FOR INSERT WITH CHECK (true);
CREATE POLICY "Update obra_fotos via anon"
  ON obra_fotos FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 2. obra_compras — compras de material por obra
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS obra_compras (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id       uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data          date NOT NULL DEFAULT CURRENT_DATE,
  descricao     text NOT NULL,
  quantidade    numeric,
  unidade       text,                             -- sacos, m², unid, kg, etc.
  valor_total   numeric NOT NULL DEFAULT 0,
  fornecedor    text,
  nota_fiscal   text,
  categoria     text NOT NULL DEFAULT 'material_outros'
                CHECK (categoria IN (
                  'material_estrutural',
                  'material_hidraulico',
                  'material_eletrico',
                  'material_acabamento',
                  'material_esquadria',
                  'material_outros',
                  'servico_terceiro'
                )),
  origem        text DEFAULT 'cockpit'
                CHECK (origem IN ('cockpit','telegram','manual')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obra_compras_obra_id    ON obra_compras(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_compras_data       ON obra_compras(data DESC);
CREATE INDEX IF NOT EXISTS idx_obra_compras_categoria  ON obra_compras(categoria);

ALTER TABLE obra_compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública obra_compras"
  ON obra_compras FOR SELECT USING (true);
CREATE POLICY "Insert obra_compras via anon"
  ON obra_compras FOR INSERT WITH CHECK (true);
CREATE POLICY "Update obra_compras via anon"
  ON obra_compras FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 3. financeiro — lançamentos vinculados à obra
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financeiro (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id         uuid REFERENCES obras(id) ON DELETE SET NULL,
  tipo            text NOT NULL CHECK (tipo IN ('receita','despesa')),
  descricao       text NOT NULL,
  valor           numeric NOT NULL DEFAULT 0,
  data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date,
  data_pagamento  date,
  status          text NOT NULL DEFAULT 'em_aberto'
                  CHECK (status IN ('em_aberto','vencido','pago','recebido')),
  categoria       text NOT NULL,                  -- ex: taxa_administracao, mao_de_obra
  conta_bancaria  text,                           -- nubank | outro
  fornecedor      text,
  cliente         text,
  origem          text DEFAULT 'manual'
                  CHECK (origem IN ('manual','agente','telegram','extrato')),
  confianca       numeric DEFAULT 1.0,            -- 0.0 a 1.0 — confiança da categorização IA
  revisado        boolean DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_obra_id         ON financeiro(obra_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_tipo            ON financeiro(tipo);
CREATE INDEX IF NOT EXISTS idx_financeiro_status          ON financeiro(status);
CREATE INDEX IF NOT EXISTS idx_financeiro_data_vencimento ON financeiro(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_financeiro_categoria       ON financeiro(categoria);

ALTER TABLE financeiro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública financeiro"
  ON financeiro FOR SELECT USING (true);
CREATE POLICY "Insert financeiro via anon"
  ON financeiro FOR INSERT WITH CHECK (true);
CREATE POLICY "Update financeiro via anon"
  ON financeiro FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 4. financeiro_empresa — despesas fixas da Berti (sem obra_id)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financeiro_empresa (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  descricao       text NOT NULL,
  valor           numeric NOT NULL DEFAULT 0,
  data_lancamento date NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento date,
  data_pagamento  date,
  status          text NOT NULL DEFAULT 'em_aberto'
                  CHECK (status IN ('em_aberto','vencido','pago')),
  categoria       text NOT NULL
                  CHECK (categoria IN (
                    'salario',
                    'prolabore',
                    'contador',
                    'endereco_fiscal',
                    'saude',
                    'impostos',
                    'software',
                    'outros'
                  )),
  conta_bancaria  text,
  fornecedor      text,
  recorrente      boolean DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fin_empresa_status          ON financeiro_empresa(status);
CREATE INDEX IF NOT EXISTS idx_fin_empresa_categoria       ON financeiro_empresa(categoria);
CREATE INDEX IF NOT EXISTS idx_fin_empresa_data_vencimento ON financeiro_empresa(data_vencimento);

ALTER TABLE financeiro_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública financeiro_empresa"
  ON financeiro_empresa FOR SELECT USING (true);
CREATE POLICY "Insert financeiro_empresa via anon"
  ON financeiro_empresa FOR INSERT WITH CHECK (true);
CREATE POLICY "Update financeiro_empresa via anon"
  ON financeiro_empresa FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 5. clientes — CRM
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome            text NOT NULL,
  cpf_cnpj        text,
  email           text,
  telefone        text,
  endereco        text,
  tipo            text DEFAULT 'pessoa_fisica'
                  CHECK (tipo IN ('pessoa_fisica','pessoa_juridica')),
  origem          text,                           -- indicação, instagram, etc.
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome);

ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública clientes"
  ON clientes FOR SELECT USING (true);
CREATE POLICY "Insert clientes via anon"
  ON clientes FOR INSERT WITH CHECK (true);
CREATE POLICY "Update clientes via anon"
  ON clientes FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 6. oportunidades — funil comercial
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oportunidades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid REFERENCES clientes(id) ON DELETE SET NULL,
  nome_lead       text,                           -- antes de virar cliente formal
  telefone_lead   text,
  valor_estimado  numeric DEFAULT 0,
  etapa           text NOT NULL DEFAULT 'novo_lead'
                  CHECK (etapa IN (
                    'novo_lead',
                    'qualificado',
                    'visita_agendada',
                    'proposta_enviada',
                    'negociacao',
                    'fechado_ganho',
                    'fechado_perdido'
                  )),
  origem          text,                           -- whatsapp, instagram, indicacao
  observacoes     text,
  proximo_passo   text,
  data_ultimo_contato date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oportunidades_etapa      ON oportunidades(etapa);
CREATE INDEX IF NOT EXISTS idx_oportunidades_cliente_id ON oportunidades(cliente_id);

ALTER TABLE oportunidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública oportunidades"
  ON oportunidades FOR SELECT USING (true);
CREATE POLICY "Insert oportunidades via anon"
  ON oportunidades FOR INSERT WITH CHECK (true);
CREATE POLICY "Update oportunidades via anon"
  ON oportunidades FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 7. orcamentos — orçamentos por obra
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orcamentos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id         uuid REFERENCES obras(id) ON DELETE SET NULL,
  oportunidade_id uuid REFERENCES oportunidades(id) ON DELETE SET NULL,
  versao          integer NOT NULL DEFAULT 1,
  status          text NOT NULL DEFAULT 'rascunho'
                  CHECK (status IN ('rascunho','enviado','aprovado','recusado')),
  total_servicos  numeric DEFAULT 0,
  total_materiais numeric DEFAULT 0,
  bdi_percentual  numeric DEFAULT 0,
  total_geral     numeric DEFAULT 0,
  prazo_dias      integer,
  observacoes     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orcamentos_obra_id ON orcamentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status  ON orcamentos(status);

ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública orcamentos"
  ON orcamentos FOR SELECT USING (true);
CREATE POLICY "Insert orcamentos via anon"
  ON orcamentos FOR INSERT WITH CHECK (true);
CREATE POLICY "Update orcamentos via anon"
  ON orcamentos FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 8. contratos — gerados ao fechamento
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contratos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id         uuid REFERENCES obras(id) ON DELETE SET NULL,
  cliente_id      uuid REFERENCES clientes(id) ON DELETE SET NULL,
  orcamento_id    uuid REFERENCES orcamentos(id) ON DELETE SET NULL,
  tipo            text NOT NULL
                  CHECK (tipo IN ('cliente','equipe','subempreiteiro')),
  status          text NOT NULL DEFAULT 'rascunho'
                  CHECK (status IN ('rascunho','assinado','cancelado')),
  valor           numeric DEFAULT 0,
  data_assinatura date,
  html_conteudo   text,                           -- HTML do contrato gerado
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contratos_obra_id    ON contratos(obra_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente_id ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status     ON contratos(status);

ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública contratos"
  ON contratos FOR SELECT USING (true);
CREATE POLICY "Insert contratos via anon"
  ON contratos FOR INSERT WITH CHECK (true);
CREATE POLICY "Update contratos via anon"
  ON contratos FOR UPDATE USING (true);

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- Execute após o script para confirmar:
-- ============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'obra_fotos','obra_compras','financeiro',
    'financeiro_empresa','clientes','oportunidades',
    'orcamentos','contratos'
  )
ORDER BY table_name;
-- Resultado esperado: 8 tabelas listadas
