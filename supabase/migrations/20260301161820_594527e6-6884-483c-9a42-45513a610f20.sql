
-- Table for Meta Ads invoice uploads per user per calendar date
CREATE TABLE public.meta_ads_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  invoice_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  file_url TEXT,
  file_name TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_ads_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view own invoices" ON public.meta_ads_invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Clients can insert own invoices" ON public.meta_ads_invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Clients can delete own invoices" ON public.meta_ads_invoices FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all invoices" ON public.meta_ads_invoices FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update invoices" ON public.meta_ads_invoices FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_meta_ads_invoices_updated_at
  BEFORE UPDATE ON public.meta_ads_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
