-- Allow admins to insert meta_ads_invoices for any client
CREATE POLICY "Admins can insert invoices"
ON public.meta_ads_invoices
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete meta_ads_invoices
CREATE POLICY "Admins can delete invoices"
ON public.meta_ads_invoices
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));