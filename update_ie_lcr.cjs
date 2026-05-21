const { Client } = require('pg');

const connectionString = 'postgresql://postgres:tdzqZhb5yzp6S8fM@db.jnolbuslquilxvufzaai.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase Postgres...');

  // 1. Add columns to emissores_bancarios
  console.log('Altering emissores_bancarios table to add ie and lcr if not exists...');
  await client.query(`
    ALTER TABLE public.emissores_bancarios 
    ADD COLUMN IF NOT EXISTS ie NUMERIC,
    ADD COLUMN IF NOT EXISTS lcr NUMERIC;
  `);
  console.log('Columns ie and lcr checked/added successfully.');

  // 2. Register new indicators in parametros_indicadores
  const newIndicators = [
    {
      key: 'ie',
      label: 'Índice de Eficiência Operacional',
      direction: 'lower_is_better',
      limite_muito_bom: 45.0,
      limite_bom: 55.0,
      limite_moderado: 70.0,
      description: 'Revela quanto o banco gasta operacionalmente para gerar cada real de receita. Um banco com alto índice de eficiência consome grande parte da receita em custos fixos, deixando menos margem para provisões, distribuição de lucros e capitalização - o que, em ambientes adversos, pode comprometer a solvência da instituição.',
      source: 'IF.data > Dados por Instituição > Rentabilidade. Campo: \'Índice de Eficiência\'. Atualização trimestral.'
    },
    {
      key: 'lcr',
      label: 'Índice de Liquidez de Curto Prazo (LCR)',
      direction: 'higher_is_better',
      limite_muito_bom: 150.0,
      limite_bom: 120.0,
      limite_moderado: 100.0,
      description: 'Mede a capacidade do banco de sobreviver a um estresse de liquidez por 30 dias sem recorrer ao mercado ou ao BACEN. É uma das métricas mais diretas de risco de liquidez - relevante para emissores de CDBs e outros papéis de curto e médio prazo, cujos pagamentos dependem da capacidade de caixa do banco.',
      source: 'IF.data > Dados por Instituição > Prudencial > Liquidez. Campo: \'LCR - Índice de Liquidez de Curto Prazo\' (%). Atualização trimestral.'
    }
  ];

  console.log('Upserting indicators into parametros_indicadores...');
  for (const ind of newIndicators) {
    await client.query(`
      INSERT INTO public.parametros_indicadores (key, label, direction, limite_muito_bom, limite_bom, limite_moderado, description, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (key) DO UPDATE SET
        label = EXCLUDED.label,
        direction = EXCLUDED.direction,
        limite_muito_bom = EXCLUDED.limite_muito_bom,
        limite_bom = EXCLUDED.limite_bom,
        limite_moderado = EXCLUDED.limite_moderado,
        description = EXCLUDED.description,
        source = EXCLUDED.source,
        updated_at = CURRENT_TIMESTAMP;
    `, [ind.key, ind.label, ind.direction, ind.limite_muito_bom, ind.limite_bom, ind.limite_moderado, ind.description, ind.source]);
    console.log(`- Indicator '${ind.key}' upserted successfully.`);
  }

  // Double check after upsert
  const check = await client.query('SELECT key, label, limite_muito_bom, limite_bom, limite_moderado FROM public.parametros_indicadores WHERE key IN (\'ie\', \'lcr\');');
  console.log('\nUpdated parameters in DB:');
  console.table(check.rows);

  await client.end();
  console.log('\nMigration executed successfully.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
