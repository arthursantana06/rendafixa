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
  {
    key: 'ie',
    label: 'Eficiência Operacional',
    shortLabel: 'IE',
    description: 'Revela quanto o banco gasta operacionalmente para gerar cada real de receita. Um banco com alto índice de eficiência consome grande parte da receita em custos fixos, deixando menos margem para provisões, distribuição de lucros e capitalização.',
    unit: '%',
    source: 'IF.data > Dados por Instituição > Rentabilidade',
    sourceField: 'Índice de Eficiência (%)',
    criteria: {
      muito_bom: 'Abaixo de 45%: Banco muito eficiente. Estrutura enxuta com forte alavancagem operacional.',
      bom: 'Entre 45% e 55%: Eficiência adequada para o mercado bancário brasileiro.',
      moderado: 'Entre 55% e 70%: Custo elevado. Pressiona margens em ciclos de queda de juros ou alta inadimplência.',
      ruim: 'Acima de 70%: Ineficiente. Estrutura de custos insustentável a longo prazo.',
    },
  },
  {
    key: 'lcr',
    label: 'Liquidez de Curto Prazo (LCR)',
    shortLabel: 'LCR',
    description: 'Mede a capacidade do banco de sobreviver a um estresse de liquidez por 30 dias sem recorrer ao mercado ou ao BACEN. É uma das métricas mais diretas de risco de liquidez — relevante para emissores de CDBs e outros papéis de curto e médio prazo.',
    unit: '%',
    source: 'IF.data > Dados por Instituição > Prudencial > Liquidez',
    sourceField: 'LCR - Índice de Liquidez de Curto Prazo (%)',
    criteria: {
      muito_bom: 'Acima de 150%: Excelente posição de liquidez. Amortecedor robusto para cenários de estresse.',
      bom: 'Entre 120% e 150%: Posição confortável. Folga adequada acima do mínimo regulatório.',
      moderado: 'Entre 100% e 120%: No limite regulatório. Pouca margem para absorção de choques de liquidez.',
      ruim: 'Abaixo de 100%: Descumpre o mínimo regulatório. Risco elevado; instituição sob atenção do BACEN.',
    },
  },
  {
    key: 'rating',
    label: 'Rating de Crédito',
    shortLabel: 'Rating',
    description: 'Consolida em uma nota a visão independente sobre a capacidade de pagamento do emissor. Embora não seja um dado público do BACEN, é complementar aos indicadores quantitativos e especialmente relevante para bancos médios e pequenos.',
    unit: '',
    source: 'Fitch Ratings, Moody\'s, S&P Global, Austin Rating',
    sourceField: 'Escala Nacional de Rating',
    criteria: {
      muito_bom: 'AAA a AA- (S&P/Fitch) ou Aaa a Aa3 (Moody\'s): Qualidade máxima. Risco de inadimplência mínimo.',
      bom: 'A+ a BBB-: Grau de investimento. Emissores sólidos com boa capacidade de pagamento.',
      moderado: 'BB+ a BB-: Grau especulativo leve. Risco aceitável com prêmio de rentabilidade adequado.',
      ruim: 'B+ ou inferior / sem rating: Risco elevado ou ausência de cobertura independente.',
    },
  },
  {
    key: 'fgc',
    label: 'Cobertura pelo FGC',
    shortLabel: 'FGC',
    description: 'Para o investidor pessoa física, a cobertura do FGC é o principal mitigador de risco de crédito em CDBs, LCIs e LCAs. A presença da garantia permite aceitar emissores com indicadores mais fracos — compensados por rentabilidade superior — desde que o valor esteja dentro do limite coberto.',
    unit: '',
    source: 'fgc.org.br',
    sourceField: 'Lista de instituições associadas',
    criteria: {
      bom: 'Ativo coberto pelo FGC e valor alocado ≤ R$ 250 mil.',
      moderado: 'Ativo coberto pelo FGC e valor entre R$ 250 mil e R$ 1 milhão.',
      ruim: 'Ativo não coberto pelo FGC ou valor acima dos limites.',
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
// Classification Functions - Strict business rules
// ============================================================

function classifyIB(value: number): QualityRating {
  if (value > 15) return 'muito_bom';
  if (value >= 13 && value <= 15) return 'bom';
  if (value >= 11 && value < 13) return 'moderado';
  return 'ruim';
}

function classifyCET1(value: number): QualityRating {
  if (value > 12) return 'muito_bom';
  if (value >= 10 && value <= 12) return 'bom';
  if (value >= 7 && value < 10) return 'moderado';
  return 'ruim';
}

function classifyII(value: number): QualityRating {
  if (value < 2.5) return 'muito_bom';
  if (value >= 2.5 && value <= 4) return 'bom';
  if (value > 4 && value <= 6) return 'moderado';
  return 'ruim';
}

function classifyICP(value: number): QualityRating {
  if (value > 150) return 'muito_bom';
  if (value >= 100 && value <= 150) return 'bom';
  if (value >= 80 && value < 100) return 'moderado';
  return 'ruim';
}

function classifyROE(value: number): QualityRating {
  if (value > 15) return 'muito_bom';
  if (value >= 10 && value <= 15) return 'bom';
  if (value >= 5 && value < 10) return 'moderado';
  return 'ruim';
}

function classifyROA(value: number): QualityRating {
  if (value > 1.5) return 'muito_bom';
  if (value >= 0.8 && value <= 1.5) return 'bom';
  if (value >= 0.3 && value < 0.8) return 'moderado';
  return 'ruim';
}

function classifyIE(value: number): QualityRating {
  if (value < 45) return 'muito_bom';
  if (value >= 45 && value <= 55) return 'bom';
  if (value > 55 && value <= 70) return 'moderado';
  return 'ruim';
}

function classifyLCR(value: number): QualityRating {
  if (value > 150) return 'muito_bom';
  if (value >= 120 && value <= 150) return 'bom';
  if (value >= 100 && value < 120) return 'moderado';
  return 'ruim';
}

const RATING_TIERS: Record<string, QualityRating> = {
  'AAA': 'muito_bom', 'AA+': 'muito_bom', 'AA': 'muito_bom', 'AA-': 'muito_bom',
  'Aaa': 'muito_bom', 'Aa1': 'muito_bom', 'Aa2': 'muito_bom', 'Aa3': 'muito_bom',
  'A+': 'bom', 'A': 'bom', 'A-': 'bom',
  'A1': 'bom', 'A2': 'bom', 'A3': 'bom',
  'BBB+': 'bom', 'BBB': 'bom', 'BBB-': 'bom',
  'Baa1': 'bom', 'Baa2': 'bom', 'Baa3': 'bom',
  'BB+': 'moderado', 'BB': 'moderado', 'BB-': 'moderado',
  'Ba1': 'moderado', 'Ba2': 'moderado', 'Ba3': 'moderado',
  'B+': 'ruim', 'B': 'ruim', 'B-': 'ruim',
  'B1': 'ruim', 'B2': 'ruim', 'B3': 'ruim',
  'CCC+': 'ruim', 'CCC': 'ruim', 'CCC-': 'ruim',
  'Caa1': 'ruim', 'Caa2': 'ruim', 'Caa3': 'ruim',
  'CC': 'ruim', 'C': 'ruim', 'D': 'ruim',
  'NR': 'ruim', 'SR': 'ruim', 'Sem Rating': 'ruim',
};

function classifyRating(value: string): QualityRating {
  return RATING_TIERS[value] || 'ruim';
}

function classifyFGC(value: string): QualityRating {
  switch (value) {
    case 'coberto_250k': return 'bom';
    case 'coberto_1m': return 'moderado';
    case 'nao_coberto': return 'ruim';
    default: return 'ruim';
  }
}

// ============================================================
// Main classification function
// ============================================================

export function classifyIndicator(key: IndicatorKey, bank: BankData): QualityRating {
  switch (key) {
    case 'ib': return classifyIB(bank.ib);
    case 'cet1': return classifyCET1(bank.cet1);
    case 'ii': return classifyII(bank.ii);
    case 'icp': return classifyICP(bank.icp);
    case 'roe': return classifyROE(bank.roe);
    case 'roa': return classifyROA(bank.roa);
    case 'ie': return classifyIE(bank.ie);
    case 'lcr': return classifyLCR(bank.lcr);
    case 'rating': return classifyRating(bank.rating);
    case 'fgc': return classifyFGC(bank.fgc);
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
    case 'muito_bom': return 'bg-foreground';
    case 'bom': return 'bg-foreground/60';
    case 'moderado': return 'bg-muted-foreground/40';
    case 'ruim': return 'bg-transparent border border-muted-foreground/40';
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
    case 'ie': return `${bank.ie.toFixed(1)}%`;
    case 'lcr': return `${bank.lcr.toFixed(1)}%`;
    case 'rating': return bank.rating;
    case 'fgc':
      switch (bank.fgc) {
        case 'coberto_250k': return '≤ R$ 250k';
        case 'coberto_1m': return 'R$ 250k–1M';
        case 'nao_coberto': return 'Não Coberto';
      }
  }
}

export function getDefaultWeights(): Record<IndicatorKey, number> {
  return {
    ib: 10, cet1: 10, ii: 10, icp: 10, roe: 10,
    roa: 10, ie: 10, lcr: 10, rating: 10, fgc: 10,
  };
}

export function getDefaultKnockouts(): Record<IndicatorKey, 'none' | 'ruim' | 'moderado'> {
  return {
    ib: 'none', cet1: 'none', ii: 'none', icp: 'none', roe: 'none',
    roa: 'none', ie: 'none', lcr: 'none', rating: 'none', fgc: 'none',
  };
}
