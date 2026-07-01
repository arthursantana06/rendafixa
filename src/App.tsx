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
import { IndexerPage } from '@/components/IndexerPage';
import { IndexerDataPage } from '@/components/IndexerDataPage';
import { BankDetailsModal } from '@/components/BankDetailsModal';
import { PainelPage } from '@/components/PainelPage';
import { RendaVariavelPage } from '@/components/RendaVariavelPage';
import { analyzeAllBanks } from '@/lib/analysis';
import { INDICATORS, getDefaultWeights, getDefaultKnockouts } from '@/lib/indicators';
import { supabase } from '@/lib/supabase';
import type { BankData, BankAnalysis, IndicatorKey, KnockoutLevel, MainTab, SubTab, ParametroIndicador, IndicatorConfig, AppModule } from '@/types';
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

const DEFAULT_FORMULAS: Record<string, string> = {
  capital: '(cet1_score * 0.60) + (ib_score * 0.30) + (razao_alavancagem_score * 0.10)',
  liquidez: 'proxy_liquidez_ial_score',
  qualidade_carteira: '(ii_score * 0.5) + (icp_score * 0.25) + (deposito_vista_funding_score * 0.25)',
  resultado: '(roa_score * 0.40) + (roe_score * 0.30) + (ie_score * 0.30)',
  porte: '(ativo_total_score * 0.5) + (carteira_credito_score * 0.5)',
  tendencia: '(tendencia_crescimento_carteira_score + tendencia_cet1_score + tendencia_roa_score + tendencia_ldr_score + tendencia_proxy_liquidez_score) / 5',
  score_final: '((porte / (1.05 ^ tempo))) * (0.3 * capital + 0.2 * liquidez + 0.3 * qualidade_carteira + 0.2 * resultado) * 0.105'
};

function App() {
  const [activeModule, setActiveModule] = useState<AppModule>(() => {
    const saved = localStorage.getItem('activeModule');
    return (saved as AppModule) || 'renda_fixa';
  });

  const [activeMainTab, setActiveMainTab] = useState<MainTab>(() => {
    const saved = localStorage.getItem('activeMainTab');
    return (saved as MainTab) || 'emissor';
  });
  const [activeSubTab, setActiveSubTab] = useState<SubTab>(() => {
    const saved = localStorage.getItem('activeSubTab');
    return (saved as SubTab) || 'analise';
  });

  useEffect(() => {
    localStorage.setItem('activeModule', activeModule);
  }, [activeModule]);

  useEffect(() => {
    localStorage.setItem('activeMainTab', activeMainTab);
  }, [activeMainTab]);

  useEffect(() => {
    localStorage.setItem('activeSubTab', activeSubTab);
  }, [activeSubTab]);

  const handleMainTabChange = useCallback((tab: MainTab) => {
    setActiveMainTab(tab);
    if (tab === 'indexador' && activeSubTab === 'metodologia') {
      setActiveSubTab('analise');
    }
  }, [activeSubTab]);

  const [banks, setBanks] = useState<BankData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<BankAnalysis | null>(null);

  const fetchBanks = useCallback(async () => {
    setIsLoading(true);
    try {
      let allData: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('emissores_bancarios')
          .select('*')
          .range(from, to);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += 1000;
          to += 1000;
          
          if (data.length < 1000) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      const mappedBanks = allData.map(row => {
        const mapVal = (v: any) => (v !== undefined && v !== null && v !== '') ? Number(v) : null;
        return {
          id: row.codigo,
          name: row.nome || 'N/I',
          cnpj: row.cnpj || row.codigo,
          ib: mapVal(row.ib),
          cet1: mapVal(row.cet1),
          ii: mapVal(row.ii),
          icp: mapVal(row.icp),
          roe: mapVal(row.roe),
          roa: mapVal(row.roa),
          rating: row.rating || 'SR',
          fgc: row.fgc || 'nao_coberto',
          
          // Metadata fields
          ativo_total: mapVal(row.ativo_total),
          patrimonio_liquido: mapVal(row.patrimonio_liquido),
          lucro_liquido: mapVal(row.lucro_liquido),
          carteira_credito: mapVal(row.carteira_credito),
          segmento: row.segmento || 'S/S',
          razao_alavancagem: mapVal(row.razao_alavancagem),
          deposito_vista_funding: mapVal(row.deposito_vista_funding),
          pcld: mapVal(row.pcld),
          total_depositos: mapVal(row.total_depositos),
          captacoes_totais: mapVal(row.captacoes_totais),
          atraso_total: mapVal(row.atraso_total),
          ldr: mapVal(row.ldr),
          ie: mapVal(row.ie),
          proxy_liquidez_ial: mapVal(row.proxy_liquidez_ial),
          tendencia_crescimento_carteira: mapVal(row.tendencia_crescimento_carteira),
          tendencia_cet1: mapVal(row.tendencia_cet1),
          tendencia_roa: mapVal(row.tendencia_roa),
          tendencia_ldr: mapVal(row.tendencia_ldr),
          tendencia_proxy_liquidez: mapVal(row.tendencia_proxy_liquidez),
        };
      }) as BankData[];
      setBanks(mappedBanks);
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
  const [formulas, setFormulas] = useState<Record<string, string>>({ ...DEFAULT_FORMULAS });
  const [tempo, setTempo] = useState<number>(1);

  const fetchFormulas = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('formulas_dimensoes').select('*');
      if (!error && data) {
        const mapped = data.reduce((acc, row) => {
          acc[row.dimension_key] = row.formula;
          return acc;
        }, {} as Record<string, string>);
        setFormulas(prev => ({
          ...prev,
          ...mapped
        }));
      }
    } catch (e) {
      console.error('Erro ao buscar formulas do banco:', e);
    }
  }, []);

  useEffect(() => {
    fetchFormulas();
  }, [fetchFormulas]);

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
          col_planilha: row.col_planilha || undefined,
          formula_score: row.formula_score || null,
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

  const handleUpdateParameter = useCallback(async (key: IndicatorKey, updates: Partial<ParametroIndicador> & { newKey?: string }) => {
    const targetKey = updates.newKey || key;
    
    // 1. Optimistic update
    setParameters(prev => {
      if (!prev) return prev;
      const copy = { ...prev };
      const current = copy[key];
      if (updates.newKey) {
        delete copy[key];
      }
      copy[targetKey] = {
        ...current,
        ...updates,
        key: targetKey
      } as ParametroIndicador;
      return copy;
    });

    // 2. Supabase update
    const dbUpdates: any = {
      limite_muito_bom: updates.limite_muito_bom,
      limite_bom: updates.limite_bom,
      limite_moderado: updates.limite_moderado,
    };
    if (updates.newKey) dbUpdates.key = updates.newKey;
    if (updates.label !== undefined) dbUpdates.label = updates.label;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.source !== undefined) dbUpdates.source = updates.source;
    if (updates.col_planilha !== undefined) dbUpdates.col_planilha = updates.col_planilha;
    if (updates.formula_score !== undefined) dbUpdates.formula_score = updates.formula_score;

    const { error } = await supabase
      .from('parametros_indicadores')
      .update(dbUpdates)
      .eq('key', key);

    if (error) {
      console.error('Failed to update parameter in Supabase:', error);
      fetchParameters();
    } else {
      await fetchParameters();
    }
  }, [fetchParameters]);

  const analyses = useMemo<BankAnalysis[]>(() => {
    if (banks.length === 0) return [];
    return analyzeAllBanks(banks, weights, knockouts, parameters, indicators, formulas, tempo);
  }, [banks, weights, knockouts, parameters, indicators, formulas, tempo]);



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
          activeModule={activeModule}
          onModuleChange={setActiveModule}
          activeMainTab={activeMainTab}
          activeSubTab={activeSubTab}
          onMainTabChange={handleMainTabChange}
          onSubTabChange={setActiveSubTab}
        />

        <main className={`flex-1 w-full relative ${
          activeModule === 'renda_fixa' && activeMainTab === 'emissor' && (activeSubTab === 'metodologia' || activeSubTab === 'extracao')
            ? 'overflow-hidden flex flex-col min-h-0' 
            : 'overflow-y-auto'
        }`}>
          <div className={`max-w-[1920px] mx-auto w-full ${
            activeModule === 'renda_fixa' && activeMainTab === 'emissor' && (activeSubTab === 'metodologia' || activeSubTab === 'extracao')
              ? 'flex-1 min-h-0 flex flex-col overflow-hidden h-full'
              : 'pb-12'
          }`}>
          {activeModule === 'painel' && (
            <PainelPage analyses={analyses} isLoading={isLoading} />
          )}

          {activeModule === 'renda_variavel' && (
            <RendaVariavelPage />
          )}

          {activeModule === 'renda_fixa' && activeMainTab === 'emissor' && activeSubTab === 'analise' && (
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

              {!isLoading && banks.length > 0 && (
                <DataTable 
                  analyses={analyses} 
                  indicators={indicators} 
                  tempo={tempo} 
                  onTempoChange={setTempo} 
                  onSelectBank={setSelectedAnalysis}
                />
              )}
            </>
          )}

          {activeModule === 'renda_fixa' && activeMainTab === 'emissor' && activeSubTab === 'metodologia' && (
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
              banks={banks}
              formulas={formulas}
              onUpdateFormulas={setFormulas}
              tempo={tempo}
            />
          )}
          
          {activeModule === 'renda_fixa' && activeMainTab === 'emissor' && activeSubTab === 'extracao' && <DataExtractionPage onUploadSuccess={fetchBanks} />}
          
          {activeModule === 'renda_fixa' && activeMainTab === 'indexador' && activeSubTab === 'analise' && <IndexerPage />}
          {activeModule === 'renda_fixa' && activeMainTab === 'indexador' && activeSubTab === 'extracao' && <IndexerDataPage />}
          </div>
        </main>

        <footer className="shrink-0 border-t border-border/60 py-4 px-8 bg-background z-10">
          <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
            <p className="font-sans text-xs font-medium text-muted-foreground tracking-wide text-center">
              © 2026 HFC Consultoria — Módulo de Análise de Ativos de Renda Fixa
            </p>
          </div>
        </footer>

        {selectedAnalysis && (
          <BankDetailsModal
            analysis={selectedAnalysis}
            onClose={() => setSelectedAnalysis(null)}
            onSaveSuccess={fetchBanks}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

export default App;
