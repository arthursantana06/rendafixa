import { useState } from 'react';
import { Shield, CircleDollarSign } from 'lucide-react';

interface MatrixRow {
  assetClass: string;
  ultraConservador: string;
  conservador: string;
  moderado: string;
  arrojado: string;
  ultraArrojado: string;
}

const ALLOCATION_MATRIX: MatrixRow[] = [
  {
    assetClass: 'Criptoativos',
    ultraConservador: '0%',
    conservador: '0%',
    moderado: '0% - 2%',
    arrojado: '0% - 5%',
    ultraArrojado: '2% - 15%',
  },
  {
    assetClass: 'Inv. Internacional',
    ultraConservador: '0%',
    conservador: '0%',
    moderado: '0% - 10%',
    arrojado: '10% - 25%',
    ultraArrojado: '20% - 40%',
  },
  {
    assetClass: 'Ações / FIIs',
    ultraConservador: '0%',
    conservador: '0% - 5%',
    moderado: '10% - 30%',
    arrojado: '25% - 50%',
    ultraArrojado: '40% - 70%',
  },
  {
    assetClass: 'Ouro / Dólar (Hedge)',
    ultraConservador: '0%',
    conservador: '0%',
    moderado: '0% - 5%',
    arrojado: '5% - 10%',
    ultraArrojado: '5% - 15%',
  },
  {
    assetClass: 'Pré-fixado',
    ultraConservador: '0%',
    conservador: '0% - 10%',
    moderado: '5% - 20%',
    arrojado: '5% - 20%',
    ultraArrojado: '0% - 15%',
  },
  {
    assetClass: 'Inflação (IPCA)',
    ultraConservador: '0%',
    conservador: '0% - 20%',
    moderado: '10% - 40%',
    arrojado: '10% - 30%',
    ultraArrojado: '0% - 20%',
  },
  {
    assetClass: 'Pós-fixado (Crédito)',
    ultraConservador: '0% - 50%',
    conservador: '20% - 70%',
    moderado: '15% - 50%',
    arrojado: '5% - 30%',
    ultraArrojado: '0% - 20%',
  },
  {
    assetClass: 'Liquidez (D+0)',
    ultraConservador: '50% - 100%',
    conservador: '10% - 50%',
    moderado: '5% - 20%',
    arrojado: '5% - 15%',
    ultraArrojado: '5% - 10%',
  },
];

type ProfileKey = 'ultraConservador' | 'conservador' | 'moderado' | 'arrojado' | 'ultraArrojado';

const PROFILE_DETAILS: Record<ProfileKey, { label: string; color: string; bg: string; border: string; desc: string }> = {
  ultraConservador: {
    label: 'Ultra Conservador',
    color: 'text-[#0cb97e]',
    bg: 'bg-[#0cb97e]/10',
    border: 'border-[#0cb97e]/30',
    desc: 'Foco total em preservação de capital e liquidez imediata. Sem exposição à volatilidade.',
  },
  conservador: {
    label: 'Conservador',
    color: 'text-[#2ecc71]',
    bg: 'bg-[#2ecc71]/10',
    border: 'border-[#2ecc71]/30',
    desc: 'Prioridade para renda fixa com leve diversificação tática em inflação e pré-fixados.',
  },
  moderado: {
    label: 'Moderado',
    color: 'text-[#f39c12]',
    bg: 'bg-[#f39c12]/10',
    border: 'border-[#f39c12]/30',
    desc: 'Equilíbrio entre renda fixa e variável. Início de exposição a ativos reais e internacional.',
  },
  arrojado: {
    label: 'Arrojado',
    color: 'text-[#f97316]',
    bg: 'bg-[#f97316]/10',
    border: 'border-[#f97316]/30',
    desc: 'Busca por ganho de capital com maior exposição a ações, fundos imobiliários e câmbio.',
  },
  ultraArrojado: {
    label: 'Ultra Arrojado',
    color: 'text-[#ef4444]',
    bg: 'bg-[#ef4444]/10',
    border: 'border-[#ef4444]/30',
    desc: 'Alocação focada em ativos de risco e alto crescimento, incluindo cripto e mercados internacionais.',
  },
};

export function PerfisInvestidorPage() {
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileKey>('moderado');
  const [capitalStr, setCapitalStr] = useState('100000');
  
  const capital = parseFloat(capitalStr.replace(/\D/g, '')) || 0;

  const parseRange = (rangeStr: string): { minPct: number; maxPct: number } => {
    const cleaned = rangeStr.replace(/%/g, '').trim();
    if (cleaned.includes('-')) {
      const parts = cleaned.split('-');
      return {
        minPct: parseFloat(parts[0].trim()) / 100,
        maxPct: parseFloat(parts[1].trim()) / 100,
      };
    }
    const val = parseFloat(cleaned) / 100;
    return { minPct: val, maxPct: val };
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleCapitalInputChange = (val: string) => {
    const clean = val.replace(/\D/g, '');
    setCapitalStr(clean);
  };

  return (
    <div className="px-8 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Editorial Title Block */}
      <div className="border-b border-border/30 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-sans text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
            HFC Consultoria / Relação de Risco
          </span>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground leading-tight mb-2">
            Perfis de Investidor
          </h2>
          <p className="font-serif text-xs italic text-muted-foreground leading-relaxed">
            Matriz de alocação de ativos e limites regulatórios por enquadramento de perfil.
          </p>
        </div>

        <div className="flex items-center gap-2 border border-border/40 bg-muted/5 px-4 py-2 text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground">
          <Shield className="h-4.5 w-4.5 text-foreground/75" />
          <span>Políticas de Risco Ativas</span>
        </div>
      </div>

      {/* Main Container: Grid layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* Left Column: Asset Allocation Matrix Table (xl:col-span-8 or xl:col-span-12) */}
        <div className={`${isSimulatorOpen ? 'xl:col-span-8' : 'xl:col-span-12'} space-y-4 transition-all duration-300`}>
          <div className="border border-border/60 bg-card rounded-none overflow-hidden">
            <div className="border-b border-border/40 bg-muted/5 px-4 py-3 flex items-center justify-between">
              <h3 className="font-sans text-[11px] font-black uppercase tracking-widest text-foreground">
                Matriz de Alocação de Ativos (Limites Mandatórios %)
              </h3>
              <button
                onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
                className="px-3 py-1 bg-foreground/5 border border-foreground/15 hover:border-foreground/30 font-sans text-[9px] font-bold uppercase tracking-wider text-foreground hover:bg-foreground/10 transition-colors cursor-pointer"
              >
                {isSimulatorOpen ? 'Ocultar Calculadora' : 'Calculadora de Alocação'}
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/10">
                    <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                      Classe de Ativo
                    </th>
                    <th className="p-3 font-bold text-center border-l border-border/20 text-[#0cb97e] bg-[#0cb97e]/5 uppercase tracking-wider text-[10px] w-[16%]">
                      Ultra Conservador
                    </th>
                    <th className="p-3 font-bold text-center border-l border-border/20 text-[#2ecc71] bg-[#2ecc71]/5 uppercase tracking-wider text-[10px] w-[16%]">
                      Conservador
                    </th>
                    <th className="p-3 font-bold text-center border-l border-border/20 text-[#f39c12] bg-[#f39c12]/5 uppercase tracking-wider text-[10px] w-[16%]">
                      Moderado
                    </th>
                    <th className="p-3 font-bold text-center border-l border-border/20 text-[#f97316] bg-[#f97316]/5 uppercase tracking-wider text-[10px] w-[16%]">
                      Arrojado
                    </th>
                    <th className="p-3 font-bold text-center border-l border-border/20 text-[#ef4444] bg-[#ef4444]/5 uppercase tracking-wider text-[10px] w-[16%]">
                      Ultra Arrojado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {ALLOCATION_MATRIX.map((row, idx) => (
                    <tr 
                      key={idx} 
                      className="hover:bg-muted/5 transition-colors border-b border-border/10"
                    >
                      <td className="p-3 font-semibold text-foreground border-r border-border/10">
                        {row.assetClass}
                      </td>
                      <td className="p-3 text-center font-mono text-muted-foreground border-r border-border/10 bg-[#0cb97e]/[0.01]">
                        {row.ultraConservador}
                      </td>
                      <td className="p-3 text-center font-mono text-muted-foreground border-r border-border/10 bg-[#2ecc71]/[0.01]">
                        {row.conservador}
                      </td>
                      <td className="p-3 text-center font-mono text-foreground border-r border-border/10 bg-[#f39c12]/[0.01] font-semibold">
                        {row.moderado}
                      </td>
                      <td className="p-3 text-center font-mono text-muted-foreground border-r border-border/10 bg-[#f97316]/[0.01]">
                        {row.arrojado}
                      </td>
                      <td className="p-3 text-center font-mono text-muted-foreground bg-[#ef4444]/[0.01]">
                        {row.ultraArrojado}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Portfolio Range Calculator (xl:col-span-4) */}
        {isSimulatorOpen && (
          <div className="xl:col-span-4 space-y-6 animate-in slide-in-from-right duration-300">
            <div className="border border-border/60 bg-card p-5 space-y-5">
              <div className="border-b border-border/20 pb-3 flex items-center gap-2">
                <CircleDollarSign className="h-4.5 w-4.5 text-foreground" />
                <h3 className="font-sans text-[11px] font-black uppercase tracking-widest text-foreground">
                  Simulador de Faixas de Alocação
                </h3>
              </div>

              {/* Input Capital */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-muted-foreground block">
                  Capital Total para Alocação
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">
                    R$
                  </span>
                  <input
                    type="text"
                    value={capital > 0 ? capital.toLocaleString('pt-BR') : ''}
                    onChange={(e) => handleCapitalInputChange(e.target.value)}
                    placeholder="100.000"
                    className="w-full bg-muted/10 border border-border/80 px-3 py-2 pl-9 font-mono text-xs text-foreground focus:outline-none focus:border-foreground"
                  />
                </div>
              </div>

              {/* Profiles Selector */}
              <div className="space-y-2">
                <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-muted-foreground block">
                  Selecione o Perfil do Cliente
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(PROFILE_DETAILS) as ProfileKey[]).map((key) => {
                    const details = PROFILE_DETAILS[key];
                    const isSelected = selectedProfile === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setSelectedProfile(key)}
                        className={`px-2 py-2 border text-[9px] font-sans font-black uppercase tracking-wider text-center transition-all cursor-pointer ${
                          isSelected
                            ? `bg-foreground text-background border-foreground`
                            : 'border-border/50 bg-transparent text-muted-foreground hover:border-border hover:text-foreground'
                        }`}
                      >
                        {details.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Profile Info Box */}
              <div className={`p-3.5 border ${PROFILE_DETAILS[selectedProfile].border} ${PROFILE_DETAILS[selectedProfile].bg} space-y-1`}>
                <span className={`text-[9px] font-sans font-black uppercase tracking-wider ${PROFILE_DETAILS[selectedProfile].color}`}>
                  {PROFILE_DETAILS[selectedProfile].label}
                </span>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  {PROFILE_DETAILS[selectedProfile].desc}
                </p>
              </div>

              {/* Output table */}
              <div className="space-y-2 border-t border-border/20 pt-4">
                <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-muted-foreground block mb-2">
                  Limites Recomendados (R$)
                </span>
                
                <div className="space-y-2.5">
                  {ALLOCATION_MATRIX.map((row, idx) => {
                    const valStr = row[selectedProfile];
                    const { minPct, maxPct } = parseRange(valStr);
                    const minVal = minPct * capital;
                    const maxVal = maxPct * capital;
                    
                    return (
                      <div key={idx} className="flex justify-between items-baseline border-b border-border/10 pb-1.5 text-xs">
                        <div>
                          <span className="font-semibold text-foreground block">
                            {row.assetClass}
                          </span>
                          <span className="text-[9px] text-muted-foreground font-mono">
                            {valStr}
                          </span>
                        </div>
                        <div className="text-right font-mono font-semibold">
                          {minVal === maxVal ? (
                            <span className="text-foreground">{formatCurrency(minVal)}</span>
                          ) : (
                            <span className="text-foreground">
                              {formatCurrency(minVal)} - {formatCurrency(maxVal)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
