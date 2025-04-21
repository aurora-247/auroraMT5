// src/pages/SymbolMappingPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Table,
  Button,
  Spinner,
  Alert,
  Row,
  Col,
  Form
} from 'react-bootstrap';
import Select, { ValueType } from 'react-select';

interface Option { value: string; label: string; }
interface SymbolMap { manager: string; terminal: string; }
interface ManagerAccount { identifier: string; name?: string; }
interface TerminalService { identifier: string; login: number; server: string; }

// --- Helper to build `Option[]` from a `string[]` ---
const toOptions = (arr: string[]): Option[] =>
  arr.map(s => ({ value: s, label: s }));

const SymbolMappingPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string|null>(null);

  // load available connections
  const [mgrAccounts, setMgrAccounts]     = useState<ManagerAccount[]>([]);
  const [termServices, setTermServices]   = useState<TerminalService[]>([]);
  const [mgrId, setMgrId]                 = useState<string>('');
  const [termId, setTermId]               = useState<string>('');

  // fetched symbols
  const [mgrSymbols,  setMgrSymbols]  = useState<string[]>([]);
  const [termSymbols, setTermSymbols] = useState<string[]>([]);

  // your mapping rows
  const [symMap, setSymMap] = useState<SymbolMap[]>([]);

  // ── initial load: connections ─────────────────────────
  useEffect(() => {
    async function loadConns() {
      try {
        setLoading(true);
        const [ mres, tres ] = await Promise.all([
          fetch('/api/v1/mt5-manager/accounts'),
          fetch('/api/v1/metatrader5/active')
        ]);
        const mjson = await mres.json();
        const tjson = await tres.json();
        setMgrAccounts(mjson.active_managers || []);
        setTermServices(tjson.active_services || []);
        // pick first by default
        setMgrId(mjson.active_managers?.[0]?.identifier || '');
        setTermId(tjson.active_services?.[0]?.identifier || '');
        setError(null);
      } catch(err) {
        console.error(err);
        setError('Failed to load connections');
      } finally {
        setLoading(false);
      }
    }
    loadConns();
  }, []);

  // ── fetch symbols when IDs change ──────────────────────
  useEffect(() => {
    if (!mgrId || !termId) return;
    async function loadSyms() {
      try {
        setLoading(true);
        const [ mgRes, tgRes ] = await Promise.all([
          fetch(`/api/v1/mt5-manager/groups/${mgrId}/group-configurations`),
          fetch(`/api/v1/metatrader5/${termId}/symbols`)
        ]);
        const mgj = await mgRes.json();
        const tgj = await tgRes.json();
        setMgrSymbols(mgj.map((g:any) => g.group_name));
        setTermSymbols(tgj.symbols.map((s:any) => s.name));
        setSymMap([]);              // reset mappings
        setError(null);
      } catch(err) {
        console.error(err);
        setError('Failed to load symbols');
      } finally {
        setLoading(false);
      }
    }
    loadSyms();
  }, [mgrId, termId]);

  // ── add/remove/update rows ─────────────────────────────
  const addRow = () =>
    setSymMap(ms => [...ms, { manager:'', terminal:'' }]);

  const removeRow = (idx:number) =>
    setSymMap(ms => ms.filter((_,i)=>i!==idx));

  const updateRow = (idx:number, key:keyof SymbolMap) =>
    (opt: ValueType<Option,null>) => {
      const sel = opt as Option | null;
      setSymMap(ms => {
        const copy = [...ms];
        copy[idx] = { ...copy[idx], [key]: sel?.value||'' };
        return copy;
      });
    };

  // ── save mappings ─────────────────────────────────────
  const save = async () => {
    try {
      setLoading(true);
      await fetch('/api/v1/mappings/symbols', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ managerId: mgrId, terminalId: termId, symbol_map: symMap })
      });
      alert('Symbol mappings saved');
    } catch {
      alert('Save failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center my-4"><Spinner animation="border"/></div>;
  if (error)   return <Alert variant="danger">{error}</Alert>;

  return (
    <Container className="py-4">
      <h1 className="mb-4">Symbol Mapping</h1>

      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>MT5‑Manager Account</Form.Label>
            <Form.Select value={mgrId} onChange={e=>setMgrId(e.target.value)}>
              {mgrAccounts.map(a=>
                <option key={a.identifier} value={a.identifier}>
                  {a.identifier}{a.name?` (${a.name})`:''}
                </option>
              )}
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group>
            <Form.Label>MetaTrader5 Service</Form.Label>
            <Form.Select value={termId} onChange={e=>setTermId(e.target.value)}>
              {termServices.map(s=>
                <option key={s.identifier} value={s.identifier}>
                  {s.login} – {s.server}
                </option>
              )}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      <Table bordered hover size="sm">
        <thead>
          <tr>
            <th>Manager Symbol</th>
            <th>Terminal Symbol</th>
            <th/>
          </tr>
        </thead>
        <tbody>
          {symMap.map((m,i)=>(
            <tr key={i}>
              <td style={{minWidth:200}}>
                <Select
                  options={toOptions(mgrSymbols)}
                  value={m.manager?{value:m.manager,label:m.manager}:null}
                  onChange={updateRow(i,'manager')}
                />
              </td>
              <td style={{minWidth:200}}>
                <Select
                  options={toOptions(termSymbols)}
                  value={m.terminal?{value:m.terminal,label:m.terminal}:null}
                  onChange={updateRow(i,'terminal')}
                />
              </td>
              <td className="text-center">
                <Button size="sm" variant="outline-danger" onClick={()=>removeRow(i)}>
                  ✕
                </Button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="text-center">
              <Button onClick={addRow}>+ Add Mapping</Button>
            </td>
          </tr>
        </tbody>
      </Table>

      <div className="text-end">
        <Button onClick={save} disabled={symMap.length===0}>
          Save Symbol Mappings
        </Button>
      </div>
    </Container>
  );
};

export default SymbolMappingPage;
