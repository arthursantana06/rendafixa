// ============================================================
// DATATABLE COMPONENT - Editorial Spreadsheet Layout
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { INDICATORS, getQualityColor, getQualityDotColor } from '@/lib/indicators';
import type { BankAnalysis, IndicatorKey, SortConfig, IndicatorConfig } from '@/types';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Check, X, Eye, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface DataTableProps {
  analyses: BankAnalysis[];
  indicators?: IndicatorConfig[];
  tempo: number;
  onTempoChange: (tempo: number) => void;
  onSelectBank?: (analysis: BankAnalysis) => void;
}

export function DataTable({ analyses, indicators = INDICATORS, tempo, onTempoChange, onSelectBank }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'score', direction: 'desc' });
  const [inputValue, setInputValue] = useState(tempo.toString());

  // Advanced Filters States
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'elegivel' | 'nao_viavel'>('all');
  const [ratingFilter, setRatingFilter] = useState<'all' | 'investment' | 'speculative' | 'sr'>('all');

  // Column Selector States
  const [isColumnSelectorOpen, setIsColumnSelectorOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Column Selector & Custom Indicators Config States (localStorage)
  const [indicatorsConfig, setIndicatorsConfig] = useState<string>(() => {
    return localStorage.getItem('table_indicators_config') || '';
  });

  // Automatically save to localStorage when changed
  useEffect(() => {
    localStorage.setItem('table_indicators_config', indicatorsConfig);
  }, [indicatorsConfig]);

  // Keep local input in sync if prop changes externally
  useEffect(() => {
    setInputValue(tempo.toString());
  }, [tempo]);

  // If no columns are stored in config, initialize with all indicators by default
  useEffect(() => {
    if (!indicatorsConfig.trim() && indicators.length > 0) {
      setIndicatorsConfig(indicators.map(ind => ind.shortLabel).join(', '));
    }
  }, [indicators, indicatorsConfig]);

  // Single robust source of truth for active indicators based on short labels list
  const activeIndicators = useMemo(() => {
    if (!indicatorsConfig.trim()) {
      return indicators;
    }

    const tokens = indicatorsConfig.split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const list: IndicatorConfig[] = [];
    tokens.forEach(tok => {
      const found = indicators.find(ind => 
        ind.shortLabel.toLowerCase() === tok || 
        ind.key.toLowerCase() === tok
      );
      if (found && !list.some(o => o.key === found.key)) {
        list.push(found);
      }
    });

    return list.length > 0 ? list : indicators;
  }, [indicators, indicatorsConfig]);

  // Derived inactive indicators list for the popover checklist
  const inactiveIndicators = useMemo(() => {
    return indicators.filter(ind => !activeIndicators.some(active => active.key === ind.key));
  }, [indicators, activeIndicators]);

  const handleToggleIndicator = (key: string, checked: boolean) => {
    let nextList = [...activeIndicators];
    if (checked) {
      const found = indicators.find(ind => ind.key === key);
      if (found && !nextList.some(item => item.key === key)) {
        nextList.push(found);
      }
    } else {
      nextList = nextList.filter(item => item.key !== key);
    }
    
    const labels = nextList.map(ind => ind.shortLabel);
    setIndicatorsConfig(labels.join(', '));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex === null || draggedIndex === targetIndex) return;
    const nextList = [...activeIndicators];
    const [draggedItem] = nextList.splice(draggedIndex, 1);
    nextList.splice(targetIndex, 0, draggedItem);
    
    const labels = nextList.map(ind => ind.shortLabel);
    setIndicatorsConfig(labels.join(', '));
    setDraggedIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const nextList = [...activeIndicators];
    const temp = nextList[index];
    nextList[index] = nextList[index - 1];
    nextList[index - 1] = temp;
    
    const labels = nextList.map(ind => ind.shortLabel);
    setIndicatorsConfig(labels.join(', '));
  };

  const handleMoveDown = (index: number) => {
    if (index === activeIndicators.length - 1) return;
    const nextList = [...activeIndicators];
    const temp = nextList[index];
    nextList[index] = nextList[index + 1];
    nextList[index + 1] = temp;
    
    const labels = nextList.map(ind => ind.shortLabel);
    setIndicatorsConfig(labels.join(', '));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valStr = e.target.value.replace(',', '.'); // Allow comma as decimal separator
    // Keep only numbers and a single dot
    valStr = valStr.replace(/[^0-9.]/g, '');
    const parts = valStr.split('.');
    if (parts.length > 2) {
      valStr = parts[0] + '.' + parts.slice(1).join('');
    }
    
    setInputValue(valStr);
    
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      onTempoChange(parsed);
    }
  };

  const filtered = useMemo(() => {
    let result = analyses;

    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        a => a.bank.name.toLowerCase().includes(q) || a.bank.cnpj.includes(q)
      );
    }

    // 2. Segment Filter
    if (segmentFilter !== 'all') {
      result = result.filter(a => a.bank.segmento === segmentFilter);
    }

    // 3. Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(a => a.status === statusFilter);
    }

    // 4. Rating Filter
    if (ratingFilter !== 'all') {
      result = result.filter(a => {
        const r = a.bank.rating || 'SR';
        if (ratingFilter === 'sr') return r === 'SR';
        const investmentRatings = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-'];
        const isInvestment = investmentRatings.includes(r);
        if (ratingFilter === 'investment') return isInvestment;
        if (ratingFilter === 'speculative') return !isInvestment && r !== 'SR';
        return true;
      });
    }

    return result;
  }, [analyses, searchQuery, segmentFilter, statusFilter, ratingFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (a.isKnockedOut && !b.isKnockedOut) return 1;
      if (!a.isKnockedOut && b.isKnockedOut) return -1;
      const dir = sortConfig.direction === 'asc' ? 1 : -1;
      switch (sortConfig.column) {
        case 'name':
          return dir * a.bank.name.localeCompare(b.bank.name);
        case 'score':
          return dir * (a.weightedScore - b.weightedScore);
        case 'status':
          return dir * (a.status === b.status ? 0 : a.status === 'elegivel' ? -1 : 1);
        default: {
          const key = sortConfig.column as IndicatorKey;
          const aVal = Number(a.indicators[key]?.value) || 0;
          const bVal = Number(b.indicators[key]?.value) || 0;
          return dir * (aVal - bVal);
        }
      }
    });
    return arr;
  }, [filtered, sortConfig]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Reset page to 1 on query or sort change to avoid out of bounds view
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortConfig]);

  const totalPages = Math.ceil(sorted.length / itemsPerPage);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sorted.slice(start, start + itemsPerPage);
  }, [sorted, currentPage]);

  const handleSort = (column: string) => {
    setSortConfig(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.column !== column) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-30" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3 text-foreground" />
      : <ArrowDown className="ml-1 h-3 w-3 text-foreground" />;
  };

  return (
    <div className="flex flex-col">
      {/* Search Bar, Filters, Columns and Time Filter */}
      <div className="px-8 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-border/10 bg-muted/5 relative">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-64 shrink-0">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="search-banks"
              placeholder="Buscar emissor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 bg-background border-border/60 font-sans text-xs rounded-none focus-visible:ring-1 focus-visible:ring-foreground transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 select-none">
            {/* Quick Sort Select */}
            <select
              value={`${sortConfig.column}-${sortConfig.direction}`}
              onChange={(e) => {
                const [col, dir] = e.target.value.split('-');
                setSortConfig({ column: col, direction: dir as 'asc' | 'desc' });
              }}
              className="bg-background border border-border/60 hover:border-foreground text-foreground font-sans text-[11px] px-2.5 outline-none rounded-none h-8 cursor-pointer transition-all focus-visible:ring-1 focus-visible:ring-foreground font-bold uppercase tracking-wider"
              title="Ordem da Tabela"
            >
              <option value="score-desc">Maior Score</option>
              <option value="score-asc">Menor Score</option>
              <option value="name-asc">Nome (A-Z)</option>
              <option value="name-desc">Nome (Z-A)</option>
              <option value="status-asc">Elegíveis Primeiro</option>
              <option value="status-desc">Inviáveis Primeiro</option>
            </select>

            {/* Inline Segment Filter Dropdown */}
            <select
              value={segmentFilter}
              onChange={(e) => setSegmentFilter(e.target.value as any)}
              className={`bg-background border text-foreground font-sans text-[11px] px-2 outline-none rounded-none h-8 cursor-pointer transition-all focus-visible:ring-1 focus-visible:ring-foreground font-bold uppercase tracking-wider ${
                segmentFilter !== 'all' ? 'border-foreground border-2 bg-foreground/5' : 'border-border/60 hover:border-foreground'
              }`}
              title="Segmento Prudencial"
            >
              <option value="all">SEG: Todos</option>
              <option value="S1">SEG: S1</option>
              <option value="S2">SEG: S2</option>
              <option value="S3">SEG: S3</option>
              <option value="S4">SEG: S4</option>
              <option value="S5">SEG: S5</option>
            </select>

            {/* Inline Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className={`bg-background border text-foreground font-sans text-[11px] px-2 outline-none rounded-none h-8 cursor-pointer transition-all focus-visible:ring-1 focus-visible:ring-foreground font-bold uppercase tracking-wider ${
                statusFilter !== 'all' ? 'border-foreground border-2 bg-foreground/5' : 'border-border/60 hover:border-foreground'
              }`}
              title="Status de Risco"
            >
              <option value="all">RISCO: Todos</option>
              <option value="elegivel">RISCO: Elegível</option>
              <option value="nao_viavel">RISCO: Inviável</option>
            </select>

            {/* Inline Rating Filter Dropdown */}
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value as any)}
              className={`bg-background border text-foreground font-sans text-[11px] px-2 outline-none rounded-none h-8 cursor-pointer transition-all focus-visible:ring-1 focus-visible:ring-foreground font-bold uppercase tracking-wider ${
                ratingFilter !== 'all' ? 'border-foreground border-2 bg-foreground/5' : 'border-border/60 hover:border-foreground'
              }`}
              title="Grau de Rating"
            >
              <option value="all">RATING: Todos</option>
              <option value="investment">RATING: Grau Inv.</option>
              <option value="speculative">RATING: Especulativo</option>
              <option value="sr">RATING: Sem Rating</option>
            </select>

            {/* Dynamic Column Selector Button */}
            <button
              onClick={() => setIsColumnSelectorOpen(!isColumnSelectorOpen)}
              className={`flex items-center justify-center gap-1.5 h-8 px-3 font-sans text-[9px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                isColumnSelectorOpen
                  ? 'bg-foreground text-background border-foreground hover:bg-foreground/90'
                  : 'bg-background text-foreground border-border/60 hover:border-foreground hover:bg-muted/10'
              }`}
              title="Exibir/Ocultar Indicadores"
            >
              <Eye className="h-3 w-3" />
              <span>Colunas</span>
            </button>
          </div>
        </div>

        {/* Premium Columns Selector & Drag-and-Drop Reordering Popover */}
        {isColumnSelectorOpen && (
          <div className="absolute left-8 xl:left-auto xl:right-40 top-12 z-50 w-80 border border-foreground bg-background shadow-2xl p-4 flex flex-col gap-3 animate-in fade-in duration-200 rounded-none select-none">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/40">
              <span className="font-sans text-[10px] font-black uppercase tracking-widest text-foreground">
                Configurar Colunas
              </span>
              <button 
                onClick={() => setIsColumnSelectorOpen(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer text-[9px] font-black uppercase tracking-widest font-sans hover:underline"
              >
                Fechar
              </button>
            </div>

            {/* Active Columns (Draggable & Reorderable List) */}
            <div className="flex flex-col gap-1.5">
              <span className="font-sans text-[8px] font-bold text-muted-foreground uppercase tracking-widest block px-1.5">
                Colunas Ativas ({activeIndicators.length}) — Segure e Arraste ou Use as Setas
              </span>
              <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1 scrollbar-thin border border-border/10 bg-muted/5 p-1">
                {activeIndicators.map((ind, idx) => (
                  <div 
                    key={ind.key}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={() => handleDrop(idx)}
                    className={`flex items-center justify-between font-sans text-xs bg-background border border-border/40 hover:border-foreground/40 p-1.5 transition-all cursor-grab active:cursor-grabbing ${
                      draggedIndex === idx ? 'opacity-40 border-dashed border-foreground' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Drag Handle Icon */}
                      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 cursor-grab" />
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => handleToggleIndicator(ind.key, false)}
                        className="h-3.5 w-3.5 border border-border bg-transparent accent-foreground cursor-pointer rounded-none shrink-0"
                      />
                      <span className="font-semibold text-foreground/90 truncate pr-1" title={ind.label}>
                        {ind.shortLabel}
                      </span>
                      <span className="text-[9.5px] text-muted-foreground truncate" title={ind.label}>
                        {ind.label}
                      </span>
                    </div>

                    {/* Setas (Move Up / Down) */}
                    <div className="flex items-center gap-0.5 shrink-0 pl-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveUp(idx);
                        }}
                        disabled={idx === 0}
                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all cursor-pointer"
                        title="Mover para cima"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveDown(idx);
                        }}
                        disabled={idx === activeIndicators.length - 1}
                        className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 transition-all cursor-pointer"
                        title="Mover para baixo"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {activeIndicators.length === 0 && (
                  <span className="text-[10px] text-muted-foreground italic text-center py-4">Nenhuma coluna ativa</span>
                )}
              </div>
            </div>

            {/* Inactive Columns (Checklist to Add) */}
            {inactiveIndicators.length > 0 && (
              <div className="flex flex-col gap-1.5 border-t border-border/20 pt-2.5">
                <span className="font-sans text-[8px] font-bold text-muted-foreground uppercase tracking-widest block px-1.5">
                  Colunas Ocultas ({inactiveIndicators.length}) — Clique para Adicionar
                </span>
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto pr-1 scrollbar-thin p-1">
                  {inactiveIndicators.map(ind => (
                    <label 
                      key={ind.key} 
                      className="flex items-center gap-2.5 font-sans text-xs text-foreground cursor-pointer hover:bg-muted/40 p-1.5 border border-transparent hover:border-border/30 transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => handleToggleIndicator(ind.key, true)}
                        className="h-3.5 w-3.5 border border-border bg-transparent accent-foreground cursor-pointer rounded-none"
                      />
                      <span className="font-semibold text-muted-foreground">{ind.shortLabel}</span>
                      <span className="text-[10px] text-muted-foreground/75 truncate">{ind.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Premium Dynamic Time Filter Input */}
        <div className="flex items-center gap-2 shrink-0 select-none">
          <span className="font-sans text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            Período (Anos):
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Ex: 1.5"
            value={inputValue}
            onChange={handleInputChange}
            className="bg-background border border-border/60 hover:border-foreground focus:border-foreground text-foreground font-sans text-xs px-2 py-1 outline-none font-bold tracking-wider rounded-none h-8 w-16 text-center transition-all focus-visible:ring-1 focus-visible:ring-foreground"
          />
        </div>
      </div>


      {/* Spreadsheet Container */}
      <div className="overflow-x-auto px-8 pb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-foreground">
              <th className="sticky left-0 z-10 bg-background py-4 pr-4">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  Emissor <SortIcon column="name" />
                </button>
              </th>
              <th className="py-4 px-3">
                <button
                  onClick={() => handleSort('score')}
                  className="flex items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  Score <SortIcon column="score" />
                </button>
              </th>
              <th className="py-4 px-3">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  Status <SortIcon column="status" />
                </button>
              </th>
              {activeIndicators.map((ind) => (
                <th key={ind.key} className="py-4 px-3">
                  <button
                    onClick={() => handleSort(ind.key)}
                    className="flex items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                    title={ind.label}
                  >
                    {ind.shortLabel} <SortIcon column={ind.key} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((analysis) => (
              <BankRow 
                key={analysis.bank.id} 
                analysis={analysis} 
                indicatorsList={activeIndicators} 
                onClick={() => onSelectBank?.(analysis)}
              />
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="py-12 text-center text-muted-foreground font-serif italic">
            Nenhum emissor correspondente à busca.
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6 border-t border-border/40 bg-muted/5 mt-6">
            <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Mostrando {Math.min(sorted.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(sorted.length, currentPage * itemsPerPage)} de {sorted.length} emissores
            </span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setCurrentPage(prev => Math.max(1, prev - 1));
                  document.getElementById('search-banks')?.scrollIntoView({ behavior: 'smooth' });
                }}
                disabled={currentPage === 1}
                className="font-sans text-[10px] font-bold uppercase tracking-widest px-4 py-2 border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-background transition-colors cursor-pointer"
              >
                Anterior
              </button>
              <span className="font-serif text-sm italic text-muted-foreground">
                Página <span className="font-sans text-xs font-bold not-italic text-foreground">{currentPage}</span> de <span className="font-sans text-xs font-bold not-italic text-foreground">{totalPages}</span>
              </span>
              <button
                onClick={() => {
                  setCurrentPage(prev => Math.min(totalPages, prev + 1));
                  document.getElementById('search-banks')?.scrollIntoView({ behavior: 'smooth' });
                }}
                disabled={currentPage === totalPages}
                className="font-sans text-[10px] font-bold uppercase tracking-widest px-4 py-2 border border-border bg-background text-foreground hover:bg-muted disabled:opacity-40 disabled:hover:bg-background transition-colors cursor-pointer"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Row Sub-component
// ============================================================

function BankRow({ 
  analysis, 
  indicatorsList, 
  onClick 
}: { 
  analysis: BankAnalysis; 
  indicatorsList: IndicatorConfig[]; 
  onClick: () => void; 
}) {
  const { bank, indicators: analysisIndicators, weightedScore, isKnockedOut, knockoutReasons, status } = analysis;

  return (
    <tr 
      onClick={onClick}
      className={`border-b border-border/40 transition-colors hover:bg-muted/30 cursor-pointer ${
        isKnockedOut ? 'opacity-40 grayscale hover:opacity-80 hover:grayscale-0' : ''
      }`}
    >
      {/* Emissor */}
      <td className={`sticky left-0 z-10 py-4 pr-4 ${isKnockedOut ? 'bg-background' : 'bg-background group-hover:bg-muted/30'}`}>
        <div className="flex flex-col">
          <span className="font-serif text-base font-bold text-foreground leading-tight max-w-[200px] truncate" title={bank.name}>
            {bank.name}
          </span>
          <span className="font-sans text-[10px] tracking-widest text-muted-foreground mt-0.5">
            {bank.cnpj}
          </span>
        </div>
      </td>

      {/* Score */}
      <td className="py-4 px-3">
        <div className="flex flex-col">
          <span className="font-serif text-xl font-black text-foreground">
            {isKnockedOut ? 'N/A' : weightedScore.toFixed(1)}
          </span>
          {bank.rating && (
            <span className="font-sans text-[10px] tracking-wider text-muted-foreground uppercase font-bold mt-0.5 whitespace-nowrap">
              Rating: {bank.rating}
            </span>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="py-4 px-3">
        {status === 'elegivel' ? (
          <span className="inline-flex items-center gap-1 font-sans text-[10px] font-bold uppercase tracking-widest text-foreground">
            <Check className="h-3 w-3" /> Elegível
          </span>
        ) : (
          <div className="flex flex-col">
            <span className="inline-flex items-center gap-1 font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground line-through">
              <X className="h-3 w-3" /> Inviável
            </span>
            <span className="font-sans text-[9px] text-destructive tracking-widest mt-0.5 max-w-[80px] leading-tight" title={knockoutReasons.join(', ')}>
              {knockoutReasons[0]}
            </span>
          </div>
        )}
      </td>

      {/* Indicators */}
      {indicatorsList.map((ind) => {
        const result = analysisIndicators[ind.key] || { value: 0, rating: 'moderado', score: 0, displayValue: 'N/I' };
        return (
          <td key={ind.key} className="py-4 px-3">
            <div className="flex items-center gap-1.5">
              <span 
                className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${
                  isKnockedOut ? 'bg-muted-foreground/20' : getQualityDotColor(result.rating)
                }`}
                title={result.rating.replace('_', ' ')}
              />
              <span className={`font-sans text-sm tracking-tight ${
                isKnockedOut ? 'text-muted-foreground/50' : getQualityColor(result.rating)
              }`}>
                {result.displayValue}
              </span>
            </div>
          </td>
        );
      })}

    </tr>
  );
}
