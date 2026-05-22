const { Client } = require('pg');

const connectionString = 'postgresql://postgres:tdzqZhb5yzp6S8fM@db.jnolbuslquilxvufzaai.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase Postgres...');

  // 1. Create table formulas_dimensoes if not exists
  console.log('Creating table formulas_dimensoes...');
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.formulas_dimensoes (
      dimension_key TEXT PRIMARY KEY,
      formula TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Table formulas_dimensoes checked/created successfully.');

  // 2. Enable RLS
  console.log('Enabling Row Level Security...');
  await client.query('ALTER TABLE public.formulas_dimensoes ENABLE ROW LEVEL SECURITY;');

  // 3. Create security policies (drop first to prevent conflict)
  console.log('Recreating security policies...');
  await client.query('DROP POLICY IF EXISTS "Enable read access for all users" ON public.formulas_dimensoes;');
  await client.query('DROP POLICY IF EXISTS "Enable insert access for all users" ON public.formulas_dimensoes;');
  await client.query('DROP POLICY IF EXISTS "Enable update access for all users" ON public.formulas_dimensoes;');
  
  await client.query('CREATE POLICY "Enable read access for all users" ON public.formulas_dimensoes FOR SELECT USING (true);');
  await client.query('CREATE POLICY "Enable insert access for all users" ON public.formulas_dimensoes FOR INSERT WITH CHECK (true);');
  await client.query('CREATE POLICY "Enable update access for all users" ON public.formulas_dimensoes FOR UPDATE USING (true);');

  // 4. Seed default formulas
  const defaults = [
    { key: 'capital', formula: '(ib_score + cet1_score + razao_alavancagem_score) / 3' },
    { key: 'liquidez', formula: 'lcr_score' },
    { key: 'qualidade_carteira', formula: '(ii_score + icp_score + deposito_vista_funding_score) / 3' },
    { key: 'resultado', formula: '(roe_score + roa_score + ie_score) / 3' },
    { key: 'porte', formula: '(ativo_total_score + carteira_credito_score) / 2' }
  ];

  console.log('Upserting default formulas...');
  for (const item of defaults) {
    await client.query(`
      INSERT INTO public.formulas_dimensoes (dimension_key, formula)
      VALUES ($1, $2)
      ON CONFLICT (dimension_key) DO UPDATE SET
        formula = EXCLUDED.formula,
        updated_at = CURRENT_TIMESTAMP;
    `, [item.key, item.formula]);
    console.log(`- Formula for dimension '${item.key}' seeded successfully.`);
  }

  // Double check after upsert
  const check = await client.query('SELECT dimension_key, formula FROM public.formulas_dimensoes;');
  console.log('\nCurrent formulas in DB:');
  console.table(check.rows);

  await client.end();
  console.log('\nMigration executed successfully.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
