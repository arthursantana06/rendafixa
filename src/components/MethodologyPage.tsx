// ============================================================
// METHODOLOGY PAGE - Editorial Layout
// ============================================================

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import { INDICATORS } from '@/lib/indicators';
import type { IndicatorConfig, QualityRating, IndicatorKey, ParametroIndicador, KnockoutLevel } from '@/types';
import { ConfigPanel } from './ConfigPanel';

interface MethodologyPageProps {
  indicators?: IndicatorConfig[];
  parameters?: Record<IndicatorKey, ParametroIndicador>;
  onUpdateParameter: (key: IndicatorKey, updates: Partial<ParametroIndicador>) => void;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
  weights: Record<IndicatorKey, number>;
  knockouts: Record<IndicatorKey, KnockoutLevel>;
  onWeightChange: (key: IndicatorKey, value: number) => void;
  onKnockoutChange: (key: IndicatorKey, level: KnockoutLevel) => void;
  onResetWeights: () => void;
  onAddIndicator?: (newInd: {
    key: string;
    label: string;
    shortLabel: string;
    description: string;
    unit: string;
    source: string;
    sourceField: string;
    direction: 'higher_is_better' | 'lower_is_better';
    limite_muito_bom: number;
    limite_bom: number;
    limite_moderado: number;
  }) => Promise<void>;
}

export function MethodologyPage({ 
  indicators = INDICATORS,
  parameters, 
  onUpdateParameter,
  onTogglePanel,
  isPanelOpen,
  weights,
  knockouts,
  onWeightChange,
  onKnockoutChange,
  onResetWeights,
  onAddIndicator
}: MethodologyPageProps) {
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6 h-[calc(100vh-155px)] flex flex-col overflow-hidden">
      
      {/* Header Section */}
      <div className="flex items-start justify-between mb-6 shrink-0 gap-8">
        <div className="max-w-4xl">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground leading-tight mb-2">
            Metodologia de Análise
          </h2>
          <p className="font-serif text-xs italic text-muted-foreground leading-relaxed">
            Critérios de avaliação de risco de crédito baseados em dados prudenciais do BACEN. Identificar e mensurar a qualidade do emissor de forma sistemática é essencial para a construção de carteiras resilientes.
          </p>
        </div>
        <div className="flex-shrink-0 pt-1 flex gap-3">
          <button
            onClick={() => {
              setIsAddFormOpen(!isAddFormOpen);
              if (isPanelOpen) onTogglePanel();
            }}
            className={`flex items-center gap-2.5 px-6 py-3.5 text-[11px] font-sans font-black uppercase tracking-widest transition-all duration-300 cursor-pointer border ${
              isAddFormOpen 
                ? 'bg-foreground text-background border-foreground hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-background text-foreground border-foreground/30 hover:border-foreground hover:bg-foreground/5 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <span className="text-sm font-bold">+</span>
            <span>Novo Indicador</span>
          </button>

          <button
            onClick={() => {
              onTogglePanel();
              if (isAddFormOpen) setIsAddFormOpen(false);
            }}
            className={`flex items-center gap-2.5 px-6 py-3.5 text-[11px] font-sans font-black uppercase tracking-widest transition-all duration-300 cursor-pointer border ${
              isPanelOpen 
                ? 'bg-foreground text-background border-foreground hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-background text-foreground border-foreground/30 hover:border-foreground hover:bg-foreground/5 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Cálculo do SCORE</span>
          </button>
        </div>
      </div>

      {/* ConfigPanel dynamically shown above the content grid spanning full width */}
      {isPanelOpen && (
        <div className="mb-6 shrink-0 border border-border/60 bg-muted/10 p-6 animate-in slide-in-from-top-2 duration-300 max-h-[350px] overflow-y-auto">
          <ConfigPanel
            weights={weights}
            knockouts={knockouts}
            onWeightChange={onWeightChange}
            onKnockoutChange={onKnockoutChange}
            onResetWeights={onResetWeights}
            isOpen={isPanelOpen}
            compact={false}
            indicators={indicators}
          />
        </div>
      )}

      {/* New Indicator Form dynamically shown above the content grid spanning full width */}
      {isAddFormOpen && (
        <div className="mb-6 shrink-0 border border-border/60 bg-muted/10 p-6 animate-in slide-in-from-top-2 duration-300 max-h-[450px] overflow-y-auto">
          <NewIndicatorForm 
            onAdd={async (data) => {
              if (onAddIndicator) {
                await onAddIndicator(data);
                setIsAddFormOpen(false);
              }
            }}
            onClose={() => setIsAddFormOpen(false)}
          />
        </div>
      )}

      {/* Grid Layout for Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        
        {/* Left Column: Principles & Sources with expanded balanced text */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-4 scrollbar-thin">
          
          <section className="flex flex-col gap-4">
            <h3 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-border/60 pb-2">
              Fontes de Dados & Boas Práticas
            </h3>
            
            <div className="bg-muted/30 p-4 border-l-2 border-foreground">
              <p className="font-sans text-[11px] text-foreground leading-relaxed mb-3">
                Esta plataforma integra de forma direta e transparente dados estruturados do sistema de informações cadastrais e financeiras do Banco Central do Brasil (<strong>IF.data do BACEN</strong>).
              </p>
              <a href="https://www3.bcb.gov.br/ifdata/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors underline decoration-border underline-offset-4">
                Acessar Portal IF.data ↗
              </a>
            </div>

            <div className="flex flex-col gap-4 text-foreground/80 font-sans text-[11px] leading-relaxed">
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground mb-1">
                  1. Padrão de Qualidade Prudencial
                </h4>
                <p className="text-muted-foreground">
                  As análises baseiam-se nas normas do Comitê de Basileia III, adotadas pelo BACEN para garantir estabilidade financeira do Sistema Financeiro Nacional (SFN). Monitora-se o Índice de Basileia, que mede a relação entre o Capital Regulatório e os Ativos Ponderados pelo Risco (RWA), e o Capital Principal (CET1), indicador definitivo de solvência.
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground mb-1">
                  2. Governança & Integridade ETL
                </h4>
                <p className="text-muted-foreground">
                  O motor de ingestão (ETL) realiza uma limpeza profunda das bases brutas enviadas pelas instituições ao regulador. Implementamos algoritmos de decodificação dupla para corrigir conflitos de encoding UTF-8/Windows-1252, mitigando caracteres corrompidos comuns em exportações governamentais, além de consolidar de forma idempotente os saldos e índices.
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground mb-1">
                  3. A Mecânica de Scoring e Knockouts
                </h4>
                <p className="text-muted-foreground">
                  O score consolidado é uma média ponderada dinâmica com base nos pesos definidos no painel superior. Parâmetros individuais classificam cada instituição em faixas de risco (Muito Bom, Bom, Moderado, Ruim). Filtros eliminatórios (knockouts) ativam travas estruturais que rebaixam a instituição diretamente para "Inviável" caso regras prudenciais mínimas sejam violadas.
                </p>
              </div>

              <div className="border-t border-border/30 pt-4 mt-2">
                <h4 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Regras e Diretrizes Operacionais:
                </h4>
                <ul className="flex flex-col gap-2 list-none pl-0">
                  <li className="flex gap-2">
                    <span className="text-foreground font-bold">•</span>
                    <span><strong>Consistência Histórica:</strong> Recomenda-se analisar a evolução dos últimos 4 trimestres para avaliar tendências estruturais em tesouraria.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-foreground font-bold">•</span>
                    <span><strong>Chave Primária de Cruzamento:</strong> O Código da Instituição (Código IF) do BACEN serve como o identificador único para conciliações cadastrais robustas.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-foreground font-bold">•</span>
                    <span><strong>Sintonia Fina de Parâmetros:</strong> Modificações nos limites do Score devem refletir os cenários macroeconômicos de liquidez do mercado interbancário nacional.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

        </div>

        {/* Right Column: Detailed Indicators */}
        <div className="lg:col-span-8 flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-6 shrink-0">
            <h3 className="font-sans text-[11px] font-bold uppercase tracking-widest text-foreground">
              Indicadores e Parâmetros
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 scroll-smooth flex flex-col gap-4">
            {indicators.map((ind) => (
              <IndicatorEditorialBlock 
                key={ind.key} 
                indicator={ind} 
                parameter={parameters?.[ind.key]}
                onUpdate={onUpdateParameter}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

interface VisualIntervalBarProps {
  direction: 'higher_is_better' | 'lower_is_better';
  muitoBom: number;
  bom: number;
  moderado: number;
  unit: string;
}

function VisualIntervalBar({ direction, muitoBom, bom, moderado, unit }: VisualIntervalBarProps) {
  const isHigher = direction === 'higher_is_better';

  const segments = isHigher 
    ? [
        { label: 'Ruim', color: 'bg-rose-500/20 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30' },
        { label: 'Moderado', color: 'bg-amber-500/20 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30' },
        { label: 'Bom', color: 'bg-emerald-500/20 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' },
        { label: 'Muito Bom', color: 'bg-blue-500/20 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30' }
      ]
    : [
        { label: 'Muito Bom', color: 'bg-blue-500/20 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30' },
        { label: 'Bom', color: 'bg-emerald-500/20 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' },
        { label: 'Moderado', color: 'bg-amber-500/20 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30' },
        { label: 'Ruim', color: 'bg-rose-500/20 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30' }
      ];

  const boundaries = isHigher
    ? [moderado, bom, muitoBom]
    : [muitoBom, bom, moderado];

  return (
    <div className="w-full flex flex-col pt-1 pb-4">
      {/* The Bar */}
      <div className="h-6 w-full flex rounded-sm overflow-hidden border border-border/30 relative">
        {segments.map((seg, i) => (
          <div 
            key={i} 
            className={`w-1/4 ${seg.color} flex items-center justify-center transition-all duration-300`}
          >
            <span className="font-sans text-[8px] font-black uppercase tracking-widest text-center px-1">
              {seg.label}
            </span>
          </div>
        ))}
      </div>

      {/* The ticks & values */}
      <div className="relative w-full h-8 mt-1.5">
        {boundaries.map((val, idx) => {
          const percentage = 25 * (idx + 1);
          return (
            <div 
              key={idx} 
              style={{ left: `${percentage}%` }} 
              className="absolute -translate-x-1/2 flex flex-col items-center"
            >
              {/* Tick mark */}
              <div className="w-[1px] h-1.5 bg-foreground/30 dark:bg-foreground/50"></div>
              {/* Value label */}
              <span className="font-mono text-[9px] font-bold text-foreground mt-1 bg-background px-1.5 py-0.5 border border-border/30 rounded-sm shadow-xs select-none">
                {val !== undefined && val !== null && !isNaN(val) ? `${val}${unit}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface IndicatorEditorialBlockProps {
  indicator: IndicatorConfig;
  parameter?: ParametroIndicador;
  onUpdate: (key: IndicatorKey, updates: Partial<ParametroIndicador>) => void;
}

function IndicatorEditorialBlock({ indicator, parameter, onUpdate }: IndicatorEditorialBlockProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [muitoBom, setMuitoBom] = useState('');
  const [bom, setBom] = useState('');
  const [moderado, setModerado] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (parameter) {
      setMuitoBom(String(parameter.limite_muito_bom));
      setBom(String(parameter.limite_bom));
      setModerado(String(parameter.limite_moderado));
    }
  }, [parameter]);

  const qualityLevels: { key: QualityRating; label: string }[] = [
    { key: 'muito_bom', label: 'Muito Bom' },
    { key: 'bom', label: 'Bom' },
    { key: 'moderado', label: 'Moderado' },
    { key: 'ruim', label: 'Ruim' },
  ];

  const colorMap: Record<QualityRating, string> = {
    muito_bom: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
    bom: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    moderado: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    ruim: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
  };

  function getRulePreview(
    direction: 'higher_is_better' | 'lower_is_better',
    mb: number,
    b: number,
    mod: number,
    unit: string
  ) {
    if (direction === 'higher_is_better') {
      return {
        muito_bom: `> ${mb}${unit}`,
        bom: `Entre ${b}${unit} e ${mb}${unit}`,
        moderado: `Entre ${mod}${unit} e ${b}${unit}`,
        ruim: `< ${mod}${unit}`,
      };
    } else {
      return {
        muito_bom: `< ${mb}${unit}`,
        bom: `Entre ${mb}${unit} e ${b}${unit}`,
        moderado: `Entre ${b}${unit} e ${mod}${unit}`,
        ruim: `> ${mod}${unit}`,
      };
    }
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(indicator.key, {
      limite_muito_bom: Number(muitoBom),
      limite_bom: Number(bom),
      limite_moderado: Number(moderado),
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <article className="group border border-border/50 bg-background transition-all hover:border-border/80">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors text-left"
      >
        <div className="flex items-baseline gap-4">
          <h4 className="font-serif text-base font-bold text-foreground">
            {indicator.label}
          </h4>
          <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground hidden sm:inline-block">
            {indicator.shortLabel}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      
      {isOpen && (
        <div className="px-5 pb-5 pt-3 border-t border-border/30 bg-muted/5">
          <p className="font-sans text-[11px] text-foreground/75 leading-relaxed mb-4 max-w-3xl">
            {indicator.description}
          </p>

          <div className="mb-5 font-sans text-[9px] text-muted-foreground tracking-wide flex items-center gap-1.5 uppercase font-bold">
            <span>Fonte BACEN:</span>
            <span className="font-serif italic normal-case font-normal">{indicator.source}</span>
            <span>—</span>
            <span className="normal-case font-normal">{indicator.sourceField}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4 border-t border-border/20">
            
            {/* Left Column: Form parameter editor using math symbols */}
            <div className="lg:col-span-5 lg:border-r border-border/20 lg:pr-8 flex flex-col gap-4">
              <h5 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground">
                Configuração de Limites
              </h5>
              
              {!parameter ? (
                <div className="font-sans text-xs italic text-muted-foreground py-2 animate-pulse">
                  Carregando parâmetros...
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
                  {/* Direction Badge */}
                  <div className="flex items-center justify-between font-sans text-[9px] uppercase tracking-wider text-muted-foreground bg-muted/40 p-2 border border-border/30 rounded-sm">
                    <span className="font-bold">Direção da Nota:</span>
                    <span className="font-black text-foreground">
                      {parameter.direction === 'higher_is_better' ? 'Maior é Melhor (↑)' : 'Menor é Melhor (↓)'}
                    </span>
                  </div>

                  {/* Math Formula Blocks */}
                  {parameter.direction === 'higher_is_better' ? (
                    <div className="flex flex-col gap-3 font-sans text-xs">
                      {/* Muito Bom Row */}
                      <div className="flex items-center justify-between bg-blue-500/5 border border-blue-500/10 p-2.5 rounded-sm">
                        <span className="w-20 font-sans text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                          Muito Bom
                        </span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-foreground font-mono font-bold">x ≥</span>
                          <input 
                            type="number"
                            step="0.01"
                            value={muitoBom}
                            onChange={(e) => setMuitoBom(e.target.value)}
                            className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                            title="Limite Muito Bom"
                          />
                          <span className="text-muted-foreground font-mono w-4">{indicator.unit}</span>
                        </div>
                      </div>

                      {/* Bom Row */}
                      <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-sm">
                        <span className="w-20 font-sans text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                          Bom
                        </span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <input 
                            type="number"
                            step="0.01"
                            value={bom}
                            onChange={(e) => setBom(e.target.value)}
                            className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                            title="Limite Bom"
                          />
                          <span className="text-foreground font-mono font-bold">≤ x &lt;</span>
                          <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                            {muitoBom !== '' ? muitoBom : '—'}
                          </span>
                          <span className="text-muted-foreground font-mono w-4">{indicator.unit}</span>
                        </div>
                      </div>

                      {/* Moderado Row */}
                      <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-sm">
                        <span className="w-20 font-sans text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                          Moderado
                        </span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <input 
                            type="number"
                            step="0.01"
                            value={moderado}
                            onChange={(e) => setModerado(e.target.value)}
                            className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                            title="Limite Moderado"
                          />
                          <span className="text-foreground font-mono font-bold">≤ x &lt;</span>
                          <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                            {bom !== '' ? bom : '—'}
                          </span>
                          <span className="text-muted-foreground font-mono w-4">{indicator.unit}</span>
                        </div>
                      </div>

                      {/* Ruim Row */}
                      <div className="flex items-center justify-between bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-sm">
                        <span className="w-20 font-sans text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                          Ruim
                        </span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-foreground font-mono font-bold">x &lt;</span>
                          <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                            {moderado !== '' ? moderado : '—'}
                          </span>
                          <span className="text-muted-foreground font-mono w-4">{indicator.unit}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 font-sans text-xs">
                      {/* Muito Bom Row */}
                      <div className="flex items-center justify-between bg-blue-500/5 border border-blue-500/10 p-2.5 rounded-sm">
                        <span className="w-20 font-sans text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                          Muito Bom
                        </span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-foreground font-mono font-bold">x ≤</span>
                          <input 
                            type="number"
                            step="0.01"
                            value={muitoBom}
                            onChange={(e) => setMuitoBom(e.target.value)}
                            className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                            title="Limite Muito Bom"
                          />
                          <span className="text-muted-foreground font-mono w-4">{indicator.unit}</span>
                        </div>
                      </div>

                      {/* Bom Row */}
                      <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-sm">
                        <span className="w-20 font-sans text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                          Bom
                        </span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                            {muitoBom !== '' ? muitoBom : '—'}
                          </span>
                          <span className="text-foreground font-mono font-bold">&lt; x ≤</span>
                          <input 
                            type="number"
                            step="0.01"
                            value={bom}
                            onChange={(e) => setBom(e.target.value)}
                            className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                            title="Limite Bom"
                          />
                          <span className="text-muted-foreground font-mono w-4">{indicator.unit}</span>
                        </div>
                      </div>

                      {/* Moderado Row */}
                      <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-sm">
                        <span className="w-20 font-sans text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                          Moderado
                        </span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                            {bom !== '' ? bom : '—'}
                          </span>
                          <span className="text-foreground font-mono font-bold">&lt; x ≤</span>
                          <input 
                            type="number"
                            step="0.01"
                            value={moderado}
                            onChange={(e) => setModerado(e.target.value)}
                            className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                            title="Limite Moderado"
                          />
                          <span className="text-muted-foreground font-mono w-4">{indicator.unit}</span>
                        </div>
                      </div>

                      {/* Ruim Row */}
                      <div className="flex items-center justify-between bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-sm">
                        <span className="w-20 font-sans text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                          Ruim
                        </span>
                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className="text-foreground font-mono font-bold">x &gt;</span>
                          <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                            {moderado !== '' ? moderado : '—'}
                          </span>
                          <span className="text-muted-foreground font-mono w-4">{indicator.unit}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Constraint Warning */}
                  {(() => {
                    const mbVal = Number(muitoBom);
                    const bVal = Number(bom);
                    const modVal = Number(moderado);
                    const isHigherDir = parameter.direction === 'higher_is_better';
                    const hasConflict = isHigherDir
                      ? (!isNaN(mbVal) && !isNaN(bVal) && muitoBom !== '' && bom !== '' && mbVal <= bVal) ||
                        (!isNaN(bVal) && !isNaN(modVal) && bom !== '' && moderado !== '' && bVal <= modVal) ||
                        (!isNaN(mbVal) && !isNaN(modVal) && muitoBom !== '' && moderado !== '' && mbVal <= modVal)
                      : (!isNaN(mbVal) && !isNaN(bVal) && muitoBom !== '' && bom !== '' && mbVal >= bVal) ||
                        (!isNaN(bVal) && !isNaN(modVal) && bom !== '' && moderado !== '' && bVal >= modVal) ||
                        (!isNaN(mbVal) && !isNaN(modVal) && muitoBom !== '' && moderado !== '' && mbVal >= modVal);

                    if (hasConflict) {
                      return (
                        <div className="font-sans text-[10px] font-bold uppercase tracking-wide text-rose-600 bg-rose-500/5 p-3 border border-rose-500/20 rounded-sm leading-relaxed">
                          ⚠️ Atenção: Os limites violam a consistência lógica ({isHigherDir ? 'Muito Bom > Bom > Moderado' : 'Muito Bom < Bom < Moderado'}).
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <button
                    type="submit"
                    className={`font-sans text-[10px] font-bold uppercase tracking-widest py-3 px-4 border transition-all text-center cursor-pointer ${
                      isSaved 
                        ? 'bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600' 
                        : 'bg-foreground border-foreground text-background hover:bg-foreground/90'
                    }`}
                  >
                    {isSaved ? 'Parâmetros Salvos!' : 'Salvar Parâmetros'}
                  </button>
                </form>
              )}
            </div>

            {/* Right Column: Live Range Visualizer and textual summary */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div>
                <h5 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground mb-3">
                  Visualização dos Intervalos
                </h5>
                <VisualIntervalBar 
                  direction={parameter?.direction || indicator.direction}
                  muitoBom={Number(muitoBom) || 0}
                  bom={Number(bom) || 0}
                  moderado={Number(moderado) || 0}
                  unit={indicator.unit}
                />
              </div>

              <div>
                <h5 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground mb-3">
                  Resumo das Regras de Enquadramento
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 bg-muted/20 p-4 border border-border/40 rounded-sm">
                  {qualityLevels.map(({ key, label }) => {
                    let previewText = indicator.criteria?.[key] || '';
                    if (parameter) {
                      const mbNum = Number(muitoBom) || 0;
                      const bNum = Number(bom) || 0;
                      const modNum = Number(moderado) || 0;
                      const rules = getRulePreview(parameter.direction, mbNum, bNum, modNum, indicator.unit);
                      
                      if (key === 'muito_bom') previewText = `Valores classificados com nota máxima: ${rules.muito_bom}.`;
                      else if (key === 'bom') previewText = `Valores considerados confortáveis: ${rules.bom}.`;
                      else if (key === 'moderado') previewText = `Valores no limite de adequação: ${rules.moderado}.`;
                      else if (key === 'ruim') previewText = `Valores de risco crítico: ${rules.ruim}.`;
                    }

                    return (
                      <div key={key} className="flex flex-col items-start gap-1">
                        <span className={`font-sans text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${colorMap[key]}`}>
                          {label}
                        </span>
                        <p className="font-sans text-[10px] text-foreground/75 leading-relaxed">
                          {previewText}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </article>
  );
}

// ============================================================
// New Indicator Form Component
// ============================================================

interface NewIndicatorFormProps {
  onAdd: (data: {
    key: string;
    label: string;
    shortLabel: string;
    description: string;
    unit: string;
    source: string;
    sourceField: string;
    direction: 'higher_is_better' | 'lower_is_better';
    limite_muito_bom: number;
    limite_bom: number;
    limite_moderado: number;
  }) => Promise<void>;
  onClose: () => void;
}

export function NewIndicatorForm({ onAdd, onClose }: NewIndicatorFormProps) {
  const [label, setLabel] = useState('');
  const [shortLabel, setShortLabel] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [direction, setDirection] = useState<'higher_is_better' | 'lower_is_better'>('higher_is_better');
  const [limiteMuitoBom, setLimiteMuitoBom] = useState('');
  const [limiteBom, setLimiteBom] = useState('');
  const [limiteModerado, setLimiteModerado] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return setError('O nome do indicador é obrigatório.');
    if (!shortLabel.trim()) return setError('A sigla é obrigatória.');
    if (!description.trim()) return setError('A descrição é obrigatória.');
    if (!source.trim()) return setError('A fonte de dados é obrigatória.');
    if (!limiteMuitoBom || !limiteBom || !limiteModerado) {
      return setError('Todos os limites dos parâmetros são obrigatórios.');
    }

    const key = label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!key) return setError('Nome do indicador inválido.');

    setIsSubmitting(true);
    setError('');

    try {
      await onAdd({
        key,
        label: label.trim(),
        shortLabel: shortLabel.trim().toUpperCase(),
        description: description.trim(),
        unit: '%',
        source: source.trim(),
        sourceField: 'Não extraído',
        direction,
        limite_muito_bom: Number(limiteMuitoBom),
        limite_bom: Number(limiteBom),
        limite_moderado: Number(limiteModerado),
      });
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar indicador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      <div className="flex items-center justify-between border-b border-border/40 pb-2">
        <h3 className="font-sans text-xs font-black uppercase tracking-widest text-foreground">
          Criar Novo Indicador Customizado
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Cancelar
        </button>
      </div>

      {error && (
        <div className="font-sans text-[10px] font-bold uppercase tracking-widest text-destructive bg-destructive/5 p-3 border border-destructive/20">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-6 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 flex flex-col gap-1">
              <label className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                Nome do Indicador
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex: Liquidez Corrente"
                className="bg-transparent border border-border/60 font-sans text-xs px-3 py-2 focus:outline-none focus:border-foreground placeholder:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                Sigla
              </label>
              <input
                type="text"
                value={shortLabel}
                onChange={(e) => setShortLabel(e.target.value)}
                placeholder="Ex: LC"
                className="bg-transparent border border-border/60 font-sans text-xs px-3 py-2 focus:outline-none focus:border-foreground placeholder:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
              Fonte do Dado
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Ex: IF.data > Dados por Instituição > Ativo"
              className="bg-transparent border border-border/60 font-sans text-xs px-3 py-2 focus:outline-none focus:border-foreground placeholder:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
              Descrição Detalhada
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que este indicador mede, como ele afeta a solvência..."
              className="bg-transparent border border-border/60 font-sans text-xs px-3 py-2 focus:outline-none focus:border-foreground resize-none placeholder:opacity-50"
            />
          </div>
        </div>

        <div className="md:col-span-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
              Direção da Nota
            </label>
            <div className="flex border border-border/60">
              <button
                type="button"
                onClick={() => setDirection('higher_is_better')}
                className={`flex-1 font-sans text-[9px] font-bold uppercase tracking-widest py-2 transition-colors cursor-pointer ${
                  direction === 'higher_is_better'
                    ? 'bg-foreground text-background font-black'
                    : 'bg-transparent text-muted-foreground hover:bg-muted/10'
                }`}
              >
                Maior é Melhor
              </button>
              <button
                type="button"
                onClick={() => setDirection('lower_is_better')}
                className={`flex-1 font-sans text-[9px] font-bold uppercase tracking-widest py-2 transition-colors cursor-pointer ${
                  direction === 'lower_is_better'
                    ? 'bg-foreground text-background font-black'
                    : 'bg-transparent text-muted-foreground hover:bg-muted/10'
                }`}
              >
                Menor é Melhor
              </button>
            </div>
          </div>

          {/* Math Formula Blocks for Creation */}
          {direction === 'higher_is_better' ? (
            <div className="flex flex-col gap-2.5 font-sans text-xs">
              {/* Muito Bom Row */}
              <div className="flex items-center justify-between bg-blue-500/5 border border-blue-500/10 p-2.5 rounded-sm">
                <span className="w-20 font-sans text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  Muito Bom
                </span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-foreground font-mono font-bold">x ≥</span>
                  <input 
                    type="number"
                    step="0.01"
                    value={limiteMuitoBom}
                    onChange={(e) => setLimiteMuitoBom(e.target.value)}
                    placeholder="Ex: 15"
                    className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                    title="Limite Muito Bom"
                  />
                  <span className="text-muted-foreground font-mono w-4">%</span>
                </div>
              </div>

              {/* Bom Row */}
              <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-sm">
                <span className="w-20 font-sans text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  Bom
                </span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <input 
                    type="number"
                    step="0.01"
                    value={limiteBom}
                    onChange={(e) => setLimiteBom(e.target.value)}
                    placeholder="Ex: 11"
                    className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                    title="Limite Bom"
                  />
                  <span className="text-foreground font-mono font-bold">≤ x &lt;</span>
                  <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                    {limiteMuitoBom !== '' ? limiteMuitoBom : '—'}
                  </span>
                  <span className="text-muted-foreground font-mono w-4">%</span>
                </div>
              </div>

              {/* Moderado Row */}
              <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-sm">
                <span className="w-20 font-sans text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                  Moderado
                </span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <input 
                    type="number"
                    step="0.01"
                    value={limiteModerado}
                    onChange={(e) => setLimiteModerado(e.target.value)}
                    placeholder="Ex: 9"
                    className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                    title="Limite Moderado"
                  />
                  <span className="text-foreground font-mono font-bold">≤ x &lt;</span>
                  <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                    {limiteBom !== '' ? limiteBom : '—'}
                  </span>
                  <span className="text-muted-foreground font-mono w-4">%</span>
                </div>
              </div>

              {/* Ruim Row */}
              <div className="flex items-center justify-between bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-sm">
                <span className="w-20 font-sans text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                  Ruim
                </span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-foreground font-mono font-bold">x &lt;</span>
                  <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                    {limiteModerado !== '' ? limiteModerado : '—'}
                  </span>
                  <span className="text-muted-foreground font-mono w-4">%</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 font-sans text-xs">
              {/* Muito Bom Row */}
              <div className="flex items-center justify-between bg-blue-500/5 border border-blue-500/10 p-2.5 rounded-sm">
                <span className="w-20 font-sans text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  Muito Bom
                </span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-foreground font-mono font-bold">x ≤</span>
                  <input 
                    type="number"
                    step="0.01"
                    value={limiteMuitoBom}
                    onChange={(e) => setLimiteMuitoBom(e.target.value)}
                    placeholder="Ex: 5"
                    className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                    title="Limite Muito Bom"
                  />
                  <span className="text-muted-foreground font-mono w-4">%</span>
                </div>
              </div>

              {/* Bom Row */}
              <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 p-2.5 rounded-sm">
                <span className="w-20 font-sans text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  Bom
                </span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                    {limiteMuitoBom !== '' ? limiteMuitoBom : '—'}
                  </span>
                  <span className="text-foreground font-mono font-bold">&lt; x ≤</span>
                  <input 
                    type="number"
                    step="0.01"
                    value={limiteBom}
                    onChange={(e) => setLimiteBom(e.target.value)}
                    placeholder="Ex: 8"
                    className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                    title="Limite Bom"
                  />
                  <span className="text-muted-foreground font-mono w-4">%</span>
                </div>
              </div>

              {/* Moderado Row */}
              <div className="flex items-center justify-between bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-sm">
                <span className="w-20 font-sans text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                  Moderado
                </span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                    {limiteBom !== '' ? limiteBom : '—'}
                  </span>
                  <span className="text-foreground font-mono font-bold">&lt; x ≤</span>
                  <input 
                    type="number"
                    step="0.01"
                    value={limiteModerado}
                    onChange={(e) => setLimiteModerado(e.target.value)}
                    placeholder="Ex: 12"
                    className="w-20 bg-background border border-border/80 rounded px-2 py-1 font-mono text-xs focus:outline-none focus:border-foreground text-right"
                    title="Limite Moderado"
                  />
                  <span className="text-muted-foreground font-mono w-4">%</span>
                </div>
              </div>

              {/* Ruim Row */}
              <div className="flex items-center justify-between bg-rose-500/5 border border-rose-500/10 p-2.5 rounded-sm">
                <span className="w-20 font-sans text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">
                  Ruim
                </span>
                <div className="flex items-center gap-2 flex-1 justify-end">
                  <span className="text-foreground font-mono font-bold">x &gt;</span>
                  <span className="font-mono bg-muted/40 px-2 py-1 rounded text-foreground min-w-[50px] text-center border border-border/40 text-xs">
                    {limiteModerado !== '' ? limiteModerado : '—'}
                  </span>
                  <span className="text-muted-foreground font-mono w-4">%</span>
                </div>
              </div>
            </div>
          )}

          {/* Validation Warning */}
          {(() => {
            const mbVal = Number(limiteMuitoBom);
            const bVal = Number(limiteBom);
            const modVal = Number(limiteModerado);
            const isHigherDir = direction === 'higher_is_better';
            const hasConflict = isHigherDir
              ? (!isNaN(mbVal) && !isNaN(bVal) && limiteMuitoBom !== '' && limiteBom !== '' && mbVal <= bVal) ||
                (!isNaN(bVal) && !isNaN(modVal) && limiteBom !== '' && limiteModerado !== '' && bVal <= modVal) ||
                (!isNaN(mbVal) && !isNaN(modVal) && limiteMuitoBom !== '' && limiteModerado !== '' && mbVal <= modVal)
              : (!isNaN(mbVal) && !isNaN(bVal) && limiteMuitoBom !== '' && limiteBom !== '' && mbVal >= bVal) ||
                (!isNaN(bVal) && !isNaN(modVal) && limiteBom !== '' && limiteModerado !== '' && bVal >= modVal) ||
                (!isNaN(mbVal) && !isNaN(modVal) && limiteMuitoBom !== '' && limiteModerado !== '' && mbVal >= modVal);

            if (hasConflict) {
              return (
                <div className="font-sans text-[10px] font-bold uppercase tracking-wide text-rose-600 bg-rose-500/5 p-3 border border-rose-500/20 rounded-sm leading-relaxed">
                  ⚠️ Atenção: Os limites violam a consistência lógica ({isHigherDir ? 'Muito Bom > Bom > Moderado' : 'Muito Bom < Bom < Moderado'}).
                </div>
              );
            }
            return null;
          })()}

          {/* Live Preview Range Bar inside Drawer */}
          <div className="flex flex-col gap-1 border-t border-border/20 pt-3 mt-1">
            <label className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Visualização Prévia dos Intervalos
            </label>
            <VisualIntervalBar 
              direction={direction}
              muitoBom={Number(limiteMuitoBom) || 0}
              bom={Number(limiteBom) || 0}
              moderado={Number(limiteModerado) || 0}
              unit="%"
            />
          </div>

          <button
            type="submit"
            className="mt-2 font-sans text-[10px] font-black uppercase tracking-widest bg-foreground border border-foreground text-background py-3.5 hover:bg-foreground/90 transition-all cursor-pointer text-center"
          >
            Adicionar Indicador
          </button>
        </div>
      </div>
    </form>
  );
}
