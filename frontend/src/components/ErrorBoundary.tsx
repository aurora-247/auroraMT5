// src/components/ErrorBoundary.tsx
import React, { ReactNode, ErrorInfo } from "react";
import { Container, Alert } from "react-bootstrap";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message:  string;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (
      this.state.hasError &&
      prevProps.children !== this.props.children
    ) {
      this.setState({ hasError: false, message: "" });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container className="py-4">
          <Alert variant="danger">
            <Alert.Heading>Something went wrong</Alert.Heading>
            <p>{this.state.message}</p>
          </Alert>
        </Container>
      );
    }

    return this.props.children;
  }
}
