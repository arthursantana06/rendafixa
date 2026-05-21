import type { BankData, BankAnalysis, IndicatorKey, IndicatorResult, KnockoutLevel, ParametroIndicador, IndicatorConfig } from '@/types';
import { INDICATORS, classifyIndicator, classifyIndicatorWithValue, getQualityScore, formatIndicatorValue } from './indicators';

/**
 * Computes the full analysis for a single bank.
 */
export function analyzeBank(
  bank: BankData,
  weights: Record<IndicatorKey, number>,
  knockouts: Record<IndicatorKey, KnockoutLevel>,
  parameters?: Record<IndicatorKey, ParametroIndicador>,
  indicatorsList: IndicatorConfig[] = INDICATORS,
): BankAnalysis {
  // 1. Classify each indicator
  const indicators: Record<string, IndicatorResult> = {};
  
  for (const ind of indicatorsList) {
    const rawVal = (bank as unknown as Record<string, unknown>)[ind.key];
    const value = rawVal !== undefined && rawVal !== null ? Number(rawVal) : 0;
    const param = parameters?.[ind.key];
    
    let rating;
    if (param) {
      rating = classifyIndicatorWithValue(
        param.direction,
        value,
        param.limite_muito_bom,
        param.limite_bom,
        param.limite_moderado
      );
    } else {
      rating = classifyIndicator(ind.key, bank);
    }

    const score = getQualityScore(rating);
    const displayValue = formatIndicatorValue(ind.key, bank);
    
    indicators[ind.key] = {
      value,
      rating,
      score,
      displayValue,
    };
  }

  // 2. Check knockout criteria
  const knockoutReasons: string[] = [];
  let isKnockedOut = false;

  for (const ind of indicatorsList) {
    const knockoutLevel = knockouts[ind.key];
    if (knockoutLevel === 'none' || !knockoutLevel) continue;

    const bankRating = indicators[ind.key]?.rating;
    if (!bankRating) continue;
    
    if (knockoutLevel === 'ruim' && bankRating === 'ruim') {
      isKnockedOut = true;
      knockoutReasons.push(`${ind.label} classificado como Ruim`);
    } else if (knockoutLevel === 'moderado' && (bankRating === 'ruim' || bankRating === 'moderado')) {
      isKnockedOut = true;
      knockoutReasons.push(`${ind.label} classificado como ${bankRating === 'ruim' ? 'Ruim' : 'Moderado'}`);
    }
  }

  // 3. Calculate weighted score
  let weightedScore = 0;
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);

  if (totalWeight > 0 && !isKnockedOut) {
    for (const ind of indicatorsList) {
      const weightVal = weights[ind.key] || 0;
      const weight = weightVal / totalWeight; // Normalize
      const score = indicators[ind.key]?.score || 0;
      weightedScore += score * weight;
    }
  }

  return {
    bank,
    indicators: indicators as Record<IndicatorKey, IndicatorResult>,
    weightedScore: isKnockedOut ? 0 : Math.round(weightedScore * 10) / 10,
    isKnockedOut,
    knockoutReasons,
    status: isKnockedOut ? 'nao_viavel' : 'elegivel',
  };
}

/**
 * Analyzes all banks and returns sorted results.
 */
export function analyzeAllBanks(
  banks: BankData[],
  weights: Record<IndicatorKey, number>,
  knockouts: Record<IndicatorKey, KnockoutLevel>,
  parameters?: Record<IndicatorKey, ParametroIndicador>,
  indicatorsList: IndicatorConfig[] = INDICATORS,
): BankAnalysis[] {
  return banks
    .map(bank => analyzeBank(bank, weights, knockouts, parameters, indicatorsList))
    .sort((a, b) => {
      // Knocked out banks go to the bottom
      if (a.isKnockedOut && !b.isKnockedOut) return 1;
      if (!a.isKnockedOut && b.isKnockedOut) return -1;
      // Sort by score descending
      return b.weightedScore - a.weightedScore;
    });
}
