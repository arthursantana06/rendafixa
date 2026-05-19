// ============================================================
// HEADER COMPONENT - Editorial Style
// ============================================================

import { Building2, BookOpen, Database } from 'lucide-react';
import type { MainTab, SubTab } from '@/types';

interface HeaderProps {
  bankCount: number;
  eligibleCount: number;
  activeMainTab: MainTab;
  activeSubTab: SubTab;
  onMainTabChange: (tab: MainTab) => void;
  onSubTabChange: (tab: SubTab) => void;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
}

const MAIN_TABS: { id: MainTab; label: string }[] = [
  { id: 'emissor', label: 'Emissor' },
];

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'analise', label: 'Tabela de Emissores', icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: 'metodologia', label: 'Metodologia', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'extracao', label: 'Extração de Dados', icon: <Database className="h-3.5 w-3.5" /> },
];

export function Header({ 
  bankCount, 
  eligibleCount, 
  activeMainTab, 
  activeSubTab, 
  onMainTabChange, 
  onSubTabChange, 
  onTogglePanel, 
  isPanelOpen 
}: HeaderProps) {
  return (
    <header className="border-b border-border/60 bg-transparent">
      <div className="mx-auto max-w-[1920px]">
        {/* Top row: Brand + Main Tabs */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-border/30">
          <div className="flex items-baseline gap-6">
            <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground">
              Renda Fixa
            </h1>
            
            {/* Main Tabs Navigation */}
            <nav className="hidden md:flex items-center gap-6 ml-8">
              {MAIN_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => onMainTabChange(tab.id)}
                  className={`font-sans text-xs font-bold uppercase tracking-widest transition-colors ${
                    activeMainTab === tab.id ? 'text-foreground border-b-2 border-foreground pb-1' : 'text-muted-foreground hover:text-foreground pb-1'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-8">
            {/* Center: Stats (Only show when in analysis) */}
            {activeSubTab === 'analise' && (
              <div className="hidden md:flex items-center gap-8 mr-8">
                <div className="flex flex-col items-end">
                  <p className="font-sans text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Cobertura</p>
                  <p className="font-serif text-xl font-bold text-foreground">{bankCount}</p>
                </div>
                <div className="h-8 w-px bg-border/60" />
                <div className="flex flex-col items-start">
                  <p className="font-sans text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Elegíveis</p>
                  <p className="font-serif text-xl font-bold text-foreground">{eligibleCount}</p>
                </div>
              </div>
            )}

            <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              HFC Consultoria
            </span>
          </div>
        </div>

        {/* Sub Tab Bar & Config Toggle */}
        <div className="flex items-center justify-between px-8 pt-4">
          <div className="flex items-center gap-6">
            {SUB_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onSubTabChange(tab.id)}
                className={`relative flex items-center gap-2 pb-4 text-xs font-sans font-bold uppercase tracking-widest transition-all ${
                  activeSubTab === tab.id
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
                {activeSubTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                )}
              </button>
            ))}
          </div>

          {/* Right: Config toggle */}
          {activeSubTab === 'analise' && (
            <button
              onClick={onTogglePanel}
              className="flex items-center gap-2 px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-widest text-foreground border border-foreground/20 hover:bg-foreground/5 transition-all mb-3"
            >
              <span className={`transition-transform duration-300 ${isPanelOpen ? 'rotate-180' : ''}`}>
                +
              </span>
              Configurar Pesos
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
