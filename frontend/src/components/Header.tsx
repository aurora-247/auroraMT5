// src/components/Header.tsx

import React from "react";
import { Navbar, Container, Nav } from "react-bootstrap";

const Header: React.FC = () => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg">
      <Container>
        <Navbar.Brand href="#">MT5 Dashboard</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="#">Home</Nav.Link>
            <Nav.Link href="#/deal-live">Deals</Nav.Link>
            <Nav.Link href="#">Positions</Nav.Link>
            <Nav.Link href="#">Symbols</Nav.Link>
             <Nav.Link href="/deal-history">Deals History</Nav.Link>

          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;
