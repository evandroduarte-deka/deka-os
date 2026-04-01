/**
 * DEKA OS v2.0 — relatorio-semanal-automatico.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo: Geração e Aprovação de Relatórios Semanais Automáticos
 *
 * RESPONSABILIDADES:
 *   - Gera relatórios semanais para todas as obras ativas
 *   - Salva rascunhos em brain_data (tipo: 'relatorio_rascunho')
 *   - Permite aprovação pelo gestor
 *   - Marca como 'relatorio_aprovado' após aprovação
 *
 * TRIGGER:
 *   - N8N toda sexta às 17h
 *   - Manualmente pelo gestor no cockpit
 *
 * REGRAS DEKA OS:
 *   - Zero try/catch silenciosos
 *   - fetchComTimeout obrigatório
 *   - Fallback gracioso para tabelas novas
 *   - Nunca expor códigos internos (SRV-*, EQ-*) ao cliente
 */

// =============================================================================
// IMPORTS
// =============================================================================

import {
  supabase,
  showToast,
  fetchComTimeout,
  chamarClaude,
} from '../../deka.js';

// =============================================================================
// CONSTANTES
// =============================================================================

const SYSTEM_PROMPT_AGT_RELATORIO_AUTOMATICO = `
Você é o AGT_RELATORIO da Berti Construtora.

Tom: consultoria técnica de médio-alto padrão.

REGRAS ABSOLUTAS:
1. NUNCA use códigos internos (SRV-*, EQ-*, FOR-*)
2. NUNCA mencione percentuais internos de custo
3. SEMPRE use terceira pessoa ("a equipe realizou", "foram executados")
4. NUNCA invente informações não presentes nos dados
5. Máximo 400 palavras no corpo do relatório
6. Termine com uma frase positiva sobre o andamento da obra
7. PROIBIDO usar markdown (**, *, ##, ---, _)
8. Retorne texto puro limpo

FORMATO OBRIGATÓRIO:

Atualização Semanal — [Nome da Obra]
Semana de [data início] a [data fim]

O que avançamos esta semana:
[2-4 bullets com progresso em linguagem simples]

O que estamos resolvendo:
[Máximo 2 itens — cada um com a solução em andamento]

O que esperar na próxima semana:
[2-3 bullets com previsão clara]

Avanço geral da obra: [X]%
Dúvidas? Estamos à disposição.

TRADUÇÕES OBRIGATÓRIAS (NUNCA EXIBA CÓDIGOS):
❌ "SRV-013 — 75% concluído"
✅ "O fechamento do forro da sala está 75% concluído"

❌ "Houve um atraso"
✅ "Tivemos um pequeno ajuste no cronograma, mas adiantamos outras frentes para compensar"
`.trim();

// =============================================================================
// FUNÇÃO PRINCIPAL: GERAÇÃO DE RELATÓRIOS SEMANAIS
// =============================================================================

/**
 * Gera relatórios semanais para todas as obras ativas.
 * Salva rascunhos em brain_data (tipo: 'relatorio_rascunho').
 * @returns {Promise<Object>} Resumo da geração
 */
export async function gerarRelatoriosSemanais() {
  console.log('[DEKA][RelatorioAuto] Iniciando geração de relatórios semanais...');

  try {
    // 1. Busca todas as obras ativas
    const { data: obras, error: erroObras } = await supabase
      .from('obras')
      .select('id, nome, cliente, percentual_global')
      .eq('status', 'ativa');

    if (erroObras) {
      console.error('[DEKA][RelatorioAuto] Erro ao buscar obras:', erroObras);
      throw new Error('Falha ao buscar obras ativas: ' + erroObras.message);
    }

    if (!obras || obras.length === 0) {
      console.log('[DEKA][RelatorioAuto] Nenhuma obra ativa encontrada.');
      return { total: 0, gerados: 0, erros: 0 };
    }

    console.log(`[DEKA][RelatorioAuto] ${obras.length} obras ativas encontradas.`);

    // 2. Define período da semana (últimos 7 dias)
    const hoje = new Date();
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const dataInicio = seteDiasAtras.toISOString().split('T')[0];
    const dataFim = hoje.toISOString().split('T')[0];

    // 3. Gera relatório para cada obra
    const resultados = await Promise.allSettled(
      obras.map((obra) => gerarRelatorioParaObra(obra, dataInicio, dataFim))
    );

    // 4. Contabiliza resultados
    const gerados = resultados.filter((r) => r.status === 'fulfilled').length;
    const erros = resultados.filter((r) => r.status === 'rejected').length;

    console.log(`[DEKA][RelatorioAuto] ✅ Geração concluída: ${gerados} sucesso, ${erros} erros.`);

    return {
      total: obras.length,
      gerados,
      erros,
      dataInicio,
      dataFim,
    };

  } catch (erro) {
    console.error('[DEKA][RelatorioAuto] Erro geral na geração:', erro);
    throw erro;
  }
}

/**
 * Gera relatório para uma obra específica e salva como rascunho.
 * @param {Object} obra - Dados da obra
 * @param {string} dataInicio - Data início YYYY-MM-DD
 * @param {string} dataFim - Data fim YYYY-MM-DD
 * @returns {Promise<Object>} Relatório gerado
 */
async function gerarRelatorioParaObra(obra, dataInicio, dataFim) {
  console.log(`[DEKA][RelatorioAuto] Gerando relatório para: ${obra.nome}`);

  try {
    // 1. Monta dados da semana
    const dados = await montarDadosSemana(obra.id, dataInicio, dataFim);

    // 2. Chama AGT_RELATORIO via Claude
    const contexto = montarContextoRelatorio(obra, dados, dataInicio, dataFim);

    const { texto: relatorioTexto } = await chamarClaude({
      mensagens: [{ role: 'user', content: contexto }],
      sistemaPrompt: SYSTEM_PROMPT_AGT_RELATORIO_AUTOMATICO,
      modelo: 'claude-haiku-4-5',
      maxTokens: 1500,
      temperature: 0.3,
      agente: 'AGT_RELATORIO_AUTO',
    });

    // 3. Salva rascunho em brain_data
    const { data: rascunho, error: erroInsert } = await supabase
      .from('brain_data')
      .insert({
        tipo: 'relatorio_rascunho',
        titulo: `Relatório Semanal — ${obra.nome} (${dataInicio} a ${dataFim})`,
        conteudo: relatorioTexto,
        prioridade: 'normal',
        status: 'pendente',
        data_execucao: new Date().toISOString().split('T')[0],
        origem_agente: 'AGT_RELATORIO_AUTO',
        metadata: JSON.stringify({
          obra_id: obra.id,
          obra_nome: obra.nome,
          periodo_inicio: dataInicio,
          periodo_fim: dataFim,
        }),
      })
      .select()
      .single();

    if (erroInsert) {
      console.error(`[DEKA][RelatorioAuto] Erro ao salvar rascunho (${obra.nome}):`, erroInsert);
      throw new Error('Falha ao salvar rascunho: ' + erroInsert.message);
    }

    console.log(`[DEKA][RelatorioAuto] ✅ Rascunho salvo para: ${obra.nome}`);

    return {
      obra_id: obra.id,
      obra_nome: obra.nome,
      rascunho_id: rascunho.id,
      status: 'sucesso',
    };

  } catch (erro) {
    console.error(`[DEKA][RelatorioAuto] Erro ao gerar relatório (${obra.nome}):`, erro);
    throw erro;
  }
}

/**
 * Monta dados consolidados da semana para uma obra.
 * @param {string} obraId - UUID da obra
 * @param {string} dataInicio - Data início YYYY-MM-DD
 * @param {string} dataFim - Data fim YYYY-MM-DD
 * @returns {Promise<Object>} Dados consolidados
 */
async function montarDadosSemana(obraId, dataInicio, dataFim) {
  try {
    // Busca paralela com fallback gracioso
    const [servicos, visitas, pendencias] = await Promise.all([
      buscarServicos(obraId),
      buscarVisitas(obraId, dataInicio, dataFim),
      buscarPendencias(obraId),
    ]);

    return {
      servicos: servicos || [],
      visitas: visitas || [],
      pendencias: pendencias || [],
    };

  } catch (erro) {
    console.error('[DEKA][RelatorioAuto] Erro ao montar dados da semana:', erro);
    throw erro;
  }
}

async function buscarServicos(obraId) {
  const { data, error } = await supabase
    .from('obra_servicos')
    .select('descricao_cliente, descricao_interna, percentual_concluido')
    .eq('obra_id', obraId);

  if (error) throw new Error('Erro ao buscar serviços: ' + error.message);
  return data || [];
}

async function buscarVisitas(obraId, dataInicio, dataFim) {
  const { data, error } = await supabase
    .from('obra_visitas')
    .select('data_visita, resumo_ia')
    .eq('obra_id', obraId)
    .gte('data_visita', dataInicio)
    .lte('data_visita', dataFim);

  if (error) throw new Error('Erro ao buscar visitas: ' + error.message);
  return data || [];
}

async function buscarPendencias(obraId) {
  const { data, error } = await supabase
    .from('obra_pendencias')
    .select('descricao, prioridade, status')
    .eq('obra_id', obraId)
    .in('status', ['aberta', 'em_andamento']);

  if (error) throw new Error('Erro ao buscar pendências: ' + error.message);
  return data || [];
}

/**
 * Monta contexto textual para enviar ao AGT_RELATORIO.
 */
function montarContextoRelatorio(obra, dados, dataInicio, dataFim) {
  return `
Gere um relatório semanal para o cliente sobre a obra:

DADOS DA OBRA:
- Nome: ${obra.nome}
- Cliente: ${obra.cliente}
- Avanço geral: ${obra.percentual_global || 0}%
- Período: ${dataInicio} a ${dataFim}

SERVIÇOS (progresso atual):
${dados.servicos.length > 0
  ? dados.servicos.map((s) => `- ${s.descricao_cliente}: ${s.percentual_concluido}%`).join('\n')
  : 'Nenhum serviço registrado.'
}

VISITAS NO PERÍODO (resumos):
${dados.visitas.length > 0
  ? dados.visitas.map((v) => `- ${v.data_visita}: ${v.resumo_ia || 'Sem resumo'}`).join('\n')
  : 'Nenhuma visita registrada no período.'
}

PENDÊNCIAS ABERTAS:
${dados.pendencias.length > 0
  ? dados.pendencias.map((p) => `- ${p.descricao} (${p.prioridade})`).join('\n')
  : 'Nenhuma pendência aberta.'
}

LEMBRE-SE:
- NUNCA exiba códigos internos (SRV-*, EQ-*)
- Use apenas a descrição traduzida para o cliente
- Sempre solução junto ao problema
- Siga o formato obrigatório do Padrão Berti
- Retorne texto puro (SEM markdown)
`.trim();
}

// =============================================================================
// APROVAÇÃO DE RELATÓRIOS
// =============================================================================

/**
 * Aprova um relatório rascunho e muda status para 'relatorio_aprovado'.
 * @param {string} relatorioId - UUID do relatório em brain_data
 * @returns {Promise<Object>} Relatório aprovado
 */
export async function aprovarRelatorio(relatorioId) {
  console.log(`[DEKA][RelatorioAuto] Aprovando relatório: ${relatorioId}`);

  try {
    // Atualiza status para concluído + tipo para relatorio_aprovado
    const { data, error } = await supabase
      .from('brain_data')
      .update({
        status: 'concluido',
        tipo: 'relatorio_aprovado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', relatorioId)
      .select()
      .single();

    if (error) {
      console.error('[DEKA][RelatorioAuto] Erro ao aprovar relatório:', error);
      throw new Error('Falha ao aprovar relatório: ' + error.message);
    }

    console.log('[DEKA][RelatorioAuto] ✅ Relatório aprovado.');
    showToast('Relatório aprovado com sucesso!', 'success');

    return data;

  } catch (erro) {
    console.error('[DEKA][RelatorioAuto] Erro ao aprovar relatório:', erro);
    showToast(erro.message || 'Erro ao aprovar relatório.', 'error');
    throw erro;
  }
}

/**
 * Lista todos os rascunhos pendentes de aprovação.
 * @returns {Promise<Array>} Lista de rascunhos
 */
export async function listarRascunhosPendentes() {
  console.log('[DEKA][RelatorioAuto] Listando rascunhos pendentes...');

  try {
    const { data, error } = await supabase
      .from('brain_data')
      .select('*')
      .eq('tipo', 'relatorio_rascunho')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[DEKA][RelatorioAuto] Erro ao listar rascunhos:', error);
      throw new Error('Falha ao listar rascunhos: ' + error.message);
    }

    console.log(`[DEKA][RelatorioAuto] ${data?.length || 0} rascunhos pendentes.`);

    return data || [];

  } catch (erro) {
    console.error('[DEKA][RelatorioAuto] Erro ao listar rascunhos:', erro);
    throw erro;
  }
}

// =============================================================================
// FIM DO ARQUIVO
// =============================================================================
