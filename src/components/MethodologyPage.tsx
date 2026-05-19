// ============================================================
// METHODOLOGY PAGE - Editorial Layout
// ============================================================

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { INDICATORS } from '@/lib/indicators';
import type { IndicatorConfig, QualityRating } from '@/types';

export function MethodologyPage() {
  return (
    <div className="max-w-[1920px] mx-auto px-8 py-10">
      
      {/* Header Section */}
      <div className="max-w-4xl mb-12">
        <h2 className="font-serif text-4xl font-bold tracking-tight text-foreground leading-tight mb-4">
          Metodologia de Análise
        </h2>
        <p className="font-serif text-lg italic text-muted-foreground leading-relaxed">
          Critérios de avaliação de risco de crédito baseados em dados prudenciais do BACEN. Identificar e mensurar a qualidade do emissor de forma sistemática é essencial para a construção de carteiras resilientes.
        </p>
      </div>

      {/* Grid Layout for Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Principles & Sources */}
        <div className="lg:col-span-4 flex flex-col gap-10">
          
          <section>
            <h3 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-border/60 pb-2 mb-4">
              Fonte de Dados & Boas Práticas
            </h3>
            <div className="bg-muted/30 p-5 border-l-2 border-foreground mb-6">
              <p className="font-sans text-xs text-foreground leading-relaxed mb-3">
                Integra dados reais do sistema <strong>IF.data do BACEN</strong>.
              </p>
              <a href="https://www3.bcb.gov.br/ifdata/" target="_blank" rel="noopener noreferrer" className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors underline decoration-border underline-offset-4">
                Acessar Portal IF.data ↗
              </a>
            </div>
            
            <ul className="flex flex-col gap-3 font-sans text-xs text-foreground/80 leading-relaxed">
              <li className="flex gap-3">
                <span className="text-muted-foreground">—</span>
                Coletar dados dos últimos 4 trimestres para tendência.
              </li>
              <li className="flex gap-3">
                <span className="text-muted-foreground">—</span>
                Utilizar o Código IF.data como chave de cruzamento.
              </li>
            </ul>
          </section>

        </div>

        {/* Right Column: Detailed Indicators */}
        <div className="lg:col-span-8">
          <h3 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-border/60 pb-2 mb-6">
            Dicionário de Indicadores & Critérios
          </h3>
          
          <div className="flex flex-col gap-4">
            {INDICATORS.map((ind) => (
              <IndicatorEditorialBlock key={ind.key} indicator={ind} />
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

function IndicatorEditorialBlock({ indicator }: { indicator: IndicatorConfig }) {
  const [isOpen, setIsOpen] = useState(false);

  const qualityLevels: { key: QualityRating; label: string }[] = [
    { key: 'muito_bom', label: 'Muito Bom' },
    { key: 'bom', label: 'Bom' },
    { key: 'moderado', label: 'Moderado' },
    { key: 'ruim', label: 'Ruim' },
  ];

  const colorMap: Record<QualityRating, string> = {
    muito_bom: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
    bom: 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
    moderado: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    ruim: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
  };

  return (
    <article className="group border border-border/50 bg-background transition-all hover:border-border/80">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors text-left"
      >
        <div className="flex items-baseline gap-4">
          <h4 className="font-serif text-lg font-bold text-foreground">
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
        <div className="px-5 pb-5 pt-2 border-t border-border/30 bg-muted/5">
          <p className="font-sans text-xs text-foreground/80 leading-relaxed mb-5 max-w-3xl">
            {indicator.description}
          </p>

          <div className="mb-5 font-sans text-[10px] text-muted-foreground tracking-wide">
            <span className="uppercase font-bold mr-2">Fonte BACEN:</span>
            <span className="font-serif italic">{indicator.source}</span>
            <span className="mx-2">—</span>
            <span>{indicator.sourceField}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4 border-t border-border/20">
            {qualityLevels.map(({ key, label }) => {
              const criteriaText = indicator.criteria[key];
              if (!criteriaText) return null;
              
              return (
                <div key={key} className="flex flex-col items-start gap-2">
                  <span className={`font-sans text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm ${colorMap[key]}`}>
                    {label}
                  </span>
                  <p className="font-serif text-xs text-foreground/70 leading-relaxed">
                    {criteriaText}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
