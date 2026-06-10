// ============================================================
// TYPES & INTERFACES - HFC Consultoria Credit Risk Analysis
// ============================================================

export type QualityRating = 'muito_bom' | 'bom' | 'moderado' | 'ruim';

export type IndicatorKey = string;

export interface IndicatorConfig {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  unit: string;
  source: string;
  sourceField: string;
  criteria?: Partial<Record<QualityRating, string>>;
}

export interface ParametroIndicador {
  key: string;
  label: string;
  direction: 'higher_is_better' | 'lower_is_better';
  limite_muito_bom: number;
  limite_bom: number;
  limite_moderado: number;
  description?: string;
  source?: string;
  col_planilha?: string;
  formula_score?: string | null;
}


export type DimensionKey = 'capital' | 'liquidez' | 'qualidade_carteira' | 'resultado' | 'porte' | 'tendencia' | 'outros';

export interface DimensionConfig {
  key: DimensionKey;
  label: string;
  indicators: string[];
}

export interface BankData {
  id: string;
  name: string;
  cnpj: string;
  ib: number | null;
  cet1: number | null;
  ii: number | null;
  icp: number | null;
  roe: number | null;
  roa: number | null;
  rating: string;
  fgc: 'coberto_250k' | 'coberto_1m' | 'nao_coberto';
  ativo_total?: number | null;
  patrimonio_liquido?: number | null;
  lucro_liquido?: number | null;
  carteira_credito?: number | null;
  segmento?: string;
  razao_alavancagem?: number | null;
  deposito_vista_funding?: number | null;
  pcld?: number | null;
  total_depositos?: number | null;
  captacoes_totais?: number | null;
  atraso_total?: number | null;
  ldr?: number | null;
  ie?: number | null;
  proxy_liquidez_ial?: number | null;
  tendencia_crescimento_carteira?: number | null;
  tendencia_cet1?: number | null;
  tendencia_roa?: number | null;
  tendencia_ldr?: number | null;
  tendencia_proxy_liquidez?: number | null;
}

export interface WeightConfig {
  [key: string]: number;
}

export type KnockoutLevel = 'none' | 'ruim' | 'moderado';

export interface KnockoutConfig {
  [key: string]: KnockoutLevel;
}

export interface IndicatorResult {
  value: number | string;
  rating: QualityRating;
  score: number;
  displayValue: string;
}

export interface BankAnalysis {
  bank: BankData;
  indicators: Record<IndicatorKey, IndicatorResult>;
  weightedScore: number;
  isKnockedOut: boolean;
  knockoutReasons: string[];
  status: 'elegivel' | 'nao_viavel';
  dimensionScores?: Record<string, number>;
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

export type MainTab = 'emissor' | 'indexador' | 'titulos' | 'carteiras' | 'mercado';
export type SubTab = 'analise' | 'metodologia' | 'extracao' | 'score';

export interface FormulaDimensao {
  dimension_key: string;
  formula: string;
  updated_at?: string;
}

export interface MacroScenario {
  key: string;
  label: string;
  juros_atuais: number;
  expectativa_juros_bacen_2029: number;
  juros_futuros_d1f29: number;
  valor_taxa_prefixada_2029: number;
  taxa_media_historica: number;
  is_custom?: boolean;
}

export interface OptimizerConfig {
  profile: 'conservador' | 'moderado' | 'arrojado';
  horizon: 'curto' | 'medio' | 'longo';
  mult_ipca: number;
  mult_pre: number;
  threshold_pre: number;
  cds_threshold: number;
  inversao_threshold: number;
}
