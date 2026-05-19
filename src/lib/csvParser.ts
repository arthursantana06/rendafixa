import Papa from 'papaparse';
import type { BankData } from '@/types';

/**
 * Normaliza strings para facilitar a busca de colunas
 */
function normalizeString(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

/**
 * Tenta encontrar a chave correta no objeto da linha (mesmo com erros de digitação ou formatação)
 */
function findKey(row: any, keywords: string[]): string | undefined {
  const keys = Object.keys(row);
  for (const key of keys) {
    const normalizedKey = normalizeString(key);
    for (const keyword of keywords) {
      if (normalizedKey.includes(normalizeString(keyword))) {
        return key;
      }
    }
  }
  return undefined;
}

/**
 * Extrai um número de uma string (ex: "16,2%", "1.500,20")
 */
function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Remove % and replace comma with dot for decimals if needed
  let cleaned = String(value).replace('%', '').trim();
  // Se tiver vírgula e ponto (ex: 1.000,50), remove o ponto e troca vírgula por ponto
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function parseBankCSV(file: File): Promise<BankData[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8", // IF.data costuma ser utf-8 ou iso-8859-1. Papa detecta na maioria das vezes.
      complete: (results) => {
        try {
          const banks: BankData[] = results.data.map((row: any, index: number) => {
            // Mapeamento dinâmico de colunas usando palavras-chave comuns do IF.data/Bacen
            const nameKey = findKey(row, ['instituicao', 'banco', 'nome', 'emissor']) || Object.keys(row)[0];
            const cnpjKey = findKey(row, ['cnpj', 'codigo']);
            
            const ibKey = findKey(row, ['basileia', 'ib ']);
            const cet1Key = findKey(row, ['principal', 'cet1']);
            
            const iiKey = findKey(row, ['inadimplencia', 'atraso > 90', 'ii ']);
            const icpKey = findKey(row, ['cobertura', 'provisao', 'icp']);
            
            const roeKey = findKey(row, ['roe', 'patrimonio liquido', 'retorno sobre pl']);
            const roaKey = findKey(row, ['roa', 'ativo', 'retorno sobre ativo']);
            const ieKey = findKey(row, ['eficiencia', 'ie ']);
            
            const lcrKey = findKey(row, ['liquidez', 'lcr', 'curto prazo']);
            const ratingKey = findKey(row, ['rating', 'nota', 'classificacao']);
            const fgcKey = findKey(row, ['fgc', 'cobertura']);

            return {
              id: String(index + 1),
              name: nameKey ? row[nameKey] : 'Instituição Desconhecida',
              cnpj: cnpjKey ? String(row[cnpjKey]) : '00.000.000/0000-00',
              
              // Parse de valores numéricos
              ib: ibKey ? parseNumber(row[ibKey]) : 0,
              cet1: cet1Key ? parseNumber(row[cet1Key]) : 0,
              ii: iiKey ? parseNumber(row[iiKey]) : 0,
              icp: icpKey ? parseNumber(row[icpKey]) : 0,
              roe: roeKey ? parseNumber(row[roeKey]) : 0,
              roa: roaKey ? parseNumber(row[roaKey]) : 0,
              ie: ieKey ? parseNumber(row[ieKey]) : 0,
              lcr: lcrKey ? parseNumber(row[lcrKey]) : 0,
              
              // Textos
              rating: ratingKey ? String(row[ratingKey]).trim() : 'Sem Rating',
              fgc: (fgcKey && String(row[fgcKey]).toLowerCase().includes('nao')) 
                ? 'nao_coberto' 
                : 'coberto_250k' // default otimista se não informado
            };
          });
          
          resolve(banks);
        } catch (error) {
          reject(new Error("Erro ao processar as colunas do CSV. Verifique o formato do arquivo."));
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}
