// ============================================================
// CONFIGURATION PANEL - Editorial Minimalist Style
// ============================================================

import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { INDICATORS } from '@/lib/indicators';
import type { IndicatorKey, KnockoutLevel } from '@/types';
import { AlertTriangle, RotateCcw, ChevronDown } from 'lucide-react';

interface ConfigPanelProps {
  weights: Record<IndicatorKey, number>;
  knockouts: Record<IndicatorKey, KnockoutLevel>;
  onWeightChange: (key: IndicatorKey, value: number) => void;
  onKnockoutChange: (key: IndicatorKey, level: KnockoutLevel) => void;
  onResetWeights: () => void;
  isOpen: boolean;
}

export function ConfigPanel({
  weights,
  knockouts,
  onWeightChange,
  onKnockoutChange,
  onResetWeights,
  isOpen,
}: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<'weights' | 'knockouts'>('weights');
  
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.5;

  if (!isOpen) return null;

  return (
    <div className="border-b border-border/60 bg-muted/20 animate-in slide-in-from-top-2 duration-300">
      <div className="mx-auto max-w-[1920px] px-8 py-8">
        
        {/* Navigation & Validation Row */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
          <div className="flex gap-6 border-b border-border/40 pb-2">
            <button
              onClick={() => setActiveTab('weights')}
              className={`font-sans text-xs font-bold uppercase tracking-widest transition-colors ${
                activeTab === 'weights' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pesos dos Indicadores
            </button>
            <button
              onClick={() => setActiveTab('knockouts')}
              className={`font-sans text-xs font-bold uppercase tracking-widest transition-colors ${
                activeTab === 'knockouts' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Filtros Eliminatórios
            </button>
          </div>

          {activeTab === 'weights' && (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <span className="font-serif text-2xl font-bold tracking-tighter">
                  Σ {totalWeight}%
                </span>
                {!isWeightValid && (
                  <div className="flex items-center gap-1.5 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-sans text-[10px] font-bold uppercase tracking-widest">Ajuste para 100%</span>
                  </div>
                )}
              </div>
              <button
                onClick={onResetWeights}
                className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Redefinir
              </button>
            </div>
          )}
        </div>

        {/* Weights Tab */}
        {activeTab === 'weights' && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-x-12 gap-y-10">
            {INDICATORS.map((ind) => (
              <div key={ind.key} className="flex flex-col gap-2">
                <div className="flex items-end justify-between">
                  <label className="font-sans text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {ind.shortLabel}
                  </label>
                  <span className="font-serif text-xl font-bold text-foreground">
                    {weights[ind.key]}<span className="text-sm text-muted-foreground ml-0.5">%</span>
                  </span>
                </div>
                <Slider
                  value={[weights[ind.key]]}
                  onValueChange={(v) => onWeightChange(ind.key, v[0])}
                  max={50}
                  min={0}
                  step={1}
                  className="py-2"
                />
                <p className="font-serif text-xs italic text-muted-foreground line-clamp-1" title={ind.label}>
                  {ind.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Knockouts Tab */}
        {activeTab === 'knockouts' && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
            {INDICATORS.map((ind) => (
              <KnockoutSelector
                key={ind.key}
                indicator={ind}
                value={knockouts[ind.key]}
                onChange={(level) => onKnockoutChange(ind.key, level)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Knockout Selector Sub-component
// ============================================================

function KnockoutSelector({
  indicator,
  value,
  onChange,
}: {
  indicator: { key: IndicatorKey; shortLabel: string; label: string };
  value: KnockoutLevel;
  onChange: (level: KnockoutLevel) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const options: { value: KnockoutLevel; label: string }[] = [
    { value: 'none', label: 'Desativado' },
    { value: 'ruim', label: 'Eliminar se Ruim' },
    { value: 'moderado', label: 'Eliminar se ≤ Moderado' },
  ];

  const selected = options.find(o => o.value === value)!;
  const isActive = value !== 'none';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between border-b-2 py-3 transition-colors ${
          isActive
            ? 'border-foreground text-foreground'
            : 'border-border text-muted-foreground hover:border-muted-foreground'
        }`}
      >
        <div className="flex flex-col items-start gap-1">
          <span className="font-sans text-xs font-bold uppercase tracking-widest">{indicator.shortLabel}</span>
          <span className="font-serif text-sm italic">{selected.label}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 bg-background border border-border shadow-xl">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
              className={`w-full text-left px-4 py-3 font-serif text-sm transition-colors hover:bg-muted ${
                value === opt.value ? 'font-bold bg-muted/50 text-foreground' : 'text-muted-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
