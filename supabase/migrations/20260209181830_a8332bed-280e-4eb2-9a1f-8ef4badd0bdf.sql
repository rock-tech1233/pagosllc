
-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', true);

-- Storage policies: clients can upload their own receipts
CREATE POLICY "Clients can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Anyone authenticated can view receipts
CREATE POLICY "Authenticated users can view receipts"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-receipts' AND auth.role() = 'authenticated');

-- Clients can delete their own receipts
CREATE POLICY "Clients can delete own receipts"
ON storage.objects FOR DELETE
USING (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create table to track receipt uploads
CREATE TABLE public.payment_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can insert own receipts"
ON public.payment_receipts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Clients can view own receipts"
ON public.payment_receipts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Clients can delete own receipts"
ON public.payment_receipts FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all receipts"
ON public.payment_receipts FOR SELECT
USING (has_role(auth.uid(), 'admin'));
