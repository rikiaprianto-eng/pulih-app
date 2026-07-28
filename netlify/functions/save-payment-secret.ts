import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin, hasServiceRoleKey, requireAdminUserId, jsonResponse } from "./_supabaseAdmin";

export const handler: Handler = async (event) => {
  if (!hasServiceRoleKey()) {
    return jsonResponse(500, {
      error: "SUPABASE_SERVICE_ROLE_KEY belum diset di Netlify Environment variables.",
    });
  }

  const adminId = await requireAdminUserId(event.headers.authorization);
  if (!adminId) {
    return jsonResponse(403, { error: "Hanya admin yang bisa mengakses ini." });
  }

  const admin = getSupabaseAdmin();

  if (event.httpMethod === "GET") {
    const { data } = await admin
      .from("payment_secrets")
      .select("midtrans_server_key, lynkid_merchant_key")
      .eq("id", 1)
      .maybeSingle();
    return jsonResponse(200, {
      configured: !!data?.midtrans_server_key,
      lynkidConfigured: !!data?.lynkid_merchant_key,
    });
  }

  if (event.httpMethod === "POST") {
    let body: { midtransServerKey?: string; lynkidMerchantKey?: string };
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return jsonResponse(400, { error: "Body tidak valid." });
    }

    const midtransKey =
      typeof body.midtransServerKey === "string" ? body.midtransServerKey.trim() : "";
    const lynkidKey =
      typeof body.lynkidMerchantKey === "string" ? body.lynkidMerchantKey.trim() : "";
    if (!midtransKey && !lynkidKey) {
      return jsonResponse(400, { error: "Key kosong." });
    }

    const patch: Record<string, string> = {};
    if (midtransKey) patch.midtrans_server_key = midtransKey;
    if (lynkidKey) patch.lynkid_merchant_key = lynkidKey;

    const { error } = await admin.from("payment_secrets").update(patch).eq("id", 1);
    if (error) return jsonResponse(500, { error: error.message });

    return jsonResponse(200, { ok: true });
  }

  return jsonResponse(405, { error: "Method not allowed" });
};
