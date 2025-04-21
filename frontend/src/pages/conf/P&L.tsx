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
import Select from "react-select";
import { FaCalendarAlt } from "react-icons/fa";

interface Connection { identifier: string; server: string; login: number; connected: boolean; }
interface Deal { symbol: string; profit: number; /* other fields omitted */ }

interface PnLRow {
  symbol: string;
  manager: number;
  terminal: number;
  diff: number;
}

const presets = [
  { label: "Last 24 h", value: "last24h" },
  { label: "Last 7 days", value: "last7d" },
  { label: "Last 30 days", value: "last30d" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Custom", value: "custom" },
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
  fetchManagerDeals: async (
    id: string,
    date_from: string,
    date_to: string
  ): Promise<Deal[]> => {
    const url = `/api/v1/mt5-manager/deals/${id}/by-group?groups=*&date_from=${encodeURIComponent(
      date_from
    )}&date_to=${encodeURIComponent(date_to)}`;
    const res = await fetch(url);
    return (await res.json()).deals || [];
  },
  fetchTerminalDeals: async (
    id: string,
    date_from: string,
    date_to: string
  ): Promise<Deal[]> => {
    const url = `/api/v1/metatrader5/${id}/history?from_date=${encodeURIComponent(
      date_from
    )}&to_date=${encodeURIComponent(date_to)}`;
    const res = await fetch(url);
    return (await res.json()).deals || [];
  },
};

const PnLComparison: React.FC = () => {
  const [mgrConns, setMgrConns] = useState<Connection[]>([]);
  const [termConns, setTermConns] = useState<Connection[]>([]);
  const [mgrId, setMgrId] = useState<string>("");
  const [termId, setTermId] = useState<string>("");

  const [preset, setPreset] = useState<string>("last24h");
  const [fromDate, setFromDate] = useState<Date>(
    new Date(Date.now() - 24 * 3600 * 1000)
  );
  const [toDate, setToDate] = useState<Date>(new Date());

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<PnLRow[]>([]);

  // load connections
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

  // handle presets
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
      case "last24h":
      default:
        start = new Date(Date.now() - 24 * 3600 * 1000);
    }
    setFromDate(start);
    setToDate(now);
  }, [preset]);

  const runCompare = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = fromDate.toISOString();
      const to = toDate.toISOString();

      const [mgrDeals, termDeals] = await Promise.all([
        api.fetchManagerDeals(mgrId, from, to),
        api.fetchTerminalDeals(termId, from, to),
      ]);

      // sum by symbol
      const sum = (arr: Deal[]) =>
        arr.reduce<Record<string, number>>((acc, d) => {
          acc[d.symbol] = (acc[d.symbol] || 0) + d.profit;
          return acc;
        }, {});

      const mgrSum = sum(mgrDeals);
      const termSum = sum(termDeals);
      const allSymbols = Array.from(
        new Set([...Object.keys(mgrSum), ...Object.keys(termSum)])
      ).sort();

      setRows(
        allSymbols.map(sym => {
          const m = mgrSum[sym] || 0;
          const t = termSum[sym] || 0;
          return { symbol: sym, manager: m, terminal: t, diff: m - t };
        })
      );
    } catch (e) {
      setError("Failed to fetch or compare P&L.");
    } finally {
      setLoading(false);
    }
  }, [mgrId, termId, fromDate, toDate]);

  return (
    <Container className="py-4">
      <h1>Profit and Loss </h1>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form
        onSubmit={e => {
          e.preventDefault();
          runCompare();
        }}
        className="mb-4"
      >
        <Row className="align-items-end">
          <Col md={3}>
            <Form.Label>Manager Account</Form.Label>
            <Form.Select
              value={mgrId}
              onChange={e => setMgrId(e.target.value)}
            >
              {mgrConns.map(c => (
                <option key={c.identifier} value={c.identifier}>
                  {c.login} – {c.server}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col md={3}>
            <Form.Label>Terminal Account</Form.Label>
            <Form.Select
              value={termId}
              onChange={e => setTermId(e.target.value)}
            >
              {termConns.map(c => (
                <option key={c.identifier} value={c.identifier}>
                  {c.login} – {c.server}
                </option>
              ))}
            </Form.Select>
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
              <Col md={2}>
                <Form.Label>From</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FaCalendarAlt />
                  </InputGroup.Text>
                  <DatePicker
                    selected={fromDate}
                    onChange={d => d && setFromDate(d)}
                    showTimeSelect
                    dateFormat="yyyy‑MM‑dd HH:mm"
                    className="form-control"
                  />
                </InputGroup>
              </Col>
              <Col md={2}>
                <Form.Label>To</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <FaCalendarAlt />
                  </InputGroup.Text>
                  <DatePicker
                    selected={toDate}
                    onChange={d => d && setToDate(d)}
                    showTimeSelect
                    dateFormat="yyyy‑MM‑dd HH:mm"
                    className="form-control"
                  />
                </InputGroup>
              </Col>
            </>
          )}

          <Col md={2}>
            <Button
              type="submit"
              className="mt-2 w-100"
              disabled={loading}
            >
              {loading ? <Spinner animation="border" size="sm" /> : "Compare"}
            </Button>
          </Col>
        </Row>
      </Form>

      {!rows.length ? null : (
        <Table bordered hover>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Manager P&L</th>
              <th>Terminal P&L</th>
              <th>Difference</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr
                key={r.symbol}
                style={{
                  backgroundColor:
                    Math.abs(r.diff) > 0.01 ? "#ffecec" : undefined
                }}
              >
                <td>{r.symbol}</td>
                <td>{r.manager.toFixed(2)}</td>
                <td>{r.terminal.toFixed(2)}</td>
                <td
                  style={{
                    color:
                      r.diff > 0 ? "green" : r.diff < 0 ? "red" : "black"
                  }}
                >
                  {r.diff.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Container>
  );
};

export default PnLComparison;
