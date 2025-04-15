// src/App.tsx
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import LoginPage from './components/login'
import LiveDeals from './pages/LiveDeals'
import DealHistory from './pages/DealHistory'
import GroupConfigurations from './pages/GroupConfigurations'
import MT5ManagerConnection from './pages/MT5ManagerConnection'

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
          <Route path="/group-configurations/:identifier" element={<GroupConfigurations />} />
          <Route path="/mt5-manager" element={<MT5ManagerConnection />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};



export default App