// ============================================================
// DATA EXTRACTION PAGE - Unified Scorecard Upload
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Calendar, Play, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

interface ParseResultRow {
  Código?: string;
  Instituição?: string;
  'Ativo Total'?: string;
  'Patrimônio Líquido'?: string;
  'Lucro Líquido'?: string;
  'Carteira de Crédito Total'?: string;
  Segmento_Prudencial?: string;
  'Indice_Basileia (%)'?: string;
  'Capital_Principal_CET1 (%)'?: string;
  'Razao_Alavancagem (%)'?: string;
  PCLD_Saldo?: string;
  Total_Depositos?: string;
  Captacoes_Totais?: string;
  Atraso_Total?: string;
  'LDR (%)'?: string;
  'Indice_Inadimplencia_II (%)'?: string;
  'ICP_Cobertura (%)'?: string;
  'ROE_Calculado (%)'?: string;
  'ROA_Calculado (%)'?: string;
}

function parseNumber(value: any): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  
  let cleaned = String(value).replace('%', '').trim();
  // Se tiver pontos de milhar e vírgula decimal (ex: 1.234.567,89)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function fixDoubleUtf8(str: string): string {
  if (!str) return '';
  try {
    const cp1252Map: Record<number, number> = {
      0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
      0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
      0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
      0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0xff
    };
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (code < 256) {
        bytes.push(code);
      } else if (code in cp1252Map) {
        bytes.push(cp1252Map[code]);
      } else {
        return str;
      }
    }
    return new TextDecoder('utf-8').decode(new Uint8Array(bytes));
  } catch (e) {
    return str;
  }
}

export function DataExtractionPage({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastUpload, setLastUpload] = useState<string | null>(() => localStorage.getItem('rendafixa:last_upload_date'));
  
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

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
    e.target.value = ''; // Reset input
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
      log('INFO', 'Iniciando leitura estrutural e parsing do arquivo CSV...');
      await sleep(150);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: 'UTF-8',
        complete: async (results) => {
          try {
            const rows = results.data as ParseResultRow[];
            
            if (!rows || rows.length === 0) {
              throw new Error('O arquivo CSV está vazio ou ilegível.');
            }

            log('SUCCESS', `Parser concluído. Encontrados ${rows.length} registros no CSV.`);
            await sleep(150);

            log('INFO', 'Iniciando mapeamento de cabeçalhos para os 6 indicadores de risco...');
            await sleep(150);

            const sample = rows[0];
            const hasCodigo = 'Código' in sample || 'codigo' in sample;
            const hasNome = 'Instituição' in sample || 'instituicao' in sample;

            if (!hasCodigo || !hasNome) {
              throw new Error('Chaves primárias ausentes. O CSV deve conter "Código" e "Instituição".');
            }

            // Check each indicator column presence in CSV
            const indicatorsMap = [
              { key: 'ib', label: 'Basileia', cols: ['Indice_Basileia (%)', 'Indice_Basileia', 'ib'] },
              { key: 'cet1', label: 'CET1', cols: ['Capital_Principal_CET1 (%)', 'Capital_Principal_CET1', 'cet1'] },
              { key: 'ii', label: 'Inadimplência', cols: ['Indice_Inadimplencia_II (%)', 'Indice_Inadimplencia_II', 'ii'] },
              { key: 'icp', label: 'Cobertura', cols: ['ICP_Cobertura (%)', 'ICP_Cobertura', 'icp'] },
              { key: 'roe', label: 'ROE', cols: ['ROE_Calculado (%)', 'ROE_Calculado', 'roe'] },
              { key: 'roa', label: 'ROA', cols: ['ROA_Calculado (%)', 'ROA_Calculado', 'roa'] },
            ];

            for (const ind of indicatorsMap) {
              const foundCol = ind.cols.find(c => c in sample);
              if (foundCol) {
                log('SUCCESS', `Mapeamento OK: Indicador '${ind.label}' associado à coluna '${foundCol}'.`);
              } else {
                log('WARNING', `Atenção: Indicador '${ind.label}' não foi encontrado em nenhuma das colunas esperadas.`);
              }
              await sleep(80);
            }

            log('INFO', 'Consultando base de parâmetros cadastrados no banco de dados (Supabase)...');
            await sleep(150);

            // Compare with Supabase indicators parameter database
            const { data: dbParams, error: dbError } = await supabase
              .from('parametros_indicadores')
              .select('key, label');

            if (dbError) {
              log('WARNING', `Não foi possível validar os parâmetros no banco de dados: ${dbError.message}`);
            } else {
              const dbKeys = new Set((dbParams || []).map(p => p.key));
              log('SUCCESS', `Conexão Supabase OK. Encontrados ${dbParams?.length || 0} indicadores parametrizados no banco.`);
              await sleep(100);

              for (const ind of indicatorsMap) {
                if (dbKeys.has(ind.key)) {
                  log('SUCCESS', `Sincronização OK: Indicador '${ind.label}' possui regras cadastradas no banco.`);
                } else {
                  log('WARNING', `Alerta de Inconsistência: Indicador '${ind.label}' está ausente nas regras de parâmetros no banco!`);
                }
                await sleep(80);
              }
            }

            log('INFO', 'Iniciando normalização de dados e tratamento de decodificação binária dupla...');
            await sleep(150);

            const mappedBanks = rows.map((row: any) => {
              const codigo = String(row['Código'] || row['codigo'] || '').trim();
              if (!codigo || !/^\d+$/.test(codigo)) return null;

              return {
                codigo,
                nome: fixDoubleUtf8(String(row['Instituição'] || row['instituicao'] || 'N/I').trim()),
                cnpj: String(row['CNPJ'] || row['cnpj'] || codigo).trim(),
                ativo_total: parseNumber(row['Ativo Total'] || row['ativo_total']),
                patrimonio_liquido: parseNumber(row['Patrimônio Líquido'] || row['patrimonio_liquido']),
                lucro_liquido: parseNumber(row['Lucro Líquido'] || row['lucro_liquido']),
                carteira_credito: parseNumber(row['Carteira de Crédito Total'] || row['carteira_credito_total'] || row['Carteira de Crédito']),
                segmento: String(row['Segmento_Prudencial'] || row['segmento_prudencial'] || 'S/S').trim(),
                ib: parseNumber(row['Indice_Basileia (%)'] || row['Indice_Basileia'] || row['ib']),
                cet1: parseNumber(row['Capital_Principal_CET1 (%)'] || row['Capital_Principal_CET1'] || row['cet1']),
                razao_alavancagem: parseNumber(row['Razao_Alavancagem (%)'] || row['Razao_Alavancagem']),
                pcld: parseNumber(row['PCLD_Saldo'] || row['pcld_saldo'] || row['pcld']),
                total_depositos: parseNumber(row['Total_Depositos'] || row['total_depositos']),
                captacoes_totais: parseNumber(row['Captacoes_Totais'] || row['captacoes_totais']),
                atraso_total: parseNumber(row['Atraso_Total'] || row['atraso_total']),
                ldr: parseNumber(row['LDR (%)'] || row['ldr']),
                ii: parseNumber(row['Indice_Inadimplencia_II (%)'] || row['Indice_Inadimplencia_II'] || row['ii']),
                icp: parseNumber(row['ICP_Cobertura (%)'] || row['ICP_Cobertura'] || row['icp']),
                roe: parseNumber(row['ROE_Calculado (%)'] || row['ROE_Calculado'] || row['roe']),
                roa: parseNumber(row['ROA_Calculado (%)'] || row['ROA_Calculado'] || row['roa']),
                rating: 'SR',
                fgc: 'coberto_250k'
              };
            }).filter(Boolean);

            if (mappedBanks.length === 0) {
              throw new Error('Nenhum registro com código de emissor numérico válido foi estruturado.');
            }

            log('INFO', `Processamento concluído. ${mappedBanks.length} emissores estruturados com sucesso.`);
            await sleep(150);

            log('INFO', 'Executando carga transacional de alta performance via Upsert no Supabase...');
            await sleep(150);

            // Split mapping into chunks of 200 for safe upload (as we did in seed_csv)
            const chunkSize = 200;
            for (let i = 0; i < mappedBanks.length; i += chunkSize) {
              const chunk = mappedBanks.slice(i, i + chunkSize);
              const { error: upsertError } = await supabase
                .from('emissores_bancarios')
                .upsert(chunk, { onConflict: 'codigo' });

              if (upsertError) {
                throw new Error(`Erro ao enviar lote ${Math.floor(i / chunkSize) + 1}: ${upsertError.message}`);
              }
              log('INFO', `Lote ${Math.floor(i / chunkSize) + 1}/${Math.ceil(mappedBanks.length / chunkSize)} enviado (${chunk.length} registros).`);
              await sleep(100);
            }

            log('SUCCESS', `Lote final processado. Transação concluída com sucesso!`);
            await sleep(150);

            const nowStr = new Date().toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            localStorage.setItem('rendafixa:last_upload_date', nowStr);
            setLastUpload(nowStr);

            log('SUCCESS', `Base consolidada atualizada com sucesso em ${nowStr}.`);
            setUploadStatus('success');
            
            if (onUploadSuccess) onUploadSuccess();
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

  return (
    <div className="max-w-[1920px] mx-auto px-8 py-10">
      {/* Header Section */}
      <div className="max-w-4xl mb-10">
        <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground leading-tight mb-3">
          Carga de Dados
        </h2>
        <p className="font-serif text-sm italic text-muted-foreground leading-relaxed mb-4">
          Importe o scorecard consolidado para popular o banco de dados centralizado. O sistema processará todas as métricas financeiras dos emissores em conformidade com as regras prudenciais.
        </p>
        
        <div className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-widest text-foreground bg-muted/40 inline-flex px-3 py-1.5 border border-border/50">
          <Calendar className="h-3.5 w-3.5" />
          <span>Último Upload: {lastUpload ? lastUpload : 'Nenhum realizado'}</span>
        </div>
      </div>

      {/* Grid Layout for Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Upload Area */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div 
            className={`relative border-2 border-dashed flex flex-col items-center justify-center p-10 transition-all duration-300 min-h-[300px] ${
              dragActive ? 'border-foreground bg-muted/60 scale-[0.99]' : 'border-border/60 hover:border-foreground/50 bg-muted/10'
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
              title="Selecionar arquivo CSV consolidado"
            />
            
            {uploadStatus === 'success' ? (
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4 animate-in zoom-in duration-300" />
            ) : uploadStatus === 'error' ? (
              <AlertCircle className="h-12 w-12 text-destructive mb-4 animate-in zoom-in duration-300" />
            ) : (
              <FileSpreadsheet className={`h-12 w-12 text-muted-foreground mb-4 transition-transform ${isProcessing ? 'animate-bounce' : ''}`} />
            )}
            
            <h3 className="font-serif text-lg font-bold text-foreground text-center mb-1">
              Upload do Scorecard Consolidado
            </h3>
            <p className="font-sans text-xs text-muted-foreground text-center max-w-md leading-relaxed">
              Arraste e solte o arquivo <strong className="text-foreground">scorecard_emissores_final.csv</strong> aqui, ou clique para navegar nos seus arquivos.
            </p>
            
            <div className="mt-6 flex gap-2">
              <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-muted-foreground border border-border px-2.5 py-1 rounded-none">
                Apenas arquivos .CSV
              </span>
              <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-muted-foreground border border-border px-2.5 py-1 rounded-none">
                UTF-8 Encoding
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Processing Panel & Context */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-muted/20 p-6 border border-border/50 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/40">
              <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground">
                Console de Auditoria ETL
              </h4>
              {isProcessing && (
                <span className="font-sans text-[9px] font-bold uppercase tracking-widest text-foreground animate-pulse">
                  Processando...
                </span>
              )}
            </div>
            
            {logs.length > 0 ? (
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[220px] font-mono text-[9px] leading-normal text-foreground/80 bg-black/5 dark:bg-black/40 p-4 border border-border/40 min-h-[160px] rounded-none">
                {logs.map((lg, i) => (
                  <div key={i} className="whitespace-pre-wrap">{lg}</div>
                ))}
                <div ref={consoleEndRef} />
              </div>
            ) : (
              <div className="flex items-center justify-center font-mono text-[9px] italic text-muted-foreground bg-black/5 dark:bg-black/40 p-4 border border-border/40 min-h-[160px] rounded-none">
                &gt;_ Aguardando carga de arquivo CSV para iniciar ingestão...
              </div>
            )}
          </div>

          <div className="bg-muted/10 p-6 border border-border/30 flex flex-col gap-3">
            <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground">
              Diretrizes de Ingestão
            </h4>
            <ul className="flex flex-col gap-2 font-sans text-[11px] text-foreground/70 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-muted-foreground">—</span>
                Estrutura compatível com os 6 indicadores cadastrados no banco.
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground">—</span>
                Validação automática de parâmetros e verificação de regras ausentes.
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground">—</span>
                Divisão automática dos emissores em lotes de alto desempenho.
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
