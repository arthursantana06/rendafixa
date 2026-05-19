-- ==============================================================================
-- SQL Schema para a Aplicação Renda Fixa (HFC Consultoria)
-- Execute este script no SQL Editor do seu projeto Supabase.
-- ==============================================================================

-- Tabela principal de Emissores (Consolidada)
CREATE TABLE public.emissores_bancarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo varchar(50) UNIQUE NOT NULL, -- Chave Primária do IF.data (ex: 1000080099)
  nome varchar(255) NOT NULL,
  cnpj varchar(20),
  segmento varchar(10),               -- SR (ex: S1, S2, S3, S4, S5)
  
  -- Informações de Capital
  ib decimal,                         -- Índice de Basileia
  cet1 decimal,                       -- Capital Principal (CET1)
  
  -- Ativo e Provisões
  pcld decimal,                       -- Provisão para Créditos de Liq. Duvidosa
  
  -- Resumo (Base)
  patrimonio_liquido decimal,
  ativo_total decimal,
  lucro_liquido decimal,
  
  -- Metadados
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS (Row Level Security) para segurança
ALTER TABLE public.emissores_bancarios ENABLE ROW LEVEL SECURITY;

-- Como é um ambiente de demonstração ou leitura interna, criar política de SELECT e INSERT para usuários autenticados (ou anônimos se for apenas mock frontend).
CREATE POLICY "Enable read access for all users" ON public.emissores_bancarios FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON public.emissores_bancarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON public.emissores_bancarios FOR UPDATE USING (true);
