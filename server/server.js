import express from "express";
import Stripe from "stripe";
import "dotenv/config";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import pool from "./db.js";

import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";
import { verifyAdminToken } from "./adminMiddleware.js";


const app = express();
app.set("trust proxy", 1);


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per window
  message: { error: "Too many requests. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});


const stripeKey = process.env.STRIPE_SECRET_KEY;
const hasUsableStripeKey = stripeKey?.startsWith("sk_") && !stripeKey.includes("...");
const stripe = hasUsableStripeKey ? new Stripe(stripeKey) : null;
const jwtSecret = process.env.JWT_SECRET || "dev_jwt_secret";
const adminPassword = process.env.ADMIN_PASSWORD || "admin-password";
if (!process.env.ADMIN_PASSWORD) {
  console.warn("ADMIN_PASSWORD is not set. Using the default development admin password.");
}
const awsRegion = process.env.AWS_REGION || "us-east-1";
const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
const sesSourceEmail = process.env.SES_SOURCE_EMAIL;

const hasAwsConfig = Boolean(awsRegion && awsAccessKey && awsSecretKey);
const hasEmailDelivery = Boolean(hasAwsConfig && sesSourceEmail);
const hasSmsDelivery = Boolean(hasAwsConfig);

const sesClient = hasAwsConfig ? new SESClient({ region: awsRegion }) : null;
const snsClient = hasAwsConfig ? new SNSClient({ region: awsRegion }) : null;

app.use(express.json());

const toMoneyValue = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toFixed(2) : null;
};

const isEmail = (value) => typeof value === "string" && value.includes("@") && value.includes(".");
const normalizePhone = (value) => value.replace(/\D/g, "");
const createOtpCode = () => String(Math.floor(1000 + Math.random() * 9000));

const createAdminToken = () => jwt.sign({ admin: true }, jwtSecret, { expiresIn: "8h" });

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
};

const verifyPassword = (password, storedHash) => {
  if (!storedHash || typeof storedHash !== "string" || !storedHash.includes(":")) {
    return false;
  }
  const [salt, key] = storedHash.split(":");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
};

const formatPhoneForAws = (phone) => {
  const normalized = normalizePhone(phone);
  return normalized.startsWith("1") ? `+${normalized}` : `+${normalized}`;
};

const sendEmailOtp = async (toEmail, code) => {
  if (!hasEmailDelivery || !sesClient) {
    console.warn("AWS SES not configured. OTP will be logged to the console instead of sent by email.");
    console.info(`OTP for ${toEmail}: ${code}`);
    return;
  }

  const params = {
    Source: sesSourceEmail,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: "Singh Coffee House OTP Code" },
      Body: {
        Text: {
          Data: `Your Singh Coffee House code is ${code}. It expires in 5 minutes.`,
        },
      },
    },
  };

  

  try {
    console.log("Sending OTP via AWS SES to", toEmail);
    await sesClient.send(new SendEmailCommand(params));
  } catch (error) {
    console.error("SES send failed:", error);
    throw new Error("Failed to send OTP email via AWS SES. Check your SES configuration.");
  }
};

const sendOrderConfirmationEmail = async (toEmail, order) => {
  if (!toEmail || !sesSourceEmail) return;

  const itemsList = order.items
    .map((item) => `- ${item.name} x${item.quantity} — $${item.price}`)
    .join("\n");

  const params = {
    Source: `"Singh Coffee House" <${sesSourceEmail}>`,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: `Order Confirmed - #${order.orderId}` },
      Body: {
        Text: {
          Data: `Thank you for your order!\n\nOrder #${order.orderId}\n\n${itemsList}\n\nSubtotal: $${order.subtotal}\nTax: $${order.tax}\nTotal: $${order.total}\n\nWe'll have it ready soon. Thanks for choosing Singh Coffee House!`,
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
  } catch (error) {
    console.error("Order confirmation email failed:", error.message);
  }
};

const sendContactEmail = async ({ name, email, message }) => {
  if (!hasEmailDelivery || !sesClient) {
    console.warn("AWS SES not configured. Contact message cannot be delivered.");
    throw new Error("Email delivery is not configured on the server.");
  }

  const destinationEmail = "ikjot0611@gmail.com";
  const params = {
    Source: sesSourceEmail,
    Destination: { ToAddresses: [destinationEmail] },
    ReplyToAddresses: email ? [email] : [],
    Message: {
      Subject: { Data: `New contact form message from ${name || "a visitor"}` },
      Body: {
        Text: {
          Data: `You have received a new message from the Singh Coffee House website.\n\nName: ${name || "N/A"}\nEmail: ${email || "N/A"}\n\nMessage:\n${message || "(no message)"}`,
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
  } catch (error) {
    console.error("Contact email send failed:", error);
    throw new Error("Failed to send contact message via AWS SES. Check your SES configuration.");
  }
};

const sendSmsOtp = async (phone, code) => {
  if (!hasSmsDelivery || !snsClient) {
    console.warn("AWS SNS not configured. OTP will be logged to the console instead of sent by SMS.");
    console.info(`OTP for ${phone}: ${code}`);
    return;
  }

  const phoneNumber = formatPhoneForAws(phone);

  const params = {
    Message: `Your Singh Coffee House code is ${code}. It expires in 5 minutes.`,
    PhoneNumber: phoneNumber,
  };

  await snsClient.send(new PublishCommand(params));
};

const inMemoryUsers = new Map();
const inMemoryAuthOtps = new Map();

const getOtpKey = (contact, type, mode) => `${contact}|${type}|${mode}`;

const safeDbExecute = async (query, params) => {
  try {
    return await pool.execute(query, params);
  } catch (error) {
    console.warn("Database unavailable, falling back to in-memory store:", error.code || error.name, error.message);
    return null;
  }
};

const findUserByContact = async (contactType, contact) => {
  const dbResult = await safeDbExecute(
    contactType === "email"
      ? "SELECT * FROM users WHERE email = ? LIMIT 1"
      : "SELECT * FROM users WHERE phone = ? LIMIT 1",
    [contact],
  );

  if (dbResult) {
    const [rows] = dbResult;
    if (rows.length) return rows[0];
  }

  for (const user of inMemoryUsers.values()) {
    if ((contactType === "email" && user.email === contact) || (contactType === "phone" && user.phone === contact)) {
      return user;
    }
  }

  return null;
};

const createUser = async ({ fullName, email, phone, birthdate, passwordHash }) => {
  const dbResult = await safeDbExecute(
    "INSERT INTO users (full_name, email, phone, birthdate, password_hash) VALUES (?, ?, ?, ?, ?)",
    [fullName, email || null, phone || null, birthdate || null, passwordHash || null],
  );

  if (dbResult) {
    const [result] = dbResult;
    const selectResult = await safeDbExecute("SELECT * FROM users WHERE id = ? LIMIT 1", [result.insertId]);
    if (selectResult) {
      const [rows] = selectResult;
      return rows[0];
    }
  }

  const newId = `mem-${inMemoryUsers.size + 1}`;
  const user = { id: newId, full_name: fullName, email: email || null, phone: phone || null, birthdate: birthdate || null, password_hash: passwordHash || null };
  inMemoryUsers.set(newId, user);
  return user;
};

const deriveNameFromContact = (contact, contactType) => {
  if (contactType === "email") {
    return contact.split("@")[0];
  }
  return "Guest";
};

app.post("/api/orders", async (req, res) => {
  const {
    customer,
    items,
    subtotal,
    tax = 0,
    total,
    paymentStatus = "pending",
    stripePaymentIntentId = null,
  } = req.body;

  if (!customer?.name?.trim()) {
    return res.status(400).json({ error: "Customer name is required." });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one order item is required." });
  }

  const normalizedSubtotal = toMoneyValue(subtotal);
  const normalizedTax = toMoneyValue(tax);
  const normalizedTotal = toMoneyValue(total);

  if (!normalizedSubtotal || !normalizedTax || !normalizedTotal) {
    return res.status(400).json({ error: "Valid subtotal, tax, and total are required." });
  }

  const normalizedItems = items.map((item) => ({
    name: String(item.name || "").trim(),
    quantity: Number(item.quantity),
    price: toMoneyValue(item.price),
  }));

  if (normalizedItems.some((item) => !item.name || !Number.isInteger(item.quantity) || item.quantity < 1 || !item.price)) {
    return res.status(400).json({ error: "Each item needs a name, quantity, and price." });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [customerResult] = await connection.execute(
      "INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)",
      [
        customer.name.trim(),
        customer.email?.trim() || null,
        customer.phone?.trim() || null,
      ],
    );

    const [orderResult] = await connection.execute(
      "INSERT INTO orders (customer_id, stripe_payment_intent_id, subtotal, tax, total, payment_status) VALUES (?, ?, ?, ?, ?, ?)",
      [
        customerResult.insertId,
        stripePaymentIntentId,
        normalizedSubtotal,
        normalizedTax,
        normalizedTotal,
        paymentStatus,
      ],
    );

    for (const item of normalizedItems) {
      await connection.execute(
        "INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, ?, ?)",
        [orderResult.insertId, item.name, item.quantity, item.price],
      );
    }

  await connection.commit();

    if (customer.email?.trim()) {
      sendOrderConfirmationEmail(customer.email.trim(), {
        orderId: orderResult.insertId,
        items: normalizedItems,
        subtotal: normalizedSubtotal,
        tax: normalizedTax,
        total: normalizedTotal,
      });
    }

    res.json({ success: true, orderId: orderResult.insertId });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error("Order save error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      try {
        const [existing] = await pool.execute(
          "SELECT id FROM orders WHERE stripe_payment_intent_id = ? LIMIT 1",
          [stripePaymentIntentId],
        );
        if (existing.length) {
          return res.json({ success: true, orderId: existing[0].id, alreadyExisted: true });
        }
      } catch (lookupError) {
        console.error("Order lookup after duplicate error failed:", lookupError);
      }
    }

    res.status(500).json({ error: error.message || "Order could not be saved." });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

app.get("/api/orders", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT orders.id AS order_id, customers.name AS customer_name, customers.email AS customer_email, customers.phone, orders.total, orders.payment_status, orders.order_status, orders.created_at, order_items.id AS item_id, order_items.item_name, order_items.quantity, order_items.price FROM orders INNER JOIN customers ON orders.customer_id = customers.id LEFT JOIN order_items ON orders.id = order_items.order_id ORDER BY orders.created_at DESC, orders.id DESC, order_items.id ASC",
    );

    const orders = rows.reduce((lookup, row) => {
      if (!lookup.has(row.order_id)) {
        lookup.set(row.order_id, {
          id: row.order_id,
          customerName: row.customer_name,
          customerEmail: row.customer_email,
          phone: row.phone,
          total: row.total,
          payment_status: row.payment_status,
          order_status: row.order_status,
          created_at: row.created_at,
          items: [],
        });
      }

      if (row.item_id) {
        lookup.get(row.order_id).items.push({
          id: row.item_id,
          name: row.item_name,
          quantity: row.quantity,
          price: row.price,
        });
      }

      return lookup;
    }, new Map());

    res.json(Array.from(orders.values()));
  } catch {
    res.status(500).json({ error: "Orders could not be loaded." });
  }
});

app.post("/api/create-payment-intent", async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: "Stripe is not configured. Add STRIPE_SECRET_KEY to enable real payments.",
      });
    }

    const amount = Number(req.body.amount);

    if (!Number.isInteger(amount) || amount < 50) {
      return res.status(400).json({ error: "Invalid payment amount." });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        customerName: req.body.customerName || "Guest",
        orderType: "coffee-order",
      },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: "Name, email, and message are required." });
    }

    if (!isEmail(email.trim())) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    await sendContactEmail({ name: name.trim(), email: email.trim(), message: message.trim() });
    res.json({ success: true, message: "Your message has been sent." });
  } catch (error) {
    console.error("/api/contact error:", error);
    res.status(500).json({ error: error.message || "Could not send your message." });
  }
});

app.post("/api/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || typeof password !== "string") {
      return res.status(400).json({ error: "Admin password is required." });
    }

    if (password !== adminPassword) {
      return res.status(401).json({ error: "Invalid admin password." });
    }

    const adminToken = createAdminToken();
    res.json({ success: true, adminToken });
  } catch (error) {
    console.error("/api/admin/login error:", error);
    res.status(500).json({ error: "Could not sign in as admin." });
  }
});

app.use("/api/admin", verifyAdminToken);

app.get("/api/admin/stats", async (req, res) => {
  try {
    const [todayRows] = await pool.execute(
      "SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue FROM orders WHERE DATE(created_at) = CURDATE()",
    );
    const [allRows] = await pool.execute(
      "SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue FROM orders",
    );

    res.json({
      todayOrderCount: todayRows[0]?.count || 0,
      todayRevenue: todayRows[0]?.revenue || 0,
      allTimeOrderCount: allRows[0]?.count || 0,
      allTimeRevenue: allRows[0]?.revenue || 0,
    });
  } catch (error) {
    console.error("/api/admin/stats error:", error);
    res.status(500).json({ error: "Could not load admin stats." });
  }
});

app.get("/api/admin/orders", async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT orders.id AS order_id, customers.name AS customer_name, customers.email AS customer_email, customers.phone, orders.total, orders.payment_status, orders.order_status, orders.created_at, order_items.id AS item_id, order_items.item_name, order_items.quantity, order_items.price FROM orders INNER JOIN customers ON orders.customer_id = customers.id LEFT JOIN order_items ON orders.id = order_items.order_id ORDER BY orders.created_at DESC, orders.id DESC, order_items.id ASC",
    );

    const orders = rows.reduce((lookup, row) => {
      if (!lookup.has(row.order_id)) {
        lookup.set(row.order_id, {
          id: row.order_id,
          customerName: row.customer_name,
          customerEmail: row.customer_email,
          phone: row.phone,
          total: row.total,
          payment_status: row.payment_status,
          order_status: row.order_status,
          created_at: row.created_at,
          items: [],
        });
      }

      if (row.item_id) {
        lookup.get(row.order_id).items.push({
          id: row.item_id,
          name: row.item_name,
          quantity: row.quantity,
          price: row.price,
        });
      }

      return lookup;
    }, new Map());

    res.json(Array.from(orders.values()));
  } catch (error) {
    console.error("/api/admin/orders error:", error);
    res.status(500).json({ error: "Could not load admin orders." });
  }
});

app.patch("/api/admin/orders/:id/status", async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;
    if (!orderId || !status || typeof status !== "string") {
      return res.status(400).json({ error: "Order id and status are required." });
    }

    const validStatuses = ["pending", "preparing", "ready", "completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid order status." });
    }

    const [result] = await pool.execute(
      "UPDATE orders SET order_status = ? WHERE id = ?",
      [status, orderId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Order not found." });
    }

    res.json({ success: true, orderId, order_status: status });
  } catch (error) {
    console.error("/api/admin/orders/:id/status error:", error);
    res.status(500).json({ error: "Could not update order status." });
  }
});

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { fullName, birthdate, email, phone, password } = req.body;

    if (!fullName?.trim() || !birthdate?.trim() || !email?.trim() || !phone?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Name, birthdate, email, phone, and password are required." });
    }

    if (!isEmail(email.trim())) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }

    const normalizedPhone = normalizePhone(phone.trim());
    if (normalizedPhone.length < 10) {
      return res.status(400).json({ error: "Please provide a valid phone number." });
    }

    const dateValue = new Date(birthdate.trim());
    if (Number.isNaN(dateValue.getTime())) {
      return res.status(400).json({ error: "Please provide a valid birthdate." });
    }

    if (password.trim().length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }

    const normalizedEmail = email.trim();
    let verifiedOtpId = null;
    let otpVerified = false;

    const verifiedOtpResult = await safeDbExecute(
      "SELECT * FROM auth_otps WHERE contact = ? AND contact_type = 'email' AND mode = 'signup' AND verified = TRUE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [normalizedEmail],
    );

    if (verifiedOtpResult) {
      const [rows] = verifiedOtpResult;
      if (rows.length) {
        otpVerified = true;
        verifiedOtpId = rows[0].id;
      }
    } else {
      const entry = [...inMemoryAuthOtps.values()].find(
        (item) =>
          item.contact === normalizedEmail &&
          item.contact_type === "email" &&
          item.mode === "signup" &&
          item.verified === true &&
          new Date(item.expires_at) > new Date(),
      );
      if (entry) {
        otpVerified = true;
      }
    }

    if (!otpVerified) {
      return res.status(400).json({ error: "Please verify your email before signing up." });
    }

    const passwordHash = hashPassword(password.trim());
    const dbResult = await safeDbExecute(
      "INSERT INTO users (full_name, email, phone, birthdate, password_hash) VALUES (?, ?, ?, ?, ?)",
      [fullName.trim(), normalizedEmail, normalizedPhone, dateValue.toISOString().split("T")[0], passwordHash],
    );

    if (!dbResult) {
      return res.status(500).json({ error: "Could not save user." });
    }

    const [result] = dbResult;
    const selectResult = await safeDbExecute("SELECT * FROM users WHERE id = ? LIMIT 1", [result.insertId]);
    if (!selectResult) {
      return res.status(500).json({ error: "Could not load created user." });
    }

    const [rows] = selectResult;
    const user = rows[0];
    if (verifiedOtpId) {
      await safeDbExecute("UPDATE auth_otps SET user_id = ? WHERE id = ?", [user.id, verifiedOtpId]);
    }

    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "7d" });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        birthdate: user.birthdate,
      },
    });
  } catch (error) {
    console.error("signup error:", error);
    let message = error.message || "Could not sign up.";
    if (error.code === "ER_DUP_ENTRY") {
      message = "Email or phone already exists.";
    }
    res.status(500).json({ error: message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { contact, contactType, password } = req.body;

    if (!contact?.trim() || !password?.trim()) {
      return res.status(400).json({ error: "Email/phone and password are required." });
    }

    const normalizedContact = contact.trim();
    const type = contactType === "phone" || normalizedContact.replace(/\D/g, "").length >= 10 ? "phone" : "email";

    const user = await findUserByContact(type, normalizedContact);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid login credentials." });
    }

    if (!verifyPassword(password.trim(), user.password_hash)) {
      return res.status(401).json({ error: "Invalid login credentials." });
    }

    const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: "7d" });
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phone: user.phone,
        birthdate: user.birthdate,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    res.status(500).json({ error: error.message || "Could not log in." });
  }
});

app.post("/api/auth/send-otp", otpLimiter, async (req, res) => {
  try {
    const { authMode, contact, contactType, fullName, email, phone } = req.body;
    if (!contact || typeof contact !== "string") {
      return res.status(400).json({ error: "Contact is required for OTP." });
    }

    const normalizedContact = contact.trim();
    const type = contactType === "phone" ? "phone" : "email";

    if (type === "email") {
      if (!isEmail(normalizedContact)) {
        return res.status(400).json({ error: "Please provide a valid email address." });
      }
    } else {
      const normalizedPhone = normalizePhone(normalizedContact);
      if (normalizedPhone.length < 10) {
        return res.status(400).json({ error: "Please provide a valid phone number." });
      }
    }

    if (authMode === "signup" && type === "phone") {
      if (!normalizePhone(normalizedContact).length) {
        return res.status(400).json({ error: "Please provide a valid signup phone number." });
      }
    }

    const signupFullName = authMode === "signup" ? fullName?.trim() || null : null;
    const signupEmail = authMode === "signup" && type === "email" ? normalizedContact : authMode === "signup" ? email?.trim() || null : null;
    const signupPhone = authMode === "signup" && type === "phone" ? normalizePhone(normalizedContact) : authMode === "signup" ? normalizePhone(phone?.trim() || "") : null;

    const otpCode = createOtpCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otpMode = authMode === "signup" ? "signup" : "login";
    const otpKey = getOtpKey(normalizedContact, type, otpMode);

    const dbResult = await safeDbExecute(
      "INSERT INTO auth_otps (contact, contact_type, otp_code, mode, signup_full_name, signup_email, signup_phone, expires_at, verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        normalizedContact,
        type,
        otpCode,
        otpMode,
        signupFullName,
        signupEmail,
        signupPhone,
        expiresAt,
        false,
      ],
    );

    if (!dbResult) {
      inMemoryAuthOtps.set(otpKey, {
        contact: normalizedContact,
        contact_type: type,
        otp_code: otpCode,
        mode: otpMode,
        signup_full_name: signupFullName,
        signup_email: signupEmail,
        signup_phone: signupPhone,
        expires_at: expiresAt,
        verified: false,
      });
    }

    if (type === "email") {
      await sendEmailOtp(normalizedContact, otpCode);
    } else {
      await sendSmsOtp(normalizedContact, otpCode);
    }

    res.json({ success: true, message: "OTP sent successfully.", contact: normalizedContact, contactType: type });
  } catch (error) {
    console.error("send-otp error:", error);
    res.status(500).json({ error: error.message || "Could not send OTP." });
  }
});

app.post("/api/auth/verify-otp", otpLimiter, async (req, res) => {
  try {
    const { contact, contactType, otp, authMode } = req.body;
    if (!contact || !otp || !authMode) {
      return res.status(400).json({ error: "Contact, auth mode, and OTP are required." });
    }

    const normalizedContact = contact.trim();
    const type = contactType === "phone" ? "phone" : "email";
    const mode = authMode === "signup" ? "signup" : "login";

    let otpEntry = null;
    const otpKey = getOtpKey(normalizedContact, type, mode);
    const dbResult = await safeDbExecute(
      "SELECT * FROM auth_otps WHERE contact = ? AND contact_type = ? AND mode = ? AND verified = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [normalizedContact, type, mode],
    );

    if (dbResult) {
      const [rows] = dbResult;
      otpEntry = rows[0];
    } else {
      const entry = inMemoryAuthOtps.get(otpKey);
      if (entry && !entry.verified && new Date(entry.expires_at) > new Date()) {
        otpEntry = entry;
      }
    }

    if (!otpEntry) {
      return res.status(400).json({ error: "OTP not found or expired. Request a new code." });
    }

    if (otpEntry.otp_code !== otp.trim()) {
      return res.status(400).json({ error: "OTP does not match. Check the latest code and try again." });
    }

    if (otpEntry.id) {
      await safeDbExecute("UPDATE auth_otps SET verified = TRUE WHERE id = ?", [otpEntry.id]);
    } else if (inMemoryAuthOtps.has(otpKey)) {
      inMemoryAuthOtps.set(otpKey, {
        ...otpEntry,
        verified: true,
      });
    }

    if (mode === "signup") {
      return res.json({ success: true, verified: true });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Could not verify OTP." });
  }
});

app.use(express.static(path.join(__dirname, "..", "dist")));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

const port = Number(process.env.SERVER_PORT || 4242);
app.listen(port, () => {
  console.log(`Payment API running on http://localhost:${port}`);
});
