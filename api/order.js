import { MongoClient } from "mongodb";

let cachedClient = null;

async function getClient() {
  if (cachedClient) return cachedClient;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  cachedClient = new MongoClient(uri);
  await cachedClient.connect();
  return cachedClient;
}

async function upsertClerkUser({ name, email }) {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return { clerk_user_id: null, clerk_status: "skipped_no_key" };

  const headers = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };

  const parts = name.trim().split(/\s+/);
  const first_name = parts[0] || "";
  const last_name = parts.slice(1).join(" ") || "";

  // Try to create the user
  const createRes = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers,
    body: JSON.stringify({
      email_address: [email],
      first_name,
      last_name,
      public_metadata: { source: "buried-destiny-shop", customer: true },
    }),
  });

  if (createRes.ok) {
    const user = await createRes.json();
    return { clerk_user_id: user.id, clerk_status: "created" };
  }

  // 422 typically means the email already has a user — look them up instead
  if (createRes.status === 422) {
    const q = new URLSearchParams({ email_address: email });
    const findRes = await fetch(`https://api.clerk.com/v1/users?${q}`, { headers });
    if (findRes.ok) {
      const users = await findRes.json();
      const existing = Array.isArray(users) ? users[0] : (users.data && users.data[0]);
      if (existing) return { clerk_user_id: existing.id, clerk_status: "existing" };
    }
  }

  const errText = await createRes.text().catch(() => "");
  console.error("Clerk user creation failed:", createRes.status, errText.slice(0, 300));
  return { clerk_user_id: null, clerk_status: `failed_${createRes.status}` };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, address, city, state, zip, country, size, color, clerk_user_id } = req.body || {};

  const required = { name, address, city, state, zip, country, size, color };
  for (const [key, value] of Object.entries(required)) {
    if (!value || typeof value !== "string" || !value.trim()) {
      return res.status(400).json({ error: `Missing field: ${key}` });
    }
  }
  const cleanEmail = (email || "").trim().toLowerCase();
  if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  // Create (or find) the buyer in Clerk first, so the order can reference them.
  // Never let auth hiccups lose the sale — degrade gracefully.
  let clerk = { clerk_user_id: null, clerk_status: "error" };
  if (clerk_user_id) {
    clerk = { clerk_user_id, clerk_status: "client_session" };
  } else if (cleanEmail) {
    try {
      clerk = await upsertClerkUser({ name, email: cleanEmail });
    } catch (err) {
      console.error("Clerk step threw:", err.message);
    }
  } else {
    clerk = { clerk_user_id: null, clerk_status: "no_identity" };
  }

  try {
    const client = await getClient();
    const orders = client.db("buried_destiny").collection("orders");
    const doc = {
      name: name.trim(),
      email: cleanEmail || null,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      country: country.trim(),
      size: size.trim(),
      color: color.trim(),
      product: "three-monks-zip-hoodie",
      price_usd: 10,
      status: "pending_payment",
      clerk_user_id: clerk.clerk_user_id,
      clerk_status: clerk.clerk_status,
      created_at: new Date(),
    };
    const result = await orders.insertOne(doc);
    return res.status(200).json({
      ok: true,
      order_id: result.insertedId,
      clerk_user_id: clerk.clerk_user_id,
    });
  } catch (err) {
    console.error("Order insert failed:", err.message);
    return res.status(500).json({ error: "Failed to save order" });
  }
}
