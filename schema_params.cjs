const { Client } = require('pg');

const connectionString = 'postgresql://postgres:tdzqZhb5yzp6S8fM@db.jnolbuslquilxvufzaai.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

async function runMigration() {
  await client.connect();
  console.log('Connected to Supabase DB');

  console.log('Dropping existing table parametros_indicadores if exists...');
  await client.query('DROP TABLE IF EXISTS parametros_indicadores;');

  console.log('Creating table parametros_indicadores...');
  await client.query(`
    CREATE TABLE parametros_indicadores (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('higher_is_better', 'lower_is_better')),
      limite_muito_bom NUMERIC NOT NULL,
      limite_bom NUMERIC NOT NULL,
      limite_moderado NUMERIC NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Enabling Row Level Security...');
  await client.query('ALTER TABLE parametros_indicadores ENABLE ROW LEVEL SECURITY;');

  console.log('Creating security policies...');
  await client.query('CREATE POLICY "Enable read access for all users" ON parametros_indicadores FOR SELECT USING (true);');
  await client.query('CREATE POLICY "Enable insert access for all users" ON parametros_indicadores FOR INSERT WITH CHECK (true);');
  await client.query('CREATE POLICY "Enable update access for all users" ON parametros_indicadores FOR UPDATE USING (true);');

  console.log('Seeding default parameter rules...');
  const defaults = [
    { key: 'ib', label: 'Índice de Basileia', direction: 'higher_is_better', muito_bom: 15, bom: 13, moderado: 11 },
    { key: 'cet1', label: 'Capital Principal (CET1)', direction: 'higher_is_better', muito_bom: 12, bom: 10, moderado: 7 },
    { key: 'ii', label: 'Índice de Inadimplência', direction: 'lower_is_better', muito_bom: 2.5, bom: 4.0, moderado: 6.0 },
    { key: 'icp', label: 'Cobertura de Provisões', direction: 'higher_is_better', muito_bom: 150, bom: 100, moderado: 80 },
    { key: 'roe', label: 'Retorno sobre Patrimônio Líquido', direction: 'higher_is_better', muito_bom: 15, bom: 10, moderado: 5 },
    { key: 'roa', label: 'Retorno sobre Ativos', direction: 'higher_is_better', muito_bom: 1.5, bom: 0.8, muito_bom_val: 1.5, bom_val: 0.8, moderado: 0.3 }
  ];

  for (const item of defaults) {
    await client.query({
      text: `INSERT INTO parametros_indicadores (key, label, direction, limite_muito_bom, limite_bom, limite_moderado) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
      values: [item.key, item.label, item.direction, item.muito_bom, item.bom, item.moderado]
    });
  }

  console.log('Seeded successfully!');
  await client.end();
}

runMigration().catch(console.error);
