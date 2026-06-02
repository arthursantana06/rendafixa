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
import { calculateScore, indicatorsConfig } from '@/services/MetricCalculatorService';
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
  SubTab,
  QualityRating
} from '@/types';

interface ScoreCalculationPageProps {
  banks: BankData[];
  weights: Record<string, number>;
  knockouts: Record<string, KnockoutLevel>;
  parameters?: Record<string, ParametroIndicador>;
  indicators: IndicatorConfig[];
  formulas: Record<string, string>;
  onUpdateFormulas: (newFormulas: Record<string, string>) => void;
  onUpdateParameter: (key: string, updates: Partial<ParametroIndicador> & { newKey?: string }) => Promise<void> | void;
  onSubTabChange?: (tab: SubTab) => void;
  onClose?: () => void;
  tempo?: number;
}

const DUMMY_ALLOWED_VARS = [
  'ib', 'ib_score', 'cet1', 'cet1_score', 'razao_alavancagem', 'razao_alavancagem_score',
  'proxy_liquidez_ial', 'proxy_liquidez_ial_score',
  'ii', 'ii_score', 'icp', 'icp_score', 'deposito_vista_funding', 'deposito_vista_funding_score',
  'roe', 'roe_score', 'roa', 'roa_score', 'ie', 'ie_score',
  'ativo_total', 'ativo_total_score', 'carteira_credito', 'carteira_credito_score',
  'tendencia_crescimento_carteira', 'tendencia_crescimento_carteira_score',
  'tendencia_cet1', 'tendencia_cet1_score',
  'tendencia_roa', 'tendencia_roa_score',
  'tendencia_ldr', 'tendencia_ldr_score',
  'tendencia_proxy_liquidez', 'tendencia_proxy_liquidez_score',
  'tempo'
];

const FINAL_SCORE_ALLOWED_VARS = [
  'capital', 'liquidez', 'qualidade_carteira', 'resultado', 'porte', 'tendencia', 'tempo'
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
      { key: 'proxy_liquidez_ial', label: 'IAL (Bruto)' },
      { key: 'proxy_liquidez_ial_score', label: 'IAL (Nota)' }
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
      { key: 'carteira_credito_score', label: 'Carteira Crédito (Nota)' }
    ]
  },
  {
    label: 'Tendência',
    variables: [
      { key: 'tendencia_crescimento_carteira', label: 'Tend CC (Bruto)' },
      { key: 'tendencia_crescimento_carteira_score', label: 'Tend CC (Nota)' },
      { key: 'tendencia_cet1', label: 'Tend CET1 (Bruto)' },
      { key: 'tendencia_cet1_score', label: 'Tend CET1 (Nota)' },
      { key: 'tendencia_roa', label: 'Tend ROA (Bruto)' },
      { key: 'tendencia_roa_score', label: 'Tend ROA (Nota)' },
      { key: 'tendencia_ldr', label: 'Tend LDR (Bruto)' },
      { key: 'tendencia_ldr_score', label: 'Tend LDR (Nota)' },
      { key: 'tendencia_proxy_liquidez', label: 'Tend Proxy Liq (Bruto)' },
      { key: 'tendencia_proxy_liquidez_score', label: 'Tend Proxy Liq (Nota)' },
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
  capital: '(cet1_score * 0.60) + (ib_score * 0.30) + (razao_alavancagem_score * 0.10)',
  liquidez: 'proxy_liquidez_ial_score',
  qualidade_carteira: '(ii_score * 0.5) + (icp_score * 0.25) + (deposito_vista_funding_score * 0.25)',
  resultado: '(roa_score * 0.40) + (roe_score * 0.30) + (ie_score * 0.30)',
  porte: '(ativo_total_score * 0.5) + (carteira_credito_score * 0.5)',
  tendencia: '(tendencia_crescimento_carteira_score + tendencia_cet1_score + tendencia_roa_score + tendencia_ldr_score + tendencia_proxy_liquidez_score) / 5',
  score_final: '((porte / (1.05 ^ tempo))) * (0.3 * capital + 0.2 * liquidez + 0.3 * qualidade_carteira + 0.2 * resultado) * 0.105'
};

const DEFAULT_INDICATOR_FORMULAS: Record<string, string> = {
  ib: 'min(10, max(0, ((x - 8.0) / 7.0) * 10))',
  cet1: 'min(10, max(0, ((x - 4.5) / 6.5) * 10))',
  razao_alavancagem: 'min(10, max(0, ((x - 3.0) / 5.0) * 10))',
  icp: 'min(10, max(0, ((x - 100.0) / 200.0) * 10))',
  roe: 'min(10, max(0, ((x - 5.0) / 15.0) * 10))',
  roa: 'min(10, max(0, ((x - 0.5) / 1.5) * 10))',
  proxy_liquidez_ial: 'min(10, max(0, ((x - 10.0) / 20.0) * 10))',
  deposito_vista_funding: 'min(10, max(0, ((x - 3.0) / 12.0) * 10))',
  ii: 'min(10, max(0, ((8.0 - x) / 7.0) * 10))',
  ldr: 'min(10, max(0, ((110.0 - x) / 40.0) * 10))',
  ie: 'min(10, max(0, ((70.0 - x) / 30.0) * 10))',
  ativo_total: 'min(10, max(0, (log(x) / 2.0) * 10))',
  carteira_credito: 'min(10, max(0, ((log(x) + 0.30103) / 2.0) * 10))'
};

function getDefaultFormulaForIndicator(param: any): string {
  if (DEFAULT_INDICATOR_FORMULAS[param.key]) {
    return DEFAULT_INDICATOR_FORMULAS[param.key];
  }
  const teto = param.limite_muito_bom;
  const piso = param.limite_moderado;
  if (param.direction === 'higher_is_better') {
    const diff = teto - piso;
    return `min(10, max(0, ((x - ${piso.toFixed(1)}) / ${diff !== 0 ? diff.toFixed(1) : '1.0'}) * 10))`;
  } else {
    const diff = piso - teto;
    return `min(10, max(0, ((${piso.toFixed(1)} - x) / ${diff !== 0 ? diff.toFixed(1) : '1.0'}) * 10))`;
  }
}
interface SimulationFormulaInputProps {
  initialValue: string;
  onChange: (val: string) => void;
  className?: string;
  title?: string;
}

function SimulationFormulaInput({ initialValue, onChange, className, title }: SimulationFormulaInputProps) {
  const [localVal, setLocalVal] = useState(initialValue);

  useEffect(() => {
    setLocalVal(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    if (localVal !== initialValue) {
      onChange(localVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text"
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={className}
      title={title}
    />
  );
}

export function ScoreCalculationPage({
  banks,
  weights,
  knockouts,
  parameters,
  indicators,
  formulas,
  onUpdateFormulas,
  onUpdateParameter,
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

  // Tabs for Score Calculation Workspace
  const [activeTab, setActiveTab] = useState<'modelagem' | 'simulador' | 'dicionario'>('modelagem');

  // Simulation formulas sandboxed state
  const [simulationFormulas, setSimulationFormulas] = useState<Record<string, string>>({});

  // Bank selection search combobox states
  const [isBankSearchOpen, setIsBankSearchOpen] = useState(false);
  const [bankSearchQuery, setBankSearchQuery] = useState('');

  // Dicionário de Variáveis & Notas Classificadas
  const [selectedDictKey, setSelectedDictKey] = useState<string>('ib');
  const [playgroundVal, setPlaygroundVal] = useState<string>('14.0');
  const [formulaScoreState, setFormulaScoreState] = useState('');



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
    proxy_liquidez_ial: '25.0',
    tendencia_crescimento_carteira: '8.0',
    tendencia_cet1: '0.5',
    tendencia_roa: '0.1',
    tendencia_ldr: '-2.0',
    tendencia_proxy_liquidez: '2.0'
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
        formula_score: parameters[selectedDictKey].formula_score || '',
        unit: selectedDictKey === 'ativo_total' || selectedDictKey === 'carteira_credito' ? 'Bi' : '%'
      };
    }
    
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
      case 'proxy_liquidez_ial':
        direction = 'higher_is_better'; limite_muito_bom = 30; limite_bom = 20; limite_moderado = 10; label = 'Proxy Liquidez IAL'; break;
      case 'tendencia_crescimento_carteira':
        direction = 'higher_is_better'; limite_muito_bom = 15; limite_bom = 5; limite_moderado = 0; label = 'Tendência Crescimento Carteira'; break;
      case 'tendencia_cet1':
        direction = 'higher_is_better'; limite_muito_bom = 1; limite_bom = 0; limite_moderado = -1; unit = 'pp'; label = 'Tendência CET1'; break;
      case 'tendencia_roa':
        direction = 'higher_is_better'; limite_muito_bom = 0.2; limite_bom = 0; limite_moderado = -0.2; unit = 'pp'; label = 'Tendência ROA'; break;
      case 'tendencia_ldr':
        direction = 'lower_is_better'; limite_muito_bom = -5; limite_bom = 0; limite_moderado = 5; unit = 'pp'; label = 'Tendência LDR'; break;
      case 'tendencia_proxy_liquidez':
        direction = 'higher_is_better'; limite_muito_bom = 5; limite_bom = 0; limite_moderado = -5; unit = 'pp'; label = 'Tendência Proxy Liquidez'; break;
    }

    return {
      key: selectedDictKey,
      label,
      direction,
      limite_muito_bom,
      limite_bom,
      limite_moderado,
      formula_score: '',
      unit
    };
  }, [selectedDictKey, parameters]);

  // Sync formulaScoreState on variable selector change, pre-filling with equivalent formula
  useEffect(() => {
    const param = parameters?.[selectedDictKey];
    if (param) {
      if (param.formula_score && param.formula_score.trim() !== '') {
        setFormulaScoreState(param.formula_score);
      } else {
        setFormulaScoreState(getDefaultFormulaForIndicator(param));
      }
    } else {
      setFormulaScoreState(getDefaultFormulaForIndicator(activeParam));
    }
  }, [selectedDictKey, parameters, activeParam]);

  const playgroundResult = useMemo(() => {
    const numVal = parseFloat(playgroundVal);
    if (isNaN(numVal)) {
      return { score: 0, rating: 'ruim' as const, label: 'Inválido' };
    }

    let score = 0;
    let rating: QualityRating = 'moderado';
    let label = 'Moderado';

    if (formulaScoreState && formulaScoreState.trim() !== '') {
      try {
        const bindings = {
          [activeParam.key]: numVal,
          x: numVal
        };
        score = evaluateFormula(formulaScoreState, bindings);
        score = Math.max(0, Math.min(10, score));
        
        if (score >= 9.0) rating = 'muito_bom';
        else if (score >= 7.0) rating = 'bom';
        else if (score >= 4.0) rating = 'moderado';
        else rating = 'ruim';
        
        label = getQualityLabel(rating);
      } catch (err: any) {
        return { score: 0, rating: 'ruim' as const, label: 'Erro na Fórmula' };
      }
    } else {
      const config = indicatorsConfig[activeParam.key];
      if (config) {
        score = calculateScore(numVal, config.tipoCurva, config.piso, config.teto) / 10;
        
        if (score >= 9.0) rating = 'muito_bom';
        else if (score >= 7.0) rating = 'bom';
        else if (score >= 4.0) rating = 'moderado';
        else rating = 'ruim';
        
        label = getQualityLabel(rating);
      } else {
        rating = classifyIndicatorWithValue(
          activeParam.direction,
          numVal,
          activeParam.limite_muito_bom,
          activeParam.limite_bom,
          activeParam.limite_moderado
        );
        score = getQualityScore(rating);
        label = getQualityLabel(rating);
      }
    }

    return { score, rating, label };
  }, [playgroundVal, activeParam, formulaScoreState]);

  useEffect(() => {
    if (formulas && Object.keys(formulas).length > 0) {
      const merged = { ...DEFAULT_FORMULAS };
      Object.keys(formulas).forEach(k => {
        if (formulas[k]) merged[k] = formulas[k];
      });
      setFormulaStates(merged);
    }
  }, [formulas]);

  useEffect(() => {
    if (formulaStates) {
      setSimulationFormulas(prev => {
        const next = { ...prev };
        Object.keys(formulaStates).forEach(k => {
          if (next[k] === undefined || next[k] === DEFAULT_FORMULAS[k]) {
            next[k] = formulaStates[k] || '';
          }
        });
        return next;
      });
    }
  }, [formulaStates]);

  useEffect(() => {
    if (banks.length > 0 && !selectedBankId) {
      setSelectedBankId(banks[0].id);
    }
  }, [banks, selectedBankId]);

  const validationResults = useMemo(() => {
    const results: Record<string, string | null> = {};
    
    DIMENSIONS.forEach(dim => {
      const formula = formulaStates[dim.key] || '';
      if (!formula.trim()) {
        results[dim.key] = 'Fórmula não pode ser vazia.';
      } else {
        results[dim.key] = validateFormulaSyntax(formula, DUMMY_ALLOWED_VARS);
      }
    });

    const finalFormula = formulaStates['score_final'] || '';
    if (!finalFormula.trim()) {
      results['score_final'] = 'Fórmula não pode ser vazia.';
    } else {
      results['score_final'] = validateFormulaSyntax(finalFormula, FINAL_SCORE_ALLOWED_VARS);
    }

    return results;
  }, [formulaStates]);

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

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + token.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const insertDictToken = (token: string) => {
    const textarea = document.getElementById('textarea-dict-formula') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formulaScoreState || '';
    const newText = text.substring(0, start) + token + text.substring(end);

    setFormulaScoreState(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + token.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  const selectedBank = useMemo(() => {
    return banks.find(b => b.id === selectedBankId);
  }, [banks, selectedBankId]);

  const simulatorData = useMemo(() => {
    if (!selectedBank) return null;

    const currentFormulas = { ...formulaStates, ...simulationFormulas };
    const analysis = analyzeBank(selectedBank, weights, knockouts, parameters, indicators, currentFormulas, tempo);
    
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
      const formula = currentFormulas[dim.key] || '';
      const syntaxError = validateFormulaSyntax(formula, DUMMY_ALLOWED_VARS);
      const isValid = syntaxError === null;

      const variablesUsed: Array<{ key: string; label: string; val: number }> = [];
      const varMap: Record<string, number> = {};

      DUMMY_ALLOWED_VARS.forEach(vKey => {
        if (formula.includes(vKey)) {
          let label = vKey;
          for (const g of VARIABLE_GROUPS) {
            const found = g.variables.find(item => item.key === vKey);
            if (found) {
              label = found.label;
              break;
            }
          }
          
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

      let result = 0;
      let errorMsg = syntaxError;
      
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

    const finalFormula = currentFormulas['score_final'] || '';
    const finalSyntaxError = validateFormulaSyntax(finalFormula, FINAL_SCORE_ALLOWED_VARS);
    const finalIsValid = finalSyntaxError === null;
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
    let finalErrorMsg = finalSyntaxError;

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
      totalWeightedScore: finalIsValid && !finalErrorMsg ? finalResult : analysis.weightedScore,
      isKnockedOut: analysis.isKnockedOut,
      knockoutReasons: analysis.knockoutReasons
    };
  }, [selectedBank, weights, knockouts, parameters, indicators, formulaStates, validationResults, tempo, simulationFormulas]);

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

  const handleResetFormulas = () => {
    if (window.confirm('Deseja realmente restaurar todas as fórmulas para as configurações padrão da metodologia?')) {
      setFormulaStates({ ...DEFAULT_FORMULAS });
      setSaveStatus('idle');
    }
  };

  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6 h-full min-h-0 flex flex-col overflow-hidden relative">
      
      <div className="flex items-start justify-between mb-5 shrink-0 gap-8">
        <div className="max-w-4xl">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground leading-tight mb-2">
            Cálculo do Score
          </h2>
          <p className="font-serif text-xs italic text-muted-foreground leading-relaxed">
            Painel editorial para definição do rigor matemático do score de crédito. Parametrizar as dimensões analíticas inserindo equações e expressões algébricas.
          </p>
        </div>
        
        <div className="flex items-center gap-3 pt-1">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-3 text-[10px] font-sans font-black uppercase tracking-widest transition-all duration-200 cursor-pointer border border-foreground bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98]"
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
        </div>
      </div>

      <div className="flex border-b border-border/40 mb-6 shrink-0 select-none">
        {(['modelagem', 'simulador', 'dicionario'] as const).map((tab) => {
          const labels = {
            modelagem: '1. Modelagem Algébrica por Dimensão',
            simulador: '2. Simulador de Score',
            dicionario: '3. Dicionário de Variáveis & Notas Classificadas'
          };
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-sans text-[10px] font-black uppercase tracking-widest px-6 py-3.5 border-b-2 transition-all cursor-pointer ${
                isActive 
                  ? 'border-foreground text-foreground font-black bg-muted/5' 
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/5'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

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

      <div className="flex-1 min-h-0 flex flex-col gap-6 select-text overflow-hidden">
        
        {activeTab === 'modelagem' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0 animate-in fade-in duration-200">
            <div className="lg:col-span-8 flex flex-col gap-5 overflow-y-auto pr-2 scrollbar-thin">
              <h3 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-border/60 pb-2">
                Fórmulas de Dimensionamento Analítico
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
                        ? 'border-foreground bg-foreground/[0.01] shadow-xs' 
                        : 'border-border/60 bg-background hover:border-border/90'
                    }`}
                    onClick={() => {
                      const textarea = document.getElementById(`textarea-${dim.key}`);
                      if (textarea) textarea.focus();
                    }}
                  >
                    <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-muted/5 cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2 w-2 rounded-full ${
                          isFocused ? 'bg-foreground animate-ping' : 'bg-muted-foreground/30'
                        }`} />
                        <h4 className="font-serif text-sm font-bold text-foreground">
                          {dim.label}
                        </h4>
                      </div>

                      <div className="flex items-center select-none">
                        {error ? (
                          <div className="flex items-center gap-1 text-[9px] font-sans font-bold uppercase tracking-wider text-rose-600 bg-rose-500/5 px-2.5 py-1 border border-rose-500/20 rounded-sm">
                            <AlertCircle className="h-3 w-3" />
                            <span>Sintaxe Inválida</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-[9px] font-sans font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/5 px-2.5 py-1 border border-emerald-500/20 rounded-sm">
                            <Check className="h-3 w-3" />
                            <span>Fórmula Válida</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 flex flex-col gap-3">
                      <div className="relative border border-border/60 bg-background p-3.5 rounded-none flex items-start gap-3">
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
                          placeholder="Insira a fórmula matemática aqui. Ex: (ib_score + cet1_score) / 3"
                          className="w-full bg-transparent border-0 font-mono text-sm leading-relaxed p-0 outline-none resize-none placeholder:text-muted-foreground/35 select-text text-foreground focus-visible:ring-0"
                        />
                      </div>

                      {error && (
                        <span className="font-sans text-[10px] text-rose-500/90 leading-tight block px-1">
                          {error}
                        </span>
                      )}

                      {(() => {
                        const base = formulas && Object.keys(formulas).length > 0 ? formulas : DEFAULT_FORMULAS;
                        const hasCardChanges = (formulaStates[dim.key] || '').trim() !== (base[dim.key] || '').trim();
                        if (!hasCardChanges) return null;

                        return (
                          <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t border-border/20 animate-in fade-in duration-200 select-none">
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
                              >
                                Descartar
                              </button>
                              <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleSaveSingleFormula(dim.key)}
                                disabled={isSaving || error !== null}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-sans font-black uppercase tracking-widest bg-foreground text-background border border-foreground hover:bg-foreground/90 disabled:opacity-50 cursor-pointer rounded-sm transition-all font-bold"
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
                    </div>
                  </div>
                );
              })}

              <div className="mt-4 flex flex-col gap-3">
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
                          ? 'border-foreground bg-foreground/[0.01] shadow-xs' 
                          : 'border-border/60 bg-background hover:border-border/90'
                      }`}
                      onClick={() => {
                        const textarea = document.getElementById(`textarea-${dimKey}`);
                        if (textarea) textarea.focus();
                      }}
                    >
                      <div className="flex items-center justify-between px-5 py-3 border-b border-border/30 bg-muted/5 cursor-pointer">
                        <div className="flex items-center gap-2.5">
                          <span className={`h-2 w-2 rounded-full ${
                            isFocused ? 'bg-foreground animate-ping' : 'bg-muted-foreground/30'
                          }`} />
                          <h4 className="font-serif text-sm font-bold text-foreground">
                            Composição do Score Final (Resultado Geral)
                          </h4>
                        </div>

                        <div className="flex items-center select-none">
                          {error ? (
                            <div className="flex items-center gap-1 text-[9px] font-sans font-bold uppercase tracking-wider text-rose-600 bg-rose-500/5 px-2.5 py-1 border border-rose-500/20 rounded-sm">
                              <AlertCircle className="h-3 w-3" />
                              <span>Sintaxe Inválida</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[9px] font-sans font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/5 px-2.5 py-1 border border-emerald-500/20 rounded-sm">
                              <Check className="h-3 w-3" />
                              <span>Fórmula Válida</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-4 flex flex-col gap-3">
                        <div className="relative border border-border/60 bg-background p-3.5 rounded-none flex items-start gap-3">
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
                            placeholder="Ex: (capital * 0.17) + (liquidez * 0.17) + (qualidade_carteira * 0.17) + (resultado * 0.17) + (porte * 0.17) + (tendencia * 0.15)"
                            className="w-full bg-transparent border-0 font-mono text-sm leading-relaxed p-0 outline-none resize-none placeholder:text-muted-foreground/35 select-text text-foreground focus-visible:ring-0"
                          />
                        </div>

                        {error && (
                          <span className="font-sans text-[10px] text-rose-500/90 leading-tight block px-1">
                            {error}
                          </span>
                        )}

                        {(() => {
                          const base = formulas && Object.keys(formulas).length > 0 ? formulas : DEFAULT_FORMULAS;
                          const hasCardChanges = (formulaStates[dimKey] || '').trim() !== (base[dimKey] || '').trim();
                          if (!hasCardChanges) return null;

                          return (
                            <div className="flex items-center justify-between gap-2 mt-2 pt-3 border-t border-border/20 animate-in fade-in duration-200 select-none">
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
                                >
                                  Descartar
                                </button>
                                <button
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleSaveSingleFormula(dimKey)}
                                  disabled={isSaving || error !== null}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-sans font-black uppercase tracking-widest bg-foreground text-background border border-foreground hover:bg-foreground/90 disabled:opacity-50 cursor-pointer rounded-sm transition-all font-bold"
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
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-5 bg-muted/5 border border-border/40 p-5 overflow-y-auto scrollbar-thin select-none h-fit max-h-full rounded-xs">
              <div className="flex items-center gap-2 border-b border-border/30 pb-3">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-sans text-[10px] font-black uppercase tracking-widest text-foreground">
                  Helper de Modelagem
                </h4>
              </div>

              <p className="font-sans text-[11px] text-muted-foreground leading-relaxed -mt-1.5 border-b border-border/10 pb-3.5">
                Selecione um editor de dimensão à esquerda e clique nos atalhos matemáticos ou variáveis abaixo para inseri-los no ponto de inserção do cursor.
              </p>

              <div className="flex flex-col gap-2.5">
                <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground block">
                  Operadores Aritméticos e Funções
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {STANDARD_OPERATORS.map(op => (
                    <button
                      key={op}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertToken(op)}
                      className="font-mono text-xs font-bold px-2.5 py-1.5 border border-border/60 bg-background hover:border-foreground hover:bg-foreground/5 cursor-pointer rounded-sm active:scale-95 transition-all text-foreground"
                    >
                      {op}
                    </button>
                  ))}
                  {MATH_FUNCTIONS.map(fn => (
                    <button
                      key={fn.key}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertToken(fn.key)}
                      className="font-mono text-[9px] font-bold px-2.5 py-1.5 border border-border/60 bg-background hover:border-foreground hover:bg-foreground/5 cursor-pointer rounded-sm active:scale-95 transition-all text-foreground"
                      title={fn.label}
                    >
                      {fn.key.replace('(', '')}()
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3.5 border-t border-border/20 pt-4">
                <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                  Variáveis Prudenciais Disponíveis
                </span>
                
                <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin">
                  {focusedDim === 'score_final' ? (
                    <div className="flex flex-col gap-1.5">
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
                          { key: 'tendencia', label: 'Nota da Tendência' },
                          { key: 'tempo', label: 'Período (Anos)' }
                        ].map(d => (
                          <button
                            key={d.key}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => insertToken(d.key)}
                            className="font-mono text-[9px] px-2 py-1.5 border border-border/60 bg-background hover:border-foreground hover:bg-foreground/[0.02] cursor-pointer rounded-sm text-left text-muted-foreground font-bold active:scale-95"
                            title={`Inserir ${d.key} (${d.label})`}
                          >
                            {d.key}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    VARIABLE_GROUPS.map(group => {
                      const isHighlighted = focusedDim && (
                        (focusedDim === 'capital' && group.label === 'Capital') ||
                        (focusedDim === 'liquidez' && group.label === 'Liquidez') ||
                        (focusedDim === 'qualidade_carteira' && group.label === 'Qualidade Carteira') ||
                        (focusedDim === 'resultado' && group.label === 'Resultado') ||
                        (focusedDim === 'porte' && group.label === 'Porte') ||
                        (focusedDim === 'tendencia' && group.label === 'Tendência')
                      );

                      return (
                        <div key={group.label} className={`flex flex-col gap-1.5 p-2 rounded-sm transition-all border ${
                          isHighlighted 
                            ? 'bg-blue-500/5 border-blue-500/25 text-blue-700 dark:text-blue-400 shadow-xs' 
                            : 'border-transparent text-foreground/80'
                        }`}>
                          <span className="font-serif text-[10px] italic font-black uppercase tracking-wider flex items-center gap-1">
                            {group.label} {isHighlighted && '📍'}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {group.variables.map(v => (
                              <button
                                key={v.key}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => insertToken(v.key)}
                                className={`font-mono text-[9px] px-2 py-1 border border-border/60 hover:border-foreground hover:bg-foreground/[0.02] cursor-pointer rounded-sm text-left transition-all active:scale-95 ${
                                  v.key.endsWith('_score') 
                                    ? 'bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-500/10' 
                                    : 'bg-background text-muted-foreground'
                                }`}
                                title={`Inserir ${v.key} (${v.label})`}
                              >
                                {v.key}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'simulador' && (
          <div className="flex flex-col flex-1 min-h-0 animate-in fade-in duration-200 select-none">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-3 gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-muted-foreground animate-pulse" />
                <h4 className="font-sans text-[11px] font-black uppercase tracking-widest text-foreground">
                  Simulador de Score
                </h4>
              </div>
              <div className="flex items-center gap-3">
                {/* Simulation Formulas Discard Button */}
                {Object.keys(simulationFormulas).some(k => simulationFormulas[k] !== undefined && (simulationFormulas[k] || '').trim() !== (formulaStates[k] || '').trim()) && (
                  <button
                    onClick={() => setSimulationFormulas({})}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-sans font-black uppercase tracking-widest border border-dashed border-rose-500 bg-rose-500/5 text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer h-8"
                    title="Restaurar fórmulas oficiais na simulação"
                  >
                    Descartar Simulação
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <span className="font-sans text-[9px] font-black text-muted-foreground uppercase tracking-wider">Selecionar Emissor:</span>
                  
                  {/* Beautiful custom search-enabled combobox */}
                  <div className="relative shrink-0 select-none z-50">
                    <button
                      onClick={() => setIsBankSearchOpen(!isBankSearchOpen)}
                      className="bg-background border border-border/80 font-sans text-xs px-3 py-1.5 outline-none font-bold text-foreground cursor-pointer h-8 flex items-center justify-between gap-2 w-64 hover:border-foreground transition-all"
                    >
                      <span className="truncate">{selectedBank?.name || 'Selecionar Emissor...'}</span>
                      <span className="text-muted-foreground text-[10px]">▼</span>
                    </button>
                    {isBankSearchOpen && (
                      <div className="absolute right-0 top-9 w-64 bg-background border border-border shadow-lg p-2 flex flex-col gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                        <input
                          type="text"
                          placeholder="Buscar emissor..."
                          value={bankSearchQuery}
                          onChange={(e) => setBankSearchQuery(e.target.value)}
                          className="w-full bg-muted/10 border border-border/60 font-sans text-xs px-2.5 py-1.5 outline-none text-foreground focus:border-foreground"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="max-h-60 overflow-y-auto scrollbar-thin flex flex-col gap-0.5">
                          {banks
                            .filter(b => b.name.toLowerCase().includes(bankSearchQuery.toLowerCase()))
                            .map(b => (
                              <button
                                key={b.id}
                                onClick={() => {
                                  setSelectedBankId(b.id);
                                  setIsBankSearchOpen(false);
                                  setBankSearchQuery('');
                                }}
                                className={`text-left font-sans text-xs px-2.5 py-2 hover:bg-muted/35 transition-all w-full truncate border-none ${
                                  selectedBankId === b.id ? 'bg-foreground text-background font-bold' : 'bg-transparent text-foreground'
                                }`}
                              >
                                {b.name}
                              </button>
                            ))}
                          {banks.filter(b => b.name.toLowerCase().includes(bankSearchQuery.toLowerCase())).length === 0 && (
                            <span className="text-center font-sans text-[10px] text-muted-foreground py-3">Nenhum emissor encontrado</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {simulatorData ? (
              <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-0 mt-0.5 overflow-hidden">
                {/* Left Column - Selection & Scores Details */}
                <div className="w-full md:w-[280px] shrink-0 flex flex-col gap-3 overflow-y-auto pr-1 scrollbar-thin h-full max-h-full min-h-0">
                  {/* Selected Bank Metadata Card */}
                  <div className="bg-muted/10 p-4 border border-border/30 rounded-none">
                    <div className="flex flex-col gap-1.5">
                      <span className="font-sans text-[7px] font-black uppercase tracking-widest text-muted-foreground">Emissor Selecionado</span>
                      <h3 className="font-serif text-base font-bold text-foreground leading-tight truncate" title={simulatorData.bankName}>{simulatorData.bankName}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="font-mono text-[9px] text-muted-foreground bg-muted/40 px-2 py-0.5 border border-border/10">CNPJ: {selectedBank?.cnpj}</span>
                        <span className="font-mono text-[9px] text-muted-foreground bg-muted/40 px-2 py-0.5 border border-border/10">SEG: {selectedBank?.segmento || 'S/S'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Score Radial Dials or Knockout panels */}
                  <div className="bg-muted/5 border border-border/30 p-5 rounded-none flex flex-col items-center justify-center gap-3.5 min-h-[220px] h-fit shrink-0">
                    {simulatorData.isKnockedOut ? (
                      <div className="flex flex-col items-center justify-center p-4 border border-rose-500/30 bg-rose-500/10 rounded-none w-full">
                        <span className="font-sans text-[7px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Score de Risco</span>
                        <span className="font-serif text-lg font-black text-rose-600 dark:text-rose-400 mt-1">INVIÁVEL</span>
                        <span className="font-sans text-[7px] font-bold text-rose-500/70 mt-1 text-center">Knockout Ativado</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 w-full">
                        <div className={`relative flex items-center justify-center h-20 w-20 rounded-full border-4 shrink-0 shadow-lg ${
                          simulatorData.totalWeightedScore >= 9.0 ? 'border-blue-500/30 shadow-blue-500/10' :
                          simulatorData.totalWeightedScore >= 7.0 ? 'border-emerald-500/30 shadow-emerald-500/10' :
                          simulatorData.totalWeightedScore >= 4.0 ? 'border-amber-500/30 shadow-amber-500/10' :
                          'border-rose-500/30 shadow-rose-500/10'
                        }`}>
                          <span className="font-serif text-lg font-black text-foreground">
                            {simulatorData.totalWeightedScore.toFixed(1)}
                          </span>
                          <div className="absolute -inset-1 rounded-full border border-dashed border-foreground/15 animate-spin" style={{ animationDuration: '25s' }} />
                        </div>

                        <div className="flex flex-col items-center text-center">
                          <span className="font-sans text-[7px] font-black text-muted-foreground uppercase tracking-widest">Score Ponderado</span>
                          <span className="font-serif text-2xl font-black text-foreground leading-none mt-1">{simulatorData.totalWeightedScore.toFixed(2)}</span>
                          <span className={`font-sans text-[8px] font-bold uppercase tracking-wider mt-1.5 whitespace-nowrap px-2.5 py-0.5 rounded-none border inline-block text-center ${
                            simulatorData.totalWeightedScore >= 9.0 
                              ? 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400' 
                              : simulatorData.totalWeightedScore >= 7.0 
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                              : simulatorData.totalWeightedScore >= 4.0
                              ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                              : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
                          }`}>
                            {simulatorData.totalWeightedScore >= 9.0 ? 'Muito Bom' : simulatorData.totalWeightedScore >= 7.0 ? 'Bom' : simulatorData.totalWeightedScore >= 4.0 ? 'Moderado' : 'Ruim'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Knockout Reason card if applicable */}
                  {simulatorData.isKnockedOut && simulatorData.knockoutReasons.length > 0 && (
                    <div className="bg-rose-500/5 border border-rose-500/10 p-2.5 text-[10px] font-sans text-rose-600 rounded-none leading-relaxed max-h-[100px] overflow-y-auto scrollbar-thin select-text shrink-0">
                      <strong>Motivos de Inviabilidade:</strong> {simulatorData.knockoutReasons.join(', ')}
                    </div>
                  )}

                  {/* Perfil de Métricas do Emissor - Bloomberg Style */}
                  <div className="bg-muted/5 border border-border/30 p-3.5 rounded-none flex flex-col gap-2 min-h-[220px] h-fit shrink-0 overflow-hidden">
                    <span className="font-sans text-[8px] font-black uppercase tracking-widest text-muted-foreground block border-b border-border/20 pb-1.5">
                      Perfil de Métricas Regulatórias
                    </span>
                    <div className="overflow-y-auto scrollbar-thin pr-1 flex flex-col gap-1.5 text-[10px] font-sans">
                      {[
                        { label: 'Basileia (IB)', val: selectedBank?.ib, unit: '%', key: 'ib' },
                        { label: 'Capital CET1', val: selectedBank?.cet1, unit: '%', key: 'cet1' },
                        { label: 'Alavancagem', val: selectedBank?.razao_alavancagem, unit: '%', key: 'razao_alavancagem' },
                        { label: 'Proxy Liquidez IAL', val: selectedBank?.proxy_liquidez_ial, unit: '%', key: 'proxy_liquidez_ial' },
                        { label: 'Inadimplência (II)', val: selectedBank?.ii, unit: '%', key: 'ii' },
                        { label: 'Provisões (ICP)', val: selectedBank?.icp, unit: '%', key: 'icp' },
                        { label: 'Dep. Vista / Funding', val: selectedBank?.deposito_vista_funding, unit: '%', key: 'deposito_vista_funding' },
                        { label: 'Retorno s/ Patrimônio (ROE)', val: selectedBank?.roe, unit: '%', key: 'roe' },
                        { label: 'Retorno s/ Ativo (ROA)', val: selectedBank?.roa, unit: '%', key: 'roa' },
                        { label: 'Eficiência (IE)', val: selectedBank?.ie, unit: '%', key: 'ie' },
                        { label: 'Ativo Total', val: selectedBank?.ativo_total, unit: ' Bi', key: 'ativo_total' },
                        { label: 'Carteira de Crédito', val: selectedBank?.carteira_credito, unit: ' Bi', key: 'carteira_credito' },
                        { label: 'Tend. Cresc. Carteira', val: selectedBank?.tendencia_crescimento_carteira, unit: '%', key: 'tendencia_crescimento_carteira' },
                        { label: 'Tend. CET1', val: selectedBank?.tendencia_cet1, unit: ' pp', key: 'tendencia_cet1' },
                        { label: 'Tend. ROA', val: selectedBank?.tendencia_roa, unit: ' pp', key: 'tendencia_roa' },
                        { label: 'Tend. LDR', val: selectedBank?.tendencia_ldr, unit: ' pp', key: 'tendencia_ldr' },
                        { label: 'Tend. Proxy IAL', val: selectedBank?.tendencia_proxy_liquidez, unit: ' pp', key: 'tendencia_proxy_liquidez' }
                      ].map(item => {
                        const val = item.val;
                        const displayVal = (val !== undefined && val !== null) ? `${Number(val).toFixed(2)}${item.unit}` : 'N/I';
                        return (
                          <div key={item.key} className="flex items-center justify-between py-1 border-b border-border/10 hover:bg-muted/10 px-1 transition-all">
                            <span className="text-muted-foreground font-medium">{item.label}</span>
                            <span className="font-mono font-bold text-foreground">{displayVal}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column - Horizontal Dashboard Grid */}
                <div className="flex-1 flex flex-col gap-3 min-h-0 pl-0 md:pl-5 border-t md:border-t-0 md:border-l border-border/30 pt-3 md:pt-0 overflow-hidden h-full max-h-full">
                  {/* Scrollable steps container */}
                  <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin min-h-0 mb-1 flex flex-col gap-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {simulatorData.steps.filter(s => s.dimKey !== 'score_final').map((step, idx) => {
                        return (
                          <div 
                            key={step.dimKey} 
                            className="border border-border/40 p-3.5 bg-muted/5 hover:border-foreground/30 transition-all rounded-none flex flex-col justify-between min-h-[145px] h-auto"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-sans text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Etapa {idx + 1}</span>
                                <span className="font-mono text-xs font-black text-foreground">{step.result.toFixed(2)}</span>
                              </div>
                              <h4 className="font-serif text-xs font-bold text-foreground truncate mb-1.5">{step.dimLabel}</h4>
                              
                              {/* Editable Simulation Formula */}
                              <div className="bg-background border border-border/60 font-mono text-[9.5px] text-foreground p-1 rounded-none flex items-center justify-between overflow-hidden mb-1.5 relative">
                                <SimulationFormulaInput
                                  initialValue={simulationFormulas[step.dimKey] ?? step.formula}
                                  onChange={(val) => setSimulationFormulas(prev => ({ ...prev, [step.dimKey]: val }))}
                                  className="w-full bg-transparent font-mono text-[9.5px] text-foreground font-bold p-1 outline-none focus-visible:ring-0 select-text border-none pr-8"
                                  title="Fórmula de Simulação (Altere livremente para testar!)"
                                />
                                <span className="text-muted-foreground shrink-0 font-bold bg-background/90 pl-1 z-10 absolute right-1">➔ {step.result.toFixed(2)}</span>
                              </div>
                            </div>

                            {step.variablesUsed.length > 0 && (
                              <div className="flex flex-wrap gap-1 border-t border-border/10 pt-1.5 overflow-x-auto scrollbar-none">
                                {step.variablesUsed.map(v => (
                                  <span key={v.key} className="font-sans text-[8px] text-muted-foreground bg-background px-1 py-0.5 border border-border/20 rounded-none flex items-center gap-0.5 shrink-0" title={`${v.key} = ${v.val}`}>
                                    <code className="font-mono text-foreground/75 font-semibold text-[8px]">{v.key}</code>
                                    <strong className="font-mono text-foreground font-black">{v.val}</strong>
                                  </span>
                                ))}
                              </div>
                            )}

                            {step.errorMsg && (
                              <span className="font-sans text-[8px] text-rose-500 mt-1 leading-tight block font-bold">
                                Erro: {step.errorMsg}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Score Final strip */}
                  {(() => {
                    const finalStep = simulatorData.steps.find(s => s.dimKey === 'score_final');
                    if (!finalStep) return null;
                    return (
                      <div className="border border-foreground/30 bg-foreground/[0.01] p-3 rounded-none flex items-center justify-between gap-4 h-[55px] mt-0.5 shrink-0 select-none">
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-[8px] font-black uppercase tracking-widest text-muted-foreground bg-muted border border-border/30 px-1.5 py-0.5 rounded-none shrink-0">Etapa Final</span>
                          <h4 className="font-serif text-xs font-bold text-foreground whitespace-nowrap">{finalStep.dimLabel}</h4>
                        </div>
                        
                        {/* Editable Final Score Formula */}
                        <div className="flex-1 max-w-xl bg-background border border-border/60 font-mono text-[10px] text-foreground p-1 rounded-none flex items-center justify-between overflow-hidden relative">
                          <SimulationFormulaInput
                            initialValue={simulationFormulas['score_final'] ?? finalStep.formula}
                            onChange={(val) => setSimulationFormulas(prev => ({ ...prev, score_final: val }))}
                            className="w-full bg-transparent font-mono text-[10px] text-foreground font-bold p-1 px-2 outline-none focus-visible:ring-0 select-text border-none pr-8"
                            title="Fórmula de Simulação del Score Final"
                          />
                          <span className="text-muted-foreground shrink-0 font-bold bg-background/90 pl-1 z-10 absolute right-2">➔ {finalStep.result.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex items-baseline gap-1 shrink-0">
                          <span className="font-sans text-[8px] text-muted-foreground font-black uppercase tracking-wider">Nota Ponderada:</span>
                          <span className="font-mono text-sm font-black text-foreground">{finalStep.result.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center font-sans text-xs italic text-muted-foreground">
                Nenhum emissor selecionado para simulação.
              </div>
            )}
          </div>
        )}

        {activeTab === 'dicionario' && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden animate-in fade-in duration-200">
            <div className="border-b border-border/40 pb-3 mb-3 shrink-0 select-none">
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-sans text-[11px] font-black uppercase tracking-widest text-foreground">
                  Dicionário de Variáveis & Notas Classificadas
                </h4>
              </div>
              <p className="font-sans text-xs text-muted-foreground leading-relaxed">
                Entenda e configure a diferença entre a <strong>métrica bruta</strong> (ex: <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground font-mono">ib</code> = 15.5%) e a <strong>nota classificada</strong> (ex: <code className="bg-blue-500/15 dark:bg-blue-500/30 px-1.5 py-0.5 rounded text-[10px] text-blue-600 dark:text-blue-400 font-bold border border-blue-500/10 font-mono">ib_score</code> = 10.0) na modelagem algébrica.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-5 flex-1 min-h-0 mt-0.5 overflow-hidden">
              
              {/* Column 1 - Variables Sidebar List */}
              <div className="w-full md:w-[200px] shrink-0 border-b md:border-b-0 md:border-r border-border/30 pb-3 md:pb-0 md:pr-4 overflow-y-auto scrollbar-thin flex flex-col gap-3 select-none h-full max-h-full min-h-0">
                {VARIABLE_GROUPS.map(group => (
                  <div key={group.label} className="flex flex-col gap-1">
                    <span className="font-sans text-[7px] font-black text-muted-foreground/60 uppercase tracking-widest block px-1.5">
                      {group.label}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {group.variables.filter(v => !v.key.endsWith('_score')).map(v => {
                        const isSelected = selectedDictKey === v.key;
                        return (
                          <button
                            key={v.key}
                            onClick={() => handleSelectDictKey(v.key)}
                            className={`text-left font-sans text-xs px-2.5 py-2 transition-all cursor-pointer rounded-none border ${
                              isSelected 
                                ? 'bg-foreground border-foreground text-background font-bold shadow-xs' 
                                : 'bg-transparent border-transparent hover:bg-muted/10 text-foreground hover:border-border/30'
                            }`}
                          >
                            <div className="truncate font-semibold">{v.label.replace(' (Bruto)', '')}</div>
                            <div className={`font-mono text-[9px] mt-0.5 ${isSelected ? 'text-background/80' : 'text-muted-foreground'}`}>
                              {v.key} / {v.key}_score
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Main Content Area - Split in Two Horizontal Columns */}
              <div className="flex-1 flex flex-col lg:flex-row gap-5 min-h-0 h-full overflow-hidden">
                {/* Column 2 - Middle Column: Variable Identification, Parametric Ruler & Translation */}
                <div className="flex-1 flex flex-col gap-3 min-h-0 select-text overflow-y-auto pr-2 scrollbar-thin h-full max-h-full min-h-0">
                  {/* Variable Identification Card */}
                  <div className="border border-border/40 bg-muted/5 p-3 flex flex-col gap-2 rounded-none relative shrink-0">
                    <span className="font-sans text-[8px] font-black uppercase tracking-widest text-muted-foreground bg-muted border border-border/30 px-1.5 py-0.5 rounded-none self-start select-none">
                      Identificação da Variável
                    </span>
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif text-base font-bold text-foreground select-none">
                        {activeParam.label}
                      </h4>
                      <span className="font-mono text-[9px] font-black text-foreground bg-muted border border-border/30 px-2 py-0.5 rounded-none select-none">
                        {activeParam.key} / {activeParam.key}_score
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mt-0.5 select-none">
                      <div className="bg-background border border-border/30 p-2 rounded-none flex items-center justify-between h-9">
                        <span className="font-sans text-[8px] font-black text-muted-foreground uppercase tracking-widest">Bruto:</span>
                        <code className="font-mono text-[10px] font-black text-foreground bg-muted/40 px-1.5 py-0.5 border border-border/10">{activeParam.key}</code>
                      </div>

                      <div className="bg-blue-500/5 border border-blue-500/15 p-2 rounded-none flex items-center justify-between h-9">
                        <span className="font-sans text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Nota:</span>
                        <code className="font-mono text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 border border-blue-500/10">{activeParam.key}_score</code>
                      </div>
                    </div>
                  </div>

                  {/* Quality Ranges (Faixas) Card */}
                  <div className="border border-border/30 bg-muted/5 p-3 flex flex-col gap-2.5 rounded-none shrink-0">
                    <span className="font-sans text-[8px] font-black uppercase tracking-widest text-muted-foreground select-none">
                      Régua Paramétrica de Notas (Faixas da Metodologia)
                    </span>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center text-[9px] justify-between text-muted-foreground bg-muted/10 border border-border/20 px-2.5 py-1.5 rounded-none select-none">
                        <span>Diretriz do Indicador:</span>
                        <span className="font-bold text-foreground text-[8.5px] uppercase tracking-wider">
                          {activeParam.direction === 'higher_is_better' ? 'Quanto MAIOR o valor, melhor 📈' : 'Quanto MENOR o valor, melhor 📉'}
                        </span>
                      </div>

                      <div className="relative w-full h-2.5 rounded-none mt-1 select-none" style={{
                        background: activeParam.direction === 'higher_is_better' 
                          ? 'linear-gradient(to right, rgb(239, 68, 68), rgb(245, 158, 11), rgb(16, 185, 129), rgb(59, 130, 246))'
                          : 'linear-gradient(to right, rgb(59, 130, 246), rgb(16, 185, 129), rgb(245, 158, 11), rgb(239, 68, 68))'
                      }}>
                        <div className="absolute left-[25%] -top-1 bottom-1.5 w-[1.5px] bg-background border border-foreground/20" title="Limite Moderado" />
                        <div className="absolute left-[50%] -top-1 bottom-1.5 w-[1.5px] bg-background border border-foreground/20" title="Limite Bom" />
                        <div className="absolute left-[75%] -top-1 bottom-1.5 w-[1.5px] bg-background border border-foreground/20" title="Limite Muito Bom" />
                      </div>

                      <div className="grid grid-cols-4 text-center font-sans text-[8px] font-black text-muted-foreground/60 uppercase tracking-wider mt-0.5 select-none">
                        <span className="text-rose-500">Ruim</span>
                        <span className="text-amber-500">Moderado</span>
                        <span className="text-emerald-500">Bom</span>
                        <span className="text-blue-500">Muito Bom</span>
                      </div>

                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2 text-[9.5px] font-sans border border-border/20 bg-muted/5 p-2 rounded-none mt-1">
                        <div className="flex flex-col gap-0.5 p-1.5 border border-border/10 bg-background rounded-none">
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
                            <span className="font-sans text-[8px] font-black uppercase tracking-widest text-foreground">Muito Bom</span>
                          </span>
                          <span className="font-mono font-bold text-foreground text-[10px] mt-0.5 truncate">
                            {activeParam.direction === 'higher_is_better' 
                              ? `> ${activeParam.limite_muito_bom}${activeParam.unit}` 
                              : `< ${activeParam.limite_muito_bom}${activeParam.unit}`}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5 p-1.5 border border-border/10 bg-background rounded-none">
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-sans text-[8px] font-black uppercase tracking-widest text-foreground/90">Bom</span>
                          </span>
                          <span className="font-mono font-bold text-foreground/95 text-[10px] mt-0.5 truncate">
                            {activeParam.direction === 'higher_is_better'
                              ? `[${activeParam.limite_bom}, ${activeParam.limite_muito_bom}]${activeParam.unit}`
                              : `[${activeParam.limite_muito_bom}, ${activeParam.limite_bom}]${activeParam.unit}`}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5 p-1.5 border border-border/10 bg-background rounded-none">
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span className="font-sans text-[8px] font-black uppercase tracking-widest text-muted-foreground">Moderado</span>
                          </span>
                          <span className="font-mono font-bold text-muted-foreground text-[10px] mt-0.5 truncate">
                            {activeParam.direction === 'higher_is_better'
                              ? `[${activeParam.limite_moderado}, ${activeParam.limite_bom}[${activeParam.unit}`
                              : `]${activeParam.limite_bom}, ${activeParam.limite_moderado}]${activeParam.unit}`}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5 p-1.5 border border-border/10 bg-background rounded-none">
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="font-sans text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-70">Ruim</span>
                          </span>
                          <span className="font-mono font-bold text-muted-foreground text-[10px] mt-0.5 truncate">
                            {activeParam.direction === 'higher_is_better'
                              ? `< ${activeParam.limite_moderado}${activeParam.unit}`
                              : `> ${activeParam.limite_moderado}${activeParam.unit}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tradução por Expressão Algébrica Card */}
                  <div className="flex flex-col gap-2 border border-border/30 bg-muted/5 p-3 rounded-none shrink-0">
                    <span className="font-sans text-[8px] font-black uppercase tracking-widest text-foreground select-none">
                      Tradução por Expressão Algébrica
                    </span>
                    <p className="font-sans text-[10px] text-muted-foreground leading-relaxed -mt-1 select-none">
                      Define rigorosamente como a métrica bruta é convertida em nota contínua. Edite e use os atalhos matemáticos abaixo.
                    </p>
                    
                    <div className="flex flex-col gap-2 mt-1">
                      <div className="flex flex-col gap-2 bg-muted/15 border border-border/40 p-3 rounded-none mb-1 select-none">
                        <div className="flex items-center justify-between border-b border-border/10 pb-1.5 mb-1">
                          <span className="font-sans text-[8px] font-black uppercase tracking-widest text-foreground">
                            Fluxo de Tradução Matemática
                          </span>
                          <span className="font-mono text-[9px] font-bold text-muted-foreground">
                            {activeParam.key} ➔ {activeParam.key}_score
                          </span>
                        </div>
                        <div className="flex flex-col gap-1.5 font-sans text-xs text-muted-foreground leading-relaxed">
                          <p className="text-[11px] leading-relaxed">
                            A nota classificada <code className="font-mono bg-muted px-1 py-0.5 text-foreground font-bold text-[9px]">{activeParam.key}_score</code> é obtida aplicando a função contínua sobre o valor bruto <code className="font-mono bg-muted px-1 py-0.5 text-foreground font-bold text-[9px]">{activeParam.key}</code> (inserido na equação como <code className="font-mono bg-muted px-1 py-0.5 text-foreground font-bold text-[9px]">{activeParam.key}</code> ou <code className="font-mono bg-muted px-1 py-0.5 text-foreground font-bold text-[9px]">x</code>).
                          </p>
                          <div className="bg-background border border-border/10 p-2.5 rounded-none flex flex-col gap-1 text-[11px] mt-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-foreground">Equação Geral:</span>
                              <code className="font-mono font-black text-foreground">
                                {activeParam.key}_score = f(x)
                              </code>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 border-t border-border/5 pt-1">
                              <span className="font-bold text-foreground">Cálculo no Playground:</span>
                              <span>
                                Se <code className="font-mono bg-muted px-1 text-foreground">{activeParam.key} = {playgroundVal}</code>
                              </span>
                              <ArrowRight className="h-3 w-3 inline text-muted-foreground" />
                              <span className="font-mono font-black text-foreground bg-muted/30 px-1.5 py-0.5 border border-border/10">
                                {activeParam.key}_score = {playgroundResult.score.toFixed(2)} / 10.0
                              </span>
                              <span className="text-[9.5px] text-muted-foreground">
                                (ou {(playgroundResult.score * 10).toFixed(0)} na escala contínua de 0 a 100)
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start border border-border/60 bg-background hover:border-foreground focus-within:border-foreground p-2 rounded-none transition-all">
                        <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 shrink-0 pt-2 px-1 select-none">
                          {activeParam.key}_score =
                        </span>
                        <textarea
                          id="textarea-dict-formula"
                          value={formulaScoreState}
                          onChange={(e) => setFormulaScoreState(e.target.value)}
                          placeholder="Ex: min(10, max(0, (x - 11) * 2.5))"
                          rows={2}
                          className="w-full bg-transparent border-none text-foreground font-mono text-xs p-1 outline-none resize-none focus:ring-0 focus-visible:ring-0 select-text"
                        />
                      </div>

                      {/* Mathematical Helper Panel for Variable Translation */}
                      <div className="flex flex-col gap-2 border-t border-border/20 pt-3 mt-1.5 select-none">
                        <span className="font-sans text-[8px] font-bold uppercase tracking-widest text-muted-foreground">
                          Atalhos de Modelagem
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {STANDARD_OPERATORS.map(op => (
                            <button
                              key={op}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => insertDictToken(op)}
                              className="font-mono text-[10px] font-bold px-2.5 py-1 border border-border/60 bg-background hover:border-foreground hover:bg-foreground/5 cursor-pointer rounded-xs active:scale-95 transition-all text-foreground"
                            >
                              {op}
                            </button>
                          ))}
                          {MATH_FUNCTIONS.map(fn => (
                            <button
                              key={fn.key}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => insertDictToken(fn.key)}
                              className="font-mono text-[8.5px] font-bold px-2 py-1 border border-border/60 bg-background hover:border-foreground hover:bg-foreground/5 cursor-pointer rounded-xs active:scale-95 transition-all text-foreground"
                              title={fn.label}
                            >
                              {fn.key.replace('(', '')}()
                            </button>
                          ))}
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => insertDictToken('x')}
                            className="font-mono text-[9px] font-bold px-2.5 py-1 border border-blue-500/20 bg-blue-500/5 hover:border-blue-500 hover:bg-blue-500/10 cursor-pointer rounded-xs active:scale-95 transition-all text-blue-600 dark:text-blue-400"
                            title="Inserir variável bruta (x)"
                          >
                            x
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => insertDictToken(activeParam.key)}
                            className="font-mono text-[9px] font-bold px-2.5 py-1 border border-blue-500/20 bg-blue-500/5 hover:border-blue-500 hover:bg-blue-500/10 cursor-pointer rounded-xs active:scale-95 transition-all text-blue-600 dark:text-blue-400"
                            title={`Inserir chave bruta (${activeParam.key})`}
                          >
                            {activeParam.key}
                          </button>
                        </div>
                      </div>

                      {(() => {
                        const defaultFormula = getDefaultFormulaForIndicator(activeParam);
                        const savedFormula = activeParam.formula_score || '';
                        const hasChanges = (formulaScoreState || '').trim() !== (savedFormula || defaultFormula).trim();
                        const syntaxError = formulaScoreState.trim() !== '' ? validateFormulaSyntax(formulaScoreState, [activeParam.key, 'x']) : null;
                        
                        return (
                          <div className="flex items-center justify-between mt-1.5 select-none h-7">
                            <div>
                              {formulaScoreState.trim() === '' ? (
                                <span className="font-sans text-[8px] text-muted-foreground uppercase tracking-widest bg-muted border border-border/30 px-2 py-0.5 rounded-none font-bold">Faixas Ativas</span>
                              ) : syntaxError ? (
                                <span className="font-sans text-[8px] text-rose-600 uppercase tracking-widest bg-rose-500/5 px-2 py-0.5 border border-rose-500/20 rounded-none font-black">Sintaxe Inválida</span>
                              ) : (
                                <span className="font-sans text-[8px] text-emerald-600 uppercase tracking-widest bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/20 rounded-none font-black">Sintaxe Válida</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1.5">
                              {savedFormula.trim() !== '' && (
                                <button
                                  onClick={() => setFormulaScoreState(defaultFormula)}
                                  className="px-2 py-1 text-[8px] font-sans font-black uppercase tracking-widest border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded-none"
                                  title="Restaurar fórmula padrão da Metodologia"
                                >
                                  Restaurar Padrão
                                </button>
                              )}
                              {hasChanges && (
                                <>
                                  <button
                                    onClick={() => setFormulaScoreState(savedFormula || defaultFormula)}
                                    className="px-2 py-1 text-[8px] font-sans font-black uppercase tracking-widest border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer rounded-none"
                                  >
                                    Descartar
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (syntaxError) return;
                                      setIsSaving(true);
                                      try {
                                        await onUpdateParameter(activeParam.key, {
                                          formula_score: formulaScoreState.trim()
                                        });
                                      } catch (err) {
                                        console.error(err);
                                      } finally {
                                        setIsSaving(false);
                                      }
                                    }}
                                    disabled={isSaving || syntaxError !== null}
                                    className="px-2.5 py-1 text-[8px] font-sans font-black uppercase tracking-widest bg-foreground text-background border border-foreground hover:bg-foreground/90 disabled:opacity-50 cursor-pointer rounded-none font-bold"
                                  >
                                    {isSaving ? 'Salvando...' : 'Salvar Formula'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Column 3 - Right Column: Live Playground & MetricCalculatorService widget */}
                <div className="flex-1 flex flex-col gap-3 min-h-0 pl-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-border/30 pt-4 lg:pt-0 select-text overflow-y-auto pr-2 scrollbar-thin h-full max-h-full min-h-0">
                  {/* Live Playground Card */}
                  <div className="border border-border/30 bg-muted/5 p-3 flex flex-col gap-2.5 rounded-none shrink-0 select-none">
                    <span className="font-sans text-[8px] font-black uppercase tracking-widest text-foreground">
                      Live Playground — Simular Conversão de Nota
                    </span>
                    
                    <div className="flex items-center gap-3 mt-0.5">
                      <div className="flex-1 flex items-center bg-background border border-border/60 px-2.5 py-1.5 rounded-none h-9">
                        <span className="text-[9px] font-mono font-bold text-muted-foreground shrink-0 pr-1.5">VALOR:</span>
                        <input
                          type="number"
                          value={playgroundVal}
                          onChange={(e) => setPlaygroundVal(e.target.value)}
                          className="w-full bg-transparent border-none text-xs font-mono outline-none text-foreground select-text"
                          placeholder="Digite..."
                          step="any"
                        />
                        <span className="text-[9px] font-sans font-bold text-muted-foreground pl-1.5 shrink-0 border-l border-border/20">
                          {activeParam.unit}
                        </span>
                      </div>

                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-50 shrink-0" />

                      <div className={`px-2.5 py-1.5 rounded-none border flex items-center justify-between gap-3 flex-1 h-9 shadow-xs ${
                        playgroundResult.rating === 'muito_bom' 
                          ? 'bg-blue-500/5 border-blue-500/30 text-blue-700 dark:text-blue-400'
                          : playgroundResult.rating === 'bom'
                          ? 'bg-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                          : playgroundResult.rating === 'moderado'
                          ? 'bg-amber-500/5 border-amber-500/30 text-amber-700 dark:text-amber-400'
                          : 'bg-rose-500/5 border-rose-500/30 text-rose-700 dark:text-rose-400'
                      }`}>
                        <div className="flex flex-col">
                          <span className="font-sans text-[6px] font-black uppercase tracking-widest text-muted-foreground">Classificação</span>
                          <span className="font-sans text-[8.5px] font-black uppercase tracking-widest truncate max-w-[90px]">
                            {playgroundResult.label}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-0.5 bg-background px-2 py-0.5 border border-border/20 rounded-none shrink-0">
                          <span className="font-sans text-[7px] font-bold text-muted-foreground uppercase">Nota</span>
                          <span className="font-serif text-xs font-black text-foreground">
                            {playgroundResult.score.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MetricCalculatorService Continuous score comparison widget */}
                  {(() => {
                    const continuousConfig = indicatorsConfig[activeParam.key];
                    const numVal = parseFloat(playgroundVal);
                    
                    let continuousScore = 0;
                    let isCustomFormulaActive = false;
                    let isCustomFormulaValid = false;
                    let formulaErrorMsg: string | null = null;

                    if (formulaScoreState && formulaScoreState.trim() !== '') {
                      isCustomFormulaActive = true;
                      const syntaxError = validateFormulaSyntax(formulaScoreState, [activeParam.key, 'x']);
                      if (syntaxError === null) {
                        isCustomFormulaValid = true;
                        if (!isNaN(numVal)) {
                          try {
                            const bindings = {
                              [activeParam.key]: numVal,
                              x: numVal
                            };
                            const discreteScore = evaluateFormula(formulaScoreState, bindings);
                            const clampedDiscrete = Math.max(0, Math.min(10, discreteScore));
                            continuousScore = clampedDiscrete * 10;
                          } catch (e: any) {
                            formulaErrorMsg = e.message || 'Erro de cálculo.';
                          }
                        }
                      } else {
                        formulaErrorMsg = syntaxError;
                      }
                    } else if (continuousConfig && !isNaN(numVal)) {
                      continuousScore = calculateScore(numVal, continuousConfig.tipoCurva, continuousConfig.piso, continuousConfig.teto);
                    }

                    if (!continuousConfig && !isCustomFormulaActive) return null;

                    return (
                        <div className="border border-border/40 bg-muted/5 p-4 flex flex-col gap-3 rounded-none shrink-0 select-none">
                          <div className="flex items-center justify-between border-b border-border/10 pb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/45" />
                              <span className="font-sans text-[8.5px] font-black uppercase tracking-widest text-foreground">
                                Calculadora Contínua (MetricCalculatorService)
                              </span>
                            </div>
                            <span className="font-sans text-[7px] font-bold uppercase tracking-wider bg-background text-muted-foreground px-2 py-0.5 rounded-none border border-border/20">
                              {isCustomFormulaActive ? 'Tradução Reativa' : 'Sem Cliff Effect'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between gap-4">
                            <div className="flex flex-col gap-1 max-w-[60%]">
                              <span className="font-sans text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
                                {isCustomFormulaActive ? 'Expressão Algébrica Ativa' : 'Curva Matemática Ativa'}
                              </span>
                              {isCustomFormulaActive ? (
                                isCustomFormulaValid ? (
                                  <div className="flex flex-col gap-0.5">
                                    <code className="font-mono text-[9px] font-bold text-foreground bg-background px-2 py-0.5 border border-border/10 self-start truncate max-w-full" title={formulaScoreState}>
                                      {formulaScoreState}
                                    </code>
                                    <span className="text-[7.5px] text-muted-foreground font-sans font-medium">✓ Avaliação Reativa Ativa</span>
                                  </div>
                                ) : (
                                  <span className="text-[8px] font-sans text-rose-500 font-bold block bg-rose-500/5 px-2 py-0.5 border border-rose-500/10 self-start">
                                    ⚠️ Sintaxe Inválida
                                  </span>
                                )
                              ) : (
                                <div className="flex flex-col gap-0.5">
                                  <code className="font-mono text-[9.5px] font-bold text-foreground bg-background px-2 py-0.5 border border-border/10 self-start">
                                    {continuousConfig?.tipoCurva}
                                  </code>
                                  <div className="flex gap-2 text-[8px] text-muted-foreground mt-0.5">
                                    <span>Piso: <strong>{continuousConfig?.piso}</strong></span>
                                    <span>|</span>
                                    <span>Teto: <strong>{continuousConfig?.teto}</strong></span>
                                  </div>
                                </div>
                              )}
                              {formulaErrorMsg && (
                                <span className="text-[7.5px] font-sans font-bold text-rose-500 mt-0.5 block truncate max-w-full" title={formulaErrorMsg}>
                                  Erro: {formulaErrorMsg}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-end">
                                <span className="font-sans text-[6px] font-black uppercase tracking-widest text-muted-foreground">Score Contínuo</span>
                                <span className="font-serif text-xl font-black text-foreground leading-none mt-0.5">
                                  {continuousScore.toFixed(2)}
                                </span>
                                <span className="font-sans text-[6px] text-muted-foreground font-semibold mt-0.5">escala 0-100</span>
                              </div>
                              
                              <div className="h-10 w-10 shrink-0 rounded-none border border-foreground/30 flex items-center justify-center relative bg-background">
                                <span className="font-mono text-[10px] font-black text-foreground">
                                  {Math.round(continuousScore)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Horizontal Progress Bar */}
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="w-full bg-muted/20 h-1.5 rounded-none border border-border/10 overflow-hidden relative">
                              <div 
                                className="bg-foreground h-full transition-all duration-300" 
                                style={{ width: `${continuousScore}%` }} 
                              />
                            </div>
                            <div className="flex justify-between text-[7px] text-muted-foreground font-mono">
                              <span>0.0</span>
                              <span>50.0</span>
                              <span>100.0</span>
                            </div>
                          </div>
                        </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
