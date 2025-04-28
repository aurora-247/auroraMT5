// src/components/Header.tsx
import { NavLink } from 'react-router-dom';
import { Navbar, Container, Nav } from 'react-bootstrap';
import logo from '../assets/Logo.svg';

// Alternative: import { LinkContainer } from 'react-router-bootstrap';

const Header = () => {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
      <Container fluid>
        {/* Option 1: Using NavLink directly (recommended) */}
        <Navbar.Brand as={NavLink} to="/" className="d-flex align-items-center">
          <img
            src={logo}  // Replace with your logo path
            alt="MT5 Dashboard"
            width="30"
            height="30"
            className="d-inline-block align-top me-2"
          />
          MT5 Dashboard
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            {/* Option 1: Using NavLink */}
            <Nav.Link as={NavLink} to="/deals-live" className="px-3">
              Live Deals
            </Nav.Link>
            <Nav.Link as={NavLink} to="/deal-history" className="px-3">
              Deal History
            </Nav.Link>
            <Nav.Link as={NavLink} to="/group-configurations/1" className="px-3">
              Group Config
            </Nav.Link>
            <Nav.Link as={NavLink} to="/terminal-deal-history" className="px-3">
              Terminal Deals history
            </Nav.Link>
            <Nav.Link as={NavLink} to="/PL" className="px-3">
              P&L
            </Nav.Link>
            <Nav.Link as={NavLink} to="/Mapping" className="px-3">
              Mapping
            </Nav.Link>
            <Nav.Link as={NavLink} to="/Dashboards" className="px-3">
              Dashboards
            </Nav.Link>
            <Nav.Link as={NavLink} to="/admin" className="px-3">
              Admin
            </Nav.Link>



            {/*
            // Option 2: Using LinkContainer (alternative)
            <LinkContainer to="/deals-live">
              <Nav.Link className="px-3">Live Deals</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/deal-history">
              <Nav.Link className="px-3">Deal History</Nav.Link>
            </LinkContainer>
            <LinkContainer to="/group-configurations/1">
              <Nav.Link className="px-3">Group Config</Nav.Link>
            </LinkContainer>
            */}
          </Nav>

          {/* Right-aligned items */}
          <Nav>
            <Nav.Link as={NavLink} to="/profile" className="px-3">
              <i className="bi bi-person-circle me-1"></i>
              Profile
            </Nav.Link>
            <Nav.Link as={NavLink} to="/logout" className="px-3">
              <i className="bi bi-box-arrow-right me-1"></i>
              Logout
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header;