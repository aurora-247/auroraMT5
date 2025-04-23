import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Alert,
  Table,
  InputGroup,
} from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt } from "react-icons/fa";

interface Connection {
  identifier: string;
  server:     string;
  login:      number;
  connected:  boolean;
}

interface Deal {
  symbol:     string;
  profit:     number;
  volume:     number;
  commission: number;
  swap:       number;
}

interface SymbolMap {
  manager:  string;
  terminal: string;
}

interface PnLRow {
  symbol:     string;
  manager:    number;
  terminal:   number;
  diff:       number;
  volume:     number;
  commission: number;
  swap:       number;
  isMapped:   boolean;
}

const presets = [
  { label: "Last 24 h",    value: "last24h"  },
  { label: "Last 7 days",  value: "last7d"   },
  { label: "Last 30 days", value: "last30d"  },
  { label: "This Month",   value: "thisMonth"},
  { label: "Last Month",   value: "lastMonth"},
  { label: "Custom",       value: "custom"   },
];

const api = {
  fetchManagerConnections: async (): Promise<Connection[]> => {
    const res = await fetch("/api/v1/mt5-manager/accounts");
    return (await res.json()).active_managers || [];
  },
  fetchTerminalConnections: async (): Promise<Connection[]> => {
    const res = await fetch("/api/v1/metatrader5/active");
    return (await res.json()).active_services || [];
  },
  fetchManagerDeals: async (id: string, date_from: string, date_to: string): Promise<Deal[]> => {
    const url = `/api/v1/mt5-manager/deals/${id}/by-group?groups=*&date_from=${encodeURIComponent(date_from)}&date_to=${encodeURIComponent(date_to)}`;
    const res = await fetch(url);
    return (await res.json()).deals || [];
  },
  fetchTerminalDeals: async (id: string, date_from: string, date_to: string): Promise<Deal[]> => {
    const url = `/api/v1/metatrader5/${id}/history?from_date=${encodeURIComponent(date_from)}&to_date=${encodeURIComponent(date_to)}`;
    const res = await fetch(url);
    return (await res.json()).deals || [];
  },
  fetchSymbolMap: async (managerId: string, terminalId: string): Promise<SymbolMap[]> => {
    const res = await fetch(
      `/api/v1/mappings/symbols?manager_id=${managerId}&terminal_id=${terminalId}`
    );
    if (!res.ok) return [];
    const arr = await res.json();
    if (!Array.isArray(arr)) return [];
    return arr.map((m: any) => ({
      manager:  m.manager_symbol,
      terminal: m.terminal_symbol,
    }));
  },
};

const PnLComparison: React.FC = () => {
  const [mgrConns, setMgrConns]   = useState<Connection[]>([]);
  const [termConns, setTermConns] = useState<Connection[]>([]);
  const [mgrId,     setMgrId]     = useState<string>("");
  const [termId,    setTermId]    = useState<string>("");

  const [preset,   setPreset]   = useState<string>("last24h");
  const [fromDate, setFromDate] = useState<Date>(new Date(Date.now() - 24 * 3600 * 1000));
  const [toDate,   setToDate]   = useState<Date>(new Date());

  const [loading, setLoading] = useState<boolean>(false);
  const [error,   setError]   = useState<string|null>(null);
  const [rows,    setRows]    = useState<PnLRow[]>([]);

  // — Load connections on mount —
  useEffect(() => {
    api.fetchManagerConnections().then(cs => {
      setMgrConns(cs);
      if (cs.length) setMgrId(cs[0].identifier);
    });
    api.fetchTerminalConnections().then(cs => {
      setTermConns(cs);
      if (cs.length) setTermId(cs[0].identifier);
    });
  }, []);

  // — Adjust dates on preset change —
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
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        setToDate(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59));
        break;
      case "custom":
        return;
      default:
        start = new Date(Date.now() - 24 * 3600 * 1000);
    }
    setFromDate(start);
    setToDate(now);
  }, [preset]);

  // — Helper to sum metrics —
  const sumMetrics = (
    deals: Deal[],
    translate: (s: string) => string
  ) =>
    deals.reduce<Record<string, { profit: number; volume: number; commission: number; swap: number }>>(
      (acc, d) => {
        const sym = translate(d.symbol);
        if (!acc[sym]) {
          acc[sym] = { profit: 0, volume: 0, commission: 0, swap: 0 };
        }
        acc[sym].profit     += d.profit;
        acc[sym].volume     += d.volume;
        acc[sym].commission += d.commission;
        acc[sym].swap       += d.swap;
        return acc;
      },
      {}
    );

  // — Compare & aggregate —
  const runCompare = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = fromDate.toISOString();
      const to   = toDate.toISOString();

      // fetch mapping + deals
      const [mapping, mgrDeals, termDeals] = await Promise.all([
        api.fetchSymbolMap(mgrId, termId),
        api.fetchManagerDeals(mgrId, from, to),
        api.fetchTerminalDeals(termId, from, to),
      ]);

      // build explicit lookup
      const dict: Record<string,string> = {};
      mapping.forEach(m => {
        dict[m.terminal] = m.manager;
      });

      // sum manager deals (no translation)
      const mgrMetrics = sumMetrics(mgrDeals, s => s);

      // sum terminal deals, only translate if in dict
      const termMetrics = sumMetrics(termDeals, s => dict[s] || s);

      // all unique symbols
      const allSymbols = Array.from(
        new Set([...Object.keys(mgrMetrics), ...Object.keys(termMetrics)])
      ).sort();

      // set up a Set of mapped managers for quick lookup
      const mappedManagers = new Set(mapping.map(m => m.manager));

      // build rows with isMapped flag
      const newRows: PnLRow[] = allSymbols.map(sym => {
        const m = mgrMetrics[sym]  || { profit:0, volume:0, commission:0, swap:0 };
        const t = termMetrics[sym] || { profit:0, volume:0, commission:0, swap:0 };
        return {
          symbol:     sym,
          manager:    m.profit,
          terminal:   t.profit,
          diff:       m.profit - t.profit,
          volume:     m.volume + t.volume,
          commission: m.commission + t.commission,
          swap:       m.swap + t.swap,
          isMapped:   mappedManagers.has(sym),
        };
      });

      // split mapped vs unmapped
      const mappedRows   = newRows.filter(r => r.isMapped);
      const unmappedRows = newRows.filter(r => !r.isMapped);

      setRows([...mappedRows, ...unmappedRows]);
    } catch (e) {
      console.error(e);
      setError("Failed to fetch or compare P&L.");
    } finally {
      setLoading(false);
    }
  }, [mgrId, termId, fromDate, toDate]);

  return (
    <Container className="py-4">
      <h1>Profit and Loss</h1>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form
        onSubmit={e => { e.preventDefault(); runCompare(); }}
        className="mb-4"
      >
        <Row className="align-items-end">
          <Col md={3}>
            <Form.Label>Manager Account</Form.Label>
            <Form.Select value={mgrId} onChange={e => setMgrId(e.target.value)}>
              {mgrConns.map(c => (
                <option key={c.identifier} value={c.identifier}>
                  {c.login} – {c.server}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Label>Terminal Account</Form.Label>
            <Form.Select value={termId} onChange={e => setTermId(e.target.value)}>
              {termConns.map(c => (
                <option key={c.identifier} value={c.identifier}>
                  {c.login} – {c.server}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Label>Preset</Form.Label>
            <Form.Select value={preset} onChange={e => setPreset(e.target.value)}>
              {presets.map(p => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Form.Select>
          </Col>
          {preset === "custom" && (
            <>
              <Col md={2}>
                <Form.Label>From</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaCalendarAlt/></InputGroup.Text>
                  <DatePicker
                    selected={fromDate}
                    onChange={d => d && setFromDate(d)}
                    showTimeSelect
                    dateFormat="yyyy-MM-dd HH:mm"
                    className="form-control"
                  />
                </InputGroup>
              </Col>
              <Col md={2}>
                <Form.Label>To</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaCalendarAlt/></InputGroup.Text>
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
          <Col md={2}>
            <Button type="submit" className="mt-2 w-100" disabled={loading}>
              {loading ? <Spinner size="sm" animation="border"/> : "Compare"}
            </Button>
          </Col>
        </Row>
      </Form>

      {rows.length > 0 && (
        <Table bordered hover>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Manager P&L</th>
              <th>Terminal P&L</th>
              <th>Difference</th>
              <th>Total Volume</th>
              <th>Total Commission</th>
              <th>Total Swap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.symbol}>
                <td>
                  {r.symbol}
                  { !r.isMapped && (
                    <span style={{color: "#888", marginLeft: 4}}>(unmapped)</span>
                  )}
                </td>
                <td>{r.manager.toFixed(2)}</td>
                <td>{r.terminal.toFixed(2)}</td>
                <td style={{ color: r.diff > 0 ? "green" : r.diff < 0 ? "red" : "black" }}>
                  {r.diff.toFixed(2)}
                </td>
                <td>{r.volume.toFixed(2)}</td>
                <td>{r.commission.toFixed(2)}</td>
                <td>{r.swap.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default PnLComparison;
