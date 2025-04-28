import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Accordion,
  Card,
  Table,
  Alert,
  Spinner,
  Form,
  Row,
  Col,
} from 'react-bootstrap';
import { FaSearch } from 'react-icons/fa';

interface CommissionTier {
  range_from: number;
  range_to: number;
  value: number;
}

interface Commission {
  name: string | null;
  tiers: CommissionTier[];
}

interface SymbolData {
  [key: string]: any; // flexible to display all symbol properties
}

interface GroupConfiguration {
  group_name: string;
  server_id: number;
  permissions: number;
  auth_mode: number;
  company: string;
  commissions: Commission[];
  symbols: SymbolData[];
}

const EnhancedGroupConfigurations: React.FC = () => {
  const { identifier } = useParams<{ identifier: string }>();
  const [groups, setGroups] = useState<GroupConfiguration[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [filterTerm, setFilterTerm] = useState<string>('');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/v1/mt5-manager/groups/${identifier}/group-configurations`
        );
        if (!res.ok) throw new Error(`Error: ${res.statusText}`);
        const data: GroupConfiguration[] = await res.json();
        setGroups(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [identifier]);

  const filtered = groups.filter(g =>
    g.group_name.toLowerCase().includes(filterTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="grow" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">
        Group Configurations for Manager: <span className="text-primary">{identifier}</span>
      </h2>

      <Form className="mb-3">
        <Form.Group controlId="filter">
          <Form.Label>
            <FaSearch /> Search Groups
          </Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter group name..."
            value={filterTerm}
            onChange={e => setFilterTerm(e.target.value)}
          />
        </Form.Group>
      </Form>

      {filtered.length === 0 ? (
        <Alert variant="info">No matching group configurations.</Alert>
      ) : (
        <Accordion defaultActiveKey="0">
          {filtered.map((group, gidx) => (
            <Accordion.Item eventKey={`${gidx}`} key={gidx} className="mb-4 shadow-sm">
              <Accordion.Header>{group.group_name}</Accordion.Header>
              <Accordion.Body>
                <Row className="mb-3">
                  <Col><strong>Server ID:</strong> {group.server_id}</Col>
                  <Col><strong>Permissions:</strong> {group.permissions}</Col>
                  <Col><strong>Auth Mode:</strong> {group.auth_mode}</Col>
                  <Col><strong>Company:</strong> {group.company}</Col>
                </Row>

                <h5>Symbols</h5>
                {group.symbols.length === 0 ? (
                  <p>No symbols available.</p>
                ) : (
                  <Accordion flush>
                    {group.symbols.map((sym, sidx) => (
                      <Accordion.Item eventKey={`${gidx}-${sidx}`} key={sidx} className="mb-2">
                        <Accordion.Header>{sym.path || `Symbol ${sidx + 1}`}</Accordion.Header>
                        <Accordion.Body>
                          <Table striped bordered size="sm" responsive>
                            <thead>
                              <tr>
                                <th>Property</th>
                                <th>Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(sym).map(([key, value]) => (
                                <tr key={key}>
                                  <td>{key}</td>
                                  <td>{String(value)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                )}

                <h5 className="mt-4">Commissions</h5>
                {group.commissions.length === 0 ? (
                  <p>No commissions available.</p>
                ) : (
                  group.commissions.map((comm, cidx) => (
                    <Card key={cidx} className="mb-3 border-info">
                      <Card.Header><strong>Name:</strong> {comm.name}</Card.Header>
                      <Card.Body>
                        {comm.tiers.length === 0 ? (
                          <p>No tiers available.</p>
                        ) : (
                          <Table bordered size="sm" responsive className="mb-0">
                            <thead>
                              <tr>
                                <th>Range From</th>
                                <th>Range To</th>
                                <th>Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {comm.tiers.map((tier, tidx) => (
                                <tr key={tidx}>
                                  <td>{tier.range_from}</td>
                                  <td>{tier.range_to}</td>
                                  <td>{tier.value}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        )}
                      </Card.Body>
                    </Card>
                  ))
                )}
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      )}
    </Container>
  );
};

export default EnhancedGroupConfigurations;