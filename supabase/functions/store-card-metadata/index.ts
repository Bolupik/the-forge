import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const BUCKET = 'nft-metadata';

interface Payload {
  cardId: string;            // nft_cards.id
  name: string;
  description: string;
  rarity: string;
  element: string;
  stats: Record<string, number>;
  imageUrl: string;          // existing public/data URL of card art
  serial: number;
  // Optional already-uploaded image URL to skip re-upload
  hostedImageUrl?: string;
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

const dataUrlToBlob = (dataUrl: string): { blob: Uint8Array; mime: string } => {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error('Not a data URL');
  const mime = match[1];
  const bin = atob(match[2]);
  const blob = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) blob[i] = bin.charCodeAt(i);
  return { blob, mime };
};

const uploadImage = async (src: string, cardId: string): Promise<string> => {
  if (/^https?:\/\//.test(src)) return src; // already hosted
  const { blob, mime } = dataUrlToBlob(src);
  const ext = mime.split('/')[1] ?? 'png';
  const path = `images/${cardId}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
    contentType: mime,
    upsert: true,
  });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

const uploadJson = async (json: unknown, cardId: string): Promise<string> => {
  const body = new TextEncoder().encode(JSON.stringify(json, null, 2));
  const path = `metadata/${cardId}.json`;
  const { error } = await sb.storage.from(BUCKET).upload(path, body, {
    contentType: 'application/json',
    upsert: true,
  });
  if (error) throw error;
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const p: Payload = await req.json();
    if (!p.cardId || !p.name) {
      return new Response(JSON.stringify({ error: 'cardId and name required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const imageUrl = p.hostedImageUrl ?? await uploadImage(p.imageUrl, p.cardId);

    const attributes = [
      { trait_type: 'Rarity', value: p.rarity },
      { trait_type: 'Element', value: p.element },
      { trait_type: 'Serial', value: p.serial, display_type: 'number' },
      ...Object.entries(p.stats).map(([k, v]) => ({
        trait_type: k, value: v, display_type: 'number',
      })),
    ];

    const metadata = {
      sip: 16,
      name: `${p.name} #${p.serial}`,
      description: p.description,
      image: imageUrl,
      attributes,
      properties: {
        collection: 'CardForge Genesis',
        rarity: p.rarity,
        element: p.element,
        stats: p.stats,
        serial: p.serial,
      },
    };

    const metadataUrl = await uploadJson(metadata, p.cardId);

    // Persist on the card row so the gallery/wallet have it
    await sb.from('nft_cards')
      .update({ metadata_url: metadataUrl, image_url: imageUrl })
      .eq('id', p.cardId);

    return new Response(JSON.stringify({ metadataUrl, imageUrl }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('store-card-metadata error', e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
