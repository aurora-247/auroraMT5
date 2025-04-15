// GroupConfigurations.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Table, Alert, Spinner } from 'react-bootstrap';

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
  path: string | null;
  trade_mode: number | null;
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

const GroupConfigurations: React.FC = () => {
  // Retrieve the manager identifier from the URL
  const { identifier } = useParams<{ identifier: string }>();
  const [groups, setGroups] = useState<GroupConfiguration[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:8000/api/v1/mt5-manager/groups/${identifier}/group-configurations`
        );
        if (!response.ok) {
          throw new Error(`Error fetching groups: ${response.statusText}`);
        }
        const data = await response.json();
        setGroups(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, [identifier]);

  if (loading) {
    return (
      <Container className="py-4">
        <Spinner animation="border" /> Loading group configurations...
      </Container>
    );
  }
  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h1 className="mb-4">Group Configurations for Manager: {identifier}</h1>
      {groups.length === 0 ? (
        <Alert variant="info">No group configurations found.</Alert>
      ) : (
        groups.map((group, idx) => (
          <div key={idx} className="mb-4">
            <h3>{group.group_name}</h3>
            <p>
              <strong>Server ID:</strong> {group.server_id} &nbsp; | &nbsp;
              <strong>Permissions:</strong> {group.permissions} &nbsp; | &nbsp;
              <strong>Auth Mode:</strong> {group.auth_mode} &nbsp; | &nbsp;
              <strong>Company:</strong> {group.company}
            </p>
            <h5>Symbols</h5>
            {group.symbols.length === 0 ? (
              <p>No symbols available.</p>
            ) : (
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Path</th>
                    <th>Trade Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {group.symbols.map((symbol, sidx) => (
                    <tr key={sidx}>
                      <td>{symbol.path}</td>
                      <td>{symbol.trade_mode}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <h5>Commissions</h5>
            {group.commissions.length === 0 ? (
              <p>No commissions available.</p>
            ) : (
              group.commissions.map((comm, cidx) => (
                <div key={cidx} className="mb-3">
                  <p>
                    <strong>Name:</strong> {comm.name}
                  </p>
                  {comm.tiers.length === 0 ? (
                    <p>No tiers available.</p>
                  ) : (
                    <Table striped bordered hover size="sm">
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
                </div>
              ))
            )}
          </div>
        ))
      )}
    </Container>
  );
};

export default GroupConfigurations;