// login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Form, Button } from "react-bootstrap";




const LoginPage: React.FC = () => {
  const navigate = useNavigate(); // This hook now has access to Router context since LoginPage is rendered via App.tsx
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");


  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Replace the following with your actual authentication logic:
    if (username === "admin" && password === "admin") {
      navigate("/deals-live");  // Navigate to the live deals page on successful login.
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <Container className="py-4">
      <h1>Login</h1>
      <Form onSubmit={handleLogin}>
        <Form.Group controlId="formUsername" className="mb-3">
          <Form.Label>Username</Form.Label>
          <Form.Control
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Form.Group>
        <Form.Group controlId="formPassword" className="mb-3">
          <Form.Label>Password</Form.Label>
          <Form.Control
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Form.Group>
        <Button variant="primary" type="submit">
          Login
        </Button>
      </Form>
    </Container>
  );
};

export default LoginPage;
