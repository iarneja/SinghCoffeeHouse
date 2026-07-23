import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

const orderStatusOptions = ["pending", "preparing", "ready", "completed"];

const formatMoney = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? `$${amount.toFixed(2)}` : "$0.00";
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function Admin() {
  const [password, setPassword] = useState("");
  const [adminToken, setAdminToken] = useState(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("sc-admin-token");
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [statusUpdates, setStatusUpdates] = useState({});
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (adminToken) {
      window.localStorage.setItem("sc-admin-token", adminToken);
    } else {
      window.localStorage.removeItem("sc-admin-token");
    }
  }, [adminToken]);

  useEffect(() => {
    if (!adminToken) return;
    loadAdminData();
  }, [adminToken]);

  const handleLogout = () => {
    setAdminToken(null);
    setStats(null);
    setOrders([]);
    setStatusUpdates({});
    setError("");
    setPassword("");
  };

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${adminToken}`,
    "Content-Type": "application/json",
  });

  const loadAdminData = async () => {
    setFetching(true);
    setError("");

    try {
      const [statsResp, ordersResp] = await Promise.all([
        apiRequest("/api/admin/stats", { headers: getAuthHeaders() }),
        apiRequest("/api/admin/orders", { headers: getAuthHeaders() }),
      ]);

      if (!statsResp.ok || !ordersResp.ok) {
        const errorBody = await statsResp.json().catch(() => null);
        throw new Error(errorBody?.error || "Could not load admin data.");
      }

      const statsData = await statsResp.json();
      const ordersData = await ordersResp.json();
      setStats(statsData);
      setOrders(ordersData);
    } catch (err) {
      setError(err.message || "Unable to load admin dashboard.");
      if (err.message?.includes("Unauthorized")) {
        handleLogout();
      }
    } finally {
      setFetching(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiRequest("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Invalid admin password.");
      }

      setAdminToken(data.adminToken);
      setPassword("");
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (orderId, newStatus) => {
    setStatusUpdates((current) => ({ ...current, [orderId]: newStatus }));
  };

  const updateOrderStatus = async (orderId) => {
    const newStatus = statusUpdates[orderId];
    if (!newStatus) return;

    setError("");
    setFetching(true);

    try {
      const response = await apiRequest(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to update order status.");
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? { ...order, order_status: newStatus } : order,
        ),
      );
      setStatusUpdates((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });
    } catch (err) {
      setError(err.message || "Order update failed.");
      if (err.message?.includes("Unauthorized")) {
        handleLogout();
      }
    } finally {
      setFetching(false);
    }
  };

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <main className="admin-page">
      <div className="container admin-panel">
        <div className="admin-card admin-header-card">
          <div className="admin-headline">
            <h1>Admin Dashboard</h1>
            {adminToken && (
              <button className="btn" type="button" onClick={handleLogout}>
                Logout
              </button>
            )}
          </div>
          <p>Manage orders, track revenue, and update order status from a secure admin panel.</p>
        </div>

        {!adminToken ? (
          <div className="admin-card admin-login-card">
            <h2 className="admin-card-title">Admin login</h2>
            <form className="admin-login-form" onSubmit={handleLogin}>
              <label>
                <span>Password</span>
                <input
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  placeholder="Enter admin password"
                />
              </label>
              <button className="btn" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>
              {error && <div className="admin-error">{error}</div>}
            </form>
          </div>
        ) : (
          <div className="admin-card admin-dashboard-card">
            <h2 className="admin-card-title">Dashboard</h2>
            {error && <div className="admin-error">{error}</div>}
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-label">Today's orders</div>
                <div className="admin-stat-value">{stats ? stats.todayOrderCount : "—"}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">Today's revenue</div>
                <div className="admin-stat-value">{stats ? formatMoney(stats.todayRevenue) : "—"}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">All-time orders</div>
                <div className="admin-stat-value">{stats ? stats.allTimeOrderCount : "—"}</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-label">All-time revenue</div>
                <div className="admin-stat-value">{stats ? formatMoney(stats.allTimeRevenue) : "—"}</div>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.length === 0 && (
                    <tr>
                      <td colSpan="9" className="admin-empty-row">
                        {fetching ? "Loading orders..." : "No orders found."}
                      </td>
                    </tr>
                  )}
                  {sortedOrders.map((order) => {
                    const selectedStatus = statusUpdates[order.id] || order.order_status;
                    const itemsSummary = order.items
                      .map((item) => `${item.name} x${item.quantity}`)
                      .join(", ");

                    return (
                      <tr key={order.id}>
                        <td>{order.id}</td>
                        <td>{order.customerName || "Guest"}</td>
                        <td>{order.customerEmail || order.phone || "—"}</td>
                        <td>{itemsSummary || "—"}</td>
                        <td>{formatMoney(order.total)}</td>
                        <td>{order.payment_status || "—"}</td>
                        <td>{order.order_status || "—"}</td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>
                          <div className="admin-row-actions">
                            <select
                              className="admin-status-select"
                              value={selectedStatus}
                              onChange={(event) => handleStatusChange(order.id, event.target.value)}
                            >
                              {orderStatusOptions.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                            <button
                              className="btn btn-ghost"
                              type="button"
                              disabled={fetching || selectedStatus === order.order_status}
                              onClick={() => updateOrderStatus(order.id)}
                            >
                              Update
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
