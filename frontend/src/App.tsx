import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import LiveDeals from "./components/LiveDeals";
import DealHistory from "./pages/DealHistory"; // Updated import to match file name
import Footer from "./components/Footer";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

const App: React.FC = () => {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<LiveDeals />} />
        <Route path="/deal-history" element={<DealHistory />} />
      </Routes>
      <Footer />
    </Router>
  );
};

export default App;
