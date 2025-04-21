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
import CreatableSelect from "react-select/creatable";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { FaCalendarAlt, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

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

// Available columns
const availableFields: Option[] = [
  { value: "ticket", label: "Ticket" },
  { value: "order", label: "Order ID" },
  { value: "type", label: "Type" },
  { value: "volume", label: "Volume" },
  { value: "profit", label: "Profit" },
  { value: "commission", label: "Commission" },
  { value: "swap", label: "Swap" },
  { value: "time", label: "Time" }
];

const presets = [
  { label: "Last 24 h", value: "last24h" },
  { label: "Last 7 days", value: "last7d" },
  { label: "Last 30 days", value: "last30d" },
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "Custom", value: "custom" }
];

// API helpers
const api = {
  fetchConnections: async (): Promise<Connection[]> => {
    const res = await fetch("/api/v1/mt5-manager/accounts");
    const data = await res.json();
    return data.active_managers || [];
  },
  fetchGroups: async (id: string): Promise<string[]> => {
    const res = await fetch(`/api/v1/mt5-manager/groups/${id}/group-configurations`);
    const cfgs = await res.json();
    return cfgs.map((g: any) => g.group_name);
  },
  fetchSymbols: async (id: string): Promise<Option[]> => {
  const res = await fetch(`/api/v1/mt5-manager/symbols/${id}`);
  const data = await res.json();
  return data.symbols.map((s: any) => ({
    value: s.Symbol,
    label: s.Symbol
  }));
},
  fetchDealsRaw: async (url: string): Promise<any[]> => {
    const res = await fetch(url);
    const body = await res.json();
    return body.deals || [];
  }
};

const DealHistory: React.FC = () => {
  // Filters & connections
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");

  const [groupOptions, setGroupOptions] = useState<Option[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Option[]>([]);

  const [symbolOptions, setSymbolOptions] = useState<Option[]>([]);
  const [selectedSymbols, setSelectedSymbols] = useState<Option[]>([]);

  const [loginFilter, setLoginFilter] = useState<string>("");
  const [ticketFilter, setTicketFilter] = useState<string>("");

  const [preset, setPreset] = useState<string>("last24h");
  const [fromDate, setFromDate] = useState<Date>(new Date(Date.now() - 24 * 3600 * 1000));
  const [toDate, setToDate]   = useState<Date>(new Date());

  // Data & UI state
  const [deals, setDeals] = useState<Deal[]>([]);
  const [groupedData, setGroupedData] = useState<GroupData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const [selectedFields, setSelectedFields] = useState<Option[]>(availableFields);
  const [columnFilters, setColumnFilters] = useState<Record<string,string>>({});
  const [sortFields, setSortFields] = useState<SortField[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string|null>(null);

  // Load connections
  useEffect(() => {
    api.fetchConnections()
      .then(cs => {
        setConnections(cs);
        if (cs.length) setSelectedId(cs[0].identifier);
      })
      .catch(() => setError("Failed to load manager accounts"));
  }, []);

  // Load groups & symbols on account change
  useEffect(() => {
  if (!selectedId) return;
  setLoading(true);
  Promise.all([
    api.fetchGroups(selectedId),
    api.fetchSymbols(selectedId)
  ])
    .then(([gs, ss]) => {
      setGroupOptions(gs.map(g => ({value:g,label:g})));
      setSelectedGroups(gs.length ? [{value:gs[0],label:gs[0]}] : []);
      setSymbolOptions(ss);  // ss is already in Option format
      setSelectedSymbols([]);
    })
    .catch(() => setError("Failed to load groups or symbols"))
    .finally(() => setLoading(false));
}, [selectedId]);

  // Preset date handling
  useEffect(() => {
    const now = new Date();
    let start: Date;
    switch (preset) {
      case "last7d":    start = new Date(Date.now() - 7*24*3600*1000); break;
      case "last30d":   start = new Date(Date.now() - 30*24*3600*1000); break;
      case "thisMonth": start = new Date(now.getFullYear(), now.getMonth(),1); break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth()-1,1);
        setToDate(new Date(now.getFullYear(), now.getMonth(),0,23,59,59));
        break;
      case "custom":    return;
      case "last24h":
      default:
        start = new Date(Date.now() - 24*3600*1000);
    }
    setFromDate(start);
    setToDate(now);
  }, [preset]);

  // Build URL based on filters
  const buildUrl = () => {
    let path: string;
    const p = new URLSearchParams();
    p.set("date_from", fromDate.toISOString());
    p.set("date_to",   toDate.toISOString());

    if (ticketFilter) {
      path = `/api/v1/mt5-manager/deals/${selectedId}/by-tickets`;
      p.set("tickets", ticketFilter);
    }
    else if (loginFilter && selectedSymbols.length) {
      path = `/api/v1/mt5-manager/deals/${selectedId}/by-logins-symbol`;
      p.set("logins", loginFilter);
      p.set("symbols", selectedSymbols.map(s=>s.value).join(","));
    }
    else if (loginFilter) {
      path = `/api/v1/mt5-manager/deals/${selectedId}/by-logins`;
      p.set("logins", loginFilter);
    }
    else if (selectedGroups.length && selectedSymbols.length) {
      path = `/api/v1/mt5-manager/deals/${selectedId}/by-group-symbol`;
      selectedGroups.forEach(g => p.append("groups", g.value));
  selectedSymbols.forEach(s => p.append("symbol", s.value));
    }
    else {
      path = `/api/v1/mt5-manager/deals/${selectedId}/by-group`;
      if (selectedGroups.length)
        p.set("groups", selectedGroups.map(g=>g.value).join(","));
    }

    return path + "?" + p.toString();
  };

  // Load deals
  const loadDeals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = buildUrl();
      const raw = await api.fetchDealsRaw(url);
      const normalized: Deal[] = raw.map((d:any) => ({
        ticket:     d.ticket,
        order:      d.order,
        type:       d.action.toLowerCase()==="buy"?0:
                    d.action.toLowerCase()==="sell"?1:2,
        volume:     d.volume,
        profit:     d.profit,
        commission: d.commission,
        swap:       d.storage ?? 0,
        time:       new Date((d.time_msc||d.time*1000)).toISOString(),
        symbol:     d.symbol
      }));
      setDeals(normalized);
    } catch {
      setError("Failed to load deals");
    } finally {
      setLoading(false);
    }
  }, [selectedId, selectedGroups, selectedSymbols, loginFilter, ticketFilter, fromDate, toDate]);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  // Group & total
  useEffect(() => {
    const map: Record<string, GroupData> = {};
    deals.forEach(d => {
      if (!map[d.symbol]) {
        map[d.symbol] = { symbol:d.symbol, deals:[], totals:{volume:0,profit:0,commission:0,swap:0} };
      }
      map[d.symbol].deals.push(d);
      map[d.symbol].totals.volume     += d.volume;
      map[d.symbol].totals.profit     += d.profit;
      map[d.symbol].totals.commission += d.commission;
      map[d.symbol].totals.swap       += d.swap;
    });
    const arr = Object.values(map);
    setGroupedData(arr);
    if (!arr.find(g=>g.symbol===selectedSymbol)) {
      setSelectedSymbol(arr[0]?.symbol||"");
      setPage(1);
    }
  }, [deals, selectedSymbol]);

  // Chart data
  const chartData = {
    labels: groupedData.map(g=>g.symbol),
    datasets: [
      { label:"Volume", data: groupedData.map(g=>g.totals.volume) },
      { label:"Profit", data: groupedData.map(g=>g.totals.profit) }
    ]
  };

  // Detail filtering & sorting
  const detailGroup = groupedData.find(g=>g.symbol===selectedSymbol)
    || {symbol:"", deals:[], totals:{volume:0,profit:0,commission:0,swap:0}};

  const filtered = detailGroup.deals.filter(d =>
    selectedFields.every(f => {
      const term = (columnFilters[f.value]||"").toLowerCase();
      if (!term) return true;
      return String(d[f.value as keyof Deal]).toLowerCase().includes(term);
    })
  );

  const sorted = [...filtered].sort((a,b) => {
    for (const sf of sortFields) {
      const av = a[sf.field as keyof Deal], bv = b[sf.field as keyof Deal];
      if (av!==bv) return sf.dir==="asc"? (av>bv?1:-1) : (av>bv?-1:1);
    }
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length/PAGE_SIZE));
  const pageSlice = sorted.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);

  const onHeaderClick = (field:string,e:MouseEvent) => {
    setPage(1);
    setSortFields(prev => {
      const ex = prev.find(x=>x.field===field);
      const newDir = ex ? (ex.dir==="asc"?"desc":null) : "asc";
      let next: SortField[];
      if (e.shiftKey) {
        if (ex) {
          next = prev.filter(x=>x.field!==field);
          if (newDir) next.push({field,dir:newDir});
        } else {
          next = [...prev,{field,dir:newDir!}];
        }
      } else {
        next = newDir ? [{field,dir:newDir}] : [];
      }
      return next;
    });
  };

  // CSV export
  const exportCSV = () => {
    const hdr = selectedFields.map(f=>f.label).join(",");
    const rows = pageSlice.map(d=>
      selectedFields.map(f=>{
        if(f.value==="type") {
          return d.type===0?"Buy":d.type===1?"Sell":"Balance";
        }
        const v = d[f.value as keyof Deal];
        return typeof v==="number"?v.toFixed(2):`"${v}"`;
      }).join(",")
    );
    const csv = [hdr, ...rows].join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`deals_${selectedSymbol}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">MT5 Manager Deals History</h1>
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Filters */}
      <Form onSubmit={e=>{e.preventDefault(); loadDeals();}} className="mb-4">
        <Row className="align-items-end">

          <Col md={2}>
            <Form.Label>Account</Form.Label>
            <Form.Select
              value={selectedId}
              onChange={e=>setSelectedId(e.target.value)}
            >
              {connections.map(c=>(
                <option key={c.identifier} value={c.identifier}>
                  {c.login} – {c.server}
                </option>
              ))}
            </Form.Select>
          </Col>

          <Col md={2}>
            <Form.Label>Groups</Form.Label>
            <CreatableSelect
              options={groupOptions}
              isMulti
              value={selectedGroups}
              onChange={opts=>setSelectedGroups(Array.isArray(opts)?opts:[])}
              isDisabled={!!ticketFilter}
              placeholder={ticketFilter?"⛔︎ Disabled when ticket set":undefined}
              formatCreateLabel={input => `Add group "${input}"`}
            />
          </Col>

          <Col md={2}>
            <Form.Label>Symbols</Form.Label>
            <Select
              options={symbolOptions}
              isMulti
              value={selectedSymbols}
              onChange={opts=>setSelectedSymbols(Array.isArray(opts)?opts:[])}
              isDisabled={!!ticketFilter}
              placeholder={ticketFilter?"⛔︎ Disabled when ticket set":undefined}
            />
          </Col>

          <Col md={2}>
            <Form.Label>Login</Form.Label>
            <Form.Control
              type="number"
              placeholder="Login ID"
              value={loginFilter}
              onChange={e=>setLoginFilter(e.target.value.replace(/\D/g,""))}
              disabled={!!ticketFilter}
            />
          </Col>

          <Col md={2}>
            <Form.Label>Ticket</Form.Label>
            <Form.Control
              type="number"
              placeholder="Ticket ID"
              value={ticketFilter}
              onChange={e=>setTicketFilter(e.target.value.replace(/\D/g,""))}
            />
          </Col>

          <Col md={2}>
            <Form.Label>Preset</Form.Label>
            <Form.Select
              value={preset}
              onChange={e=>setPreset(e.target.value)}
            >
              {presets.map(p=>(
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </Form.Select>
          </Col>

          {preset==="custom" && (
            <>
              <Col md={3}>
                <Form.Label>From</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaCalendarAlt/></InputGroup.Text>
                  <DatePicker
                    selected={fromDate}
                    onChange={d=>d&&setFromDate(d)}
                    showTimeSelect
                    dateFormat="yyyy-MM-dd HH:mm"
                    className="form-control"
                  />
                </InputGroup>
              </Col>
              <Col md={3}>
                <Form.Label>To</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaCalendarAlt/></InputGroup.Text>
                  <DatePicker
                    selected={toDate}
                    onChange={d=>d&&setToDate(d)}
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
              {loading ? <Spinner animation="border" size="sm"/> : "Apply"}
            </Button>
          </Col>
        </Row>
      </Form>

      {loading ? (
        <div className="text-center my-4"><Spinner animation="border"/></div>
      ) : !groupedData.length ? (
        <Alert variant="info">No data for those filters.</Alert>
      ) : (
        <>
          {/* Summary */}
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
              {groupedData.map(g=>(
                <tr key={g.symbol}
                    onClick={()=>{setSelectedSymbol(g.symbol); setPage(1);}}
                    style={{
                      cursor:"pointer",
                      backgroundColor:selectedSymbol===g.symbol?"#f0f0f0":undefined
                    }}>
                  <td>{g.symbol}</td>
                  <td>{g.totals.volume.toFixed(2)}</td>
                  <td style={{color:g.totals.profit>0?"green":g.totals.profit<0?"red":"blue"}}>
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
                <th>{groupedData.reduce((s,g)=>s+g.totals.volume,0).toFixed(2)}</th>
                <th>{groupedData.reduce((s,g)=>s+g.totals.profit,0).toFixed(2)}</th>
                <th>{groupedData.reduce((s,g)=>s+g.totals.commission,0).toFixed(2)}</th>
                <th>{groupedData.reduce((s,g)=>s+g.totals.swap,0).toFixed(2)}</th>
              </tr>
            </tfoot>
          </Table>

          <Bar data={chartData} className="mb-4"/>

          {/* Details + Columns + Export */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4>Details for “{selectedSymbol}”</h4>
            <div className="d-flex align-items-center">
              <Form.Label className="me-2 mb-0">Columns:</Form.Label>
              <Select
                options={availableFields}
                isMulti
                value={selectedFields}
                onChange={opts=>setSelectedFields(Array.isArray(opts)?opts:[])}
                styles={{container:base=>({...base,width:300})}}
              />
              <Button size="sm" className="ms-3" onClick={exportCSV}>
                Export CSV
              </Button>
            </div>
          </div>

          <Table bordered hover>
            <thead>
              <tr>
                {selectedFields.map(f=>{
                  const sf=sortFields.find(s=>s.field===f.value);
                  const icon= sf
                    ? sf.dir==="asc"?<FaSortUp/>:<FaSortDown/>
                    : <FaSort/>;
                  return (
                    <th key={f.value}
                        onClick={e=>onHeaderClick(f.value,e)}
                        style={{cursor:"pointer"}}>
                      {f.label} {icon}
                    </th>
                  );
                })}
              </tr>
              <tr>
                {selectedFields.map(f=>(
                  <th key={f.value}>
                    <Form.Control
                      size="sm"
                      placeholder="Filter…"
                      value={columnFilters[f.value]||""}
                      onChange={e=>
                        setColumnFilters(cf=>({...cf,[f.value]:e.target.value}))
                      }
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageSlice.map(d=>(
                <tr key={d.ticket}>
                  {selectedFields.map(f=>{
                    let val: React.ReactNode;
                    if(f.value==="time"){
                      val=new Date(d.time).toLocaleString();
                    } else if(f.value==="type"){
                      val=d.type===0?"Buy":d.type===1?"Sell":"Balance";
                    } else {
                      const v=d[f.value as keyof Deal];
                      val=typeof v==="number"?v.toFixed(2):v;
                    }
                    return <td key={f.value}>{val}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </Table>

          <Pagination className="justify-content-center">
            <Pagination.Prev
              onClick={()=>setPage(p=>Math.max(p-1,1))}
              disabled={page===1}
            />
            <Pagination.Item active>{page} / {totalPages}</Pagination.Item>
            <Pagination.Next
              onClick={()=>setPage(p=>Math.min(p+1,totalPages))}
              disabled={page===totalPages}
            />
          </Pagination>
        </>
      )}
    </Container>
  );
};

export default DealHistory;
