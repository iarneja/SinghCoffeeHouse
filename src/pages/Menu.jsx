import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const MENU = [
  {
    title: "Fan Favorites",
    items: ["Trending", "Seasonal Picks", "New Arrivals"],
  },
  {
    title: "Drinks",
    items: [
      "Hot Coffee",
      "Cold Coffee",
      "Espresso",
      "Latte & Mocha",
      "Cappuccino",
      "Chai",
      "Matcha",
      "Hot Tea",
      "Cold Tea",
      "Refreshers",
      "Frappes",
      "Hot Chocolate",
      "Lemonade",
      "Bottled Beverages",
    ],
  },
  {
    title: "Food",
    items: ["Breakfast", "Bakery", "Treats", "Lunch", "Lite Bites"],
  },
  {
    title: "At Home Coffee",
    items: ["Whole Bean", "Instant", "Merch & Mugs"],
  },
];

const ICON = {
  coffee: "☕",
  iced: "🧊",
  espresso: "⚡",
  tea: "🍵",
  matcha: "🌿",
  frappe: "🥤",
  choco: "🍫",
  lemon: "🍋",
  bottle: "🧃",
  food: "🥐",
  merch: "🛍️",
  star: "⭐",
};

const ITEMS = {
  Trending: [
    { icon: ICON.star, name: "Masala Chai Latte", desc: "Warm spices, silky milk, cozy finish.", price: "$5.25" },
    { icon: ICON.iced, name: "Saffron Cold Brew", desc: "Smooth cold brew with a saffron note.", price: "$5.75" },
    { icon: ICON.coffee, name: "Cardamom Cappuccino", desc: "Classic cappuccino, light cardamom lift.", price: "$5.10" },
    { icon: ICON.iced, name: "Iced Mocha", desc: "Chocolate + espresso over ice.", price: "$5.45" },
  ],

  "Hot Coffee": [
    { icon: ICON.coffee, name: "House Brew", desc: "Smooth daily roast, clean finish.", price: "$3.25" },
    { icon: ICON.espresso, name: "Americano", desc: "Espresso + hot water, bold and simple.", price: "$3.50" },
    { icon: ICON.espresso, name: "Cortado", desc: "Equal parts espresso and warm milk.", price: "$4.10" },
    { icon: ICON.coffee, name: "Cappuccino", desc: "Steamed milk + foam, classic balance.", price: "$4.50" },
    { icon: ICON.coffee, name: "Latte", desc: "Espresso with steamed milk.", price: "$4.85" },
    { icon: ICON.choco, name: "Mocha", desc: "Chocolate + espresso + steamed milk.", price: "$5.40" },
    { icon: ICON.espresso, name: "Flat White", desc: "Espresso with microfoam milk.", price: "$4.95" },
    { icon: ICON.coffee, name: "Pour Over", desc: "Hand-brewed, bright and aromatic.", price: "$4.25" },
  ],

  "Cold Coffee": [
    { icon: ICON.iced, name: "Cold Brew", desc: "Slow-steeped, super smooth.", price: "$4.75" },
    { icon: ICON.iced, name: "Nitro Cold Brew", desc: "Creamy texture, no milk added.", price: "$5.25" },
    { icon: ICON.iced, name: "Iced Americano", desc: "Bold espresso, chilled.", price: "$3.95" },
    { icon: ICON.iced, name: "Iced Latte", desc: "Espresso + milk over ice.", price: "$5.10" },
    { icon: ICON.iced, name: "Iced Caramel Latte", desc: "Caramel sweetness, clean finish.", price: "$5.65" },
  ],

  Espresso: [
    { icon: ICON.espresso, name: "Espresso (Solo)", desc: "Rich, bold shot.", price: "$3.30" },
    { icon: ICON.espresso, name: "Espresso (Doppio)", desc: "Double shot, extra kick.", price: "$3.95" },
    { icon: ICON.espresso, name: "Macchiato", desc: "Espresso with a dollop of foam.", price: "$3.75" },
  ],

  "Latte & Mocha": [
    { icon: ICON.coffee, name: "Classic Latte", desc: "Smooth espresso + steamed milk.", price: "$4.85" },
    { icon: ICON.coffee, name: "Caramel Latte", desc: "Caramel notes, silky finish.", price: "$5.45" },
    { icon: ICON.choco, name: "Mocha", desc: "Chocolate + espresso.", price: "$5.40" },
    { icon: ICON.choco, name: "White Mocha", desc: "Creamy white chocolate mocha.", price: "$5.65" },
  ],

  Cappuccino: [
    { icon: ICON.coffee, name: "Classic Cappuccino", desc: "Foamy, balanced, timeless.", price: "$4.50" },
    { icon: ICON.coffee, name: "Cinnamon Cappuccino", desc: "Warm cinnamon dusting.", price: "$4.85" },
  ],

  Chai: [
    { icon: ICON.tea, name: "Masala Chai Latte", desc: "Spiced chai + steamed milk.", price: "$5.25" },
    { icon: ICON.iced, name: "Iced Chai", desc: "Chai over ice, refreshing.", price: "$5.35" },
  ],

  Matcha: [
    { icon: ICON.matcha, name: "Matcha Latte", desc: "Creamy matcha, smooth energy.", price: "$5.35" },
    { icon: ICON.iced, name: "Iced Matcha Latte", desc: "Chilled matcha goodness.", price: "$5.55" },
    { icon: ICON.lemon, name: "Matcha Lemonade", desc: "Matcha + lemonade, bright.", price: "$5.75" },
  ],

  "Hot Tea": [
    { icon: ICON.tea, name: "Earl Grey", desc: "Classic black tea, aromatic.", price: "$3.50" },
    { icon: ICON.tea, name: "Herbal Tea", desc: "Caffeine-free, calming.", price: "$3.50" },
  ],

  "Cold Tea": [
    { icon: ICON.iced, name: "Iced Black Tea", desc: "Crisp, clean, refreshing.", price: "$3.95" },
    { icon: ICON.iced, name: "Iced Green Tea", desc: "Light and bright.", price: "$3.95" },
    { icon: ICON.iced, name: "Peach Iced Tea", desc: "Peach notes, smooth finish.", price: "$4.45" },
  ],

  Refreshers: [
    { icon: ICON.lemon, name: "Strawberry Refresher", desc: "Fruity and chilled.", price: "$4.95" },
    { icon: ICON.lemon, name: "Mango Refresher", desc: "Tropical and bright.", price: "$4.95" },
    { icon: ICON.lemon, name: "Lime Refresher", desc: "Zesty, clean, refreshing.", price: "$4.95" },
  ],

  Frappes: [
    { icon: ICON.frappe, name: "Coffee Frappe", desc: "Blended coffee, smooth.", price: "$5.65" },
    { icon: ICON.frappe, name: "Mocha Frappe", desc: "Chocolate blended coffee.", price: "$5.85" },
    { icon: ICON.frappe, name: "Caramel Frappe", desc: "Caramel blended delight.", price: "$5.85" },
  ],

  "Hot Chocolate": [
    { icon: ICON.choco, name: "Classic Hot Chocolate", desc: "Warm, rich, comforting.", price: "$4.75" },
    { icon: ICON.choco, name: "Mocha Hot Chocolate", desc: "Chocolate + espresso twist.", price: "$5.10" },
  ],

  Lemonade: [
    { icon: ICON.lemon, name: "Classic Lemonade", desc: "Fresh and tangy.", price: "$4.25" },
    { icon: ICON.lemon, name: "Mint Lemonade", desc: "Cool mint finish.", price: "$4.55" },
  ],

  "Bottled Beverages": [
    { icon: ICON.bottle, name: "Water", desc: "Still water.", price: "$2.00" },
    { icon: ICON.bottle, name: "Sparkling Water", desc: "Bubbly and crisp.", price: "$2.50" },
    { icon: ICON.bottle, name: "Juice", desc: "Seasonal options.", price: "$3.25" },
  ],

  Breakfast: [
    { icon: ICON.food, name: "Egg & Cheese", desc: "Warm breakfast sandwich.", price: "$5.25" },
    { icon: ICON.food, name: "Granola Bowl", desc: "Yogurt, granola, fruit.", price: "$6.10" },
    { icon: ICON.food, name: "Aloo Paratha Wrap", desc: "Singh-style comfort.", price: "$6.75" },
  ],

  Bakery: [
    { icon: ICON.food, name: "Croissant", desc: "Buttery, flaky.", price: "$3.95" },
    { icon: ICON.food, name: "Muffin", desc: "Baked fresh daily.", price: "$3.75" },
    { icon: ICON.food, name: "Cinnamon Roll", desc: "Warm and sweet.", price: "$4.25" },
  ],

  Treats: [
    { icon: ICON.food, name: "Brownie", desc: "Fudgy and rich.", price: "$3.95" },
    { icon: ICON.food, name: "Cookie Box", desc: "Assorted cookies.", price: "$4.95" },
    { icon: ICON.food, name: "Cake Slice", desc: "Ask for today's flavor.", price: "$5.25" },
  ],

  Lunch: [
    { icon: ICON.food, name: "Grilled Sandwich", desc: "Toasted, melty, satisfying.", price: "$7.95" },
    { icon: ICON.food, name: "Paneer Wrap", desc: "Spiced paneer, fresh veg.", price: "$8.25" },
    { icon: ICON.food, name: "Salad Bowl", desc: "Light and filling.", price: "$7.50" },
  ],

  "Lite Bites": [
    { icon: ICON.food, name: "Fruit Cup", desc: "Fresh seasonal fruit.", price: "$4.25" },
    { icon: ICON.food, name: "Yogurt", desc: "Creamy and simple.", price: "$3.75" },
    { icon: ICON.food, name: "Protein Bar", desc: "Grab-and-go.", price: "$3.25" },
  ],

  "Whole Bean": [
    { icon: ICON.coffee, name: "House Blend", desc: "Balanced and smooth.", price: "$14.99" },
    { icon: ICON.coffee, name: "Dark Roast", desc: "Bold and intense.", price: "$15.99" },
    { icon: ICON.coffee, name: "Single Origin", desc: "Rotating selection.", price: "$16.99" },
  ],

  Instant: [
    { icon: ICON.coffee, name: "Instant Classic", desc: "Fast and smooth.", price: "$9.99" },
    { icon: ICON.coffee, name: "Instant Dark", desc: "Deeper roast profile.", price: "$10.99" },
    { icon: ICON.tea, name: "Instant Chai", desc: "Spiced chai mix.", price: "$11.99" },
  ],

  "Merch & Mugs": [
    { icon: ICON.merch, name: "Ceramic Mug", desc: "Cream + gold details.", price: "$12.99" },
    { icon: ICON.merch, name: "Tumbler", desc: "Hot/cold, premium feel.", price: "$16.99" },
    { icon: ICON.merch, name: "Gift Cards", desc: "Perfect for friends.", price: "$25.00" },
  ],

  "Seasonal Picks": [
    { icon: ICON.star, name: "Saffron Rose Latte", desc: "Floral and cozy.", price: "$5.95" },
    { icon: ICON.star, name: "Spiced Cold Foam", desc: "Seasonal topping.", price: "$1.25" },
  ],

  "New Arrivals": [
    { icon: ICON.star, name: "Cold Brew Float", desc: "Cold brew + ice cream.", price: "$6.25" },
    { icon: ICON.star, name: "Honey Oat Latte", desc: "Smooth, sweet, premium.", price: "$5.65" },
  ],
};

const allItems = Object.values(ITEMS)
  .flat()
  .reduce((lookup, item) => ({ ...lookup, [item.name]: item }), {});

const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const hasUsablePublishableKey = publishableKey?.startsWith("pk_") && !publishableKey.includes("...");
const stripePromise = hasUsablePublishableKey
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
  : null;

const parsePrice = (price) => Number(price.replace("$", ""));
const money = (amount) => `$${amount.toFixed(2)}`;

const MENU_IMAGES = {
  coffee: "/img/Latte.png",
  iced: "/img/Iced%20Latte.png",
  frappe: "/img/Coffee%20Frappe.png",
  matcha: "/img/Matcha%20Latte.png",
  chai: "/img/Masala%20Chai%20Latte.png",
  tea: "/img/Earl%20Grey.png",
  refresher: "/img/Strawberry%20Refresher.png",
  chocolate: "/img/Classic%20Hot%20Chocolate.png",
  bottle: "/img/Water.png",
  food: "/img/Grilled%20Sandwich.png",
  breakfast: "/img/Egg%20%26%20Cheese.png",
  bakery: "/img/Croissant.png",
  treats: "/img/Brownie.png",
  lunch: "/img/Grilled%20Sandwich.png",
  "lite-bites": "/img/Fruit%20Cup.png",
  beans: "/img/House%20Blend.png",
  "whole-bean": "/img/House%20Blend.png",
  instant: "/img/Instant%20Classic.png",
  "merch-mugs": "/img/Ceramic%20mug.png",
  merch: "/img/Ceramic%20mug.png",
};

const ITEM_IMAGES = {
  "Cinnamon Cappuccino": "/img/Classic Cappuccino.png",
  "Cold Brew": "/img/Cold Brew Float.png",
  "Gift Cards": "/img/Gift card.png",
  "House Brew": "/img/House Blend.png",
  "Saffron Cold Brew": "/img/saffron cold brew.png",
  "Iced Chai": "/img/Iced chai.png",
  "Sparkling Water": "/img/Sparkling water.png",
  "Egg & Cheese": "/img/Egg and Cheese.png",
  "Salad Bowl": "/img/Salad bowl.png",
  "Instant Chai": "/img/Instant chai.png",
  "Ceramic Mug": "/img/Ceramic mug.png",
};

const getMenuVisual = (category, item) => {
  const text = `${category} ${item.name} ${item.desc}`.toLowerCase();

  if (text.includes("breakfast") || text.includes("sandwich") || text.includes("wrap") || text.includes("croissant")) return "breakfast";
  if (text.includes("bakery") || text.includes("muffin")) return "bakery";
  if (text.includes("treat") || text.includes("brownie") || text.includes("cake") || text.includes("cookie")) return "treats";
  if (text.includes("lunch") || text.includes("salad")) return "lunch";
  if (text.includes("lite") || text.includes("fruit") || text.includes("protein")) return "lite-bites";
  if (text.includes("matcha")) return "matcha";
  if (text.includes("chai")) return "chai";
  if (text.includes("lemon") || text.includes("refresher") || text.includes("mango") || text.includes("strawberry") || text.includes("lime")) return "refresher";
  if (text.includes("frappe") || text.includes("blended") || text.includes("float")) return "frappe";
  if (text.includes("iced") || text.includes("cold") || text.includes("nitro")) return "iced";
  if (text.includes("tea") || text.includes("earl") || text.includes("herbal")) return "tea";
  if (text.includes("chocolate") || text.includes("mocha") || text.includes("brownie")) return "chocolate";
  if (text.includes("water") || text.includes("juice") || text.includes("bottled")) return "bottle";
  if (text.includes("whole bean") || text.includes("dark roast") || text.includes("single origin") || text.includes("blend") || text.includes("roast") || text.includes("origin")) return "whole-bean";
  if (text.includes("instant")) return "instant";
  if (text.includes("mug") || text.includes("tumbler") || text.includes("gift")) return "merch-mugs";
  return "coffee";
};

const getMenuImage = (category, item) => {
  // Prefer explicit ITEM_IMAGES mapping when present
  if (ITEM_IMAGES[item.name]) return ITEM_IMAGES[item.name];

  // Try to use a matching image from the new `/img` folder using the exact item name
  const candidate = `/img/${encodeURIComponent(item.name)}.png`;
  return candidate || MENU_IMAGES[getMenuVisual(category, item)] || MENU_IMAGES.coffee;
};

function LoginModal({ onClose, onLogin }) {
  const [authMode, setAuthMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contact, setContact] = useState("");
  const [contactType, setContactType] = useState("email");
  const [password, setPassword] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [emailVerificationMessage, setEmailVerificationMessage] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  useEffect(() => {
    setContactType(contact.includes("@") ? "email" : "phone");
  }, [contact]);

  useEffect(() => {
    setEmailVerified(false);
    setEmailVerificationSent(false);
    setEmailVerificationCode("");
    setEmailVerificationMessage("");
    setResendCountdown(0);
  }, [email]);

  useEffect(() => {
    if (resendCountdown <= 0) return undefined;
    const timer = window.setTimeout(() => setResendCountdown((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  const switchAuthMode = (nextMode) => {
    setAuthMode(nextMode);
    setError("");
    setPassword("");
    setContact("");
    setEmail("");
    setPhone("");
    setFullName("");
    setBirthdate("");
    setEmailVerified(false);
    setEmailVerificationSent(false);
    setEmailVerificationCode("");
    setEmailVerificationMessage("");
  };

  const sendEmailVerification = async (isResend = false) => {
    setError("");
    setEmailVerificationMessage("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailVerificationMessage("Enter an email address to verify.");
      return;
    }

    if (!trimmedEmail.includes("@")) {
      setEmailVerificationMessage("Enter a valid email address.");
      return;
    }

    setEmailVerifying(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authMode: "signup",
          contact: trimmedEmail,
          contactType: "email",
        }),
      });
      const data = await response.json().catch(async () => ({ error: await response.text() }));
      if (!response.ok) {
        throw new Error(data.error || "Unable to send verification email.");
      }
      setEmailVerificationSent(true);
      setResendCountdown(30);
      setEmailVerificationMessage(isResend ? "New code sent. Enter it below." : "Verification code sent. Enter it below.");
    } catch (err) {
      setEmailVerificationMessage(err.message);
    } finally {
      setEmailVerifying(false);
    }
  };

  const verifyEmailCode = async () => {
    setError("");
    setEmailVerificationMessage("");

    const code = emailVerificationCode.trim();
    if (code.length !== 4) {
      setEmailVerificationMessage("Enter the 4-digit verification code.");
      return;
    }

    setEmailVerifying(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authMode: "signup",
          contact: email.trim(),
          contactType: "email",
          otp: code,
        }),
      });
      const data = await response.json().catch(async () => ({ error: await response.text() }));
      if (!response.ok) {
        throw new Error(data.error || "Unable to verify code.");
      }
      setEmailVerified(true);
      setEmailVerificationMessage("Email verified successfully.");
    } catch (err) {
      setEmailVerificationMessage(err.message);
      setEmailVerified(false);
    } finally {
      setEmailVerifying(false);
    }
  };

  const submitAuth = async (event) => {
    event.preventDefault();
    setError("");
    setSending(true);

    if (authMode === "login") {
      if (!contact.trim() || !password.trim()) {
        setError("Email/phone and password are required to log in.");
        setSending(false);
        return;
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact: contact.trim(), contactType, password: password.trim() }),
      });
      const data = await response.json().catch(async () => ({ error: await response.text() }));
      if (!response.ok) {
        setError(data.error || "Login failed.");
        setSending(false);
        return;
      }
      onLogin(data);
      onClose();
      return;
    }

    if (!fullName.trim() || !birthdate.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      setError("Name, birthdate, email, phone, and password are required for signup.");
      setSending(false);
      return;
    }

    if (!emailVerified) {
      setError("Please verify your email before signing up.");
      setSending(false);
      return;
    }

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.trim(),
        birthdate: birthdate.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
      }),
    });
    const data = await response.json().catch(async () => ({ error: await response.text() }));
    if (!response.ok) {
      setError(data.error || "Signup failed.");
      setSending(false);
      return;
    }

    onLogin(data);
    onClose();
  };

  return (
    <motion.div
      className="authShade"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.section
        className="authModal"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.22 }}
      >
        <button className="authClose" onClick={onClose} aria-label="Close login">
          x
        </button>

        <div className="authKicker">Account</div>
        <h2 className="authTitle">{authMode === "login" ? "Log in" : "Sign up"}</h2>

        <div className="authTabs">
          <button className={authMode === "login" ? "active" : ""} onClick={() => switchAuthMode("login")}>
            Log in
          </button>
          <button className={authMode === "signup" ? "active" : ""} onClick={() => switchAuthMode("signup")}>
            Sign up
          </button>
        </div>

        <form className="authForm" onSubmit={submitAuth}>
          {authMode === "login" ? (
            <>
              <input
                className="input"
                placeholder="Email or phone"
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                required
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </>
          ) : (
            <>
              <input
                className="input"
                placeholder="Name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
              <input
                className="input"
                type="date"
                placeholder="Birthdate"
                value={birthdate}
                onChange={(event) => setBirthdate(event.target.value)}
                required
              />
              <div className="inputWithButton">
                <input
                  className="input emailInput"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="verifyEmailButton"
                  onClick={() => sendEmailVerification(false)}
                  disabled={emailVerified || emailVerifying || !email.trim()}
                >
                  {emailVerified ? "Verified" : emailVerifying ? "Sending…" : "Verify Email"}
                </button>
              </div>
              <AnimatePresence>
                {emailVerificationSent && (
                  <motion.div
                    className="verifyCodeBlock"
                    initial={{ opacity: 0, y: 12, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: 12, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    <div className="verifyCodeRow">
                      <input
                        className="input"
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="Enter 4-digit code"
                        value={emailVerificationCode}
                        onChange={(event) => setEmailVerificationCode(event.target.value.replace(/\D/g, ""))}
                      />
                      <button
                        type="button"
                        className="verifyCodeButton"
                        onClick={verifyEmailCode}
                        disabled={emailVerified || emailVerifying || emailVerificationCode.trim().length !== 4}
                      >
                        Verify
                      </button>
                    </div>
                    {!emailVerified && (
                      <div className="resendRow">
                        <button
                          type="button"
                          className="resendButton"
                          onClick={() => sendEmailVerification(true)}
                          disabled={resendCountdown > 0 || emailVerifying}
                        >
                          {resendCountdown > 0 ? `Request new code (${resendCountdown}s)` : "Request new code"}
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {emailVerificationMessage && (
                <div className={emailVerified ? "authHint authSuccess" : "authHint"}>
                  {emailVerificationMessage}
                </div>
              )}
              <input
                className="input"
                type="tel"
                placeholder="Phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
              />
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </>
          )}

          {error && <div className="authError">{error}</div>}
          <button
            className="btn authBtn"
            disabled={
              sending ||
              (authMode === "signup" && !emailVerified) ||
              (authMode === "signup" && (!fullName.trim() || !birthdate.trim() || !email.trim() || !phone.trim() || !password.trim()))
            }
          >
            {sending ? (authMode === "login" ? "Logging in…" : "Signing up…") : authMode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>
      </motion.section>
    </motion.div>
  );
}

function buildCartItems(cart) {
  return Object.entries(cart)
    .map(([name, qty]) => ({ ...allItems[name], name, qty }))
    .filter((item) => item.qty > 0);
}

function getCartTotals(cartItems) {
  const subtotal = cartItems.reduce((sum, item) => sum + parsePrice(item.price) * item.qty, 0);
  const tax = subtotal * 0.082;
  return { subtotal, tax, total: subtotal + tax };
}

function CartDrawer({ cart, updateCart, onClose, onCheckout }) {
  const cartItems = buildCartItems(cart);
  const { subtotal, tax, total } = getCartTotals(cartItems);

  return (
    <motion.div className="cartShade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.aside
        className="cartDrawer"
        initial={{ x: 360 }}
        animate={{ x: 0 }}
        exit={{ x: 360 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      >
        <div className="cartHead">
          <div>
            <div className="cartKicker">Your order</div>
            <h2>Cart</h2>
          </div>
          <button className="authClose" onClick={onClose} aria-label="Close cart">
            x
          </button>
        </div>

        {cartItems.length === 0 ? (
          <div className="emptyCart">
            <h3>Your cart is empty</h3>
            <p>Add your favorite coffee and it will show up here.</p>
          </div>
        ) : (
          <>
            <div className="cartItems">
              {cartItems.map((item) => (
                <article className="cartItem" key={item.name}>
                  <div className="cartIcon">{item.icon}</div>
                  <div>
                    <div className="cartItemName">{item.name}</div>
                    <div className="cartItemPrice">{item.price}</div>
                    <div className="miniQty">
                      <button onClick={() => updateCart(item.name, -1)}>-</button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateCart(item.name, 1)}>+</button>
                    </div>
                  </div>
                  <strong>{money(parsePrice(item.price) * item.qty)}</strong>
                </article>
              ))}
            </div>

            <div className="cartSummary">
              <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div><span>Estimated tax</span><strong>{money(tax)}</strong></div>
              <div className="cartTotal"><span>Total</span><strong>{money(total)}</strong></div>
              <button className="btn checkoutBtn" onClick={onCheckout}>Proceed</button>
            </div>
          </>
        )}
      </motion.aside>
    </motion.div>
  );
}

// function StripePaymentForm({ total, onPaid }) {
//   const stripe = useStripe();
//   const elements = useElements();
//   const [message, setMessage] = useState("");
//   const [processing, setProcessing] = useState(false);

//   const submitPayment = async (event) => {
//     event.preventDefault();
//     if (!stripe || !elements) return;

//     setProcessing(true);
//     const { error, paymentIntent } = await stripe.confirmPayment({
//       elements,
//       confirmParams: {
//         return_url: window.location.href,
//       },
//       redirect: "if_required",
//     });

//     setProcessing(false);

//     if (error) {
//       setMessage(error.message);
//       return;
//     }

//     try {
//       await onPaid(paymentIntent?.id);
//     } catch (err) {
//       setMessage(err.message);
//     }
//   };

//   return (
//     <form className="stripeForm" onSubmit={submitPayment}>
//       <PaymentElement />
//       {message && <div className="authError">{message}</div>}
//       <button className="btn checkoutBtn" disabled={!stripe || processing}>
//         {processing ? "Processing..." : `Pay ${money(total)}`}
//       </button>
//     </form>
//   );
// }

function StripePaymentForm({ total, onPaid }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const submittingRef = useRef(false);

  const submitPayment = async (event) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    if (submittingRef.current || succeeded) return;
    submittingRef.current = true;

    setProcessing(true);
    setMessage("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: "if_required",
    });

    setProcessing(false);

    if (error) {
      setMessage(error.message);
      submittingRef.current = false;
      return;
    }

    setSucceeded(true);

    try {
      await onPaid(paymentIntent?.id);
    } catch (err) {
      setMessage(
        `Payment was successful, but we couldn't save your order automatically (${err.message}). Please contact us with your payment confirmation.`,
      );
    }
  };

  return (
    <form className="stripeForm" onSubmit={submitPayment}>
      <PaymentElement />
      {message && <div className="authError">{message}</div>}
      <button className="btn checkoutBtn" disabled={!stripe || processing || succeeded}>
        {succeeded ? "Payment received" : processing ? "Processing..." : `Pay ${money(total)}`}
      </button>
    </form>
  );
}

function CheckoutModal({ cart, user, onClose, onPaid }) {
  const cartItems = buildCartItems(cart);
  const { subtotal, tax, total } = getCartTotals(cartItems);
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [demoMethod, setDemoMethod] = useState("card");
  const amount = Math.round(total * 100);

  const saveOrder = async (stripePaymentIntentId) => {
    setSavingOrder(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            name: user.fullName,
            email: user.email || "",
            phone: user.phone || "",
          },
          items: cartItems.map((item) => ({
            name: item.name,
            quantity: item.qty,
            price: parsePrice(item.price),
          })),
          subtotal,
          tax,
          total,
          paymentStatus: "paid",
          stripePaymentIntentId,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Order could not be saved.");
      onPaid(data.orderId);
    } finally {
      setSavingOrder(false);
    }
  };

  useEffect(() => {
    if (!stripePromise || !amount) return;

    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, customerName: user.fullName }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Payment setup failed.");
        setClientSecret(data.clientSecret);
      })
      .catch((err) => setError(err.message));
  }, [amount, user.fullName]);

  return (
    <motion.div className="authShade" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.section
        className="checkoutModal"
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
      >
        <button className="authClose" onClick={onClose} aria-label="Close checkout">
          x
        </button>
        <div className="authKicker">Payment</div>
        <h2 className="authTitle">Checkout</h2>

        <div className="paySummary">
          <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
          <div><span>Estimated tax</span><strong>{money(tax)}</strong></div>
          <div><span>Total</span><strong>{money(total)}</strong></div>
        </div>

        <div className="paymentChoices">
          {[
            ["card", "Credit card"],
            ["debit", "Debit card"],
            ["apple", "Apple Pay"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={demoMethod === id ? "active" : ""}
              onClick={() => setDemoMethod(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {stripePromise && clientSecret ? (
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <StripePaymentForm total={total} onPaid={saveOrder} />
          </Elements>
        ) : (
          <div className="demoPayBox">
            <div>
              {error
                ? error
                : "Demo checkout is active. Add Stripe keys to turn this into real credit, debit, and Apple Pay payments."}
            </div>
            <button className="btn checkoutBtn" onClick={() => onPaid(null)}>
              {savingOrder ? "Saving..." : `Simulate ${demoMethod === "apple" ? "Apple Pay" : demoMethod} payment`}
            </button>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}

export default function Menu({ user, onLogin, onLogout, cart, cartCount, updateCart }) {
  const navigate = useNavigate();
  const [active, setActive] = useState("Hot Coffee");
  const [authOpen, setAuthOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const accountRef = useRef(null);

  const items = useMemo(() => ITEMS[active] || [], [active]);

  useEffect(() => {
    if (!accountOpen) return undefined;
    const handleClickOutside = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountOpen]);

  const handleAccountClick = () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setAccountOpen((prev) => !prev);
  };

  const handleLogoutClick = () => {
    setAccountOpen(false);
    onLogout?.();
  };

  return (
    <div className="menuPage">
      <div className="menuTop">
        <button className="menuBack" onClick={() => navigate("/")}>
          ← Back
        </button>
        <div className="menuTopTitle">Singh Coffee House</div>
        <div className="menuTopActions" ref={accountRef}>
          <button className="cartPill" onClick={() => setCartOpen(true)}>Cart {cartCount}</button>
          <div className="accountWrapper">
            <button className="loginPill" onClick={handleAccountClick}>
              {user ? `Hi, ${user.fullName.split(" ")[0]}` : "Login"}
            </button>
            {user && accountOpen && (
              <div className="accountDropdown">
                <div className="accountDetails">
                  <div className="accountName">{user.fullName}</div>
                  <div className="accountContact">{user.email || user.phone}</div>
                </div>
                <button className="accountDropdownItem" onClick={handleLogoutClick}>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="menuLayout">
        <aside className="menuSide">
          {MENU.map((group) => (
            <div key={group.title} className="menuGroup">
              <div className="menuGroupTitle">{group.title}</div>
              <div className="menuLinks">
                {group.items.map((item) => (
                  <button
                    key={item}
                    className={`menuLink ${active === item ? "active" : ""}`}
                    onClick={() => setActive(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </aside>

        <main className="menuMain">
          <div className="menuCrumb">Menu / {active}</div>
          <div className="menuMobileTabs">
            {MENU.flatMap((group) => group.items).map((item) => (
              <button
                key={item}
                className={`menuMobileTab ${active === item ? "active" : ""}`}
                onClick={() => setActive(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <h1 className="menuH1">{active}</h1>

          <div className="menuCards">
            {items.map((d, index) => (
              <motion.article
                key={d.name}
                className="drinkCard"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, delay: index * 0.035 }}
                whileHover={{ y: -4 }}
              >
                <div className="drinkPhoto">
                  <img src={getMenuImage(active, d)} alt={d.name} loading="lazy" />
                </div>

                <div className="drinkInfo">
                  <div className="drinkTop">
                    <div className="drinkName">{d.name}</div>
                    <div className="drinkPrice">{d.price}</div>
                  </div>
                  <div className="drinkDesc">{d.desc}</div>
                </div>
                <div className="qtyControls">
                  <button
                    onClick={() => updateCart(d.name, -1)}
                    disabled={!cart[d.name]}
                    aria-label={`Remove ${d.name}`}
                  >
                    -
                  </button>
                  <span>{cart[d.name] || 0}</span>
                  <button
                    onClick={() => {
                      if (!user) {
                        setAuthOpen(true);
                        return;
                      }
                      updateCart(d.name, 1);
                    }}
                    aria-label={`Add ${d.name}`}
                  >
                    +
                  </button>
                </div>
              </motion.article>
            ))}

            {items.length === 0 && (
              <div style={{ color: "rgba(20,20,20,0.7)" }}>
                No items yet. We can add them next.
              </div>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {authOpen && <LoginModal onClose={() => setAuthOpen(false)} onLogin={onLogin} />}
        {cartOpen && (
          <CartDrawer
            cart={cart}
            updateCart={updateCart}
            onClose={() => setCartOpen(false)}
            onCheckout={() => {
              if (!user) {
                setCartOpen(false);
                setAuthOpen(true);
                return;
              }
              setCartOpen(false);
              setCheckoutOpen(true);
            }}
          />
        )}
        {checkoutOpen && (
          <CheckoutModal
            cart={cart}
            user={user}
            onClose={() => setCheckoutOpen(false)}
            onPaid={() => {
              setCheckoutOpen(false);
              setOrderPlaced(true);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {orderPlaced && (
          <motion.div
            className="orderToast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={() => setOrderPlaced(false)}
          >
            Payment successful. Order placed successfully.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
