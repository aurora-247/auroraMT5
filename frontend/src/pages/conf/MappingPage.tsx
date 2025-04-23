// src/pages/conf/MappingPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Spinner,
  Alert,
  Table
} from 'react-bootstrap';
import Select, { ValueType } from 'react-select';

interface Option          { value: string; label: string; }
interface MappingResponse { manager_id: string; terminal_id: string; manager_symbol: string; terminal_symbol: string; }
interface ManagerAccount  { identifier: string; name?: string; }
interface TerminalService { identifier: string; login: number; server: string; }

const toOptions = (arr: string[]): Option[] =>
  arr.map(s => ({ value: s, label: s }));

const SymbolMappingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string|null>(null);

  const [mgrAccounts, setMgrAccounts]   = useState<ManagerAccount[]>([]);
  const [termServices, setTermServices] = useState<TerminalService[]>([]);
  const [mgrId, setMgrId]               = useState<string>('');
  const [termId, setTermId]             = useState<string>('');

  const [mgrSymbols, setMgrSymbols]   = useState<string[]>([]);
  const [termSymbols, setTermSymbols] = useState<string[]>([]);

  // terminal_symbol → [manager_symbol, …]
  const [mapping, setMapping] = useState<Record<string,string[]>>({});

  // 1) initial load: accounts, symbols, existing mapping
  useEffect(() => {
    async function loadAll() {
      try {
        setLoading(true);
        // accounts
        const [mres, tres] = await Promise.all([
          fetch('/api/v1/mt5-manager/accounts'),
          fetch('/api/v1/metatrader5/active'),
        ]);
        const mjson = await mres.json();
        const tjson = await tres.json();
        const mgrs  = mjson.active_managers || [];
        const terms = tjson.active_services || [];
        setMgrAccounts(mgrs);
        setTermServices(terms);
        const selMgr = mgrs[0]?.identifier  || '';
        const selTerm= terms[0]?.identifier|| '';
        setMgrId(selMgr);
        setTermId(selTerm);

        // symbols & mapping
        await loadSymbolsAndMapping(selMgr, selTerm);
        setError(null);
      } catch(e) {
        console.error(e);
        setError('Failed to load mapping page');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, []);

  // reload whenever account or terminal changes
  useEffect(() => {
    if (!mgrId || !termId) return;
    loadSymbolsAndMapping(mgrId, termId);
  }, [mgrId, termId]);

  async function loadSymbolsAndMapping(mgr:string, term:string) {
    try {
      setLoading(true);
      const [msRes, tsRes, mapRes] = await Promise.all([
        fetch(`/api/v1/mt5-manager/symbols/${mgr}`),
        fetch(`/api/v1/metatrader5/${term}/symbols`),
        fetch(`/api/v1/mappings/symbols?manager_id=${mgr}&terminal_id=${term}`)
      ]);
      const msj = await msRes.json();
      const tsj = await tsRes.json();
      setMgrSymbols((msj.symbols||[]).map((s:any)=>s.Symbol));
      setTermSymbols((tsj.symbols||[]).map((s:any)=>s.name));

      let existing: MappingResponse[] = [];
      if (mapRes.ok) {
        existing = await mapRes.json();
        if (!Array.isArray(existing)) existing = [];
      }
      // group by terminal_symbol
      const grp: Record<string,string[]> = {};
      existing.forEach(m => {
        grp[m.terminal_symbol] ||= [];
        grp[m.terminal_symbol].push(m.manager_symbol);
      });
      setMapping(grp);
    } catch(e) {
      console.error(e);
      setMapping({});
    } finally {
      setLoading(false);
    }
  }

  // multi-select change handler
  const handleChange = (terminal: string) =>
    (opts: ValueType<Option,true>) => {
      const arr = Array.isArray(opts) ? opts.map(o=>o.value) : [];
      setMapping(m=>({ ...m, [terminal]: arr }));
    };

  // save flattening to per-pair payload
  const save = async () => {
    try {
      setLoading(true);
      const payload = Object.entries(mapping).flatMap(([terminal, mgrs])=>
        mgrs.map(manager_symbol=>({
          manager_id:      mgrId,
          terminal_id:     termId,
          manager_symbol,
          terminal_symbol: terminal
        }))
      );
      const res = await fetch('/api/v1/mappings/symbols', {
        method: 'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();
      alert('Mappings saved');
    } catch {
      alert('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center my-4"><Spinner animation="border"/></div>;
  if (error)   return <Alert variant="danger">{error}</Alert>;

  return (
    <Container className="py-4">
      <h1>Symbol Mapping</h1>

      <Row className="mb-3">
        <Col md={6}>
          <Form.Label>Manager Account</Form.Label>
          <Form.Select value={mgrId} onChange={e=>setMgrId(e.target.value)}>
            {mgrAccounts.map(a=>
              <option key={a.identifier} value={a.identifier}>
                {a.identifier}{a.name?` (${a.name})`:''}
              </option>
            )}
          </Form.Select>
        </Col>
        <Col md={6}>
          <Form.Label>Terminal Service</Form.Label>
          <Form.Select value={termId} onChange={e=>setTermId(e.target.value)}>
            {termServices.map(s=>
              <option key={s.identifier} value={s.identifier}>
                {s.login} – {s.server}
              </option>
            )}
          </Form.Select>
        </Col>
      </Row>

      <Table bordered hover size="sm">
        <thead>
          <tr>
            <th>Terminal Symbol</th>
            <th>Manager Symbols</th>
          </tr>
        </thead>
        <tbody>
          {termSymbols.map(t => (
            <tr key={t}>
              <td>{t}</td>
              <td>
                <Select
                  isMulti
                  options={toOptions(mgrSymbols)}
                  value={(mapping[t]||[]).map(v=>({value:v,label:v}))}
                  onChange={handleChange(t)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="text-end">
        <Button onClick={save} disabled={loading}>
          Save Mappings
        </Button>
      </div>
    </Container>
  );
};

export default SymbolMappingPage;
