import type { Handler } from "@netlify/functions";
import { createHash } from "node:crypto";
import { getSupabaseAdmin, hasServiceRoleKey, jsonResponse } from "./_supabaseAdmin";

type MidtransNotification = {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
};

/** Midtrans's documented signature scheme: SHA512(order_id + status_code + gross_amount + ServerKey). */
function isValidSignature(body: MidtransNotification, serverKey: string): boolean {
  const raw = `${body.order_id}${body.status_code}${body.gross_amount}${serverKey}`;
  const expected = createHash("sha512").update(raw).digest("hex");
  return expected === body.signature_key;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });
  if (!hasServiceRoleKey()) {
    return jsonResponse(500, { error: "SUPABASE_SERVICE_ROLE_KEY belum diset di Netlify." });
  }

  let body: MidtransNotification;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Body tidak valid." });
  }
  if (!body.order_id || !body.signature_key) {
    return jsonResponse(400, { error: "Payload notifikasi tidak lengkap." });
  }

  const admin = getSupabaseAdmin();

  const { data: secret } = await admin
    .from("payment_secrets")
    .select("midtrans_server_key")
    .eq("id", 1)
    .maybeSingle();
  if (!secret?.midtrans_server_key || !isValidSignature(body, secret.midtrans_server_key)) {
    return jsonResponse(403, { error: "Signature tidak valid." });
  }

  const { data: tx } = await admin
    .from("transactions")
    .select("*, packages(name, session_quota)")
    .eq("id", body.order_id)
    .maybeSingle();
  if (!tx) return jsonResponse(404, { error: "Transaksi tidak ditemukan." });

  const isSuccess =
    body.transaction_status === "settlement" ||
    (body.transaction_status === "capture" && body.fraud_status === "accept");
  const isFailed = ["deny", "cancel", "expire", "failure"].includes(body.transaction_status);

  if (isSuccess && tx.status !== "paid") {
    await admin
      .from("transactions")
      .update({ status: "paid", payment_method: body.payment_type ?? tx.payment_method, paid_at: new Date().toISOString() })
      .eq("id", tx.id);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await admin.from("user_subscriptions").insert({
      patient_id: tx.patient_id,
      transaction_id: tx.id,
      package_name: tx.packages?.name ?? "Paket Konseling",
      total_quota: tx.packages?.session_quota ?? 1,
      used_quota: 0,
      expires_at: expiresAt.toISOString(),
    });
  } else if (isFailed) {
    await admin.from("transactions").update({ status: "failed" }).eq("id", tx.id);
  }

  return jsonResponse(200, { ok: true });
};
