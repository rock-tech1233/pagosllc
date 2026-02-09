-- Add status column to payment_receipts for the confirmation flow
ALTER TABLE public.payment_receipts 
ADD COLUMN status text NOT NULL DEFAULT 'pendiente';

-- Allow admins to update receipts (to confirm/reject)
CREATE POLICY "Admins can update receipts"
ON public.payment_receipts
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));
