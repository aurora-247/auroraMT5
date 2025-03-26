// src/components/Footer.tsx

import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-dark text-white text-center py-3 mt-4">
      <div className="container">
        <p>© {new Date().getFullYear()} MT5 Dashboard. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
