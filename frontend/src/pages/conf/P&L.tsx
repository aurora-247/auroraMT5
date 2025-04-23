// src/pages/conf/P&L.tsx
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
  Modal,
} from "react-bootstrap";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FaCalendarAlt } from "react-icons/fa";
import { ErrorBoundary } from "../../components/ErrorBoundary";

interface Connection { identifier: string; server: string; login: number; connected: boolean; }
interface Deal      { symbol: string; profit: number; volume: number; commission: number; swap: number; time: string; type: string; login: number; }
interface SymbolMap { manager: string; terminal: string; }

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
  fetchManagerDeals: async (id:string, from:string, to:string): Promise<Deal[]> => {
    const url = `/api/v1/mt5-manager/deals/${id}/by-group?groups=*&date_from=${encodeURIComponent(from)}&date_to=${encodeURIComponent(to)}`;
    const { deals: raw=[] } = await (await fetch(url)).json();
    return raw.map((d:any) => ({
      symbol:     d.symbol,
      profit:     d.profit,
      volume:     d.volume,
      commission: d.commission,
      swap:       d.swap ?? 0,
      time:       new Date(d.time_msc ?? d.time*1000).toISOString(),
      type:       d.action,
      login:      d.login,
    }));
  },
  fetchTerminalDeals: async (id:string, from:string, to:string): Promise<Deal[]> => {
    const url = `/api/v1/metatrader5/${id}/history?from_date=${encodeURIComponent(from)}&to_date=${encodeURIComponent(to)}`;
    const { deals: raw=[] } = await (await fetch(url)).json();
    return raw.map((d:any) => ({
      symbol:     d.symbol,
      profit:     d.profit,
      volume:     d.volume,
      commission: d.commission,
      swap:       d.swap ?? 0,
      time:       new Date(d.time_msc ?? d.time*1000).toISOString(),
      type:       d.action,
      login:      d.login,
    }));
  },
  fetchSymbolMap: async (mgr:string, term:string): Promise<SymbolMap[]> => {
    const res = await fetch(`/api/v1/mappings/symbols?manager_id=${mgr}&terminal_id=${term}`);
    if (!res.ok) return [];
    const arr = await res.json();
    return Array.isArray(arr)
      ? arr.map((m:any) => ({ manager: m.manager_symbol, terminal: m.terminal_symbol }))
      : [];
  },
};

const PnLComparison: React.FC = () => {
  // ── State
  const [mgrConns, setMgrConns]       = useState<Connection[]>([]);
  const [termConns, setTermConns]     = useState<Connection[]>([]);
  const [mgrId, setMgrId]             = useState<string>("");
  const [termId, setTermId]           = useState<string>("");

  const [preset, setPreset]           = useState<string>("last24h");
  const [fromDate, setFromDate]       = useState<Date>(new Date(Date.now()-24*3600*1000));
  const [toDate, setToDate]           = useState<Date>(new Date());

  const [rows, setRows]               = useState<PnLRow[]>([]);
  const [loading, setLoading]         = useState<boolean>(false);
  const [error, setError]             = useState<string|null>(null);

  const [showModal, setShowModal]     = useState<boolean>(false);
  const [modalSymbol, setModalSymbol] = useState<string>("");
  const [modalDeals, setModalDeals]   = useState<{manager:Deal[];terminal:Deal[]}>({manager:[],terminal:[]});
  const [modalSearch, setModalSearch] = useState<string>("");

  // ── Helpers
  const safeNum = (n:any) => typeof n==="number" && !isNaN(n) ? n.toFixed(2) : "—";

  // sum raw metrics by symbol
  const sumRaw = (deals:Deal[]) =>
    deals.reduce<Record<string,{profit:number;volume:number;commission:number;swap:number}>>((acc,d)=>{
      if (!acc[d.symbol]) acc[d.symbol] = {profit:0,volume:0,commission:0,swap:0};
      acc[d.symbol].profit     += d.profit;
      acc[d.symbol].volume     += d.volume;
      acc[d.symbol].commission += d.commission;
      acc[d.symbol].swap       += d.swap;
      return acc;
    }, {});

  // ── Effects
  useEffect(() => {
    // load connections once
    api.fetchManagerConnections().then(cs => {
      setMgrConns(cs); if (cs[0]) setMgrId(cs[0].identifier);
    });
    api.fetchTerminalConnections().then(cs => {
      setTermConns(cs); if (cs[0]) setTermId(cs[0].identifier);
    });
  }, []);

  useEffect(() => {
    // preset → adjust dates
    const now = new Date(), ms=24*3600*1000;
    let start:Date;
    switch(preset){
      case "last7d":    start=new Date(Date.now()-7*ms); break;
      case "last30d":   start=new Date(Date.now()-30*ms); break;
      case "thisMonth": start=new Date(now.getFullYear(), now.getMonth(),1); break;
      case "lastMonth":
        start=new Date(now.getFullYear(), now.getMonth()-1,1);
        setToDate(new Date(now.getFullYear(),now.getMonth(),0,23,59,59));
        break;
      case "custom":    return;
      default:          start=new Date(Date.now()-ms);
    }
    setFromDate(start);
    setToDate(now);
  }, [preset]);

  const runCompare = useCallback(async ()=>{
    setLoading(true);
    setError(null);
    try {
      const from = fromDate.toISOString(), to = toDate.toISOString();
      const [mapping, mgrDeals, termDeals] = await Promise.all([
        api.fetchSymbolMap(mgrId, termId),
        api.fetchManagerDeals(mgrId, from, to),
        api.fetchTerminalDeals(termId, from, to),
      ]);

      // build terminal → [manager...]
      const terminalToMgrs: Record<string,string[]> = {};
      mapping.forEach(m=>{
        terminalToMgrs[m.terminal] ||= [];
        terminalToMgrs[m.terminal].push(m.manager);
      });

      // raw sums
      const mgrRaw  = sumRaw(mgrDeals);
      const termRaw = sumRaw(termDeals);

      // sum per terminal
      const mgrByTerm: Record<string,typeof mgrRaw[string]> = {};
      Object.entries(terminalToMgrs).forEach(([term, mgrs])=>{
        mgrByTerm[term] = mgrs.reduce((acc,msym)=>{
          const r = mgrRaw[msym] || {profit:0,volume:0,commission:0,swap:0};
          return {
            profit:     acc.profit     + r.profit,
            volume:     acc.volume     + r.volume,
            commission: acc.commission + r.commission,
            swap:       acc.swap       + r.swap
          };
        }, {profit:0,volume:0,commission:0,swap:0});
      });

      // combine all terminal keys
      const allTerms = Array.from(new Set([
        ...Object.keys(mgrByTerm),
        ...Object.keys(termRaw)
      ])).sort();

      const rows: PnLRow[] = allTerms.map(sym=>{
        const m = mgrByTerm[sym]  || {profit:0,volume:0,commission:0,swap:0};
        const t = termRaw[sym]    || {profit:0,volume:0,commission:0,swap:0};
        return {
          symbol:     sym,
          manager:    m.profit,
          terminal:   t.profit,
          diff:       m.profit - t.profit,
          volume:     (m.volume + t.volume)/10000,
          commission: m.commission + t.commission,
          swap:       m.swap + t.swap,
          isMapped:   Array.isArray(terminalToMgrs[sym]),
        };
      });

      // mapped rows first
      setRows([
        ...rows.filter(r=>r.isMapped),
        ...rows.filter(r=>!r.isMapped)
      ]);

    } catch(e:any){
      console.error(e);
      setError(e.message||"Failed to compare");
    } finally {
      setLoading(false);
    }
  },[mgrId,termId,fromDate,toDate]);

  // show detail modal
  const onRowClick = async(sym:string)=>{
    setLoading(true);
    setError(null);
    try {
      const from = fromDate.toISOString(), to=toDate.toISOString();
      const [mapping, mgrDeals, termDeals] = await Promise.all([
        api.fetchSymbolMap(mgrId,termId),
        api.fetchManagerDeals(mgrId, from, to),
        api.fetchTerminalDeals(termId, from, to),
      ]);
      // build same terminal→mgr[]
      const terminalToMgrs: Record<string,string[]> = {};
      mapping.forEach(m=>{
        terminalToMgrs[m.terminal] ||= [];
        terminalToMgrs[m.terminal].push(m.manager);
      });

      const mgrFiltered = mgrDeals.filter(d=>
        terminalToMgrs[sym]?.includes(d.symbol)
      );
      const termFiltered = termDeals.filter(d=>d.symbol===sym);

      setModalSymbol(sym);
      setModalDeals({manager: mgrFiltered, terminal: termFiltered});
      setModalSearch("");
      setShowModal(true);
    } catch(e:any){
      console.error(e);
      setError(e.message||"Error loading details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h1>Profit & Loss</h1>
      {error && <Alert variant="danger">{error}</Alert>}

      <Form onSubmit={e=>{e.preventDefault(); runCompare();}} className="mb-4">
        <Row className="align-items-end">
          <Col md={3}>
            <Form.Label>Manager</Form.Label>
            <Form.Select value={mgrId} onChange={e=>setMgrId(e.target.value)}>
              {mgrConns.map(c=>
                <option key={c.identifier} value={c.identifier}>
                  {c.login} – {c.server}
                </option>
              )}
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Label>Terminal</Form.Label>
            <Form.Select value={termId} onChange={e=>setTermId(e.target.value)}>
              {termConns.map(c=>
                <option key={c.identifier} value={c.identifier}>
                  {c.login} – {c.server}
                </option>
              )}
            </Form.Select>
          </Col>
          <Col md={2}>
            <Form.Label>Range</Form.Label>
            <Form.Select value={preset} onChange={e=>setPreset(e.target.value)}>
              {presets.map(p=>(
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Form.Select>
          </Col>
          {preset==="custom" && <>
            <Col md={2}>
              <Form.Label>From</Form.Label>
              <InputGroup>
                <InputGroup.Text><FaCalendarAlt/></InputGroup.Text>
                <DatePicker
                  selected={fromDate}
                  onChange={d=>d&&setFromDate(d)}
                  showTimeSelect dateFormat="yyyy-MM-dd HH:mm"
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
                  onChange={d=>d&&setToDate(d)}
                  showTimeSelect dateFormat="yyyy-MM-dd HH:mm"
                  className="form-control"
                />
              </InputGroup>
            </Col>
          </>}
          <Col md={2}>
            <Button type="submit" className="mt-2 w-100" disabled={loading}>
              {loading
                ? <Spinner animation="border" size="sm"/>
                : "Compare"}
            </Button>
          </Col>
        </Row>
      </Form>

      {rows.length>0 && (
        <Table bordered hover>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Mgr P&L</th><th>Term P&L</th><th>Diff</th>
              <th>Vol (/10 k)</th><th>Comm</th><th>Swap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.symbol}
                  style={{cursor:"pointer"}}
                  onClick={()=>onRowClick(r.symbol)}>
                <td>
                  {r.symbol}
                  {!r.isMapped && <span style={{color:"#888",marginLeft:4}}>(unmapped)</span>}
                </td>
                <td>{safeNum(r.manager)}</td>
                <td>{safeNum(r.terminal)}</td>
                <td style={{color:r.diff>0?"green":r.diff<0?"red":"black"}}>
                  {safeNum(r.diff)}
                </td>
                <td>{safeNum(r.volume)}</td>
                <td>{safeNum(r.commission)}</td>
                <td>{safeNum(r.swap)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={showModal} onHide={()=>setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Deals for {modalSymbol}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Control
            placeholder="Search…"
            className="mb-3"
            value={modalSearch}
            onChange={e=>setModalSearch(e.target.value)}
          />
          <Row>
            <Col>
              <h5>Manager Deals</h5>
              <Table bordered size="sm" hover>
                <thead>
                  <tr>
                    <th>Time</th><th>Login</th><th>Type</th>
                    <th>Profit</th><th>Vol</th><th>Comm</th><th>Swap</th>
                  </tr>
                </thead>
                <tbody>
                  {modalDeals.manager
                    .filter(d=>{
                      const txt = `${d.login} ${d.type} ${new Date(d.time).toLocaleString()}`.toLowerCase();
                      return txt.includes(modalSearch.toLowerCase());
                    })
                    .map((d,i)=>(
                      <tr key={i}>
                        <td>{new Date(d.time).toLocaleString()}</td>
                        <td>{d.login}</td>
                        <td>{d.type}</td>
                        <td>{safeNum(d.profit)}</td>
                        <td>{safeNum(d.volume/10000)}</td>
                        <td>{safeNum(d.commission)}</td>
                        <td>{safeNum(d.swap)}</td>
                      </tr>
                  ))}
                </tbody>
              </Table>
            </Col>
            <Col>
              <h5>Terminal Deals</h5>
              <Table bordered size="sm" hover>
                <thead>
                  <tr>
                    <th>Time</th><th>Login</th><th>Type</th>
                    <th>Profit</th><th>Vol</th><th>Comm</th><th>Swap</th>
                  </tr>
                </thead>
                <tbody>
                  {modalDeals.terminal
                    .filter(d=>{
                      const txt = `${d.login} ${d.type} ${new Date(d.time).toLocaleString()}`.toLowerCase();
                      return txt.includes(modalSearch.toLowerCase());
                    })
                    .map((d,i)=>(
                      <tr key={i}>
                        <td>{new Date(d.time).toLocaleString()}</td>
                        <td>{d.login}</td>
                        <td>{d.type}</td>
                        <td>{safeNum(d.profit)}</td>
                        <td>{safeNum(d.volume/10000)}</td>
                        <td>{safeNum(d.commission)}</td>
                        <td>{safeNum(d.swap)}</td>
                      </tr>
                  ))}
                </tbody>
              </Table>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={()=>setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export const PnLPage: React.FC = () => (
  <ErrorBoundary>
    <PnLComparison />
  </ErrorBoundary>
);

export default PnLPage;
