import React from "react";

// Your Grafana public dashboard URL
const GRAFANA_EMBED_URL = "http://localhost:3000/d-solo/c867cbfb-1f8b-407e-bd80-4286d5820bef/new-dashboard?orgId=1&from=1745732257265&to=1745753857265&timezone=browser&panelId=1&__feature.dashboardSceneSolo";

const Dashboards: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0', minHeight: '100vh' }}>
    <iframe
      src={GRAFANA_EMBED_URL}
      title="Dashboard"
      width="450"
      height="500"
      frameBorder="0"
      style={{ border: 'none', flex: 1 }}
    />
  </div>
);

export default Dashboards;