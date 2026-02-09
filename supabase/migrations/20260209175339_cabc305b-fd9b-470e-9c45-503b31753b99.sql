
-- Admin work notes visible to clients (non-deletable by clients)
CREATE TABLE public.admin_client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_client_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can insert
CREATE POLICY "Admins can insert notes"
  ON public.admin_client_notes FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update notes"
  ON public.admin_client_notes FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Admins can view all
CREATE POLICY "Admins can view all notes"
  ON public.admin_client_notes FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Clients can view their own notes (read-only)
CREATE POLICY "Clients can view own notes"
  ON public.admin_client_notes FOR SELECT
  USING (auth.uid() = client_id);

-- No delete policy for anyone - notes are permanent
-- Admins can delete only if absolutely needed
CREATE POLICY "Admins can delete notes"
  ON public.admin_client_notes FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_admin_client_notes_updated_at
  BEFORE UPDATE ON public.admin_client_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Remove delete policy on payments so invoices are permanent
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;
