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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, address, city, state, zip, country, size, color } = req.body || {};

  // Basic validation
  const required = { name, email, address, city, state, zip, country, size, color };
  for (const [key, value] of Object.entries(required)) {
    if (!value || typeof value !== "string" || !value.trim()) {
      return res.status(400).json({ error: `Missing field: ${key}` });
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  try {
    const client = await getClient();
    const orders = client.db("buried_destiny").collection("orders");
    const doc = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
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
      created_at: new Date(),
    };
    const result = await orders.insertOne(doc);
    return res.status(200).json({ ok: true, order_id: result.insertedId });
  } catch (err) {
    console.error("Order insert failed:", err.message);
    return res.status(500).json({ error: "Failed to save order" });
  }
}
