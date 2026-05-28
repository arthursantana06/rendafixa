// ============================================================
// DATATABLE COMPONENT - Editorial Spreadsheet Layout
// ============================================================

import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { INDICATORS, getQualityColor, getQualityDotColor } from '@/lib/indicators';
import type { BankAnalysis, IndicatorKey, SortConfig, IndicatorConfig } from '@/types';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Check, X } from 'lucide-react';

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

  // Keep local input in sync if prop changes externally
  useEffect(() => {
    setInputValue(tempo.toString());
  }, [tempo]);

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
    if (!searchQuery.trim()) return analyses;
    const q = searchQuery.toLowerCase();
    return analyses.filter(
      a => a.bank.name.toLowerCase().includes(q) || a.bank.cnpj.includes(q)
    );
  }, [analyses, searchQuery]);

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
      {/* Search Bar and Time Filter */}
      <div className="px-8 py-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-border/10">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search-banks"
            placeholder="Buscar por nome do emissor ou CNPJ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-transparent border-border/60 font-sans text-sm rounded-none focus-visible:ring-1 focus-visible:ring-foreground transition-all"
          />
        </div>

        {/* Premium Dynamic Time Filter Input */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-sans text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Período (Anos):
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Ex: 1.5"
            value={inputValue}
            onChange={handleInputChange}
            className="bg-transparent border border-border/60 bg-background hover:border-foreground focus:border-foreground text-foreground font-sans text-xs px-3 py-2 outline-none font-bold tracking-wider rounded-none h-10 w-24 text-center transition-all focus-visible:ring-1 focus-visible:ring-foreground"
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
              {indicators.map((ind) => (
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
                indicatorsList={indicators} 
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
