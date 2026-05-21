// ============================================================
// APP COMPONENT - HFC Consultoria Renda Fixa Platform
// Editorial Layout (Real CSV Data)
// ============================================================

import { useState, useMemo, useCallback, useEffect } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from '@/components/Header';
import { DataTable } from '@/components/DataTable';
import { MethodologyPage } from '@/components/MethodologyPage';
import { DataExtractionPage } from '@/components/DataExtractionPage';
import { analyzeAllBanks } from '@/lib/analysis';
import { INDICATORS, getDefaultWeights, getDefaultKnockouts } from '@/lib/indicators';
import { supabase } from '@/lib/supabase';
import type { BankData, BankAnalysis, IndicatorKey, KnockoutLevel, MainTab, SubTab, ParametroIndicador, IndicatorConfig } from '@/types';
import { FileSpreadsheet } from 'lucide-react';

// Helper to derive sigla from label automatically
function deriveShortLabel(label: string): string {
  const parenMatch = label.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1].length <= 5) {
    return parenMatch[1].toUpperCase();
  }
  const words = label.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }
  return words
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

function App() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('emissor');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('analise');

  const [banks, setBanks] = useState<BankData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBanks = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.from('emissores_bancarios').select('*');
      if (!error && data) {
        const mappedBanks = data.map(row => ({
          id: row.codigo,
          name: row.nome || 'N/I',
          cnpj: row.cnpj || row.codigo,
          ib: row.ib ? Number(row.ib) : 0,
          cet1: row.cet1 ? Number(row.cet1) : 0,
          ii: row.ii ? Number(row.ii) : 0,
          icp: row.icp ? Number(row.icp) : 0,
          roe: row.roe ? Number(row.roe) : 0,
          roa: row.roa ? Number(row.roa) : 0,
          rating: row.rating || 'SR',
          fgc: row.fgc || 'nao_coberto',
          
          // Metadata fields
          ativo_total: row.ativo_total ? Number(row.ativo_total) : 0,
          patrimonio_liquido: row.patrimonio_liquido ? Number(row.patrimonio_liquido) : 0,
          lucro_liquido: row.lucro_liquido ? Number(row.lucro_liquido) : 0,
          carteira_credito: row.carteira_credito ? Number(row.carteira_credito) : 0,
          segmento: row.segmento || 'S/S',
          razao_alavancagem: row.razao_alavancagem ? Number(row.razao_alavancagem) : 0,
          deposito_vista_funding: row.deposito_vista_funding ? Number(row.deposito_vista_funding) : 0,
          pcld: row.pcld ? Number(row.pcld) : 0,
          total_depositos: row.total_depositos ? Number(row.total_depositos) : 0,
          captacoes_totais: row.captacoes_totais ? Number(row.captacoes_totais) : 0,
          atraso_total: row.atraso_total ? Number(row.atraso_total) : 0,
          ldr: row.ldr ? Number(row.ldr) : 0,
          ie: row.ie ? Number(row.ie) : 0,
          lcr: row.lcr ? Number(row.lcr) : 0,
        })) as BankData[];
        setBanks(mappedBanks);
      }
    } catch (e) {
      console.error('Erro ao buscar emissores:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanks();
  }, [fetchBanks]);

  const [weights, setWeights] = useState<Record<IndicatorKey, number>>(getDefaultWeights());
  const [knockouts, setKnockouts] = useState<Record<IndicatorKey, KnockoutLevel>>(getDefaultKnockouts());
  const [parameters, setParameters] = useState<Record<IndicatorKey, ParametroIndicador> | undefined>(undefined);
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(INDICATORS);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const fetchParameters = useCallback(async () => {
    const { data, error } = await supabase.from('parametros_indicadores').select('*');
    if (!error && data) {
      const mapped = data.reduce((acc, row) => {
        acc[row.key as IndicatorKey] = {
          key: row.key as IndicatorKey,
          label: row.label,
          direction: row.direction as 'higher_is_better' | 'lower_is_better',
          limite_muito_bom: Number(row.limite_muito_bom),
          limite_bom: Number(row.limite_bom),
          limite_moderado: Number(row.limite_moderado),
          description: row.description || undefined,
          source: row.source || undefined,
        };
        return acc;
      }, {} as Record<IndicatorKey, ParametroIndicador>);
      setParameters(mapped);

      // Build unified indicators list
      const staticKeys = INDICATORS.map(i => i.key);
      const customInds: IndicatorConfig[] = data
        .filter(row => !staticKeys.includes(row.key))
        .map(row => ({
          key: row.key,
          label: row.label,
          shortLabel: deriveShortLabel(row.label),
          description: row.description || '',
          unit: '%',
          source: row.source || 'Não especificada',
          sourceField: 'Não extraído',
        }));

      setIndicators([...INDICATORS, ...customInds]);
    }
  }, []);

  useEffect(() => {
    fetchParameters();
  }, [fetchParameters]);

  // Keep weights and knockouts synchronized with indicators
  useEffect(() => {
    setWeights(prev => {
      const updated = { ...prev };
      let changed = false;
      indicators.forEach(ind => {
        if (updated[ind.key] === undefined) {
          updated[ind.key] = 0; // default weight is 0
          changed = true;
        }
      });
      return changed ? updated : prev;
    });

    setKnockouts(prev => {
      const updated = { ...prev };
      let changed = false;
      indicators.forEach(ind => {
        if (updated[ind.key] === undefined) {
          updated[ind.key] = 'none'; // default knockout is 'none'
          changed = true;
        }
      });
      return changed ? updated : prev;
    });
  }, [indicators]);

  const handleAddIndicator = useCallback(async (newInd: {
    key: string;
    label: string;
    description: string;
    source: string;
    direction: 'higher_is_better' | 'lower_is_better';
    limite_muito_bom: number;
    limite_bom: number;
    limite_moderado: number;
  }) => {
    const { error } = await supabase
      .from('parametros_indicadores')
      .insert({
        key: newInd.key,
        label: newInd.label,
        direction: newInd.direction,
        limite_muito_bom: newInd.limite_muito_bom,
        limite_bom: newInd.limite_bom,
        limite_moderado: newInd.limite_moderado,
        description: newInd.description,
        source: newInd.source,
      });

    if (error) {
      console.error('Failed to save custom indicator in Supabase:', error);
      throw error;
    }

    await fetchParameters();
  }, [fetchParameters]);

  const handleUpdateParameter = useCallback(async (key: IndicatorKey, updates: Partial<ParametroIndicador>) => {
    // 1. Optimistic update
    setParameters(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          ...updates
        }
      };
    });

    // 2. Supabase update
    const { error } = await supabase
      .from('parametros_indicadores')
      .update({
        limite_muito_bom: updates.limite_muito_bom,
        limite_bom: updates.limite_bom,
        limite_moderado: updates.limite_moderado,
      })
      .eq('key', key);

    if (error) {
      console.error('Failed to update parameter in Supabase:', error);
      fetchParameters();
    }
  }, [fetchParameters]);

  const analyses = useMemo<BankAnalysis[]>(() => {
    if (banks.length === 0) return [];
    return analyzeAllBanks(banks, weights, knockouts, parameters, indicators);
  }, [banks, weights, knockouts, parameters, indicators]);



  const handleWeightChange = useCallback((key: IndicatorKey, value: number) => {
    setWeights(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleKnockoutChange = useCallback((key: IndicatorKey, level: KnockoutLevel) => {
    setKnockouts(prev => ({ ...prev, [key]: level }));
  }, []);

  const handleResetWeights = useCallback(() => {
    setWeights(getDefaultWeights());
  }, []);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen flex-col bg-background selection:bg-foreground selection:text-background overflow-hidden">
        <Header
          activeMainTab={activeMainTab}
          activeSubTab={activeSubTab}
          onMainTabChange={setActiveMainTab}
          onSubTabChange={setActiveSubTab}
        />

        <main className="flex-1 overflow-y-auto w-full relative">
          <div className="max-w-[1920px] mx-auto w-full pb-12">
          {activeMainTab === 'emissor' && activeSubTab === 'analise' && (
            <>
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-32 mt-8 mx-8 border-t border-border/40">
                  <div className="flex flex-col items-center gap-4">
                    <div className="h-[2px] w-32 bg-border relative overflow-hidden">
                      <div className="h-full bg-foreground w-1/3 absolute animate-loading-bar" />
                    </div>
                    <span className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground font-bold animate-pulse">
                      Carregando dados do emissor...
                    </span>
                  </div>
                </div>
              )}

              {!isLoading && banks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-muted-foreground border-t border-border/40 mt-8 mx-8">
                  <FileSpreadsheet className="h-12 w-12 mb-4 opacity-20" />
                  <p className="font-serif text-2xl text-foreground mb-2">Nenhum dado consolidado</p>
                  <p className="font-sans text-sm max-w-md text-center leading-relaxed mb-6">
                    Acesse a aba "Dados" para realizar o upload das planilhas do IF.data e popular o banco de dados.
                  </p>
                  <button 
                    onClick={() => setActiveSubTab('extracao')}
                    className="font-sans text-xs font-bold uppercase tracking-widest text-foreground bg-foreground/5 border border-foreground/20 px-6 py-3 hover:bg-foreground/10 transition-colors"
                  >
                    Ir para Dados
                  </button>
                </div>
              )}

              {!isLoading && banks.length > 0 && <DataTable analyses={analyses} indicators={indicators} />}
            </>
          )}

          {activeMainTab === 'emissor' && activeSubTab === 'metodologia' && (
            <MethodologyPage 
              indicators={indicators}
              parameters={parameters} 
              onUpdateParameter={handleUpdateParameter} 
              onTogglePanel={() => setIsPanelOpen(p => !p)}
              isPanelOpen={isPanelOpen}
              weights={weights}
              knockouts={knockouts}
              onWeightChange={handleWeightChange}
              onKnockoutChange={handleKnockoutChange}
              onResetWeights={handleResetWeights}
              onAddIndicator={handleAddIndicator}
            />
          )}
          
          {activeMainTab === 'emissor' && activeSubTab === 'extracao' && <DataExtractionPage onUploadSuccess={fetchBanks} />}
          </div>
        </main>

        <footer className="shrink-0 border-t border-border/60 py-4 px-8 bg-background z-10">
          <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
            <p className="font-sans text-xs font-medium text-muted-foreground tracking-wide text-center">
              © 2026 HFC Consultoria — Módulo de Análise de Ativos de Renda Fixa
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

export default App;
