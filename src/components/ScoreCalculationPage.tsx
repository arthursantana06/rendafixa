// ============================================================
// SCORE CALCULATION PAGE - Premium Editorial Layout
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  RotateCcw, 
  Check, 
  AlertCircle, 
  HelpCircle, 
  Play, 
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { validateFormulaSyntax, evaluateFormula } from '@/lib/formulaParser';
import { analyzeBank } from '@/lib/analysis';
import { 
  DIMENSIONS, 
  classifyIndicatorWithValue, 
  getQualityScore, 
  getQualityLabel 
} from '@/lib/indicators';
import type { 
  BankData, 
  IndicatorConfig, 
  ParametroIndicador, 
  KnockoutLevel,
  SubTab
} from '@/types';

interface ScoreCalculationPageProps {
  banks: BankData[];
  weights: Record<string, number>;
  knockouts: Record<string, KnockoutLevel>;
  parameters?: Record<string, ParametroIndicador>;
  indicators: IndicatorConfig[];
  formulas: Record<string, string>;
  onUpdateFormulas: (newFormulas: Record<string, string>) => void;
  onSubTabChange?: (tab: SubTab) => void;
  onClose?: () => void;
  tempo?: number;
}

const DUMMY_ALLOWED_VARS = [
  'ib', 'ib_score', 'cet1', 'cet1_score', 'razao_alavancagem', 'razao_alavancagem_score',
  'lcr', 'lcr_score',
  'ii', 'ii_score', 'icp', 'icp_score', 'deposito_vista_funding', 'deposito_vista_funding_score',
  'roe', 'roe_score', 'roa', 'roa_score', 'ie', 'ie_score',
  'ativo_total', 'ativo_total_score', 'carteira_credito', 'carteira_credito_score',
  'tempo'
];

const FINAL_SCORE_ALLOWED_VARS = [
  'capital', 'liquidez', 'qualidade_carteira', 'resultado', 'porte', 'tempo'
];

const VARIABLE_GROUPS = [
  {
    label: 'Capital',
    variables: [
      { key: 'ib', label: 'Basileia (Bruto)' },
      { key: 'ib_score', label: 'Basileia (Nota)' },
      { key: 'cet1', label: 'CET1 (Bruto)' },
      { key: 'cet1_score', label: 'CET1 (Nota)' },
      { key: 'razao_alavancagem', label: 'Alavancagem (Bruto)' },
      { key: 'razao_alavancagem_score', label: 'Alavancagem (Nota)' }
    ]
  },
  {
    label: 'Liquidez',
    variables: [
      { key: 'lcr', label: 'LCR (Bruto)' },
      { key: 'lcr_score', label: 'LCR (Nota)' }
    ]
  },
  {
    label: 'Qualidade Carteira',
    variables: [
      { key: 'ii', label: 'Inadimplência (Bruto)' },
      { key: 'ii_score', label: 'Inadimplência (Nota)' },
      { key: 'icp', label: 'Provisões (Bruto)' },
      { key: 'icp_score', label: 'Provisões (Nota)' },
      { key: 'deposito_vista_funding', label: 'Vista/Funding (Bruto)' },
      { key: 'deposito_vista_funding_score', label: 'Vista/Funding (Nota)' }
    ]
  },
  {
    label: 'Resultado',
    variables: [
      { key: 'roe', label: 'ROE (Bruto)' },
      { key: 'roe_score', label: 'ROE (Nota)' },
      { key: 'roa', label: 'ROA (Bruto)' },
      { key: 'roa_score', label: 'ROA (Nota)' },
      { key: 'ie', label: 'Eficiência IE (Bruto)' },
      { key: 'ie_score', label: 'Eficiência IE (Nota)' }
    ]
  },
  {
    label: 'Porte',
    variables: [
      { key: 'ativo_total', label: 'Ativo Total (Bruto)' },
      { key: 'ativo_total_score', label: 'Ativo Total (Nota)' },
      { key: 'carteira_credito', label: 'Carteira Crédito (Bruto)' },
      { key: 'carteira_credito_score', label: 'Carteira Crédito (Nota)' },
      { key: 'tempo', label: 'Período (Anos)' }
    ]
  }
];

const MATH_FUNCTIONS = [
  { key: 'min(', label: 'min(a, b)' },
  { key: 'max(', label: 'max(a, b)' },
  { key: 'sqrt(', label: 'sqrt(x)' },
  { key: 'abs(', label: 'abs(x)' },
  { key: 'log(', label: 'log(x)' },
  { key: 'ln(', label: 'ln(x)' }
];

const STANDARD_OPERATORS = ['+', '-', '*', '/', '^', '(', ')', ','];

const DEFAULT_FORMULAS: Record<string, string> = {
  capital: '(ib_score + cet1_score + razao_alavancagem_score) / 3',
  liquidez: 'lcr_score',
  qualidade_carteira: '(ii_score + icp_score + deposito_vista_funding_score) / 3',
  resultado: '(roe_score + roa_score + ie_score) / 3',
  porte: '(ativo_total_score + carteira_credito_score) / 2',
  score_final: '(capital * 0.20) + (liquidez * 0.25) + (qualidade_carteira * 0.25) + (resultado * 0.20) + (porte * 0.10)'
};

export function ScoreCalculationPage({
  banks,
  weights,
  knockouts,
  parameters,
  indicators,
  formulas,
  onUpdateFormulas,
  onClose,
  tempo = 1
}: ScoreCalculationPageProps) {
  const [formulaStates, setFormulaStates] = useState<Record<string, string>>({ ...DEFAULT_FORMULAS });
  const [focusedDim, setFocusedDim] = useState<string | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [savingCardKey, setSavingCardKey] = useState<string | null>(null);

  // Dicionário de Variáveis & Notas Classificadas
  const [selectedDictKey, setSelectedDictKey] = useState<string>('ib');
  const [playgroundVal, setPlaygroundVal] = useState<string>('14.0');

  const DICT_DEFAULT_VALUES: Record<string, string> = {
    ib: '14.0',
    cet1: '11.0',
    ii: '3.5',
    icp: '120.0',
    roe: '12.0',
    roa: '1.0',
    razao_alavancagem: '7.0',
    deposito_vista_funding: '10.0',
    ativo_total: '50.0',
    carteira_credito: '25.0',
    ie: '50.0',
    lcr: '130.0'
  };

  const handleSelectDictKey = (key: string) => {
    setSelectedDictKey(key);
    setPlaygroundVal(DICT_DEFAULT_VALUES[key] || '0.0');
  };

  const activeParam = useMemo(() => {
    if (parameters && parameters[selectedDictKey]) {
      return {
        key: selectedDictKey,
        label: parameters[selectedDictKey].label,
        direction: parameters[selectedDictKey].direction,
        limite_muito_bom: parameters[selectedDictKey].limite_muito_bom,
        limite_bom: parameters[selectedDictKey].limite_bom,
        limite_moderado: parameters[selectedDictKey].limite_moderado,
        unit: selectedDictKey === 'ativo_total' || selectedDictKey === 'carteira_credito' ? 'Bi' : '%'
      };
    }
    
    // Standard fallbacks (matching indicators.ts classifyIndicator):
    let direction: 'higher_is_better' | 'lower_is_better' = 'higher_is_better';
    let limite_muito_bom = 15;
    let limite_bom = 13;
    let limite_moderado = 11;
    let label = selectedDictKey;
    let unit = '%';

    switch (selectedDictKey) {
      case 'ib':
        direction = 'higher_is_better'; limite_muito_bom = 15; limite_bom = 13; limite_moderado = 11; label = 'Índice de Basileia'; break;
      case 'cet1':
        direction = 'higher_is_better'; limite_muito_bom = 12; limite_bom = 10; limite_moderado = 7; label = 'CET1'; break;
      case 'ii':
        direction = 'lower_is_better'; limite_muito_bom = 2.5; limite_bom = 4; limite_moderado = 6; label = 'Inadimplência'; break;
      case 'icp':
        direction = 'higher_is_better'; limite_muito_bom = 150; limite_bom = 100; limite_moderado = 80; label = 'Cobertura de Provisões'; break;
      case 'roe':
        direction = 'higher_is_better'; limite_muito_bom = 15; limite_bom = 10; limite_moderado = 5; label = 'ROE'; break;
      case 'roa':
        direction = 'higher_is_better'; limite_muito_bom = 1.5; limite_bom = 0.8; limite_moderado = 0.3; label = 'ROA'; break;
      case 'razao_alavancagem':
        direction = 'higher_is_better'; limite_muito_bom = 8; limite_bom = 6; limite_moderado = 4; label = 'Razão de Alavancagem'; break;
      case 'deposito_vista_funding':
        direction = 'higher_is_better'; limite_muito_bom = 15; limite_bom = 8; limite_moderado = 3; label = 'Depósito à Vista / Funding'; break;
      case 'ativo_total':
        direction = 'higher_is_better'; limite_muito_bom = 200; limite_bom = 30; limite_moderado = 3; unit = 'Bi'; label = 'Ativo Total'; break;
      case 'carteira_credito':
        direction = 'higher_is_better'; limite_muito_bom = 100; limite_bom = 10; limite_moderado = 1; unit = 'Bi'; label = 'Carteira de Crédito'; break;
      case 'ie':
        direction = 'lower_is_better'; limite_muito_bom = 45; limite_bom = 55; limite_moderado = 70; label = 'Índice de Eficiência'; break;
      case 'lcr':
        direction = 'higher_is_better'; limite_muito_bom = 150; limite_bom = 120; limite_moderado = 100; label = 'LCR'; break;
    }

    return {
      key: selectedDictKey,
      label,
      direction,
      limite_muito_bom,
      limite_bom,
      limite_moderado,
      unit
    };
  }, [selectedDictKey, parameters]);

  const playgroundResult = useMemo(() => {
    const numVal = parseFloat(playgroundVal);
    if (isNaN(numVal)) {
      return { score: 0, rating: 'ruim' as const, label: 'Inválido' };
    }

    const rating = classifyIndicatorWithValue(
      activeParam.direction,
      numVal,
      activeParam.limite_muito_bom,
      activeParam.limite_bom,
      activeParam.limite_moderado
    );

    const score = getQualityScore(rating);
    const label = getQualityLabel(rating);

    return { score, rating, label };
  }, [playgroundVal, activeParam]);

  // Sync formula states on mount or when props change
  useEffect(() => {
    if (formulas && Object.keys(formulas).length > 0) {
      const merged = { ...DEFAULT_FORMULAS };
      Object.keys(formulas).forEach(k => {
        if (formulas[k]) merged[k] = formulas[k];
      });
      setFormulaStates(merged);
    }
  }, [formulas]);

  // Set initial selected bank if not set
  useEffect(() => {
    if (banks.length > 0 && !selectedBankId) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks, selectedBankId]);

  // Handle syntax validation per dimension and final score
  const validationResults = useMemo(() => {
    const results: Record<string, string | null> = {};
    
    // Dimensions
    DIMENSIONS.forEach(dim => {
      const formula = formulaStates[dim.key] || '';
      if (!formula.trim()) {
        results[dim.key] = 'Fórmula não pode ser vazia.';
      } else {
        results[dim.key] = validateFormulaSyntax(formula, DUMMY_ALLOWED_VARS);
      }
    });

    // Final score composition
    const finalFormula = formulaStates['score_final'] || '';
    if (!finalFormula.trim()) {
      results['score_final'] = 'Fórmula não pode ser vazia.';
    } else {
      results['score_final'] = validateFormulaSyntax(finalFormula, FINAL_SCORE_ALLOWED_VARS);
    }

    return results;
  }, [formulaStates]);


  // Insert a variable at the current cursor position of the focused dimension textarea
  const insertToken = (token: string) => {
    if (!focusedDim) return;
    const textarea = document.getElementById(`textarea-${focusedDim}`) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formulaStates[focusedDim] || '';
    const newText = text.substring(0, start) + token + text.substring(end);

    setFormulaStates(prev => ({
      ...prev,
      [focusedDim]: newText
    }));

    // Re-focus and position the cursor nicely
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + token.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Find the selected bank data
  const selectedBank = useMemo(() => {
    return banks.find(b => b.id === selectedBankId);
  }, [banks, selectedBankId]);

  // Generate step-by-step breakdown simulator for selected bank
  const simulatorData = useMemo(() => {
    if (!selectedBank) return null;

    // Run standard analysis to get indicator scores
    const analysis = analyzeBank(selectedBank, weights, knockouts, parameters, indicators, formulaStates, tempo);
    
    // Recalculate each dimension step by step manually to show trace
    const steps: Array<{
      dimKey: string;
      dimLabel: string;
      formula: string;
      isValid: boolean;
      errorMsg: string | null;
      variablesUsed: Array<{ key: string; label: string; val: number }>;
      result: number;
    }> = [];

    const dimScores: Record<string, number> = {};

    DIMENSIONS.forEach(dim => {
      const formula = formulaStates[dim.key] || '';
      const isValid = validationResults[dim.key] === null;

      // Extract variables mentioned in the formula to show their live values
      const variablesUsed: Array<{ key: string; label: string; val: number }> = [];
      const varMap: Record<string, number> = {};

      DUMMY_ALLOWED_VARS.forEach(vKey => {
        if (formula.includes(vKey)) {
          // Find label
          let label = vKey;
          for (const g of VARIABLE_GROUPS) {
            const found = g.variables.find(item => item.key === vKey);
            if (found) {
              label = found.label;
              break;
            }
          }
          
          // Find value
          const isScore = vKey.endsWith('_score');
          const indBaseKey = isScore ? vKey.replace('_score', '') : vKey;
          const indRes = analysis.indicators[indBaseKey];
          
          let val = 0;
          if (vKey === 'tempo') {
            val = tempo;
          } else if (indRes) {
            val = isScore ? indRes.score : (typeof indRes.value === 'number' ? indRes.value : 0);
          }
          
          variablesUsed.push({ key: vKey, label, val });
          varMap[vKey] = val;
        }
      });

      // We'll run a custom sub-evaluate to catch runtime issues (like negative sqrt)
      let result = 0;
      let errorMsg = validationResults[dim.key];
      
      if (isValid) {
        try {
          result = evaluateFormula(formula, varMap);
          result = Math.max(0, Math.min(10, result));
        } catch (e: any) {
          errorMsg = e.message || 'Erro de cálculo.';
        }
      }

      dimScores[dim.key] = result;

      steps.push({
        dimKey: dim.key,
        dimLabel: dim.label,
        formula,
        isValid: isValid && !errorMsg,
        errorMsg,
        variablesUsed,
        result: Math.round(result * 100) / 100
      });
    });

    // Evaluate score_final manually for simulation trace
    const finalFormula = formulaStates['score_final'] || '';
    const finalIsValid = validationResults['score_final'] === null;
    const finalVariablesUsed: Array<{ key: string; label: string; val: number }> = [];
    const finalVarMap: Record<string, number> = {};

    FINAL_SCORE_ALLOWED_VARS.forEach(dimKey => {
      if (finalFormula.includes(dimKey)) {
        let label = dimKey;
        let val = 0;
        if (dimKey === 'tempo') {
          label = 'Período (Anos)';
          val = tempo;
        } else {
          const dimObj = DIMENSIONS.find(d => d.key === dimKey);
          if (dimObj) label = dimObj.label;
          val = dimScores[dimKey] || 0;
        }
        
        finalVariablesUsed.push({ key: dimKey, label, val });
        finalVarMap[dimKey] = val;
      }
    });

    let finalResult = 0;
    let finalErrorMsg = validationResults['score_final'];

    if (finalIsValid) {
      try {
        finalResult = evaluateFormula(finalFormula, finalVarMap);
        finalResult = Math.max(0, Math.min(10, finalResult));
      } catch (e: any) {
        finalErrorMsg = e.message || 'Erro de cálculo.';
      }
    }

    steps.push({
      dimKey: 'score_final',
      dimLabel: 'Composição do Score Final',
      formula: finalFormula,
      isValid: finalIsValid && !finalErrorMsg,
      errorMsg: finalErrorMsg,
      variablesUsed: finalVariablesUsed,
      result: Math.round(finalResult * 100) / 100
    });

    return {
      bankName: selectedBank.name,
      steps,
      totalWeightedScore: analysis.weightedScore,
      isKnockedOut: analysis.isKnockedOut,
      knockoutReasons: analysis.knockoutReasons
    };
  }, [selectedBank, weights, knockouts, parameters, indicators, formulaStates, validationResults, tempo]);



  // Save a single custom formula to Supabase database
  const handleSaveSingleFormula = async (dimKey: string) => {
    const error = validationResults[dimKey];
    if (error) {
      setSaveStatus('error');
      setErrorMessage(`Por favor, corrija os erros de sintaxe antes de salvar.`);
      setTimeout(() => setSaveStatus('idle'), 4000);
      return;
    }

    setIsSaving(true);
    setSavingCardKey(dimKey);
    setSaveStatus('idle');

    try {
      const formulaToSave = formulaStates[dimKey] || '';
      
      const { error: dbError } = await supabase
        .from('formulas_dimensoes')
        .upsert({
          dimension_key: dimKey,
          formula: formulaToSave
        }, { onConflict: 'dimension_key' });

      if (dbError) throw dbError;

      setSaveStatus('success');
      
      // Update parent formulas state
      const updatedFormulas = { ...formulas, [dimKey]: formulaToSave };
      onUpdateFormulas(updatedFormulas);
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err: any) {
      console.error(`Failed to save formula for ${dimKey}:`, err);
      setSaveStatus('error');
      setErrorMessage(err.message || 'Erro inesperado ao salvar no banco de dados.');
      setTimeout(() => setSaveStatus('idle'), 4000);
    } finally {
      setIsSaving(false);
      setSavingCardKey(null);
    }
  };

  // Restore formulas to default seed formulas
  const handleResetFormulas = () => {
    if (window.confirm('Deseja realmente restaurar todas as fórmulas para as configurações padrão da metodologia?')) {
      setFormulaStates({ ...DEFAULT_FORMULAS });
      setSaveStatus('idle');
    }
  };

  const renderMathPalette = (dimKey: string) => {
    return (
      <div className="border border-border bg-muted/5 p-4 mt-3 shrink-0 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-300 relative rounded-sm">
        <button
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setFocusedDim(null)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer text-[10px] font-sans font-black uppercase tracking-widest transition-colors border border-border/40 px-2 py-1 rounded-sm bg-background/50 hover:bg-background"
          title="Ocultar Paleta"
        >
          Ocultar
        </button>

        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <h4 className="font-sans text-[10px] font-black uppercase tracking-widest text-foreground">
            Paleta de Atalhos Matemáticos
          </h4>
        </div>

        <p className="font-sans text-[11px] text-muted-foreground leading-relaxed -mt-1.5 border-b border-border/20 pb-3">
          Clique nos elementos abaixo para inseri-los no ponto de inserção do cursor. O score final limita o resultado da dimensão entre 0.0 e 10.0.
        </p>

        {/* Arithmetic Operators & Functions row */}
        <div className="flex flex-col gap-3.5 pb-2">
          <div>
            <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
              Operadores Aritméticos
            </span>
            <div className="flex flex-wrap gap-2">
              {STANDARD_OPERATORS.map(op => (
                <button
                  key={op}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken(op)}
                  className="font-mono text-xs font-bold px-3 py-1.5 border border-border/70 hover:border-foreground hover:bg-foreground/5 cursor-pointer rounded-sm active:scale-95 transition-all text-foreground bg-background"
                >
                  {op}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground block mb-2">
              Funções Matemáticas
            </span>
            <div className="flex flex-wrap gap-2">
              {MATH_FUNCTIONS.map(fn => (
                <button
                  key={fn.key}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertToken(fn.key)}
                  className="font-mono text-xs font-medium px-3 py-1.5 border border-border/70 hover:border-foreground hover:bg-foreground/5 cursor-pointer rounded-sm active:scale-95 transition-all text-foreground bg-background"
                  title={fn.label}
                >
                  {fn.key.replace('(', '')}()
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Variables grouped */}
        <div className="border-t border-border/20 pt-4 flex flex-col gap-4">
          <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground block -mb-1">
            {dimKey === 'score_final' ? 'Dimensões Disponíveis' : 'Variáveis por Grupo Prudencial'}
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dimKey === 'score_final' ? (
              <div className="col-span-2 flex flex-col gap-1.5">
                <span className="font-serif text-[10px] italic font-semibold text-foreground/80">
                  Dimensões Analíticas (Pontuações de 0.0 a 10.0)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { key: 'capital', label: 'Nota do Capital' },
                    { key: 'liquidez', label: 'Nota da Liquidez' },
                    { key: 'qualidade_carteira', label: 'Nota da Qualidade' },
                    { key: 'resultado', label: 'Nota do Resultado' },
                    { key: 'porte', label: 'Nota do Porte' },
                    { key: 'tempo', label: 'Período (Anos)' }
                  ].map(d => (
                    <button
                      key={d.key}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertToken(d.key)}
                      className="font-sans text-[9px] font-semibold px-2.5 py-1.5 border border-border/60 hover:border-foreground hover:bg-foreground/[0.02] cursor-pointer rounded-sm text-left bg-background text-muted-foreground"
                      title={`Inserir ${d.key} (${d.label})`}
                    >
                      {d.key}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              VARIABLE_GROUPS.map(group => (
                <div key={group.label} className="flex flex-col gap-1.5">
                  <span className="font-serif text-[10px] italic font-semibold text-foreground/80">
                    {group.label}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {group.variables.map(v => (
                      <button
                        key={v.key}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertToken(v.key)}
                        className={`font-sans text-[9px] font-semibold px-2 py-1 border border-border/60 hover:border-foreground hover:bg-foreground/[0.02] cursor-pointer rounded-sm text-left transition-all ${
                          v.key.endsWith('_score') 
                            ? 'bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                            : 'bg-background text-muted-foreground'
                        }`}
                        title={`Inserir ${v.key} (${v.label})`}
                      >
                        {v.key}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };


  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6 h-[calc(100vh-155px)] flex flex-col overflow-hidden relative">
      
      {/* Header Section */}
      <div className="flex items-start justify-between mb-5 shrink-0 gap-8">
        <div className="max-w-4xl">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground leading-tight mb-2">
            Cálculo do Score
          </h2>
          <p className="font-serif text-xs italic text-muted-foreground leading-relaxed">
            Painel editorial para definição do rigor matemático do score de crédito. Parametrizar as dimensões analíticas inserindo indicadores financeiros e notas como variáveis dinâmicas em equações algébricas.
          </p>
        </div>
        
        {/* Persistent Action Bar */}
        <div className="flex items-center gap-3 pt-1">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-3 text-[10px] font-sans font-black uppercase tracking-widest transition-all duration-200 cursor-pointer border border-foreground bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98]"
              title="Voltar para Metodologia"
            >
              <span>← Voltar</span>
            </button>
          )}

          <button
            onClick={handleResetFormulas}
            className="flex items-center gap-2 px-5 py-3 text-[10px] font-sans font-black uppercase tracking-widest transition-all duration-200 cursor-pointer border border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground hover:scale-[1.02] active:scale-[0.98]"
            title="Redefinir fórmulas originais"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restaurar Padrões</span>
          </button>

          {/* Note: Save button is now located inside each formula editing box for a localized experience */}
        </div>
      </div>

      {/* Save Alerts and Warnings */}
      {saveStatus === 'error' && (
        <div className="shrink-0 mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 p-4 text-xs font-sans font-medium flex items-center gap-2 rounded-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveStatus === 'success' && (
        <div className="shrink-0 mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 p-4 text-xs font-sans font-medium flex items-center gap-2 rounded-sm">
          <Check className="h-4 w-4 shrink-0" />
          <span>Configuração matemática persistida com sucesso e propagada por todo o sistema!</span>
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 flex-1 min-h-0">
        
        {/* Left Hand: Mathematical Editor Workspace (7 cols) */}
        <div className="xl:col-span-7 flex flex-col min-h-0 gap-6 overflow-y-auto pr-3 scrollbar-thin">
          
          {/* Formula Editing Cards */}
          <div className="flex flex-col gap-5 shrink-0">
            <h3 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-border/60 pb-2">
              Modelagem Algébrica por Dimensão
            </h3>

            {DIMENSIONS.map(dim => {
              const formula = formulaStates[dim.key] || '';
              const isFocused = focusedDim === dim.key;
              const error = validationResults[dim.key];

              return (
                <div 
                  key={dim.key}
                  className={`border transition-all duration-300 ${
                    isFocused 
                      ? 'border-foreground bg-foreground/[0.01]' 
                      : 'border-border/60 bg-background hover:border-border/90'
                  }`}
                  onClick={() => {
                    const textarea = document.getElementById(`textarea-${dim.key}`);
                    if (textarea) textarea.focus();
                  }}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-muted/5 cursor-pointer">
                    <div className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${
                        isFocused ? 'bg-foreground' : 'bg-muted-foreground/30'
                      }`} />
                      <h4 className="font-serif text-sm font-bold text-foreground">
                        {dim.label}
                      </h4>
                    </div>

                    {/* Syntax Status Indicator */}
                    <div className="flex items-center">
                      {error ? (
                        <div className="flex items-center gap-1 text-[9px] font-sans font-bold uppercase tracking-wider text-rose-600 bg-rose-500/5 px-2 py-0.5 border border-rose-500/20 rounded-sm">
                          <AlertCircle className="h-3 w-3" />
                          <span>Sintaxe Inválida</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[9px] font-sans font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/20 rounded-sm">
                          <Check className="h-3 w-3" />
                          <span>Fórmula Válida</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Content & Textarea */}
                  <div className="p-4 flex flex-col gap-3">
                    <textarea
                      id={`textarea-${dim.key}`}
                      rows={2}
                      value={formula}
                      onChange={(e) => setFormulaStates(prev => ({ ...prev, [dim.key]: e.target.value }))}
                      onFocus={() => setFocusedDim(dim.key)}
                      onBlur={() => {
                        setTimeout(() => {
                          const active = document.activeElement;
                          if (!active || !active.id.startsWith('textarea-')) {
                            setFocusedDim(null);
                          }
                        }, 150);
                      }}
                      placeholder="Insira a fórmula matemática aqui. Ex: (ib_score + cet1_score) / 2"
                      className="w-full bg-transparent border-0 font-mono text-sm leading-relaxed p-1 outline-none resize-none placeholder:text-muted-foreground/35 select-text"
                    />

                    {/* Show raw error message if syntax is invalid */}
                    {error && (
                      <span className="font-sans text-[10px] text-rose-500/90 leading-tight">
                        {error}
                      </span>
                    )}

                    {/* Localized save/discard action buttons inside the box */}
                    {(() => {
                      const base = formulas && Object.keys(formulas).length > 0 ? formulas : DEFAULT_FORMULAS;
                      const hasCardChanges = (formulaStates[dim.key] || '').trim() !== (base[dim.key] || '').trim();
                      if (!hasCardChanges) return null;

                      return (
                        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/20 animate-in fade-in duration-200 select-none">
                          <span className="font-sans text-[9px] text-amber-500 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Alterações pendentes
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setFormulaStates(prev => ({ ...prev, [dim.key]: base[dim.key] || '' }));
                              }}
                              className="px-2.5 py-1.5 text-[9px] font-sans font-black uppercase tracking-widest border border-border bg-background hover:bg-muted/10 text-muted-foreground hover:border-foreground hover:text-foreground cursor-pointer rounded-sm transition-all"
                              title="Descartar alterações desta caixa"
                            >
                              Descartar
                            </button>
                            <button
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSaveSingleFormula(dim.key)}
                              disabled={isSaving || error !== null}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-sans font-black uppercase tracking-widest bg-foreground text-background border border-foreground hover:bg-foreground/90 disabled:opacity-50 cursor-pointer rounded-sm transition-all"
                              title="Salvar esta fórmula no banco de dados"
                            >
                              {isSaving && savingCardKey === dim.key ? (
                                <span className="h-2.5 w-2.5 border-2 border-background border-t-transparent rounded-full animate-spin"></span>
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                              <span>Salvar</span>
                            </button>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Inline math shortcuts palette */}
                    {isFocused && renderMathPalette(dim.key)}
                  </div>
                </div>
              );
            })}

            {/* Composição do Score Final Card */}
            <div className="mt-4 flex flex-col gap-3 shrink-0">
              <h3 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-border/60 pb-2">
                Fórmula de Composição do Score Final
              </h3>
              
              {(() => {
                const dimKey = 'score_final';
                const formula = formulaStates[dimKey] || '';
                const isFocused = focusedDim === dimKey;
                const error = validationResults[dimKey];

                return (
                  <div 
                    key={dimKey}
                    className={`border transition-all duration-300 ${
                      isFocused 
                        ? 'border-foreground bg-foreground/[0.01]' 
                        : 'border-border/60 bg-background hover:border-border/90'
                    }`}
                    onClick={() => {
                      const textarea = document.getElementById(`textarea-${dimKey}`);
                      if (textarea) textarea.focus();
                    }}
                  >
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-muted/5 cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full ${
                          isFocused ? 'bg-foreground' : 'bg-muted-foreground/30'
                        }`} />
                        <h4 className="font-serif text-sm font-bold text-foreground">
                          Composição do Score Final (Resultado Geral)
                        </h4>
                      </div>

                      {/* Syntax Status Indicator */}
                      <div className="flex items-center">
                        {error ? (
                          <div className="flex items-center gap-1 text-[9px] font-sans font-bold uppercase tracking-wider text-rose-600 bg-rose-500/5 px-2 py-0.5 border border-rose-500/20 rounded-sm">
                            <AlertCircle className="h-3 w-3" />
                            <span>Sintaxe Inválida</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[9px] font-sans font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/20 rounded-sm">
                            <Check className="h-3 w-3" />
                            <span>Fórmula Válida</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Content & Textarea */}
                    <div className="p-4 flex flex-col gap-3">
                      <textarea
                        id={`textarea-${dimKey}`}
                        rows={2}
                        value={formula}
                        onChange={(e) => setFormulaStates(prev => ({ ...prev, [dimKey]: e.target.value }))}
                        onFocus={() => setFocusedDim(dimKey)}
                        onBlur={() => {
                          setTimeout(() => {
                            const active = document.activeElement;
                            if (!active || !active.id.startsWith('textarea-')) {
                              setFocusedDim(null);
                            }
                          }, 150);
                        }}
                        placeholder="Ex: (capital * 0.20) + (liquidez * 0.25) + (qualidade_carteira * 0.25) + (resultado * 0.20) + (porte * 0.10)"
                        className="w-full bg-transparent border-0 font-mono text-sm leading-relaxed p-1 outline-none resize-none placeholder:text-muted-foreground/35 select-text"
                      />

                      {/* Show raw error message if syntax is invalid */}
                      {error && (
                        <span className="font-sans text-[10px] text-rose-500/90 leading-tight">
                          {error}
                        </span>
                      )}

                      {/* Localized save/discard action buttons inside the box */}
                      {(() => {
                        const base = formulas && Object.keys(formulas).length > 0 ? formulas : DEFAULT_FORMULAS;
                        const hasCardChanges = (formulaStates[dimKey] || '').trim() !== (base[dimKey] || '').trim();
                        if (!hasCardChanges) return null;

                        return (
                          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-border/20 animate-in fade-in duration-200 select-none">
                            <span className="font-sans text-[9px] text-amber-500 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Alterações pendentes
                            </span>

                            <div className="flex items-center gap-2">
                              <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                  setFormulaStates(prev => ({ ...prev, [dimKey]: base[dimKey] || '' }));
                                }}
                                className="px-2.5 py-1.5 text-[9px] font-sans font-black uppercase tracking-widest border border-border bg-background hover:bg-muted/10 text-muted-foreground hover:border-foreground hover:text-foreground cursor-pointer rounded-sm transition-all"
                                title="Descartar alterações desta caixa"
                              >
                                Descartar
                              </button>
                              <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSaveSingleFormula(dimKey)}
                                disabled={isSaving || error !== null}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-sans font-black uppercase tracking-widest bg-foreground text-background border border-foreground hover:bg-foreground/90 disabled:opacity-50 cursor-pointer rounded-sm transition-all"
                                title="Salvar esta fórmula no banco de dados"
                              >
                                {isSaving && savingCardKey === dimKey ? (
                                  <span className="h-2.5 w-2.5 border-2 border-background border-t-transparent rounded-full animate-spin"></span>
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                                <span>Salvar</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Inline math shortcuts palette */}
                      {isFocused && renderMathPalette(dimKey)}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>

        {/* Right Hand: Simulation Workspace & Comparison Spreadsheets (5 cols) */}
        <div className="xl:col-span-5 flex flex-col min-h-0 gap-6 overflow-y-auto pr-3 scrollbar-thin">
          
          {/* Interactive Calculator Simulator */}
          <div className="border border-border/50 bg-background p-5 shrink-0 flex flex-col min-h-0 max-h-[350px]">
            <div className="flex items-center justify-between border-b border-border/40 pb-3.5 mb-4 shrink-0">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-sans text-[10px] font-black uppercase tracking-widest text-foreground">
                  Simulador de Cenários & Cálculo Real
                </h4>
              </div>
              
              {/* Bank Select Dropdown */}
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="bg-transparent border border-border/80 font-sans text-xs px-2.5 py-1.5 outline-none font-medium max-w-[200px]"
              >
                {banks.map(b => (
                  <option key={b.id} value={b.id} className="bg-background text-foreground">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Simulation Trace Steps */}
            {simulatorData ? (
              <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3.5 scrollbar-thin">
                <div className="flex items-baseline justify-between">
                  <span className="font-serif text-xs italic text-muted-foreground">
                    Simulação para {simulatorData.bankName}
                  </span>
                  
                  {simulatorData.isKnockedOut ? (
                    <span className="font-sans text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-500/5 px-2 py-0.5 border border-rose-500/20 rounded-sm">
                      ⚠️ Reprovado no Knockout
                    </span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Score Final:</span>
                      <span className="font-mono text-sm font-bold text-foreground">{simulatorData.totalWeightedScore}</span>
                    </div>
                  )}
                </div>

                {simulatorData.isKnockedOut && simulatorData.knockoutReasons.length > 0 && (
                  <div className="bg-rose-500/5 border border-rose-500/10 p-2.5 text-[10px] font-sans text-rose-600 rounded-sm leading-relaxed shrink-0">
                    Motivos de Inviabilidade: {simulatorData.knockoutReasons.join(', ')}
                  </div>
                )}

                {/* Dimension Algebra breakdowns */}
                <div className="flex flex-col gap-3">
                  {simulatorData.steps.map(step => (
                    <div key={step.dimKey} className="border-b border-border/20 pb-3 flex flex-col gap-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-foreground">
                          {step.dimLabel}
                        </span>
                        
                        {step.isValid ? (
                          <div className="flex items-baseline gap-1 font-mono text-[11px]">
                            <span className="text-muted-foreground text-[9px]">Valor:</span>
                            <span className="font-bold text-foreground">{step.result}</span>
                          </div>
                        ) : (
                          <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-rose-500">
                            Erro de cálculo
                          </span>
                        )}
                      </div>

                      {/* Formula representation */}
                      <div className="bg-muted/10 p-2 font-mono text-[11px] text-muted-foreground border border-border/30 rounded-sm flex items-center justify-between">
                        <span className="truncate max-w-[250px] font-bold text-foreground/80">{step.formula}</span>
                        <ArrowRight className="h-3 w-3 shrink-0 opacity-40 mx-2" />
                        <span className="font-bold text-foreground shrink-0">{step.result}</span>
                      </div>

                      {/* Variables breakdown list */}
                      {step.variablesUsed.length > 0 && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                          {step.variablesUsed.map(v => (
                            <span key={v.key} className="font-sans text-[9px] text-muted-foreground">
                              {v.key} = <strong className="font-mono text-foreground">{v.val}</strong>
                            </span>
                          ))}
                        </div>
                      )}

                      {step.errorMsg && (
                        <span className="font-sans text-[9px] text-rose-500 mt-1 leading-tight block">
                          Erro: {step.errorMsg}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center font-sans text-xs italic text-muted-foreground">
                Nenhum emissor selecionado para simulação.
              </div>
            )}
          </div>

          {/* Dicionário de Variáveis & Notas Classificadas */}
          <div className="border border-border/50 bg-background flex flex-col shrink-0 min-h-[520px] flex-1 p-5 overflow-hidden">
            <div className="border-b border-border/40 pb-3 mb-4 shrink-0">
              <div className="flex items-center gap-2 mb-1.5">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-sans text-[10px] font-black uppercase tracking-widest text-foreground">
                  Dicionário de Variáveis & Notas Classificadas
                </h4>
              </div>
              <p className="font-sans text-[11px] text-muted-foreground leading-relaxed">
                Entenda a diferença entre a <strong>métrica bruta</strong> (ex: <code className="bg-muted px-1 py-0.5 rounded text-[10px] text-foreground">ib</code> = 15.5%) e a <strong>nota classificada</strong> (ex: <code className="bg-blue-500/10 dark:bg-blue-500/25 px-1 py-0.5 rounded text-[10px] text-blue-600 dark:text-blue-400 font-bold border border-blue-500/10">ib_score</code> = 10.0) na modelagem algébrica.
              </p>
            </div>

            {/* Main Interactive Guide Split */}
            <div className="flex gap-4 flex-1 min-h-0">
              
              {/* Left Selector List */}
              <div className="w-[180px] shrink-0 border-r border-border/30 pr-3 overflow-y-auto scrollbar-thin flex flex-col gap-3">
                {VARIABLE_GROUPS.map(group => (
                  <div key={group.label} className="flex flex-col gap-1">
                    <span className="font-sans text-[9px] font-bold text-muted-foreground/60 uppercase tracking-wider block">
                      {group.label}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {group.variables.filter(v => !v.key.endsWith('_score')).map(v => {
                        const isSelected = selectedDictKey === v.key;
                        return (
                          <button
                            key={v.key}
                            onClick={() => handleSelectDictKey(v.key)}
                            className={`text-left font-sans text-xs px-2.5 py-1.5 transition-all cursor-pointer rounded-sm border ${
                              isSelected 
                                ? 'bg-foreground border-foreground text-background font-bold' 
                                : 'bg-transparent border-transparent hover:bg-muted/10 text-foreground hover:border-border/30'
                            }`}
                          >
                            <div className="truncate">{v.label.replace(' (Bruto)', '')}</div>
                            <div className={`font-mono text-[9px] ${isSelected ? 'text-background/80' : 'text-muted-foreground'}`}>
                              {v.key} / {v.key}_score
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Variable Details Pane */}
              <div className="flex-1 overflow-y-auto pl-1 pr-1 flex flex-col gap-4 scrollbar-thin min-w-0">
                
                {/* Visual Comparative Cards */}
                <div className="border border-border/40 bg-muted/5 p-3 flex flex-col gap-2.5 rounded-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans text-[8px] font-bold uppercase tracking-wider text-muted-foreground bg-muted border border-border/30 px-1.5 py-0.5 rounded-sm">
                      Variabilidade Matemática
                    </span>
                    <span className="font-serif text-xs italic font-bold text-foreground truncate">
                      {activeParam.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-background border border-border/30 p-2.5 rounded-sm flex flex-col justify-between">
                      <div>
                        <span className="font-sans text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Variável Bruta</span>
                        <div className="font-mono text-sm font-black text-foreground mt-1">
                          {activeParam.key}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-2 leading-tight">
                        Métrica financeira real do emissor (em {activeParam.unit}).
                      </span>
                    </div>

                    <div className="bg-blue-500/5 border border-blue-500/10 p-2.5 rounded-sm flex flex-col justify-between">
                      <div>
                        <span className="font-sans text-[8px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Nota / Pontuação</span>
                        <div className="font-mono text-sm font-black text-blue-600 dark:text-blue-400 mt-1">
                          {activeParam.key}_score
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-2 leading-tight">
                        Normalizada de <strong>0.0 a 10.0</strong> para as equações.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Régua de Faixas de Notas */}
                <div className="flex flex-col gap-2">
                  <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                    Régua Paramétrica de Notas (Faixas da Metodologia)
                  </span>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center text-[10px] justify-between text-muted-foreground bg-muted/10 border border-border/20 px-2 py-1 rounded-sm">
                      <span>Orientação de Análise:</span>
                      <span className="font-bold text-foreground text-[9px] uppercase tracking-wider">
                        {activeParam.direction === 'higher_is_better' ? 'Quanto MAIOR o valor, melhor 📈' : 'Quanto MENOR o valor, melhor 📉'}
                      </span>
                    </div>

                    {/* Segmented color ruler */}
                    <div className="grid grid-cols-4 gap-1 h-2.5 rounded-full overflow-hidden mt-0.5">
                      <div className="bg-rose-500/80" title="Ruim (Nota 0)" />
                      <div className="bg-amber-500/80" title="Moderado (Nota 4)" />
                      <div className="bg-emerald-500/80" title="Bom (Nota 7)" />
                      <div className="bg-blue-500/80" title="Muito Bom (Nota 10)" />
                    </div>

                    {/* Limit Descriptions */}
                    <div className="grid grid-cols-1 gap-1 text-[10px] font-sans border border-border/20 bg-muted/5 p-2.5 rounded-sm">
                      <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                          <span className="font-bold text-foreground">Muito Bom (Nota 10.0)</span>
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {activeParam.direction === 'higher_is_better' 
                            ? `> ${activeParam.limite_muito_bom}${activeParam.unit}` 
                            : `< ${activeParam.limite_muito_bom}${activeParam.unit}`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="font-bold text-foreground/90">Bom (Nota 7.0)</span>
                        </span>
                        <span className="font-mono font-bold text-foreground/95">
                          {activeParam.direction === 'higher_is_better'
                            ? `[${activeParam.limite_bom}, ${activeParam.limite_muito_bom}]${activeParam.unit}`
                            : `[${activeParam.limite_muito_bom}, ${activeParam.limite_bom}]${activeParam.unit}`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-0.5 border-b border-border/10">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                          <span className="font-bold text-muted-foreground">Moderado (Nota 4.0)</span>
                        </span>
                        <span className="font-mono font-bold text-muted-foreground">
                          {activeParam.direction === 'higher_is_better'
                            ? `[${activeParam.limite_moderado}, ${activeParam.limite_bom}[${activeParam.unit}`
                            : `]${activeParam.limite_bom}, ${activeParam.limite_moderado}]${activeParam.unit}`}
                        </span>
                      </div>

                      <div className="flex justify-between items-center py-0.5">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                          <span className="font-bold text-muted-foreground line-through opacity-70">Ruim (Nota 0.0)</span>
                        </span>
                        <span className="font-mono font-bold text-muted-foreground">
                          {activeParam.direction === 'higher_is_better'
                            ? `< ${activeParam.limite_moderado}${activeParam.unit}`
                            : `> ${activeParam.limite_moderado}${activeParam.unit}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Micro Playground Simulator */}
                <div className="border border-border/50 bg-background p-3 flex flex-col gap-2 rounded-sm shrink-0">
                  <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-foreground">
                    Live Playground — Simular Conversão de Nota
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center bg-muted/20 border border-border/70 px-2.5 py-1.5 rounded-sm">
                      <input
                        type="number"
                        value={playgroundVal}
                        onChange={(e) => setPlaygroundVal(e.target.value)}
                        className="w-full bg-transparent border-none text-xs font-mono outline-none text-foreground"
                        placeholder="Valor bruto..."
                        step="any"
                      />
                      <span className="text-[10px] font-sans font-bold text-muted-foreground pr-1 shrink-0">
                        {activeParam.unit}
                      </span>
                    </div>

                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-50 shrink-0" />

                    {/* Output badge color coded */}
                    <div className={`px-3 py-1.5 rounded-sm border flex items-center justify-between gap-3 min-w-[140px] shrink-0 ${
                      playgroundResult.rating === 'muito_bom' 
                        ? 'bg-blue-500/10 border-blue-500/25 text-blue-700 dark:text-blue-400'
                        : playgroundResult.rating === 'bom'
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-400'
                        : playgroundResult.rating === 'moderado'
                        ? 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-400'
                        : 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-400'
                    }`}>
                      <span className="font-sans text-[9px] font-bold uppercase tracking-wider">
                        {playgroundResult.label}
                      </span>
                      <span className="font-mono text-xs font-black">
                        Score: {playgroundResult.score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Save button is now located inside each individual formula box for localized convenience */}
    </div>
  );
}
