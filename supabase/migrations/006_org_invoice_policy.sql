-- Allow org members to see all invoices within their organization
-- (previously each user only saw their own)
DROP POLICY IF EXISTS "Usuarios ven sus propias facturas" ON invoices;

CREATE POLICY "Org members see org invoices" ON invoices
  FOR SELECT USING (
    user_id IN (
      SELECT p2.id FROM profiles p2
      WHERE p2.organization_id = (
        SELECT p.organization_id FROM profiles p WHERE p.id = auth.uid()
      )
    )
  );
