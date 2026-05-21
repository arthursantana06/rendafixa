const { Client } = require('pg');

const connectionString = 'postgresql://postgres:tdzqZhb5yzp6S8fM@db.jnolbuslquilxvufzaai.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase Postgres...');

  // 1. Add column to emissores_bancarios
  console.log('Altering emissores_bancarios table to add deposito_vista_funding if not exists...');
  await client.query(`
    ALTER TABLE public.emissores_bancarios 
    ADD COLUMN IF NOT EXISTS deposito_vista_funding NUMERIC;
  `);
  console.log('Column deposito_vista_funding checked/added successfully.');

  // 2. Register indicators in parametros_indicadores
  // Let's first check what's inside
  const res = await client.query('SELECT key FROM public.parametros_indicadores;');
  console.log('Current indicator keys in DB:', res.rows.map(r => r.key));

  const newIndicators = [
    {
      key: 'razao_alavancagem',
      label: 'Razão de Alavancagem (Bacen)',
      direction: 'higher_is_better',
      limite_muito_bom: 8.0,
      limite_bom: 6.0,
      limite_moderado: 4.0,
      description: 'Bancos com índices acima de 8% possuem uma folga de capital gigantesca frente às suas exposições sem ponderação de risco. Abaixo de 4%, o banco está perigosamente perto do limite regulatório do Bacen (3%), indicando uma operação altamente esticada.',
      source: 'Scorecard Emissores'
    },
    {
      key: 'deposito_vista_funding',
      label: 'Depósito à vista / Funding',
      direction: 'higher_is_better',
      limite_muito_bom: 15.0,
      limite_bom: 8.0,
      limite_moderado: 3.0,
      description: 'Os depósitos à vista representam dinheiro com custo zero (funding gratuito). Instituições que conseguem captar acima de 15% do seu funding total nesta modalidade possuem uma vantagem competitiva brutal e margens líquidas de juros (NIM) muito mais resilientes em cenários de alta da Selic.',
      source: 'Scorecard Emissores'
    },
    {
      key: 'ativo_total',
      label: 'Ativo Total (R$ Bilhões)',
      direction: 'higher_is_better',
      limite_muito_bom: 200.0,
      limite_bom: 30.0,
      limite_moderado: 3.0,
      description: 'O mercado bancário opera sob a lógica do Too Big To Fail (Grande demais para quebrar) e ganhos de escala. Parâmetros maiores que R$ 200 Bilhões em Ativos enquadram os grandes players de relevância sistêmica (Segmentos S1 e S2). A classificação "Ruim" aqui reflete exclusivamente o risco de porte e resiliência a choques macroeconômicos, não necessariamente indicando que um banco pequeno (Segmento S5) vá quebrar amanhã.',
      source: 'Scorecard Emissores'
    },
    {
      key: 'carteira_credito',
      label: 'Carteira de Crédito (R$ Bilhões)',
      direction: 'higher_is_better',
      limite_muito_bom: 100.0,
      limite_bom: 10.0,
      limite_moderado: 1.0,
      description: 'O mercado bancário opera sob a lógica do Too Big To Fail (Grande demais para quebrar) e ganhos de escala. Parâmetros maiores que R$ 100 Bilhões em Crédito enquadram os grandes players de relevância sistêmica (Segmentos S1 e S2). A classificação "Ruim" aqui reflete exclusivamente o risco de porte e resiliência a choques macroeconômicos, não necessariamente indicando que um banco pequeno (Segmento S5) vá quebrar amanhã.',
      source: 'Scorecard Emissores'
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
  const check = await client.query('SELECT key, label, limite_muito_bom, limite_bom, limite_moderado FROM public.parametros_indicadores;');
  console.log('\nUpdated parameters in DB:');
  console.table(check.rows);

  await client.end();
  console.log('\nMigration and Seeding script executed successfully.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
