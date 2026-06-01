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
    { key: 'capital', formula: '(cet1_score * 0.60) + (ib_score * 0.30) + (razao_alavancagem_score * 0.10)' },
    { key: 'liquidez', formula: 'proxy_liquidez_ial_score' },
    { key: 'qualidade_carteira', formula: '(ii_score * 0.5) + (icp_score * 0.25) + (deposito_vista_funding_score * 0.25)' },
    { key: 'resultado', formula: '(roa_score * 0.40) + (roe_score * 0.30) + (ie_score * 0.30)' },
    { key: 'porte', formula: '(ativo_total_score * 0.5) + (carteira_credito_score * 0.5)' },
    { key: 'tendencia', formula: '(tendencia_crescimento_carteira_score + tendencia_cet1_score + tendencia_roa_score + tendencia_ldr_score + tendencia_proxy_liquidez_score) / 5' },
    { key: 'score_final', formula: '((porte / (1.05 ^ tempo))) * (0.3 * capital + 0.2 * liquidez + 0.3 * qualidade_carteira + 0.2 * resultado) * 0.105' }
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
