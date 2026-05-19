// ============================================================
// DATATABLE COMPONENT - Editorial Spreadsheet Layout
// ============================================================

import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { INDICATORS, getQualityColor } from '@/lib/indicators';
import type { BankAnalysis, IndicatorKey, SortConfig } from '@/types';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Check, X } from 'lucide-react';

interface DataTableProps {
  analyses: BankAnalysis[];
}

export function DataTable({ analyses }: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'score', direction: 'desc' });

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
          const aScore = a.indicators[key]?.score ?? 0;
          const bScore = b.indicators[key]?.score ?? 0;
          return dir * (aScore - bScore);
        }
      }
    });
    return arr;
  }, [filtered, sortConfig]);

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
      {/* Search Bar */}
      <div className="px-8 py-6">
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
              {INDICATORS.map((ind) => (
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
            {sorted.map((analysis) => (
              <BankRow key={analysis.bank.id} analysis={analysis} />
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="py-12 text-center text-muted-foreground font-serif italic">
            Nenhum emissor correspondente à busca.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Row Sub-component
// ============================================================

function BankRow({ analysis }: { analysis: BankAnalysis }) {
  const { bank, indicators, weightedScore, isKnockedOut, knockoutReasons, status } = analysis;

  return (
    <tr className={`border-b border-border/40 transition-colors hover:bg-muted/30 ${
      isKnockedOut ? 'opacity-40 grayscale hover:opacity-80 hover:grayscale-0' : ''
    }`}>
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
        <span className="font-serif text-xl font-black text-foreground">
          {isKnockedOut ? 'N/A' : weightedScore.toFixed(1)}
        </span>
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
      {INDICATORS.map((ind) => {
        const result = indicators[ind.key];
        return (
          <td key={ind.key} className="py-4 px-3">
            <span className={`font-sans text-sm tracking-tight ${
              isKnockedOut ? 'text-muted-foreground/50' : getQualityColor(result.rating)
            }`}>
              {result.displayValue}
            </span>
          </td>
        );
      })}
    </tr>
  );
}
