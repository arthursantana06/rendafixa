// ============================================================
// INDICATOR CONFIGURATION & CLASSIFICATION RULES
// Baseado no documento: Critérios de Análise de Emissor
// Fonte: HFC Consultoria - Metodologia Proprietária
// ============================================================
import type { IndicatorKey, IndicatorConfig, QualityRating, BankData, DimensionKey, DimensionConfig } from '@/types';


// ============================================================
// DIMENSION / GROUP DEFINITIONS
// ============================================================
export const DIMENSIONS: DimensionConfig[] = [
  {
    key: 'capital',
    label: 'Indicadores de Capital',
    indicators: ['ib', 'cet1', 'razao_alavancagem']
  },
  {
    key: 'liquidez',
    label: 'Indicadores de Liquidez',
    indicators: ['lcr']
  },
  {
    key: 'qualidade_carteira',
    label: 'Qualidade da Carteira',
    indicators: ['ii', 'icp', 'deposito_vista_funding']
  },
  {
    key: 'resultado',
    label: 'Indicadores de Resultado',
    indicators: ['roe', 'roa', 'ie']
  },
  {
    key: 'porte',
    label: 'Indicadores de Porte',
    indicators: ['ativo_total', 'carteira_credito']
  }
];

export function getDimensions(indicatorsList: IndicatorConfig[]): DimensionConfig[] {
  const standardKeys = new Set(DIMENSIONS.flatMap(d => d.indicators));
  const customKeys = indicatorsList.map(i => i.key).filter(k => !standardKeys.has(k));
  
  if (customKeys.length === 0) {
    return DIMENSIONS;
  }
  
  return [
    ...DIMENSIONS,
    {
      key: 'outros',
      label: 'Outros Indicadores',
      indicators: customKeys
    }
  ];
}

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
    key: 'razao_alavancagem',
    label: 'Razão de Alavancagem (Bacen)',
    shortLabel: 'RA',
    description: 'Mede o grau de alavancagem sem ponderação pelo risco. Bancos com índices acima de 8% possuem uma folga de capital gigantesca frente às suas exposições. Abaixo de 4%, o banco está perigosamente perto do limite regulatório do Bacen (3%), indicando uma operation altamente esticada.',
    unit: '%',
    source: 'IF.data > Prudencial > Alavancagem',
    sourceField: 'Razão de Alavancagem (%)',
    criteria: {
      muito_bom: 'Acima de 8%: Excelente. Folga de capital robusta frente a exposições sem ponderação de risco.',
      bom: 'Entre 6% e 8%: Nível confortável, dentro do esperado para bancos saudáveis.',
      moderado: 'Entre 4% e 6%: Adequado, mas com buffer de capital reduzido.',
      ruim: 'Abaixo de 4%: Alavancado. Banco operando perigosamente próximo ao limite prudencial mínimo (3%).',
    },
  },
  {
    key: 'deposito_vista_funding',
    label: 'Depósito à vista / Funding',
    shortLabel: 'DV/F',
    description: 'Mede a proporção do funding total captada através de depósitos à vista. Representa capital com custo zero. Bancos com captação acima de 15% possuem vantagem competitiva brutal e margem líquida de juros (NIM) muito resiliente em cenários de juros altos.',
    unit: '%',
    source: 'IF.data > Dados Contábeis (Cosif) > Passivo',
    sourceField: 'Depósito à vista / Funding Total (%)',
    criteria: {
      muito_bom: 'Acima de 15%: Excelente. Alta captação com custo zero e margem financeira muito resiliente.',
      bom: 'Entre 8% e 15%: Saudável, conferindo boa rentabilidade operacional.',
      moderado: 'Entre 3% e 8%: Aceitável, mas com dependência moderada de funding pago.',
      ruim: 'Abaixo de 3%: Baixo. Operação depende quase integralmente de captações mais caras no mercado.',
    },
  },
  {
    key: 'ativo_total',
    label: 'Ativo Total (R$ Bilhões)',
    shortLabel: 'AT',
    description: 'Mede o porte global do banco. O mercado bancário opera sob a lógica do Too Big To Fail e ganhos de escala. Parâmetros maiores que R$ 200 Bilhões enquadram os grandes players de relevância sistêmica (Segmentos S1 e S2). Classificações menores refletem maior risco de porte.',
    unit: 'Bi',
    source: 'IF.data > Resumo',
    sourceField: 'Ativo Total',
    criteria: {
      muito_bom: 'Acima de R$ 200 Bilhões: Relevância sistêmica nacional elevada (S1 e S2).',
      bom: 'Entre R$ 30 e R$ 200 Bilhões: Porte robusto. Players consolidados de médio e grande porte.',
      moderado: 'Entre R$ 3 e R$ 30 Bilhões: Porte médio. Bancos de médio porte com atuação em nichos.',
      ruim: 'Abaixo de R$ 3 Bilhões: Porte pequeno. Menor resiliência a choques macroeconômicos severos.',
    },
  },
  {
    key: 'carteira_credito',
    label: 'Carteira de Crédito (R$ Bilhões)',
    shortLabel: 'CC',
    description: 'Mede o volume total da carteira de crédito ativa. O mercado bancário opera sob a lógica do Too Big To Fail e ganhos de escala. Parâmetros maiores que R$ 100 Bilhões enquadram os grandes players de relevância sistêmica.',
    unit: 'Bi',
    source: 'IF.data > Resumo',
    sourceField: 'Carteira de Crédito Total',
    criteria: {
      muito_bom: 'Acima de R$ 100 Bilhões: Grande player com alta relevância de crédito no mercado.',
      bom: 'Entre R$ 10 e R$ 100 Bilhões: Carteira robusta de médio e grande porte.',
      moderado: 'Entre R$ 1 e R$ 10 Bilhões: Operação de crédito focada em nichos de mercado.',
      ruim: 'Abaixo de R$ 1 Bilhão: Carteira de pequeno porte, menor penetração de mercado.',
    },
  },
  {
    key: 'ie',
    label: 'Índice de Eficiência Operacional',
    shortLabel: 'IE',
    description: 'Revela quanto o banco gasta operacionalmente para gerar cada real de receita. Um banco com alto índice de eficiência consome grande parte da receita em custos fixos, deixando menos margem para provisões, distribuição de lucros e capitalização - o que, em ambientes adversos, pode comprometer a solvência da instituição.',
    unit: '%',
    source: 'IF.data > Dados por Instituição > Rentabilidade',
    sourceField: 'Índice de Eficiência',
    criteria: {
      muito_bom: 'Abaixo de 45%: Banco muito eficiente. Estrutura enxuta com forte alavancagem operacional.',
      bom: 'Entre 45% e 55%: Eficiência adequada para o mercado bancário brasileiro.',
      moderado: 'Entre 55% e 70%: Custo elevado. Pressiona margens, especialmente em ciclos de queda de juros ou alta inadimplência.',
      ruim: 'Acima de 70%: Ineficiente. Estrutura de custos insustentável a longo prazo.',
    },
  },
  {
    key: 'lcr',
    label: 'Índice de Liquidez de Curto Prazo (LCR)',
    shortLabel: 'LCR',
    description: 'Mede a capacidade do banco de sobreviver a um estresse de liquidez por 30 dias sem recorrer ao mercado ou ao BACEN. É uma das métricas mais diretas de risco de liquidez - relevante para emissores de CDBs e outros papéis de curto e médio prazo, cujos pagamentos dependem da capacidade de caixa do banco.',
    unit: '%',
    source: 'IF.data > Dados por Instituição > Prudencial > Liquidez',
    sourceField: 'LCR - Índice de Liquidez de Curto Prazo',
    criteria: {
      muito_bom: 'Acima de 150%: Excelente posição de liquidez. Amortecedor robusto para cenários de estresse.',
      bom: 'Entre 120% e 150%: Posição confortável. Folga adequada acima do mínimo regulatório.',
      moderado: 'Entre 100% e 120%: No limite regulatório. Pouca margem para absorção de choques de liquidez.',
      ruim: 'Abaixo de 100%: Descumpre o mínimo regulatório. Risco elevado; instituição sob atenção do BACEN.',
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

export function classifyIndicator(key: string, bank: BankData): QualityRating {
  const value = (bank as any)[key];
  if (value === undefined || value === null) return 'moderado';
  switch (key) {
    case 'ib': return classifyIndicatorWithValue('higher_is_better', value, 15, 13, 11);
    case 'cet1': return classifyIndicatorWithValue('higher_is_better', value, 12, 10, 7);
    case 'ii': return classifyIndicatorWithValue('lower_is_better', value, 2.5, 4, 6);
    case 'icp': return classifyIndicatorWithValue('higher_is_better', value, 150, 100, 80);
    case 'roe': return classifyIndicatorWithValue('higher_is_better', value, 15, 10, 5);
    case 'roa': return classifyIndicatorWithValue('higher_is_better', value, 1.5, 0.8, 0.3);
    case 'razao_alavancagem': return classifyIndicatorWithValue('higher_is_better', value, 8, 6, 4);
    case 'deposito_vista_funding': return classifyIndicatorWithValue('higher_is_better', value, 15, 8, 3);
    case 'ativo_total': return classifyIndicatorWithValue('higher_is_better', value, 200, 30, 3);
    case 'carteira_credito': return classifyIndicatorWithValue('higher_is_better', value, 100, 10, 1);
    case 'ie': return classifyIndicatorWithValue('lower_is_better', value, 45, 55, 70);
    case 'lcr': return classifyIndicatorWithValue('higher_is_better', value, 150, 120, 100);
    default: return 'moderado';
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

export function formatIndicatorValue(key: string, bank: BankData): string {
  const value = (bank as any)[key];
  if (value === undefined || value === null || value === '') return '';
  switch (key) {
    case 'ib': return `${Number(value).toFixed(1)}%`;
    case 'cet1': return `${Number(value).toFixed(1)}%`;
    case 'ii': return `${Number(value).toFixed(1)}%`;
    case 'icp': return `${Number(value).toFixed(1)}%`;
    case 'roe': return `${Number(value).toFixed(1)}%`;
    case 'roa': return `${Number(value).toFixed(2)}%`;
    case 'razao_alavancagem': return `${Number(value).toFixed(2)}%`;
    case 'deposito_vista_funding': return `${Number(value).toFixed(2)}%`;
    case 'ativo_total': return `R$ ${Number(value).toFixed(1)} Bi`;
    case 'carteira_credito': return `R$ ${Number(value).toFixed(1)} Bi`;
    case 'ie': return `${Number(value).toFixed(1)}%`;
    case 'lcr': return `${Number(value).toFixed(1)}%`;
    default: return `${Number(value).toFixed(1)}%`;
  }
}

export function getDefaultWeights(): Record<string, number> {
  return {
    capital: 20.0,
    liquidez: 20.0,
    qualidade_carteira: 20.0,
    resultado: 20.0,
    porte: 20.0,
    outros: 0.0
  };
}

export function getDefaultKnockouts(): Record<string, 'none' | 'ruim' | 'moderado'> {
  return {
    ib: 'none',
    cet1: 'none',
    ii: 'none',
    icp: 'none',
    roe: 'none',
    roa: 'none',
    razao_alavancagem: 'none',
    deposito_vista_funding: 'none',
    ativo_total: 'none',
    carteira_credito: 'none',
    ie: 'none',
    lcr: 'none'
  };
}
