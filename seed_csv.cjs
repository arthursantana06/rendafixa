const { Client } = require('pg');
const fs = require('fs');
const Papa = require('papaparse');

const connectionString = 'postgresql://postgres:tdzqZhb5yzp6S8fM@db.jnolbuslquilxvufzaai.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

function parseNumber(value) {
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

function fixDoubleUtf8(str) {
  if (!str) return '';
  try {
    const cp1252Map = {
      0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
      0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a, 0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91,
      0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02dc: 0x98,
      0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c, 0x017e: 0x9e, 0x0178: 0xff
    };
    const bytes = [];
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
    return Buffer.from(bytes).toString('utf8');
  } catch (e) {
    return str;
  }
}

async function seed() {
  await client.connect();
  console.log('Connected to DB');
  
  const csvContent = fs.readFileSync('scorecard_emissores_final.csv', 'utf8');
  const results = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
  });
  
  const rows = results.data;
  console.log(`Parsed ${rows.length} rows from CSV`);
  
  console.log('Inserting rows in batches...');
  
  // Truncate table first to be safe
  await client.query('TRUNCATE emissores_bancarios;');
  
  const validRows = [];
  for (const row of rows) {
    const codigo = String(row['Código'] || '').trim();
    if (!codigo || !/^\d+$/.test(codigo)) continue;
    validRows.push(row);
  }

  const batchSize = 200;
  let count = 0;
  for (let i = 0; i < validRows.length; i += batchSize) {
    const chunk = validRows.slice(i, i + batchSize);
    
    const valueClauses = [];
    const values = [];
    let paramIndex = 1;
    
    for (const row of chunk) {
      const codigo = String(row['Código'] || '').trim();
      const rawNome = String(row['Instituição'] || '').trim();
      const nome = fixDoubleUtf8(rawNome);
      
      const rowValues = [
        codigo,
        nome,
        String(row['CNPJ'] || codigo).trim(),
        parseNumber(row['Ativo Total']),
        parseNumber(row['Patrimônio Líquido']),
        parseNumber(row['Lucro Líquido']),
        parseNumber(row['Carteira de Crédito Total']),
        String(row['Segmento_Prudencial'] || 'S/S').trim(),
        parseNumber(row['Indice_Basileia (%)']),
        parseNumber(row['Capital_Principal_CET1 (%)']),
        parseNumber(row['Razao_Alavancagem (%)']),
        parseNumber(row['PCLD_Saldo']),
        parseNumber(row['Total_Depositos']),
        parseNumber(row['Captacoes_Totais']),
        parseNumber(row['Atraso_Total']),
        parseNumber(row['LDR (%)']),
        parseNumber(row['Indice_Inadimplencia_II (%)']),
        parseNumber(row['ICP_Cobertura (%)']),
        parseNumber(row['ROE_Calculado (%)']),
        parseNumber(row['ROA_Calculado (%)']),
        'SR',
        'coberto_250k'
      ];
      
      const paramPlaceholders = [];
      for (let j = 0; j < rowValues.length; j++) {
        paramPlaceholders.push(`$${paramIndex++}`);
      }
      valueClauses.push(`(${paramPlaceholders.join(', ')})`);
      values.push(...rowValues);
    }
    
    const queryText = `
      INSERT INTO emissores_bancarios (
        codigo, nome, cnpj, ativo_total, patrimonio_liquido, lucro_liquido, carteira_credito, segmento, 
        ib, cet1, razao_alavancagem, pcld, total_depositos, captacoes_totais, atraso_total, ldr, ii, icp, roe, roa, rating, fgc
      ) VALUES ${valueClauses.join(', ')}
      ON CONFLICT (codigo) DO UPDATE SET
        nome = EXCLUDED.nome,
        cnpj = EXCLUDED.cnpj,
        ativo_total = EXCLUDED.ativo_total,
        patrimonio_liquido = EXCLUDED.patrimonio_liquido,
        lucro_liquido = EXCLUDED.lucro_liquido,
        carteira_credito = EXCLUDED.carteira_credito,
        segmento = EXCLUDED.segmento,
        ib = EXCLUDED.ib,
        cet1 = EXCLUDED.cet1,
        razao_alavancagem = EXCLUDED.razao_alavancagem,
        pcld = EXCLUDED.pcld,
        total_depositos = EXCLUDED.total_depositos,
        captacoes_totais = EXCLUDED.captacoes_totais,
        atraso_total = EXCLUDED.atraso_total,
        ldr = EXCLUDED.ldr,
        ii = EXCLUDED.ii,
        icp = EXCLUDED.icp,
        roe = EXCLUDED.roe,
        roa = EXCLUDED.roa,
        rating = EXCLUDED.rating,
        fgc = EXCLUDED.fgc,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await client.query(queryText, values);
    count += chunk.length;
    console.log(`Inserted batch: ${count}/${validRows.length}`);
  }
  
  console.log(`Successfully seeded ${count} banks with clean UTF-8 names in batch mode!`);
  await client.end();
}

seed().catch(console.error);
