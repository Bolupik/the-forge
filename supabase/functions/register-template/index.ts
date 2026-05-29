import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Demo-admin endpoint: registers a card template into the public mint pool
 * and tops up mint_packs so the new supply is immediately mintable.
 *
 * Guarded by a shared admin password (matches the in-app sessionStorage
 * password). This mirrors the existing client-side admin gate.
 */
const ADMIN_PASS = "bolupik";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;

    const body = await req.json().catch(() => ({}));
    const { adminPass, template } = body ?? {};

    if (adminPass !== ADMIN_PASS) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    if (!template?.name || !template?.image_url || !template?.rarity) {
      return jsonResponse({ error: "Missing template fields" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Insert the new template
    const { data: inserted, error: insErr } = await admin
      .from("card_templates")
      .insert({
        name: String(template.name).slice(0, 80),
        description: String(template.description ?? "").slice(0, 500),
        rarity: template.rarity,
        element: template.element ?? "neutral",
        stats: template.stats ?? {},
        image_url: template.image_url,
        metadata_url: template.metadata_url ?? "",
        supply: Math.max(1, Number(template.supply ?? 1)),
        minted: 0,
      })
      .select()
      .single();

    if (insErr) {
      console.error("template insert error", insErr);
      return jsonResponse({ error: insErr.message }, 500);
    }

    // 2. Top up mint_packs so this supply is mintable.
    const { data: config } = await admin
      .from("collection_config")
      .select("cards_per_pack")
      .eq("id", 1)
      .maybeSingle();
    const cardsPerPack = config?.cards_per_pack ?? 5;

    const packsToAdd = Math.max(1, Math.ceil(inserted.supply / cardsPerPack));

    const { data: maxRow } = await admin
      .from("mint_packs")
      .select("pack_number")
      .order("pack_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const startNumber = (maxRow?.pack_number ?? 0) + 1;
    const rows = Array.from({ length: packsToAdd }, (_, i) => ({
      pack_number: startNumber + i,
    }));

    const { error: packErr } = await admin.from("mint_packs").insert(rows);
    if (packErr) {
      console.error("pack seed error", packErr);
      // Non-fatal — template still registered.
    }

    return jsonResponse({
      ok: true,
      template: inserted,
      packs_added: packErr ? 0 : packsToAdd,
    });
  } catch (err) {
    console.error("register-template error", err);
    return jsonResponse({ error: "Internal error" }, 500);
  }
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
