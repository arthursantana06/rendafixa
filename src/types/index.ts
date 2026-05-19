// ============================================================
// TYPES & INTERFACES - HFC Consultoria Credit Risk Analysis
// ============================================================

export type QualityRating = 'muito_bom' | 'bom' | 'moderado' | 'ruim';

export type IndicatorKey = 'ib' | 'cet1' | 'ii' | 'icp' | 'roe' | 'roa' | 'ie' | 'lcr' | 'rating' | 'fgc';

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
  ie: number;
  lcr: number;
  rating: string;
  fgc: 'coberto_250k' | 'coberto_1m' | 'nao_coberto';
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

/** Page-level tabs for the Renda Fixa platform */
export type MainTab = 'emissor'; // Future expansion: 'fundos', 'credito_privado', etc.
export type SubTab = 'analise' | 'metodologia' | 'extracao';
