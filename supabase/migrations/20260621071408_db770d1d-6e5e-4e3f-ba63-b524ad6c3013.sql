
-- 1) Whitelist insert: bind user_id to auth.uid()
DROP POLICY IF EXISTS "Anyone can join the whitelist with a wallet" ON public.whitelist;
CREATE POLICY "Anyone can join the whitelist with a wallet"
  ON public.whitelist
  FOR INSERT
  WITH CHECK (
    length(btrim(wallet_address)) > 0
    AND (user_id IS NULL OR auth.uid() = user_id)
  );

-- 2) nft_cards: prevent owners from mutating immutable fields, add admin INSERT guardrail
DROP POLICY IF EXISTS "Owners can update their cards" ON public.nft_cards;
CREATE POLICY "Owners can update their cards"
  ON public.nft_cards
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Trigger to lock immutable columns (owner_id, serial, rarity, template_id, on_chain_token_id once set)
CREATE OR REPLACE FUNCTION public.nft_cards_protect_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF NEW.owner_id        IS DISTINCT FROM OLD.owner_id        THEN RAISE EXCEPTION 'owner_id is immutable'; END IF;
  IF NEW.template_id     IS DISTINCT FROM OLD.template_id     THEN RAISE EXCEPTION 'template_id is immutable'; END IF;
  IF NEW.serial          IS DISTINCT FROM OLD.serial          THEN RAISE EXCEPTION 'serial is immutable'; END IF;
  IF NEW.rarity          IS DISTINCT FROM OLD.rarity          THEN RAISE EXCEPTION 'rarity is immutable'; END IF;
  IF NEW.element         IS DISTINCT FROM OLD.element         THEN RAISE EXCEPTION 'element is immutable'; END IF;
  IF NEW.stats           IS DISTINCT FROM OLD.stats           THEN RAISE EXCEPTION 'stats are immutable'; END IF;
  IF OLD.on_chain_token_id IS NOT NULL
     AND NEW.on_chain_token_id IS DISTINCT FROM OLD.on_chain_token_id THEN
    RAISE EXCEPTION 'on_chain_token_id is immutable once set';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS nft_cards_protect_immutable_trg ON public.nft_cards;
CREATE TRIGGER nft_cards_protect_immutable_trg
  BEFORE UPDATE ON public.nft_cards
  FOR EACH ROW EXECUTE FUNCTION public.nft_cards_protect_immutable();

CREATE POLICY "Admins can insert cards"
  ON public.nft_cards
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) Storage: tighten nft-metadata bucket policies
DROP POLICY IF EXISTS "nft-metadata authenticated update" ON storage.objects;
DROP POLICY IF EXISTS "nft-metadata authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "nft-metadata public read" ON storage.objects;

-- Files in a public bucket remain reachable via the public CDN URL without
-- a SELECT policy; removing the broad SELECT policy stops anonymous listing.
-- Writes are performed exclusively by edge functions using the service role
-- (which bypasses RLS), so we only allow admin writes as defense-in-depth.
CREATE POLICY "nft-metadata admin upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'nft-metadata' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "nft-metadata admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'nft-metadata' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'nft-metadata' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "nft-metadata admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'nft-metadata' AND public.has_role(auth.uid(), 'admin'::app_role));

-- 4) Lock down trigger-only SECURITY DEFINER functions from direct API exec.
-- has_role is intentionally kept executable: it is required by RLS policies
-- evaluated for anon/authenticated requests.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
