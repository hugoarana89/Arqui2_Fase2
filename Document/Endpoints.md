# EcoSort

---

##  PARTE 1: ENVÍO DE COMANDOS (de python a nodejs)

---

### 🅿️ Parqueos

**`ecosort/planta/parqueos/estado`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "parqueos_ocupados": 2
}
```

**`ecosort/parqueo/talanquera/estado`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "talanquera_abierta": true
}
```

**`ecosort/parqueo/talanquera/alerta`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "alerta_parqueo_lleno": true
}
```

---

### 🚪 Acceso

**`ecosort/acceso/puerta/estado`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "puerta_abierta": false
}
```

**`ecosort/acceso/puerta/alarma`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "alerta_rfid": true
}
```

---

### ⚙️ Bandas de Procesamiento

**`ecosort/procesamiento/bandas/principal`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "banda_principal": true
}
```

**`ecosort/procesamiento/bandas/plastico`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "banda_plastico": true
}
```

**`ecosort/procesamiento/bandas/vidrio`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "banda_vidrio": true
}
```

**`ecosort/procesamiento/bandas/metal`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "banda_metal": true
}
```

---

### 🔍 Clasificador

**`ecosort/clasificador/material/detectado`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "codigo_material": 2
}
```

**`ecosort/clasificador/material/resultado`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "linea": "plastico",
  "resultado": "aprobado",
  "medicion": 85.4,
  "transparencia": 0.92
}
```
> `linea` acepta: `"plastico"` | `"vidrio"` | `"metal"`  
> `resultado` acepta: `"aprobado"` | `"rechazado"`  
> `medicion` y `transparencia` son opcionales

---

### 🔥 Seguridad

**`ecosort/seguridad/alarma/humo`**
```json
{
  "timestamp": "2026-03-17T10:00:00.000Z",
  "alerta_humo": true,
  "umbral": 450
}
```

---

**Notas generales:**
- El campo `timestamp` debe estar en formato ISO 8601 (ej. `"2026-03-17T10:00:00.000Z"`).
- Los campos `boolean` controlan estado activo/inactivo de cada elemento.
- En `bandas`, cada topic solo lleva **su propio campo** (no mezcles `banda_principal` en el topic de plástico, por ejemplo).




---

## PARTE 2: ENVÍO DE COMANDOS (desde nodejs a python)

Estos son los **8 comandos** que el backend debe enviar a la raspberry por medio de mosquitto mqtt.

---

## 🏭 1. Control de líneas de producción

### 📌 Topics

* `ecosort/comandos/linea/principal`
* `ecosort/comandos/linea/plastico`
* `ecosort/comandos/linea/vidrio`
* `ecosort/comandos/linea/metal`

### 📦 Payload

```json
{
  "comando": "pausar | reanudar",
  "linea": "principal | plastico | vidrio | metal",
  "usuario": "email_del_usuario"
}
```

---

## 🚪 2. Control de accesos

### 📌 Topics

* `ecosort/comandos/acceso/puerta`
* `ecosort/comandos/parqueo/talanquera`

### 📦 Payload

```json
{
  "comando": "abrir | cerrar",
  "elemento": "puerta_principal | talanquera",
  "usuario": "email_del_usuario"
}
```

---

## 💡 3. Iluminación

### 📌 Topic

* `ecosort/comandos/planta/iluminacion`

### 📦 Payload

```json
{
  "comando": "encender | apagar",
  "usuario": "email_del_usuario"
}
```

---

## 🚨 4. Emergencia

### 📌 Topic

* `ecosort/comandos/seguridad/emergencia`

### 📦 Payload

```json
{
  "comando": "activar | desactivar",
  "estado": 1 | 0,
  "usuario": "email_del_usuario",
  "motivo": "opcional (solo cuando se activa)"
}
```

---

