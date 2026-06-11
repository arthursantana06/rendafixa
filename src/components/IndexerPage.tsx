import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { MacroScenario } from '@/types';
import { 
  Sliders,
  AlertCircle
} from 'lucide-react';
import { evaluateFormula } from '@/lib/formulaParser';

// Default Limits per Profile
const PROFILE_LIMITS = {
  conservador: {
    cdi: { min: 70, max: 100 },
    ipca: { min: 0, max: 30 },
    pre: { min: 0, max: 0 }
  },
  moderado: {
    cdi: { min: 40, max: 90 },
    ipca: { min: 10, max: 50 },
    pre: { min: 0, max: 20 }
  },
  arrojado: {
    cdi: { min: 10, max: 70 },
    ipca: { min: 20, max: 70 },
    pre: { min: 0, max: 40 }
  }
};

// Default Structural Preset matrix
const STRUCTURAL_PRESETS: Record<string, Record<string, { cdi: number; ipca: number; pre: number }>> = {
  conservador: {
    curto: { cdi: 100, ipca: 0, pre: 0 },
    medio: { cdi: 80, ipca: 20, pre: 0 },
    longo: { cdi: 60, ipca: 40, pre: 0 },
  },
  moderado: {
    curto: { cdi: 80, ipca: 15, pre: 5 },
    medio: { cdi: 60, ipca: 30, pre: 10 },
    longo: { cdi: 40, ipca: 45, pre: 15 },
  },
  arrojado: {
    curto: { cdi: 60, ipca: 30, pre: 10 },
    medio: { cdi: 40, ipca: 40, pre: 20 },
    longo: { cdi: 20, ipca: 50, pre: 30 },
  }
};

// Helper function to detect and convert values to fractions (e.g. 89.0 -> 0.89, 0.89 -> 0.89)
function toFraction(val: number) {
  if (Math.abs(val) > 1.0) {
    return val / 100;
  }
  return val;
}

export function IndexerPage() {
  const [isLoading, setIsLoading] = useState(true);

  // Active Macro Data
  const [macroData, setMacroData] = useState<MacroScenario | null>(null);

  // Profile and Horizon states (defaults, read from localStorage fallback)
  const [profile, setProfile] = useState<'conservador' | 'moderado' | 'arrojado'>(() => {
    const saved = localStorage.getItem('hfc_profile');
    return (saved as any) || 'moderado';
  });
  const limits = PROFILE_LIMITS[profile];
  const [horizon, setHorizon] = useState<'curto' | 'medio' | 'longo'>(() => {
    const saved = localStorage.getItem('hfc_horizon');
    return (saved as any) || 'medio';
  });

  // Expectativa Própria
  const [expectativaPropria, setExpectativaPropria] = useState(() => {
    const saved = localStorage.getItem('hfc_expectativa_propria');
    return saved ? Number(saved) : 10.00;
  });
  const [expectativaPropriaStr, setExpectativaPropriaStr] = useState(() => {
    return localStorage.getItem('hfc_expectativa_propria') || "10.00";
  });
  const [saveExpectationSuccess, setSaveExpectationSuccess] = useState(false);

  // Customizable formulas for each indexer box
  const [formulaCDI, setFormulaCDI] = useState(() => {
    return localStorage.getItem('hfc_formula_cdi') ?? "60";
  });
  const [formulaIPCA, setFormulaIPCA] = useState(() => {
    return localStorage.getItem('hfc_formula_ipca') ?? "30";
  });
  const [formulaPRE, setFormulaPRE] = useState(() => {
    return localStorage.getItem('hfc_formula_pre') ?? "J_atual - T_hist";
  });

  // Fetch active macroeconomic data from Supabase
  const fetchActiveMacroData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cenarios_macro')
        .select('*')
        .eq('key', 'ativo')
        .single();

      if (error) throw error;

      if (data) {
        setMacroData({
          key: data.key,
          label: data.label,
          juros_atuais: Number(data.juros_atuais),
          expectativa_juros_bacen_2029: Number(data.expectativa_juros_bacen_2029),
          juros_futuros_d1f29: Number(data.juros_futuros_d1f29),
          valor_taxa_prefixada_2029: Number(data.valor_taxa_prefixada_2029),
          taxa_media_historica: Number(data.taxa_media_historica)
        });
      }
    } catch (e) {
      console.error('Error fetching active macro data:', e);
      setMacroData({
        key: 'ativo',
        label: 'Cenário Ativo (Atual)',
        juros_atuais: 10.50,
        expectativa_juros_bacen_2029: 9.75,
        juros_futuros_d1f29: 11.20,
        valor_taxa_prefixada_2029: 11.50,
        taxa_media_historica: 8.50
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveMacroData();
  }, [fetchActiveMacroData]);

  // Update draft states for Expectativa Própria
  const handleExpectationChange = (val: number | string) => {
    if (typeof val === 'number') {
      const rounded = Math.round(val * 100) / 100;
      setExpectativaPropria(rounded);
      setExpectativaPropriaStr(rounded.toString());
    } else {
      setExpectativaPropriaStr(val);
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        const rounded = Math.round(parsed * 100) / 100;
        setExpectativaPropria(rounded);
      }
    }
  };

  // Explicit save action
  const handleSaveExpectation = () => {
    localStorage.setItem('hfc_expectativa_propria', String(expectativaPropria));
    setSaveExpectationSuccess(true);
    setTimeout(() => setSaveExpectationSuccess(false), 2000);
  };

  // Derived Neutral Base weights based on Profile & Horizon
  const baseWeights = useMemo(() => {
    const preset = STRUCTURAL_PRESETS[profile]?.[horizon];
    return preset || { cdi: 60, ipca: 30, pre: 10 };
  }, [profile, horizon]);

  // Math Calculations & Tactical tilts engine
  const mathData = useMemo(() => {
    if (!macroData) return null;

    const { juros_atuais, expectativa_juros_bacen_2029, juros_futuros_d1f29, valor_taxa_prefixada_2029, taxa_media_historica } = macroData;

    const premioDeMercado = valor_taxa_prefixada_2029 - juros_futuros_d1f29;
    const meuSpread = juros_futuros_d1f29 - expectativaPropria;

    // Define bindings for the algebraic parser, including Euler's number (both e/E)
    // and initialize all allocation variables to their baseWeights (as fallback/baseline)
    const bindings: Record<string, number> = {
      J_atual: juros_atuais,
      juros_atuais: juros_atuais,
      E_bacen: expectativa_juros_bacen_2029,
      expectativa_juros_bacen_2029: expectativa_juros_bacen_2029,
      J_futuro: juros_futuros_d1f29,
      juros_futuros_d1f29: juros_futuros_d1f29,
      T_pre: valor_taxa_prefixada_2029,
      valor_taxa_prefixada_2029: valor_taxa_prefixada_2029,
      T_hist: taxa_media_historica,
      taxa_media_historica: taxa_media_historica,
      E_propria: expectativaPropria,
      expectativa_propria: expectativaPropria,
      e: Math.E,
      E: Math.E,

      // Only three allocation variables allowed (aloc_pre, aloc_ipca, aloc_pos)
      aloc_pre: baseWeights.pre / 100,
      aloc_ipca: baseWeights.ipca / 100,
      aloc_pos: baseWeights.cdi / 100,
    };

    // 1. Evaluate PRE Formula first
    let preRaw = baseWeights.pre / 100;
    let errorPRE: string | null = null;
    try {
      if (formulaPRE && formulaPRE.trim() !== '') {
        preRaw = evaluateFormula(formulaPRE, bindings);
      }
    } catch (e: any) {
      errorPRE = e.message || "Erro ao calcular Pré.";
      preRaw = baseWeights.pre / 100;
    }
    const preFrac = toFraction(preRaw);
    const prePct = preFrac * 100;

    // Update PRE binding
    bindings.aloc_pre = preFrac;

    // 2. Evaluate IPCA Formula second
    let ipcaRaw = baseWeights.ipca / 100;
    let errorIPCA: string | null = null;
    try {
      if (formulaIPCA && formulaIPCA.trim() !== '') {
        ipcaRaw = evaluateFormula(formulaIPCA, bindings);
      }
    } catch (e: any) {
      errorIPCA = e.message || "Erro ao calcular IPCA.";
      ipcaRaw = baseWeights.ipca / 100;
    }
    const ipcaFrac = toFraction(ipcaRaw);
    const ipcaPct = ipcaFrac * 100;

    // Update IPCA binding
    bindings.aloc_ipca = ipcaFrac;

    // 3. Evaluate CDI Formula third
    let cdiRaw = baseWeights.cdi / 100;
    let errorCDI: string | null = null;
    try {
      if (formulaCDI && formulaCDI.trim() !== '') {
        cdiRaw = evaluateFormula(formulaCDI, bindings);
      }
    } catch (e: any) {
      errorCDI = e.message || "Erro ao calcular CDI.";
      cdiRaw = baseWeights.cdi / 100;
    }
    const cdiFrac = toFraction(cdiRaw);
    const cdiPct = cdiFrac * 100;

    // Update CDI binding
    bindings.aloc_pos = cdiFrac;

    // Direct mapping to final weights rounded to 1 decimal place
    const finalWeights = {
      cdi: Math.round(cdiPct * 10) / 10,
      ipca: Math.round(ipcaPct * 10) / 10,
      pre: Math.round(prePct * 10) / 10
    };

    return {
      premioDeMercado,
      meuSpread,
      cdiRaw,
      ipcaRaw,
      preRaw,
      errorCDI,
      errorIPCA,
      errorPRE,
      finalWeights,
      bindings
    };
  }, [
    macroData, 
    baseWeights, 
    profile, 
    formulaCDI,
    formulaIPCA,
    formulaPRE,
    expectativaPropria
  ]);

  if (isLoading || !macroData || !mathData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 mt-8 mx-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-[2px] w-32 bg-border relative overflow-hidden">
            <div className="h-full bg-foreground w-1/3 absolute animate-loading-bar" />
          </div>
          <span className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground font-bold animate-pulse">
            Carregando Otimizador Macroeconômico...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6 flex flex-col gap-6 h-full overflow-y-auto">
      
      {/* Header Section (Exactly matching MethodologyPage styling) */}
      <div className="flex items-start justify-between mb-6 shrink-0 gap-8">
        <div className="max-w-4xl">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground leading-tight mb-2">
            Análise Macroeconômica e Otimização por Indexador
          </h2>
          <p className="font-serif text-xs italic text-muted-foreground leading-relaxed">
            Composição ideal do portfólio dividida em três "caixas" de indexadores — Pós-fixado (CDI), Inflação (IPCA+) e Pré-fixado —, ajustando dinamicamente os pesos com base no ciclo macroeconômico e nas suas próprias expectativas de taxas.
          </p>
        </div>
      </div>

      {/* THREE INDEXER BOXES - PROMINENT AT THE TOP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        {/* Box 1: CDI */}
        <div className="border border-border/80 bg-card p-6 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-foreground" />
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
              <h3 className="font-serif text-sm text-foreground font-bold uppercase tracking-wider">
                Caixa Pós-fixada (CDI/Selic)
              </h3>
              <span className="font-sans text-[9px] font-bold uppercase bg-foreground text-background px-2 py-0.5">
                Liquidez
              </span>
            </div>
            
            <div className="flex justify-between items-baseline mb-3">
              <span className="font-sans text-xs text-muted-foreground">Peso Alocado:</span>
              <span className="font-sans text-3xl font-black text-foreground">{mathData.finalWeights.cdi}%</span>
            </div>

            <p className="font-sans text-xs text-muted-foreground leading-relaxed mb-4">
              Proteção e liquidez com volatilidade nula. Âncora de segurança recomendada para prazos curtos ou volatilidade elevada.
            </p>
          </div>

          <div className="bg-muted/15 p-2.5 border border-border/20 text-[10px] font-sans text-muted-foreground leading-relaxed">
            <strong>Tática:</strong>{' '}
            {mathData.finalWeights.cdi !== baseWeights.cdi
              ? `Ajustada taticamente (${mathData.finalWeights.cdi > baseWeights.cdi ? '+' : ''}${(mathData.finalWeights.cdi - baseWeights.cdi).toFixed(1)}%) com base na sua fórmula de CDI (Nota: ${mathData.cdiRaw.toFixed(1)}).`
              : 'Alocação em neutralidade estrutural.'}
          </div>
        </div>

        {/* Box 2: IPCA+ */}
        <div className="border border-border/80 bg-card p-6 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-[#1e6b7b]" />
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
              <h3 className="font-serif text-sm text-foreground font-bold uppercase tracking-wider">
                Caixa de Inflação (IPCA+)
              </h3>
              <span className="font-sans text-[9px] font-bold uppercase bg-[#1e6b7b] text-white px-2 py-0.5">
                Poder de Compra
              </span>
            </div>
            
            <div className="flex justify-between items-baseline mb-3">
              <span className="font-sans text-xs text-muted-foreground">Peso Alocado:</span>
              <span className="font-sans text-3xl font-black text-[#1e6b7b]">{mathData.finalWeights.ipca}%</span>
            </div>

            <p className="font-sans text-xs text-muted-foreground leading-relaxed mb-4">
              Rendimento real somado ao IPCA. A base estrutural do portfólio para horizontes de médio e longo prazo.
            </p>
          </div>

          <div className="bg-muted/15 p-2.5 border border-border/20 text-[10px] font-sans text-muted-foreground leading-relaxed">
            <strong>Tática:</strong>{' '}
            {mathData.finalWeights.ipca !== baseWeights.ipca
              ? `Ajustada taticamente (${mathData.finalWeights.ipca > baseWeights.ipca ? '+' : ''}${(mathData.finalWeights.ipca - baseWeights.ipca).toFixed(1)}%) com base na sua fórmula de IPCA+ (Nota: ${mathData.ipcaRaw.toFixed(1)}).`
              : 'Alocação em neutralidade estrutural.'}
          </div>
        </div>

        {/* Box 3: Pré-fixado */}
        <div className="border border-border/80 bg-card p-6 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-[#c27a4d]" />
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-border/30 pb-2">
              <h3 className="font-serif text-sm text-foreground font-bold uppercase tracking-wider">
                Caixa Pré-fixada
              </h3>
              <span className="font-sans text-[9px] font-bold uppercase bg-[#c27a4d] text-white px-2 py-0.5">
                Alpha Direcional
              </span>
            </div>
            
            <div className="flex justify-between items-baseline mb-3">
              <span className="font-sans text-xs text-muted-foreground">Peso Alocado:</span>
              <span className="font-sans text-3xl font-black text-[#c27a4d]">{mathData.finalWeights.pre}%</span>
            </div>

            <p className="font-sans text-xs text-muted-foreground leading-relaxed mb-4">
              Aposta direcional de taxas travadas. Ampliada quando há prêmio estatístico de mercado ou spread favorável.
            </p>
          </div>

          <div className="bg-muted/15 p-2.5 border border-border/20 text-[10px] font-sans text-muted-foreground leading-relaxed">
            <strong>Tática:</strong>{' '}
            {PROFILE_LIMITS[profile].pre.max === 0
              ? 'TRAVADO EM 0% devido a restrições de segurança do perfil conservador.'
              : mathData.finalWeights.pre !== baseWeights.pre
              ? `Ajustada taticamente (${mathData.finalWeights.pre > baseWeights.pre ? '+' : ''}${(mathData.finalWeights.pre - baseWeights.pre).toFixed(1)}%) com base na sua fórmula de Pré-fixado (Nota: ${mathData.preRaw.toFixed(1)}).`
              : 'Alocação em neutralidade estrutural.'}
          </div>
        </div>
      </div>

      {/* LOWER GRID: Inputs & Calculations vs Active Indicators Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        
        {/* Left Column: Formulas & Expectation Inputs (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Card: Modelos de Atratividade por Indexador (Custom algebraic equations) */}
          <div className="border border-border/60 bg-card p-6 shadow-xs flex flex-col gap-4">
            <h3 className="font-serif text-lg text-foreground border-b border-border/30 pb-2 flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-muted-foreground" />
              Modelos de Atratividade por Indexador
            </h3>

            <p className="font-sans text-xs text-muted-foreground leading-relaxed">
              Escreva as expressões matemáticas para calcular a nota de cada indexador. Use as variáveis macroeconômicas listadas abaixo.
            </p>

            <div className="space-y-4">
              {/* CDI Formula */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground">
                    Caixa Pós-fixada (CDI)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-sans text-muted-foreground">
                      Nota: <strong className="font-mono text-foreground">{mathData.errorCDI ? 'Erro' : mathData.cdiRaw.toFixed(2)}</strong>
                    </span>
                    {mathData.errorCDI ? (
                      <span className="text-[10px] text-red-500 font-sans font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Erro
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-sans font-semibold">
                        ✓ Válida
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={formulaCDI}
                  onChange={(e) => {
                    setFormulaCDI(e.target.value);
                    localStorage.setItem('hfc_formula_cdi', e.target.value);
                  }}
                  className={`w-full bg-background border px-3 py-1.5 font-mono text-xs text-foreground focus:outline-none ${
                    mathData.errorCDI 
                      ? 'border-red-500/80 focus:border-red-500' 
                      : 'border-border focus:border-foreground'
                  }`}
                  placeholder="Ex: 60"
                />
                {mathData.errorCDI && (
                  <p className="text-[10px] text-red-500/90 font-mono mt-1 leading-relaxed bg-red-500/5 p-2 border border-red-500/10">
                    {mathData.errorCDI}
                  </p>
                )}
              </div>

              {/* IPCA+ Formula */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground">
                    Caixa de Inflação (IPCA+)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-sans text-muted-foreground">
                      Nota: <strong className="font-mono text-foreground">{mathData.errorIPCA ? 'Erro' : mathData.ipcaRaw.toFixed(2)}</strong>
                    </span>
                    {mathData.errorIPCA ? (
                      <span className="text-[10px] text-red-500 font-sans font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Erro
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-sans font-semibold">
                        ✓ Válida
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={formulaIPCA}
                  onChange={(e) => {
                    setFormulaIPCA(e.target.value);
                    localStorage.setItem('hfc_formula_ipca', e.target.value);
                  }}
                  className={`w-full bg-background border px-3 py-1.5 font-mono text-xs text-foreground focus:outline-none ${
                    mathData.errorIPCA 
                      ? 'border-red-500/80 focus:border-red-500' 
                      : 'border-border focus:border-foreground'
                  }`}
                  placeholder="Ex: 30"
                />
                {mathData.errorIPCA && (
                  <p className="text-[10px] text-red-500/90 font-mono mt-1 leading-relaxed bg-red-500/5 p-2 border border-red-500/10">
                    {mathData.errorIPCA}
                  </p>
                )}
              </div>

              {/* PRE Formula */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-muted-foreground">
                    Caixa Pré-fixada (PRE)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-sans text-muted-foreground">
                      Nota: <strong className="font-mono text-foreground">{mathData.errorPRE ? 'Erro' : mathData.preRaw.toFixed(2)}</strong>
                    </span>
                    {mathData.errorPRE ? (
                      <span className="text-[10px] text-red-500 font-sans font-semibold flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Erro
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-sans font-semibold">
                        ✓ Válida
                      </span>
                    )}
                  </div>
                </div>
                <input
                  type="text"
                  value={formulaPRE}
                  onChange={(e) => {
                    setFormulaPRE(e.target.value);
                    localStorage.setItem('hfc_formula_pre', e.target.value);
                  }}
                  className={`w-full bg-background border px-3 py-1.5 font-mono text-xs text-foreground focus:outline-none ${
                    mathData.errorPRE 
                      ? 'border-red-500/80 focus:border-red-500' 
                      : 'border-border focus:border-foreground'
                  }`}
                  placeholder="Ex: J_atual - T_hist"
                />
                {mathData.errorPRE && (
                  <p className="text-[10px] text-red-500/90 font-mono mt-1 leading-relaxed bg-red-500/5 p-2 border border-red-500/10">
                    {mathData.errorPRE}
                  </p>
                )}
              </div>
            </div>

            {/* List of allowed variables including Euler's e */}
            <div className="border border-border/40 p-3 bg-muted/5 space-y-2">
              <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-muted-foreground block border-b border-border/20 pb-1.5">
                Variáveis e Constantes Disponíveis
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-[10px] font-sans">
                <div className="flex justify-between">
                  <span className="font-mono text-foreground font-bold">J_atual</span>
                  <span className="text-muted-foreground">Juros Atuais</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-foreground font-bold">E_bacen</span>
                  <span className="text-muted-foreground">Expec. BACEN</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-foreground font-bold">J_futuro</span>
                  <span className="text-muted-foreground">Juros Futuros</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-foreground font-bold">T_pre</span>
                  <span className="text-muted-foreground">Taxa Pré</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-foreground font-bold">T_hist</span>
                  <span className="text-muted-foreground">Média Hist.</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-foreground font-bold">E_propria</span>
                  <span className="text-muted-foreground">Expec. Própria</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-amber-700 font-bold">e / E</span>
                  <span className="text-muted-foreground">Número Euler (e)</span>
                </div>
                <div className="flex justify-between col-span-2 md:col-span-3 border-t border-border/10 pt-1.5 mt-0.5">
                  <span className="text-[8px] font-sans font-bold uppercase tracking-wider text-muted-foreground">Variáveis de Alocação (Resultantes)</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-indigo-700 font-bold">aloc_pre</span>
                  <span className="text-muted-foreground">Alocação Pré-fixada</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-indigo-700 font-bold">aloc_ipca</span>
                  <span className="text-muted-foreground">Alocação IPCA+</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-indigo-700 font-bold">aloc_pos</span>
                  <span className="text-muted-foreground">Alocação Pós/CDI</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Expectativa Própria */}
          <div className="border border-border/60 bg-card p-6 shadow-xs animate-in fade-in-50 duration-300">
            <h3 className="font-serif text-lg text-foreground border-b border-border/30 pb-2 mb-4 flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-muted-foreground" />
              Expectativa Própria de Juros
            </h3>
            
            <p className="font-sans text-xs text-muted-foreground mb-4 leading-relaxed">
              Insira sua própria projeção de taxa de juros para 2029 (Jan/2029). O spread tático será calculado comparando este valor com o contrato futuro de mercado.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="font-semibold text-foreground">Sua Taxa Estimada para 2029</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={expectativaPropriaStr}
                    onChange={(e) => handleExpectationChange(e.target.value)}
                    onBlur={() => setExpectativaPropriaStr(expectativaPropria.toFixed(2))}
                    className="w-20 bg-background border border-border font-mono text-xs font-bold text-center py-1 text-foreground focus:outline-none"
                  />
                  <span className="mr-1">%</span>
                  <button
                    onClick={handleSaveExpectation}
                    className={`px-2.5 py-1 text-[10px] font-sans font-bold uppercase tracking-wider border transition-all duration-200 cursor-pointer ${
                      saveExpectationSuccess
                        ? 'bg-green-600 border-green-600 text-white'
                        : 'bg-foreground border-foreground text-background hover:bg-foreground/90'
                    }`}
                  >
                    {saveExpectationSuccess ? 'Salvo!' : 'Salvar'}
                  </button>
                </div>
              </div>
              <input
                type="range"
                min="3.00"
                max="18.00"
                step="0.05"
                value={expectativaPropria}
                onChange={(e) => handleExpectationChange(Number(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-foreground"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Active Indicators & Tactical Metrics (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Card: Indicadores de Mercado Ativos */}
          <div className="border border-border/60 bg-card p-6 flex flex-col gap-4">
            <h3 className="font-serif text-lg text-foreground border-b border-border/30 pb-2">
              Indicadores de Mercado Ativos
            </h3>

            <div className="flex flex-col gap-3 font-sans text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/20">
                <span className="text-muted-foreground">Juros Atuais:</span>
                <span className="font-bold">{macroData.juros_atuais.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/20">
                <span className="text-muted-foreground">Expec. BACEN (2029):</span>
                <span className="font-bold">{macroData.expectativa_juros_bacen_2029.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/20">
                <span className="text-muted-foreground">Juros Futuros (d1f29):</span>
                <span className="font-bold">{macroData.juros_futuros_d1f29.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/20">
                <span className="text-muted-foreground">Taxa Prefixada (2029):</span>
                <span className="font-bold">{macroData.valor_taxa_prefixada_2029.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Taxa Média Histórica:</span>
                <span className="font-bold">{macroData.taxa_media_historica.toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Card: Métricas Táticas Calculadas */}
          <div className="border border-border/60 bg-card p-6 shadow-xs flex-1">
            <h3 className="font-serif text-lg text-foreground border-b border-border/30 pb-2 mb-4">
              Métricas Táticas Calculadas
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Metric 1: Prêmio de Mercado */}
              <div className="border border-border/40 p-4 bg-muted/5 flex flex-col justify-between">
                <div>
                  <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                    Prêmio de Mercado
                  </span>
                  <div className="font-sans text-2xl font-black text-foreground mb-2">
                    {mathData.premioDeMercado > 0 ? '+' : ''}{mathData.premioDeMercado.toFixed(2)}%
                  </div>
                  <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">
                    Diferença entre a taxa prefixada negociada ({macroData.valor_taxa_prefixada_2029.toFixed(2)}%) e o contrato de juro futuro ({macroData.juros_futuros_d1f29.toFixed(2)}%).
                  </p>
                </div>
                
                <div className="mt-4 pt-2 border-t border-border/10">
                  {mathData.premioDeMercado > 0 ? (
                    <span className="bg-green-500/10 text-green-700 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 border border-green-500/20">
                      Prêmio Atraente
                    </span>
                  ) : (
                    <span className="bg-muted text-muted-foreground text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 border border-border">
                      Sem Prêmio
                    </span>
                  )}
                </div>
              </div>

              {/* Metric 2: Meu Spread */}
              <div className="border border-border/40 p-4 bg-muted/5 flex flex-col justify-between">
                <div>
                  <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">
                    Meu Spread Tático
                  </span>
                  <div className="font-sans text-2xl font-black text-foreground mb-2">
                    {mathData.meuSpread > 0 ? '+' : ''}{mathData.meuSpread.toFixed(2)}%
                  </div>
                  <p className="font-sans text-[10px] text-muted-foreground leading-relaxed">
                    Excesso de taxa que o juro futuro ({macroData.juros_futuros_d1f29.toFixed(2)}%) oferece em relação à sua expectativa própria ({expectativaPropria.toFixed(2)}%).
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-border/10">
                  {mathData.meuSpread > 0 ? (
                    <span className="bg-green-500/10 text-green-700 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 border border-green-500/20">
                      Expectativa Oportuna
                    </span>
                  ) : (
                    <span className="bg-amber-500/10 text-amber-700 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 border border-amber-500/20 border-dashed">
                      Expectativa Conservadora
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
