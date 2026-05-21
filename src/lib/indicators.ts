// ============================================================
// INDICATOR CONFIGURATION & CLASSIFICATION RULES
// Baseado no documento: Critérios de Análise de Emissor
// Fonte: HFC Consultoria - Metodologia Proprietária
// ============================================================

import type { IndicatorKey, IndicatorConfig, QualityRating, BankData } from '@/types';

// ============================================================
// Indicator metadata - com descrições detalhadas do PDF
// ============================================================
export const INDICATORS: IndicatorConfig[] = [
  {
    key: 'ib',
    label: 'Índice de Basileia',
    shortLabel: 'IB',
    description: 'Mede a capacidade de solvência da instituição: quanto capital próprio o banco mantém em relação aos seus ativos ajustados pelo risco. Quanto maior o índice, maior a capacidade de absorver perdas inesperadas sem comprometer depósitos ou obrigações com credores.',
    unit: '%',
    source: 'IF.data > Dados por Instituição > Prudencial > Capital',
    sourceField: 'Índice de Basileia (%)',
    criteria: {
      muito_bom: 'Acima de 15%: Capitalização sólida, ampla folga regulatória, sinal de gestão conservadora de risco.',
      bom: 'Entre 13% e 15%: Nível confortável, dentro do esperado para bancos de médio e grande porte.',
      moderado: 'Entre 11% e 13%: Adequado ao mínimo regulatório, mas com margem reduzida.',
      ruim: 'Abaixo de 11%: Próximo ao limite regulatório. Risco elevado de restrições operacionais ou necessidade de capitalização.',
    },
  },
  {
    key: 'cet1',
    label: 'Capital Principal (CET1)',
    shortLabel: 'CET1',
    description: 'Núcleo mais sólido do capital bancário — composto exclusivamente por capital próprio de alta qualidade. Enquanto o Índice de Basileia inclui instrumentos híbridos e dívidas subordinadas, o CET1 mede a proteção pura dos depositantes.',
    unit: '%',
    source: 'IF.data > Dados por Instituição > Prudencial > Capital',
    sourceField: 'Capital Principal / RWA (%)',
    criteria: {
      muito_bom: 'Acima de 12%: Estrutura de capital muito sólida. Banco capitalizado principalmente com recursos próprios.',
      bom: 'Entre 10% e 12%: Bom nível de capitalização primária.',
      moderado: 'Entre 7% e 10%: Adequado mas próximo ao piso regulatório com adicional. Atenção ao buffer disponível.',
      ruim: 'Abaixo de 7%: Inadequado. Banco sujeito a restrições de distribuição de dividendos e de crescimento de carteira.',
    },
  },
  {
    key: 'ii',
    label: 'Índice de Inadimplência',
    shortLabel: 'II',
    description: 'Indica a qualidade da carteira de crédito: qual proporção dos empréstimos concedidos não está sendo honrada em dia. Alta inadimplência pressiona provisões, comprime resultado e pode sinalizar deterioração do portfólio.',
    unit: '%',
    source: 'IF.data > Dados por Instituição > Crédito > Inadimplência',
    sourceField: 'Taxa de Inadimplência > 90 dias (%)',
    criteria: {
      muito_bom: 'Abaixo de 2,5%: Carteira de crédito de alta qualidade, gestão conservadora de risco.',
      bom: 'Entre 2,5% e 4%: Nível confortável, dentro do esperado para bancos de médio e grande porte.',
      moderado: 'Entre 4% e 6%: Inadimplência acima da média, mas com margem para gestão.',
      ruim: 'Acima de 6%: Inadimplência elevada. Risco de impacto relevante no resultado e no capital.',
    },
  },
  {
    key: 'icp',
    label: 'Cobertura de Provisões',
    shortLabel: 'ICP',
    description: 'Complementa o índice de inadimplência ao medir se o banco constituiu reservas suficientes para cobrir suas perdas esperadas. Um banco com inadimplência elevada mas cobertura superior a 100% demonstra que o impacto já foi reconhecido contabilmente.',
    unit: '%',
    source: 'IF.data > Dados Contábeis (Cosif) > Ativo',
    sourceField: 'PCLD / Operações em Atraso > 90 dias (cálculo cruzado)',
    criteria: {
      muito_bom: 'Acima de 150%: Excelente. Provisões superam em larga margem a carteira problemática.',
      bom: 'Entre 100% e 150%: Boa cobertura. Perdas esperadas reconhecidas contabilmente.',
      moderado: 'Entre 80% e 100%: Cobertura incompleta. Avaliar em conjunto com inadimplência e tendência histórica.',
      ruim: 'Abaixo de 80%: Banco sub-provisionado. Risco de impacto relevante no resultado e no capital.',
    },
  },
  {
    key: 'roe',
    label: 'Retorno sobre Patrimônio Líquido',
    shortLabel: 'ROE',
    description: 'Mede a rentabilidade do banco em relação ao capital investido pelos acionistas. Um ROE consistentemente elevado indica que o banco gera lucro de forma eficiente, fortalece sua base de capital organicamente e demonstra resiliência do modelo de negócios.',
    unit: '%',
    source: 'IF.data > Dados por Instituição > Rentabilidade',
    sourceField: 'Retorno sobre Patrimônio Líquido (%)',
    criteria: {
      muito_bom: 'Acima de 15%: Banco rentável e eficiente. Capital se fortalece organicamente a taxas acima da inflação.',
      bom: 'Entre 10% e 15%: Rentabilidade adequada para bancos médios e grandes no contexto brasileiro.',
      moderado: 'Entre 5% e 10%: Rentabilidade baixa; pode indicar pressão competitiva, aumento de custos ou inadimplência crescente.',
      ruim: 'Abaixo de 5% ou negativo: Prejuízo ou resultado muito fraco. Risco de erosão de capital a médio prazo.',
    },
  },
  {
    key: 'roa',
    label: 'Retorno sobre Ativos',
    shortLabel: 'ROA',
    description: 'Mede a eficiência do banco em gerar lucro a partir do total de ativos que administra. Diferentemente do ROE, o ROA não é amplificado pela alavancagem — por isso é mais útil para comparar instituições com estruturas de capital distintas.',
    unit: '%',
    source: 'IF.data > Dados por Instituição > Rentabilidade',
    sourceField: 'Retorno sobre Ativo Total (%)',
    criteria: {
      muito_bom: 'Acima de 1,5%: Alta eficiência na geração de resultado sobre os ativos totais.',
      bom: 'Entre 0,8% e 1,5%: Nível saudável, adequado para bancos diversificados de médio e grande porte.',
      moderado: 'Entre 0,3% e 0,8%: Abaixo do ideal. Verificar se há compressão de margem ou aumento de provisões.',
      ruim: 'Abaixo de 0,3%: Comprometido. Banco com dificuldade de gerar resultado de forma consistente.',
    },
  },
];

// Rating quality score mapping
const QUALITY_SCORES: Record<QualityRating, number> = {
  muito_bom: 10,
  bom: 7,
  moderado: 4,
  ruim: 0,
};

// ============================================================
// Classification Functions - Dynamic & Static Fallback
// ============================================================

export function classifyIndicatorWithValue(
  direction: 'higher_is_better' | 'lower_is_better',
  value: number,
  limiteMuitoBom: number,
  limiteBom: number,
  limiteModerado: number
): QualityRating {
  if (direction === 'higher_is_better') {
    if (value > limiteMuitoBom) return 'muito_bom';
    if (value >= limiteBom && value <= limiteMuitoBom) return 'bom';
    if (value >= limiteModerado && value < limiteBom) return 'moderado';
    return 'ruim';
  } else {
    // lower_is_better
    if (value < limiteMuitoBom) return 'muito_bom';
    if (value >= limiteMuitoBom && value <= limiteBom) return 'bom';
    if (value > limiteBom && value <= limiteModerado) return 'moderado';
    return 'ruim';
  }
}

// ============================================================
// Main classification function
// ============================================================

export function classifyIndicator(key: IndicatorKey, bank: BankData): QualityRating {
  const value = bank[key];
  switch (key) {
    case 'ib': return classifyIndicatorWithValue('higher_is_better', value, 15, 13, 11);
    case 'cet1': return classifyIndicatorWithValue('higher_is_better', value, 12, 10, 7);
    case 'ii': return classifyIndicatorWithValue('lower_is_better', value, 2.5, 4, 6);
    case 'icp': return classifyIndicatorWithValue('higher_is_better', value, 150, 100, 80);
    case 'roe': return classifyIndicatorWithValue('higher_is_better', value, 15, 10, 5);
    case 'roa': return classifyIndicatorWithValue('higher_is_better', value, 1.5, 0.8, 0.3);
  }
}

export function getQualityScore(rating: QualityRating): number {
  return QUALITY_SCORES[rating];
}

export function getQualityLabel(rating: QualityRating): string {
  switch (rating) {
    case 'muito_bom': return 'Muito Bom';
    case 'bom': return 'Bom';
    case 'moderado': return 'Moderado';
    case 'ruim': return 'Ruim';
  }
}

export function getQualityColor(rating: QualityRating): string {
  switch (rating) {
    case 'muito_bom': return 'font-black text-foreground';
    case 'bom': return 'font-bold text-foreground/85';
    case 'moderado': return 'font-medium text-muted-foreground';
    case 'ruim': return 'font-normal text-muted-foreground line-through opacity-70';
  }
}

export function getQualityDotColor(rating: QualityRating): string {
  switch (rating) {
    case 'muito_bom': return 'bg-blue-500';
    case 'bom': return 'bg-emerald-500';
    case 'moderado': return 'bg-amber-500';
    case 'ruim': return 'bg-rose-500';
  }
}

export function formatIndicatorValue(key: IndicatorKey, bank: BankData): string {
  switch (key) {
    case 'ib': return `${bank.ib.toFixed(1)}%`;
    case 'cet1': return `${bank.cet1.toFixed(1)}%`;
    case 'ii': return `${bank.ii.toFixed(1)}%`;
    case 'icp': return `${bank.icp.toFixed(1)}%`;
    case 'roe': return `${bank.roe.toFixed(1)}%`;
    case 'roa': return `${bank.roa.toFixed(2)}%`;
  }
}

export function getDefaultWeights(): Record<IndicatorKey, number> {
  return {
    ib: 16.5, cet1: 16.5, ii: 17.0, icp: 16.5, roe: 16.5, roa: 17.0
  };
}

export function getDefaultKnockouts(): Record<IndicatorKey, 'none' | 'ruim' | 'moderado'> {
  return {
    ib: 'none', cet1: 'none', ii: 'none', icp: 'none', roe: 'none', roa: 'none'
  };
}
