
-- Table for client notes on calendar dates
CREATE TABLE public.client_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  note_date DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

-- Clients can view their own notes
CREATE POLICY "Users can view own notes"
  ON public.client_notes FOR SELECT
  USING (auth.uid() = user_id);

-- Clients can insert their own notes
CREATE POLICY "Users can insert own notes"
  ON public.client_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Clients can update their own notes
CREATE POLICY "Users can update own notes"
  ON public.client_notes FOR UPDATE
  USING (auth.uid() = user_id);

-- Clients can delete their own notes
CREATE POLICY "Users can delete own notes"
  ON public.client_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can view all notes
CREATE POLICY "Admins can view all notes"
  ON public.client_notes FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_client_notes_updated_at
  BEFORE UPDATE ON public.client_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add username column to profiles for login
ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;
