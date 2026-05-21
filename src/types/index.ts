// ============================================================
// TYPES & INTERFACES - HFC Consultoria Credit Risk Analysis
// ============================================================

export type QualityRating = 'muito_bom' | 'bom' | 'moderado' | 'ruim';

export type IndicatorKey = 'ib' | 'cet1' | 'ii' | 'icp' | 'roe' | 'roa';

export interface IndicatorConfig {
  key: IndicatorKey;
  label: string;
  shortLabel: string;
  description: string;
  unit: string;
  source: string;
  sourceField: string;
  criteria: Partial<Record<QualityRating, string>>;
}

export interface ParametroIndicador {
  key: IndicatorKey;
  label: string;
  direction: 'higher_is_better' | 'lower_is_better';
  limite_muito_bom: number;
  limite_bom: number;
  limite_moderado: number;
}


export interface BankData {
  id: string;
  name: string;
  cnpj: string;
  ib: number;
  cet1: number;
  ii: number;
  icp: number;
  roe: number;
  roa: number;
  rating: string;
  fgc: 'coberto_250k' | 'coberto_1m' | 'nao_coberto';
  ativo_total?: number;
  patrimonio_liquido?: number;
  lucro_liquido?: number;
  carteira_credito?: number;
  segmento?: string;
  razao_alavancagem?: number;
  pcld?: number;
  total_depositos?: number;
  captacoes_totais?: number;
  atraso_total?: number;
  ldr?: number;
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
}

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

export type MainTab = 'emissor' | 'titulos' | 'carteiras' | 'mercado';
export type SubTab = 'analise' | 'metodologia' | 'extracao';
