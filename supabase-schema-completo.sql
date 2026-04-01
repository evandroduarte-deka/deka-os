-- ============================================================================
-- DEKA OS v3.0.0 — Schema Completo do Supabase
-- Atualizado em: 31/03/2026
-- Tabelas: obras, obra_servicos, obra_pendencias, obra_visitas,
--          obra_fotos, obra_compras, financeiro, financeiro_empresa,
--          clientes, oportunidades, orcamentos, contratos,
--          brain_data, brain_comercial
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. obras — obras ativas, pausadas e concluídas
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS obras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cliente text NOT NULL,
  endereco text,
  data_inicio date,
  data_previsao_fim date,
  status text NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa','pausada','concluida')),
  percentual_global numeric DEFAULT 0 CHECK (percentual_global >= 0 AND percentual_global <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obras_status ON obras(status);

ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública obras"
  ON obras FOR SELECT USING (true);
CREATE POLICY "Insert obras via anon"
  ON obras FOR INSERT WITH CHECK (true);
CREATE POLICY "Update obras via anon"
  ON obras FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 2. obra_servicos — serviços de cada obra
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS obra_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  descricao_interna text NOT NULL,
  descricao_cliente text NOT NULL,
  equipe_codigo text NOT NULL,
  percentual_concluido numeric NOT NULL DEFAULT 0 CHECK (percentual_concluido >= 0 AND percentual_concluido <= 100),
  pct_anterior numeric DEFAULT 0 CHECK (pct_anterior >= 0 AND pct_anterior <= 100),
  valor_contratado numeric NOT NULL DEFAULT 0,
  dias_marcados jsonb DEFAULT '[]'::jsonb,
  data_inicio date,
  data_fim date,
  status text DEFAULT 'A EXECUTAR' CHECK (status IN ('A EXECUTAR','EM ANDAMENTO','CONCLUÍDO','PAUSADO','AGUARDANDO')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_obra_servicos_obra_id ON obra_servicos(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_servicos_codigo ON obra_servicos(codigo);

ALTER TABLE obra_servicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de obra_servicos"
  ON obra_servicos FOR SELECT USING (true);
CREATE POLICY "Insert obra_servicos via anon"
  ON obra_servicos FOR INSERT WITH CHECK (true);
CREATE POLICY "Update obra_servicos via anon"
  ON obra_servicos FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 3. obra_pendencias — fila de prioridades técnicas por obra
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

CREATE INDEX IF NOT EXISTS idx_obra_pendencias_obra_id ON obra_pendencias(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_pendencias_status ON obra_pendencias(status);
CREATE INDEX IF NOT EXISTS idx_obra_pendencias_prioridade ON obra_pendencias(prioridade);

ALTER TABLE obra_pendencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de obra_pendencias"
  ON obra_pendencias FOR SELECT USING (true);
CREATE POLICY "Insert obra_pendencias via anon"
  ON obra_pendencias FOR INSERT WITH CHECK (true);
CREATE POLICY "Update obra_pendencias via anon"
  ON obra_pendencias FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 4. obra_visitas — registros de visitas do Cockpit
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

CREATE INDEX IF NOT EXISTS idx_obra_visitas_obra_id ON obra_visitas(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_visitas_data_visita ON obra_visitas(data_visita);
CREATE INDEX IF NOT EXISTS idx_obra_visitas_status_sync ON obra_visitas(status_sync);

ALTER TABLE obra_visitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir leitura pública de obra_visitas"
  ON obra_visitas FOR SELECT USING (true);
CREATE POLICY "Insert obra_visitas via anon"
  ON obra_visitas FOR INSERT WITH CHECK (true);
CREATE POLICY "Update obra_visitas via anon"
  ON obra_visitas FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 5. obra_fotos — registro fotográfico via ImgBB
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS obra_fotos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id       uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  url           text NOT NULL,
  url_thumb     text,
  descricao     text,
  etapa         text,
  origem        text DEFAULT 'cockpit' CHECK (origem IN ('cockpit','telegram','manual')),
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
-- 6. obra_compras — compras de material por obra
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS obra_compras (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id       uuid NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data          date NOT NULL DEFAULT CURRENT_DATE,
  descricao     text NOT NULL,
  quantidade    numeric,
  unidade       text,
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
  origem        text DEFAULT 'cockpit' CHECK (origem IN ('cockpit','telegram','manual')),
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
-- 7. financeiro — lançamentos vinculados à obra
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
  categoria       text NOT NULL,
  conta_bancaria  text,
  fornecedor      text,
  cliente         text,
  origem          text DEFAULT 'manual' CHECK (origem IN ('manual','agente','telegram','extrato')),
  confianca       numeric DEFAULT 1.0,
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
-- 8. financeiro_empresa — despesas fixas da Berti (sem obra_id)
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
-- 9. clientes — CRM
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
  origem          text,
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
-- 10. oportunidades — funil comercial
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oportunidades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid REFERENCES clientes(id) ON DELETE SET NULL,
  nome_lead       text,
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
  origem          text,
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
-- 11. orcamentos — orçamentos por obra
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
-- 12. contratos — gerados ao fechamento
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
  html_conteudo   text,
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

-- ----------------------------------------------------------------------------
-- 13. brain_data — tarefas, briefings, alertas, lembretes, agenda
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brain_data (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo            text NOT NULL CHECK (tipo IN ('tarefa','briefing','alerta','lembrete','agenda')),
  titulo          text NOT NULL,
  conteudo        text,
  prioridade      text DEFAULT 'normal' CHECK (prioridade IN ('urgente','alta','normal')),
  status          text DEFAULT 'pendente' CHECK (status IN ('pendente','em_andamento','concluido')),
  data_execucao   date,
  origem_agente   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_data_tipo            ON brain_data(tipo);
CREATE INDEX IF NOT EXISTS idx_brain_data_status          ON brain_data(status);
CREATE INDEX IF NOT EXISTS idx_brain_data_data_execucao   ON brain_data(data_execucao);

ALTER TABLE brain_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública brain_data"
  ON brain_data FOR SELECT USING (true);
CREATE POLICY "Insert brain_data via anon"
  ON brain_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Update brain_data via anon"
  ON brain_data FOR UPDATE USING (true);

-- ----------------------------------------------------------------------------
-- 14. brain_comercial — leads WhatsApp
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS brain_comercial (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contato_nome      text NOT NULL,
  contato_numero    text NOT NULL,
  mensagem_original text,
  resposta_ia       text,
  estagio           text DEFAULT 'lead_frio' CHECK (estagio IN ('lead_frio','lead_quente','orcamento','cliente')),
  proxima_acao      text,
  aprovado_gestor   boolean DEFAULT false,
  enviado_em        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_comercial_contato_numero  ON brain_comercial(contato_numero);
CREATE INDEX IF NOT EXISTS idx_brain_comercial_estagio         ON brain_comercial(estagio);
CREATE INDEX IF NOT EXISTS idx_brain_comercial_aprovado_gestor ON brain_comercial(aprovado_gestor);

ALTER TABLE brain_comercial ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura pública brain_comercial"
  ON brain_comercial FOR SELECT USING (true);
CREATE POLICY "Insert brain_comercial via anon"
  ON brain_comercial FOR INSERT WITH CHECK (true);
CREATE POLICY "Update brain_comercial via anon"
  ON brain_comercial FOR UPDATE USING (true);

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- Execute após o script para confirmar:
-- ============================================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'obras','obra_servicos','obra_pendencias','obra_visitas',
    'obra_fotos','obra_compras','financeiro','financeiro_empresa',
    'clientes','oportunidades','orcamentos','contratos',
    'brain_data','brain_comercial'
  )
ORDER BY table_name;
-- Resultado esperado: 14 tabelas listadas
