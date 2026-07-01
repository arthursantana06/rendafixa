import React from 'react';
import { AreaChart, TrendingUp, HelpCircle, Layers, ShieldAlert, Sparkles } from 'lucide-react';

export function RendaVariavelPage() {
  return (
    <div className="px-8 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Editorial Title Block */}
      <div className="border-b border-border/30 pb-6">
        <span className="font-sans text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          HFC Consultoria / Mercado de Capitais
        </span>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mt-1 mb-2 font-medium">
          Módulo de Renda Variável
        </h1>
        <p className="font-sans text-xs text-muted-foreground uppercase tracking-wider">
          Análise de Risco, Alocação Dinâmica & Carteiras de Ações e FIIs
        </p>
      </div>

      {/* Hero / State Card */}
      <div className="border border-border p-8 bg-card flex flex-col items-center justify-center min-h-[380px] text-center max-w-4xl mx-auto">
        <div className="h-12 w-12 border border-foreground/30 flex items-center justify-center mb-6 relative">
          <Layers className="h-5 w-5 text-foreground/80" />
          <span className="absolute -top-1.5 -right-1.5 h-3 w-3 bg-foreground rounded-full animate-ping opacity-75" />
          <span className="absolute -top-1.5 -right-1.5 h-3 w-3 bg-foreground rounded-full" />
        </div>
        
        <h2 className="font-serif text-2xl text-foreground font-semibold mb-3">
          Módulo sob Desenvolvimento
        </h2>
        
        <p className="font-sans text-sm text-muted-foreground max-w-xl leading-relaxed mb-8">
          A equipe de tecnologia da HFC Consultoria está integrando as APIs de cotações em tempo real e relatórios de fundos imobiliários. Em breve, você poderá aplicar filtros de liquidez, dividend yield e Valuation dinâmico.
        </p>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl pt-6 border-t border-border/20">
          <div className="text-left border border-border/40 p-4 bg-muted/5">
            <TrendingUp className="h-4 w-4 text-muted-foreground/60 mb-2" />
            <h3 className="font-sans text-[11px] font-black uppercase tracking-widest text-foreground mb-1">
              Ações & Blue Chips
            </h3>
            <p className="font-sans text-[11px] text-muted-foreground leading-normal">
              Filtro de dividendos dividend yield, P/L histórico e indicador de Graham.
            </p>
          </div>

          <div className="text-left border border-border/40 p-4 bg-muted/5">
            <AreaChart className="h-4 w-4 text-muted-foreground/60 mb-2" />
            <h3 className="font-sans text-[11px] font-black uppercase tracking-widest text-foreground mb-1">
              FIIs & Real Estate
            </h3>
            <p className="font-sans text-[11px] text-muted-foreground leading-normal">
              Preço sobre Valor Patrimonial (P/VP), vacância física e cap rates setoriais.
            </p>
          </div>

          <div className="text-left border border-border/40 p-4 bg-muted/5">
            <Sparkles className="h-4 w-4 text-muted-foreground/60 mb-2" />
            <h3 className="font-sans text-[11px] font-black uppercase tracking-widest text-foreground mb-1">
              Carteira Otimizada
            </h3>
            <p className="font-sans text-[11px] text-muted-foreground leading-normal">
              Fronteira Eficiente de Markowitz para balanceamento inteligente de ativos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
