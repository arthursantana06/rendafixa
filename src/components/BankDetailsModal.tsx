// ============================================================
// BANK DETAILS MODAL - Premium Sliding Drawer Layout
// ============================================================

import { useState, useEffect } from 'react';
import { X, Save, Sparkles, Check, AlertTriangle, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { BankAnalysis } from '@/types';
import { getDimensions } from '@/lib/indicators';

interface BankDetailsModalProps {
  analysis: BankAnalysis;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export function BankDetailsModal({ analysis, onClose, onSaveSuccess }: BankDetailsModalProps) {
  const { bank } = analysis;
  const [ratingState, setRatingState] = useState(bank.rating || 'SR');
  const [lcrState, setLcrState] = useState(
    bank.lcr !== null && bank.lcr !== undefined ? bank.lcr.toString() : ''
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [animateIn, setAnimateIn] = useState(false);

  // Trigger animations on mount
  useEffect(() => {
    const timer = setTimeout(() => setAnimateIn(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const parsedLcr = lcrState.trim() === '' ? null : parseFloat(lcrState);
      const rating = ratingState.trim() === '' ? 'SR' : ratingState.trim();

      const { error } = await supabase
        .from('emissores_bancarios')
        .update({
          rating,
          lcr: parsedLcr,
          updated_at: new Date().toISOString()
        })
        .eq('codigo', bank.id);

      if (error) {
        throw error;
      }

      setSaveStatus('success');
      
      // Keep displaying success for a brief moment before triggering parent update and close
      setTimeout(() => {
        onSaveSuccess();
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Erro ao salvar dados manuais:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const dims = getDimensions([]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
        animateIn ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div 
        className={`w-full max-w-xl h-full bg-background border-l border-border/60 shadow-2xl flex flex-col p-8 transition-transform duration-300 ease-out select-none ${
          animateIn ? 'translate-x-0' : 'translate-x-full'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button at top-right */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1.5 hover:bg-muted"
          title="Fechar Detalhes"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Title Section */}
        <div className="mb-6 shrink-0 flex items-start gap-4 pr-10">
          <div className="bg-muted/50 p-3 border border-border/40 shrink-0">
            <Building2 className="h-6 w-6 text-foreground" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold tracking-tight text-foreground leading-tight">
              {bank.name}
            </h3>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="font-sans text-[10px] tracking-widest text-muted-foreground uppercase font-bold">
                CNPJ: {bank.cnpj}
              </span>
              <span className="text-muted-foreground/30">•</span>
              <span className="font-sans text-[10px] tracking-widest text-muted-foreground uppercase font-bold bg-muted/40 px-2 py-0.5 border border-border/30">
                SEG: {bank.segmento}
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-6 min-h-0">
          
          {/* Knockout Warning Card */}
          {analysis.isKnockedOut && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 rounded-none animate-in fade-in duration-300">
              <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-sans text-[10px] font-bold uppercase tracking-widest text-rose-500 mb-1">
                  Inviabilidade de Risco (Knockout)
                </h5>
                <p className="font-sans text-xs text-rose-200/80 leading-relaxed mb-1.5">
                  Este emissor foi sinalizado como **Inviável** devido aos seguintes critérios de exclusão:
                </p>
                <ul className="list-disc list-inside font-sans text-xs text-rose-300 leading-relaxed space-y-0.5">
                  {analysis.knockoutReasons.map((reason, idx) => (
                    <li key={idx} className="marker:text-rose-500">{reason}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Scores By Dimension Section */}
          <div className="flex flex-col gap-3">
            <h4 className="font-sans text-[11px] font-black uppercase tracking-widest text-foreground">
              Pontuação por Dimensão
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {dims.map((dim) => {
                const score = analysis.dimensionScores?.[dim.key] ?? 0;
                const percent = Math.min(100, Math.max(0, score * 10));

                let barColor = 'bg-rose-500';
                let textColor = 'text-rose-500';
                if (score >= 7.5) {
                  barColor = 'bg-blue-500';
                  textColor = 'text-blue-500';
                } else if (score >= 5.0) {
                  barColor = 'bg-emerald-500';
                  textColor = 'text-emerald-500';
                } else if (score >= 3.5) {
                  barColor = 'bg-amber-500';
                  textColor = 'text-amber-500';
                }

                return (
                  <div 
                    key={dim.key} 
                    className="flex flex-col gap-2 bg-muted/10 border border-border/40 p-4 hover:border-foreground/30 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {dim.label}
                      </span>
                      <span className={`font-serif text-base font-black ${textColor}`}>
                        {score.toFixed(1)} <span className="text-[10px] text-muted-foreground font-sans font-normal">/ 10</span>
                      </span>
                    </div>
                    <div className="h-[3px] bg-muted/40 w-full relative overflow-hidden">
                      <div 
                        className={`h-full ${barColor} transition-all duration-500`} 
                        style={{ width: `${percent}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manual Input Fields Section */}
          <div className="flex flex-col gap-6 border-t border-border/40 pt-6 mt-4">
            <h4 className="font-sans text-[11px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-foreground" /> Atributos de Ajuste Manual
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rating Externo Field */}
              <div className="flex flex-col gap-2">
                <label 
                  htmlFor="modal-rating" 
                  className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  Rating Externo
                </label>
                <select
                  id="modal-rating"
                  value={ratingState}
                  onChange={(e) => setRatingState(e.target.value)}
                  className="w-full bg-background border border-border/60 text-foreground font-sans text-xs px-3 py-2 outline-none rounded-none focus:border-foreground transition-all h-10 cursor-pointer focus-visible:ring-1 focus-visible:ring-foreground"
                >
                  <option value="SR">Sem Rating (SR)</option>
                  <option value="AAA">AAA (Grau Máximo)</option>
                  <option value="AA+">AA+</option>
                  <option value="AA">AA</option>
                  <option value="AA-">AA-</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="A-">A-</option>
                  <option value="BBB+">BBB+</option>
                  <option value="BBB">BBB</option>
                  <option value="BBB-">BBB-</option>
                  <option value="BB+">BB+</option>
                  <option value="BB">BB</option>
                  <option value="BB-">BB-</option>
                  <option value="B+">B+</option>
                  <option value="B">B</option>
                  <option value="B-">B-</option>
                  <option value="CCC">CCC</option>
                  <option value="D">D (Default)</option>
                </select>
              </div>

              {/* LCR (%) Field */}
              <div className="flex flex-col gap-2">
                <label 
                  htmlFor="modal-lcr" 
                  className="font-sans text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  LCR - Liquidez de Curto Prazo (%)
                </label>
                <input
                  id="modal-lcr"
                  type="text"
                  placeholder="Ex: 150.0"
                  value={lcrState}
                  onChange={(e) => {
                    let val = e.target.value.replace(',', '.');
                    val = val.replace(/[^0-9.]/g, '');
                    const parts = val.split('.');
                    if (parts.length > 2) {
                      val = parts[0] + '.' + parts.slice(1).join('');
                    }
                    setLcrState(val);
                  }}
                  className="w-full bg-background border border-border/60 text-foreground font-sans text-xs px-3 py-2 outline-none rounded-none focus:border-foreground transition-all h-10 text-left focus-visible:ring-1 focus-visible:ring-foreground"
                />
              </div>
            </div>

            <p className="font-sans text-[9px] text-muted-foreground leading-relaxed">
              * O LCR e o Rating Externo exigem atualização periódica manual por não estarem disponíveis de forma padronizada nas planilhas brutas do IF.data. Ao salvar, as novas métricas serão integradas permanentemente na base do Supabase e recalcularão as pontuações e status eliminatórios de forma reativa e instantânea.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="shrink-0 border-t border-border/40 pt-6 mt-6 flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-[10px] font-bold uppercase tracking-widest px-6 py-3 border border-border hover:bg-muted text-foreground transition-colors cursor-pointer rounded-none"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="font-sans text-[10px] font-bold uppercase tracking-widest px-6 py-3 bg-foreground text-background hover:bg-foreground/90 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer rounded-none font-bold"
          >
            {isSaving ? (
              <>
                <span className="inline-block h-3 w-3 border-2 border-background border-t-transparent rounded-full animate-spin" /> 
                <span>Salvando...</span>
              </>
            ) : saveStatus === 'success' ? (
              <>
                <Check className="h-3.5 w-3.5" /> <span>Salvo com Sucesso!</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" /> <span>Salvar Dados</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
