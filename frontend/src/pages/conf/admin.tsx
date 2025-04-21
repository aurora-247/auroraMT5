import React, { useState, useEffect } from 'react';
import {
  Container,
  Button,
  Form,
  Table,
  Alert,
  Spinner,
  Modal,
  Row,
  Col
} from 'react-bootstrap';

interface ManagerAccount {
  identifier: string;
  server: string;
  login: number;
  connected: boolean;
}
interface TerminalService {
  identifier: string;
  server: string;
  login: number;
  path: string;
  connected: boolean;
}

const MT5AdminPage: React.FC = () => {
  // state for managers
  const [managers, setManagers] = useState<ManagerAccount[]>([]);
  const [loadingManagers, setLoadingManagers] = useState(true);
  // state for terminals
  const [services, setServices] = useState<TerminalService[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  const [error, setError] = useState<string|null>(null);

  // modal
  const [showModal, setShowModal] = useState(false);
  const [connectionType, setConnectionType] = useState<'manager'|'terminal'>('manager');

  // form fields
  const [form, setForm] = useState({
    identifier: '',
    server: '',
    login: '',
    password: '',
    path: ''
  });

  // actionStatus can hold 'pending' | 'success' | 'error' keyed by e.g. "manager:1" or "terminal:1"
  const [actionStatus, setActionStatus] = useState<Record<string,string>>({});

  // fetch manager accounts
  const fetchManagers = async() => {
    try {
      setLoadingManagers(true);
      const res = await fetch('http://127.0.0.1:8000/api/v1/mt5-manager/accounts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setManagers(data.active_managers || []);
      setError(null);
    } catch(err:any) {
      setError('Failed to load manager accounts');
    } finally {
      setLoadingManagers(false);
    }
  };

  // fetch terminal services
  const fetchServices = async() => {
    try {
      setLoadingServices(true);
      const res = await fetch('http://127.0.0.1:8000/api/v1/metatrader5/active');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setServices(data.active_services || []);
      setError(null);
    } catch(err:any) {
      setError('Failed to load terminal services');
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    fetchManagers();
    fetchServices();
  }, []);

  // connect MT5 Manager
  const connectManager = async() => {
    const { identifier, server, login, password } = form;
    const key = `manager:${identifier}`;
    try {
      setActionStatus(s => ({ ...s, [key]:'pending' }));
      const url = new URL(`http://127.0.0.1:8000/api/v1/mt5-manager/accounts/${identifier}/connect`);
      url.searchParams.set('server', server);
      url.searchParams.set('login', login);
      url.searchParams.set('password', password);

      const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'accept':'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setActionStatus(s => ({ ...s, [key]:'success' }));
      setShowModal(false);
      await fetchManagers();
    } catch(err:any) {
      setActionStatus(s => ({ ...s, [key]:'error' }));
      setError(err.message||String(err));
    }
  };

  // disconnect MT5 Manager
  const disconnectManager = async(identifier: string) => {
    const key = `manager:${identifier}`;
    try {
      setActionStatus(s => ({ ...s, [key]:'pending' }));
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/mt5-manager/accounts/${identifier}/disconnect`,
        { method:'GET', headers:{ accept:'application/json' } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setActionStatus(s => ({ ...s, [key]:'success' }));
      await fetchManagers();
    } catch(err:any) {
      setActionStatus(s => ({ ...s, [key]:'error' }));
      setError(err.message||String(err));
    }
  };

  // connect MT5 Terminal
  const connectTerminal = async() => {
    const { identifier, server, login, password, path } = form;
    const key = `terminal:${identifier}`;
    try {
      setActionStatus(s => ({ ...s, [key]:'pending' }));
      const url = new URL(`http://127.0.0.1:8000/api/v1/metatrader5/${identifier}/connect`);
      url.searchParams.set('login', login);
      url.searchParams.set('password', password);
      url.searchParams.set('server', server);
      url.searchParams.set('path', path);

      const res = await fetch(url.toString(), {
        method:'GET',
        headers:{ accept:'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setActionStatus(s => ({ ...s, [key]:'success' }));
      setShowModal(false);
      await fetchServices();
    } catch(err:any) {
      setActionStatus(s => ({ ...s, [key]:'error' }));
      setError(err.message||String(err));
    }
  };

  // disconnect MT5 Terminal
  const disconnectService = async(identifier: string) => {
    const key = `terminal:${identifier}`;
    try {
      setActionStatus(s => ({ ...s, [key]:'pending' }));
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/metatrader5/${identifier}/disconnect`,
        { method:'GET', headers:{ accept:'application/json' } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setActionStatus(s => ({ ...s, [key]:'success' }));
      await fetchServices();
    } catch(err:any) {
      setActionStatus(s => ({ ...s, [key]:'error' }));
      setError(err.message||String(err));
    }
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">MT5 Admin</h1>
      {error && <Alert variant="danger" onClose={()=>setError(null)} dismissible>{error}</Alert>}

      <h2>Manager Connections</h2>
      <Button
        variant="primary"
        className="mb-3 me-2"
        onClick={() => {
          setConnectionType('manager');
          setForm({ identifier:'', server:'', login:'', password:'', path:'' });
          setShowModal(true);
        }}
      >
        New Manager Connection
      </Button>
      {loadingManagers ? (
        <Spinner animation="border" />
      ) : managers.length===0 ? (
        <Alert variant="info">No manager accounts.</Alert>
      ) : (
        <Table striped bordered hover responsive className="mb-4">
          <thead className="table-dark">
            <tr>
              <th>ID</th><th>Server</th><th>Login</th><th>Connected</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {managers.map(m => {
              const key = `manager:${m.identifier}`;
              return (
                <tr key={m.identifier}>
                  <td>{m.identifier}</td>
                  <td>{m.server}</td>
                  <td>{m.login}</td>
                  <td>
                    {m.connected
                      ? <span className="badge bg-success">Yes</span>
                      : <span className="badge bg-secondary">No</span>}
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant={m.connected ? 'outline-danger':'outline-success'}
                      onClick={() =>
                        m.connected
                          ? disconnectManager(m.identifier)
                          : connectManager()
                      }
                      disabled={actionStatus[key]==='pending'}
                    >
                      {actionStatus[key]==='pending'
                        ? <Spinner animation="grow" size="sm"/>
                        : (m.connected ? 'Disconnect' : 'Connect')}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <h2>Terminal Services</h2>
      <Button
        variant="primary"
        className="mb-3"
        onClick={() => {
          setConnectionType('terminal');
          setForm({ identifier:'', server:'', login:'', password:'', path:'' });
          setShowModal(true);
        }}
      >
        New Terminal Connection
      </Button>
      {loadingServices ? (
        <Spinner animation="border" />
      ) : services.length===0 ? (
        <Alert variant="info">No terminal services.</Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead className="table-dark">
            <tr>
              <th>ID</th><th>Server</th><th>Login</th><th>Path</th><th>Connected</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {services.map(s => {
              const key = `terminal:${s.identifier}`;
              return (
                <tr key={s.identifier}>
                  <td>{s.identifier}</td>
                  <td>{s.server}</td>
                  <td>{s.login}</td>
                  <td>{s.path}</td>
                  <td>
                    {s.connected
                      ? <span className="badge bg-success">Yes</span>
                      : <span className="badge bg-secondary">No</span>}
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant={s.connected ? 'outline-danger':'outline-success'}
                      onClick={() =>
                        s.connected
                          ? disconnectService(s.identifier)
                          : connectTerminal()
                      }
                      disabled={actionStatus[key]==='pending'}
                    >
                      {actionStatus[key]==='pending'
                        ? <Spinner animation="grow" size="sm"/>
                        : (s.connected ? 'Disconnect':'Connect')}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {/* shared modal */}
      <Modal show={showModal} onHide={()=>setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {connectionType === 'manager'
              ? 'Connect MT5 Manager'
              : 'Connect MT5 Terminal'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={e => {
            e.preventDefault();
            connectionType==='manager'
              ? connectManager()
              : connectTerminal();
          }}>
            <Form.Group className="mb-3">
              <Form.Label>Identifier</Form.Label>
              <Form.Control
                name="identifier"
                value={form.identifier}
                onChange={e=>setForm({...form, identifier:e.target.value})}
                required
              />
            </Form.Group>
            <Row>
              <Col md={6} className="mb-3">
                <Form.Label>Login</Form.Label>
                <Form.Control
                  name="login"
                  type="text"
                  value={form.login}
                  onChange={e=>setForm({...form, login:e.target.value})}
                  required
                />
              </Col>
              <Col md={6} className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={e=>setForm({...form, password:e.target.value})}
                  required
                />
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Server</Form.Label>
              <Form.Control
                name="server"
                value={form.server}
                onChange={e=>setForm({...form, server:e.target.value})}
                required
              />
            </Form.Group>
            {connectionType==='terminal' && (
              <Form.Group className="mb-3">
                <Form.Label>Path</Form.Label>
                <Form.Control
                  name="path"
                  value={form.path}
                  onChange={e=>setForm({...form, path:e.target.value})}
                  required
                />
              </Form.Group>
            )}
            <div className="d-flex justify-content-end">
              <Button
                variant="secondary"
                onClick={()=>setShowModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                className="ms-2"
                disabled={
                  actionStatus[connectionType+':'+form.identifier] === 'pending'
                }
              >
                {actionStatus[connectionType+':'+form.identifier] === 'pending'
                  ? <>
                      <Spinner as="span" animation="border" size="sm"/>
                      <span className="ms-2">Connecting…</span>
                    </>
                  : 'Connect'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default MT5AdminPage;
