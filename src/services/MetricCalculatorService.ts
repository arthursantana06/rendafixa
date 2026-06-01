/**
 * MetricCalculatorService.ts
 * 
 * Serviço matemático de alta performance para conversão de valores financeiros brutos
 * em notas padronizadas contínuas (de 0 a 100), eliminando o "cliff effect" (efeito degrau).
 * 
 * HFC Consultoria - Metodologia de Nota Contínua
 */

export type CurveType = 'linear_direta' | 'linear_inversa' | 'logaritmica';

export interface IndicatorMetricConfig {
  label: string;
  tipoCurva: CurveType;
  piso: number;
  teto: number;
}

// Configuração padrão das 13 variáveis financeiras extraídas, mapeadas
// tanto pelos nomes oficiais quanto pelas chaves internas do banco de dados (lowercase).
export const indicatorsConfig: Record<string, IndicatorMetricConfig> = {
  // --- Mapeamentos Oficiais do Prompt ---
  'Indice_Basileia': { label: 'Índice de Basileia', tipoCurva: 'linear_direta', piso: 8.0, teto: 15.0 },
  'Capital_Principal_CET1': { label: 'Capital Principal CET1', tipoCurva: 'linear_direta', piso: 4.5, teto: 11.0 },
  'Razao_Alavancagem': { label: 'Razão de Alavancagem', tipoCurva: 'linear_direta', piso: 3.0, teto: 8.0 },
  'ICP_Cobertura': { label: 'Cobertura de Provisões (ICP)', tipoCurva: 'linear_direta', piso: 100.0, teto: 300.0 },
  'ROE_Calculado': { label: 'ROE Calculado', tipoCurva: 'linear_direta', piso: 5.0, teto: 20.0 },
  'ROA_Calculado': { label: 'ROA Calculado', tipoCurva: 'linear_direta', piso: 0.5, teto: 2.0 },
  'LCR': { label: 'Liquidez Curto Prazo (LCR)', tipoCurva: 'linear_direta', piso: 100.0, teto: 200.0 },
  'Deposito_Vista_vs_Funding': { label: 'Depósito à Vista / Funding', tipoCurva: 'linear_direta', piso: 3.0, teto: 15.0 },
  'Indice_Inadimplencia_II': { label: 'Índice de Inadimplência II', tipoCurva: 'linear_inversa', piso: 1.0, teto: 8.0 },
  'LDR': { label: 'LDR', tipoCurva: 'linear_inversa', piso: 70.0, teto: 110.0 },
  'Indice_Eficiencia_IE': { label: 'Índice de Eficiência IE', tipoCurva: 'linear_inversa', piso: 40.0, teto: 70.0 },
  'Ativo Total': { label: 'Ativo Total', tipoCurva: 'logaritmica', piso: 1000000000, teto: 100000000000 },
  'Carteira de Crédito Total': { label: 'Carteira de Crédito Total', tipoCurva: 'logaritmica', piso: 500000000, teto: 50000000000 },

  // --- Mapeamentos de Chaves de Banco de Dados para Facilidade de Integração ---
  'ib': { label: 'Índice de Basileia', tipoCurva: 'linear_direta', piso: 8.0, teto: 15.0 },
  'cet1': { label: 'Capital Principal CET1', tipoCurva: 'linear_direta', piso: 4.5, teto: 11.0 },
  'razao_alavancagem': { label: 'Razão de Alavancagem', tipoCurva: 'linear_direta', piso: 3.0, teto: 8.0 },
  'icp': { label: 'Cobertura de Provisões (ICP)', tipoCurva: 'linear_direta', piso: 100.0, teto: 300.0 },
  'roe': { label: 'ROE Calculado', tipoCurva: 'linear_direta', piso: 5.0, teto: 20.0 },
  'roa': { label: 'ROA Calculado', tipoCurva: 'linear_direta', piso: 0.5, teto: 2.0 },
  'lcr': { label: 'Liquidez Curto Prazo (LCR)', tipoCurva: 'linear_direta', piso: 100.0, teto: 200.0 },
  'proxy_liquidez_ial': { label: 'Proxy Liquidez IAL', tipoCurva: 'linear_direta', piso: 10.0, teto: 30.0 }, // IAL padrão de 10% a 30%
  'deposito_vista_funding': { label: 'Depósito à Vista / Funding', tipoCurva: 'linear_direta', piso: 3.0, teto: 15.0 },
  'ii': { label: 'Índice de Inadimplência II', tipoCurva: 'linear_inversa', piso: 1.0, teto: 8.0 },
  'ldr': { label: 'LDR', tipoCurva: 'linear_inversa', piso: 70.0, teto: 110.0 },
  'ie': { label: 'Índice de Eficiência IE', tipoCurva: 'linear_inversa', piso: 40.0, teto: 70.0 },
  'ativo_total': { label: 'Ativo Total', tipoCurva: 'logaritmica', piso: 1.0, teto: 100.0 }, // Em Bilhões
  'carteira_credito': { label: 'Carteira de Crédito Total', tipoCurva: 'logaritmica', piso: 0.5, teto: 50.0 } // Em Bilhões
};

/**
 * Converte um valor bruto de indicador em uma nota de 0 a 100 com base em piso, teto e tipo de curva.
 * Trata de forma segura valores nulos, indefinições, zeros e negativos.
 */
export function calculateScore(
  valorBruto: number | null | undefined,
  tipoCurva: CurveType,
  piso: number,
  teto: number
): number {
  // Tratamento de valores inválidos (null, undefined, NaN)
  if (valorBruto === null || valorBruto === undefined || isNaN(valorBruto)) {
    return 0;
  }

  // Prevenção de divisão por zero caso piso e teto sejam iguais
  if (piso === teto) {
    return 0;
  }

  let score = 0;

  switch (tipoCurva) {
    case 'linear_direta': {
      // Quanto maior o valor, melhor a nota
      score = ((valorBruto - piso) / (teto - piso)) * 100;
      break;
    }
    
    case 'linear_inversa': {
      // Quanto menor o valor, melhor a nota
      score = ((teto - valorBruto) / (teto - piso)) * 100;
      break;
    }
    
    case 'logaritmica': {
      // Regra de segurança: Se valorBruto ou piso forem <= 0, retorna 0 para evitar Math.log10 <= 0
      if (valorBruto <= 0 || piso <= 0 || teto <= 0) {
        return 0;
      }
      
      const logVal = Math.log10(valorBruto);
      const logPiso = Math.log10(piso);
      const logTeto = Math.log10(teto);
      
      if (logTeto === logPiso) {
        return 0;
      }

      score = ((logVal - logPiso) / (logTeto - logPiso)) * 100;
      break;
    }

    default:
      return 0;
  }

  // Clampar o resultado final estritamente entre 0 e 100
  return Math.max(0, Math.min(100, score));
}

/**
 * Calcula a nota final do banco agregando os scores individuais de cada métrica.
 * Suporta média aritmética simples e média geométrica ponderada (para penalizar notas zeradas).
 * 
 * @param bankMetrics Objeto contendo os valores brutos das métricas do banco (ex: { ib: 15.5, roe: 12 })
 * @param weights Pesos aplicados a cada métrica (ex: { ib: 0.3, roe: 0.2 })
 * @param method Método de cálculo: 'geometric' (Média Geométrica Ponderada) ou 'arithmetic' (Média Aritmética)
 */
export function calculateFinalScore(
  bankMetrics: Record<string, number | null | undefined>,
  weights: Record<string, number>,
  method: 'geometric' | 'arithmetic' = 'geometric'
): number {
  const activeKeys = Object.keys(bankMetrics).filter(key => {
    const val = bankMetrics[key];
    const weight = weights[key] || 0;
    return val !== undefined && val !== null && !isNaN(val) && weight > 0;
  });

  if (activeKeys.length === 0) {
    return 0;
  }

  // 1. Calcula o score individual (0 a 100) para cada indicador ativo
  const scores: Record<string, number> = {};
  activeKeys.forEach(key => {
    const config = indicatorsConfig[key];
    const rawVal = bankMetrics[key];
    
    if (config) {
      scores[key] = calculateScore(rawVal, config.tipoCurva, config.piso, config.teto);
    } else {
      // Fallback genérico caso não tenha mapeamento: linear direta de 0 a 10
      scores[key] = calculateScore(rawVal, 'linear_direta', 0, 10);
    }
  });

  // 2. Agregação ponderada com base no método selecionado
  if (method === 'geometric') {
    let sumWeights = 0;
    let sumWeightedLog = 0;
    let hasZeroScore = false;

    for (const key of activeKeys) {
      const score = scores[key];
      const weight = weights[key] || 0;
      
      if (score <= 0) {
        // Se houver qualquer nota zero, a média geométrica ponderada é forçada a zero
        hasZeroScore = true;
        break;
      }

      sumWeights += weight;
      sumWeightedLog += weight * Math.log(score);
    }

    if (hasZeroScore || sumWeights === 0) {
      return 0;
    }

    return Math.exp(sumWeightedLog / sumWeights);
  } else {
    // Média Aritmética Ponderada
    let sumWeights = 0;
    let sumWeightedScore = 0;

    for (const key of activeKeys) {
      const score = scores[key];
      const weight = weights[key] || 0;

      sumWeights += weight;
      sumWeightedScore += score * weight;
    }

    if (sumWeights === 0) return 0;
    return sumWeightedScore / sumWeights;
  }
}
