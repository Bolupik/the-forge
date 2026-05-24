
-- 1. On-chain fields for nft_cards
ALTER TABLE public.nft_cards
  ADD COLUMN IF NOT EXISTS tx_id text,
  ADD COLUMN IF NOT EXISTS on_chain_token_id integer,
  ADD COLUMN IF NOT EXISTS chain_status text NOT NULL DEFAULT 'off_chain';

CREATE INDEX IF NOT EXISTS idx_nft_cards_chain_status ON public.nft_cards(chain_status);

-- 2. Public bucket for NFT metadata JSON + transformed character images
INSERT INTO storage.buckets (id, name, public)
VALUES ('nft-metadata', 'nft-metadata', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "nft-metadata public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'nft-metadata');

-- Authenticated upload
CREATE POLICY "nft-metadata authenticated upload"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'nft-metadata' AND auth.role() = 'authenticated');

CREATE POLICY "nft-metadata authenticated update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'nft-metadata' AND auth.role() = 'authenticated');
