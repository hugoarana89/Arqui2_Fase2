## Bitácora de Problemas y Soluciones Implementadas

### 📅 Registro de incidencias durante el desarrollo de EcoSort - Fase 3

---

### 🔧 Problema 1: Alta latencia en la verificación de EPP

**Descripción:**
Durante las pruebas iniciales, el sistema de verificación de equipo de protección personal (EPP) presentaba tiempos de respuesta elevados (hasta 8 segundos) al enviar imágenes desde la Raspberry Pi hacia la instancia EC2.

**Causa identificada:**
Las imágenes capturadas tenían un tamaño excesivo (resolución completa de la cámara), lo que incrementaba el tiempo de transmisión y procesamiento.

**Solución implementada:**
Se implementó un preprocesamiento local utilizando compresión y redimensionamiento de imágenes con OpenCV antes de enviarlas al endpoint HTTP.

**Resultado:**
El tiempo de respuesta se redujo a un promedio de 1.5 segundos, mejorando significativamente la experiencia de usuario en el acceso peatonal.

---

### 🔧 Problema 2: Baja precisión en el reconocimiento de placas vehiculares

**Descripción:**
El sistema OCR retornaba resultados incorrectos o incompletos en condiciones de baja iluminación o ángulos inadecuados.

**Causa identificada:**
Falta de normalización en las imágenes capturadas y ausencia de filtros de mejora antes del OCR.

**Solución implementada:**
Se incorporaron técnicas de preprocesamiento como:

* Conversión a escala de grises
* Aplicación de filtros de suavizado
* Ajuste de contraste

Adicionalmente, se mejoró la ubicación física de la cámara.

**Resultado:**
La precisión del reconocimiento aumentó de aproximadamente 65% a 90% en condiciones normales de operación.

---

### 🔧 Problema 3: Datos insuficientes para entrenamiento del modelo de predicción

**Descripción:**
El dataset histórico de la Fase 2 no contenía suficientes registros para entrenar un modelo de regresión confiable.

**Causa identificada:**
Baja frecuencia de eventos almacenados y ausencia de variabilidad en los datos.

**Solución implementada:**
Se generaron datos sintéticos mediante simulación controlada del comportamiento de llenado de bodegas, respetando patrones reales del sistema.

**Resultado:**
Se logró construir un dataset robusto que permitió entrenar un modelo funcional con métricas aceptables (R² > 0.75).

---

### 🔧 Problema 4: Desincronización entre MQTT y la aplicación web

**Descripción:**
Las predicciones enviadas por MQTT no siempre se reflejaban correctamente en la interfaz web en tiempo real.

**Causa identificada:**
Problemas en la suscripción a tópicos y manejo incorrecto de eventos en el frontend.

**Solución implementada:**
Se reestructuró la lógica de suscripción MQTT en el cliente web, asegurando:

* Reconexión automática
* Manejo de eventos asincrónicos
* Validación de datos recibidos

**Resultado:**
La visualización en tiempo real se volvió consistente y estable.

---

### 🔧 Problema 5: Fallos en la actualización del display LCD

**Descripción:**
El display LCD no reflejaba correctamente los cambios en las predicciones o mostraba valores congelados.

**Causa identificada:**
Conflictos en el acceso concurrente a los pines GPIO y falta de control en el ciclo de actualización.

**Solución implementada:**
Se implementó un sistema de actualización basado en intervalos controlados y bloqueo de recursos (mutex lógico).

**Resultado:**
El display muestra información actualizada correctamente cada ciclo de predicción.

---

### 🔧 Problema 6: Activación incorrecta del semáforo LED

**Descripción:**
Los LEDs del semáforo no correspondían con los rangos definidos de predicción (verde, amarillo, rojo).

**Causa identificada:**
Error en la lógica condicional que evaluaba los rangos de tiempo restantes.

**Solución implementada:**
Se corrigieron las condiciones y se añadieron pruebas unitarias para validar los rangos:

* Verde: > 10 minutos
* Amarillo: 3 - 10 minutos
* Rojo: < 3 minutos

**Resultado:**
El semáforo responde correctamente a los estados de la bodega.

---

### 🔧 Problema 7: Sobrecarga en la instancia EC2

**Descripción:**
Cuando múltiples solicitudes eran enviadas simultáneamente (EPP + placas), el servicio en EC2 se volvía lento.

**Causa identificada:**
Ambos modelos estaban desplegados en una única instancia con recursos limitados.

**Solución implementada:**
Se separaron los servicios en dos instancias EC2 independientes:

* Una para EPP
* Otra para reconocimiento de placas

**Resultado:**
Se mejoró la escalabilidad y se redujo la latencia en ambos servicios.

---

### 🔧 Problema 8: Notificaciones duplicadas en la aplicación web

**Descripción:**
El sistema generaba múltiples notificaciones repetidas para un mismo evento crítico.

**Causa identificada:**
Falta de control de eventos ya procesados en el frontend.

**Solución implementada:**
Se implementó un sistema de identificación única por evento (ID + timestamp) para evitar duplicados.

**Resultado:**
Las notificaciones ahora son únicas, claras y no redundantes.

---

### 🔧 Problema 9: Errores en la exportación CSV

**Descripción:**
El archivo CSV generado presentaba inconsistencias en el formato de fechas.

**Causa identificada:**
Uso de diferentes formatos de timestamp entre backend y frontend.

**Solución implementada:**
Se estandarizó el formato de fechas a `YYYY-MM-DD HH:mm:ss` en todo el sistema.

**Resultado:**
Los archivos CSV son consistentes y compatibles con herramientas de análisis.

---

### 🔧 Problema 10: Integración incompleta entre módulos

**Descripción:**
Durante la integración final, algunos módulos funcionaban de forma aislada pero no en conjunto.

**Causa identificada:**
Falta de pruebas de integración tempranas.

**Solución implementada:**
Se adoptó un enfoque incremental de integración continua, probando cada módulo junto con los demás desde etapas tempranas.

**Resultado:**
El sistema final funciona de forma integrada y estable.

---
