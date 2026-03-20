# EcoSort - Planta Recicladora Automatizada IoT

[![Universidad San Carlos de Guatemala](https://img.shields.io/badge/USAC-Ingeniería%20en%20Ciencias%20y%20Sistemas-blue)](https://www.usac.edu.gt)

## 📋 Tabla de Contenidos
- [Descripción del Proyecto](#-descripción-del-proyecto)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Características Principales](#-características-principales)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Requisitos Previos](#-requisitos-previos)
- [Configuración del Entorno](#-configuración-del-entorno)
  - [Variables de Entorno - Backend](#variables-de-entorno---backend-env)
  - [Variables de Entorno - Frontend](#variables-de-entorno---frontend-env)
- [Ejecución con Docker](#-ejecución-con-docker)
- [Estructura del Proyecto](#-estructura-del-proyecto)

---

## 📝 Descripción del Proyecto

**EcoSort** es un sistema IoT que simula una planta recicladora automatizada, evolucionando desde un prototipo local (Fase 1 con Arduino/Processing) hacia una arquitectura conectada a la nube (Fase 2). El sistema permite el monitoreo en tiempo real, almacenamiento histórico de datos y control remoto de una maqueta física a través de una aplicación web.

**Objetivo Principal:** Transformar un sistema embebido aislado en una plataforma IoT integral, demostrando la integración de hardware, protocolos de comunicación (MQTT/HTTP), servicios en la nube y visualización de datos.

## 🏗️ Arquitectura del Sistema

El proyecto está estructurado en cinco capas fundamentales:

1.  **Capa de Hardware (Maqueta Física):**
    *   Controlada por **Arduino** (sensores, actuadores, bandas, bodegas).
    *   Comunicación serial con la Raspberry Pi.

2.  **Capa de Gateway (Nodo Intermedio):**
    *   **Raspberry Pi**.
    *   Recibe datos vía serial desde Arduino.
    *   Publica/recibe eventos MQTT hacia/desde la nube.

3.  **Capa de Comunicación:**
    *   **MQTT:** Para eventos en tiempo real (estados, alarmas, comandos remotos).
    *   **HTTP:** Para consultas históricas, autenticación y servicios de la API REST.

4.  **Capa de Nube (Backend - Dockerizada):**
    *   **Backend (Node.js/Express):** Suscrito a tópicos MQTT, procesa eventos y expone una API REST.
    *   **Base de Datos NoSQL (MongoDB Atlas):** Almacenamiento persistente de eventos y KPIs.
    *   **Broker MQTT (Mosquitto):** Gestiona la comunicación en tiempo real.
    *   **Grafana:** Visualización de métricas y dashboards operativos.

5.  **Capa de Aplicación:**
    *   **Frontend (React + Vite):** Aplicación web para monitoreo en tiempo real, consultas históricas y panel de control remoto.

## ✨ Características Principales

-   **Monitoreo en Tiempo Real:** Visualización del estado de parqueos, puertas, bandas, bodegas y alarmas vía MQTT.
-   **Control Remoto:** Pausar líneas, abrir/cerrar accesos, activar modo emergencia desde la web.
-   **Autenticación:** Panel de control protegido con JWT.
-   **Base de Datos Histórica:** Almacena todos los eventos del sistema en MongoDB.
-   **Dashboard Analítico:** Métricas y KPIs (conteo de materiales, rechazos, throughput) en Grafana.
-   **Gateway IoT:** Raspberry Pi actuando como puente entre el hardware y la nube.
-   **Modificaciones Físicas:** Iluminación de planta y LEDs de estado en parqueos.

## 🛠️ Tecnologías Utilizadas

-   **Hardware:** Arduino, Raspberry Pi, Sensores, Actuadores.
-   **Backend:** Node.js, Express, Socket.io.
-   **Frontend:** React, Vite, Axios.
-   **Bases de Datos:** MongoDB Atlas.
-   **Comunicación:** MQTT (Mosquitto), HTTP, Serial.
-   **Visualización:** Grafana.
-   **Virtualización/Despliegue:** Docker, Docker Compose.
-   **Control de Versiones:** Git, GitHub.

## 📦 Requisitos Previos

-   Docker y Docker Compose instalados.
-   Node.js (v18+).
-   Cuenta en MongoDB Atlas (o instancia local de MongoDB).
-   Cuenta en SendGrid para envío de correos (opcional).
-   Maqueta física de EcoSort (Fase 1) y Raspberry Pi configurada.

## ⚙️ Configuración del Entorno

El proyecto utiliza dos archivos de configuración principales: `backend/.env` y `frontend/.env`. **Nunca subas estos archivos al repositorio. Debes crearlos manualmente en tu entorno local basándote en las siguientes plantillas.**

### Variables de Entorno - Backend (`.env`)

Crea un archivo llamado `.env` dentro de la carpeta `backend/` con las siguientes variables. Reemplaza los valores con los tuyos propios.

```dotenv
# Servidor
PORT=4000
NODE_ENV=development

# Frontend (para CORS y Socket.io)
FRONTEND_URL=http://localhost:5173

# MongoDB Atlas
# ⚠️ IMPORTANTE: Reemplaza con tu propia URI de conexión de MongoDB Atlas
MONGO_URI=mongodb+srv://<TU_USUARIO>:<TU_CONTRASEÑA>@<TU_CLUSTER>.mongodb.net/?retryWrites=true&w=majority
DB_NAME=ecosort_db

# JWT (JSON Web Tokens)
# ⚠️ IMPORTANTE: Cambia 'your_jwt_secret_key' por una clave segura y larga.
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# SendGrid (para notificaciones por correo - Opcional)
# ⚠️ Si no usas notificaciones, puedes dejar estos campos vacíos.
SENDGRID_API_KEY=TU_API_KEY_DE_SENDGRID
SENDGRID_FROM_EMAIL=tu_correo_remitente@dominio.com

# MQTT Broker (nombre del servicio en Docker)
MQTT_BROKER_URL=mqtt://mqtt:1883

# Grafana — API key para proteger los endpoints de /api/grafana/*
# ⚠️ IMPORTANTE: Cambia este valor por uno seguro. Este mismo valor debe ir en
# la configuración de Grafana como cabecera personalizada 'x-grafana-key'.
GRAFANA_API_KEY=ecosort_grafana_key_2026
```

### Variables de Entorno - Frontend (`.env`)

Crea un archivo llamado `.env` dentro de la carpeta `frontend/` con las siguientes variables.

```dotenv
# URL base de la API del backend (sin /api al final si ya está en la ruta)
VITE_API_URL=http://localhost:4000/api

# URL del dashboard público de Grafana (generado desde la interfaz de Grafana)
VITE_GRAFANA_DASHBOARD_URL=http://localhost:3000/d/ecosort-dashboard/ecosort-operational-dashboard?orgId=1&refresh=10s&kiosk
```

## 🐳 Ejecución con Docker

Una vez que hayas configurado los archivos `.env`, puedes levantar toda la infraestructura (Backend, Frontend, MQTT Broker, Grafana) con un solo comando.

1.  **Clona el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/ecosort.git
    cd ecosort
    ```

2.  **Crea los archivos `.env`** en las carpetas `backend` y `frontend` con los valores correctos.

3.  **Ejecuta Docker Compose:**
    ```bash
    docker-compose up --build
    ```

    *   La aplicación web estará disponible en: `http://localhost:5173`
    *   La API del backend en: `http://localhost:4000`
    *   El broker MQTT en: `mqtt://localhost:1883`
    *   Grafana en: `http://localhost:3000` (usuario: `admin`, contraseña: `admin` la primera vez)

4. **Ejecutar en la nube:**

🔥 Los puertos que se estan usando y se deben de abrir en el servio de nube son:

| Servicio | Puerto interno | Puerto externo | Uso                |
| -------- | -------------- | -------------- | ------------------ |
| Frontend | 80             | 80             | Web pública        |
| Backend  | 4000           | 4000           | API                |
| MQTT     | 1883           | 1883           | IoT / mensajes     |
| MQTT WS  | 9001           | 9001           | MQTT vía WebSocket |
| Grafana  | 3000           | 3000           | Dashboard          |

---


## 📁 Estructura del Proyecto

```
│   .gitignore
│   docker-compose.yml
│   LICENSE.md
│   README.md
│
├───backend
│   │   .dockerignore
│   │   .env
│   │   .gitignore
│   │   Dockerfile
│   │   package-lock.json
│   │   package.json
│   │   README.md
│   │   tsconfig.json
│   │
│   └───src
│       │   index.ts
│       │
│       ├───config
│       │       database.ts
│       │       mqtt.ts
│       │       socket.ts
│       │
│       ├───controllers
│       │       auth.controller.ts
│       │       control.controller.ts
│       │       grafana.controller.ts
│       │       monitoring.controller.ts
│       │
│       ├───middlewares
│       │       auth.middleware.ts
│       │       error.middleware.ts
│       │
│       ├───models
│       │       classificationResult.model.ts
│       │       commandLog.model.ts
│       │       sensorEvent.model.ts
│       │       user.model.ts
│       │
│       ├───mqtt
│       │   │   mqttSubscriber.ts
│       │   │
│       │   └───handlers
│       │           acceso.handler.ts
│       │           bandas.handler.ts
│       │           clasificador.handler.ts
│       │           parqueo.handler.ts
│       │           seguridad.handler.ts
│       │
│       ├───routes
│       │       auth.routes.ts
│       │       control.routes.ts
│       │       grafana.routes.ts
│       │       monitoring.routes.ts
│       │
│       ├───services
│       │       email.service.ts
│       │
│       ├───state
│       │       plantState.ts
│       │
│       ├───types
│       │       plant.types.ts
│       │       user.types.ts
│       │
│       └───utils
│               jwt.util.ts
│
├───Document
│   │   Diagramas.md
│   │   Endpoints de usuario.md
│   │   Endpoints.md
│   │   Grafana-Configuración.md
│   │   Grafana-Endpoints.md
│   │
│   └───img
│           arquitectura_ecosort.svg
│           database.jpg
│           database.svg
│           estado_global.jpg
│           flujos_endpoints.svg
│           grafana0.jpg
│           grafana1.jpg
│           grafana3.jpg
│           grafana4.jpg
│           grafana5.jpg
│           grafana6.jpg
│           grafana7.jpg
│           grafana8.jpg
│           grafana9.jpg
│
├───frontend
│   │   .dockerignore
│   │   .env
│   │   .gitignore
│   │   Dockerfile
│   │   eslint.config.js
│   │   index.html
│   │   nginx.conf
│   │   package-lock.json
│   │   package.json
│   │   postcss.config.js
│   │   README.md
│   │   tailwind.config.js
│   │   tsconfig.app.json
│   │   tsconfig.json
│   │   tsconfig.node.json
│   │   vite.config.ts
│   │
│   ├───dist
│   │   │   favicon.svg
│   │   │   icons.svg
│   │   │   index.html
│   │   │
│   │   └───assets
│   │           esm-Cj6yCwny.js
│   │           index-BwfqLAbX.css
│   │           index-ZY2QyoxD.js
│   │
│   ├───public
│   │       favicon.svg
│   │       icons.svg
│   │
│   └───src
│       │   App.css
│       │   App.tsx
│       │   index.css
│       │   main.tsx
│       │
│       ├───assets
│       │       hero.png
│       │       react.svg
│       │       vite.svg
│       │
│       ├───components
│       │       GrafanaDashboard.tsx
│       │       NavBar.tsx
│       │
│       ├───context
│       │       AuthContext.tsx
│       │
│       ├───hooks
│       │       useSocket.ts
│       │
│       ├───pages
│       │   │   Control.tsx
│       │   │   Graphs.tsx
│       │   │   Historical.tsx
│       │   │   Home.tsx
│       │   │   Monitoring.tsx
│       │   │   Profile.tsx
│       │   │
│       │   ├───auth
│       │   │       Login.tsx
│       │   │       Recovery.tsx
│       │   │       Register.tsx
│       │   │       Reset.tsx
│       │   │
│       │   └───error
│       │           NotFound.tsx
│       │           Unauthorized.tsx
│       │
│       ├───routes
│       │       AppRouter.tsx
│       │       PrivateRoute.tsx
│       │       PublicRoute.tsx
│       │
│       ├───services
│       │       auth.service.ts
│       │       plant.service.ts
│       │
│       ├───types
│       │       auth.types.ts
│       │       plant.types.ts
│       │
│       └───utils
│               authStorage.ts
│               AuthStorage.tsx
│
├───grafana
│   │   Dockerfile
│   │
│   └───provisioning
│       ├───dashboards
│       │       dashboard_config.yaml
│       │       ecosort-dashboard.json
│       │
│       └───datasources
│               datasource.yaml
│
├───mosquitto
│   ├───config
│   │       mosquitto.conf
│   │
│   ├───data
│   │       mosquitto.db
│   │
│   └───log
│           mosquitto.log
│
└───raspberry
        EcoSort.py
        instrucciones.txt
        setup_env.py
```
---
**Curso:** Arquitectura de Computadoras y Ensambladores 2 <br />
**Universidad San Carlos de Guatemala - Facultad de Ingeniería**