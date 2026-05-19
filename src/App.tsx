// ============================================================
// APP COMPONENT - HFC Consultoria Renda Fixa Platform
// Editorial Layout (Real CSV Data)
// ============================================================

import { useState, useMemo, useCallback } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Header } from '@/components/Header';
import { ConfigPanel } from '@/components/ConfigPanel';
import { DataTable } from '@/components/DataTable';
import { MethodologyPage } from '@/components/MethodologyPage';
import { DataExtractionPage } from '@/components/DataExtractionPage';
import { analyzeAllBanks } from '@/lib/analysis';
import { getDefaultWeights, getDefaultKnockouts } from '@/lib/indicators';
import type { BankData, BankAnalysis, IndicatorKey, KnockoutLevel, MainTab, SubTab } from '@/types';
import { FileSpreadsheet } from 'lucide-react';

function App() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('emissor');
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('analise');

  // Banks data state (this will later be fetched from Supabase, but right now it's empty)
  const [banks] = useState<BankData[]>([]);

  const [weights, setWeights] = useState<Record<IndicatorKey, number>>(getDefaultWeights());
  const [knockouts, setKnockouts] = useState<Record<IndicatorKey, KnockoutLevel>>(getDefaultKnockouts());
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const analyses = useMemo<BankAnalysis[]>(() => {
    if (banks.length === 0) return [];
    return analyzeAllBanks(banks, weights, knockouts);
  }, [banks, weights, knockouts]);

  const eligibleCount = useMemo(
    () => analyses.filter(a => a.status === 'elegivel').length,
    [analyses]
  );

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
          bankCount={banks.length}
          eligibleCount={eligibleCount}
          activeMainTab={activeMainTab}
          activeSubTab={activeSubTab}
          onMainTabChange={setActiveMainTab}
          onSubTabChange={setActiveSubTab}
          onTogglePanel={() => setIsPanelOpen(p => !p)}
          isPanelOpen={isPanelOpen}
        />

        {activeMainTab === 'emissor' && activeSubTab === 'analise' && (
          <ConfigPanel
            weights={weights}
            knockouts={knockouts}
            onWeightChange={handleWeightChange}
            onKnockoutChange={handleKnockoutChange}
            onResetWeights={handleResetWeights}
            isOpen={isPanelOpen}
          />
        )}

        <main className="flex-1 overflow-y-auto w-full relative">
          <div className="max-w-[1920px] mx-auto w-full pb-12">
          {activeMainTab === 'emissor' && activeSubTab === 'analise' && (
            <>
              {/* Action Bar */}
              <div className="px-8 pt-8 flex items-end justify-between">
                <div className="flex gap-4">
                  {/* The old CSV upload button was removed. 
                      Uploads are now done in the Extração de Dados tab. */}
                </div>

                <div className="hidden lg:flex items-center gap-6">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Classificação:</span>
                  <span className="font-sans text-sm font-black text-foreground">Muito Bom</span>
                  <span className="font-sans text-sm font-bold text-foreground/80">Bom</span>
                  <span className="font-sans text-sm font-medium text-muted-foreground">Moderado</span>
                  <span className="font-sans text-sm font-normal text-muted-foreground line-through opacity-70">Ruim</span>
                </div>
              </div>

              {banks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-32 text-muted-foreground border-t border-border/40 mt-8 mx-8">
                  <FileSpreadsheet className="h-12 w-12 mb-4 opacity-20" />
                  <p className="font-serif text-2xl text-foreground mb-2">Nenhum dado consolidado</p>
                  <p className="font-sans text-sm max-w-md text-center leading-relaxed mb-6">
                    Acesse a aba "Extração de Dados" para realizar o upload das planilhas do IF.data e popular o banco de dados.
                  </p>
                  <button 
                    onClick={() => setActiveSubTab('extracao')}
                    className="font-sans text-xs font-bold uppercase tracking-widest text-foreground bg-foreground/5 border border-foreground/20 px-6 py-3 hover:bg-foreground/10 transition-colors"
                  >
                    Ir para Extração de Dados
                  </button>
                </div>
              )}

              {banks.length > 0 && <DataTable analyses={analyses} />}
            </>
          )}

          {activeMainTab === 'emissor' && activeSubTab === 'metodologia' && <MethodologyPage />}
          
          {activeMainTab === 'emissor' && activeSubTab === 'extracao' && <DataExtractionPage />}
          </div>
        </main>

        <footer className="shrink-0 border-t border-border/60 py-4 px-8 bg-background z-10">
          <div className="max-w-[1920px] mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
            <p className="font-sans text-xs font-medium text-muted-foreground tracking-wide text-center">
              © 2026 HFC Consultoria — Plataforma de Análise de Ativos de Renda Fixa
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}

export default App;
