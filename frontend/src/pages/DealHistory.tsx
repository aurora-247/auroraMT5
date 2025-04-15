import React, { useEffect, useState } from "react";
import {
  Form,
  Button,
  Table,
  Container,
  Row,
  Col,
  Pagination,
  Spinner,
  Alert
} from "react-bootstrap";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import Select from "react-select";

// Define interfaces based on expected API response
interface Deal {
  ticket: number;
  external_id: string;
  login: number;
  dealer: number;
  order: number;
  action: string;
  entry: string;
  digits: number;
  digits_currency: number;
  contract_size: number;
  time: number;
  symbol: string;
  price: number;
  price_sl: number;
  price_tp: number;
  volume: number;
  volume_ext: number;
  volume_closed: number;
  volume_closed_ext: number;
  profit: number;
  value: number;
  storage: number;
  commission: number;
  fee: number;
  rate_profit: number;
  rate_margin: number;
  expert_id: number;
  position_id: number;
  comment: string;
  api_data_set: any;
  api_data_update: any;
  api_data_next: any;
  api_data_get: any;
  api_data_clear: any;
  api_data_clear_all: any;
  profit_raw: number;
  price_position: number;
  tick_value: number;
  tick_size: number;
  flags: number;
  time_msc: number;
  reason: string;
  gateway: string;
  price_gateway: number;
  market_bid: number;
  market_ask: number;
  market_last: number;
  modification_flags: string;
}

interface GroupTotals {
  total_volume: number;
  total_profit: number;
  total_commission: number;
  total_storage: number;
}

interface GroupData {
  symbol: string;
  deals: Deal[];
  totals: GroupTotals;
}

interface ApiResponse {
  deals: Deal[];
}

interface Account {
  identifier: string;
  name?: string;
}

interface GroupConfiguration {
  group_name: string;
  server_id: number;
  permissions: number;
  auth_mode: number;
  company: string;
  commissions: any[];
  symbols: {
    path: string;
    trade_mode: number;
  }[];
}

// Option type for react-select
interface Option {
  value: string;
  label: string;
}

const PAGE_SIZE = 100;

// Helper function to format a Date object in "YYYY-MM-DDTHH:MM" format for datetime-local
const formatDateTimeLocal = (date: Date): string => {
  const pad = (num: number) => (num < 10 ? `0${num}` : num);
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const DealHistory: React.FC = () => {
  // States for deal history and chart
  const [groupedData, setGroupedData] = useState<GroupData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter parameters
  const [dateFrom, setDateFrom] = useState<string>(
    formatDateTimeLocal(new Date(Date.now() - 86400 * 1000))
  );
  const [dateTo, setDateTo] = useState<string>(formatDateTimeLocal(new Date()));

  // Active connection state
  const [identifiers, setIdentifiers] = useState<string[]>([]);
  const [selectedIdentifier, setSelectedIdentifier] = useState<string>("");

  // Group options & selection using react-select
  const [groupOptions, setGroupOptions] = useState<Option[]>([]);
  const [selectedGroupOptions, setSelectedGroupOptions] = useState<Option[]>([]);
  const [loadingGroups, setLoadingGroups] = useState<boolean>(false);

  // Group deals by symbol (unchanged)
  const groupDealsBySymbol = (deals: Deal[]): GroupData[] => {
    const groups: { [key: string]: GroupData } = {};
    deals.forEach((deal) => {
      const symbol = deal.symbol || "Unknown";
      if (!groups[symbol]) {
        groups[symbol] = {
          symbol,
          deals: [],
          totals: {
            total_volume: 0,
            total_profit: 0,
            total_commission: 0,
            total_storage: 0,
          }
        };
      }
      groups[symbol].deals.push(deal);
      groups[symbol].totals.total_volume += deal.volume;
      groups[symbol].totals.total_profit += deal.profit;
      groups[symbol].totals.total_commission += deal.commission;
      groups[symbol].totals.total_storage += deal.storage;
    });
    return Object.values(groups);
  };

  // Fetch active connections from accounts endpoint
  const fetchActiveConnections = () => {
    fetch("http://127.0.0.1:8000/api/v1/mt5-manager/accounts/")
      .then((res) => res.json())
      .then((data: { active_managers: Account[] }) => {
        const ids = data.active_managers.map((account) => account.identifier);
        setIdentifiers(ids);
        if (ids.length > 0 && !selectedIdentifier) {
          setSelectedIdentifier(ids[0]);
        }
      })
      .catch((err) => {
        console.error("Error fetching active accounts:", err);
      });
  };

  // Fetch group configurations to populate group options
  const fetchGroupConfigurations = async (identifier: string) => {
    try {
      setLoadingGroups(true);
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/mt5-manager/groups/${identifier}/group-configurations`
      );
      const data: GroupConfiguration[] = await response.json();
      // Map group configurations to an array of options
      const options = data.map((config) => ({
        value: config.group_name,
        label: config.group_name
      }));
      setGroupOptions(options);
      // Set default selected groups if none selected
      if (selectedGroupOptions.length === 0 && options.length > 0) {
        setSelectedGroupOptions([options[0]]);
      }
    } catch (err) {
      console.error("Error fetching group configurations:", err);
      setGroupOptions([]);
    } finally {
      setLoadingGroups(false);
    }
  };

  // Fetch deal history using selected parameters
  const fetchData = () => {
    if (!selectedIdentifier) {
      console.error("No identifier selected");
      return;
    }
    const groupsParam = selectedGroupOptions
      .map((option) => encodeURIComponent(option.value))
      .join(",");
    const url = `http://127.0.0.1:8000/api/v1/mt5-manager/deals/${selectedIdentifier}/by-group?groups=${groupsParam}&date_from=${encodeURIComponent(
      dateFrom
    )}&date_to=${encodeURIComponent(dateTo)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        const groups = groupDealsBySymbol(data.deals);
        setGroupedData(groups);
        if (groups.length > 0) {
          setSelectedSymbol(groups[0].symbol);
        } else {
          setSelectedSymbol("");
        }
        setCurrentPage(1);
      })
      .catch((err) => {
        console.error("Error fetching deal history:", err);
      });
  };

  useEffect(() => {
    fetchActiveConnections();
  }, []);

  useEffect(() => {
    if (selectedIdentifier) {
      fetchGroupConfigurations(selectedIdentifier);
      fetchData();
    }
  }, [selectedIdentifier]);

  // Handler for when identifier changes
  const handleIdentifierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedIdentifier(e.target.value);
  };

  // When the react-select groups change, update state
  const handleGroupSelectChange = (options: Option[] | null) => {
    setSelectedGroupOptions(options || []);
  };

  const handleSymbolClick = (symbol: string) => {
    setSelectedSymbol(symbol);
    setCurrentPage(1);
  };

  const getChartData = () => {
    const labels = groupedData.map((group) => group.symbol);
    return {
      labels,
      datasets: [
        {
          label: "Total Volume",
          data: groupedData.map((group) => group.totals.total_volume),
          backgroundColor: "rgba(75, 192, 192, 0.6)"
        },
        {
          label: "Total Profit",
          data: groupedData.map((group) => group.totals.total_profit),
          backgroundColor: "rgba(54, 162, 235, 0.6)"
        },
        {
          label: "Total Commission",
          data: groupedData.map((group) => group.totals.total_commission),
          backgroundColor: "rgba(255, 206, 86, 0.6)"
        },
        {
          label: "Total Storage",
          data: groupedData.map((group) => group.totals.total_storage),
          backgroundColor: "rgba(255, 99, 132, 0.6)"
        }
      ]
    };
  };

  const renderSummaryTable = () => {
    if (!groupedData || groupedData.length === 0) {
      return <div>No summary data available.</div>;
    }
    return (
      <Table bordered hover className="mb-4">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Total Volume</th>
            <th>Total Profit</th>
            <th>Total Commission</th>
            <th>Total Storage</th>
          </tr>
        </thead>
        <tbody>
          {groupedData.map((group) => (
            <tr
              key={group.symbol}
              onClick={() => handleSymbolClick(group.symbol)}
              style={{
                cursor: "pointer",
                backgroundColor:
                  selectedSymbol === group.symbol ? "#f0f0f0" : "white"
              }}
            >
              <td>{group.symbol}</td>
              <td>{group.totals.total_volume}</td>
              <td>{group.totals.total_profit}</td>
              <td>{group.totals.total_commission}</td>
              <td>{group.totals.total_storage}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderDealTable = () => {
    if (!groupedData || groupedData.length === 0) {
      return <p>No deal history data available.</p>;
    }
    const group = groupedData.find((g) => g.symbol === selectedSymbol);
    if (!group) return <p>No data for selected symbol.</p>;
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const paginatedDeals = group.deals.slice(startIndex, startIndex + PAGE_SIZE);
    const totalPages = Math.ceil(group.deals.length / PAGE_SIZE);
    return (
      <>
        <Table bordered hover className="mb-4">
          <thead>
            <tr>
              <td>Login</td>
              <th>Ticket</th>
              <th>Volume</th>
              <th>Profit</th>
              <th>Commission</th>
              <th>Storage</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {paginatedDeals.map((deal, index) => (
              <tr key={index}>
                <td>{deal.login}</td>
                <td>{deal.ticket}</td>
                <td>{deal.volume}</td>
                <td>{deal.profit}</td>
                <td>{deal.commission}</td>
                <td>{deal.storage}</td>
                <td>{new Date(deal.time * 1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </Table>
        <Pagination className="justify-content-center">
          <Pagination.Prev
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          />
          <Pagination.Item active>{`Page ${currentPage} of ${totalPages}`}</Pagination.Item>
          <Pagination.Next
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          />
        </Pagination>
      </>
    );
  };

  return (
    <Container className="py-4">
      <h1 className="mb-4">Deal History</h1>
      <Form
        onSubmit={(e) => {
          e.preventDefault();
          fetchData();
        }}
        className="mb-4"
      >
        <Row className="align-items-end">
          {/* Identifier Dropdown */}
          <Col md={3}>
            <Form.Group controlId="formIdentifier" className="mb-3">
              <Form.Label>Identifier</Form.Label>
              <Form.Control as="select" value={selectedIdentifier} onChange={handleIdentifierChange}>
                {identifiers.length > 0 ? (
                  identifiers.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))
                ) : (
                  <option value="">No active connections</option>
                )}
              </Form.Control>
            </Form.Group>
          </Col>
          {/* Groups Multi-select using react-select with internal search */}
          <Col md={3}>
            <Form.Group controlId="formGroups" className="mb-3">
              <Form.Label>Groups</Form.Label>
              {loadingGroups ? (
                <div className="d-flex align-items-center">
                  <Spinner animation="border" size="sm" className="me-2" />
                  <span>Loading groups...</span>
                </div>
              ) : (
                <Select
                  options={groupOptions}
                  isMulti
                  placeholder="Select groups..."
                  value={selectedGroupOptions}
                  onChange={handleGroupSelectChange}
                />
              )}
            </Form.Group>
          </Col>
          {/* Date From Picker */}
          <Col md={3}>
            <Form.Group controlId="formDateFrom" className="mb-3">
              <Form.Label>Date From</Form.Label>
              <Form.Control
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </Form.Group>
          </Col>
          {/* Date To Picker */}
          <Col md={3}>
            <Form.Group controlId="formDateTo" className="mb-3">
              <Form.Label>Date To</Form.Label>
              <Form.Control
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </Form.Group>
          </Col>
          {/* Apply Filters Button */}
          <Col md={12}>
            <Button variant="primary" type="submit">
              Apply Filters
            </Button>
          </Col>
        </Row>
      </Form>
      {/* Chart Section */}
      {groupedData.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Bar
              data={getChartData()}
              options={{
                responsive: true,
                plugins: {
                  legend: { position: "top" }
                }
              }}
            />
          </Col>
        </Row>
      )}
      {renderSummaryTable()}
      <h2 className="mb-3">Deals for Symbol: {selectedSymbol}</h2>
      {renderDealTable()}
    </Container>
  );
};

export default DealHistory;
