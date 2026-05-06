# EcoSort - Planta Recicladora Automatizada IoT (Fase 3)

[![Universidad San Carlos de Guatemala](https://img.shields.io/badge/USAC-Ingeniería%20en%20Ciencias%20y%20Sistemas-blue)](https://www.usac.edu.gt)

## 📋 Tabla de Contenidos

* [Descripción del Proyecto](#-descripción-del-proyecto)
* [Arquitectura del Sistema](#-arquitectura-del-sistema)
* [Características Principales](#-características-principales)
* [Nuevas Características - Fase 3](#-nuevas-características---fase-3)
* [Tecnologías Utilizadas](#-tecnologías-utilizadas)
* [Requisitos Previos](#-requisitos-previos)
* [Configuración del Entorno](#-configuración-del-entorno)
* [Ejecución con Docker](#-ejecución-con-docker)

---

## 📝 Descripción del Proyecto

**EcoSort** evoluciona en su **Fase 3** hacia una plataforma IoT inteligente, incorporando capacidades de **Machine Learning, Visión Computacional y análisis avanzado de datos** sobre la arquitectura previamente desarrollada.

El sistema ahora no solo monitorea y controla, sino que también:

* **Detecta condiciones de seguridad automáticamente**
* **Reconoce vehículos**
* **Predice comportamiento operativo**
* **Genera alertas inteligentes**

---

## 🏗️ Arquitectura del Sistema

<div align="center">
  <img src="img/diagrama-arquitectura.jpg" alt="Configuración de grafana." width="100%">
</div>

Se mantiene la arquitectura de Fase 2, agregando una nueva capa:

### 🧠 Nueva Capa: Inteligencia Artificial

6. **Capa de Inteligencia (AI Layer):**

   * Modelos de **visión computacional (EPP y placas)** desplegados en la nube (EC2).
   * Modelo de **Machine Learning (regresión)** para predicción de llenado.
   * Procesamiento de imágenes desde Raspberry Pi.
   * Integración vía HTTP con servicios de IA.

---

## ✨ Características Principales (Fase 2)

* Monitoreo en tiempo real vía MQTT
* Control remoto desde aplicación web
* Autenticación con JWT
* Base de datos histórica en MongoDB
* Dashboards en Grafana
* Gateway IoT con Raspberry Pi

---

## 🚀 Nuevas Características - Fase 3

### 👷 1. Verificación de EPP (Equipo de Protección Personal)

* Captura de imagen desde Raspberry Pi.
* Envío a modelo en la nube.
* Validación automática de uso de casco.
* Bloqueo de acceso si no cumple.
* Registro de eventos en base de datos.
* Visualización en tiempo real en la web.

---

### 🚗 2. Reconocimiento de Placas Vehiculares

* Captura automática de placa.
* Uso de modelo + OCR en la nube.
* Validación contra base de datos.
* Control automático de talanquera.
* Módulo web para administrar placas.
* Registro de intentos (autorizado / no autorizado / fallo).

---

### 📊 3. Predicción de Llenado de Bodegas (Machine Learning)

* Modelo de regresión entrenado con datos históricos.
* Predicción de tiempo restante para llenado.
* Recalculo periódico (ej: cada 60 segundos).
* Integración con:

  * Aplicación web
  * MQTT
  * Componentes físicos

---

### 🔔 4. Notificaciones en Tiempo Real

Eventos críticos:

* Incumplimiento de EPP
* Placa no autorizada
* Bodega llena
* Sensores críticos

---

### 📟 5. Display LCD en la Maqueta

Muestra:

* Nombre de bodega
* % de llenado
* Tiempo estimado

Estados:

* `LLENA`
* `SIN FLUJO`

---

### 🚦 6. Semáforo LED Inteligente

* Verde: > 10 min
* Amarillo: 3–10 min
* Rojo: < 3 min o llena

---

### 📁 7. Exportación de Datos (CSV)

* Exportación desde la web
* Basado en filtros y rango de fechas
* Formato:

  ```
  YYYYMMDD_YYYYMMDD.csv
  ```

---

### 📈 8. Comparación de Periodos

* Comparación de dos rangos de fechas
* Visualizaciones paralelas
* Mismo filtro aplicado a ambos

---

### 📊 9. Dashboard Avanzado en Grafana

Nuevas métricas:

* Verificaciones de EPP (éxitos vs fallos)
* Detección de placas (autorizadas / no autorizadas / fallidas)

---

## 🛠️ Tecnologías Utilizadas (Actualizado)

### IA y Datos

* Python
* Scikit-learn
* OpenCV
* OCR

### Nube

* AWS EC2 (modelos de visión)
* MongoDB Atlas

### IoT

* Arduino
* Raspberry Pi

### Backend

* Node.js
* Express

### Frontend

* React + Vite

### Comunicación

* MQTT (Mosquitto)
* HTTP

### Visualización

* Grafana

### DevOps

* Docker
* Docker Compose

---

## ⚠️ Nuevos Requisitos (Importantes)

* Modelos de visión deben estar en la nube (EC2)
* Dataset debe provenir del sistema real
* Separación MQTT / HTTP se mantiene
* Componentes físicos deben funcionar sin depender del frontend
* Integración completa sin romper arquitectura existente

---

## 🐳 Ejecución con Docker

*(Se mantiene igual que tu documentación original, no requiere cambios)*

---

## 🔧 Notas Técnicas Nuevas

### Integración Raspberry Pi

* Captura de imágenes (EPP y placas)
* Envío HTTP a servicios ML
* Control de:

  * LCD
  * LEDs
  * Accesos

---

### Flujo de Datos Extendido

1. Sensor / Cámara → Raspberry Pi
2. Raspberry Pi → Servicio ML (HTTP)
3. Servicio ML → Backend
4. Backend → DB + MQTT
5. MQTT → Frontend + Hardware

### Diagramas de flujo del sistema

<div align="center">
  <img src="img/ca1.png" alt="Configuración de grafana." width="100%">
</div>

--- 

<div align="center">
  <img src="img/ca2.png" alt="Configuración de grafana." width="100%">
</div>

---

<div align="center">
  <img src="img/ca3.png" alt="Configuración de grafana." width="100%">
</div>