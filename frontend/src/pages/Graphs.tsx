import React from "react";
import GrafanaDashboard from "../components/GrafanaDashboard";

const Graphs: React.FC = () => {
  console.log("Dashboard URL:", import.meta.env.VITE_GRAFANA_DASHBOARD_URL); // Verificar que la URL se carga correctamente
  return (
    <div>
      <h1>Graphs Page</h1>
      <p>Dashboard de Grafana incrustado:</p>
      <GrafanaDashboard 
        dashboardUid={import.meta.env.VITE_GRAFANA_DASHBOARD_URL}
        width="100%"
        height={2300}
        refresh="30s"
        kiosk={true}
        theme="light"
      />
    </div>
  );
};

export default Graphs;