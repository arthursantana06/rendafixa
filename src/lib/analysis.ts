import type { BankData, BankAnalysis, IndicatorKey, IndicatorResult, KnockoutLevel, ParametroIndicador, IndicatorConfig } from '@/types';
import { INDICATORS, classifyIndicator, classifyIndicatorWithValue, getQualityScore, formatIndicatorValue, getDimensions } from './indicators';

/**
 * Computes the full analysis for a single bank.
 */
export function analyzeBank(
  bank: BankData,
  weights: Record<string, number>,
  knockouts: Record<IndicatorKey, KnockoutLevel>,
  parameters?: Record<IndicatorKey, ParametroIndicador>,
  indicatorsList: IndicatorConfig[] = INDICATORS,
): BankAnalysis {
  // 1. Classify each indicator
  const indicators: Record<string, IndicatorResult & { isMissing: boolean }> = {};
  
  for (const ind of indicatorsList) {
    const rawVal = (bank as unknown as Record<string, unknown>)[ind.key];
    const isMissing = rawVal === undefined || rawVal === null || rawVal === '';
    const value = isMissing ? null : Number(rawVal);
    
    let rating: QualityRating = 'moderado';
    let score = 0;
    
    if (!isMissing) {
      const param = parameters?.[ind.key];
      if (param) {
        rating = classifyIndicatorWithValue(
          param.direction,
          value as number,
          param.limite_muito_bom,
          param.limite_bom,
          param.limite_moderado
        );
      } else {
        rating = classifyIndicator(ind.key, bank);
      }
      score = getQualityScore(rating);
    }

    const displayValue = formatIndicatorValue(ind.key, bank);
    
    indicators[ind.key] = {
      value: value as any,
      rating,
      score,
      displayValue,
      isMissing,
    };
  }

  // 2. Check knockout criteria
  const knockoutReasons: string[] = [];
  let isKnockedOut = false;

  for (const ind of indicatorsList) {
    const knockoutLevel = knockouts[ind.key];
    if (knockoutLevel === 'none' || !knockoutLevel) continue;

    const indRes = indicators[ind.key];
    if (!indRes || indRes.isMissing) continue;

    const bankRating = indRes.rating;
    if (knockoutLevel === 'ruim' && bankRating === 'ruim') {
      isKnockedOut = true;
      knockoutReasons.push(`${ind.label} classificado como Ruim`);
    } else if (knockoutLevel === 'moderado' && (bankRating === 'ruim' || bankRating === 'moderado')) {
      isKnockedOut = true;
      knockoutReasons.push(`${ind.label} classificado como ${bankRating === 'ruim' ? 'Ruim' : 'Moderado'}`);
    }
  }

  // 3. Calculate weighted score by Dimension
  let weightedScore = 0;
  
  if (!isKnockedOut) {
    const dims = getDimensions(indicatorsList);
    let totalActiveWeight = 0;
    let sumWeightedDimensionScores = 0;

    for (const dim of dims) {
      const activeInds = dim.indicators.filter(key => indicators[key] && !indicators[key].isMissing);
      
      if (activeInds.length > 0) {
        // Dimension Score is the simple average score of its active indicators
        const dimSumScore = activeInds.reduce((sum, key) => sum + indicators[key].score, 0);
        const dimScore = dimSumScore / activeInds.length;
        
        // Weight for this dimension
        const dimWeight = weights[dim.key] || 0;
        
        sumWeightedDimensionScores += dimScore * dimWeight;
        totalActiveWeight += dimWeight;
      }
    }

    if (totalActiveWeight > 0) {
      weightedScore = sumWeightedDimensionScores / totalActiveWeight;
    } else {
      weightedScore = 0;
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
  weights: Record<string, number>,
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
