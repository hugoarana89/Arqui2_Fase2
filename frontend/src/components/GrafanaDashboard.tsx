import React from 'react';

interface GrafanaDashboardProps {
  dashboardUid: string;
  height?: string | number;
  width?: string | number;
  refresh?: string;
  kiosk?: boolean;
  theme?: 'light' | 'dark';
}

const GrafanaDashboard: React.FC<GrafanaDashboardProps> = ({
  dashboardUid,
  height = 800,
  width = '100%',
  refresh = '30s',
  kiosk = true,
  theme = 'light'
}) => {
  // Construir URL con parámetros
  const baseUrl = dashboardUid;
  const params = new URLSearchParams({
    refresh: refresh,
    theme: theme
  });
  
  if (kiosk) {
    params.append('kiosk', '');
  }
  
  //const embedUrl = `${baseUrl}?${params.toString()}`;
    const embedUrl = `${baseUrl}`;
    console.log('Embed URL:', embedUrl); // Para depuración

  return (
    <div style={{ width, height, border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
      <iframe
        src={embedUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        allowFullScreen
        title="Grafana Dashboard"
      />
    </div>
  );
};

export default GrafanaDashboard;