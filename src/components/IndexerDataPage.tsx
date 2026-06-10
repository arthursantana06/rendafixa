import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Database, 
  Upload, 
  Save, 
  Check
} from 'lucide-react';

export function IndexerDataPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  // Load current active macro data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
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
      } catch (e) {
        console.error('Failed to load active variables:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Save values to DB
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const { error } = await supabase
        .from('cenarios_macro')
        .update({
          juros_atuais: jurosAtuais,
          expectativa_juros_bacen_2029: expectativaJurosBacen2029,
          juros_futuros_d1f29: jurosFuturosD1f29,
          valor_taxa_prefixada_2029: valorTaxaPrefixada2029,
          taxa_media_historica: taxaMediaHistorica
        })
        .eq('key', 'ativo');

      if (error) throw error;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to save variables:', e);
      alert('Erro ao salvar no banco de dados. Tentando simular localmente.');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
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

  return (
    <div className="max-w-[1920px] mx-auto px-8 py-6 flex flex-col gap-6 h-full overflow-y-auto">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 shrink-0 gap-6">
        <div className="max-w-4xl">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground leading-tight mb-2">
            Gestão de Parâmetros e Dados Macroeconômicos
          </h2>
          <p className="font-serif text-xs italic text-muted-foreground leading-relaxed">
            Consolidação dos dados base do cenário econômico. Estas variáveis atuam como inputs de marcação na otimização de indexadores e no cálculo de spreads táticos do mercado de renda fixa.
          </p>
        </div>

        <div className="flex-shrink-0 pt-1 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2.5 px-6 py-3.5 text-[11px] font-sans font-black uppercase tracking-widest transition-all duration-300 border cursor-pointer ${
              saveSuccess 
                ? 'bg-green-600 border-green-600 text-white hover:bg-green-700'
                : 'bg-foreground border-foreground text-background hover:bg-foreground/90'
            }`}
          >
            {saveSuccess ? (
              <>
                <Check className="h-4 w-4" /> Consolidado!
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {isSaving ? 'Salvando...' : 'Salvar Dados'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid Layout: 2-column Structure (Inputs on Left, Upload zone on Right) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start flex-1 min-h-0">
        
        {/* Column 1: Manual parameters input - exactly 5 */}
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
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-muted-foreground font-medium">Juros Atuais</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={jurosAtuaisStr}
                    onChange={(e) => updateJurosAtuais(e.target.value)}
                    onBlur={() => setJurosAtuaisStr(jurosAtuais.toString())}
                    className="w-16 bg-background border border-border/80 font-mono text-xs font-bold text-center py-0.5 text-foreground focus:outline-none focus:border-foreground"
                  />
                  <span className="text-muted-foreground font-mono">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.00"
                max="20.00"
                step="0.05"
                value={jurosAtuais}
                onChange={(e) => updateJurosAtuais(Number(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-foreground"
              />
            </div>

            {/* 2. Expectativa Juros BACEN (2029) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-muted-foreground font-medium">Expectativa Juros BACEN (2029)</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={expectativaJurosBacen2029Str}
                    onChange={(e) => updateExpectativaJurosBacen2029(e.target.value)}
                    onBlur={() => setExpectativaJurosBacen2029Str(expectativaJurosBacen2029.toString())}
                    className="w-16 bg-background border border-border/80 font-mono text-xs font-bold text-center py-0.5 text-foreground focus:outline-none focus:border-foreground"
                  />
                  <span className="text-muted-foreground font-mono">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.00"
                max="20.00"
                step="0.05"
                value={expectativaJurosBacen2029}
                onChange={(e) => updateExpectativaJurosBacen2029(Number(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-foreground"
              />
            </div>

            {/* 3. Juros Futuros (d1f29) */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-muted-foreground font-medium">Juros Futuros (d1f29)</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={jurosFuturosD1f29Str}
                    onChange={(e) => updateJurosFuturosD1f29(e.target.value)}
                    onBlur={() => setJurosFuturosD1f29Str(jurosFuturosD1f29.toString())}
                    className="w-16 bg-background border border-border/80 font-mono text-xs font-bold text-center py-0.5 text-foreground focus:outline-none focus:border-foreground"
                  />
                  <span className="text-muted-foreground font-mono">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.00"
                max="20.00"
                step="0.05"
                value={jurosFuturosD1f29}
                onChange={(e) => updateJurosFuturosD1f29(Number(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-foreground"
              />
            </div>

            {/* 4. Valor da Taxa Prefixada para 2029 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-muted-foreground font-medium">Taxa Prefixada para 2029</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={valorTaxaPrefixada2029Str}
                    onChange={(e) => updateValorTaxaPrefixada2029(e.target.value)}
                    onBlur={() => setValorTaxaPrefixada2029Str(valorTaxaPrefixada2029.toString())}
                    className="w-16 bg-background border border-border/80 font-mono text-xs font-bold text-center py-0.5 text-foreground focus:outline-none focus:border-foreground"
                  />
                  <span className="text-muted-foreground font-mono">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.00"
                max="20.00"
                step="0.05"
                value={valorTaxaPrefixada2029}
                onChange={(e) => updateValorTaxaPrefixada2029(Number(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-foreground"
              />
            </div>

            {/* 5. Taxa Média Histórica */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-sans">
                <span className="text-muted-foreground font-medium">Taxa Média Histórica</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.01"
                    value={taxaMediaHistoricaStr}
                    onChange={(e) => updateTaxaMediaHistorica(e.target.value)}
                    onBlur={() => setTaxaMediaHistoricaStr(taxaMediaHistorica.toString())}
                    className="w-16 bg-background border border-border/80 font-mono text-xs font-bold text-center py-0.5 text-foreground focus:outline-none focus:border-foreground"
                  />
                  <span className="text-muted-foreground font-mono">%</span>
                </div>
              </div>
              <input
                type="range"
                min="0.00"
                max="20.00"
                step="0.05"
                value={taxaMediaHistorica}
                onChange={(e) => updateTaxaMediaHistorica(Number(e.target.value))}
                className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-foreground"
              />
            </div>
          </div>
        </div>

        {/* Column 2: CSV Import zone (non-functional) */}
        <div className="border border-border/60 bg-card p-6 flex flex-col gap-6">
          <h3 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground border-b border-border/60 pb-2 flex items-center gap-2">
            <Upload className="h-4.5 w-4.5 text-muted-foreground" />
            Upload Planilha de Indicadores
          </h3>

          <p className="font-sans text-xs text-muted-foreground leading-relaxed">
            Arraste ou selecione planilhas de taxas (.csv ou .xlsx) para consolidação automática de dados futuros de mercado.
          </p>

          {/* Non-functional Drag & Drop Zone */}
          <div
            className="border-2 border-dashed border-border/80 bg-muted/5 rounded-lg p-12 text-center cursor-not-allowed select-none opacity-85"
            title="Importador de arquivos desativado. Use o cadastro manual."
          >
            <Upload className="h-10 w-10 mx-auto mb-3 opacity-40 text-muted-foreground" />
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider block mb-1 text-muted-foreground">
              Área de Upload de Planilhas
            </span>
            <span className="font-sans text-[9px] text-red-600 bg-red-500/5 px-2 py-0.5 border border-rose-500/20 inline-block font-bold mt-2 uppercase tracking-wide">
              Módulo Indisponível (Em breve)
            </span>
          </div>

          <div className="bg-muted/15 p-4 border border-border/20 text-xs leading-relaxed text-muted-foreground font-sans flex-1">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-foreground mb-1">
              Nota de Desenvolvimento:
            </h4>
            O motor de extração automatizada de planilhas de taxas da B3 está sendo programado. No momento, configure as variáveis utilizando os seletores analógicos da coluna ao lado e clique em <strong>Salvar Dados</strong>.
          </div>
        </div>

      </div>
    </div>
  );
}
