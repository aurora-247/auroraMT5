import React, { useEffect, useState } from "react";

const PositionHistory: React.FC = () => {
  const [positions, setPositions] = useState<any[]>([]);

  async function fetchPositions() {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/v1/mt5-manager/groups/${encodeURIComponent(groupName)}/positions`);
      const data = await response.json();
      setPositions(data.positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
    }
  }

  useEffect(() => {
    fetchPositions();
  }, []);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "2rem" }}>
      <h1>MT5 Position History</h1>
      <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ddd" }}>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Login</th>
            <th>Symbol</th>
            <th>Volume</th>
            <th>Open Price</th>
            <th>Close Price</th>
            <th>Profit</th>
            <th>Time Open</th>
            <th>Time Close</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos, index) => (
            <tr key={index}>
              <td>{pos.ticket}</td>
              <td>{pos.login}</td>
              <td>{pos.symbol}</td>
              <td>{pos.volume}</td>
              <td>{pos.price_open}</td>
              <td>{pos.price_close}</td>
              <td style={{ color: pos.profit >= 0 ? "green" : "red" }}>{pos.profit}</td>
              <td>{pos.time_open}</td>
              <td>{pos.time_close}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PositionHistory;
