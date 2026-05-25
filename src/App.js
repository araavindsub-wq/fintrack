import { useState, useEffect, useMemo, useCallback } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  CreditCard,
  BarChart3,
  Sun,
  Moon,
  Plus,
  Search,
  Download,
  Trash2,
  X,
  Wallet,
  Landmark,
  ArrowDownToLine,
  ArrowUpToLine,
  AlertCircle,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────
const ACCOUNTS = ["BOfA Credit Card", "Discover Credit Card", "BOfA Checking", "Chase Checking"];
const CREDIT_CARDS = ["BOfA Credit Card", "Discover Credit Card"];
const BANK_ACCOUNTS = ["BOfA Checking", "Chase Checking"];
const CATEGORIES = [
  "Food & Dining","Groceries","Transportation","Gas","Rent","Utilities",
  "Shopping","Entertainment","Travel","Subscriptions","Healthcare",
  "Education","Insurance","Investments","Miscellaneous"
];
const CATEGORY_COLORS = {
  "Food & Dining":"#6366f1","Groceries":"#8b5cf6","Transportation":"#06b6d4",
  "Gas":"#f59e0b","Rent":"#ef4444","Utilities":"#10b981","Shopping":"#f97316",
  "Entertainment":"#ec4899","Travel":"#3b82f6","Subscriptions":"#84cc16",
  "Healthcare":"#14b8a6","Education":"#a855f7","Insurance":"#64748b",
  "Investments":"#22c55e","Miscellaneous":"#94a3b8"
};

// ─── Sample Data ──────────────────────────────────────────────────────────────
const INITIAL_BALANCES = {
  "BOfA Credit Card": 0,
  "Discover Credit Card": 0,
  "BOfA Checking": 0,
  "Chase Checking": 0,
};

const now = new Date();
const y = now.getFullYear();
const m = String(now.getMonth() + 1).padStart(2, "0");
const pm = String(now.getMonth()).padStart(2, "0") || "12";
const py = now.getMonth() === 0 ? y - 1 : y;

function d(day, month = m) { return `${y}-${month}-${String(day).padStart(2,"0")}`; }

const SAMPLE_TRANSACTIONS = [];

const SAMPLE_INCOME = [];

const SAMPLE_TRANSFERS = [];

// ─── Storage ──────────────────────────────────────────────────────────────────
function loadState(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function saveState(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// One-time wipe of previously-stored transactions, income, and CC payments so
// the cleared state takes effect for existing users on next load.
try {
  if (typeof localStorage !== "undefined" && !localStorage.getItem("fin_tx_cleared_v1")) {
    localStorage.removeItem("fin_tx");
    localStorage.setItem("fin_tx_cleared_v1", "1");
  }
  if (typeof localStorage !== "undefined" && !localStorage.getItem("fin_income_cleared_v1")) {
    localStorage.removeItem("fin_income");
    localStorage.setItem("fin_income_cleared_v1", "1");
  }
  if (typeof localStorage !== "undefined" && !localStorage.getItem("fin_transfers_cleared_v1")) {
    localStorage.removeItem("fin_transfers");
    localStorage.setItem("fin_transfers_cleared_v1", "1");
  }
  if (typeof localStorage !== "undefined" && !localStorage.getItem("fin_balances_cleared_v1")) {
    localStorage.removeItem("fin_balances");
    localStorage.setItem("fin_balances_cleared_v1", "1");
  }
} catch {}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n); }
function today() { return new Date().toISOString().split("T")[0]; }
function monthLabel(dateStr) { const d = new Date(dateStr + "T00:00:00"); return d.toLocaleString("default", { month: "short", year: "2-digit" }); }
function thisMonth(dateStr) {
  const d = new Date(dateStr + "T00:00:00"); const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}
let nextId = 100;
function genId() { return ++nextId; }

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(() => loadState("fin_dark", false));
  const [page, setPage] = useState("dashboard");
  const [transactions, setTransactions] = useState(() => loadState("fin_tx", SAMPLE_TRANSACTIONS));
  const [income, setIncome] = useState(() => loadState("fin_income", SAMPLE_INCOME));
  const [transfers, setTransfers] = useState(() => loadState("fin_transfers", SAMPLE_TRANSFERS));
  const [balances, setBalances] = useState(() => loadState("fin_balances", INITIAL_BALANCES));
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterAcct, setFilterAcct] = useState("All");
  const [sideOpen, setSideOpen] = useState(false);

  useEffect(() => { saveState("fin_dark", dark); }, [dark]);
  useEffect(() => { saveState("fin_tx", transactions); }, [transactions]);
  useEffect(() => { saveState("fin_income", income); }, [income]);
  useEffect(() => { saveState("fin_transfers", transfers); }, [transfers]);
  useEffect(() => { saveState("fin_balances", balances); }, [balances]);

  // Compute real balances from seed + all activity
  const computedBalances = useMemo(() => {
    const b = { ...INITIAL_BALANCES };
    income.forEach(i => { b[i.account] = (b[i.account] || 0) + i.amount; });
    transactions.forEach(t => {
      if (CREDIT_CARDS.includes(t.account)) b[t.account] = (b[t.account] || 0) - t.amount;
      else b[t.account] = (b[t.account] || 0) - t.amount;
    });
    transfers.forEach(t => {
      b[t.fromAccount] = (b[t.fromAccount] || 0) - t.amount;
      b[t.toCard] = (b[t.toCard] || 0) + t.amount;
    });
    return b;
  }, [transactions, income, transfers]);

  const monthlySpend = useMemo(() =>
    transactions.filter(t => thisMonth(t.date)).reduce((s, t) => s + t.amount, 0), [transactions]);
  const monthlyIncome = useMemo(() =>
    income.filter(i => thisMonth(i.date)).reduce((s, i) => s + i.amount, 0), [income]);
  const totalCCDebt = useMemo(() =>
    CREDIT_CARDS.reduce((s, c) => s + Math.abs(Math.min(0, computedBalances[c] || 0)), 0), [computedBalances]);
  const totalBankBalance = useMemo(() =>
    BANK_ACCOUNTS.reduce((s, a) => s + Math.max(0, computedBalances[a] || 0), 0), [computedBalances]);

  const addTransaction = useCallback((tx) => {
    setTransactions(p => [{ ...tx, id: genId() }, ...p]);
  }, []);
  const deleteTransaction = useCallback((id) => setTransactions(p => p.filter(t => t.id !== id)), []);
  const deleteManyTransactions = useCallback((ids) => {
    const idSet = new Set(ids);
    setTransactions(p => p.filter(t => !idSet.has(t.id)));
  }, []);

  const addIncome = useCallback((inc) => {
    setIncome(p => [{ ...inc, id: genId() }, ...p]);
  }, []);
  const deleteIncome = useCallback((id) => setIncome(p => p.filter(i => i.id !== id)), []);

  const addTransfer = useCallback((tr) => {
    setTransfers(p => [{ ...tr, id: genId() }, ...p]);
  }, []);
  const deleteTransfer = useCallback((id) => setTransfers(p => p.filter(t => t.id !== id)), []);

  const exportCSV = () => {
    const rows = [["Date","Description","Amount","Account","Category","Notes"]];
    transactions.forEach(t => rows.push([t.date, t.description, t.amount, t.account, t.category, t.notes]));
    const blob = new Blob([rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = "transactions.csv"; a.click();
  };

  const theme = {
    bg: dark ? "#0a0b10" : "#fafafa",
    surface: dark ? "#13151c" : "#ffffff",
    surface2: dark ? "#1c1f2a" : "#f4f4f5",
    border: dark ? "#262932" : "#e4e4e7",
    text: dark ? "#f4f4f5" : "#09090b",
    muted: dark ? "#9ca3af" : "#71717a",
    accent: "#6366f1",
    accentSoft: dark ? "#1e1b4b" : "#eef2ff",
    success: "#10b981",
    danger: "#ef4444",
    warning: "#f59e0b",
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", Icon: ArrowLeftRight },
    { id: "income", label: "Income", Icon: TrendingUp },
    { id: "transfers", label: "CC Payments", Icon: CreditCard },
    { id: "analytics", label: "Analytics", Icon: BarChart3 },
  ];

  const mono = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
  const sans = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

  const S = {
    app: { display: "flex", minHeight: "100vh", background: theme.bg, color: theme.text, fontFamily: sans, fontSize: 14, letterSpacing: "-0.005em" },
    sidebar: { width: 232, background: theme.surface, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", padding: "20px 0", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflow: "auto", zIndex: 10 },
    logo: { padding: "4px 20px 28px", display: "flex", alignItems: "center", gap: 10 },
    logoIcon: {
      width: 34, height: 34, borderRadius: 10,
      background: `linear-gradient(135deg, ${theme.accent} 0%, #8b5cf6 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
      boxShadow: `0 6px 16px -6px ${theme.accent}aa`,
    },
    logoText: { fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: theme.text },
    navItem: (active) => ({
      display: "flex", alignItems: "center", gap: 11, padding: "10px 14px", cursor: "pointer", borderRadius: 10, margin: "2px 10px",
      background: active ? theme.accentSoft : "transparent", color: active ? theme.accent : theme.muted,
      fontWeight: active ? 600 : 500, fontSize: 13.5, transition: "all 0.15s ease", userSelect: "none",
    }),
    main: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
    header: { background: theme.surface, borderBottom: `1px solid ${theme.border}`, padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" },
    content: { flex: 1, padding: 32, overflowY: "auto" },
    card: { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "22px 26px", marginBottom: 16 },
    metricCard: { background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 14, padding: "20px 22px", flex: 1, transition: "transform 0.15s ease, box-shadow 0.15s ease" },
    grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14, marginBottom: 16 },
    grid4: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 16 },
    grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 },
    label: { fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, marginBottom: 6 },
    value: { fontSize: 24, fontWeight: 700, letterSpacing: "-0.025em", fontFamily: sans, fontVariantNumeric: "tabular-nums" },
    mono: { fontFamily: mono, fontVariantNumeric: "tabular-nums" },
    tag: (bg, color) => ({ background: bg, color, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999, display: "inline-block", letterSpacing: "-0.005em" }),
    input: { background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "9px 12px", color: theme.text, fontSize: 13.5, width: "100%", outline: "none", boxSizing: "border-box", fontFamily: sans, transition: "border 0.15s" },
    select: { background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "9px 12px", color: theme.text, fontSize: 13.5, width: "100%", outline: "none", boxSizing: "border-box", appearance: "none", fontFamily: sans },
    btn: (variant = "primary") => ({
      padding: "9px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: sans,
      display: "inline-flex", alignItems: "center", gap: 6, lineHeight: 1.2, letterSpacing: "-0.005em",
      background: variant === "primary" ? theme.accent : variant === "ghost" ? "transparent" : theme.surface2,
      color: variant === "primary" ? "#fff" : variant === "ghost" ? theme.text : theme.text,
      border: variant === "ghost" ? `1px solid ${theme.border}` : "1px solid transparent",
      boxShadow: variant === "primary" ? `0 4px 12px -4px ${theme.accent}88` : "none",
      transition: "transform 0.1s ease, box-shadow 0.15s ease, background 0.15s ease",
    }),
    table: { width: "100%", borderCollapse: "collapse" },
    th: { padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: theme.muted, borderBottom: `1px solid ${theme.border}` },
    td: { padding: "13px 14px", borderBottom: `1px solid ${theme.border}`, fontSize: 13.5, color: theme.text },
  };

  // Pages
  return (
    <div style={S.app}>
      {/* Sidebar */}
      <div style={S.sidebar}>
        <div style={S.logo}>
          <div style={S.logoIcon}><Wallet size={18} strokeWidth={2.4} /></div>
          <div style={S.logoText}>FinTrack</div>
        </div>
        <div style={{ flex: 1 }}>
          {navItems.map(n => {
            const Icon = n.Icon;
            const active = page === n.id;
            return (
              <div key={n.id} style={S.navItem(active)} onClick={() => setPage(n.id)}>
                <Icon size={17} strokeWidth={active ? 2.4 : 2} />
                {n.label}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "0 2px", borderTop: `1px solid ${theme.border}`, marginTop: 8, paddingTop: 8 }}>
          <div onClick={() => setDark(d => !d)} style={{ ...S.navItem(false), cursor: "pointer" }}>
            {dark ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
            {dark ? "Light Mode" : "Dark Mode"}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={S.main}>
        <div style={S.header}>
          <div style={{ fontWeight: 700, fontSize: 17 }}>
            {navItems.find(n => n.id === page)?.label}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {page === "transactions" && (
              <button style={S.btn("ghost")} onClick={exportCSV}>
                <Download size={14} strokeWidth={2.2} /> Export CSV
              </button>
            )}
            <div style={{ fontSize: 12, color: theme.muted }}>
              {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          </div>
        </div>

        <div style={S.content}>
          {page === "dashboard" && <Dashboard theme={theme} S={S} transactions={transactions} income={income} transfers={transfers} computedBalances={computedBalances} monthlySpend={monthlySpend} monthlyIncome={monthlyIncome} totalCCDebt={totalCCDebt} totalBankBalance={totalBankBalance} />}
          {page === "transactions" && <Transactions theme={theme} S={S} transactions={transactions} onAdd={addTransaction} onDelete={deleteTransaction} onDeleteMany={deleteManyTransactions} search={search} setSearch={setSearch} filterCat={filterCat} setFilterCat={setFilterCat} filterAcct={filterAcct} setFilterAcct={setFilterAcct} />}
          {page === "income" && <Income theme={theme} S={S} income={income} onAdd={addIncome} onDelete={deleteIncome} />}
          {page === "transfers" && <Transfers theme={theme} S={S} transfers={transfers} onAdd={addTransfer} onDelete={deleteTransfer} />}
          {page === "analytics" && <Analytics theme={theme} S={S} transactions={transactions} income={income} computedBalances={computedBalances} />}
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function Dashboard({ theme, S, transactions, income, transfers, computedBalances, monthlySpend, monthlyIncome, totalCCDebt, totalBankBalance }) {
  const netCashFlow = monthlyIncome - monthlySpend;
  const recent = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);

  const catSpend = useMemo(() => {
    const m = {};
    transactions.filter(t => thisMonth(t.date)).forEach(t => { m[t.category] = (m[t.category] || 0) + t.amount; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const biggestCat = catSpend[0];

  const pieData = catSpend.slice(0, 6).map(([name, value]) => ({ name, value: +value.toFixed(2) }));

  // Budget targets
  const budgets = { "Food & Dining": 200, Groceries: 250, Rent: 1000, Transportation: 100, Utilities: 80, Entertainment: 100, Subscriptions: 50, Gas: 80 };

  return (
    <div>
      {/* Account Balances */}
      <div style={{ marginBottom: 10, fontSize: 12, fontWeight: 600, color: theme.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Account Balances</div>
      <div style={S.grid4}>
        {Object.entries(computedBalances).map(([name, bal]) => {
          const isCC = CREDIT_CARDS.includes(name);
          const color = isCC ? (bal < 0 ? theme.danger : theme.success) : (bal >= 0 ? theme.success : theme.danger);
          const shortName = name.replace("Credit Card", "CC").replace("Checking", "Chk");
          const Icon = isCC ? CreditCard : Landmark;
          return (
            <div key={name} style={S.metricCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={S.label}>{shortName}</div>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: theme.accentSoft, color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={15} strokeWidth={2.2} />
                </div>
              </div>
              <div style={{ ...S.value, color, fontSize: 22 }}>{fmt(bal)}</div>
              <div style={{ fontSize: 11, color: theme.muted, marginTop: 6, fontWeight: 500 }}>{isCC ? "Credit Card" : "Bank Account"}</div>
            </div>
          );
        })}
      </div>

      {/* KPI Row */}
      <div style={S.grid4}>
        {[
          { label: "Monthly Spend", value: monthlySpend, color: theme.danger, sub: "This month", Icon: ArrowDownToLine, tint: "#ef4444" },
          { label: "Monthly Income", value: monthlyIncome, color: theme.success, sub: "This month", Icon: ArrowUpToLine, tint: "#10b981" },
          { label: "Net Cash Flow", value: netCashFlow, color: netCashFlow >= 0 ? theme.success : theme.danger, sub: "Income − Expenses", Icon: TrendingUp, tint: netCashFlow >= 0 ? "#10b981" : "#ef4444" },
          { label: "CC Debt", value: totalCCDebt, color: totalCCDebt > 0 ? theme.danger : theme.success, sub: "Total owed", Icon: CreditCard, tint: "#f59e0b" },
        ].map(({ label, value, color, sub, Icon, tint }) => (
          <div key={label} style={S.metricCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={S.label}>{label}</div>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: tint + "1a", color: tint, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon size={15} strokeWidth={2.2} />
              </div>
            </div>
            <div style={{ ...S.value, color }}>{fmt(value)}</div>
            <div style={{ fontSize: 11, color: theme.muted, marginTop: 6, fontWeight: 500 }}>{sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Spending by Category Pie */}
        <div style={S.card}>
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Spending by Category</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {pieData.map((entry) => <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#94a3b8"} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
            {pieData.map(e => (
              <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: CATEGORY_COLORS[e.name] || "#94a3b8", display: "inline-block" }} />
                <span style={{ color: theme.muted }}>{e.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Budget vs Actual */}
        <div style={S.card}>
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Budget vs Actual</div>
          {Object.entries(budgets).slice(0, 6).map(([cat, budget]) => {
            const spent = transactions.filter(t => thisMonth(t.date) && t.category === cat).reduce((s, t) => s + t.amount, 0);
            const pct = Math.min((spent / budget) * 100, 100);
            const over = spent > budget;
            return (
              <div key={cat} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{cat}</span>
                  <span style={{ color: over ? theme.danger : theme.muted }}>{fmt(spent)} / {fmt(budget)}</span>
                </div>
                <div style={{ height: 5, background: theme.surface2, borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: over ? theme.danger : theme.accent, borderRadius: 3, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Transactions */}
      <div style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Recent Transactions</div>
        <table style={S.table}>
          <thead>
            <tr>
              {["Date", "Description", "Category", "Account", "Amount"].map(h => <th key={h} style={S.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {recent.map(t => (
              <tr key={t.id}>
                <td style={S.td}>{t.date}</td>
                <td style={S.td}>{t.description}</td>
                <td style={S.td}><span style={S.tag(CATEGORY_COLORS[t.category] + "20", CATEGORY_COLORS[t.category])}>{t.category}</span></td>
                <td style={S.td}><span style={{ color: theme.muted, fontSize: 12 }}>{t.account}</span></td>
                <td style={{ ...S.td, ...S.mono, fontWeight: 600, color: theme.danger }}>−{fmt(t.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Transactions ─────────────────────────────────────────────────────────────
function Transactions({ theme, S, transactions, onAdd, onDelete, onDeleteMany, search, setSearch, filterCat, setFilterCat, filterAcct, setFilterAcct }) {
  const [form, setForm] = useState({ date: today(), description: "", amount: "", account: ACCOUNTS[0], category: CATEGORIES[0], notes: "" });
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const filtered = useMemo(() => transactions.filter(t => {
    const q = search.toLowerCase();
    return (filterCat === "All" || t.category === filterCat)
      && (filterAcct === "All" || t.account === filterAcct)
      && (!q || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
  }).sort((a, b) => b.date.localeCompare(a.date)), [transactions, search, filterCat, filterAcct]);

  // Drop selections that are no longer in the filtered list (e.g. after delete or filter change)
  useEffect(() => {
    setSelected(prev => {
      const visible = new Set(filtered.map(t => t.id));
      let changed = false;
      const next = new Set();
      prev.forEach(id => { if (visible.has(id)) next.add(id); else changed = true; });
      return changed ? next : prev;
    });
  }, [filtered]);

  const allVisibleSelected = filtered.length > 0 && filtered.every(t => selected.has(t.id));
  const someVisibleSelected = !allVisibleSelected && filtered.some(t => selected.has(t.id));

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected(prev => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        filtered.forEach(t => next.delete(t.id));
        return next;
      }
      const next = new Set(prev);
      filtered.forEach(t => next.add(t.id));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const deleteSelected = () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Delete ${selected.size} selected transaction${selected.size === 1 ? "" : "s"}? This cannot be undone.`)) return;
    onDeleteMany(Array.from(selected));
    setSelected(new Set());
  };

  const deleteAllFiltered = () => {
    if (filtered.length === 0) return;
    const isFiltered = search || filterCat !== "All" || filterAcct !== "All";
    const label = isFiltered ? `all ${filtered.length} filtered transaction${filtered.length === 1 ? "" : "s"}` : `ALL ${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`;
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    onDeleteMany(filtered.map(t => t.id));
    setSelected(new Set());
  };

  const submit = () => {
    if (!form.description || !form.amount) return;
    onAdd({ ...form, amount: parseFloat(form.amount) });
    setForm({ date: today(), description: "", amount: "", account: ACCOUNTS[0], category: CATEGORIES[0], notes: "" });
    setShowForm(false);
  };

  return (
    <div>
      {/* Filters Row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", width: 260 }}>
          <Search size={15} strokeWidth={2.2} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: theme.muted, pointerEvents: "none" }} />
          <input style={{ ...S.input, paddingLeft: 34 }} placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select style={{ ...S.select, width: 170 }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="All">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={{ ...S.select, width: 190 }} value={filterAcct} onChange={e => setFilterAcct(e.target.value)}>
          <option value="All">All Accounts</option>
          {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            style={{ ...S.btn("ghost"), color: theme.danger, borderColor: theme.danger + "55", opacity: filtered.length === 0 ? 0.4 : 1 }}
            onClick={deleteAllFiltered}
            disabled={filtered.length === 0}
            title="Delete all transactions currently shown"
          >
            <Trash2 size={14} strokeWidth={2.2} /> Delete All
          </button>
          <button style={S.btn("primary")} onClick={() => setShowForm(v => !v)}>
            <Plus size={14} strokeWidth={2.6} /> Add Transaction
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>New Transaction</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <div><div style={S.label}>Date</div><input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><div style={S.label}>Description</div><input style={S.input} placeholder="e.g. Chipotle" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><div style={S.label}>Amount ($)</div><input style={S.input} type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><div style={S.label}>Payment Source</div>
              <select style={S.select} value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))}>
                {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div><div style={S.label}>Category</div>
              <select style={S.select} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><div style={S.label}>Notes (optional)</div><input style={S.input} placeholder="Optional notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button style={S.btn("primary")} onClick={submit}>Save Transaction</button>
            <button style={S.btn("ghost")} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Bulk action bar — shown only when something is selected */}
      {selected.size > 0 && (
        <div style={{ ...S.card, marginBottom: 16, display: "flex", alignItems: "center", gap: 12, background: theme.accentSoft, border: `1px solid ${theme.accent}40`, padding: "14px 20px" }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: theme.text }}>
            {selected.size} selected
          </div>
          <button style={{ ...S.btn("primary"), background: theme.danger, boxShadow: `0 4px 12px -4px ${theme.danger}88` }} onClick={deleteSelected}>
            <Trash2 size={14} strokeWidth={2.2} /> Delete Selected
          </button>
          <button style={S.btn("ghost")} onClick={clearSelection}>
            <X size={14} strokeWidth={2.4} /> Clear
          </button>
        </div>
      )}

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{filtered.length} Transactions</div>
          <div style={{ fontSize: 13, color: theme.muted }}>Total: <b style={{ color: theme.danger }}>{fmt(filtered.reduce((s, t) => s + t.amount, 0))}</b></div>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 36 }}>
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={el => { if (el) el.indeterminate = someVisibleSelected; }}
                  onChange={toggleAllVisible}
                  disabled={filtered.length === 0}
                  title={allVisibleSelected ? "Deselect all" : "Select all"}
                  style={{ cursor: filtered.length === 0 ? "default" : "pointer" }}
                />
              </th>
              {["Date", "Description", "Category", "Account", "Amount", "Notes", ""].map(h => <th key={h} style={S.th}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const isSel = selected.has(t.id);
              return (
                <tr key={t.id} style={{ transition: "background 0.1s", background: isSel ? theme.accentSoft : "transparent" }}>
                  <td style={S.td}>
                    <input type="checkbox" checked={isSel} onChange={() => toggleOne(t.id)} style={{ cursor: "pointer" }} />
                  </td>
                  <td style={S.td}>{t.date}</td>
                  <td style={{ ...S.td, fontWeight: 500 }}>{t.description}</td>
                  <td style={S.td}><span style={S.tag(CATEGORY_COLORS[t.category] + "20", CATEGORY_COLORS[t.category])}>{t.category}</span></td>
                  <td style={{ ...S.td, color: theme.muted, fontSize: 12 }}>{t.account}</td>
                  <td style={{ ...S.td, ...S.mono, fontWeight: 600, color: theme.danger }}>−{fmt(t.amount)}</td>
                  <td style={{ ...S.td, color: theme.muted, fontSize: 12 }}>{t.notes || "—"}</td>
                  <td style={S.td}>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${t.description}"?`)) onDelete(t.id);
                      }}
                      style={{ background: "transparent", border: "none", color: theme.muted, cursor: "pointer", padding: 6, borderRadius: 6, display: "inline-flex", alignItems: "center", transition: "color 0.15s, background 0.15s" }}
                      title="Delete transaction"
                      onMouseEnter={(e) => { e.currentTarget.style.color = theme.danger; e.currentTarget.style.background = theme.danger + "1a"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = theme.muted; e.currentTarget.style.background = "transparent"; }}
                    ><Trash2 size={15} strokeWidth={2} /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: 32, color: theme.muted }}>No transactions found</div>}
      </div>
    </div>
  );
}

// ─── Income ───────────────────────────────────────────────────────────────────
function Income({ theme, S, income, onAdd, onDelete }) {
  const [form, setForm] = useState({ date: today(), amount: "", account: BANK_ACCOUNTS[0], source: "" });
  const [showForm, setShowForm] = useState(false);

  const submit = () => {
    if (!form.source || !form.amount) return;
    onAdd({ ...form, amount: parseFloat(form.amount) });
    setForm({ date: today(), amount: "", account: BANK_ACCOUNTS[0], source: "" });
    setShowForm(false);
  };

  const sorted = [...income].sort((a, b) => b.date.localeCompare(a.date));
  const total = income.reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={S.metricCard}>
            <div style={S.label}>Total Income</div>
            <div style={{ ...S.value, color: theme.success }}>{fmt(total)}</div>
          </div>
          <div style={S.metricCard}>
            <div style={S.label}>This Month</div>
            <div style={{ ...S.value, color: theme.success }}>{fmt(income.filter(i => thisMonth(i.date)).reduce((s, i) => s + i.amount, 0))}</div>
          </div>
        </div>
        <button style={S.btn("primary")} onClick={() => setShowForm(v => !v)}>
          <Plus size={14} strokeWidth={2.6} /> Add Income
        </button>
      </div>

      {showForm && (
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Record Income</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <div><div style={S.label}>Date</div><input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><div style={S.label}>Amount ($)</div><input style={S.input} type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><div style={S.label}>Deposit Account</div>
              <select style={S.select} value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))}>
                {BANK_ACCOUNTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div><div style={S.label}>Source / Description</div><input style={S.input} placeholder="e.g. Graduate Stipend" value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button style={S.btn("primary")} onClick={submit}>Save Income</button>
            <button style={S.btn("ghost")} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>{income.length} Income Records</div>
        <table style={S.table}>
          <thead>
            <tr>{["Date", "Source / Description", "Account", "Amount", ""].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {sorted.map(i => (
              <tr key={i.id}>
                <td style={S.td}>{i.date}</td>
                <td style={{ ...S.td, fontWeight: 500 }}>{i.source}</td>
                <td style={{ ...S.td, color: theme.muted, fontSize: 12 }}>{i.account}</td>
                <td style={{ ...S.td, ...S.mono, fontWeight: 600, color: theme.success }}>+{fmt(i.amount)}</td>
                <td style={S.td}>
                  <button
                    onClick={() => { if (window.confirm(`Delete "${i.source}"?`)) onDelete(i.id); }}
                    style={{ background: "transparent", border: "none", color: theme.muted, cursor: "pointer", padding: 6, borderRadius: 6, display: "inline-flex", alignItems: "center" }}
                    title="Delete income"
                    onMouseEnter={(e) => { e.currentTarget.style.color = theme.danger; e.currentTarget.style.background = theme.danger + "1a"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = theme.muted; e.currentTarget.style.background = "transparent"; }}
                  ><Trash2 size={15} strokeWidth={2} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {income.length === 0 && <div style={{ textAlign: "center", padding: 32, color: theme.muted }}>No income recorded</div>}
      </div>
    </div>
  );
}

// ─── Transfers / CC Payments ──────────────────────────────────────────────────
function Transfers({ theme, S, transfers, onAdd, onDelete }) {
  const [form, setForm] = useState({ date: today(), amount: "", fromAccount: BANK_ACCOUNTS[0], toCard: CREDIT_CARDS[0], notes: "" });
  const [showForm, setShowForm] = useState(false);

  const submit = () => {
    if (!form.amount) return;
    onAdd({ ...form, amount: parseFloat(form.amount) });
    setForm({ date: today(), amount: "", fromAccount: BANK_ACCOUNTS[0], toCard: CREDIT_CARDS[0], notes: "" });
    setShowForm(false);
  };

  const sorted = [...transfers].sort((a, b) => b.date.localeCompare(a.date));
  const total = transfers.reduce((s, t) => s + t.amount, 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={S.metricCard}>
          <div style={S.label}>Total CC Payments</div>
          <div style={{ ...S.value, color: theme.accent }}>{fmt(total)}</div>
        </div>
        <button style={S.btn("primary")} onClick={() => setShowForm(v => !v)}>
          <Plus size={14} strokeWidth={2.6} /> Record Payment
        </button>
      </div>

      <div style={{ ...S.card, background: theme.accentSoft, border: `1px solid ${theme.accent}30`, marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <AlertCircle size={18} strokeWidth={2.2} style={{ color: theme.accent, flexShrink: 0 }} />
        <div style={{ fontSize: 13, color: theme.muted, lineHeight: 1.55 }}>
          Credit card payments are transfers — they reduce your bank balance and pay down CC debt without counting as expenses.
        </div>
      </div>

      {showForm && (
        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Record Credit Card Payment</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
            <div><div style={S.label}>Date</div><input style={S.input} type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div><div style={S.label}>Amount ($)</div><input style={S.input} type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
            <div><div style={S.label}>Pay From (Bank)</div>
              <select style={S.select} value={form.fromAccount} onChange={e => setForm(f => ({ ...f, fromAccount: e.target.value }))}>
                {BANK_ACCOUNTS.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div><div style={S.label}>Pay To (Credit Card)</div>
              <select style={S.select} value={form.toCard} onChange={e => setForm(f => ({ ...f, toCard: e.target.value }))}>
                {CREDIT_CARDS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "span 2" }}><div style={S.label}>Notes</div><input style={S.input} placeholder="Optional" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button style={S.btn("primary")} onClick={submit}>Save Payment</button>
            <button style={S.btn("ghost")} onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>{transfers.length} CC Payments</div>
        <table style={S.table}>
          <thead>
            <tr>{["Date", "From Account", "To Card", "Amount", "Notes", ""].map(h => <th key={h} style={S.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {sorted.map(t => (
              <tr key={t.id}>
                <td style={S.td}>{t.date}</td>
                <td style={{ ...S.td, color: theme.muted, fontSize: 12 }}>{t.fromAccount}</td>
                <td style={{ ...S.td, color: theme.muted, fontSize: 12 }}>{t.toCard}</td>
                <td style={{ ...S.td, ...S.mono, fontWeight: 600, color: theme.accent }}>{fmt(t.amount)}</td>
                <td style={{ ...S.td, color: theme.muted, fontSize: 12 }}>{t.notes || "—"}</td>
                <td style={S.td}>
                  <button
                    onClick={() => { if (window.confirm("Delete this payment?")) onDelete(t.id); }}
                    style={{ background: "transparent", border: "none", color: theme.muted, cursor: "pointer", padding: 6, borderRadius: 6, display: "inline-flex", alignItems: "center" }}
                    title="Delete payment"
                    onMouseEnter={(e) => { e.currentTarget.style.color = theme.danger; e.currentTarget.style.background = theme.danger + "1a"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = theme.muted; e.currentTarget.style.background = "transparent"; }}
                  ><Trash2 size={15} strokeWidth={2} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {transfers.length === 0 && <div style={{ textAlign: "center", padding: 32, color: theme.muted }}>No payments recorded</div>}
      </div>
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────
function Analytics({ theme, S, transactions, income, computedBalances }) {
  // Monthly spend by month (last 6 months)
  const monthlyData = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      const key = t.date.slice(0, 7);
      map[key] = (map[key] || 0) + t.amount;
    });
    income.forEach(i => {
      const key = i.date.slice(0, 7);
      if (!map[key]) map[key] = 0;
    });
    const incMap = {};
    income.forEach(i => { const k = i.date.slice(0, 7); incMap[k] = (incMap[k] || 0) + i.amount; });
    return Object.keys(map).sort().slice(-6).map(k => ({
      month: new Date(k + "-01").toLocaleString("default", { month: "short" }),
      Expenses: +(map[k] || 0).toFixed(2),
      Income: +(incMap[k] || 0).toFixed(2),
    }));
  }, [transactions, income]);

  // Category breakdown (all time)
  const catData = useMemo(() => {
    const m = {};
    transactions.forEach(t => { m[t.category] = (m[t.category] || 0) + t.amount; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  }, [transactions]);

  // Account usage
  const acctData = useMemo(() => {
    const m = {};
    transactions.forEach(t => { m[t.account] = (m[t.account] || 0) + t.amount; });
    return Object.entries(m).map(([name, value]) => ({ name: name.replace("Credit Card", "CC").replace("Checking", "Chk"), value: +value.toFixed(2) }));
  }, [transactions]);

  // CC debt
  const ccDebt = CREDIT_CARDS.map(c => ({
    name: c.replace("Credit Card", "CC"),
    debt: +Math.abs(Math.min(0, computedBalances[c] || 0)).toFixed(2),
  }));

  const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#8b5cf6"];

  return (
    <div>
      {/* Income vs Expenses */}
      <div style={S.card}>
        <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Income vs Expenses — Last 6 Months</div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: theme.muted }} />
            <YAxis tick={{ fontSize: 11, fill: theme.muted }} tickFormatter={v => `$${v}`} />
            <Tooltip formatter={v => fmt(v)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="Income" stroke="#10b981" fill="url(#colorInc)" strokeWidth={2} />
            <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fill="url(#colorExp)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Category breakdown */}
        <div style={S.card}>
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Spending by Category</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={catData.slice(0, 8)} layout="vertical" margin={{ left: 80, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: theme.muted }} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: theme.muted }} width={80} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {catData.slice(0, 8).map((entry) => <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || "#94a3b8"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Account usage */}
        <div style={S.card}>
          <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Spending by Account</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={acctData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme.border} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: theme.muted }} angle={-20} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: theme.muted }} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={v => fmt(v)} />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 10, fontSize: 13 }}>Credit Card Debt</div>
            {ccDebt.map(({ name, debt }) => (
              <div key={name} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>{name}</span>
                  <span style={{ color: debt > 0 ? theme.danger : theme.success, fontWeight: 600 }}>{fmt(debt)}</span>
                </div>
                <div style={{ height: 5, background: theme.surface2, borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${Math.min((debt / 2000) * 100, 100)}%`, background: theme.danger, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
