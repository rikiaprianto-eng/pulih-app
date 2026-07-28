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

// Midtrans's dashboard pings this URL (GET, and/or a POST with a placeholder payload)
// when you save the "Payment Notification URL" setting, to confirm it's reachable. It
// expects a 2xx response for that check to pass — so this handler always answers 200,
// even when a real notification turns out to be incomplete or fails signature
// verification. Those cases are logged and ignored internally rather than surfaced as
// HTTP errors; only a verified, successful transaction actually updates the database.
export const handler: Handler = async (event) => {
  if (event.httpMethod === "GET") {
    return jsonResponse(200, { ok: true, note: "Midtrans webhook endpoint is reachable." });
  }
  if (event.httpMethod !== "POST") {
    return jsonResponse(200, { ok: true, note: "ignored: unsupported method" });
  }
  if (!hasServiceRoleKey()) {
    console.error("midtrans-webhook: SUPABASE_SERVICE_ROLE_KEY is not set");
    return jsonResponse(200, { ok: true, note: "ignored: server not fully configured" });
  }

  let body: Partial<MidtransNotification>;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(200, { ok: true, note: "ignored: invalid JSON body" });
  }
  if (!body.order_id || !body.signature_key || !body.status_code || !body.gross_amount) {
    return jsonResponse(200, { ok: true, note: "ignored: incomplete payload" });
  }

  const admin = getSupabaseAdmin();

  const { data: secret } = await admin
    .from("payment_secrets")
    .select("midtrans_server_key")
    .eq("id", 1)
    .maybeSingle();
  if (!secret?.midtrans_server_key || !isValidSignature(body as MidtransNotification, secret.midtrans_server_key)) {
    console.warn("midtrans-webhook: signature mismatch for order", body.order_id);
    return jsonResponse(200, { ok: true, note: "ignored: invalid signature" });
  }

  const notif = body as MidtransNotification;

  const { data: tx } = await admin
    .from("transactions")
    .select("*, packages(name, session_quota)")
    .eq("id", notif.order_id)
    .maybeSingle();
  if (!tx) {
    return jsonResponse(200, { ok: true, note: "ignored: transaction not found" });
  }

  const isSuccess =
    notif.transaction_status === "settlement" ||
    (notif.transaction_status === "capture" && notif.fraud_status === "accept");
  const isFailed = ["deny", "cancel", "expire", "failure"].includes(notif.transaction_status);

  if (isSuccess && tx.status !== "paid") {
    await admin
      .from("transactions")
      .update({
        status: "paid",
        payment_method: notif.payment_type ?? tx.payment_method,
        paid_at: new Date().toISOString(),
      })
      .eq("id", tx.id);

    // Direct Psikolog Profesional payments (psychologist_id set, no package_id) pay for a
    // single session, not a shared-quota package — skip creating a subscription for those.
    if (tx.package_id) {
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
    }
  } else if (isFailed) {
    await admin.from("transactions").update({ status: "failed" }).eq("id", tx.id);
  }

  return jsonResponse(200, { ok: true });
};
