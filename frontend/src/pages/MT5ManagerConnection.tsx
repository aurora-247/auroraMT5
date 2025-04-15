import React, { useState, useEffect } from 'react';
import {
  Container,
  Button,
  Form,
  Table,
  Alert,
  Spinner,
  Row,
  Col,
  Card,
  Modal
} from 'react-bootstrap';

interface ManagerAccount {
  identifier: string;
  server: string;
  login: number;
  connected: boolean;
}

const MT5ManagerConnection: React.FC = () => {
  const [accounts, setAccounts] = useState<ManagerAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Record<string, string>>({});
  const [showConnectionForm, setShowConnectionForm] = useState(false);
  const [formData, setFormData] = useState({
    identifier: '',
    server: '',
    login: '',
    password: ''
  });

  // Fetch connected accounts
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/v1/mt5-manager/accounts');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setAccounts(data.active_managers || []);
      setError(null);
    } catch (err) {
      setError('Failed to fetch accounts. Please try again.');
      console.error('Error fetching accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Connect to MT5 Manager
  const connectToManager = async () => {
    const { identifier, server, login, password } = formData;
    try {
      setConnectionStatus(prev => ({ ...prev, [identifier]: 'connecting' }));

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/mt5-manager/accounts/${identifier}/connect?` +
        `server=${encodeURIComponent(server)}&` +
        `login=${encodeURIComponent(login)}&` +
        `password=${encodeURIComponent(password)}`,
        {
          method: 'POST',
          headers: { 'accept': 'application/json' }
        }
      );

      if (!response.ok) throw new Error(await response.text());

      setConnectionStatus(prev => ({ ...prev, [identifier]: 'connected' }));
      setShowConnectionForm(false);
      await fetchAccounts();
    } catch (err) {
      setConnectionStatus(prev => ({ ...prev, [identifier]: 'failed' }));
      setError(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Disconnect from MT5 Manager
  const disconnectManager = async (identifier: string) => {
    try {
      setConnectionStatus(prev => ({ ...prev, [identifier]: 'disconnecting' }));

      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/mt5-manager/accounts/${identifier}/disconnect`,
        { method: 'GET', headers: { 'accept': 'application/json' } }
      );

      if (!response.ok) throw new Error(await response.text());

      setConnectionStatus(prev => ({ ...prev, [identifier]: 'disconnected' }));
      await fetchAccounts();
    } catch (err) {
      setConnectionStatus(prev => ({ ...prev, [identifier]: 'disconnect-failed' }));
      setError(`Disconnection failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    connectToManager();
  };

  // Reset form and open modal
  const handleShowForm = () => {
    setFormData({
      identifier: '',
      server: '',
      login: '',
      password: ''
    });
    setShowConnectionForm(true);
  };

  // Initial data fetch
  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <Container className="py-4">
      <h1 className="mb-4">MT5 Manager Connection</h1>

      {/* Connection Button */}
      <Button variant="primary" onClick={handleShowForm} className="mb-4">
        <i className="bi bi-plus-circle me-2"></i>New Connection
      </Button>

      {/* Connection Modal */}
      <Modal show={showConnectionForm} onHide={() => setShowConnectionForm(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Connect to MT5 Manager</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Connection ID</Form.Label>
              <Form.Control
                type="text"
                name="identifier"
                value={formData.identifier}
                onChange={handleInputChange}
                placeholder="e.g., 1"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Server</Form.Label>
              <Form.Control
                type="text"
                name="server"
                value={formData.server}
                onChange={handleInputChange}
                placeholder="e.g., trade.mahfaza.com.jo"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Login</Form.Label>
              <Form.Control
                type="text"
                name="login"
                value={formData.login}
                onChange={handleInputChange}
                placeholder="e.g., 1010"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password"
                required
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowConnectionForm(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={connectionStatus[formData.identifier] === 'connecting'}
              >
                {connectionStatus[formData.identifier] === 'connecting' ? (
                  <>
                    <Spinner as="span" size="sm" animation="border" role="status" />
                    <span className="ms-2">Connecting...</span>
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Status Messages */}
      {connectionStatus['1'] === 'connected' && (
        <Alert variant="success" className="mb-4">
          Successfully connected to MT5 Manager
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="danger" className="mb-4" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}

      {/* Connected Managers Table */}
      <h2 className="mb-3">Manager Connections</h2>
      {loading ? (
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      ) : accounts.length === 0 ? (
        <Alert variant="info">No active connections. Create a new connection above.</Alert>
      ) : (
        <>
          <Table striped bordered hover responsive className="mb-4">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Server</th>
                <th>Login</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.identifier}>
                  <td>{account.identifier}</td>
                  <td>{account.server}</td>
                  <td>{account.login}</td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      {account.connected ? (
                        <>
                          <span className="badge bg-success">Connected</span>
                          <Spinner
                            animation="grow"
                            size="sm"
                            className={connectionStatus[account.identifier] === 'disconnecting' ? '' : 'd-none'}
                          />
                        </>
                      ) : (
                        <>
                          <span className="badge bg-danger">Disconnected</span>
                          <Spinner
                            animation="grow"
                            size="sm"
                            className={connectionStatus[account.identifier] === 'connecting' ? '' : 'd-none'}
                          />
                        </>
                      )}
                    </div>
                    {connectionStatus[account.identifier] === 'disconnect-failed' && (
                      <small className="text-warning">Disconnect failed</small>
                    )}
                  </td>
                  <td>
                    <Button
                      variant={account.connected ? 'outline-danger' : 'outline-success'}
                      size="sm"
                      onClick={() => account.connected
                        ? disconnectManager(account.identifier)
                        : handleShowForm()
                      }
                      disabled={
                        connectionStatus[account.identifier] === 'connecting' ||
                        connectionStatus[account.identifier] === 'disconnecting'
                      }
                    >
                      {account.connected ? 'Disconnect' : 'Reconnect'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>

          <Button variant="outline-primary" onClick={fetchAccounts}>
            <i className="bi bi-arrow-clockwise me-2"></i>Refresh List
          </Button>
        </>
      )}
    </Container>
  );
};

export default MT5ManagerConnection;