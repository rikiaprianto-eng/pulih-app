import type { Handler } from "@netlify/functions";
import { createHash } from "node:crypto";
import { getSupabaseAdmin, hasServiceRoleKey, jsonResponse } from "./_supabaseAdmin";

type LynkNotification = {
  ref_id?: string;
  message_id?: string;
  amount?: number | string;
  grand_total?: number | string;
  email?: string;
  customer?: { email?: string; name?: string };
  buyer_email?: string;
  event?: string;
};

/** Lynk.id's documented scheme: X-Signature = SHA256(amount + ref_id + message_id + merchant_key). */
function isValidSignature(
  notif: LynkNotification,
  signature: string,
  merchantKey: string
): boolean {
  const amount = String(notif.amount ?? notif.grand_total ?? "");
  const raw = `${amount}${notif.ref_id ?? ""}${notif.message_id ?? ""}${merchantKey}`;
  const expected = createHash("sha256").update(raw).digest("hex");
  return expected.toLowerCase() === signature.toLowerCase();
}

// Lynk.id has no API to mint dynamic payment links, so checkout works by sending
// the patient to a pre-made Lynk.id product page while a pending transaction waits
// here. This webhook is the auto-approve half: on a verified successful payment it
// matches the buyer's email to a Pulih account and settles that account's newest
// pending Lynk.id transaction. Like the Midtrans webhook, it always answers 200 so
// Lynk.id's dashboard URL check and retries never see an error status.
export const handler: Handler = async (event) => {
  if (event.httpMethod === "GET") {
    return jsonResponse(200, { ok: true, note: "Lynk.id webhook endpoint is reachable." });
  }
  if (event.httpMethod !== "POST") {
    return jsonResponse(200, { ok: true, note: "ignored: unsupported method" });
  }
  if (!hasServiceRoleKey()) {
    console.error("lynk-webhook: SUPABASE_SERVICE_ROLE_KEY is not set");
    return jsonResponse(200, { ok: true, note: "ignored: server not fully configured" });
  }

  let notif: LynkNotification;
  try {
    notif = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(200, { ok: true, note: "ignored: invalid JSON body" });
  }

  const admin = getSupabaseAdmin();

  const { data: secret } = await admin
    .from("payment_secrets")
    .select("lynkid_merchant_key")
    .eq("id", 1)
    .maybeSingle();
  if (!secret?.lynkid_merchant_key) {
    return jsonResponse(200, { ok: true, note: "ignored: merchant key not configured" });
  }

  const signature =
    event.headers["x-signature"] ?? event.headers["X-Signature"] ?? event.headers["X-SIGNATURE"];
  if (!signature || !isValidSignature(notif, signature, secret.lynkid_merchant_key)) {
    console.warn("lynk-webhook: signature mismatch for ref", notif.ref_id);
    return jsonResponse(200, { ok: true, note: "ignored: invalid signature" });
  }

  const buyerEmail = (notif.email ?? notif.buyer_email ?? notif.customer?.email ?? "")
    .trim()
    .toLowerCase();
  if (!buyerEmail) {
    return jsonResponse(200, { ok: true, note: "ignored: no buyer email in payload" });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", buyerEmail)
    .maybeSingle();
  if (!profile) {
    console.warn("lynk-webhook: no Pulih account for buyer", buyerEmail);
    return jsonResponse(200, { ok: true, note: "ignored: buyer email has no Pulih account" });
  }

  // Newest pending Lynk.id transaction for this patient (created when they clicked
  // "Bayar via Lynk.id" just before being sent to the Lynk.id product page).
  const { data: tx } = await admin
    .from("transactions")
    .select("*, packages(name, session_quota, duration_minutes)")
    .eq("patient_id", profile.id)
    .eq("status", "pending")
    .eq("payment_method", "Lynk.id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!tx) {
    return jsonResponse(200, { ok: true, note: "ignored: no pending Lynk.id transaction" });
  }

  // The Lynk.id product is a fixed Rp1.000 item paid by quantity, so the amount
  // Lynk.id reports should equal this transaction's amount exactly (both are
  // always multiples of 1.000). A mismatch means this notification belongs to a
  // different purchase — never settle the wrong amount against this transaction.
  const paidAmount = Number(notif.amount ?? notif.grand_total ?? NaN);
  if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - tx.amount) > 1) {
    console.warn("lynk-webhook: amount mismatch", { txId: tx.id, expected: tx.amount, paidAmount });
    return jsonResponse(200, { ok: true, note: "ignored: amount does not match pending transaction" });
  }

  await admin
    .from("transactions")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", tx.id);

  // Package purchases also get their subscription; direct professional payments don't.
  if (tx.package_id) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await admin.from("user_subscriptions").insert({
      patient_id: tx.patient_id,
      transaction_id: tx.id,
      package_name: tx.packages?.name ?? "Paket Konseling",
      total_quota: tx.packages?.session_quota ?? 1,
      used_quota: 0,
      duration_minutes: tx.packages?.duration_minutes ?? 60,
      expires_at: expiresAt.toISOString(),
    });
  }

  return jsonResponse(200, { ok: true, settledTransaction: tx.id });
};
