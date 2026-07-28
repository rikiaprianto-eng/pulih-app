import type { Handler } from "@netlify/functions";
import { getSupabaseAdmin, hasServiceRoleKey, requireUserId, jsonResponse } from "./_supabaseAdmin";

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed" });
  if (!hasServiceRoleKey()) {
    return jsonResponse(500, { error: "SUPABASE_SERVICE_ROLE_KEY belum diset di Netlify." });
  }

  const userId = await requireUserId(event.headers.authorization);
  if (!userId) return jsonResponse(401, { error: "Belum login." });

  let body: { packageId?: string; psychologistId?: string };
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { error: "Body tidak valid." });
  }
  if (!body.packageId && !body.psychologistId) {
    return jsonResponse(400, { error: "packageId atau psychologistId wajib diisi." });
  }

  const admin = getSupabaseAdmin();

  const [{ data: secret }, { data: settings }, { data: profile }] = await Promise.all([
    admin.from("payment_secrets").select("midtrans_server_key").eq("id", 1).maybeSingle(),
    admin.from("site_settings").select("midtrans_is_production").eq("id", 1).maybeSingle(),
    admin.from("profiles").select("full_name, email").eq("id", userId).single(),
  ]);

  if (!secret?.midtrans_server_key) {
    return jsonResponse(400, {
      error: "Server Key Midtrans belum diatur oleh admin di menu Setting > Pembayaran.",
    });
  }

  let amount: number;
  let itemId: string;
  let itemName: string;
  let insertFields: Record<string, unknown>;

  if (body.packageId) {
    const { data: pkg } = await admin.from("packages").select("*").eq("id", body.packageId).single();
    if (!pkg) return jsonResponse(404, { error: "Paket tidak ditemukan." });
    amount = pkg.price;
    itemId = pkg.id;
    itemName = pkg.name;
    insertFields = { patient_id: userId, package_id: pkg.id, amount, payment_method: "Midtrans", status: "pending" };
  } else {
    const { data: psy } = await admin
      .from("psychologist_profiles")
      .select("id, hourly_rate, profiles!inner(full_name)")
      .eq("id", body.psychologistId)
      .single();
    if (!psy || !psy.hourly_rate) {
      return jsonResponse(404, { error: "Psikolog tidak ditemukan atau belum menentukan tarif." });
    }
    amount = psy.hourly_rate;
    itemId = psy.id;
    itemName = `Konsultasi ${(psy as unknown as { profiles: { full_name: string | null } }).profiles?.full_name ?? "Psikolog"}`;
    insertFields = {
      patient_id: userId,
      psychologist_id: psy.id,
      amount,
      payment_method: "Midtrans",
      status: "pending",
    };
  }

  const { data: tx, error: txError } = await admin
    .from("transactions")
    .insert(insertFields)
    .select()
    .single();
  if (txError || !tx) return jsonResponse(500, { error: txError?.message ?? "Gagal membuat transaksi." });

  const isProd = !!settings?.midtrans_is_production;
  const snapBaseUrl = isProd
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const auth = Buffer.from(`${secret.midtrans_server_key}:`).toString("base64");

  const midtransRes = await fetch(snapBaseUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: tx.id,
        gross_amount: amount,
      },
      customer_details: {
        first_name: profile?.full_name ?? "Pengguna Pulih",
        email: profile?.email ?? undefined,
      },
      item_details: [
        {
          id: itemId,
          price: amount,
          quantity: 1,
          name: itemName.slice(0, 50),
        },
      ],
    }),
  });

  const midtransBody = await midtransRes.json();
  if (!midtransRes.ok) {
    await admin.from("transactions").update({ status: "failed" }).eq("id", tx.id);
    return jsonResponse(502, {
      error: midtransBody.error_messages?.join(", ") ?? "Gagal membuat transaksi Midtrans.",
    });
  }

  return jsonResponse(200, {
    transactionId: tx.id,
    token: midtransBody.token,
    redirectUrl: midtransBody.redirect_url,
  });
};
