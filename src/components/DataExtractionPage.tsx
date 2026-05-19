// ============================================================
// DATA EXTRACTION PAGE - Professional Upload Area
// ============================================================

import { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Calendar, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  extractCapital,
  extractResultado,
  extractAtivo,
  extractResumo,
  extractSegmentacao,
  mergeExtractedData
} from '@/lib/csvExtractors';
import type { ExtractedBankData } from '@/lib/csvExtractors';

function UploadZone({ title, subtitle, onFileSelect, status }: { 
  title: string, 
  subtitle: string, 
  onFileSelect: (file: File) => void,
  status: 'idle' | 'success' | 'error' 
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
    e.target.value = '';
  };

  return (
    <div 
      className={`relative border-2 border-dashed flex flex-col items-center justify-center p-8 transition-colors ${
        isDragging ? 'border-foreground bg-muted/50' : 'border-border/60 hover:border-foreground/50'
      } ${status === 'success' ? 'bg-muted/20 border-foreground/30' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        accept=".csv" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
        onChange={handleChange}
        title={`Fazer upload de ${title}`}
      />
      
      {status === 'success' ? (
        <CheckCircle2 className="h-10 w-10 text-foreground mb-4" />
      ) : status === 'error' ? (
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
      ) : (
        <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
      )}
      
      <h3 className="font-serif text-xl font-bold text-foreground text-center mb-1">{title}</h3>
      <p className="font-sans text-xs text-muted-foreground text-center">{subtitle}</p>
      
      {status === 'success' && (
        <span className="mt-4 font-sans text-[10px] font-bold uppercase tracking-widest text-foreground bg-foreground/10 px-3 py-1">
          Arquivo Carregado
        </span>
      )}
    </div>
  );
}

export function DataExtractionPage() {
  // Store the raw parsed arrays
  const [parsedData, setParsedData] = useState<{
    capital: Partial<ExtractedBankData>[];
    resultado: Partial<ExtractedBankData>[];
    ativo: Partial<ExtractedBankData>[];
    resumo: Partial<ExtractedBankData>[];
    segmentacao: Partial<ExtractedBankData>[];
  }>({
    capital: [],
    resultado: [],
    ativo: [],
    resumo: [],
    segmentacao: [],
  });

  const [uploads, setUploads] = useState({
    capital: 'idle' as 'idle' | 'success' | 'error',
    resultado: 'idle' as 'idle' | 'success' | 'error',
    ativo: 'idle' as 'idle' | 'success' | 'error',
    resumo: 'idle' as 'idle' | 'success' | 'error',
    segmentacao: 'idle' as 'idle' | 'success' | 'error',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string | null>(null);
  
  const lastUploadDate = "19/05/2026 às 14:00";

  const autoSave = async (allData: typeof parsedData, successMsg: string) => {
    setIsProcessing(true);
    setProcessStatus(`${successMsg} Salvando no banco de dados...`);

    try {
      const merged = mergeExtractedData(
        allData.capital,
        allData.resultado,
        allData.ativo,
        allData.resumo,
        allData.segmentacao
      );

      const validBanks = merged.filter(b => b.codigo);

      if (validBanks.length === 0) {
        throw new Error('Nenhum dado válido extraído. Verifique o console do navegador e a estrutura da planilha.');
      }

      const { error } = await supabase
        .from('emissores_bancarios')
        .upsert(validBanks, { onConflict: 'codigo' });

      if (error) throw new Error(error.message);

      setProcessStatus(`${successMsg} Salvamento concluído com sucesso!`);
    } catch (err: any) {
      console.error(err);
      setProcessStatus(`❌ Erro ao salvar: ${err.message || 'Falha ao conectar com Supabase.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (type: keyof typeof uploads, file: File) => {
    try {
      setProcessStatus(`Processando arquivo...`);
      let data: Partial<ExtractedBankData>[] = [];
      let successMsg = '';
      
      if (type === 'capital') {
        data = await extractCapital(file);
        successMsg = '✅ IB e CET extraídos!';
      } else if (type === 'resultado') {
        data = await extractResultado(file);
        successMsg = '✅ ROE, ROA e Índice de Eficiência extraídos!';
      } else if (type === 'ativo') {
        data = await extractAtivo(file);
        successMsg = '✅ PCLD extraído!';
      } else if (type === 'resumo') {
        data = await extractResumo(file);
        successMsg = '✅ Dados de Inadimplência e Resumo extraídos!';
      } else if (type === 'segmentacao') {
        data = await extractSegmentacao(file);
        successMsg = '✅ Filtros Prudenciais extraídos!';
      }

      setParsedData(prev => {
        const nextData = { ...prev, [type]: data };
        autoSave(nextData, successMsg);
        return nextData;
      });

      setUploads(prev => ({ ...prev, [type]: 'success' }));
    } catch (err: any) {
      console.error(err);
      setUploads(prev => ({ ...prev, [type]: 'error' }));
      setProcessStatus(`❌ Erro: ${err.message}`);
    }
  };


  return (
    <div className="max-w-[1920px] mx-auto px-8 py-16">
      <div className="max-w-4xl mb-16">
        <h2 className="font-serif text-5xl font-bold tracking-tight text-foreground leading-tight mb-4">
          Extração de Dados
        </h2>
        <p className="font-serif text-xl italic text-muted-foreground leading-relaxed mb-6">
          Faça o upload dos relatórios extraídos do sistema IF.data do Banco Central. São necessárias as 5 bases de dados de um mesmo trimestre para que o motor extraia e consolide todos os indicadores.
        </p>
        
        <div className="flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-widest text-foreground bg-muted/40 inline-flex px-4 py-2 border border-border/50">
          <Calendar className="h-4 w-4" />
          <span>Último Processamento: {lastUploadDate}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <UploadZone 
          title="1. Informações de Capital" 
          subtitle="Índice de Basileia (IB) e Capital Principal (CET1)."
          status={uploads.capital}
          onFileSelect={(f) => handleFileUpload('capital', f)}
        />
        <UploadZone 
          title="2. Dem. de Resultado" 
          subtitle="ROE, ROA e Índice de Eficiência."
          status={uploads.resultado}
          onFileSelect={(f) => handleFileUpload('resultado', f)}
        />
        <UploadZone 
          title="3. Ativo" 
          subtitle="PCLD (Provisão para Créditos de Liq. Duvidosa)."
          status={uploads.ativo}
          onFileSelect={(f) => handleFileUpload('ativo', f)}
        />
        <UploadZone 
          title="4. Resumo" 
          subtitle="Inadimplência, Atraso > 90d, Patrimônio e Ativos."
          status={uploads.resumo}
          onFileSelect={(f) => handleFileUpload('resumo', f)}
        />
        <UploadZone 
          title="5. Segmentação" 
          subtitle="Filtro Prudencial (S1 a S5) e LCR."
          status={uploads.segmentacao}
          onFileSelect={(f) => handleFileUpload('segmentacao', f)}
        />
      </div>
      
      <div className="mt-16 bg-muted/20 p-8 border border-border/50 max-w-4xl flex flex-col gap-6">
        <h4 className="font-sans text-sm font-bold uppercase tracking-widest text-foreground">
          Processamento ETL
        </h4>
          {processStatus && (
            <div className="flex items-center gap-3 bg-background border border-border p-4 w-full">
              {isProcessing && <Play className="h-4 w-4 animate-pulse text-foreground" />}
              <span className="font-serif text-sm font-bold text-foreground">
                {processStatus}
              </span>
            </div>
          )}
      </div>
    </div>
  );
}
