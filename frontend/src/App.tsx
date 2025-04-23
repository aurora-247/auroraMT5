// src/App.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import LoginPage from "./components/login";
import LiveDeals from "./pages/MT5Manager/LiveDeals";
import DealHistory from "./pages/MT5Manager/DealHistory";
import GroupConfigurations from "./pages/MT5Manager/GroupConfigurations";
import TerminalDealHistory from "./pages/MT5Terminal/DealHistory";
import Admin from "./pages/conf/admin";
import PL from "./pages/conf/P&L";      // <— your wrapped P&L page
import Mapping from "./pages/conf/MappingPage";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

const App: React.FC = () => (
  <div className="app-container">
    <Header />
    <main className="content-wrapper">
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/deals-live" element={<LiveDeals />} />
        <Route path="/deal-history" element={<DealHistory />} />
        <Route path="/terminal-deal-history" element={<TerminalDealHistory />} />
        <Route path="/group-configurations/:identifier" element={<GroupConfigurations />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/pl" element={<PL />} />           {/* use lowercase or match exactly */}
        <Route path="/mapping" element={<Mapping />} />
      </Routes>
    </main>
    <Footer />
  </div>
);

export default App;
