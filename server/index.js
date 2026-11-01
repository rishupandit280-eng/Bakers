/* ============================================================
   Bakers Gallery — lightweight ordering backend
   Zero dependencies (Node built-ins only).

   Run:  node server/index.js
   Env:  PORT, MSG91_AUTH_KEY, MSG91_TEMPLATE_ID, MSG91_SENDER_ID,
         RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, UPI_ID, UPI_NAME

   Without SMS/payment keys the server runs in DEMO mode:
     - /api/otp/send returns the OTP in the response (shown on screen)
     - /api/payment/order returns UPI payment info
   ============================================================ */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const url = require("url");
const crypto = require("crypto");

/* ---- load server/.env (zero-dependency) ---- */
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Za-z_][\w.-]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      }
    });
  }
} catch (e) { /* ignore */ }

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, "..");

const UPI_ID = process.env.UPI_ID || "9503819919@upi";
const UPI_NAME = process.env.UPI_NAME || "Bakers Gallery";
const MSG91_KEY = process.env.MSG91_AUTH_KEY || "";
const MSG91_TEMPLATE = process.env.MSG91_TEMPLATE_ID || "";
const MSG91_SENDER = process.env.MSG91_SENDER_ID || "BKCAFE";
const RZP_ID = process.env.RAZORPAY_KEY_ID || "";
const RZP_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const WA_TOKEN = process.env.WHATSAPP_TOKEN || "";
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "";
const WA_OWNER = process.env.WHATSAPP_OWNER || "";
const WA_TEMPLATE = process.env.WHATSAPP_TEMPLATE || "";

/* ---------- OTP store ---------- */
const otps = new Map(); // phone -> { hash, expires, attempts }
const OTP_TTL = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function hashOtp(phone, otp) {
  return crypto.createHash("sha256").update(phone + ":" + otp + ":" + OTP_TTL).digest("hex");
}

function genOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* ---------- MIME ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

/* ---------- helpers ---------- */
function json(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch (e) { resolve({}); } });
    req.on("error", reject);
  });
}

function isValidPhone(p) {
  return /^[6-9]\d{9}$/.test(String(p || ""));
}

/* ---------- SMS (MSG91) ---------- */
async function sendSms(phone, otp) {
  if (!MSG91_KEY || !MSG91_TEMPLATE) return false;
  const body = JSON.stringify({
    template_id: MSG91_TEMPLATE,
    sender_id: MSG91_SENDER,
    short_url: "0",
    recipients: [{ mobiles: "91" + phone, otp }]
  });
  try {
    const res = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: { "Content-Type": "application/json", authkey: MSG91_KEY },
      body
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/* ---------- Razorpay order ---------- */
async function createRazorpayOrder(amount) {
  if (!RZP_ID || !RZP_SECRET) return null;
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(RZP_ID + ":" + RZP_SECRET).toString("base64")
      },
      body: JSON.stringify({ amount: Math.round(amount * 100), currency: "INR", receipt: "bc_" + Date.now() })
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

/* ---------- WhatsApp (Meta Cloud API) — auto-notify the owner ---------- */
function buildOrderMessage(o) {
  const lines = [];
  lines.push("🛒 *NEW ORDER — Bakers Gallery*");
  lines.push("🧾 Order ID: " + (o.id || "—"));
  lines.push("🕒 " + (o.at || new Date().toLocaleString("en-IN")));
  lines.push("");
  lines.push("👤 Name: " + (o.name || ""));
  lines.push("📞 Phone: +91 " + (o.phone || ""));
  lines.push("📍 Address: " + (o.address || ""));
  if (o.note) lines.push("📝 Note: " + o.note);
  lines.push("");
  lines.push("————— ITEMS —————");
  (o.items || []).forEach((x, i) => {
    const name = x.item ? x.item.name : x.name;
    const price = x.item ? x.item.price : x.price;
    lines.push((i + 1) + ". " + name + " ×" + x.qty + " = ₹" + (x.qty * price));
  });
  lines.push("————— TOTAL —————");
  lines.push("Subtotal: ₹" + o.subtotal);
  lines.push("Delivery: FREE");
  lines.push("💰 Total: ₹" + o.total);
  lines.push("");
  lines.push("💳 Payment: " + (o.payment || "—") + (o.utr ? " (UTR: " + o.utr + ")" : ""));
  return lines.join("\n");
}

async function sendWhatsApp(order) {
  if (!WA_TOKEN || !WA_PHONE_ID || !WA_OWNER) {
    return { sent: false, reason: "not_configured" };
  }
  const body = buildOrderMessage(order);
  let payload;
  if (WA_TEMPLATE) {
    payload = {
      messaging_product: "whatsapp",
      to: WA_OWNER,
      type: "template",
      template: {
        name: WA_TEMPLATE,
        language: { code: "en" },
        components: [{ type: "body", parameters: [{ type: "text", text: body }] }]
      }
    };
  } else {
    payload = {
      messaging_product: "whatsapp",
      to: WA_OWNER,
      type: "text",
      text: { body, preview_url: false }
    };
  }
  try {
    const res = await fetch("https://graph.facebook.com/v19.0/" + WA_PHONE_ID + "/messages", {
      method: "POST",
      headers: { Authorization: "Bearer " + WA_TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      return { sent: false, error: (data && data.error && data.error.message) || ("HTTP " + res.status) };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e.message };
  }
}

/* ---------- static file serving ---------- */
function serveStatic(req, res, pathname) {
  let p = pathname === "/" ? "/index.html" : pathname;
  const file = path.normalize(path.join(ROOT, decodeURIComponent(p)));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      // fallback to 404
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------- routes ---------- */
async function handleApi(req, res, pathname) {
  if (pathname === "/api/health") {
    return json(res, 200, { ok: true, service: "bakers-gallery", time: new Date().toISOString() });
  }

  const body = await readBody(req);

  if (pathname === "/api/otp/send") {
    const phone = String(body.phone || "").replace(/\D/g, "");
    if (!isValidPhone(phone)) return json(res, 400, { ok: false, error: "Invalid phone number" });

    const otp = genOtp();
    const sent = await sendSms(phone, otp);
    otps.set(phone, { hash: hashOtp(phone, otp), expires: Date.now() + OTP_TTL, attempts: 0 });

    if (sent) return json(res, 200, { ok: true, demo: false });
    // demo mode
    return json(res, 200, { ok: true, demo: true, otp });
  }

  if (pathname === "/api/otp/verify") {
    const phone = String(body.phone || "").replace(/\D/g, "");
    const otp = String(body.otp || "").trim();
    const rec = otps.get(phone);
    if (!rec) return json(res, 400, { ok: false, error: "No OTP requested for this number" });
    if (Date.now() > rec.expires) { otps.delete(phone); return json(res, 400, { ok: false, error: "OTP expired" }); }
    if (rec.attempts >= OTP_MAX_ATTEMPTS) { otps.delete(phone); return json(res, 400, { ok: false, error: "Too many attempts" }); }

    if (rec.hash !== hashOtp(phone, otp)) {
      rec.attempts++;
      return json(res, 400, { ok: false, error: "Incorrect OTP" });
    }
    otps.delete(phone);
    return json(res, 200, { ok: true, verified: true });
  }

  if (pathname === "/api/payment/order") {
    const amount = Number(body.amount || 0);
    if (!amount || amount <= 0) return json(res, 400, { ok: false, error: "Invalid amount" });

    const rzp = await createRazorpayOrder(amount);
    if (rzp && rzp.id) {
      return json(res, 200, { ok: true, razorpay: { key: RZP_ID, id: rzp.id, amount: rzp.amount, currency: rzp.currency } });
    }
    return json(res, 200, { ok: true, upi: { upiId: UPI_ID, name: UPI_NAME, amount } });
  }

  if (pathname === "/api/orders") {
    const line = JSON.stringify({ at: new Date().toISOString(), ...body }) + "\n";
    const file = path.join(ROOT, "server", "orders.jsonl");
    let logged = true;
    try { fs.appendFileSync(file, line, "utf8"); } catch (e) { logged = false; }
    const whatsapp = await sendWhatsApp(body);
    return json(res, 200, { ok: true, logged, whatsapp });
  }

  return json(res, 404, { ok: false, error: "Not found" });
}

/* ---------- server ---------- */
const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url, true);

  if (req.method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "POST, GET, OPTIONS" });
    return res.end();
  }

  if (pathname.startsWith("/api/")) {
    return handleApi(req, res, pathname).catch(e => json(res, 500, { ok: false, error: e.message }));
  }

  return serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log("");
  console.log("  🥐  Bakers Gallery is serving at  http://localhost:" + PORT);
  console.log("  🧪  SMS demo mode:", MSG91_KEY ? "OFF (live)" : "ON");
  console.log("  💳  Payments:", RZP_ID ? "Razorpay" : "UPI (" + UPI_ID + ")");
  console.log("  💬  WhatsApp auto-notify:", WA_TOKEN && WA_PHONE_ID ? "ON → " + WA_OWNER : "OFF (not configured)");
  console.log("");
});
