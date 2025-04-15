import React, { useEffect, useState, useCallback } from "react";
import { Table, Alert, Spinner, Form, Container, Row, Col, Button } from "react-bootstrap";

interface Deal {
  ticket: number;
  login: number;
  symbol: string;
  action: string;
  volume: number;
  price: number;
  profit: number;
  commission: number;
  storage: number;
  time: number;
  [key: string]: any; // For dynamic property access
}

interface GroupedDeal {
  key: string;
  criteria: Record<string, any>;
  count: number;
  totalVolume: number;
  totalProfit: number;
  totalCommission: number;
  totalStorage: number;
  deals: Deal[];
}

interface ManagerAccount {
  identifier: string;
  server: string;
  login: number;
  connected: boolean;
}

const groupingOptions = [
  { value: "login", label: "Login" },
  { value: "symbol", label: "Symbol" },
  { value: "ticket", label: "Ticket" },
  { value: "action", label: "Action" }
];

const MAX_RETRIES = 5;
const RECONNECT_DELAY = 5000;

const LiveDeals: React.FC = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [groupCriteria, setGroupCriteria] = useState<string[]>([]);
  const [groupedDeals, setGroupedDeals] = useState<GroupedDeal[]>([]);
  const [accounts, setAccounts] = useState<ManagerAccount[]>([]);
  const [selectedIdentifier, setSelectedIdentifier] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Fetch available accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/mt5-manager/accounts");
      const data = await response.json();
      setAccounts(data.active_managers);
      if (data.active_managers.length > 0) {
        setSelectedIdentifier(data.active_managers[0].identifier);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setLastError("Failed to load accounts. Please refresh the page.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Group deals function
  const groupDeals = useCallback((dealsArr: Deal[], criteria: string[]): GroupedDeal[] => {
    const groups: { [key: string]: GroupedDeal } = {};

    dealsArr.forEach((deal) => {
      const key = criteria.map(crit => deal[crit]).join("||");
      if (!groups[key]) {
        groups[key] = {
          key,
          criteria: {},
          count: 0,
          totalVolume: 0,
          totalProfit: 0,
          totalCommission: 0,
          totalStorage: 0,
          deals: []
        };
        criteria.forEach(crit => {
          groups[key].criteria[crit] = deal[crit];
        });
      }
      groups[key].count++;
      groups[key].totalVolume += deal.volume / 10000;
      groups[key].totalProfit += deal.profit;
      groups[key].totalCommission += deal.commission;
      groups[key].totalStorage += deal.storage;
      groups[key].deals.push(deal);
    });

    return Object.values(groups);
  }, []);

  // Update grouped deals
  const updateGroupedDeals = useCallback(() => {
    if (groupCriteria.length > 0 && deals.length > 0) {
      setGroupedDeals(groupDeals(deals, groupCriteria));
    }
  }, [deals, groupCriteria, groupDeals]);

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (!selectedIdentifier) return;

    const ws = new WebSocket(`ws://127.0.0.1:8000/api/v1/mt5-manager/deals/ws/${selectedIdentifier}`);

    ws.onopen = () => {
      console.log("WebSocket connection opened.");
      setWsConnected(true);
      setRetryCount(0);
      setLastError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.deals) {
          setDeals(prevDeals => {
            const newDeals = [...data.deals, ...prevDeals].slice(0, 50);
            if (groupCriteria.length > 0) {
              setGroupedDeals(groupDeals(newDeals, groupCriteria));
            }
            return newDeals;
          });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
        setLastError("Failed to parse incoming data.");
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error observed:", error);
      setWsConnected(false);
      setLastError("Connection error occurred.");
    };

    ws.onclose = () => {
      console.log("WebSocket closed.");
      setWsConnected(false);

      if (retryCount < MAX_RETRIES) {
        setLastError(`Connection lost. Reconnecting in ${RECONNECT_DELAY/1000} seconds...`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          connectWebSocket();
        }, RECONNECT_DELAY);
      } else {
        setLastError("Max reconnection attempts reached. Please refresh the page.");
      }
    };

    setSocket(ws);
    return ws;
  }, [selectedIdentifier, groupCriteria, groupDeals, retryCount]);

  // Initialize connection and accounts
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Handle identifier change
  useEffect(() => {
    if (selectedIdentifier) {
      setDeals([]);
      setGroupedDeals([]);
      connectWebSocket();
    }
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [selectedIdentifier]);

  // Update grouped deals when criteria or deals change
  useEffect(() => {
    updateGroupedDeals();
  }, [groupCriteria, deals, updateGroupedDeals]);

  // Handle grouping criteria change
  const handleGroupingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = Array.from(e.target.selectedOptions, option => option.value);
    setGroupCriteria(options);
  };

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdentifier(e.target.value);
  };

  const handleManualReconnect = () => {
    setRetryCount(0);
    connectWebSocket();
  };

  const getRowStyle = (deal: Deal) => {
    if (deal.profit > 0) {
      return { backgroundColor: "#d4edda" }; // light green for profit
    } else if (deal.profit < 0) {
      return { backgroundColor: "#f8d7da" }; // light red for loss
    }
    return { backgroundColor: "#fff3cd" }; // light yellow for neutral
  };

  return (
    <Container fluid className="my-4 px-4">
      <Row className="mb-3">
        <Col>
          <h1>Live MT5 Deals Stream</h1>
        </Col>
        <Col xs="auto">
          {wsConnected ? (
            <Alert variant="success" className="py-1 my-1">WebSocket Connected</Alert>
          ) : (
            <Alert variant="danger" className="py-1 my-1 d-flex align-items-center gap-2">
              <span>WebSocket Disconnected</span>
              <Button variant="outline-light" size="sm" onClick={handleManualReconnect}>
                Reconnect
              </Button>
            </Alert>
          )}
        </Col>
      </Row>

      {lastError && (
        <Alert variant="warning" className="mb-3">
          {lastError}
        </Alert>
      )}

      {/* Account Selection */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Group controlId="accountSelection">
            <Form.Label>Select Account</Form.Label>
            <Form.Control
              as="select"
              value={selectedIdentifier}
              onChange={handleIdentifierChange}
              disabled={isLoading}
            >
              {isLoading ? (
                <option>Loading accounts...</option>
              ) : (
                accounts.map(account => (
                  <option key={account.identifier} value={account.identifier}>
                    {account.server} (Login: {account.login})
                  </option>
                ))
              )}
            </Form.Control>
          </Form.Group>
        </Col>
      </Row>

      {/* Grouping Options UI - Now visible */}
      <Row className="mb-3">
        <Col md={4}>
          <Form.Group controlId="groupingCriteria">
            <Form.Label>Group Deals By</Form.Label>
            <Form.Control
              as="select"
              multiple
              value={groupCriteria}
              onChange={handleGroupingChange}
              disabled={!selectedIdentifier || !wsConnected}
            >
              {groupingOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Form.Control>
            <Form.Text className="text-muted">
              Hold Ctrl/Cmd to select multiple options
            </Form.Text>
          </Form.Group>
        </Col>
      </Row>

      {/* Cumulative Grouped Deals Section */}
      {groupCriteria.length > 0 && groupedDeals.length > 0 && (
        <div className="mb-4">
          <h2>Cumulative Deals (Grouped by {groupCriteria.join(", ")})</h2>
          <Table striped bordered hover responsive size="sm" className="mb-4">
            <thead>
              <tr>
                {groupCriteria.map((crit, idx) => (
                  <th key={idx}>{crit.toUpperCase()}</th>
                ))}
                <th># Deals</th>
                <th>Total Volume</th>
                <th>Total Profit</th>
                <th>Total Commission</th>
                <th>Total Storage</th>
              </tr>
            </thead>
            <tbody>
              {groupedDeals.map((group, idx) => (
                <tr key={idx}>
                  {groupCriteria.map((crit, cidx) => (
                    <td key={cidx}>{group.criteria[crit]}</td>
                  ))}
                  <td>{group.count}</td>
                  <td>{group.totalVolume.toFixed(2)}</td>
                  <td style={{ color: group.totalProfit >= 0 ? "green" : "red" }}>
                    {group.totalProfit.toFixed(2)}
                  </td>
                  <td>{group.totalCommission.toFixed(2)}</td>
                  <td>{group.totalStorage.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* Live Deals Table - Always visible */}
      <div className="mb-4">
        <h2>Latest Deals</h2>
        {deals.length === 0 ? (
          <Alert variant="info">No deals available yet. {!wsConnected && "Waiting for connection..."}</Alert>
        ) : (
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Login</th>
                <th>Symbol</th>
                <th>Action</th>
                <th>Volume</th>
                <th>Price</th>
                <th>Profit</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal, index) => (
                <tr key={index} style={getRowStyle(deal)}>
                  <td>{deal.ticket}</td>
                  <td>{deal.login}</td>
                  <td>{deal.symbol}</td>
                  <td>{deal.action}</td>
                  <td>{(deal.volume / 10000).toFixed(2)}</td>
                  <td>{deal.price.toFixed(2)}</td>
                  <td style={{ color: deal.profit >= 0 ? "green" : "red" }}>
                    {deal.profit.toFixed(2)}
                  </td>
                  <td>{new Date(deal.time * 1000).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </Container>
  );
};

export default LiveDeals;