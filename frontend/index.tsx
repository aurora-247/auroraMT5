// src/App.tsx

import React from "react";
import Header from "./components/Header";
import LiveDeals from "./components/LiveDeals";
import Footer from "./components/Footer";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";

const App: React.FC = () => {
  return (
    <div>
      <Header />
      <LiveDeals />
      <Footer />
    </div>
  );
};

export default App;
