// src/App.tsx
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import LoginPage from './components/login'
import LiveDeals from './pages/MT5Manager/LiveDeals.tsx'
import DealHistory from './pages/MT5Manager/DealHistory.tsx'
import GroupConfigurations from './pages/MT5Manager/GroupConfigurations.tsx'
import TerminalDealHistory from './pages/MT5Terminal/DealHistory.tsx'
import Admin from './pages/conf/admin.tsx'
import PL from './pages/conf/P&L.tsx'
import Mapping from './pages/conf/MappingPage.tsx'


import 'bootstrap/dist/css/bootstrap.min.css'
import './App.css'

const App = () => {
  return (
    <div className="app-container">
      <Header />
      <main className="content-wrapper">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/deals-live" element={<LiveDeals />} />
          <Route path="/deal-history" element={<DealHistory />} />
          <Route path="/terminal-deal-history" element={<TerminalDealHistory />} />
          <Route path="/group-configurations/:identifier" element={<GroupConfigurations />} />
          <Route path="/Admin" element={<Admin />} />
          <Route path="/PL" element={<PL />} />
          <Route path="/Mapping" element={<Mapping />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};



export default App