const { Client } = require('pg');

const connectionString = 'postgresql://postgres:tdzqZhb5yzp6S8fM@db.jnolbuslquilxvufzaai.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

async function checkAndCreate() {
  await client.connect();
  console.log('Dropping existing table emissores_bancarios if exists...');
  await client.query('DROP TABLE IF EXISTS emissores_bancarios;');
  
  console.log('Creating table emissores_bancarios with consolidated columns...');
  await client.query(`
    CREATE TABLE emissores_bancarios (
      codigo TEXT PRIMARY KEY,
      nome TEXT,
      cnpj TEXT,
      ativo_total NUMERIC,
      patrimonio_liquido NUMERIC,
      lucro_liquido NUMERIC,
      carteira_credito NUMERIC,
      segmento TEXT,
      ib NUMERIC,
      cet1 NUMERIC,
      razao_alavancagem NUMERIC,
      pcld NUMERIC,
      total_depositos NUMERIC,
      captacoes_totais NUMERIC,
      atraso_total NUMERIC,
      ldr NUMERIC,
      ii NUMERIC,
      icp NUMERIC,
      roe NUMERIC,
      roa NUMERIC,
      rating TEXT,
      fgc TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  console.log('Enabling Row Level Security...');
  await client.query('ALTER TABLE emissores_bancarios ENABLE ROW LEVEL SECURITY;');
  
  console.log('Creating security policies...');
  await client.query('CREATE POLICY "Enable read access for all users" ON emissores_bancarios FOR SELECT USING (true);');
  await client.query('CREATE POLICY "Enable insert access for all users" ON emissores_bancarios FOR INSERT WITH CHECK (true);');
  await client.query('CREATE POLICY "Enable update access for all users" ON emissores_bancarios FOR UPDATE USING (true);');
  
  console.log('Table emissores_bancarios successfully recreated!');
  await client.end();
}

checkAndCreate().catch(console.error);
