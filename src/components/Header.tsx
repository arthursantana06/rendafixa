// ============================================================
// HEADER COMPONENT - Editorial Style (Two-Tier Navigation)
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { Building2, BookOpen, Database, Sliders, ChevronDown, Check } from 'lucide-react';
import type { MainTab, SubTab, AppModule } from '@/types';

interface HeaderProps {
  activeModule: AppModule;
  onModuleChange: (module: AppModule) => void;
  activeMainTab: MainTab;
  activeSubTab: SubTab;
  onMainTabChange: (tab: MainTab) => void;
  onSubTabChange: (tab: SubTab) => void;
}

const MAIN_TABS: { id: MainTab; label: string; enabled: boolean }[] = [
  { id: 'emissor', label: 'Emissor', enabled: true },
  { id: 'indexador', label: 'Indexador', enabled: true },
];

const SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'analise', label: 'Tabela de Emissores', icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: 'metodologia', label: 'Metodologia', icon: <BookOpen className="h-3.5 w-3.5" /> },
  { id: 'extracao', label: 'Dados', icon: <Database className="h-3.5 w-3.5" /> },
];

const INDEXADOR_SUB_TABS: { id: SubTab; label: string; icon: React.ReactNode }[] = [
  { id: 'analise', label: 'Otimização por Indexador', icon: <Sliders className="h-3.5 w-3.5" /> },
  { id: 'extracao', label: 'Dados Macroeconômicos', icon: <Database className="h-3.5 w-3.5" /> },
];


export function Header({ 
  activeModule,
  onModuleChange,
  activeMainTab, 
  activeSubTab, 
  onMainTabChange, 
  onSubTabChange 
}: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getModuleLabel = () => {
    switch (activeModule) {
      case 'painel':
        return 'Painel';
      case 'renda_fixa':
        return 'Módulo de Renda Fixa';
      case 'renda_variavel':
        return 'Módulo de Renda Variável';
      default:
        return '';
    }
  };

  return (
    <header className="border-b border-border/60 bg-transparent shrink-0">
      <div className="mx-auto max-w-[1920px]">
        {/* Tier 1: Brand Logo + Primary Main Menu ("Menu Maior") */}
        <div className="flex h-12 items-center justify-between px-8 border-b border-border/30">
          <div className="flex items-center gap-4 relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-3 hover:opacity-85 transition-all focus:outline-none cursor-pointer group"
              aria-label="Alternar módulos"
            >
              <img src="/logohfc.png" alt="HFC Consultoria" className="h-8 w-auto object-contain transition-transform group-hover:scale-[1.02]" />
              <span className="h-4 w-px bg-border/60" />
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                  {getModuleLabel()}
                </span>
                <ChevronDown className={`h-3 w-3 text-muted-foreground/60 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180 text-foreground' : ''}`} />
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute left-0 top-[100%] mt-2 w-64 bg-card border border-border shadow-md z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-4 py-1.5 border-b border-border/20 mb-1">
                  <span className="font-sans text-[9px] font-black uppercase tracking-widest text-muted-foreground/75 block">
                    Navegação do Sistema
                  </span>
                </div>
                
                <button
                  onClick={() => {
                    onModuleChange('painel');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left font-sans text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-muted/10 cursor-pointer ${
                    activeModule === 'painel' ? 'text-foreground bg-muted/5' : 'text-muted-foreground'
                  }`}
                >
                  <span>Painel</span>
                  {activeModule === 'painel' && <Check className="h-3.5 w-3.5 text-foreground" />}
                </button>

                <button
                  onClick={() => {
                    onModuleChange('renda_fixa');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left font-sans text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-muted/10 cursor-pointer ${
                    activeModule === 'renda_fixa' ? 'text-foreground bg-muted/5' : 'text-muted-foreground'
                  }`}
                >
                  <span>Módulo de Renda Fixa</span>
                  {activeModule === 'renda_fixa' && <Check className="h-3.5 w-3.5 text-foreground" />}
                </button>

                <button
                  onClick={() => {
                    onModuleChange('renda_variavel');
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left font-sans text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-muted/10 cursor-pointer ${
                    activeModule === 'renda_variavel' ? 'text-foreground bg-muted/5' : 'text-muted-foreground'
                  }`}
                >
                  <span>Módulo de Renda Variável</span>
                  {activeModule === 'renda_variavel' && <Check className="h-3.5 w-3.5 text-foreground" />}
                </button>
              </div>
            )}
          </div>

          {/* Primary Navigation - Modules Menu (Renda Fixa only) */}
          <div className="flex gap-4 h-full items-center">
            {activeModule === 'renda_fixa' && MAIN_TABS.map((tab) => {
              const isActive = activeMainTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onMainTabChange(tab.id)}
                  className={`relative px-3 py-1 font-sans text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer ${
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
        {activeModule === 'renda_fixa' && activeMainTab === 'emissor' && (
          <div className="flex h-10 items-center justify-between px-8 bg-muted/5">
            <div className="flex gap-8 h-full">
              {SUB_TABS.map((tab) => {
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onSubTabChange(tab.id)}
                    className={`relative h-full flex items-center gap-2 px-1 font-sans text-[11px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${
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

        {activeModule === 'renda_fixa' && activeMainTab === 'indexador' && (
          <div className="flex h-10 items-center justify-between px-8 bg-muted/5">
            <div className="flex gap-8 h-full">
              {INDEXADOR_SUB_TABS.map((tab) => {
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onSubTabChange(tab.id)}
                    className={`relative h-full flex items-center gap-2 px-1 font-sans text-[11px] font-bold uppercase tracking-widest transition-colors cursor-pointer ${
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
