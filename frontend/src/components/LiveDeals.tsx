// src/components/LiveDeals.tsx

import React, { useEffect, useState } from "react";
import { Table } from "react-bootstrap";

const LiveDeals: React.FC = () => {
  const [deals, setDeals] = useState<any[]>([]);

  useEffect(() => {
    // Make sure there is no extra newline character in the URL
    const socket = new WebSocket("ws://127.0.0.1:8000/api/v1/mt5-manager/deals/ws/1");

    socket.onopen = () => {
      console.log("WebSocket connection opened.");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.deals) {
          // Prepend new deals and keep only the latest 50
          setDeals((prevDeals) => [...data.deals, ...prevDeals].slice(0, 50));
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error observed:", error);
    };

    socket.onclose = () => {
      console.log("WebSocket closed. Reconnecting in 5 seconds...");
      setTimeout(() => window.location.reload(), 5000);
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="container my-4">
      <h1>Live MT5 Deals Stream</h1>
      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>Ticket</th>
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
            <tr key={index}>
              <td>{deal.ticket}</td>
              <td>{deal.symbol}</td>
              <td>{deal.action}</td>
              <td>{deal.volume ? Number(deal.volume) / 1000 : "N/A"}</td>
              <td>{deal.price}</td>
              <td style={{ color: deal.profit >= 0 ? "green" : "red" }}>{deal.profit}</td>
              <td>{new Date(deal.time * 1000).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default LiveDeals;
