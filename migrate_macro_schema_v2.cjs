const { Client } = require('pg');

const connectionString = 'postgresql://postgres:tdzqZhb5yzp6S8fM@db.jnolbuslquilxvufzaai.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase Postgres...');

  // 1. Recreate table with new columns
  console.log('Recreating table public.cenarios_macro...');
  await client.query('DROP TABLE IF EXISTS public.cenarios_macro;');
  await client.query(`
    CREATE TABLE public.cenarios_macro (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      juros_atuais NUMERIC NOT NULL,
      expectativa_juros_bacen_2029 NUMERIC NOT NULL,
      juros_futuros_d1f29 NUMERIC NOT NULL,
      valor_taxa_prefixada_2029 NUMERIC NOT NULL,
      taxa_media_historica NUMERIC NOT NULL,
      is_custom BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Table public.cenarios_macro recreated successfully.');

  // 2. Enable RLS
  console.log('Enabling Row Level Security...');
  await client.query('ALTER TABLE public.cenarios_macro ENABLE ROW LEVEL SECURITY;');

  // 3. Create security policies
  console.log('Recreating security policies...');
  await client.query('CREATE POLICY "Enable read access for all users" ON public.cenarios_macro FOR SELECT USING (true);');
  await client.query('CREATE POLICY "Enable insert access for all users" ON public.cenarios_macro FOR INSERT WITH CHECK (true);');
  await client.query('CREATE POLICY "Enable update access for all users" ON public.cenarios_macro FOR UPDATE USING (true);');
  await client.query('CREATE POLICY "Enable delete access for all users" ON public.cenarios_macro FOR DELETE USING (true);');

  // 4. Seed default scenarios with the new structure
  const defaults = [
    {
      key: 'ativo',
      label: 'Cenário Ativo (Atual)',
      juros_atuais: 10.50,
      expectativa_juros_bacen_2029: 9.75,
      juros_futuros_d1f29: 11.20,
      valor_taxa_prefixada_2029: 11.50,
      taxa_media_historica: 8.50,
      is_custom: false
    },
    {
      key: 'cenario_neutro',
      label: 'Cenário Neutro (Mercado Estável)',
      juros_atuais: 10.50,
      expectativa_juros_bacen_2029: 9.75,
      juros_futuros_d1f29: 11.20,
      valor_taxa_prefixada_2029: 11.50,
      taxa_media_historica: 8.50,
      is_custom: false
    },
    {
      key: 'cenario_estresse',
      label: 'Cenário de Estresse (Juros em Alta)',
      juros_atuais: 12.00,
      expectativa_juros_bacen_2029: 11.50,
      juros_futuros_d1f29: 13.50,
      valor_taxa_prefixada_2029: 12.80,
      taxa_media_historica: 8.50,
      is_custom: false
    }
  ];

  console.log('Upserting default scenarios...');
  for (const item of defaults) {
    await client.query(`
      INSERT INTO public.cenarios_macro 
        (key, label, juros_atuais, expectativa_juros_bacen_2029, juros_futuros_d1f29, valor_taxa_prefixada_2029, taxa_media_historica, is_custom)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (key) DO UPDATE SET
        label = EXCLUDED.label,
        juros_atuais = EXCLUDED.juros_atuais,
        expectativa_juros_bacen_2029 = EXCLUDED.expectativa_juros_bacen_2029,
        juros_futuros_d1f29 = EXCLUDED.juros_futuros_d1f29,
        valor_taxa_prefixada_2029 = EXCLUDED.valor_taxa_prefixada_2029,
        taxa_media_historica = EXCLUDED.taxa_media_historica,
        is_custom = EXCLUDED.is_custom;
    `, [
      item.key, 
      item.label, 
      item.juros_atuais, 
      item.expectativa_juros_bacen_2029, 
      item.juros_futuros_d1f29, 
      item.valor_taxa_prefixada_2029, 
      item.taxa_media_historica, 
      item.is_custom
    ]);
    console.log(`- Scenario '${item.label}' upserted successfully.`);
  }

  // Double check scenarios in database
  const check = await client.query('SELECT key, label, juros_atuais, juros_futuros_d1f29 FROM public.cenarios_macro;');
  console.log('\nCurrent scenarios in DB:');
  console.table(check.rows);

  await client.end();
  console.log('\nMigration executed successfully.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
