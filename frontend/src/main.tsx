import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Aperture,
  LayoutDashboard,
  Activity,
  MessagesSquare,
  ListFilter,
  ShieldCheck,
  BookOpen,
  ArrowUpRight,
  ArrowLeft,
  Download,
  RefreshCw,
  Search,
  ChevronRight,
  Info,
  CheckCircle2,
  Menu,
  X,
} from "lucide-react";
import "./style.css";
type Row = Record<string, any>;
const pct = (n: number | null) =>
  n == null ? "—" : `${(n * 100).toFixed(1)}%`;
const num = (n: number) => new Intl.NumberFormat("en-US").format(n || 0);
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: n > 999999 ? "compact" : "standard",
  }).format(n || 0);
const day = (s: string) => s?.slice(0, 10) || "Unavailable";
async function api(path: string, options?: RequestInit) {
  const r = await fetch("/api" + path, options);
  if (!r.ok) throw new Error((await r.json()).detail || "Unable to load data");
  return r.json();
}
const pages = [
  ["overview", "Portfolio overview", LayoutDashboard],
  ["engagement", "Engagement analysis", Activity],
  ["demand", "Demand & content", MessagesSquare],
  ["queue", "Account review", ListFilter],
  ["validation", "Validation & quality", ShieldCheck],
  ["story", "Methodology & story", BookOpen],
] as const;
function Metric({
  label,
  value,
  sub,
  definition,
}: {
  label: string;
  value: string;
  sub: string;
  definition: string;
}) {
  return (
    <div className="metric">
      <div className="metric-label">
        {label}
        <span tabIndex={0} className="tip" aria-label={definition}>
          <Info size={13} />
          <span role="tooltip">{definition}</span>
        </span>
      </div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}
function Empty({
  text = "No accounts match these filters.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <Search size={25} />
      <h3>Nothing to show here</h3>
      <p>{text}</p>
    </div>
  );
}
function App() {
  const [boot, setBoot] = useState<Row | null>(null),
    [page, setPage] = useState("overview"),
    [cohort, setCohort] = useState(""),
    [industry, setIndustry] = useState("All"),
    [size, setSize] = useState("All"),
    [k, setK] = useState(50),
    [data, setData] = useState<Row | null>(null),
    [validation, setValidation] = useState<Row | null>(null),
    [queue, setQueue] = useState<Row | null>(null),
    [detail, setDetail] = useState<Row | null>(null),
    [accountId, setAccountId] = useState(""),
    [search, setSearch] = useState(""),
    [flag, setFlag] = useState("All"),
    [status, setStatus] = useState("All"),
    [sort, setSort] = useState("priority"),
    [pn, setPn] = useState(1),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [refresh, setRefresh] = useState(0),
    [mobile, setMobile] = useState(false),
    [topic, setTopic] = useState("All"),
    [dimension, setDimension] = useState("company_size");
  const params = new URLSearchParams({ cohort, industry, size, k: String(k) });
  const queueParams = new URLSearchParams({
    ...Object.fromEntries(params),
    search,
    flag,
    status,
    sort,
    page: String(pn),
  });
  useEffect(() => {
    api("/bootstrap")
      .then((b) => {
        setBoot(b);
        setCohort((c) => c || b.cohorts.at(-1));
      })
      .catch((e) => {
        setError(e.message);
        setBusy(false);
      });
  }, [refresh]);
  useEffect(() => {
    if (!cohort) return;
    let live = true;
    setBusy(true);
    setError("");
    Promise.all([api("/portfolio?" + params), api("/validation")])
      .then(([d, v]) => {
        if (live) {
          setData(d);
          setValidation(v);
        }
      })
      .catch((e) => live && setError(e.message))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [cohort, industry, size, k, refresh]);
  useEffect(() => {
    if (!cohort) return;
    let live = true;
    setQueue(null);
    api("/accounts?" + queueParams)
      .then((q) => live && setQueue(q))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [cohort, industry, size, k, search, flag, status, sort, pn, refresh]);
  useEffect(() => {
    setPn(1);
  }, [cohort, industry, size, k, search, flag, status, sort]);
  useEffect(() => {
    if (!accountId) return;
    let live = true;
    setBusy(true);
    setDetail(null);
    api("/accounts/" + accountId)
      .then((d) => live && setDetail(d))
      .catch((e) => live && setError(e.message))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
    };
  }, [accountId, refresh]);
  function navigate(p: string) {
    setPage(p);
    setAccountId("");
    setMobile(false);
    window.scrollTo(0, 0);
  }
  function openAccount(id: string) {
    setAccountId(id);
    setPage("detail");
    window.scrollTo(0, 0);
  }
  function reset() {
    setIndustry("All");
    setSize("All");
    setSearch("");
    setFlag("All");
    setStatus("All");
    setSort("priority");
    setK(50);
    setTopic("All");
  }
  async function review(value: string) {
    try {
      await api("/accounts/" + accountId + "/review", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      setDetail((d) => (d ? { ...d, review: { status: value } } : d));
      setRefresh((x) => x + 1);
    } catch (e) {
      setError(String(e));
    }
  }
  const title =
    page === "detail"
      ? "Account evidence"
      : pages.find((p) => p[0] === page)?.[1];
  const table = (rows: Row[]) => (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Review signals</th>
            <th>Active seats</th>
            <th>Annual value</th>
            <th>Next investigation</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.account_id}>
              <td>
                <button
                  className="account-link"
                  onClick={() => openAccount(r.account_id)}
                >
                  {r.fictional_account_name}
                </button>
                <small>
                  {r.industry} · {r.company_size}
                </small>
              </td>
              <td>
                <span className={"badge " + (r.flags ? "amber" : "neutral")}>
                  {r.flags} {r.flags === 1 ? "flag" : "flags"}
                </span>
                <small>
                  {r.support_flag
                    ? "Open severe ticket"
                    : r.decline
                      ? "Activity decline"
                      : r.low_seats
                        ? "Low seat use"
                        : "Routine review"}
                </small>
              </td>
              <td>
                {pct(r.active_seat_rate)}
                <small>
                  {r.active_users} / {r.eligible_seats} seats
                </small>
              </td>
              <td>{money(r.annual_value)}</td>
              <td>
                {r.support_flag
                  ? "Support resolution"
                  : r.low_seats
                    ? "Onboarding & access"
                    : r.decline
                      ? "Engagement context"
                      : "Confirm priorities"}
                <small>{r.review_status || "Not reviewed"}</small>
              </td>
              <td>
                <button
                  className="icon-button"
                  aria-label={"Open " + r.fictional_account_name}
                  onClick={() => openAccount(r.account_id)}
                >
                  <ArrowUpRight size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <div className="app">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("overview");
          }}
        >
          <Aperture size={31} />
          <span>
            ClientLens<small>CLIENT INTELLIGENCE</small>
          </span>
        </a>
        <div className="workspace">DEMONSTRATION WORKSPACE</div>
        <nav aria-label="Main navigation">
          {pages.map(([id, name, Icon]) => (
            <button
              key={id}
              className={page === id ? "nav active" : "nav"}
              onClick={() => navigate(id)}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={18} />
              {name}
              {id === "queue" && data && (
                <span className="nav-count">{data.review_count}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="status-dot" /> Local analytics workspace
          <p>
            Evidence for the next
            <br />
            client conversation.
          </p>
          <span className="avatar">CL</span>
          <div className="workspace-user">
            Portfolio project<small>Independent demonstration</small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="Toggle navigation"
              aria-expanded={mobile}
              onClick={() => setMobile(!mobile)}
            >
              {mobile ? <X /> : <Menu />}
            </button>
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>{title}</b>
          </div>
          <span className="disclosure">
            <i />
            Synthetic data · Portfolio demonstration
          </span>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">CLIENT ENGAGEMENT, DEMAND & RENEWAL</p>
              <h1>
                {page === "overview"
                  ? "Which accounts need a closer look?"
                  : title}
              </h1>
              <p>
                {page === "overview"
                  ? "Connect client signals to a focused review, 60 days before renewal."
                  : page === "queue"
                    ? "A capacity-limited queue, with a reason behind every review."
                    : page === "validation"
                      ? "Historical evaluation, data checks, and the limits of this demonstration."
                      : "Explore the evidence. Understand the context. Choose the next investigation."}
              </p>
            </div>
            <button
              className="secondary"
              onClick={() => setRefresh((x) => x + 1)}
              disabled={busy}
            >
              <RefreshCw size={15} className={busy ? "spin" : ""} />
              Refresh view
            </button>
          </div>
          {page !== "detail" && (
            <section className="filterbar" aria-label="Portfolio filters">
              <label>
                Renewal cohort
                <select
                  value={cohort}
                  onChange={(e) => {
                    setCohort(e.target.value);
                    setTopic("All");
                  }}
                >
                  {boot?.cohorts.map((c: string) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Industry
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                >
                  <option value="All">All industries</option>
                  {boot?.industries.map((i: string) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </label>
              <label>
                Account size
                <select value={size} onChange={(e) => setSize(e.target.value)}>
                  <option value="All">All sizes</option>
                  {boot?.sizes.map((i: string) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </label>
              <button className="text-button" onClick={reset}>
                Reset filters
              </button>
              <div className="cutoff">
                <span>Scoring cutoff · UTC</span>
                <strong>{day(data?.cutoff)}</strong>
              </div>
            </section>
          )}
          {boot && (
            <div className="version-line">
              <span>
                Data v{boot.metadata.feature_sha256.slice(0, 8)} ·{" "}
                {boot.metadata.scenario} · {num(boot.metadata.counts.events)}{" "}
                raw events
              </span>
              <span className={boot.stale ? "warning" : ""}>
                {boot.stale
                  ? "Stale outputs · refresh pipeline"
                  : "Last successful build"}{" "}
                {new Date(boot.metadata.generated_at).toLocaleString()}
              </span>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              <strong>We couldn’t load this view.</strong>
              <p>{error}</p>
              <button onClick={() => setRefresh((x) => x + 1)}>
                Try again
              </button>
            </div>
          )}
          {busy ? (
            <div className="loading" role="status">
              <RefreshCw className="spin" />
              Loading account evidence…
            </div>
          ) : (
            !error &&
            data && (
              <>
                {page === "overview" && (
                  <>
                    <div className="metrics">
                      <Metric
                        label="Eligible accounts"
                        value={num(data.eligible)}
                        sub={`Renewing in ${cohort}`}
                        definition="One annual contract per account in the selected cohort and segments."
                      />
                      <Metric
                        label="Accounts with signals"
                        value={num(data.flagged)}
                        sub={`${data.eligible} eligible accounts assessed`}
                        definition="At least one configured review flag. A flag is not a churn probability."
                      />
                      <Metric
                        label="Annual value under review"
                        value={money(data.exposure)}
                        sub={`${data.review_count} accounts · $${num(data.exposure)} USD`}
                        definition="Annual contract value of the top-K accounts after cohort and segment filters. This is exposure, not revenue saved."
                      />
                      <Metric
                        label="Active-seat rate"
                        value={pct(
                          data.eligible_seats
                            ? data.active_users / data.eligible_seats
                            : null,
                        )}
                        sub={`${num(data.active_users)} / ${num(data.eligible_seats)} eligible seats`}
                        definition="Distinct eligible users active in [T−30 days,T), divided by users eligible at T. Available records only."
                      />
                    </div>
                    <section className="decision-banner">
                      <div className="banner-icon">
                        <ListFilter size={24} />
                      </div>
                      <div>
                        <p className="eyebrow">YOUR NEXT STEP</p>
                        <h2>
                          {data.review_count} accounts. A focused monthly
                          review.
                        </h2>
                        <p>
                          {data.severe_open} severe tickets remain open at the
                          cutoff. Start with the evidence, then confirm the
                          client’s context.
                        </p>
                      </div>
                      <button
                        className="primary"
                        onClick={() => navigate("queue")}
                      >
                        Open review queue <ArrowUpRight size={17} />
                      </button>
                    </section>
                    <div className="two-col">
                      <section className="panel">
                        <div className="panel-head">
                          <div>
                            <h2>What clients are asking about</h2>
                            <p>
                              Unique accounts with requests in the last 90 days
                            </p>
                          </div>
                          <button
                            className="text-button"
                            onClick={() => navigate("demand")}
                          >
                            Explore <ArrowUpRight size={14} />
                          </button>
                        </div>
                        <div className="topic-list">
                          {data.topics
                            .filter((t: Row) => t.topic !== "Other or unclear")
                            .map((t: Row) => (
                              <button
                                className="topic-row"
                                key={t.topic}
                                onClick={() => {
                                  navigate("demand");
                                  setTopic(t.topic);
                                }}
                              >
                                <span>{t.topic}</span>
                                <div className="bar-track">
                                  <i
                                    style={{
                                      width: `${data.eligible ? (t.accounts / data.eligible) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                                <b>{t.accounts}</b>
                                <small>
                                  {pct(
                                    data.eligible
                                      ? t.accounts / data.eligible
                                      : 0,
                                  )}
                                </small>
                              </button>
                            ))}
                        </div>
                        <p className="footnote">
                          Denominator: {data.eligible} eligible accounts.
                          Accounts may request several topics.
                        </p>
                      </section>
                      <section className="panel">
                        <div className="panel-head">
                          <div>
                            <h2>Engagement at a glance</h2>
                            <p>Observed before the decision point</p>
                          </div>
                          <Activity size={19} />
                        </div>
                        <div className="engagement-block">
                          <strong>
                            {pct(
                              data.eligible
                                ? data.consulted / data.eligible
                                : null,
                            )}
                          </strong>
                          <span>
                            consultation coverage
                            <small>
                              {data.consulted} of {data.eligible} accounts · 90
                              days
                            </small>
                          </span>
                        </div>
                        <div className="mini-stats">
                          <div>
                            <b>{num(data.recent)}</b>
                            <span>
                              Recent interactions<small>Last 30 days</small>
                            </span>
                          </div>
                          <div>
                            <b>{num(data.previous)}</b>
                            <span>
                              Previous interactions<small>Prior 30 days</small>
                            </span>
                          </div>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate("engagement")}
                        >
                          Investigate engagement <ArrowUpRight size={15} />
                        </button>
                      </section>
                    </div>
                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <h2>Start with these accounts</h2>
                          <p>
                            Ranked by flags, longest inactivity, then account ID
                          </p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate("queue")}
                        >
                          View all <ArrowUpRight size={15} />
                        </button>
                      </div>
                      {data.top.length ? table(data.top) : <Empty />}
                    </section>
                    <div className="evidence-footer">
                      <ShieldCheck size={17} />
                      {validation?.quality.detected_injected} /{" "}
                      {validation?.quality.injected} injected faults detected ·
                      Historical renewal outcomes are available in Validation,
                      separate from this prospective view.
                    </div>
                  </>
                )}
                {page === "engagement" && (
                  <>
                    <div className="metrics">
                      <Metric
                        label="Active-seat rate"
                        value={pct(
                          data.eligible_seats
                            ? data.active_users / data.eligible_seats
                            : null,
                        )}
                        sub={`${data.active_users} / ${data.eligible_seats} seats`}
                        definition="Pooled eligible-seat denominator, recent 30 days."
                      />
                      <Metric
                        label="Consultation coverage"
                        value={pct(
                          data.eligible ? data.consulted / data.eligible : null,
                        )}
                        sub={`${data.consulted} / ${data.eligible} accounts`}
                        definition="At least one consultation in [T−90,T)."
                      />
                      <Metric
                        label="Event coverage"
                        value={pct(
                          data.eligible ? data.attended / data.eligible : null,
                        )}
                        sub={`${data.attended} / ${data.eligible} accounts`}
                        definition="At least one event attendance in [T−90,T)."
                      />
                      <Metric
                        label="Interactions"
                        value={num(data.recent)}
                        sub={`${data.previous} in previous 30 days`}
                        definition="All three valid event types, known at cutoff."
                      />
                    </div>
                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <h2>Engagement varies by segment</h2>
                          <p>
                            Active users / eligible seats. Descriptive synthetic
                            counts, not population estimates.
                          </p>
                        </div>
                        <label>
                          Group by
                          <select
                            value={dimension}
                            onChange={(e) => setDimension(e.target.value)}
                          >
                            <option value="company_size">Account size</option>
                            <option value="industry">Industry</option>
                            <option value="tenure_band">Tenure</option>
                          </select>
                        </label>
                      </div>
                      <div className="chart">
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart
                            data={data.segments
                              .filter((s: Row) => s.dimension === dimension)
                              .map((s: Row) => ({
                                ...s,
                                rate: s.eligible_seats
                                  ? (s.active_users / s.eligible_seats) * 100
                                  : 0,
                              }))}
                            margin={{ left: 10, right: 30, bottom: 20 }}
                          >
                            <CartesianGrid vertical={false} stroke="#e5e9e8" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis
                              unit="%"
                              domain={[0, 100]}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                              formatter={(v: any) => `${Number(v).toFixed(1)}%`}
                            />
                            <Bar
                              isAnimationActive={false}
                              dataKey="rate"
                              name="Active-seat rate"
                              fill="#167d80"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={74}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Segment</th>
                              <th>Accounts</th>
                              <th>Active / eligible seats</th>
                              <th>Consulted accounts</th>
                              <th>Event accounts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.segments
                              .filter((s: Row) => s.dimension === dimension)
                              .map((s: Row) => (
                                <tr key={s.name}>
                                  <td>{s.name}</td>
                                  <td>{s.accounts}</td>
                                  <td>
                                    {s.active_users} / {s.eligible_seats}
                                  </td>
                                  <td>
                                    {s.consulted} / {s.accounts}
                                  </td>
                                  <td>
                                    {s.attended} / {s.accounts}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                    <section className="panel padded">
                      <h2>Zero previous activity stays explicit</h2>
                      <p>
                        Percentage change is unavailable when the previous count
                        is zero. Review new activity and persistent inactivity
                        separately.
                      </p>
                      <div className="inline-stats">
                        {data.activity.map((a: Row) => (
                          <div key={a.activity_category}>
                            <strong>{a.accounts}</strong>
                            <span>{a.activity_category}</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                )}
                {page === "demand" && (
                  <>
                    <div className="notice">
                      <MessagesSquare size={20} />
                      <div>
                        <strong>
                          Demand is a starting point for investigation
                        </strong>
                        <p>
                          A request without a matching view may indicate an
                          engagement or discoverability gap. It does not
                          establish content quality or unmet supply.
                        </p>
                      </div>
                    </div>
                    <div className="two-col">
                      <section className="panel">
                        <div className="panel-head">
                          <div>
                            <h2>Demand and matching engagement</h2>
                            <p>Distinct accounts · 90-day observation window</p>
                          </div>
                        </div>
                        <div className="chart">
                          <ResponsiveContainer width="100%" height={310}>
                            <BarChart
                              layout="vertical"
                              data={data.topics}
                              margin={{ left: 15, right: 30 }}
                            >
                              <CartesianGrid horizontal={false} />
                              <XAxis type="number" allowDecimals={false} />
                              <YAxis
                                type="category"
                                dataKey="topic"
                                width={125}
                                tick={{ fontSize: 11 }}
                              />
                              <Tooltip />
                              <Legend />
                              <Bar
                                isAnimationActive={false}
                                dataKey="accounts"
                                name="Requested"
                                fill="#167d80"
                              />
                              <Bar
                                isAnimationActive={false}
                                dataKey="gaps"
                                name="No matching view"
                                fill="#d6a54b"
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </section>
                      <section className="panel padded">
                        <p className="eyebrow">CLASSIFICATION STATUS</p>
                        <h2>Keyword baseline is active</h2>
                        <div className="engagement-block">
                          <strong>
                            {pct(
                              data.classification_count
                                ? data.classified / data.classification_count
                                : null,
                            )}
                          </strong>
                          <span>
                            classification coverage
                            <small>
                              {data.classified} / {data.classification_count}{" "}
                              observed requests
                            </small>
                          </span>
                        </div>
                        <p>
                          Coverage means a named topic was found. Ambiguous
                          requests remain “Other or unclear”.
                        </p>
                        <div className="neutral-note">
                          {validation?.llm_comparison
                            ? "LLM run available in Validation"
                            : "LLM not configured / not run"}
                        </div>
                        <p className="footnote">
                          Final evaluation uses separate template families.
                          Labels are provisional generator labels. Independent
                          human annotation is pending.
                        </p>
                        <button
                          className="text-button"
                          onClick={() => navigate("validation")}
                        >
                          See classifier evaluation <ArrowUpRight size={14} />
                        </button>
                      </section>
                    </div>
                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <h2>The requests behind the topics</h2>
                          <p>
                            Supporting evidence, available at the selected
                            cutoff
                          </p>
                        </div>
                        <label>
                          Topic
                          <select
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                          >
                            <option>All</option>
                            {data.topics.map((t: Row) => (
                              <option key={t.topic}>{t.topic}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      {data.evidence.filter(
                        (e: Row) => topic === "All" || e.topic === topic,
                      ).length ? (
                        <div className="request-list">
                          {data.evidence
                            .filter(
                              (e: Row) => topic === "All" || e.topic === topic,
                            )
                            .slice(0, 60)
                            .map((e: Row) => (
                              <article key={e.request_id + e.topic}>
                                <div>
                                  <span className="badge neutral">
                                    {e.topic}
                                  </span>
                                  <span
                                    className={
                                      "badge " +
                                      (e.matching_view ? "teal" : "amber")
                                    }
                                  >
                                    {e.matching_view
                                      ? "Matching view recorded"
                                      : e.content_available
                                        ? "Investigate discovery"
                                        : "No published match"}
                                  </span>
                                </div>
                                <p>“{e.request_text}”</p>
                                <button
                                  className="text-button"
                                  onClick={() => openAccount(e.account_id)}
                                >
                                  {e.account_id} <ArrowUpRight size={13} />
                                </button>
                                <small>
                                  Requested {day(e.request_time)} · Available{" "}
                                  {day(e.available_at)}
                                </small>
                              </article>
                            ))}
                        </div>
                      ) : (
                        <Empty text="No requests match this topic and cohort." />
                      )}
                    </section>
                  </>
                )}
                {page === "queue" && (
                  <>
                    <div className="queue-intro">
                      <div>
                        <span className="badge teal">PROSPECTIVE REVIEW</span>
                        <p>
                          Flags support investigation. They are not
                          probabilities or estimates of outreach benefit.
                        </p>
                      </div>
                      <label>
                        Monthly capacity
                        <select
                          value={k}
                          onChange={(e) => setK(Number(e.target.value))}
                        >
                          {[10, 25, 50].map((n) => (
                            <option key={n} value={n}>
                              {n} accounts
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <section className="panel">
                      <div className="queue-filters">
                        <label className="search">
                          <Search size={17} />
                          <input
                            aria-label="Search accounts"
                            placeholder="Search account name or ID…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                          />
                        </label>
                        <label>
                          Signals
                          <select
                            value={flag}
                            onChange={(e) => setFlag(e.target.value)}
                          >
                            {["All", "Flagged", "Severe support"].map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Review status
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                          >
                            {[
                              "All",
                              "Not reviewed",
                              "Investigating",
                              "Reviewed",
                            ].map((x) => (
                              <option key={x}>{x}</option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Sort
                          <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                          >
                            <option value="priority">Priority</option>
                            <option value="value">Annual value</option>
                            <option value="name">Account name</option>
                          </select>
                        </label>
                        <a
                          className="secondary"
                          href={"/api/accounts?" + queueParams + "&export=true"}
                        >
                          <Download size={15} />
                          CSV
                        </a>
                      </div>
                      {!queue ? (
                        <div className="loading" role="status">
                          Loading filtered accounts…
                        </div>
                      ) : queue.rows.length ? (
                        table(queue.rows)
                      ) : (
                        <Empty />
                      )}
                      <div className="pagination">
                        <span>
                          {queue?.total || 0} selected accounts · max {k} after
                          filters
                        </span>
                        <div>
                          <button
                            disabled={pn === 1}
                            onClick={() => setPn(pn - 1)}
                          >
                            Previous
                          </button>
                          <span>
                            Page {pn} /{" "}
                            {Math.max(1, Math.ceil((queue?.total || 0) / 10))}
                          </span>
                          <button
                            disabled={pn * 10 >= (queue?.total || 0)}
                            onClick={() => setPn(pn + 1)}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </section>
                    <p className="footnote">
                      Review statuses persist in local SQLite. This
                      demonstration does not send outreach. Capacity selection
                      uses priority order before display sorting.
                    </p>
                  </>
                )}
                {page === "detail" && detail && (
                  <>
                    <button
                      className="text-button"
                      onClick={() => navigate("queue")}
                    >
                      <ArrowLeft size={15} />
                      Back to queue
                    </button>
                    <section className="detail-heading">
                      <div>
                        <p className="eyebrow">
                          {detail.account.account_id} ·{" "}
                          {detail.account.industry}
                        </p>
                        <h2>{detail.account.fictional_account_name}</h2>
                        <p>
                          Renewal {day(detail.account.renewal_date)} · Cutoff{" "}
                          {day(detail.account.cutoff)} UTC ·{" "}
                          {detail.account.company_size}
                        </p>
                      </div>
                      <label>
                        Local demonstration review
                        <select
                          value={detail.review.status}
                          onChange={(e) => review(e.target.value)}
                        >
                          {["Not reviewed", "Investigating", "Reviewed"].map(
                            (x) => (
                              <option key={x}>{x}</option>
                            ),
                          )}
                        </select>
                      </label>
                    </section>
                    <div className="metrics">
                      <Metric
                        label="Review flags"
                        value={String(detail.account.flags)}
                        sub="Explainable rule score"
                        definition="Low seat use + decline + open severe support. Not a churn probability."
                      />
                      <Metric
                        label="Active-seat rate"
                        value={pct(detail.account.active_seat_rate)}
                        sub={`${detail.account.active_users} / ${detail.account.eligible_seats} seats`}
                        definition="Active and eligible users during recent 30-day window."
                      />
                      <Metric
                        label="Activity change"
                        value={pct(detail.account.activity_change)}
                        sub={`${detail.account.recent} recent / ${detail.account.previous} previous`}
                        definition="(Recent−previous)/previous. Null when previous is zero."
                      />
                      <Metric
                        label="Annual contract value"
                        value={money(detail.account.annual_value)}
                        sub="USD · exposure only"
                        definition="Fictional annual subscription value."
                      />
                    </div>
                    <section className="panel padded">
                      <h2>Why this account is in view</h2>
                      <ul className="reasons">
                        {detail.account.low_seats && (
                          <li>
                            Seat use {pct(detail.account.active_seat_rate)} is
                            below 20%. Investigate onboarding and licence
                            access.
                          </li>
                        )}
                        {detail.account.decline && (
                          <li>
                            Activity change{" "}
                            {pct(detail.account.activity_change)} is below −40%.
                            Confirm changing priorities and seasonality.
                          </li>
                        )}
                        {detail.account.support_flag && (
                          <li>
                            {detail.account.severe_open} severe ticket(s) open
                            at cutoff. Investigate support resolution.
                          </li>
                        )}
                        {!detail.account.flags && (
                          <li>
                            No configured flags. This account may appear because
                            capacity exceeds flagged accounts.
                          </li>
                        )}
                      </ul>
                      <p>
                        {detail.account.days_since_activity === 999
                          ? "Never active in the 90-day observation window."
                          : `${detail.account.days_since_activity} days since latest observed activity.`}{" "}
                        Activity category: {detail.account.activity_category}.
                      </p>
                      <p className="footnote">
                        Latest activity {day(detail.account.last_activity)} ·
                        Latest included event availability{" "}
                        {day(detail.account.latest_available)}. Offline use,
                        missing events and imperfect topic matching remain
                        possible.
                      </p>
                    </section>
                    <div className="two-col">
                      <section className="panel padded">
                        <h2>Requests and relevant content</h2>
                        {detail.requests.length ? (
                          detail.requests.map((r: Row) => (
                            <article
                              className="detail-request"
                              key={r.request_id + r.topic}
                            >
                              <span className="badge neutral">{r.topic}</span>
                              <p>“{r.request_text}”</p>
                              <small>
                                {day(r.request_time)} ·{" "}
                                {r.matching_view
                                  ? "Matching content viewed"
                                  : "No matching content view recorded"}
                              </small>
                            </article>
                          ))
                        ) : (
                          <p>No observed requests in this window.</p>
                        )}
                      </section>
                      <section className="panel padded">
                        <h2>Support at the cutoff</h2>
                        {detail.tickets.length ? (
                          detail.tickets.map((t: Row) => (
                            <article
                              className="detail-request"
                              key={t.ticket_id}
                            >
                              <b>
                                {t.ticket_id} · {t.severity}
                              </b>
                              <p>{t.cutoff_status}</p>
                              <small>
                                Opened {day(t.opened_at)} · Available{" "}
                                {day(t.available_at)}
                              </small>
                            </article>
                          ))
                        ) : (
                          <p>No known support tickets.</p>
                        )}
                        <p className="footnote">
                          Future closures are hidden and count as open at T.
                        </p>
                      </section>
                    </div>
                    <section className="panel">
                      <div className="panel-head">
                        <div>
                          <h2>Observed activity history</h2>
                          <p>
                            All {detail.events.length} events in [T−90,T), known
                            by cutoff
                          </p>
                        </div>
                      </div>
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Occurred (UTC)</th>
                              <th>Available (UTC)</th>
                              <th>Interaction</th>
                              <th>Content</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.events.map((e: Row) => (
                              <tr key={e.event_id}>
                                <td>
                                  {e.event_time.replace("T", " ").slice(0, 19)}
                                </td>
                                <td>
                                  {e.available_at
                                    .replace("T", " ")
                                    .slice(0, 19)}
                                </td>
                                <td>{e.event_type.replaceAll("_", " ")}</td>
                                <td>
                                  {e.title || "—"}
                                  <small>{e.topic}</small>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  </>
                )}
                {page === "validation" && validation && (
                  <Validation v={validation} cohort={cohort} />
                )}
                {page === "story" && <Story />}
              </>
            )
          )}
          <footer>
            ClientLens · Independent portfolio project. Fictional identities and
            synthetic data. No Gartner affiliation.
          </footer>
        </div>
      </main>
    </div>
  );
}
function Validation({ v, cohort }: { v: Row; cohort: string }) {
  const h = v.cohorts.find((c: Row) => c.cohort === cohort);
  return (
    <>
      <div className="notice">
        <ShieldCheck />
        <div>
          <strong>Historical outcomes only on this page</strong>
          <p>
            Evaluation as of {v.config.evaluation_as_of}. Metrics below use full
            cohorts, independent of segment filters. Unknown outcomes stay
            unknown.
          </p>
        </div>
      </div>
      <div className="metrics">
        <Metric
          label="Historical renewal rate"
          value={pct(h?.renewal_rate)}
          sub={`${h?.renewed} renewed / ${h?.resolved} resolved · ${cohort}`}
          definition="Resolved contracts after renewal +30-day grace and outcome availability, in the selected full cohort."
        />
        <Metric
          label="Injected faults detected"
          value={`${v.quality.detected_injected} / ${v.quality.injected}`}
          sub={`${v.quality.quarantined} quarantined rows`}
          definition="Match table, source row index and fault type against the injection ledger."
        />
        <Metric
          label="Refresh runtime"
          value={`${v.metadata.runtime_seconds}s`}
          sub={`${(v.metadata.bytes / 1048576).toFixed(1)} MB of versioned data`}
          definition="Measured generator, quality, SQL and evaluation elapsed time on this machine."
        />
        <Metric
          label="Human annotations"
          value={String(v.human_classifier.n)}
          sub="Independent validation pending"
          definition="Adjudicated labels supplied by a person, not generator labels."
        />
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Capacity-aware historical evaluation</h2>
            <p>
              K = min(50, eligible accounts) per cohort. Precision uses selected
              resolved outcomes; pending counts are disclosed.
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Split / method</th>
                <th>Precision at K</th>
                <th>95% Wilson interval</th>
                <th>Recall at K</th>
                <th>Lift at K</th>
                <th>Hits / resolved selected</th>
                <th>Pending selected</th>
              </tr>
            </thead>
            <tbody>
              {v.performance.map((r: Row) => (
                <tr key={r.split + r.method}>
                  <td>
                    <b>{r.method}</b>
                    <small>{r.split}</small>
                  </td>
                  <td>{pct(r.precision)}</td>
                  <td>{r.precision_ci.map(pct).join(" – ")}</td>
                  <td>{pct(r.recall)}</td>
                  <td>{r.lift?.toFixed(2)}×</td>
                  <td>
                    {r.hits} / {r.selected_resolved}
                  </td>
                  <td>{r.selected_pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="footnote padded">
          Random selection uses seed 42. Intervals describe selected resolved
          synthetic records and ignore cohort dependence. Overlap is not a
          formal paired significance test. Risk ranking does not establish who
          benefits from outreach.
        </p>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Temporal separation</h2>
            <p>
              Gap cohorts are excluded from evaluation. Defaults were frozen
              before test evaluation.
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Split</th>
                <th>Renewal cohorts</th>
                <th>Scoring dates</th>
                <th>Latest outcome available</th>
                <th>Accounts / resolved</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(v.splits).map(([name, s]: [string, any]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>
                    {s.cohorts[0]} → {s.cohorts.at(-1)}
                  </td>
                  <td>
                    {s.cutoff_min} → {s.cutoff_max}
                  </td>
                  <td>{s.latest_outcome_available}</td>
                  <td>
                    {s.accounts} / {s.resolved}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <div className="two-col">
        <section className="panel padded">
          <h2>Topic classifier evaluation</h2>
          <p>{v.classifier.n} held-out examples · generator labels only</p>
          <div className="inline-stats">
            <div>
              <strong>{pct(v.classifier.macro_f1)}</strong>
              <span>Macro-F1</span>
            </div>
            <div>
              <strong>{pct(v.classifier.coverage)}</strong>
              <span>Coverage</span>
            </div>
            <div>
              <strong>{pct(v.classifier.json_validity)}</strong>
              <span>JSON valid</span>
            </div>
          </div>
          <p>
            Abstention rate: {pct(v.classifier.abstention_rate)}. Template
            separation prevents identical families in development and
            evaluation, but synthetic language remains simpler than real
            requests.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Precision</th>
                  <th>Recall</th>
                  <th>F1</th>
                  <th>Support</th>
                </tr>
              </thead>
              <tbody>
                {v.classifier.topics.map((t: Row) => (
                  <tr key={t.topic}>
                    <td>{t.topic}</td>
                    <td>{pct(t.precision)}</td>
                    <td>{pct(t.recall)}</td>
                    <td>{pct(t.f1)}</td>
                    <td>{t.support}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="neutral-note">
            {v.llm_comparison ? "LLM comparison available below" : v.llm_status}
          </div>
          {v.llm_comparison && (
            <pre>{JSON.stringify(v.llm_comparison, null, 2)}</pre>
          )}
        </section>
        <section className="panel padded">
          <h2>Stress scenario</h2>
          {v.stress ? (
            <>
              <p>
                Same frozen thresholds, weaker and changed generator
                relationships.
              </p>
              {v.stress.performance
                .filter((r: Row) => r.split === "test")
                .map((r: Row) => (
                  <div className="stress-row" key={r.method}>
                    <b>{r.method}</b>
                    <span>Precision {pct(r.precision)}</span>
                    <span>Lift {r.lift.toFixed(2)}×</span>
                  </div>
                ))}
            </>
          ) : (
            <p>
              Run the documented stress evaluation command to populate this
              comparison.
            </p>
          )}
          <p className="footnote">
            Recovering generator relationships validates workflow mechanics. It
            is not a discovery about real clients.
          </p>
        </section>
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Source reconciliation</h2>
          <span className="badge teal">
            <CheckCircle2 size={13} />
            Join cardinality passed
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Raw rows</th>
                <th>Accepted</th>
                <th>Quarantined</th>
                <th>Reconciliation</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(v.quality.tables).map(
                ([name, r]: [string, any]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>{num(r.raw)}</td>
                    <td>{num(r.accepted)}</td>
                    <td>{r.quarantined}</td>
                    <td>{r.reconciles ? "Pass" : "Fail"}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <details className="padded">
          <summary>
            View detected exceptions ({v.quality.exceptions.length})
          </summary>
          <div className="table-scroll exception-table">
            <table>
              <thead>
                <tr>
                  <th>Source / key</th>
                  <th>Reason</th>
                  <th>Handling</th>
                </tr>
              </thead>
              <tbody>
                {v.quality.exceptions.map((e: Row, i: number) => (
                  <tr key={i}>
                    <td>
                      {e.table} / {e.key}
                    </td>
                    <td>{e.reason}</td>
                    <td>{e.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
      <section className="panel padded">
        <h2>Training / validation threshold sensitivity</h2>
        <p>
          No threshold was chosen using the test set. The initial 20% / −40%
          rule remains fixed.
        </p>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Low seat threshold</th>
                <th>Decline threshold</th>
                <th>Development precision</th>
              </tr>
            </thead>
            <tbody>
              {v.sensitivity.map((r: Row, i: number) => (
                <tr key={i}>
                  <td>{pct(r.active_threshold)}</td>
                  <td>{pct(r.decline_threshold)}</td>
                  <td>{pct(r.precision)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function Story() {
  return (
    <div className="story">
      <section className="panel padded">
        <p className="eyebrow">THE BUSINESS QUESTION</p>
        <h2>Turn fragmented client signals into a reviewable decision.</h2>
        <p>
          A fictional research subscription business can review 50 accounts per
          monthly renewal cohort. ClientLens joins platform activity, written
          requests, relevant content and support context at a common point 60
          days before renewal.
        </p>
        <p>
          The workflow demonstrates SQL, Python, qualitative analysis,
          statistical evaluation and communication relevant to an analyst
          internship. It is an independent educational project, with no Gartner
          affiliation.
        </p>
      </section>
      <div className="two-col">
        <section className="panel padded">
          <h2>One reliable path from source to screen</h2>
          <ol>
            <li>
              Generate deterministic fictional sources and a clean reference.
            </li>
            <li>Detect controlled faults and quarantine exceptions.</li>
            <li>Apply occurrence and availability cutoffs in DuckDB SQL.</li>
            <li>Aggregate facts separately to one account row.</li>
            <li>Rank accounts using documented review signals.</li>
            <li>Evaluate on future cohorts after outcomes mature.</li>
          </ol>
        </section>
        <section className="panel padded">
          <h2>What the evidence cannot establish</h2>
          <p>
            Historical association does not establish outreach benefit. Annual
            value under review is exposure, not saved revenue. Generator labels
            are not independent human truth.
          </p>
          <p>
            Topics use a limited taxonomy. Missing views may reflect offline use
            or imperfect matching. The rule thresholds are educational
            assumptions.
          </p>
        </section>
      </div>
      <section className="panel padded">
        <h2>A proposed real-world pilot</h2>
        <p>
          <b>Shadow mode:</b> an analyst checks freshness, joins and reasons
          while a client-services reviewer checks account context. A content
          specialist reviews topic labels and discovery gaps.
        </p>
        <p>
          <b>Controlled pilot:</b> randomize eligible accounts between a defined
          outreach protocol and business-as-usual. Predefine the renewal
          outcome, 30-day maturity, handling of unknowns, cost and complaint
          guardrails. Plan sample size from a real baseline rate, minimum useful
          effect, power and cohort clustering.
        </p>
        <p>
          <b>Monitoring:</b> stop scoring when critical checks fail. Preserve
          the last good version and label it stale. Monitor label errors,
          engagement changes and complaint rates before expanding.
        </p>
      </section>
      <section className="panel padded">
        <h2>Your contribution checklist</h2>
        <p>
          This application was implemented with AI assistance. Before presenting
          it as your work, rerun the pipeline, explain the SQL, trace five
          accounts, independently annotate a held-out sample, and record one
          peer review. Claim only the parts you have completed and can explain.
        </p>
        <p>
          The repository includes a beginner README, data dictionary, annotation
          guide, interview practice, demo script, and a blank peer-feedback log.
        </p>
      </section>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
