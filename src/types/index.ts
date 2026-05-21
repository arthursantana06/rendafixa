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
}


export type DimensionKey = 'capital' | 'liquidez' | 'qualidade_carteira' | 'resultado' | 'porte' | 'outros';

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
  lcr?: number | null;
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
