import React, {
  useEffect,
  useState,
  useCallback,
  MouseEvent
} from "react";
import {
  Container,
  Form,
  Button,
  Table,
  Row,
  Col,
  Spinner,
  Alert,
  InputGroup,
  Pagination
} from "react-bootstrap";
import Select from "react-select";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  Bar
} from "react-chartjs-2";
import "chart.js/auto";
import {
  FaCalendarAlt,
  FaSort,
  FaSortUp,
  FaSortDown
} from "react-icons/fa";

// --- Types ---
interface Deal {
  ticket: number;
  order: number;
  type: number;          // 0=Buy,1=Sell,2=Balance
  volume: number;
  profit: number;
  commission: number;
  swap: number;
  time: string;
  symbol: string;
}

interface GroupData {
  symbol: string;
  deals: Deal[];
  totals: {
    volume: number;
    profit: number;
    commission: number;
    swap: number;
  };
}

interface Option {
  value: string;
  label: string;
}

interface Connection {
  identifier: string;
  server: string;
  login: number;
  connected: boolean;
}

type SortDirection = "asc" | "desc";
interface SortField {
  field: string;
  dir: SortDirection;
}

const PAGE_SIZE = 100;

// --- Available fields (no more “login”) ---
const availableFields: Option[] = [
  { value: "ticket", label: "Ticket" },
  { value: "order",     label: "Order ID" },
  { value: "type", label: "Type" },
  { value: "volume", label: "Volume" },
  { value: "profit", label: "Profit" },
  { value: "commission", label: "Commission" },
  { value: "swap", label: "Swap" },
  { value: "time", label: "Time" }
];

// --- Date‑picker presets ---
const presets = [
  { label: "Last 24 h", value: "last24h" },
  { label: "Last 7 days", value: "last7d" },
  { label: "Last 30 days", value: "last30d" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Custom", value: "custom" }
];

// --- API helpers ---
const api = {
  fetchConnections: async (): Promise<Connection[]> => {
    const res = await fetch("/api/v1/metatrader5/active");
    const data = await res.json();
    return data.active_services || [];
  },
  fetchGroups: async (id: string): Promise<string[]> => {
    const res = await fetch(`/api/v1/metatrader5/${id}/symbols`);
    const data = await res.json();
    return (data.symbols || []).map((s: any) => s.name);
  },
  fetchDeals: async (
    id: string,
    groups: string[],
    from: string,
    to: string
  ): Promise<Deal[]> => {
    const params = new URLSearchParams();
    if (groups.length) params.set("group_filter", groups.join(","));
    params.set("from_date", from);
    params.set("to_date", to);
    const res = await fetch(`/api/v1/metatrader5/${id}/history?${params}`);
    const data = await res.json();
    return (data.deals || []).map((d: any) => ({
      ticket: d.ticket,
      order: d.order,
      type:
        d.action === "buy"
          ? 0
          : d.action === "sell"
          ? 1
          : 2,
      volume: d.volume,
      profit: d.profit,
      commission: d.commission,
      swap: d.swap ?? 0,
      time: d.time,
      symbol: d.symbol
    }));
  }
};

const DealHistory: React.FC = () => {
  // State
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [groupOptions, setGroupOptions] = useState<Option[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Option[]>([]);
  const [selectedFields, setSelectedFields] = useState<Option[]>(availableFields);

  const [preset, setPreset] = useState<string>("last24h");
  const [fromDate, setFromDate] = useState<Date>(new Date(Date.now() - 24 * 3600 * 1000));
  const [toDate, setToDate] = useState<Date>(new Date());

  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [groupedData, setGroupedData] = useState<GroupData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [sortFields, setSortFields] = useState<SortField[]>([]);

  // Load connections
  useEffect(() => {
    api.fetchConnections()
      .then(cs => {
        setConnections(cs);
        if (cs.length) setSelectedId(cs[0].identifier);
      })
      .catch(() => setError("Failed to load accounts"));
  }, []);

  // Load symbols
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    api.fetchGroups(selectedId)
      .then(sym => {
        const opts = sym.map(s => ({ value: s, label: s }));
        setGroupOptions(opts);
        setSelectedGroups(opts.slice(0, 1));
      })
      .catch(() => setError("Failed to load symbols"))
      .finally(() => setLoading(false));
  }, [selectedId]);

  // Fetch deals
  const loadDeals = useCallback(async () => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await api.fetchDeals(
        selectedId,
        selectedGroups.map(g => g.value),
        fromDate.toISOString(),
        toDate.toISOString()
      );
      setDeals(raw);
    } catch {
      setError("Failed to load deals");
    } finally {
      setLoading(false);
    }
  }, [selectedId, selectedGroups, fromDate, toDate]);

  useEffect(() => {
    loadDeals();
  }, [loadDeals]);

  // Group & total
  useEffect(() => {
    const map: Record<string, GroupData> = {};
    deals.forEach(d => {
      const sym = d.symbol || "Unknown";
      if (!map[sym]) {
        map[sym] = {
          symbol: sym,
          deals: [],
          totals: { volume: 0, profit: 0, commission: 0, swap: 0 }
        };
      }
      map[sym].deals.push(d);
      map[sym].totals.volume += d.volume;
      map[sym].totals.profit += d.profit;
      map[sym].totals.commission += d.commission;
      map[sym].totals.swap += d.swap;
    });
    const arr = Object.values(map);
    setGroupedData(arr);
    if (!arr.find(g => g.symbol === selectedSymbol)) {
      setSelectedSymbol(arr[0]?.symbol || "");
      setPage(1);
    }
  }, [deals, selectedSymbol]);

  // Preset handler
  useEffect(() => {
    const now = new Date();
    let start: Date;
    switch (preset) {
      case "last7d":
        start = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        break;
      case "last30d":
        start = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        break;
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "lastMonth": {
        const m = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start = m;
        setToDate(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59));
        break;
      }
      case "custom":
        return;
      case "last24h":
      default:
        start = new Date(Date.now() - 24 * 3600 * 1000);
    }
    setFromDate(start);
    setToDate(now);
  }, [preset]);

  // Summary chart data
  const chartData = {
    labels: groupedData.map(g => g.symbol),
    datasets: [
      { label: "Volume", data: groupedData.map(g => g.totals.volume) },
      { label: "Profit", data: groupedData.map(g => g.totals.profit) }
    ]
  };

  // Detail filtering & sorting
  const detailGroup = groupedData.find(g => g.symbol === selectedSymbol) || {
    symbol: "",
    deals: [],
    totals: { volume: 0, profit: 0, commission: 0, swap: 0 }
  };

  // apply column filters
  const filtered = detailGroup.deals.filter(d =>
    selectedFields.every(f => {
      const fl = (columnFilters[f.value] || "").toLowerCase();
      if (!fl) return true;
      const val = d[f.value as keyof Deal];
      return String(val).toLowerCase().includes(fl);
    })
  );

  // multi-sort
  const sorted = [...filtered].sort((a, b) => {
    for (const sf of sortFields) {
      const av = a[sf.field as keyof Deal];
      const bv = b[sf.field as keyof Deal];
      if (av !== bv) {
        const cmp = av > bv ? 1 : -1;
        return sf.dir === "asc" ? cmp : -cmp;
      }
    }
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageSlice = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // header click → sort
  const onHeaderClick = (f: string, e: MouseEvent) => {
    setPage(1);
    setSortFields(prev => {
      const exist = prev.find(p => p.field === f);
      const nextDir = exist
        ? exist.dir === "asc"
          ? "desc"
          : null
        : "asc";

      let next: SortField[];
      if (e.shiftKey) {
        if (exist) {
          next = prev.filter(p => p.field !== f);
          if (nextDir) next.push({ field: f, dir: nextDir });
        } else {
          next = [...prev, { field: f, dir: nextDir! }];
        }
      } else {
        next = nextDir ? [{ field: f, dir: nextDir }] : [];
      }
      return next;
    });
  };

  // CSV export
  const exportCSV = () => {
    const hdr = selectedFields.map(f => f.label).join(",");
    const rows = pageSlice.map(d =>
      selectedFields
        .map(f => {
          if (f.value === "type") {
            const txt = d.type === 0 ? "Buy" : d.type === 1 ? "Sell" : "Balance";
            return `"${txt}"`;
          }
          const v = d[f.value as keyof Deal];
          if (typeof v === "number") {
            // ticket/order as integer, others two decimals
            if (f.value === "ticket" || f.value === "order") {
              return String(v);
            }
            return v.toFixed(2);
          }
          return `"${String(v).replace(/"/g, '""')}"`;
        })
        .join(",")
    );
    const csv = [hdr, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deal_history_${selectedSymbol}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">MT5 Terminal Deals History</h1>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filters */}
      <Form
        onSubmit={e => { e.preventDefault(); loadDeals(); }}
        className="mb-4"
      >
        <Row className="align-items-end">
          <Col md={2}>
            <Form.Label>Account</Form.Label>
            <Form.Select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
            >
              {connections.map(c => (
                <option key={c.identifier} value={c.identifier}>
                  {c.login} – {c.server}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Label>Symbols</Form.Label>
            <Select
              options={groupOptions}
              isMulti
              value={selectedGroups}
              onChange={opts =>
                setSelectedGroups(Array.isArray(opts) ? opts : [])
              }
            />
          </Col>
          <Col md={2}>
            <Form.Label>Preset</Form.Label>
            <Form.Select
              value={preset}
              onChange={e => setPreset(e.target.value)}
            >
              {presets.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Form.Select>
          </Col>
          {preset === "custom" && (
            <>
              <Col md={3}>
                <Form.Label>From</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaCalendarAlt /></InputGroup.Text>
                  <DatePicker
                    selected={fromDate}
                    onChange={d => d && setFromDate(d)}
                    showTimeSelect
                    dateFormat="yyyy-MM-dd HH:mm"
                    className="form-control"
                  />
                </InputGroup>
              </Col>
              <Col md={3}>
                <Form.Label>To</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaCalendarAlt /></InputGroup.Text>
                  <DatePicker
                    selected={toDate}
                    onChange={d => d && setToDate(d)}
                    showTimeSelect
                    dateFormat="yyyy-MM-dd HH:mm"
                    className="form-control"
                  />
                </InputGroup>
              </Col>
            </>
          )}
          <Col md={2} className="mt-3">
            <Button type="submit" disabled={loading} className="w-100 mt-2">
              {loading ? <Spinner animation="border" size="sm" /> : "Apply"}
            </Button>
          </Col>
        </Row>
      </Form>

      {loading ? (
        <div className="text-center my-4"><Spinner animation="border" /></div>
      ) : !groupedData.length ? (
        <Alert variant="info">No data for those filters.</Alert>
      ) : (
        <>
          {/* Summary Table */}
          <Table bordered hover className="mb-4">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Volume</th>
                <th>Profit</th>
                <th>Commission</th>
                <th>Swap</th>
              </tr>
            </thead>
            <tbody>
              {groupedData.map(g => (
                <tr
                  key={g.symbol}
                  onClick={() => { setSelectedSymbol(g.symbol); setPage(1); }}
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      selectedSymbol === g.symbol ? "#f0f0f0" : undefined
                  }}
                >
                  <td>{g.symbol}</td>
                  <td>{g.totals.volume.toFixed(2)}</td>
                  <td
                    style={{
                      color:
                        g.totals.profit > 0
                          ? "green"
                          : g.totals.profit < 0
                          ? "red"
                          : "blue"
                    }}
                  >
                    {g.totals.profit.toFixed(2)}
                  </td>
                  <td>{g.totals.commission.toFixed(2)}</td>
                  <td>{g.totals.swap.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="table-secondary">
                <th>Totals</th>
                <th>
                  {groupedData
                    .reduce((sum, g) => sum + g.totals.volume, 0)
                    .toFixed(2)}
                </th>
                <th
                  style={{
                    color:
                      groupedData.reduce((sum, g) => sum + g.totals.profit, 0) >
                      0
                        ? "green"
                        : groupedData.reduce((sum, g) => sum + g.totals.profit, 0) <
                          0
                        ? "red"
                        : "blue"
                  }}
                >
                  {groupedData
                    .reduce((sum, g) => sum + g.totals.profit, 0)
                    .toFixed(2)}
                </th>
                <th>
                  {groupedData
                    .reduce((sum, g) => sum + g.totals.commission, 0)
                    .toFixed(2)}
                </th>
                <th>
                  {groupedData
                    .reduce((sum, g) => sum + g.totals.swap, 0)
                    .toFixed(2)}
                </th>
              </tr>
            </tfoot>
          </Table>

          <Bar data={chartData} className="mb-4" />

          {/* Details & Export */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4>Details for “{selectedSymbol}”</h4>
            <div className="d-flex align-items-center">
              <Form.Label className="me-2 mb-0">Columns:</Form.Label>
              <Select
                options={availableFields}
                isMulti
                value={selectedFields}
                onChange={opts =>
                  setSelectedFields(Array.isArray(opts) ? opts : [])
                }
                styles={{ container: base => ({ ...base, width: 300 }) }}
              />
              <Button size="sm" className="ms-3" onClick={exportCSV}>
                Export CSV
              </Button>
            </div>
          </div>

          <Table bordered hover>
            <thead>
              <tr>
                {selectedFields.map(f => {
                  const sf = sortFields.find(s => s.field === f.value);
                  const icon = sf
                    ? sf.dir === "asc"
                      ? <FaSortUp />
                      : <FaSortDown />
                    : <FaSort />;
                  return (
                    <th
                      key={f.value}
                      onClick={e => onHeaderClick(f.value, e)}
                      style={{ cursor: "pointer" }}
                    >
                      {f.label} {icon}
                    </th>
                  );
                })}
              </tr>
              <tr>
                {selectedFields.map(f => (
                  <th key={f.value}>
                    <Form.Control
                      size="sm"
                      placeholder="Filter…"
                      value={columnFilters[f.value] || ""}
                      onChange={e =>
                        setColumnFilters(cf => ({
                          ...cf,
                          [f.value]: e.target.value
                        }))
                      }
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageSlice.map(d => (
                <tr key={d.ticket}>
                  {selectedFields.map(f => {
                    let val: React.ReactNode;
                    if (f.value === "time") {
                      val = new Date(d.time).toLocaleString();
                    } else if (f.value === "type") {
                      val =
                        d.type === 0
                          ? "Buy"
                          : d.type === 1
                          ? "Sell"
                          : "Balance";
                    } else {
                      const v = d[f.value as keyof Deal] as number;
                      // ticket & order as integers:
                      if (f.value === "ticket" || f.value === "order") {
                        val = v.toString();
                      } else {
                        val = v.toFixed(2);
                      }
                    }
                    return <td key={f.value}>{val}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </Table>

          <Pagination className="justify-content-center">
            <Pagination.Prev
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
            />
            <Pagination.Item active>
              {page} / {totalPages}
            </Pagination.Item>
            <Pagination.Next
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
            />
          </Pagination>
        </>
      )}
    </Container>
  );
};

export default DealHistory;
