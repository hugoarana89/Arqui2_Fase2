# EcoSort

## JSONs de ejemplo por endpoint para la parte de usuarios/autenticación

**`POST /api/auth/register`**
```json
{
  "name": "Juan Pérez",
  "email": "juan@correo.com",
  "password": "miPassword123"
}
```

**`POST /api/auth/login`**
```json
{
  "email": "juan@correo.com",
  "password": "miPassword123"
}
```

**`POST /api/auth/forgot-password`**
```json
{
  "email": "juan@correo.com"
}
```
> El token llega al correo registrado, no en la respuesta.

**`POST /api/auth/reset-password`**
```json
{
  "token": "a3f9c2e1b8d7...",
  "newPassword": "nuevaPassword456"
}
```

**`PUT /api/auth/change-password`** 🔒 *(Header: `Authorization: Bearer <token>`)*
```json
{
  "currentPassword": "miPassword123",
  "newPassword": "nuevaPassword456"
}
```

**`GET /api/auth/me`** 🔒 *(Header: `Authorization: Bearer <token>`, sin body)*

---

## TOPICS Y JSON COMPLETOS PARA Mosquito mqtt

---

### PARTE 1: RECEPCIÓN DE DATOS (desde Raspberry Pi hacia el backend nodejs)

Estos son los **8 eventos/estados** que la Raspberry Pi debe publicar cuando ocurran cambios.

---

#### 1. ESTADO DE PARQUEOS

**Topic:** `ecosort/planta/parqueos/estado`

**JSON:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "parqueos_ocupados": 2
}
```

---

#### 2. ESTADO DE TALANQUERA

**Topic:** `ecosort/parqueo/talanquera/estado`

**JSON:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "talanquera_abierta": false
}
```

---

#### 3. ALERTA DE PARQUEO

**Topic:** `ecosort/parqueo/talanquera/alerta`

**JSON:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "alerta_parqueo_lleno": true
}
```

---

#### 4. ESTADO DE PUERTA PRINCIPAL

**Topic:** `ecosort/acceso/puerta/estado`

**JSON:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "puerta_abierta": true
}
```

---

#### 5. ALARMA RFID

**Topic:** `ecosort/acceso/puerta/alarma`

**JSON:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "alerta_rfid": false
}
```

---

#### 6. ESTADO DE BANDA PRINCIPAL

**Topic:** `ecosort/procesamiento/bandas/principal`

**JSON:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "banda_principal": true,
}
```

---

#### 7. ESTADO DE BANDA PLASTICO

**Topic:** `ecosort/procesamiento/bandas/plastico`

**JSON:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "banda_plastico": true
}
```

---

#### 8. ESTADO DE BANDA VIDRIO

**Topic:** `ecosort/procesamiento/bandas/vidrio`

**JSON:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "banda_vidrio": true
}
```

---

#### 9. ESTADO DE BANDA METAL

**Topic:** `ecosort/procesamiento/bandas/metal`

**JSON:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "banda_metal": true
}
```

---

#### 10. EVENTO DE CLASIFICACIÓN DE MATERIAL

**Topic:** `ecosort/clasificador/material/detectado`

**JSON:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "codigo_material": 1
}
```

---

#### 11. RESULTADO DE CLASIFICACIÓN (RECHAZOS/APROBACIONES)

**Topic:** `ecosort/clasificador/material/resultado`

Posibles valores:
1. **linea:** plastico | vidrio | metal 
2. **rsultado:** aprobado | rechzado

**JSON para Plástico:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "linea": "plastico",
  "resultado": "rechazado",
  "medicion": 15.5
}
```

**JSON para Vidrio:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "linea": "vidrio",
  "resultado": "aprobado",
  "transparencia": 95
}
```

**JSON para Metal:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "linea": "metal",
  "resultado": "rechazado",
  "medicion": 8.2
}
```

---

#### 12. ALARMA DE HUMO (GAS)

**Topic:** `ecosort/seguridad/alarma/humo`

**JSON:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "alerta_humo": true,
  "umbral": 300
}
```

---

### PARTE 2: ENVÍO DE COMANDOS (desde Web App hacia el backend por)

Estos son los **8 comandos** que el backend debe enviar a la raspberry por medio de mosquitto mqtt.

---

#### 1. PAUSAR/REANUDAR LÍNEA PRINCIPAL

**Topic:** `ecosort/comandos/linea/principal`

**JSON para Pausar:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "pausar",
  "linea": "principal",
  "usuario": "admin@ecosort.com"
}
```

**JSON para Reanudar:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "reanudar",
  "linea": "principal",
  "usuario": "admin@ecosort.com"
}
```

---

#### 2. PAUSAR/REANUDAR LÍNEA DE PLÁSTICO

**Topic:** `ecosort/comandos/linea/plastico`

**JSON para Pausar:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "pausar",
  "linea": "plastico",
  "usuario": "operador1"
}
```

**JSON para Reanudar:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "reanudar",
  "linea": "plastico",
  "usuario": "operador1"
}
```

---

#### 3. PAUSAR/REANUDAR LÍNEA DE VIDRIO

**Topic:** `ecosort/comandos/linea/vidrio`

**JSON para Pausar:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "pausar",
  "linea": "vidrio",
  "usuario": "operador1"
}
```

**JSON para Reanudar:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "reanudar",
  "linea": "vidrio",
  "usuario": "operador1"
}
```

---

#### 4. PAUSAR/REANUDAR LÍNEA DE METAL

**Topic:** `ecosort/comandos/linea/metal`

**JSON para Pausar:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "pausar",
  "linea": "metal",
  "usuario": "operador1"
}
```

**JSON para Reanudar:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "reanudar",
  "linea": "metal",
  "usuario": "operador1"
}
```

---

#### 5. ABRIR/CERRAR PUERTA PRINCIPAL

**Topic:** `ecosort/comandos/acceso/puerta`

**JSON para Abrir:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "abrir",
  "elemento": "puerta_principal",
  "usuario": "admin"
}
```

**JSON para Cerrar:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "cerrar",
  "elemento": "puerta_principal",
  "usuario": "admin"
}
```

---

#### 6. ABRIR/CERRAR TALANQUERA

**Topic:** `ecosort/comandos/parqueo/talanquera`

**JSON para Abrir:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "abrir",
  "elemento": "talanquera",
  "usuario": "admin"
}
```

**JSON para Cerrar:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "cerrar",
  "elemento": "talanquera",
  "usuario": "admin"
}
```

---

#### 7. CAMBIAR ESTADO DE ILUMINACIÓN

**Topic:** `ecosort/comandos/planta/iluminacion`

**JSON para Encender:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "encender",
  "usuario": "operador2"
}
```

**JSON para Apagar:**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "apagar",
  "usuario": "operador2"
}
```

---

#### 8. ACTIVAR/DESACTIVAR MODO EMERGENCIA

**Topic:** `ecosort/comandos/seguridad/emergencia`

**JSON para Activar (1):**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "activar",
  "estado": 1,
  "motivo": "manual_override",
  "usuario": "supervisor"
}
```

**JSON para Desactivar (0):**
```json
{
  "timestamp": "2024-05-20T10:30:15Z",
  "comando": "desactivar",
  "estado": 0,
  "usuario": "supervisor"
}
```

---



























Todo el código nuevo está listo. Ahora completo los tres archivos que faltan: `index.ts`, `database.ts` (agrega las nuevas colecciones) y `package.json` (agrega `socket.io`).Ahora actualizo el `.env` con las nuevas variables y el `docker-compose.yml` con la corrección de indentación que tenía:Ahora actualizo el `mosquitto.conf` para habilitar el puerto WebSocket (9001) que socket.io puede usar como fallback:Verificación final y empaquetado:Listo. Aquí el resumen completo de todo lo generado:

---

## Endpoints para recepción de datos del frontend al backend

### Endpoints HTTP nuevos (todos con JWT)

**Control** (`POST /api/control/...`):
```
POST /api/control/linea        { "comando": "pausar|reanudar", "linea": "principal|plastico|vidrio|metal" }
POST /api/control/acceso       { "comando": "abrir|cerrar", "elemento": "puerta_principal|talanquera" }
POST /api/control/iluminacion  { "comando": "encender|apagar" }
POST /api/control/emergencia   { "comando": "activar|desactivar", "motivo": "..." }
```

**Monitoring** (`GET /api/monitoring/...`):
```
GET /api/monitoring/state                    → estado global actual en RAM
GET /api/monitoring/events?category=&limit=  → historial sensor_events
GET /api/monitoring/classifications?linea=   → historial classification_results
GET /api/monitoring/classifications/stats    → aprobados/rechazados por línea
GET /api/monitoring/commands                 → historial commands_log
```