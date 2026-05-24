const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const PROMPT = `Reimagine this exact character as a Pokémon trading-card-game style fighter in a dynamic battle-ready fighting stance.

CRITICAL: preserve the character's face, hair, skin tone, clothing, colors, accessories, and identifying features EXACTLY — do not change who they are. Only change the POSE to a confident martial-arts / battle stance (knees bent, fists or signature weapon raised, weight forward, ready to strike).

Art style: bold cel-shaded outlines, vibrant Pokémon TCG illustration style, dramatic rim lighting, slight energy aura, action-pose dynamic angle. Clean simple gradient background. Full body visible. Square composition.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

    const { imageUrl } = await req.json();
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'imageUrl required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        modalities: ['image', 'text'],
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error('AI gateway error', res.status, txt);
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited. Try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Add funds in Workspace Usage.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway ${res.status}`);
    }

    const data = await res.json();
    const out = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!out) throw new Error('No image returned from AI');

    return new Response(JSON.stringify({ imageUrl: out }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('transform-character-image error', e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
