import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { evaluateFormula } from '@/lib/formulaParser';
import { 
  Database, 
  Upload, 
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Newspaper,
  Sliders
} from 'lucide-react';
import Papa from 'papaparse';
// @ts-ignore
import rawSelicData from '../../historico_selic_over.csv?raw';

interface SelicPoint {
  date: string;
  rate: number;
}


function parseNumber(value: any): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  
  let cleaned = String(value).replace('%', '').trim();
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}


function downsample(data: SelicPoint[], maxPoints: number): SelicPoint[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  const result: SelicPoint[] = [];
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }
  if (result[result.length - 1] !== data[data.length - 1]) {
    result.push(data[data.length - 1]);
  }
  return result;
}

export function IndexerDataPage() {
  const [isLoading, setIsLoading] = useState(true);


  // Macro Indicators (5 Variables)
  const [jurosAtuais, setJurosAtuais] = useState(10.50);
  const [jurosAtuaisStr, setJurosAtuaisStr] = useState("10.50");

  const [expectativaJurosBacen2029, setExpectativaJurosBacen2029] = useState(9.75);
  const [expectativaJurosBacen2029Str, setExpectativaJurosBacen2029Str] = useState("9.75");

  const [jurosFuturosD1f29, setJurosFuturosD1f29] = useState(11.20);
  const [jurosFuturosD1f29Str, setJurosFuturosD1f29Str] = useState("11.20");

  const [valorTaxaPrefixada2029, setValorTaxaPrefixada2029] = useState(11.50);
  const [valorTaxaPrefixada2029Str, setValorTaxaPrefixada2029Str] = useState("11.50");

  const [taxaMediaHistorica, setTaxaMediaHistorica] = useState(8.50);
  const [taxaMediaHistoricaStr, setTaxaMediaHistoricaStr] = useState("8.50");

  // Expectativa Própria Formula & Subtabs
  const [expectativaPropriaFormula, setExpectativaPropriaFormula] = useState(() => {
    return localStorage.getItem('hfc_expectativa_propria_formula') || "J_atual - mult_ef";
  });
  const [activeSubTab, setActiveSubTab] = useState<'modelagem' | 'variaveis'>('modelagem');

  // Custom variables
  const [customVariables, setCustomVariables] = useState<Array<{
    id: string;
    name: string;
    code: string;
    value: number;
    min: number;
    max: number;
    step: number;
  }>>(() => {
    const saved = localStorage.getItem('hfc_custom_variables');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return [
      {
        id: "1",
        name: "Multiplicador de eficiência",
        code: "mult_ef",
        value: 1.50,
        min: 0,
        max: 5,
        step: 0.1
      }
    ];
  });

  // Form states
  const [newVarName, setNewVarName] = useState('');
  const [newVarCode, setNewVarCode] = useState('');
  const [newVarMin, setNewVarMin] = useState(0);
  const [newVarMax, setNewVarMax] = useState(10);
  const [newVarValue, setNewVarValue] = useState(1);
  const [newVarError, setNewVarError] = useState('');

  // Historical Selic Real states
  const [selicHistory, setSelicHistory] = useState<SelicPoint[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<SelicPoint[]>([]);
  const [timeFilter, setTimeFilter] = useState<'1y' | '2y' | '5y' | '10y' | 'all'>('all');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; data: SelicPoint } | null>(null);

  // CSV Importer States
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastUpload, setLastUpload] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // News Radar States
  const [newsTags, setNewsTags] = useState<string[]>(['Taxa Selic', 'IPCA', 'Juros Brasil']);
  const [newTagInput, setNewTagInput] = useState('');
  const [newsItems, setNewsItems] = useState<{
    termo_pesquisado: string;
    titulo: string;
    fonte: string;
    data_publicacao: string;
    link_url: string;
  }[]>([]);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [isNewsOpen, setIsNewsOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // SVG Chart Sizing (scaled responsive coordinates)
  const paddingX = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartWidth = 800 - paddingX - paddingRight;
  const chartHeight = 240 - paddingTop - paddingBottom;

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  // Helper updaters to keep text inputs and ranges synchronized
  const updateJurosAtuais = (val: number | string) => {
    if (typeof val === 'number') {
      setJurosAtuais(val);
      setJurosAtuaisStr(val.toString());
    } else {
      setJurosAtuaisStr(val);
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        setJurosAtuais(parsed);
      }
    }
  };

  const updateExpectativaJurosBacen2029 = (val: number | string) => {
    if (typeof val === 'number') {
      setExpectativaJurosBacen2029(val);
      setExpectativaJurosBacen2029Str(val.toString());
    } else {
      setExpectativaJurosBacen2029Str(val);
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        setExpectativaJurosBacen2029(parsed);
      }
    }
  };

  const updateJurosFuturosD1f29 = (val: number | string) => {
    if (typeof val === 'number') {
      setJurosFuturosD1f29(val);
      setJurosFuturosD1f29Str(val.toString());
    } else {
      setJurosFuturosD1f29Str(val);
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        setJurosFuturosD1f29(parsed);
      }
    }
  };

  const updateValorTaxaPrefixada2029 = (val: number | string) => {
    if (typeof val === 'number') {
      setValorTaxaPrefixada2029(val);
      setValorTaxaPrefixada2029Str(val.toString());
    } else {
      setValorTaxaPrefixada2029Str(val);
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        setValorTaxaPrefixada2029(parsed);
      }
    }
  };

  const updateTaxaMediaHistorica = (val: number | string) => {
    if (typeof val === 'number') {
      setTaxaMediaHistorica(val);
      setTaxaMediaHistoricaStr(val.toString());
    } else {
      setTaxaMediaHistoricaStr(val);
      const parsed = parseFloat(val);
      if (!isNaN(parsed)) {
        setTaxaMediaHistorica(parsed);
      }
    }
  };

  // Evaluate E_propria calculation in real-time
  const parsedExpectativaPropriaResult = useMemo(() => {
    // Bindings
    const bindings: Record<string, number> = {
      J_atual: jurosAtuais,
      juros_atuais: jurosAtuais,
      E_bacen: expectativaJurosBacen2029,
      expectativa_juros_bacen_2029: expectativaJurosBacen2029,
      J_futuro: jurosFuturosD1f29,
      juros_futuros_d1f29: jurosFuturosD1f29,
      T_pre: valorTaxaPrefixada2029,
      valor_taxa_prefixada_2029: valorTaxaPrefixada2029,
      T_hist: taxaMediaHistorica,
      taxa_media_historica: taxaMediaHistorica,
      e: Math.E,
      E: Math.E,
    };
    
    // Add custom variables values to bindings
    customVariables.forEach(v => {
      if (v.code && v.code.trim()) {
        bindings[v.code.trim()] = v.value;
      }
    });
    
    try {
      if (!expectativaPropriaFormula || expectativaPropriaFormula.trim() === '') {
        return { value: 10.00, error: 'Fórmula vazia.', isValid: false };
      }
      const val = evaluateFormula(expectativaPropriaFormula, bindings);
      return {
        value: Math.round(val * 100) / 100,
        error: null,
        isValid: true
      };
    } catch (e: any) {
      return {
        value: 10.00,
        error: e.message || 'Erro de cálculo.',
        isValid: false
      };
    }
  }, [
    expectativaPropriaFormula,
    jurosAtuais,
    expectativaJurosBacen2029,
    jurosFuturosD1f29,
    valorTaxaPrefixada2029,
    taxaMediaHistorica,
    customVariables
  ]);

  // Synchronize computed formula value to localStorage key hfc_expectativa_propria
  useEffect(() => {
    if (parsedExpectativaPropriaResult.isValid) {
      localStorage.setItem('hfc_expectativa_propria', String(parsedExpectativaPropriaResult.value));
    }
  }, [parsedExpectativaPropriaResult]);

  const handleAddCustomVariable = (e: React.FormEvent) => {
    e.preventDefault();
    setNewVarError('');
    const cleanCode = newVarCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    const cleanName = newVarName.trim();
    
    if (!cleanCode) {
      setNewVarError('Código inválido.');
      return;
    }
    
    // Check conflicts with macro variables
    const reserved = ['j_atual', 'juros_atuais', 'e_bacen', 'expectativa_juros_bacen_2029', 'j_futuro', 'juros_futuros_d1f29', 't_pre', 'valor_taxa_prefixada_2029', 't_hist', 'taxa_media_historica', 'e', 'expectativa_propria', 'e_propria'];
    if (reserved.includes(cleanCode)) {
      setNewVarError(`O código "${cleanCode}" é reservado pelo sistema.`);
      return;
    }
    
    // Check duplicates
    if (customVariables.some(v => v.code === cleanCode)) {
      setNewVarError(`A variável "${cleanCode}" já existe.`);
      return;
    }
    
    const newVar = {
      id: Date.now().toString(),
      name: cleanName,
      code: cleanCode,
      value: newVarValue,
      min: newVarMin,
      max: newVarMax,
      step: (newVarMax - newVarMin) / 100 > 0 ? Math.round(((newVarMax - newVarMin) / 100) * 100) / 100 : 0.05
    };
    
    const updated = [...customVariables, newVar];
    setCustomVariables(updated);
    localStorage.setItem('hfc_custom_variables', JSON.stringify(updated));
    
    // Reset form
    setNewVarName('');
    setNewVarCode('');
    setNewVarMin(0);
    setNewVarMax(10);
    setNewVarValue(1);
  };

  const handleRemoveCustomVariable = async (id: string) => {
    const updated = customVariables.filter(v => v.id !== id);
    setCustomVariables(updated);
    localStorage.setItem('hfc_custom_variables', JSON.stringify(updated));
    try {
      await supabase
        .from('hfc_variaveis_customizadas')
        .delete()
        .eq('id', id);
    } catch (e) {
      console.error('Failed to delete custom variable from DB:', e);
    }
  };

  const handleCustomVariableSliderChange = (id: string, val: number) => {
    const updated = customVariables.map(v => {
      if (v.id === id) {
        const clamped = Math.max(v.min, Math.min(v.max, val));
        const rounded = Math.round(clamped * 100) / 100;
        return { ...v, value: rounded };
      }
      return v;
    });
    setCustomVariables(updated);
    localStorage.setItem('hfc_custom_variables', JSON.stringify(updated));
  };

  const loadSelicFromDB = async () => {
    try {
      let allData: any[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('historico_selic_real')
          .select('date, rate')
          .order('date', { ascending: true })
          .range(from, to);

        if (error) throw error;

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += 1000;
          to += 1000;
          if (data.length < 1000) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      if (allData.length > 0) {
        const formatted = allData.map((row: any) => ({
          date: row.date,
          rate: Number(row.rate) * 100 // Convert e.g. 0.1415 -> 14.15%
        }));
        setSelicHistory(formatted);
        return true;
      }
    } catch (e) {
      console.error('Error fetching Selic from DB:', e);
    }
    return false;
  };

  // Load Selic data (DB first, fallback to raw local CSV)
  useEffect(() => {
    async function initSelic() {
      const loaded = await loadSelicFromDB();
      if (!loaded) {
        console.log('Falling back to local raw CSV file for Selic history.');
        try {
          const parsed = Papa.parse(rawSelicData, {
            header: true,
            skipEmptyLines: true,
          });

          if (parsed.data) {
            const formatted: SelicPoint[] = parsed.data
              .map((row: any) => {
                const date = row['Date'] || row['date'] || row['Data'] || row['data'];
                const rateStr = row['Selic Over Anualizada (%)'] || row['Selic Real Efetiva (%)'] || row['rate'] || row['valor'];
                const rate = rateStr ? parseFloat(rateStr) : NaN;
                return { date, rate };
              })
              .filter((item) => item.date && !isNaN(item.rate));
            
            formatted.sort((a, b) => a.date.localeCompare(b.date));
            setSelicHistory(formatted);
          }
        } catch (e) {
          console.error('Error parsing raw local Selic CSV:', e);
        }
      }
    }
    initSelic();
  }, []);

  // Filter historical Selic data based on selection
  useEffect(() => {
    if (selicHistory.length === 0) return;
    
    const latestDateStr = selicHistory[selicHistory.length - 1].date;
    const latestDate = new Date(latestDateStr);
    
    let cutoffDate = new Date(latestDate);
    if (timeFilter === '1y') {
      cutoffDate.setFullYear(latestDate.getFullYear() - 1);
    } else if (timeFilter === '2y') {
      cutoffDate.setFullYear(latestDate.getFullYear() - 2);
    } else if (timeFilter === '5y') {
      cutoffDate.setFullYear(latestDate.getFullYear() - 5);
    } else if (timeFilter === '10y') {
      cutoffDate.setFullYear(latestDate.getFullYear() - 10);
    } else {
      cutoffDate = new Date(2000, 0, 1); // all
    }
    
    const filtered = selicHistory.filter(item => {
      const d = new Date(item.date);
      return d >= cutoffDate;
    });
    
    setFilteredHistory(filtered);
  }, [selicHistory, timeFilter]);

  // Statistics for historical Selic Real
  const stats = useMemo(() => {
    if (filteredHistory.length === 0) return { latest: 0, avg: 0, min: 0, max: 0, latestDate: '' };
    
    const latest = filteredHistory[filteredHistory.length - 1].rate;
    const latestDate = filteredHistory[filteredHistory.length - 1].date;
    
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    
    filteredHistory.forEach(item => {
      sum += item.rate;
      if (item.rate < min) min = item.rate;
      if (item.rate > max) max = item.rate;
    });
    
    return {
      latest,
      latestDate,
      avg: sum / filteredHistory.length,
      min,
      max
    };
  }, [filteredHistory]);

  // Downsample coordinates for charting performance
  const chartPoints = useMemo(() => {
    return downsample(filteredHistory, 300);
  }, [filteredHistory]);

  const yMin = useMemo(() => {
    if (filteredHistory.length === 0) return 0;
    return Math.max(-2, Math.floor(stats.min - 1));
  }, [stats.min, filteredHistory.length]);

  const yMax = useMemo(() => {
    if (filteredHistory.length === 0) return 10;
    return Math.min(20, Math.ceil(stats.max + 1));
  }, [stats.max, filteredHistory.length]);

  const yTicks = useMemo(() => {
    const ticks = [];
    const ticksCount = 5;
    const delta = (yMax - yMin) / (ticksCount - 1);
    for (let i = 0; i < ticksCount; i++) {
      ticks.push(yMin + i * delta);
    }
    return ticks;
  }, [yMin, yMax]);

  const xLabels = useMemo(() => {
    if (filteredHistory.length === 0) return [];
    const n = filteredHistory.length;
    if (n < 2) return [];
    
    const indices = [0, Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.75), n - 1];
    return indices.map(idx => ({
      text: formatDateBR(filteredHistory[idx].date).substring(3), // MM/YYYY
      x: paddingX + (idx / (n - 1)) * chartWidth
    }));
  }, [filteredHistory]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (filteredHistory.length === 0 || !svgRef.current) return;
    
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    
    const viewX = (clientX / rect.width) * 800;
    const chartX = viewX - paddingX;
    const pct = Math.max(0, Math.min(1, chartX / chartWidth));
    
    const dataIndex = Math.round(pct * (filteredHistory.length - 1));
    const point = filteredHistory[dataIndex];
    
    if (point) {
      const x = paddingX + (dataIndex / (filteredHistory.length - 1)) * chartWidth;
      const y = paddingTop + (1 - (point.rate - yMin) / (yMax - yMin)) * chartHeight;
      setHoveredPoint({ x, y, data: point });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const fetchLastUploadDate = async () => {
    try {
      const { data, error } = await supabase
        .from('historico_selic_real')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].created_at) {
        const date = new Date(data[0].created_at);
        const formatted = date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        setLastUpload(formatted);
      }
    } catch (e) {
      console.error('Erro ao buscar data do último upload:', e);
    }
  };

  // Load current active macro data and last upload
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        await fetchLastUploadDate();

        // 1. Fetch active cenario macro
        const { data, error } = await supabase
          .from('cenarios_macro')
          .select('*')
          .eq('key', 'ativo')
          .single();

        if (!error && data) {
          const ja = Number(data.juros_atuais);
          setJurosAtuais(ja);
          setJurosAtuaisStr(ja.toString());

          const ejb = Number(data.expectativa_juros_bacen_2029);
          setExpectativaJurosBacen2029(ejb);
          setExpectativaJurosBacen2029Str(ejb.toString());

          const jf = Number(data.juros_futuros_d1f29);
          setJurosFuturosD1f29(jf);
          setJurosFuturosD1f29Str(jf.toString());

          const tp = Number(data.valor_taxa_prefixada_2029);
          setValorTaxaPrefixada2029(tp);
          setValorTaxaPrefixada2029Str(tp.toString());

          const tm = Number(data.taxa_media_historica);
          setTaxaMediaHistorica(tm);
          setTaxaMediaHistoricaStr(tm.toString());
        }

        // 2. Fetch expectation formula
        const { data: formulaData, error: formulaErr } = await supabase
          .from('hfc_formulas_config')
          .select('formula')
          .eq('key', 'expectativa_propria')
          .single();

        if (!formulaErr && formulaData) {
          setExpectativaPropriaFormula(formulaData.formula);
          localStorage.setItem('hfc_expectativa_propria_formula', formulaData.formula);
        }

        // 3. Fetch custom variables
        const { data: varsData, error: varsErr } = await supabase
          .from('hfc_variaveis_customizadas')
          .select('*');

        if (!varsErr && varsData && varsData.length > 0) {
          const formattedVars = varsData.map((v: any) => ({
            id: v.id,
            name: v.name,
            code: v.code,
            value: Number(v.value),
            min: Number(v.min),
            max: Number(v.max),
            step: Number(v.step)
          }));
          setCustomVariables(formattedVars);
          localStorage.setItem('hfc_custom_variables', JSON.stringify(formattedVars));
        }
      } catch (e) {
        console.error('Failed to load active variables:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Auto-save expectation formula to DB (debounced)
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(async () => {
      try {
        await supabase
          .from('hfc_formulas_config')
          .upsert({ key: 'expectativa_propria', formula: expectativaPropriaFormula });
      } catch (e) {
        console.error('Failed to auto-save expectation formula:', e);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [expectativaPropriaFormula, isLoading]);

  // Auto-save custom variables to DB (debounced)
  useEffect(() => {
    if (isLoading) return;
    const timer = setTimeout(async () => {
      try {
        if (customVariables.length > 0) {
          await supabase
            .from('hfc_variaveis_customizadas')
            .upsert(customVariables.map(v => ({
              id: v.id,
              name: v.name,
              code: v.code,
              value: v.value,
              min: v.min,
              max: v.max,
              step: v.step
            })));
        }
      } catch (e) {
        console.error('Failed to auto-save custom variables to DB:', e);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [customVariables, isLoading]);

  // Auto-save manual variables to DB when they change (with a debounce)
  useEffect(() => {
    if (isLoading) return; // Don't auto-save during initial load
    const timer = setTimeout(async () => {
      try {
        await supabase
          .from('cenarios_macro')
          .update({
            juros_atuais: jurosAtuais,
            expectativa_juros_bacen_2029: expectativaJurosBacen2029,
            juros_futuros_d1f29: jurosFuturosD1f29,
            valor_taxa_prefixada_2029: valorTaxaPrefixada2029,
            taxa_media_historica: taxaMediaHistorica
          })
          .eq('key', 'ativo');
      } catch (e) {
        console.error('Failed to auto-save variables:', e);
      }
    }, 800); // 800ms debounce
    return () => clearTimeout(timer);
  }, [jurosAtuais, expectativaJurosBacen2029, jurosFuturosD1f29, valorTaxaPrefixada2029, taxaMediaHistorica, isLoading]);

  // Fetch news using rss2json API to parse Google News RSS directly as JSON
  const fetchNews = async (tagsList: string[]) => {
    if (tagsList.length === 0) {
      setNewsItems([]);
      return;
    }
    setIsNewsLoading(true);
    setNewsError(null);
    try {
      const fetched: any[] = [];
      for (const tag of tagsList) {
        const encodedQuery = encodeURIComponent(tag);
        const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
        
        try {
          const res = await fetch(apiUrl);
          if (res.ok) {
            const data = await res.json();
            if (data.status === 'ok' && data.items) {
              const items = data.items;
              for (let i = 0; i < Math.min(items.length, 5); i++) {
                const item = items[i];
                const rawTitle = item.title || "";
                const link = item.link || "";
                const pubDate = item.pubDate || "";
                let source = "Google News";
                
                let title = rawTitle;
                const lastDashIndex = rawTitle.lastIndexOf(" - ");
                if (lastDashIndex !== -1) {
                  title = rawTitle.substring(0, lastDashIndex);
                  source = rawTitle.substring(lastDashIndex + 3);
                }
                
                fetched.push({
                  termo_pesquisado: tag,
                  titulo: title.trim(),
                  fonte: source.trim(),
                  data_publicacao: pubDate,
                  link_url: link
                });
              }
            } else {
              throw new Error("RSS2JSON returned non-ok status: " + data.status);
            }
          } else {
            throw new Error(`Failed to fetch from RSS2JSON: ${res.status}`);
          }
        } catch (innerError) {
          console.warn(`Erro ao buscar notícias para a tag "${tag}" via RSS2JSON:`, innerError);
        }
      }
      
      if (fetched.length === 0 && tagsList.length > 0) {
        throw new Error("Nenhuma notícia pôde ser recuperada.");
      }
      
      setNewsItems(fetched);
    } catch (e) {
      console.error('Error fetching Google News:', e);
      setNewsError('Não foi possível obter notícias em tempo real. Verifique sua conexão.');
    } finally {
      setIsNewsLoading(false);
    }
  };

  const handleAddNewsTag = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTag = newTagInput.trim();
    if (cleanTag && !newsTags.includes(cleanTag)) {
      const updated = [...newsTags, cleanTag];
      setNewsTags(updated);
      setNewTagInput('');
      fetchNews(updated);
    }
  };

  const handleRemoveNewsTag = (tagToRemove: string) => {
    const updated = newsTags.filter(t => t !== tagToRemove);
    setNewsTags(updated);
    fetchNews(updated);
  };

  useEffect(() => {
    fetchNews(newsTags);
  }, []);

  const formatNewsDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Auto scroll console logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processCSVFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processCSVFile(e.target.files[0]);
    }
    e.target.value = ''; // Reset
  };

  const processCSVFile = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus('idle');
    setLogs([]);

    const currentLogs: string[] = [];
    const log = (type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', msg: string) => {
      const timestamp = new Date().toLocaleTimeString('pt-BR');
      const emoji = type === 'SUCCESS' ? '🟢' : type === 'WARNING' ? '🟡' : type === 'ERROR' ? '🔴' : '🔵';
      const formatted = `[${timestamp}] ${emoji} [${type}] ${msg}`;
      currentLogs.push(formatted);
      setLogs([...currentLogs]);
    };

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    try {
      log('INFO', `Arquivo detectado: '${file.name}' (${(file.size / 1024).toFixed(2)} KB).`);
      await sleep(150);
      log('INFO', 'Iniciando leitura estrutural e parsing do arquivo CSV de taxas macroeconômicas...');
      await sleep(150);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: async (results) => {
          try {
            const rows = results.data as any[];
            
            if (!rows || rows.length === 0) {
              throw new Error('O arquivo CSV está vazio ou ilegível.');
            }

            log('SUCCESS', `Parser concluído. Encontrados ${rows.length} registros no CSV.`);
            await sleep(150);

            const sample = rows[0];
            const keys = Object.keys(sample);

            const normalize = (str: string) => 
              str.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[_\-\s\(\)%]/g, "")
                .trim();

            const findCol = (keywords: string[]) => {
              for (const key of keys) {
                const nKey = normalize(key);
                for (const kw of keywords) {
                  const nKw = normalize(kw);
                  if (nKey === nKw) return key;
                }
              }
              for (const key of keys) {
                const nKey = normalize(key);
                for (const kw of keywords) {
                  const nKw = normalize(kw);
                  if (nKey.includes(nKw) || nKw.includes(nKey)) return key;
                }
              }
              return undefined;
            };

            const colDate = findCol(['date', 'data']);
            const colRate = findCol(['selic over anualizada', 'selic over', 'selic real efetiva', 'selic real', 'selic', 'rate', 'valor']);

            if (!colDate || !colRate) {
              throw new Error('Estrutura de colunas inválida. O CSV deve conter colunas correspondentes a "Date" e "Selic Over Anualizada (%)" ou "Selic Real Efetiva (%)".');
            }

            log('SUCCESS', `Mapeamento de colunas concluído: '${colDate}' -> data, '${colRate}' -> taxa.`);
            await sleep(150);

            const mappedRows = rows.map((row) => {
              const dateStr = String(row[colDate] || '').trim();
              const rateVal = parseNumber(row[colRate]);

              if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                return null;
              }

              // Since rateVal from the CSV is a percentage (e.g. 14.15 for 14.15%), we convert it to a decimal (0.1415) for DB storage.
              return {
                date: dateStr,
                rate: rateVal / 100
              };
            }).filter(Boolean) as { date: string; rate: number }[];

            if (mappedRows.length === 0) {
              throw new Error('Nenhum registro com data (AAAA-MM-DD) e taxa válidas foi estruturado.');
            }

            log('INFO', `Estruturados ${mappedRows.length} registros macroeconômicos com sucesso.`);
            await sleep(150);

            log('INFO', 'Iniciando ingestão de dados em lotes no Supabase (historico_selic_real)...');
            await sleep(150);

            const chunkSize = 200;
            for (let i = 0; i < mappedRows.length; i += chunkSize) {
              const chunk = mappedRows.slice(i, i + chunkSize);
              
              const { error: upsertError } = await supabase
                .from('historico_selic_real')
                .upsert(chunk, { onConflict: 'date' });

              if (upsertError) {
                throw new Error(`Erro ao enviar lote ${Math.floor(i / chunkSize) + 1}: ${upsertError.message}`);
              }

              log('INFO', `Lote ${Math.floor(i / chunkSize) + 1}/${Math.ceil(mappedRows.length / chunkSize)} enviado (${chunk.length} registros).`);
              await sleep(80);
            }

            log('SUCCESS', 'Tabela de Selic Real Histórica atualizada com sucesso no banco de dados!');
            setUploadStatus('success');

            await loadSelicFromDB();
          } catch (err: any) {
            console.error(err);
            log('ERROR', `Falha crítica de ETL: ${err.message || 'Erro inesperado.'}`);
            setUploadStatus('error');
          } finally {
            setIsProcessing(false);
          }
        },
        error: (err) => {
          log('ERROR', `Falha ao ler o arquivo CSV: ${err.message}`);
          setUploadStatus('error');
          setIsProcessing(false);
        }
      });
    } catch (err: any) {
      log('ERROR', `Erro de processamento: ${err.message}`);
      setUploadStatus('error');
      setIsProcessing(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 mt-8 mx-8">
        <div className="flex flex-col items-center gap-4">
          <div className="h-[2px] w-32 bg-border relative overflow-hidden">
            <div className="h-full bg-foreground w-1/3 absolute animate-loading-bar" />
          </div>
          <span className="font-sans text-[10px] uppercase tracking-widest text-muted-foreground font-bold animate-pulse">
            Carregando painel de dados...
          </span>
        </div>
      </div>
    );
  }

  // Calculate coordinates for SVG paths
  const dLine = chartPoints.reduce((path, p, idx) => {
    const x = paddingX + (idx / (chartPoints.length - 1)) * chartWidth;
    const y = paddingTop + (1 - (p.rate - yMin) / (yMax - yMin)) * chartHeight;
    return path + `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
  }, '');

  const dArea = dLine ? dLine + `L ${(paddingX + chartWidth).toFixed(2)} ${(240 - paddingBottom).toFixed(2)} L ${paddingX.toFixed(2)} ${(240 - paddingBottom).toFixed(2)} Z` : '';

  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6 flex flex-col gap-6 h-full overflow-y-auto">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-2 shrink-0 gap-6">
        <div className="max-w-4xl">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground leading-tight mb-2">
            Dados Macroeconômicos
          </h2>
          <p className="font-serif text-xs italic text-muted-foreground leading-relaxed">
            Consolidação dos dados base do cenário econômico. Estas variáveis atuam como inputs de marcação na otimização de indexadores e no cálculo de spreads táticos do mercado de renda fixa.
          </p>
        </div>

        <div className="flex-shrink-0 pt-1 flex items-center gap-3">
          <button
            onClick={() => {
              setIsNewsOpen(true);
              fetchNews(newsTags);
            }}
            className="flex items-center gap-2 px-6 py-3.5 text-[11px] font-sans font-black uppercase tracking-widest bg-foreground border border-foreground text-background hover:bg-foreground/90 transition-all duration-300 cursor-pointer font-bold"
          >
            <Newspaper className="h-4 w-4" /> Radar de Notícias
          </button>
        </div>
      </div>

      {/* Historical Real Selic Section */}
      <div className="border border-border/60 bg-card p-6 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div>
            <h3 className="font-sans text-[11px] font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Gráfico de Selic Real Histórica
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Period Selector Buttons */}
            <div className="flex items-center gap-1.5 bg-muted/20 p-1 border border-border/50">
              {(['1y', '2y', '5y', '10y', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    timeFilter === filter
                      ? 'bg-foreground text-background font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filter === '1y' && '1 Ano'}
                  {filter === '2y' && '2 Anos'}
                  {filter === '5y' && '5 Anos'}
                  {filter === '10y' && '10 Anos'}
                  {filter === 'all' && 'Tudo'}
                </button>
              ))}
            </div>

            {/* Import Trigger Button */}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground border border-foreground text-background font-sans text-[9px] font-black uppercase tracking-wider hover:bg-foreground/90 transition-all duration-300 cursor-pointer font-bold"
            >
              <Upload className="h-3.5 w-3.5" /> Importar Histórico
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/5 p-4 border border-border/30">
          <div className="space-y-1">
            <span className="font-sans text-[9px] uppercase tracking-wider text-muted-foreground block">Último Valor Efetivo</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-bold text-foreground">{stats.latest.toFixed(4)}%</span>
              {stats.latest >= stats.avg ? (
                <span title="Acima da média"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" /></span>
              ) : (
                <span title="Abaixo da média"><TrendingDown className="h-3.5 w-3.5 text-rose-500" /></span>
              )}
            </div>
            <span className="font-mono text-[8px] text-muted-foreground/80 block">Ref: {formatDateBR(stats.latestDate)}</span>
          </div>
          <div className="space-y-1">
            <span className="font-sans text-[9px] uppercase tracking-wider text-muted-foreground block">Média do Período</span>
            <span className="font-mono text-base font-bold text-foreground">{stats.avg.toFixed(4)}%</span>
          </div>
          <div className="space-y-1">
            <span className="font-sans text-[9px] uppercase tracking-wider text-muted-foreground block">Máxima no Período</span>
            <span className="font-mono text-base font-bold text-foreground">{stats.max.toFixed(4)}%</span>
          </div>
          <div className="space-y-1">
            <span className="font-sans text-[9px] uppercase tracking-wider text-muted-foreground block">Mínima no Período</span>
            <span className="font-mono text-base font-bold text-foreground">{stats.min.toFixed(4)}%</span>
          </div>
        </div>

        {/* Responsive SVG Chart Wrapper */}
        <div className="relative w-full h-[240px] bg-background/5 border border-border/30 overflow-visible mt-2 select-none">
          {filteredHistory.length > 0 ? (
            <>
              <svg
                ref={svgRef}
                viewBox="0 0 800 240"
                className="w-full h-full overflow-visible"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-Axis Gridlines & Labels */}
                {yTicks.map((tick, i) => {
                  const y = paddingTop + (1 - (tick - yMin) / (yMax - yMin)) * chartHeight;
                  return (
                    <g key={i} className="opacity-70">
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={800 - paddingRight}
                        y2={y}
                        stroke="currentColor"
                        className="text-border"
                        strokeWidth="0.5"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={paddingX - 10}
                        y={y + 3}
                        textAnchor="end"
                        className="font-mono text-[9px] fill-muted-foreground font-bold"
                      >
                        {tick.toFixed(1)}%
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis Labels */}
                {xLabels.map((label, i) => (
                  <text
                    key={i}
                    x={label.x}
                    y={240 - 10}
                    textAnchor="middle"
                    className="font-mono text-[9px] fill-muted-foreground/80 font-bold"
                  >
                    {label.text}
                  </text>
                ))}

                {/* Gradient Fill under Line */}
                {dArea && (
                  <path
                    d={dArea}
                    fill="url(#chartGradient)"
                  />
                )}

                {/* Main line path */}
                {dLine && (
                  <path
                    d={dLine}
                    fill="none"
                    stroke="currentColor"
                    className="text-foreground"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Hover Vertical Guide & Circle Dot Indicator */}
                {hoveredPoint && (
                  <g>
                    <line
                      x1={hoveredPoint.x}
                      y1={paddingTop}
                      x2={hoveredPoint.x}
                      y2={240 - paddingBottom}
                      stroke="currentColor"
                      className="text-muted-foreground/50"
                      strokeWidth="0.5"
                      strokeDasharray="3 3"
                    />
                    <circle
                      cx={hoveredPoint.x}
                      cy={hoveredPoint.y}
                      r="4"
                      className="fill-foreground stroke-background stroke-2"
                    />
                  </g>
                )}
              </svg>

              {/* Hover Overlay Tooltip (Positioned in relative percentages) */}
              {hoveredPoint && (
                <div
                  className="absolute pointer-events-none bg-popover border border-border/80 p-2.5 shadow-xl flex flex-col gap-1 -translate-x-1/2 -translate-y-full mb-3 z-30 transition-all duration-75 ease-out"
                  style={{
                    left: `${(hoveredPoint.x / 800) * 100}%`,
                    top: `${(hoveredPoint.y / 240) * 100}%`
                  }}
                >
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                    {formatDateBR(hoveredPoint.data.date)}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-foreground">
                    Selic Real: {hoveredPoint.data.rate.toFixed(4)}%
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center font-serif text-xs italic text-muted-foreground animate-pulse">
              Carregando gráfico de Selic Real...
            </div>
          )}
        </div>
      </div>

      {/* Grid Layout: Inputs on Left, Expectativa Própria on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch flex-1 min-h-0">
        
        {/* Column 1: Manual parameters input */}
        <div className="border border-border/60 bg-card p-6 flex flex-col gap-6">
          <h3 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-border/60 pb-2 flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            Variáveis Macroeconômicas Ativas
          </h3>

          <p className="font-sans text-xs text-muted-foreground leading-relaxed">
            Configure manualmente os 5 dados base. Você pode digitar os valores nos campos para maior precisão decimal ou arrastar os controles.
          </p>

          <div className="flex flex-col gap-5">
            {/* 1. Juros Atuais */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-muted-foreground font-semibold">Juros Atuais</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={jurosAtuaisStr}
                    onChange={(e) => updateJurosAtuais(e.target.value)}
                    onBlur={() => setJurosAtuaisStr(jurosAtuais.toString())}
                    className="w-16 bg-muted/10 border border-border/80 font-mono text-xs font-bold text-center py-0.5 px-1 text-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                  <span className="text-muted-foreground font-mono text-[10px]">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.00"
                max="20.00"
                step="0.05"
                value={jurosAtuais}
                onChange={(e) => updateJurosAtuais(Number(e.target.value))}
                className="premium-range-slider cursor-pointer"
              />
            </div>

            {/* 2. Expectativa Juros BACEN (2029) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-muted-foreground font-semibold">Expectativa Juros BACEN (2029)</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={expectativaJurosBacen2029Str}
                    onChange={(e) => updateExpectativaJurosBacen2029(e.target.value)}
                    onBlur={() => setExpectativaJurosBacen2029Str(expectativaJurosBacen2029.toString())}
                    className="w-16 bg-muted/10 border border-border/80 font-mono text-xs font-bold text-center py-0.5 px-1 text-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                  <span className="text-muted-foreground font-mono text-[10px]">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.00"
                max="20.00"
                step="0.05"
                value={expectativaJurosBacen2029}
                onChange={(e) => updateExpectativaJurosBacen2029(Number(e.target.value))}
                className="premium-range-slider cursor-pointer"
              />
            </div>

            {/* 3. Juros Futuros (d1f29) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-muted-foreground font-semibold">Juros Futuros (d1f29)</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={jurosFuturosD1f29Str}
                    onChange={(e) => updateJurosFuturosD1f29(e.target.value)}
                    onBlur={() => setJurosFuturosD1f29Str(jurosFuturosD1f29.toString())}
                    className="w-16 bg-muted/10 border border-border/80 font-mono text-xs font-bold text-center py-0.5 px-1 text-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                  <span className="text-muted-foreground font-mono text-[10px]">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.00"
                max="20.00"
                step="0.05"
                value={jurosFuturosD1f29}
                onChange={(e) => updateJurosFuturosD1f29(Number(e.target.value))}
                className="premium-range-slider cursor-pointer"
              />
            </div>

            {/* 4. Taxa Prefixada para 2029 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-muted-foreground font-semibold">Taxa Prefixada para 2029</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={valorTaxaPrefixada2029Str}
                    onChange={(e) => updateValorTaxaPrefixada2029(e.target.value)}
                    onBlur={() => setValorTaxaPrefixada2029Str(valorTaxaPrefixada2029.toString())}
                    className="w-16 bg-muted/10 border border-border/80 font-mono text-xs font-bold text-center py-0.5 px-1 text-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                  <span className="text-muted-foreground font-mono text-[10px]">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.00"
                max="20.00"
                step="0.05"
                value={valorTaxaPrefixada2029}
                onChange={(e) => updateValorTaxaPrefixada2029(Number(e.target.value))}
                className="premium-range-slider cursor-pointer"
              />
            </div>

            {/* 5. Taxa Média Histórica */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-muted-foreground font-semibold">Taxa Média Histórica</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={taxaMediaHistoricaStr}
                    onChange={(e) => updateTaxaMediaHistorica(e.target.value)}
                    onBlur={() => setTaxaMediaHistoricaStr(taxaMediaHistorica.toString())}
                    className="w-16 bg-muted/10 border border-border/80 font-mono text-xs font-bold text-center py-0.5 px-1 text-foreground focus:outline-none focus:border-foreground transition-colors"
                  />
                  <span className="text-muted-foreground font-mono text-[10px]">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.00"
                max="20.00"
                step="0.05"
                value={taxaMediaHistorica}
                onChange={(e) => updateTaxaMediaHistorica(Number(e.target.value))}
                className="premium-range-slider cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Column 2: Expectativa Própria de Juros */}
        <div className="border border-border/60 bg-card p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border/30 pb-2 mb-2">
            <h3 className="font-serif text-lg text-foreground flex items-center gap-2">
              <Sliders className="h-4.5 w-4.5 text-muted-foreground" />
              Expectativa Própria de Juros
            </h3>
          </div>
          
          {/* Subtabs for modeling vs custom variables */}
          <div className="flex border-b border-border/20 text-xs font-sans mb-2">
            <button
              onClick={() => setActiveSubTab('modelagem')}
              className={`px-3 py-1.5 border-b-2 font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                activeSubTab === 'modelagem'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Modelagem da Projeção
            </button>
            <button
              onClick={() => setActiveSubTab('variaveis')}
              className={`px-3 py-1.5 border-b-2 font-bold uppercase tracking-wider cursor-pointer transition-colors ${
                activeSubTab === 'variaveis'
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Variáveis Customizadas ({customVariables.length})
            </button>
          </div>

          {activeSubTab === 'modelagem' ? (
            <div className="space-y-4 flex-1">
              <p className="font-sans text-[11px] text-muted-foreground leading-relaxed">
                Crie um modelo algébrico para estimar a taxa de juros futura (Jan/2029) baseado nas variáveis macroeconômicas ou variáveis customizadas adicionadas por você. O spread tático será calculado comparando este valor com o contrato futuro de mercado.
              </p>

              {/* Prominent result display card */}
              <div className="border border-border/60 bg-muted/5 p-4 flex items-center justify-between shadow-xs">
                <div>
                  <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-muted-foreground block mb-0.5">
                    Projeção de Juros Calculada (E_propria)
                  </span>
                  <p className="font-sans text-[11px] text-muted-foreground/80 leading-snug">
                    Com base no modelo matemático ativo abaixo.
                  </p>
                </div>
                <div className="text-right flex flex-col items-end">
                  {parsedExpectativaPropriaResult.error ? (
                    <div className="flex items-center gap-1.5 text-red-500 font-sans font-bold text-sm">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      Erro de Modelagem
                    </div>
                  ) : (
                    <div className="flex items-baseline gap-0.5">
                      <span className="font-mono text-3xl font-black text-foreground tracking-tight">
                        {parsedExpectativaPropriaResult.value.toFixed(2)}
                      </span>
                      <span className="font-mono text-sm font-bold text-muted-foreground">%</span>
                    </div>
                  )}
                  <span className={`inline-flex items-center gap-1 text-[8px] font-sans font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 border ${
                    parsedExpectativaPropriaResult.isValid 
                      ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600'
                      : 'border-red-500/20 bg-red-500/5 text-red-500'
                  }`}>
                    {parsedExpectativaPropriaResult.isValid ? '✓ FÓRMULA ATIVA' : '⚠ ERRO NA FÓRMULA'}
                  </span>
                </div>
              </div>

              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-sans font-semibold text-muted-foreground uppercase tracking-wider block">
                    Expressão Matemática
                  </label>
                  <input
                    type="text"
                    value={expectativaPropriaFormula}
                    onChange={(e) => {
                      setExpectativaPropriaFormula(e.target.value);
                      localStorage.setItem('hfc_expectativa_propria_formula', e.target.value);
                    }}
                    className={`w-full bg-muted/10 border px-3 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-foreground transition-all ${
                      parsedExpectativaPropriaResult.error ? 'border-red-500/80 focus:border-red-500' : 'border-border/80'
                    }`}
                    placeholder="Ex: J_atual - mult_ef"
                  />
                  {parsedExpectativaPropriaResult.error && (
                    <p className="text-[10px] text-red-500 font-mono bg-red-500/5 p-2 border border-red-500/10 leading-relaxed">
                      {parsedExpectativaPropriaResult.error}
                    </p>
                  )}
                </div>

                {/* Legend of variables */}
                <div className="border border-border/40 p-3 bg-muted/5 space-y-2">
                  <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-muted-foreground block border-b border-border/20 pb-1.5">
                    Variáveis Disponíveis para E_propria
                  </span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] font-sans">
                    <div className="flex justify-between">
                      <span className="font-mono text-foreground font-semibold">J_atual</span>
                      <span className="text-muted-foreground font-mono">{jurosAtuais.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-foreground font-semibold">E_bacen</span>
                      <span className="text-muted-foreground font-mono">{expectativaJurosBacen2029.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-foreground font-semibold">J_futuro</span>
                      <span className="text-muted-foreground font-mono">{jurosFuturosD1f29.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-foreground font-semibold">T_pre</span>
                      <span className="text-muted-foreground font-mono">{valorTaxaPrefixada2029.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono text-foreground font-semibold">T_hist</span>
                      <span className="text-muted-foreground font-mono">{taxaMediaHistorica.toFixed(2)}%</span>
                    </div>
                    {customVariables.map(v => (
                      <div key={v.id} className="flex justify-between border-t border-border/15 pt-1 mt-0.5 col-span-2 sm:col-span-1">
                        <span className="font-mono text-amber-700 font-bold">{v.code}</span>
                        <span className="text-muted-foreground font-mono">{v.value.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {/* Form to add a new custom variable */}
              <form onSubmit={handleAddCustomVariable} className="border border-border/40 bg-muted/5 p-3.5 space-y-2.5">
                <h4 className="font-sans text-[9px] font-bold uppercase tracking-wider text-foreground border-b border-border/30 pb-1">
                  Criar Nova Variável
                </h4>
                
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-muted-foreground block">Nome</label>
                    <input
                      type="text"
                      value={newVarName}
                      onChange={(e) => setNewVarName(e.target.value)}
                      className="w-full bg-background border border-border/80 text-xs px-2.5 py-1 text-foreground focus:outline-none focus:border-foreground"
                      placeholder="Ex: Multiplicador"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-sans font-bold uppercase tracking-wider text-muted-foreground block">Símbolo (Fórmula)</label>
                    <input
                      type="text"
                      value={newVarCode}
                      onChange={(e) => setNewVarCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full bg-background border border-border/80 text-xs font-mono px-2.5 py-1 text-foreground focus:outline-none focus:border-foreground"
                      placeholder="Ex: mult_ef"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-sans text-muted-foreground block">Mínimo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newVarMin}
                      onChange={(e) => setNewVarMin(Number(e.target.value))}
                      className="w-full bg-background border border-border/80 text-xs px-2 py-0.5 text-foreground text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-sans text-muted-foreground block">Máximo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newVarMax}
                      onChange={(e) => setNewVarMax(Number(e.target.value))}
                      className="w-full bg-background border border-border/80 text-xs px-2 py-0.5 text-foreground text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-sans text-muted-foreground block">Inicial</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newVarValue}
                      onChange={(e) => setNewVarValue(Number(e.target.value))}
                      className="w-full bg-background border border-border/80 text-xs px-2 py-0.5 text-foreground text-center"
                    />
                  </div>
                </div>

                {newVarError && (
                  <p className="text-[10px] text-red-500 font-sans leading-tight">{newVarError}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-1 bg-foreground text-background font-sans text-[9px] font-black uppercase tracking-wider hover:bg-foreground/90 transition-colors cursor-pointer font-bold"
                >
                  Criar Variável
                </button>
              </form>

              {/* List of custom variables */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                <h4 className="font-sans text-[9px] font-bold uppercase tracking-wider text-foreground border-b border-border/30 pb-1">
                  Variáveis Criadas
                </h4>
                {customVariables.length === 0 ? (
                  <p className="text-xs italic text-muted-foreground text-center py-4">
                    Nenhuma variável customizada adicionada.
                  </p>
                ) : (
                  customVariables.map((v) => (
                    <div key={v.id} className="border border-border/40 p-2.5 bg-muted/5 space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <div>
                          <span className="font-sans font-bold text-foreground text-[11px] block">{v.name}</span>
                          <span className="font-mono text-[9px] text-amber-700 block font-semibold">{v.code}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.01"
                            value={v.value}
                            onChange={(e) => handleCustomVariableSliderChange(v.id, Number(e.target.value))}
                            className="w-12 bg-background border border-border text-center text-xs font-mono font-bold py-0.5"
                          />
                          <button
                            onClick={() => handleRemoveCustomVariable(v.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-500/10 p-1 cursor-pointer transition-colors"
                            title="Excluir variável"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      
                      <input
                        type="range"
                        min={v.min}
                        max={v.max}
                        step={v.step}
                        value={v.value}
                        onChange={(e) => handleCustomVariableSliderChange(v.id, Number(e.target.value))}
                        className="premium-range-slider cursor-pointer"
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Radar de Notícias Side Drawer */}
      {isNewsOpen && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsNewsOpen(false)}
        >
          <div 
            className="w-full max-w-xl h-full bg-background border-l border-border/60 shadow-2xl flex flex-col p-8 transition-transform duration-300 ease-out select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button at top-right */}
            <button 
              onClick={() => setIsNewsOpen(false)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1.5 hover:bg-muted"
              title="Fechar Radar"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Title Section */}
            <div className="mb-6 shrink-0 flex items-start gap-4 pr-10">
              <div className="bg-muted/50 p-3 border border-border/40 shrink-0">
                <Newspaper className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-foreground leading-tight">
                  Radar de Notícias
                </h3>
                <p className="font-serif text-xs italic text-muted-foreground mt-1">
                  Últimas manchetes do mercado macroeconômico e financeiro em tempo real via Google News.
                </p>
              </div>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 min-h-0">
              
              {/* Configuration Bar */}
              <div className="bg-muted/5 p-4 border border-border/30 flex flex-col gap-4">
                <form onSubmit={handleAddNewsTag} className="flex gap-2 w-full">
                  <input
                    type="text"
                    placeholder="Ex: IPCA, Taxa Selic, Juros..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="flex-1 bg-background border border-border/80 text-foreground text-xs px-3 py-2 outline-none focus:border-foreground"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:bg-foreground/90 transition-colors cursor-pointer"
                  >
                    Adicionar
                  </button>
                </form>

                {/* Tag List */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-sans text-[9px] uppercase tracking-wider text-muted-foreground mr-1">
                    Filtros:
                  </span>
                  {newsTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-muted/20 border border-border/50 text-[10px] font-bold uppercase px-2 py-0.5 text-foreground"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveNewsTag(tag)}
                        className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                  {newsTags.length === 0 && (
                    <span className="text-xs italic text-muted-foreground">
                      Nenhum termo cadastrado. Adicione um termo acima.
                    </span>
                  )}
                </div>
              </div>

              {/* Error Alert */}
              {newsError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-sans">
                  {newsError}
                </div>
              )}

              {/* News Grid */}
              {isNewsLoading ? (
                <div className="grid grid-cols-1 gap-4 animate-pulse">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="p-4 border border-border/30 bg-muted/5 space-y-3">
                      <div className="h-4 bg-muted/30 w-5/6 rounded"></div>
                      <div className="h-4 bg-muted/30 w-2/3 rounded"></div>
                      <div className="h-3 bg-muted/30 w-1/3 rounded pt-2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  {newsTags.map((tag) => {
                    const items = newsItems.filter(item => item.termo_pesquisado.toLowerCase() === tag.toLowerCase());
                    return (
                      <div key={tag} className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-border/30 pb-1.5">
                          <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {tag}
                          </span>
                          <span className="font-mono text-[9px] text-muted-foreground/60">
                            ({items.length} {items.length === 1 ? 'notícia' : 'notícias'})
                          </span>
                        </div>

                        {items.length === 0 ? (
                          <p className="text-[11px] italic text-muted-foreground pl-2">
                            Nenhuma notícia encontrada para este termo.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-4">
                            {items.map((item, idx) => (
                              <a
                                key={idx}
                                href={item.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col justify-between p-4 border border-border/30 hover:border-foreground/40 bg-muted/5 hover:bg-muted/10 transition-all duration-300"
                              >
                                <h4 className="font-sans text-xs font-semibold leading-snug text-foreground hover:text-primary transition-colors line-clamp-3">
                                  {item.titulo}
                                </h4>

                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20 text-[9px] font-mono text-muted-foreground">
                                  <span className="truncate max-w-[150px]">{item.fonte}</span>
                                  <span>{formatNewsDate(item.data_publicacao)}</span>
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Upload Histórico Selic Side Drawer */}
      {isUploadOpen && (
        <div 
          className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setIsUploadOpen(false)}
        >
          <div 
            className="w-full max-w-xl h-full bg-background border-l border-border/60 shadow-2xl flex flex-col p-8 transition-transform duration-300 ease-out select-none animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button at top-right */}
            <button 
              onClick={() => setIsUploadOpen(false)}
              className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1.5 hover:bg-muted"
              title="Fechar Upload"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Title Section */}
            <div className="mb-6 shrink-0 flex items-start gap-4 pr-10">
              <div className="bg-muted/50 p-3 border border-border/40 shrink-0">
                <Upload className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold tracking-tight text-foreground leading-tight">
                  Upload Histórico Selic
                </h3>
                <p className="font-serif text-xs italic text-muted-foreground mt-1">
                  Sincronize a série histórica de taxas Selic efetivas no banco de dados carregando um arquivo CSV mapeado.
                </p>
              </div>
            </div>

            {/* Content: CSV Import Zone & Console Log */}
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2 min-h-0">
              
              <div className="flex items-center justify-between border-b border-border/20 pb-2">
                <span className="font-sans text-xs text-muted-foreground leading-relaxed">
                  Arraste e solte o arquivo <strong className="text-foreground">historico_selic_over.csv</strong> abaixo.
                </span>
                {lastUpload && (
                  <span className="font-mono text-[9px] text-muted-foreground/80 font-bold bg-muted/20 px-2 py-0.5 border border-border/30">
                    Último Envio: {lastUpload}
                  </span>
                )}
              </div>

              {/* Drag & Drop Zone */}
              <div
                className={`relative border border-dashed flex-shrink-0 flex flex-col items-center justify-center p-6 min-h-[160px] transition-all duration-300 ${
                  dragActive ? 'border-foreground bg-muted/20 scale-[0.99]' : 'border-border/60 hover:border-foreground/50 bg-muted/5'
                } ${uploadStatus === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' : ''} ${
                  uploadStatus === 'error' ? 'border-destructive/30 bg-destructive/5' : ''
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  accept=".csv" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                  onChange={handleFileChange}
                  disabled={isProcessing}
                  title="Selecionar arquivo CSV do histórico Selic"
                />
                
                {uploadStatus === 'success' ? (
                  <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-2 animate-in zoom-in duration-300" />
                ) : uploadStatus === 'error' ? (
                  <AlertCircle className="h-10 w-10 text-destructive mb-2 animate-in zoom-in duration-300" />
                ) : (
                  <FileSpreadsheet className={`h-10 w-10 text-muted-foreground mb-2 transition-transform ${isProcessing ? 'animate-bounce' : ''}`} />
                )}
                
                <span className="font-sans text-[11px] font-bold uppercase tracking-wider block mb-1 text-foreground">
                  {isProcessing ? 'Processando dados...' : 'Área de Upload de Planilhas'}
                </span>
                <span className="font-sans text-[9px] text-muted-foreground/80 text-center max-w-[280px]">
                  Solte o arquivo CSV aqui ou clique para selecionar.
                </span>
              </div>

              {/* Console log */}
              <div className="bg-muted/10 p-4 border border-border/20 flex flex-col gap-3 flex-1 min-h-[220px]">
                <h4 className="font-sans text-[10px] font-bold uppercase tracking-wider text-foreground border-b border-border/30 pb-1.5">
                  Console de Integração ETL
                </h4>
                {logs.length > 0 ? (
                  <div className="flex-1 overflow-y-auto font-mono text-[9px] leading-normal text-foreground/80 bg-black/20 p-3 flex flex-col gap-1 border border-border/30">
                    {logs.map((lg, i) => (
                      <div key={i} className="whitespace-pre-wrap">{lg}</div>
                    ))}
                    <div ref={consoleEndRef} />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center font-mono text-[9px] italic text-muted-foreground bg-black/20 p-3 border border-border/30 text-center">
                    &gt;_ Aguardando upload do historico_selic_over.csv para auditoria em tempo real...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
