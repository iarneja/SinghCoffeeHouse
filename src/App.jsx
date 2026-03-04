import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
const leftMenu = [
  { name: "Espresso", desc: "Rich and bold shot of coffee", price: "$3.30" },
  { name: "Latte", desc: "Espresso with steamed milk", price: "$4.20" },
  { name: "Mocha", desc: "Chocolate + espresso + steamed milk", price: "$5.40" },
  { name: "Flat White", desc: "Espresso with microfoam milk", price: "$4.25" },
];

const rightMenu = [
  { name: "Cappuccino", desc: "Espresso with steamed milk and foam", price: "$4.50" },
  { name: "Americano", desc: "Espresso with hot water", price: "$3.50" },
  { name: "Macchiato", desc: "Espresso with a dollop of foam", price: "$3.75" },
  { name: "Iced Coffee", desc: "Chilled coffee over ice", price: "$3.75" },
];

function MenuRow({ name, desc, price }) {
  return (
    <div className="menu-row">
      <div className="menu-row-left">
        <div className="menu-name">{name}</div>
        <div className="menu-desc">{desc}</div>
      </div>

      <div className="menu-dots" />

      <div className="menu-price">{price}</div>
    </div>
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 20 });
  const heroY = useTransform(scrollYProgress, [0, 0.35], [0, 60]);

  return (
    <>
      <div className="grain" />
            <motion.div className="progress" style={{ scaleX }} />

      {/* Top Nav */}
      <header className="topnav">
        <div className="container topnav-inner">
          <div className="topnav-brand">
            <div className="brand-name">Singh Coffee House</div>
          </div>

          <button className="burger" aria-label="Open menu" onClick={() => setOpen(true)}>
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      {/* Fullscreen Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="menu-panel"
              initial={{ scale: 0.98, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <button className="close" aria-label="Close menu" onClick={() => setOpen(false)}>
                ✕
              </button>

              <div className="menu-center">
                {[
                  { label: "Home", id: "top" },
                  { label: "Menu", id: "menu" },
                  { label: "Hours", id: "hours" },
                  { label: "Signatures", id: "signatures" },
                  { label: "Contact", id: "contact" },
                ].map((item) => (
                  <motion.a
                    key={item.label}
                    href={"#" + item.id}
                    className="menu-link"
                    onClick={(e) => {
                      e.preventDefault();
                      setOpen(false);

                      if (item.id === "top") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      } else {
                        document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: 0.05 }}
                  >
                    {item.label}
                  </motion.a>
                ))}
              </div>

              <div className="menu-corner">EST. 2026 • Tempe</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <main className="hero" id="top">
        <motion.div className="hero-bg" style={{ y: heroY }} />
        <div className="container hero-inner">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="hero-content"
          >
            <div className="logo-lockup">
              <div className="badge">EST. 2026</div>
              <div className="logo-title">Singh Coffee House</div>
            </div>

            <h1 className="hero-title">
              Coffee <span className="gold">&</span> Joy
            </h1>

            <p className="hero-sub">
              A cozy, modern coffee spot with bold brews and warm vibes. Crafted with care, served
              with soul.
            </p>

            <div className="hero-cta">
              <button
                className="btn"
                onClick={() => document.getElementById("menu")?.scrollIntoView({ behavior: "smooth" })}
              >
                Explore Menu
              </button>
              <button className="btn btn-ghost">Visit Us</button>
            </div>

            <div className="hero-mini">
              <div className="mini-card">
                <div className="mini-top">Opening Hours</div>
                <div className="mini-big">10AM–8PM</div>
                <div className="mini-sub">Mon–Sat • Closed Sunday</div>
              </div>

              <div className="mini-card">
                <div className="mini-top">Signature</div>
                <div className="mini-big">Masala Chai Latte</div>
                <div className="mini-sub">Spiced. Smooth. Addictive.</div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Menu Section */}
      <section id="menu" className="menu-section">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="menu-head"
          >
            <h2 className="menu-title">Our Menu</h2>
            <p className="menu-sub">
              Espresso classics, cold brews, and Singh-style signatures. Simple, clean, and made fresh.
            </p>
          </motion.div>

          <div className="menu-grid">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="menu-col"
            >
              {leftMenu.map((i) => (
                <MenuRow key={i.name} {...i} />
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.06 }}
              className="menu-col"
            >
              {rightMenu.map((i) => (
                <MenuRow key={i.name} {...i} />
              ))}
            </motion.div>
          </div>

          <div className="menu-cta">
            <button className="btn">View Full Menu</button>
          </div>
        </div>
      </section>
            {/* Opening Hours Split */}
      <section className="hours-section" id="hours">
        <div className="hours-grid">
          <div className="hours-image" />

          <motion.div
            className="hours-panel"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="hours-kicker">Opening Hours</div>

            <div className="hours-time">
              <div className="hours-days">Mon thru Sat</div>
              <div className="hours-big">10AM–8PM</div>
            </div>

            <div className="hours-closed">Closed Sunday</div>

            <div className="hours-divider" />

            <p className="hours-note">
              Walk in for a quick espresso, stay for the cozy vibe. Best time for a calm seat:
              weekdays before 2pm.
            </p>

            <div className="hours-actions">
              <button className="btn">Get Directions</button>
              <button className="btn btn-ghost">Call Us</button>
            </div>
          </motion.div>
        </div>
      </section>
            {/* Signature Drinks */}
      <section className="sig-section" id="signatures">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="sig-head"
          >
            <h2 className="sig-title">Signature Drinks</h2>
            <p className="sig-sub">
              Crafted favorites with a Singh twist. Clean flavors, premium feel.
            </p>
          </motion.div>

          <div className="sig-grid">
            {[
              {
                title: "Masala Chai Latte",
                desc: "Warm spices, silky milk, cozy finish.",
                meta: "Best Seller",
              },
              {
                title: "Saffron Cold Brew",
                desc: "Smooth cold brew with a subtle saffron note.",
                meta: "Limited",
              },
              {
                title: "Cardamom Cappuccino",
                desc: "Classic cappuccino with a light cardamom lift.",
                meta: "Signature",
              },
            ].map((item) => (
              <motion.article
                key={item.title}
                className="sig-card"
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <div className="sig-meta">{item.meta}</div>
                <div className="sig-card-title">{item.title}</div>
                <p className="sig-card-desc">{item.desc}</p>
                <div className="sig-line" />
                <a className="sig-link" href="#menu" onClick={(e) => e.preventDefault()}>
                  View on menu →
                </a>
              </motion.article>
            ))}
          </div>
        </div>
      </section>
            {/* Contact / Footer */}
      <section className="contact-section" id="contact">
        <div className="container contact-grid">
          
          <div className="contact-left">
            <h2 className="contact-title">Singh Coffee House</h2>

            <p className="contact-text">
              A cozy neighborhood coffee spot built for great conversations,
              smooth espresso, and warm vibes.
            </p>

            <div className="contact-info">
              <div>📍 Tempe, Arizona</div>
              <div>📞 (480) 555-0182</div>
              <div>✉ hello@singhcoffee.com</div>
            </div>

            <div className="socials">
              <a href="#">Instagram</a>
              <a href="#">Twitter</a>
              <a href="#">Google Maps</a>
            </div>
          </div>

          <div className="contact-form">
            <h3 className="form-title">Send a message</h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Message sent! (demo)");
              }}
            >
              <input className="input" placeholder="Your Name" required />
              <input className="input" type="email" placeholder="Email" required />
              <textarea
                className="input"
                rows="4"
                placeholder="Message"
                required
              />

              <button className="btn">Send Message</button>
            </form>
          </div>

        </div>

        <div className="footer-bottom">
          © {new Date().getFullYear()} Singh Coffee House
        </div>
      </section>
            <AnimatePresence>
        {showTop && (
          <motion.button
            className="to-top"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
          >
            ↑
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}