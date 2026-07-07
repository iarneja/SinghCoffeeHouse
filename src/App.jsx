import { useEffect, useMemo, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Menu from "./pages/Menu.jsx";
import Admin from "./pages/Admin.jsx";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  const [user, setUser] = useState(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem("sc-user");
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("sc-token");
  });
  const [cart, setCart] = useState({});

  useEffect(() => {
    if (user) {
      window.localStorage.setItem("sc-user", JSON.stringify(user));
    } else {
      window.localStorage.removeItem("sc-user");
    }
  }, [user]);

  useEffect(() => {
    if (token) {
      window.localStorage.setItem("sc-token", token);
    } else {
      window.localStorage.removeItem("sc-token");
    }
  }, [token]);

  const cartCount = useMemo(() => Object.values(cart).reduce((sum, qty) => sum + qty, 0), [cart]);

  const updateCart = (name, delta) => {
    setCart((current) => {
      const nextQty = Math.max((current[name] || 0) + delta, 0);
      const next = { ...current };

      if (nextQty === 0) {
        delete next[name];
      } else {
        next[name] = nextQty;
      }

      return next;
    });
  };

  const handleLogin = (loginResult) => {
    const nextUser = loginResult?.user || loginResult;
    setUser(nextUser);
    if (loginResult?.token) {
      setToken(loginResult.token);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home user={user} onLogin={handleLogin} cartCount={cartCount} />} />
        <Route
          path="/menu"
          element={
            <Menu
              user={user}
              onLogin={handleLogin}
              onLogout={handleLogout}
              cart={cart}
              cartCount={cartCount}
              updateCart={updateCart}
            />
          }
        />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </>
  );
}