// ============================================================
// HEADER COMPONENT - Editorial Style (Two-Tier Navigation)
// ============================================================

import { Building2, BookOpen, Database, Calculator } from 'lucide-react';
import type { MainTab, SubTab } from '@/types';

interface HeaderProps {
  activeMainTab: MainTab;
  activeSubTab: SubTab;
  onMainTabChange: (tab: MainTab) => void;
  onSubTabChange: (tab: SubTab) => void;
}

const MAIN_TABS: { id: MainTab; label: string; enabled: boolean }[] = [
  { id: 'emissor', label: 'Emissor', enabled: true },
];

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'analise', label: 'Tabela de Emissores', icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: 'metodologia', label: 'Metodologia', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'extracao', label: 'Dados', icon: <Database className="h-3.5 w-3.5" /> },
];

export function Header({ 
  activeMainTab, 
  activeSubTab, 
  onMainTabChange, 
  onSubTabChange 
}: HeaderProps) {
  return (
    <header className="border-b border-border/60 bg-transparent shrink-0">
      <div className="mx-auto max-w-[1920px]">
        {/* Tier 1: Brand Logo + Primary Main Menu ("Menu Maior") */}
        <div className="flex h-12 items-center justify-between px-8 border-b border-border/30">
          <div className="flex items-center gap-4">
            <img src="/logohfc.png" alt="HFC Consultoria" className="h-9 w-auto object-contain" />
            <span className="h-4 w-px bg-border/60" />
            <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Módulo de Renda Fixa
            </span>
          </div>

          {/* Primary Navigation - Modules Menu */}
          <div className="flex gap-4 h-full items-center">
            {MAIN_TABS.map((tab) => {
              const isActive = activeMainTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onMainTabChange(tab.id)}
                  className={`relative px-3 py-1 font-sans text-xs font-bold uppercase tracking-widest transition-all duration-200 ${
                    isActive
                      ? 'text-foreground font-black border-b-2 border-foreground'
                      : 'text-muted-foreground hover:text-foreground border-b-2 border-transparent hover:border-muted-foreground/30'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tier 2: Secondary Navigation - Local Sub-tabs (Tabela de Emissores, Metodologia, Dados) */}
        {activeMainTab === 'emissor' && (
          <div className="flex h-10 items-center justify-between px-8 bg-muted/5">
            <div className="flex gap-8 h-full">
              {SUB_TABS.map((tab) => {
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onSubTabChange(tab.id)}
                    className={`relative h-full flex items-center gap-2 px-1 font-sans text-[11px] font-bold uppercase tracking-widest transition-colors ${
                      isActive
                        ? 'text-foreground font-black'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
