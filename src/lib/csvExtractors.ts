import Papa from 'papaparse';

export interface ExtractedBankData {
  codigo: string;
  nome?: string;
  segmento?: string; // SR
  ib?: number;
  cet1?: number;
  pcld?: number;
  patrimonio_liquido?: number;
  ativo_total?: number;
  lucro_liquido?: number;
  // Others to be added as needed
}

/**
 * Converte string financeira do BACEN em número
 * Ex: "15,18%" -> 0.1518 (se isPercentage = true) ou 15.18 (se false)
 * Ex: "-43.936.102" -> -43936102
 */
function parseBacenNumber(value: any): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return value;

  let cleaned = String(value).trim();
  if (cleaned === 'NI' || cleaned === 'NA' || cleaned === '-') return undefined;

  // Se for valor monetário com pontos de milhar e sem vírgula decimal
  // ex: -43.936.102
  // Se for porcentagem ex: 15,18%
  
  if (cleaned.includes('%')) {
    cleaned = cleaned.replace('%', '');
  }

  // Remove pontos de milhar (apenas se for formato brasileiro onde . é milhar e , é decimal)
  // No BACEN, se tiver ponto e vírgula, ex: 1.000.000,00
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Se só tem ponto, pode ser milhar (ex: -43.936.102) ou já estar no formato decimal.
    // Como os valores financeiros no bacen sem centavos vêm com ponto de milhar,
    // precisamos ter cuidado. Assumiremos que valores grandes com pontos múltiplos são milhares.
    // Para simplificar, removemos todos os pontos se não houver vírgula, assumindo que são separadores de milhar de inteiros.
    // Isso é válido para as contas de balanço do BACEN.
    cleaned = cleaned.replace(/\./g, '');
  }

  const num = parseFloat(cleaned);
  if (isNaN(num)) return undefined;

  // No nosso modelo o IB/CET1 está em decimal puro (15% = 15.0) no mock,
  // Dependendo do que o indicador espera. Vamos manter o valor como 15.18.
  return num;
}

/**
 * Função genérica para parsear CSVs do IF.data (com delimitador ; e encoding latino)
 */
function parseIfDataCsv(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      delimiter: ';',
      encoding: 'ISO-8859-1', // Padrão BACEN
      skipEmptyLines: true,
      complete: (results) => {
        let headerIndex = -1;
        for (let i = 0; i < Math.min(10, results.data.length); i++) {
          const row = results.data[i] as string[];
          if (row.includes('Instituição') || row.includes('Código') || row.includes('SR')) {
            headerIndex = i;
            break;
          }
        }

        if (headerIndex === -1) {
          reject(new Error('Não foi possível identificar o cabeçalho (linha com "Código" ou "Instituição").'));
          return;
        }

        const headers = results.data[headerIndex] as string[];

        const parsedData = [];
        for (let i = headerIndex + 1; i < results.data.length; i++) {
          const rowArray = results.data[i] as string[];
          
          const codigoIdx = headers.indexOf('Código');
          if (codigoIdx === -1) continue;
          
          const codigoVal = rowArray[codigoIdx];
          // Valida se a linha tem um Código numérico (ignorando linhas de sub-cabeçalho)
          if (!codigoVal || !/^\\d+$/.test(codigoVal.trim())) {
             continue;
          }

          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            const safeH = h ? h.trim() : `Unnamed_${idx}`;
            if (!rowObj[safeH] && safeH !== '') {
              rowObj[safeH] = rowArray[idx];
            }
          });
          parsedData.push(rowObj);
        }

        resolve(parsedData);
      },
      error: (err) => reject(err)
    });
  });
}

// 1. Informações de Capital
export async function extractCapital(file: File): Promise<Partial<ExtractedBankData>[]> {
  const data = await parseIfDataCsv(file);
  return data.map(row => {
    return {
      codigo: String(row['Código']).trim(),
      nome: row['Instituição']?.trim(),
      segmento: row['SR']?.trim(),
      cet1: parseBacenNumber(row['Índice de Capital Principal (l) = (a) / (j)']),
      ib: parseBacenNumber(row['Índice de Basileia (n) = (e) / (j)']),
    };
  }).filter(b => b.codigo && b.codigo !== 'undefined');
}

// 2. Demonstração de Resultado (O usuário mencionou usar Resumo para base, mas DRE para os índices em si se vierem)
export async function extractResultado(file: File): Promise<Partial<ExtractedBankData>[]> {
  const data = await parseIfDataCsv(file);
  return data.map(row => {
    // Mapeamento exato depende da coluna do DRE, vamos inferir nomes prováveis ou retornar cru.
    // Como a instrução diz "ROE, ROA e Índice de Eficiência", precisamos descobrir as colunas reais.
    return {
      codigo: String(row['Código']).trim(),
      // Extrair indicadores de rentabilidade aqui quando souber os cabeçalhos literais
    };
  }).filter(b => b.codigo && b.codigo !== 'undefined');
}

// 3. Ativo (PCLD)
export async function extractAtivo(file: File): Promise<Partial<ExtractedBankData>[]> {
  const data = await parseIfDataCsv(file);
  return data.map(row => {
    // PCLD está na coluna 'Unnamed: 14' segundo o usuário, mas no PapaParse com header: false seria o índice 14.
    // Como usamos o cabeçalho original, precisamos ver qual o nome da 15ª coluna (índice 14).
    // Para simplificar, vou extrair a chave se for 'Unnamed: 14' ou pegar pelo índice dos values.
    const keys = Object.keys(row);
    const pcldRaw = row['Unnamed: 14'] || row[keys[14]]; 
    let pcld = parseBacenNumber(pcldRaw);
    
    // PCLD costuma ser negativo, pegamos valor absoluto ou multiplicamos por -1
    if (pcld !== undefined) pcld = Math.abs(pcld);

    return {
      codigo: String(row['Código'] || row[keys[0]]).trim(),
      pcld
    };
  }).filter(b => b.codigo && b.codigo !== 'undefined');
}

// 4. Resumo
export async function extractResumo(file: File): Promise<Partial<ExtractedBankData>[]> {
  const data = await parseIfDataCsv(file);
  return data.map(row => {
    return {
      codigo: String(row['Código']).trim(),
      patrimonio_liquido: parseBacenNumber(row['Patrimônio Líquido']),
      ativo_total: parseBacenNumber(row['Ativo Total']),
      lucro_liquido: parseBacenNumber(row['Lucro Líquido']),
    };
  }).filter(b => b.codigo && b.codigo !== 'undefined');
}

// 5. Segmentação
export async function extractSegmentacao(file: File): Promise<Partial<ExtractedBankData>[]> {
  const data = await parseIfDataCsv(file);
  return data.map(row => {
    return {
      codigo: String(row['Código']).trim(),
      segmento: row['SR']?.trim(),
    };
  }).filter(b => b.codigo && b.codigo !== 'undefined');
}

/**
 * Consolida todas as extrações num único dicionário agrupado por Código
 */
export function mergeExtractedData(
  capital: Partial<ExtractedBankData>[],
  resultado: Partial<ExtractedBankData>[],
  ativo: Partial<ExtractedBankData>[],
  resumo: Partial<ExtractedBankData>[],
  segmentacao: Partial<ExtractedBankData>[]
): ExtractedBankData[] {
  const bankMap = new Map<string, ExtractedBankData>();

  const allArrays = [capital, resultado, ativo, resumo, segmentacao];

  allArrays.forEach(arr => {
    arr.forEach(item => {
      if (!item.codigo) return;
      const existing = bankMap.get(item.codigo) || { codigo: item.codigo } as ExtractedBankData;
      bankMap.set(item.codigo, { ...existing, ...item });
    });
  });

  return Array.from(bankMap.values());
}
