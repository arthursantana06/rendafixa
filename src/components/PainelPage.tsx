import { useState, useMemo, useEffect } from 'react';
import { Newspaper, TrendingUp, Award, Calendar, Settings, X, Plus, Edit2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { BankAnalysis } from '@/types';

interface PainelPageProps {
  analyses: BankAnalysis[];
  isLoading: boolean;
}

interface NewsItem {
  id: string;
  source: string;
  time: string;
  title: string;
  summary: string;
}

const NEWS_MOCK: Record<string, NewsItem[]> = {
  "Selic": [
    {
      id: "s1",
      source: "VALOR ECONÔMICO",
      time: "Há 2h",
      title: "Copom mantém tom cauteloso e deixa porta aberta para ajustes na Selic",
      summary: "Diretoria do BC indica manutenção da taxa em patamar restritivo por mais tempo para ancorar inflação."
    },
    {
      id: "s2",
      source: "ESTADÃO",
      time: "Há 5h",
      title: "Mercado futuro ajusta projeções da Selic após dados fortes de atividade",
      summary: "Curva precifica estabilização da taxa em 10.50% nas próximas reuniões de política monetária."
    }
  ],
  "IPCA": [
    {
      id: "i1",
      source: "IBGE",
      time: "Há 1d",
      title: "IPCA avança 0.39% em junho, puxado por transportes",
      summary: "Variação acumulada em 12 meses fica em 3.89%, em linha com as projeções do Focus."
    },
    {
      id: "i2",
      source: "BOLETIM FOCUS",
      time: "Há 2d",
      title: "Expectativa do IPCA sofre leve oscilação para cima",
      summary: "Consenso Focus migrou de 3.96% para 4.02% ao ano, sob impacto de pressões cambiais."
    }
  ],
  "Crédito Bancário": [
    {
      id: "c1",
      source: "FEBRABAN",
      time: "Há 3h",
      title: "Demanda por crédito corporativo de médio prazo registra alta",
      summary: "Aceleração é liderada por empresas dos setores de agronegócio e infraestrutura de médio porte."
    },
    {
      id: "c2",
      source: "RATING REPORT",
      time: "Há 1d",
      title: "Provisionamento de emissores bancários atinge melhor nível",
      summary: "Análise setorial aponta redução de inadimplência e robustez no capital de nível 1."
    }
  ],
  "Copom": [
    {
      id: "co1",
      source: "BANCO CENTRAL",
      time: "Há 4h",
      title: "Minuta do Copom aponta preocupação com inflação de serviços",
      summary: "Monetário contracionista se estenderá até consolidação do processo desinflacionário doméstico."
    },
    {
      id: "co2",
      source: "BROADCAST",
      time: "Há 1d",
      title: "Economistas avaliam comunicado como conservador",
      summary: "Tom firme do Banco Central gerou reprecificação e prêmios nos títulos prefixados da B3."
    }
  ],
  "Bancos Médios": [
    {
      id: "b1",
      source: "HFC RESEARCH",
      time: "Há 12h",
      title: "Indicador LCR médio de bancos de médio porte apresenta alta",
      summary: "Média setorial subiu para 162%, demonstrando confortável liquidez frente a obrigações."
    },
    {
      id: "b2",
      source: "MERCADO",
      time: "Há 1d",
      title: "Fusões e aquisições ganham tração entre nichos bancários",
      summary: "Busca por diversificação de funding e fortalecimento de balanço motivam novos acordos."
    }
  ]
};

export function PainelPage({ analyses, isLoading }: PainelPageProps) {
  const [words, setWords] = useState<string[]>(["Selic", "IPCA", "Crédito Bancário", "Copom", "Bancos Médios"]);
  const [selectedWord, setSelectedWord] = useState<string>("Selic");
  const [news, setNews] = useState<Record<string, NewsItem[]>>(NEWS_MOCK);
  
  // Tag Configuration Mode states
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [newWordInput, setNewWordInput] = useState("");
  const [editingWord, setEditingWord] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  const [selicHistory, setSelicHistory] = useState<any[]>([]);
  const [expectativaPropria, setExpectativaPropria] = useState(10.00);

  useEffect(() => {
    // 1. Fetch expectation
    const saved = localStorage.getItem('hfc_expectativa_propria');
    if (saved) setExpectativaPropria(Number(saved));

    // 2. Fetch Selic history
    async function fetchSelic() {
      try {
        const { data, error } = await supabase
          .from('historico_selic_real')
          .select('date, rate')
          .order('date', { ascending: false })
          .limit(300);
        
        if (!error && data) {
          const formatted = data.map((row: any) => ({
            date: row.date,
            rate: Number(row.rate) * 100
          })).reverse();
          setSelicHistory(formatted);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchSelic();
  }, []);

  // Get Top 5 eligible banks based on actual calculations
  const topBanks = useMemo(() => {
    return analyses
      .filter(a => a.status === 'elegivel' && a.bank.name !== 'N/I')
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, 5);
  }, [analyses]);

  // Simplified SVG Chart Calculation
  const chartPoints = useMemo(() => {
    if (selicHistory.length === 0) return [];
    const maxPoints = 80;
    if (selicHistory.length <= maxPoints) return selicHistory;
    const step = Math.floor(selicHistory.length / maxPoints);
    const result = [];
    for (let i = 0; i < selicHistory.length; i += step) {
      result.push(selicHistory[i]);
    }
    return result;
  }, [selicHistory]);

  const chartData = useMemo(() => {
    if (chartPoints.length === 0) return null;
    
    const rates = chartPoints.map(p => p.rate);
    const minVal = Math.min(...rates);
    const maxVal = Math.max(...rates);
    
    const yMin = Math.max(0, minVal - 0.5);
    const yMax = maxVal + 0.5;
    
    const width = 340;
    const height = 150;
    const paddingX = 35;
    const paddingTop = 10;
    const paddingBottom = 20;
    
    const chartWidth = width - paddingX - 10;
    const chartHeight = height - paddingTop - paddingBottom;
    
    const dLine = chartPoints.reduce((path, p, idx) => {
      const x = paddingX + (idx / (chartPoints.length - 1)) * chartWidth;
      const y = paddingTop + (1 - (p.rate - yMin) / (yMax - yMin)) * chartHeight;
      return path + `${idx === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)} `;
    }, '');
    
    const dArea = dLine ? dLine + `L ${(paddingX + chartWidth).toFixed(2)} ${(height - paddingBottom).toFixed(2)} L ${paddingX.toFixed(2)} ${(height - paddingBottom).toFixed(2)} Z` : '';
    
    const yTicks = [yMin, (yMin + yMax) / 2, yMax];
    
    return {
      dLine,
      dArea,
      yTicks,
      yMin,
      yMax,
      width,
      height,
      paddingX,
      paddingTop,
      paddingBottom,
      chartWidth,
      chartHeight
    };
  }, [chartPoints]);

  // News manager functions
  const handleAddWord = () => {
    const trimmed = newWordInput.trim();
    if (!trimmed) return;
    
    // Capitalize first letter
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    
    if (words.includes(capitalized)) {
      setNewWordInput("");
      return;
    }

    setWords([...words, capitalized]);
    setNews(prev => ({
      ...prev,
      [capitalized]: [
        {
          id: Math.random().toString(),
          source: "HFC CONSULTORIA",
          time: "Recém add",
          title: `${capitalized} entra no radar de monitoramento macroeconômico`,
          summary: `Início de acompanhamento de mercado para ${capitalized}. Impacto em renda fixa avaliado preliminarmente como neutro.`
        }
      ]
    }));
    setNewWordInput("");
    setSelectedWord(capitalized);
  };

  const handleRemoveWord = (word: string) => {
    const remaining = words.filter(w => w !== word);
    setWords(remaining);
    
    setNews(prev => {
      const copy = { ...prev };
      delete copy[word];
      return copy;
    });

    if (selectedWord === word) {
      setSelectedWord(remaining[0] || "");
    }
  };

  const handleStartEditing = (word: string) => {
    setEditingWord(word);
    setEditingValue(word);
  };

  const handleSaveEditWord = (oldWord: string) => {
    const trimmed = editingValue.trim();
    if (!trimmed || oldWord === trimmed) {
      setEditingWord(null);
      return;
    }

    // Capitalize first letter
    const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);

    if (words.includes(capitalized)) {
      setEditingWord(null);
      return;
    }

    setWords(words.map(w => w === oldWord ? capitalized : w));
    setNews(prev => {
      const copy = { ...prev };
      if (copy[oldWord]) {
        copy[capitalized] = copy[oldWord].map(item => ({
          ...item,
          title: item.title.replaceAll(oldWord, capitalized),
          summary: item.summary.replaceAll(oldWord, capitalized)
        }));
        delete copy[oldWord];
      }
      return copy;
    });

    if (selectedWord === oldWord) {
      setSelectedWord(capitalized);
    }
    setEditingWord(null);
  };

  return (
    <div className="px-8 py-6 space-y-8 animate-in fade-in duration-200">
      {/* Editorial Title Block */}
      <div className="border-b border-border/30 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-sans text-[10px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
            HFC Consultoria / Cockpit Geral
          </span>
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground leading-tight mb-2">
            Painel de Controle
          </h2>
          <p className="font-serif text-xs italic text-muted-foreground leading-relaxed">
            Cockpit consolidado com visão de notícias, classificação de emissores e taxas de mercado.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-[9px] font-sans font-bold uppercase tracking-wider">
          <Calendar className="h-3.5 w-3.5 opacity-60" />
          <span>Atualizado: {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>

      {/* Grid: Cockpit-optimized with heavy responsiveness */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Card 1: Radar de Notícias */}
        <div className="border border-border p-4 bg-card flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-3 border-b border-border/20 pb-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <Newspaper className="h-3.5 w-3.5 text-foreground/80" />
              <h2 className="font-sans text-[9px] font-black uppercase tracking-widest text-foreground">
                1. Radar de Notícias
              </h2>
            </div>
            
            <button
              onClick={() => setIsConfiguring(!isConfiguring)}
              className={`font-sans text-[8px] font-black uppercase tracking-wider flex items-center gap-1 px-1.5 py-0.5 border cursor-pointer transition-colors ${
                isConfiguring 
                  ? 'bg-foreground text-background border-foreground' 
                  : 'bg-transparent text-muted-foreground border-border/60 hover:text-foreground hover:border-foreground'
              }`}
            >
              <Settings className="h-2.5 w-2.5" />
              <span>{isConfiguring ? 'Concluir' : 'Configurar'}</span>
            </button>
          </div>

          {isConfiguring ? (
            /* Tag Manager View */
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Add New Word */}
              <div className="space-y-1.5 shrink-0 bg-muted/5 border border-border/40 p-2">
                <span className="font-sans text-[8px] font-black uppercase text-muted-foreground tracking-wider block">Adicionar Palavra-Chave</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Ex: Inflação"
                    value={newWordInput}
                    onChange={(e) => setNewWordInput(e.target.value)}
                    className="flex-1 bg-background border border-border px-2 py-1 font-sans text-[11px] focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddWord()}
                  />
                  <button
                    onClick={handleAddWord}
                    className="bg-foreground text-background font-sans text-[9px] font-black uppercase px-2 py-1 cursor-pointer hover:opacity-90 flex items-center gap-0.5"
                  >
                    <Plus className="h-3 w-3" /> Add
                  </button>
                </div>
              </div>

              {/* Tags List Manager */}
              <div className="flex-1 flex flex-col min-h-0">
                <span className="font-sans text-[8px] font-black uppercase text-muted-foreground tracking-wider block mb-1">Palavras Ativas ({words.length})</span>
                <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                  {words.map((word) => (
                    <div key={word} className="flex items-center justify-between border border-border/20 px-2 py-1 bg-muted/5 text-[11px]">
                      {editingWord === word ? (
                        <div className="flex items-center gap-1.5 flex-1 mr-2">
                          <input
                            type="text"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            className="bg-background border border-border px-1.5 py-0.5 font-sans text-xs focus:outline-none flex-1"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditWord(word);
                              if (e.key === 'Escape') setEditingWord(null);
                            }}
                            autoFocus
                          />
                          <button onClick={() => handleSaveEditWord(word)} className="text-foreground hover:text-foreground/80 cursor-pointer">
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-sans font-bold uppercase tracking-wide text-foreground truncate max-w-[120px]">{word}</span>
                      )}
                      
                      {editingWord !== word && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEditing(word)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer flex items-center gap-0.5 text-[9px]"
                          >
                            <Edit2 className="h-2.5 w-2.5" /> Editar
                          </button>
                          <button
                            onClick={() => handleRemoveWord(word)}
                            className="text-destructive hover:text-destructive/80 cursor-pointer flex items-center gap-0.5 text-[9px]"
                            disabled={words.length <= 1}
                            title={words.length <= 1 ? "É necessário ter ao menos uma palavra no radar" : ""}
                          >
                            <X className="h-2.5 w-2.5" /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Regular Cockpit View */
            <div className="flex-1 flex flex-col min-h-0">
              {/* Word Tags Selector */}
              <div className="flex flex-wrap gap-1 mb-2.5 shrink-0 max-h-[64px] overflow-y-auto pr-1">
                {words.map((word) => (
                  <button
                    key={word}
                    onClick={() => setSelectedWord(word)}
                    className={`font-sans text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 border transition-all cursor-pointer ${
                      selectedWord === word
                        ? 'bg-foreground text-background border-foreground font-black'
                        : 'bg-transparent text-muted-foreground border-border/40 hover:border-muted-foreground/30 hover:text-foreground'
                    }`}
                  >
                    {word}
                  </button>
                ))}
              </div>

              {/* News List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {news[selectedWord]?.length ? (
                  news[selectedWord].map((item) => (
                    <article key={item.id} className="group border-b border-border/10 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-1.5 text-[8px] font-sans font-black uppercase tracking-widest text-muted-foreground mb-0.5">
                        <span>{item.source}</span>
                        <span className="h-1 w-1 bg-border" />
                        <span>{item.time}</span>
                      </div>
                      <h3 className="font-serif text-[13px] text-foreground font-semibold leading-snug group-hover:text-foreground/80 transition-colors mb-1">
                        {item.title}
                      </h3>
                      <p className="font-sans text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                        {item.summary}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <span className="font-sans text-[10px] text-muted-foreground">Nenhuma notícia vinculada.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Top 5 Bancos Emissores */}
        <div className="border border-border p-4 bg-card flex flex-col h-[400px]">
          <div className="flex items-center gap-1.5 mb-3 border-b border-border/20 pb-2 shrink-0">
            <Award className="h-3.5 w-3.5 text-foreground/80" />
            <h2 className="font-sans text-[9px] font-black uppercase tracking-widest text-foreground">
              2. Top 5 Emissores
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <div className="h-[2px] w-16 bg-border relative overflow-hidden mb-2">
                  <div className="h-full bg-foreground w-1/3 absolute animate-loading-bar" />
                </div>
                <span className="font-sans text-[8px] uppercase tracking-widest text-muted-foreground font-bold">
                  Buscando dados...
                </span>
              </div>
            ) : topBanks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <p className="font-serif text-[13px] text-foreground font-medium mb-1">Sem emissores</p>
                <p className="font-sans text-[10px] text-muted-foreground max-w-[160px] leading-relaxed">
                  Importe planilhas IF.data no Módulo Renda Fixa para gerar as notas.
                </p>
              </div>
            ) : (
              topBanks.map((analysis, index) => {
                const isVeryGood = analysis.weightedScore >= 7.0;
                return (
                  <div 
                    key={analysis.bank.id} 
                    className="flex items-center justify-between border-b border-border/10 pb-2.5 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-lg font-black text-muted-foreground/30 w-5">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-sans text-[11px] font-bold uppercase tracking-wider text-foreground truncate max-w-[140px]" title={analysis.bank.name}>
                          {analysis.bank.name}
                        </h4>
                        <span className="font-sans text-[8px] text-muted-foreground tracking-wide block truncate w-[130px]">
                          CNPJ: {analysis.bank.cnpj.length === 14 ? analysis.bank.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : analysis.bank.cnpj}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-sans text-[11px] font-bold text-foreground">
                        Nota: {analysis.weightedScore.toFixed(2)}
                      </div>
                      <span className={`inline-block font-sans text-[8px] font-black uppercase tracking-widest px-1 py-0.5 mt-0.5 ${
                        isVeryGood 
                          ? 'bg-foreground/5 text-foreground border border-foreground/35' 
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {analysis.bank.rating}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-border/20 shrink-0">
            <div className="font-sans text-[8px] font-black text-muted-foreground uppercase tracking-widest text-center">
              Critério: Emissores Elegíveis Premium (Nota ≥ 7.0)
            </div>
          </div>
        </div>

        {/* Card 3: Expectativa de Juros */}
        <div className="border border-border p-4 bg-card flex flex-col h-[400px]">
          <div className="flex items-center gap-1.5 mb-3 border-b border-border/20 pb-2 shrink-0">
            <TrendingUp className="h-3.5 w-3.5 text-foreground/80" />
            <h2 className="font-sans text-[9px] font-black uppercase tracking-widest text-foreground">
              3. Expectativa de Juros
            </h2>
          </div>

          {/* Banner da Expectativa Própria */}
          <div className="border border-border/40 p-3 bg-muted/5 flex items-center justify-between shrink-0 mb-4 rounded-none">
            <div>
              <span className="font-sans text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-0.5">
                Expectativa de Juros HFC (E_propria)
              </span>
              <span className="font-sans text-[10px] text-muted-foreground">
                Projeção de Juros Jan/2029
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl font-black text-foreground">
                {expectativaPropria.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Grafico Selic Historica Simplificado */}
          <div className="flex-1 min-h-0 flex flex-col justify-end">
            <span className="font-sans text-[8px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 block">
              Gráfico de Selic Real Histórica (Referência)
            </span>
            <div className="relative w-full h-[160px] bg-background/5 border border-border/30 overflow-visible select-none">
              {chartData ? (
                <svg viewBox="0 0 340 150" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="painelChartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid lines */}
                  {chartData.yTicks.map((tick, i) => {
                    const y = chartData.paddingTop + (1 - (tick - chartData.yMin) / (chartData.yMax - chartData.yMin)) * chartData.chartHeight;
                    return (
                      <g key={i} className="opacity-50">
                        <line
                          x1={chartData.paddingX}
                          y1={y}
                          x2={340 - 10}
                          y2={y}
                          stroke="currentColor"
                          className="text-border"
                          strokeWidth="0.5"
                          strokeDasharray="3 3"
                        />
                        <text
                          x={chartData.paddingX - 6}
                          y={y + 3}
                          textAnchor="end"
                          className="font-mono text-[8px] fill-muted-foreground font-semibold"
                        >
                          {tick.toFixed(1)}%
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill */}
                  {chartData.dArea && (
                    <path d={chartData.dArea} fill="url(#painelChartGradient)" />
                  )}

                  {/* Line path */}
                  {chartData.dLine && (
                    <path
                      d={chartData.dLine}
                      fill="none"
                      stroke="currentColor"
                      className="text-foreground"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              ) : (
                <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground font-sans">
                  Carregando dados históricos...
                </div>
              )}
            </div>
          </div>

          {/* Footer of Card 3 */}
          <div className="mt-3 pt-2 border-t border-border/20 shrink-0 text-[8px] font-sans text-muted-foreground uppercase tracking-widest flex items-center justify-between font-bold">
            <span>Fontes: Banco Central do Brasil</span>
            <div className="flex items-center gap-1.5 text-foreground">
              <span className="inline-block h-1.5 w-1.5 bg-foreground/60" /> Histórico Selic Over
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
