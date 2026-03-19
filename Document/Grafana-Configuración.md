## Configuración de grafana

```yaml
version: "3.8"

services:
  # =============================
  # BACKEND
  # =============================
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: backend_app
    env_file:
      - ./backend/.env
    ports:
      - "4000:4000"
    depends_on:
      - mqtt
    restart: always
    networks:
      - app_network

  # =============================
  # FRONTEND
  # =============================
  frontend:
    build:
      context: ./frontend
    container_name: frontend
    env_file:
      - ./frontend/.env
    ports:
      - "5173:80"
    depends_on:
      - backend
    restart: always
    networks:
      - app_network

  # =============================
  # MQTT BROKER
  # =============================
  mqtt:
    image: eclipse-mosquitto
    container_name: mqtt_broker
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log
    restart: always
    networks:
      - app_network

  # =============================
  # GRAFANA
  # =============================
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_SECURITY_ALLOW_EMBEDDING=true
      - GF_INSTALL_PLUGINS=marcusolsson-json-datasource
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - backend
    restart: always
    networks:
      - app_network

volumes:
  grafana_data:

networks:
  app_network:
    driver: bridge
```

---

# 🚀 Cómo configurar grafana

## 1. Levantar todo

```bash
docker-compose up
```

---

## 2. Entrar a Grafana

El usuario y contraseña se pueden cambiar en el docker-compose.

* URL: [http://localhost:3000](http://localhost:3000)
* Usuario: `admin`
* Password: `admin`

Grafana pedirá cambiar las contraseña:

<div align="center">
  <img src="img/grafana0.jpg" alt="Cambiar contraseña en grafana" width="1000">
  <p><i>Figura 1: Cambiar contraseña en grafana.</i></p>
</div>


---

## 3. Configurar JSON API

En Grafana:

1. **Connections → Data sources**
2. Agregar: **JSON API**
3. URL:

```text
http://backend_app:4000
```

<div align="center">
  <img src="img/grafana1.jpg" alt="Configuración de grafana." width="1000">
  <p><i>Figura 2: Configuración de grafana.</i></p>
</div>

👉 Nota importante:

* Se usa `backend_app` (nombre del servicio Docker)
* NO `localhost`

---

## 4. Http Headers

Esta variable esta configurada en el backend en el archivo ".env" y sirve para proteger los endpoints de grafana ya que el puerto 4000 va a estar expuesto, entonces se usa un middleware para proteger los endpoints.

JSON API en Grafana, en la sección "Custom HTTP Headers" agregar:


```text
Header name:   x-grafana-key
Header value:  ecosort_grafana_key_2026
```

<div align="center">
  <img src="img/grafana3.jpg" alt="Configuración de grafana." width="1000">
  <p><i>Figura 4: Configuración de grafana.</i></p>
</div>

---

## 5. Url para ver si la configuración a sido guardada

```text
http://localhost:3000/api/datasources
```
---

## 6. Importar un dashboard ya hecho

<div align="center">
  <img src="img/grafana4.jpg" alt="Importar dashboard." width="1000">
  <p><i>Figura 5: Importación de dashboard.</i></p>
</div>

---

## 7. Cargar archivo de configuración

Se debe cargar el archivo ubicado en ./grafana-dashboard/ecosort-dashboard.json

<div align="center">
  <img src="img/grafana5.jpg" alt="Carga de archivo de configuración a grafana." width="1000">
  <p><i>Figura 6: Carga archivo de Configuración.</i></p>
</div>

---

## 8. Pruebas de funcionalidad

<div align="center">
  <img src="img/grafana6.jpg" alt="Gráfica de Materiales Procesados por Línea y Throughput del Sistema." width="1000">
  <p><i>Figura 7: Gráfica de Materiales Procesados por Línea y Throughput del Sistema.</i></p>
</div>

---

<div align="center">
  <img src="img/grafana7.jpg" alt="Gráfica de Detecciones del Clasificador por Tipo de Material y Ocupación de Parqueos." width="1000">
  <p><i>Figura 8: Gráfica de Detecciones del Clasificador por Tipo de Material y Ocupación de Parqueos.</i></p>
</div>

---

<div align="center">
  <img src="img/grafana8.jpg" alt="Gráfica de Actividad del Sistema y Eventos Críticos." width="1000">
  <p><i>Figura 9: Gráfica de Actividad del Sistema y Eventos Críticos.</i></p>
</div>

---

<div align="center">
  <img src="img/grafana9.jpg" alt="Gráfica de Indicadores Clave (KPIs)." width="1000">
  <p><i>Figura 10: Gráfica de Indicadores Clave (KPIs).</i></p>
</div>

---