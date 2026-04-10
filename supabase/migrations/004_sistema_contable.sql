-- Agregar sistema_contable a profiles
alter table profiles
  add column if not exists sistema_contable text
    check (sistema_contable in ('gns', 'zeta', 'siigo'));

-- Agregar items (líneas de factura) a invoices para export por sistema
alter table invoices
  add column if not exists items jsonb default '[]'::jsonb;
