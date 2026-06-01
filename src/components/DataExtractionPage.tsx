// ============================================================
// DATA EXTRACTION PAGE - Unified Scorecard Upload
// ============================================================

import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Calendar, FileSpreadsheet } from 'lucide-react';
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
  'Deposito_Vista_vs_Funding (%)'?: string;
  PCLD_Saldo?: string;
  Total_Depositos?: string;
  Captacoes_Totais?: string;
  Atraso_Total?: string;
  'LDR (%)'?: string;
  'Indice_Inadimplencia_II (%)'?: string;
  'ICP_Cobertura (%)'?: string;
  'ROE_Calculado (%)'?: string;
  'ROA_Calculado (%)'?: string;
  'Indice_Eficiencia (%)'?: string;
  'Proxy_Liquidez_IAL (%)'?: string;
  'Tendencia_Crescimento_Carteira (%)'?: string;
  'Tendencia_CET1 (pp)'?: string;
  'Tendencia_ROA (pp)'?: string;
  'Tendencia_LDR (pp)'?: string;
  'Tendencia_Proxy_Liquidez (pp)'?: string;
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
  const [lastUpload, setLastUpload] = useState<string | null>(null);
  
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  const fetchLastUploadDate = async () => {
    try {
      const { data, error } = await supabase
        .from('emissores_bancarios')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0 && data[0].updated_at) {
        const date = new Date(data[0].updated_at);
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

  useEffect(() => {
    fetchLastUploadDate();
  }, []);

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

            log('INFO', 'Consultando base de parâmetros cadastrados no banco de dados (Supabase)...');
            await sleep(150);

            const { data: dbParams, error: dbError } = await supabase
              .from('parametros_indicadores')
              .select('key, label, col_planilha');

            const dbParamsMap = new Map<string, { key: string; label: string; col_planilha?: string }>();
            if (dbError) {
              log('WARNING', `Não foi possível carregar parâmetros do banco: ${dbError.message}`);
            } else if (dbParams) {
              dbParams.forEach(p => dbParamsMap.set(p.key, p));
              log('SUCCESS', `Parâmetros carregados com sucesso. Encontrados ${dbParams.length} indicadores.`);
            }

            log('INFO', 'Iniciando mapeamento de cabeçalhos para todos os dados e indicadores regulatórios do BACEN...');
            await sleep(150);

            const sample = rows[0];

            // Robust accent-insensitive, case-insensitive, symbol-neutral column finder
            const findColName = (keywords: string[]) => {
              const keys = Object.keys(sample);
              const normalize = (str: string) => 
                str.toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "") // remove accents
                  .replace(/[_\-\s\(\)%]/g, "")   // remove spaces, symbols, parens, percentages
                  .trim();
              
              // 1. Exact normalized match first
              for (const key of keys) {
                const nKey = normalize(key);
                for (const kw of keywords) {
                  const nKw = normalize(kw);
                  if (nKey === nKw) return key;
                }
              }
              // 2. Substring match second
              for (const key of keys) {
                const nKey = normalize(key);
                for (const kw of keywords) {
                  const nKw = normalize(kw);
                  if (nKey.includes(nKw) || nKw.includes(nKey)) return key;
                }
              }
              return undefined;
            };

            const colCodigo = findColName(['codigo', 'code']);
            const colNome = findColName(['instituicao', 'nome', 'emissor', 'bank', 'institution']);

            if (!colCodigo || !colNome) {
              throw new Error('Chaves primárias ausentes. O CSV deve conter identificadores correspondentes a "Código" e "Instituição".');
            }

            const getColsFor = (key: string, defaults: string[]) => {
              const param = dbParamsMap.get(key);
              if (param?.col_planilha) {
                return [param.col_planilha, ...defaults];
              }
              return defaults;
            };

            // Setup comprehensive keywords for all database fields
            const indicatorsMap = [
              { key: 'ib', label: 'Basileia', keywords: getColsFor('ib', ['indice basileia', 'basileia', 'ib']) },
              { key: 'cet1', label: 'CET1', keywords: getColsFor('cet1', ['cet1', 'capital principal cet1', 'cet 1']) },
              { key: 'ii', label: 'Inadimplência', keywords: getColsFor('ii', ['indice inadimplencia ii', 'inadimplencia', 'ii']) },
              { key: 'icp', label: 'Cobertura', keywords: getColsFor('icp', ['icp cobertura', 'cobertura', 'icp']) },
              { key: 'roe', label: 'ROE', keywords: getColsFor('roe', ['roe calculado', 'roe']) },
              { key: 'roa', label: 'ROA', keywords: getColsFor('roa', ['roa calculado', 'roa']) },
              { key: 'razao_alavancagem', label: 'Razão de Alavancagem', keywords: getColsFor('razao_alavancagem', ['razao alavancagem', 'alavancagem']) },
              { key: 'deposito_vista_funding', label: 'Depósito à Vista / Funding', keywords: getColsFor('deposito_vista_funding', ['deposito vista vs funding', 'deposito vista funding', 'deposito vista']) },
              { key: 'ativo_total', label: 'Ativo Total', keywords: getColsFor('ativo_total', ['ativo total', 'ativos', 'ativo']) },
              { key: 'carteira_credito', label: 'Carteira de Crédito', keywords: getColsFor('carteira_credito', ['carteira de credito total', 'carteira de credito', 'carteira credito', 'credito']) },
              { key: 'ie', label: 'Índice de Eficiência', keywords: getColsFor('ie', ['indice eficiencia ie', 'indice eficiencia', 'eficiencia', 'ie']) },
              { key: 'proxy_liquidez_ial', label: 'Proxy Liquidez IAL', keywords: getColsFor('proxy_liquidez_ial', ['proxy liquidez ial', 'proxy_liquidez_ial', 'ial']) },
              { key: 'tendencia_crescimento_carteira', label: 'Tendência Crescimento Carteira', keywords: getColsFor('tendencia_crescimento_carteira', ['tendencia crescimento carteira', 'tendencia_crescimento_carteira', 'tendencia cresc carteira']) },
              { key: 'tendencia_cet1', label: 'Tendência CET1', keywords: getColsFor('tendencia_cet1', ['tendencia cet1', 'tendencia_cet1']) },
              { key: 'tendencia_roa', label: 'Tendência ROA', keywords: getColsFor('tendencia_roa', ['tendencia roa', 'tendencia_roa']) },
              { key: 'tendencia_ldr', label: 'Tendência LDR', keywords: getColsFor('tendencia_ldr', ['tendencia ldr', 'tendencia_ldr']) },
              { key: 'tendencia_proxy_liquidez', label: 'Tendência Proxy Liquidez', keywords: getColsFor('tendencia_proxy_liquidez', ['tendencia proxy liquidez', 'tendencia_proxy_liquidez', 'tendencia liquidez']) },
              
              // Additional descriptive balanço columns
              { key: 'patrimonio_liquido', label: 'Patrimônio Líquido', keywords: ['patrimonio liquido', 'patrimonio_liquido', 'patrimonio'] },
              { key: 'lucro_liquido', label: 'Lucro Líquido', keywords: ['lucro liquido', 'lucro_liquido', 'lucro'] },
              { key: 'pcld', label: 'PCLD Saldo', keywords: ['pcld saldo', 'pcld_saldo', 'pcld'] },
              { key: 'total_depositos', label: 'Total Depósitos', keywords: ['total depositos', 'total_depositos', 'depositos'] },
              { key: 'captacoes_totais', label: 'Captações Totais', keywords: ['captacoes totais', 'captacoes_totais', 'captacoes'] },
              { key: 'atraso_total', label: 'Atraso Total', keywords: ['atraso total', 'atraso_total', 'atraso'] },
              { key: 'ldr', label: 'LDR', keywords: ['ldr', 'ldr (%)'] },
              { key: 'segmento', label: 'Segmento Prudencial', keywords: ['segmento prudencial', 'segmento_prudencial', 'segmento'] },
            ];

            const resolvedCols: Record<string, string | undefined> = {};
            for (const ind of indicatorsMap) {
              const foundCol = findColName(ind.keywords);
              if (foundCol) {
                resolvedCols[ind.key] = foundCol;
                log('SUCCESS', `Mapeamento OK: Indicador '${ind.label}' associado à coluna '${foundCol}'.`);
              } else {
                log('WARNING', `Atenção: Indicador '${ind.label}' não foi encontrado em nenhuma das colunas esperadas.`);
              }
              await sleep(80);
            }

            log('INFO', 'Iniciando normalização de dados e tratamento de decodificação binária dupla...');
            await sleep(150);

            const mappedBanks = rows.map((row: any) => {
              const codigo = String(row[colCodigo] || '').trim();
              if (!codigo || !/^\d+$/.test(codigo)) return null;

              return {
                codigo,
                nome: fixDoubleUtf8(String(row[colNome] || 'N/I').trim()),
                cnpj: String(row['CNPJ'] || row['cnpj'] || codigo).trim(),
                ativo_total: parseNumber(resolvedCols['ativo_total'] ? row[resolvedCols['ativo_total']!] : 0) / 1000000,
                patrimonio_liquido: parseNumber(resolvedCols['patrimonio_liquido'] ? row[resolvedCols['patrimonio_liquido']!] : 0) / 1000000,
                lucro_liquido: parseNumber(resolvedCols['lucro_liquido'] ? row[resolvedCols['lucro_liquido']!] : 0) / 1000000,
                carteira_credito: parseNumber(resolvedCols['carteira_credito'] ? row[resolvedCols['carteira_credito']!] : 0) / 1000000,
                segmento: resolvedCols['segmento'] ? String(row[resolvedCols['segmento']!] || 'S/S').trim() : 'S/S',
                ib: parseNumber(resolvedCols['ib'] ? row[resolvedCols['ib']!] : 0),
                cet1: parseNumber(resolvedCols['cet1'] ? row[resolvedCols['cet1']!] : 0),
                razao_alavancagem: parseNumber(resolvedCols['razao_alavancagem'] ? row[resolvedCols['razao_alavancagem']!] : 0),
                deposito_vista_funding: parseNumber(resolvedCols['deposito_vista_funding'] ? row[resolvedCols['deposito_vista_funding']!] : 0),
                pcld: parseNumber(resolvedCols['pcld'] ? row[resolvedCols['pcld']!] : 0) / 1000000,
                total_depositos: parseNumber(resolvedCols['total_depositos'] ? row[resolvedCols['total_depositos']!] : 0) / 1000000,
                captacoes_totais: parseNumber(resolvedCols['captacoes_totais'] ? row[resolvedCols['captacoes_totais']!] : 0) / 1000000,
                atraso_total: parseNumber(resolvedCols['atraso_total'] ? row[resolvedCols['atraso_total']!] : 0) / 1000000,
                ldr: parseNumber(resolvedCols['ldr'] ? row[resolvedCols['ldr']!] : 0),
                ii: parseNumber(resolvedCols['ii'] ? row[resolvedCols['ii']!] : 0),
                icp: parseNumber(resolvedCols['icp'] ? row[resolvedCols['icp']!] : 0),
                roe: parseNumber(resolvedCols['roe'] ? row[resolvedCols['roe']!] : 0),
                roa: parseNumber(resolvedCols['roa'] ? row[resolvedCols['roa']!] : 0),
                ie: parseNumber(resolvedCols['ie'] ? row[resolvedCols['ie']!] : 0),
                proxy_liquidez_ial: resolvedCols['proxy_liquidez_ial'] && row[resolvedCols['proxy_liquidez_ial']!] !== undefined && row[resolvedCols['proxy_liquidez_ial']!] !== '' ? parseNumber(row[resolvedCols['proxy_liquidez_ial']!]) : null,
                tendencia_crescimento_carteira: resolvedCols['tendencia_crescimento_carteira'] && row[resolvedCols['tendencia_crescimento_carteira']!] !== undefined && row[resolvedCols['tendencia_crescimento_carteira']!] !== '' ? parseNumber(row[resolvedCols['tendencia_crescimento_carteira']!]) : null,
                tendencia_cet1: resolvedCols['tendencia_cet1'] && row[resolvedCols['tendencia_cet1']!] !== undefined && row[resolvedCols['tendencia_cet1']!] !== '' ? parseNumber(row[resolvedCols['tendencia_cet1']!]) : null,
                tendencia_roa: resolvedCols['tendencia_roa'] && row[resolvedCols['tendencia_roa']!] !== undefined && row[resolvedCols['tendencia_roa']!] !== '' ? parseNumber(row[resolvedCols['tendencia_roa']!]) : null,
                tendencia_ldr: resolvedCols['tendencia_ldr'] && row[resolvedCols['tendencia_ldr']!] !== undefined && row[resolvedCols['tendencia_ldr']!] !== '' ? parseNumber(row[resolvedCols['tendencia_ldr']!]) : null,
                tendencia_proxy_liquidez: resolvedCols['tendencia_proxy_liquidez'] && row[resolvedCols['tendencia_proxy_liquidez']!] !== undefined && row[resolvedCols['tendencia_proxy_liquidez']!] !== '' ? parseNumber(row[resolvedCols['tendencia_proxy_liquidez']!]) : null,
                rating: 'SR',
                fgc: 'coberto_250k'
              };
            }).filter(Boolean) as any[];

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
              let { error: upsertError } = await supabase
                .from('emissores_bancarios')
                .upsert(chunk, { onConflict: 'codigo' });

              // Fallback block if table has not been migrated yet
              if (upsertError && (upsertError.message.includes('does not exist') || upsertError.code === '42703' || upsertError.message.includes('coluna'))) {
                log('WARNING', `⚠️ Lote ${Math.floor(i / chunkSize) + 1} falhou: Colunas novas ausentes no banco. Ativando enquadramento legado (removendo tendências e mapeando IAL como LCR)...`);
                
                const fallbackChunk = chunk.map(item => {
                  const copy = { ...item };
                  // Rename proxy_liquidez_ial to lcr
                  if (copy.proxy_liquidez_ial !== undefined && copy.proxy_liquidez_ial !== null) {
                    copy.lcr = copy.proxy_liquidez_ial;
                  }
                  // Delete new columns
                  delete copy.proxy_liquidez_ial;
                  delete copy.tendencia_crescimento_carteira;
                  delete copy.tendencia_cet1;
                  delete copy.tendencia_roa;
                  delete copy.tendencia_ldr;
                  delete copy.tendencia_proxy_liquidez;
                  return copy;
                });

                const { error: fallbackError } = await supabase
                  .from('emissores_bancarios')
                  .upsert(fallbackChunk, { onConflict: 'codigo' });
                
                if (fallbackError) {
                  throw new Error(`Erro crítico no lote ${Math.floor(i / chunkSize) + 1} mesmo no modo legado: ${fallbackError.message}`);
                }
                upsertError = null;
              } else if (upsertError) {
                throw new Error(`Erro ao enviar lote ${Math.floor(i / chunkSize) + 1}: ${upsertError.message}`);
              }

              log('INFO', `Lote ${Math.floor(i / chunkSize) + 1}/${Math.ceil(mappedBanks.length / chunkSize)} enviado (${chunk.length} registros).`);
              await sleep(100);
            }

            log('SUCCESS', `Lote final processado. Transação concluída com sucesso!`);
            await sleep(150);

            await fetchLastUploadDate();

            log('SUCCESS', `Base consolidada atualizada com sucesso.`);
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
    <div className="max-w-[1920px] mx-auto px-8 py-6 h-[calc(100vh-155px)] flex flex-col overflow-hidden">
      {/* Header Section */}
      <div className="mb-6 shrink-0 flex items-start justify-between gap-8">
        <div className="max-w-4xl">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-foreground leading-tight mb-2">
            Carga de Dados
          </h2>
          <p className="font-serif text-xs italic text-muted-foreground leading-relaxed">
            Importe o scorecard consolidado para popular o banco de dados centralizado. O sistema realiza a extração completa e a consolidação de todos os dados regulatórios necessários do BACEN — e não apenas de 6 indicadores isolados — processando de forma integrada o balanço patrimonial, dados prudenciais e indicadores de risco dos emissores.
          </p>
        </div>
        
        <div className="flex-shrink-0 pt-1">
          <div className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-widest text-foreground bg-muted/40 px-3 py-2 border border-border/50">
            <Calendar className="h-3.5 w-3.5" />
            <span>Último Upload: {lastUpload ? lastUpload : 'Nenhum realizado'}</span>
          </div>
        </div>
      </div>

      {/* Grid Layout for Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 overflow-hidden mb-4">
        
        {/* Left Column: Upload Area */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-0">
          <div 
            className={`relative border-2 border-dashed flex-1 flex flex-col items-center justify-center p-8 transition-all duration-300 h-full ${
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
              Arraste e solte o arquivo <strong className="text-foreground">scorecard_emissores_master.csv</strong> aqui, ou clique para navegar nos seus arquivos.
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
        <div className="lg:col-span-5 flex flex-col gap-6 h-full min-h-0">
          <div className="flex-1 bg-muted/20 p-6 border border-border/50 flex flex-col gap-4 min-h-0">
            <div className="flex items-center justify-between pb-2 border-b border-border/40 shrink-0">
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
              <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto font-mono text-[9px] leading-normal text-foreground/80 bg-black/5 dark:bg-black/40 p-4 border border-border/40 rounded-none">
                {logs.map((lg, i) => (
                  <div key={i} className="whitespace-pre-wrap">{lg}</div>
                ))}
                <div ref={consoleEndRef} />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center font-mono text-[9px] italic text-muted-foreground bg-black/5 dark:bg-black/40 p-4 border border-border/40 rounded-none">
                &gt;_ Aguardando carga de arquivo CSV para iniciar ingestão...
              </div>
            )}
          </div>

          <div className="bg-muted/10 p-6 border border-border/30 flex flex-col gap-3 shrink-0">
            <h4 className="font-sans text-[10px] font-bold uppercase tracking-widest text-foreground">
              Diretrizes de Ingestão
            </h4>
            <ul className="flex flex-col gap-2 font-sans text-[11px] text-foreground/70 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-muted-foreground">—</span>
                Estrutura compatível com os 17 indicadores cadastrados no banco (IB, CET1, II, ICP, ROE, ROA, RA, DV/F, AT, CC, IE, IAL e as 5 Tendências).
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground">—</span>
                Validação automática de parâmetros e verificação de regras ausentes em tempo real.
              </li>
              <li className="flex gap-2">
                <span className="text-muted-foreground">—</span>
                Divisão automática dos emissores em lotes de alto desempenho para evitar limites de timeout.
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
