# 🚗 EcoSort - Módulo de Reconocimiento de Placas (Fase 3)

## 📌 Descripción General

Este módulo implementa la funcionalidad de reconocimiento automático de placas vehiculares dentro del sistema EcoSort.

Se desarrolló como parte de la Fase 3 del proyecto, integrando visión computacional (OCR) con el backend existente para permitir la automatización del acceso mediante validación de placas.

---

# 🧠 Arquitectura de la Solución

El flujo completo implementado es:

```
Imagen → OCR (ML Service) → Texto de placa → Backend → Validación → Resultado
```

### Flujo detallado

1. Se captura una imagen de la placa (simulada por ahora).
2. La imagen se envía al servicio ML (`ml-plates`).
3. Se aplica OCR usando EasyOCR.
4. Se extrae y normaliza el texto de la placa.
5. Se envía al backend `/api/plates/validate`.
6. El backend valida contra MongoDB.
7. Retorna si está autorizada o no.

---

# ⚙️ Parte 1: Servicio de Machine Learning (ml-plates)

## 📂 Estructura

```
ml-plates/
├── app.py
├── requirements.txt
├── .env
├── test_images/
└── README.md
```

## 🔧 Justificación Técnica

Se utilizó **EasyOCR** porque:

- No requiere entrenamiento de modelos
- Funciona bien para texto en imágenes reales
- Es rápido de implementar

Se agregó filtrado personalizado para evitar ruido (ej: "CENTROAMERICA").

---

## 🧪 Código clave

### Endpoint principal

```python
@app.post("/detect-plate")
```

### Normalización

```python
text = re.sub(r"[^A-Z0-9]", "", text.upper())
```

✔ Elimina ruido
✔ Estándar de placa

### Filtro inteligente

```python
if 4 <= len(plate) <= 8 and any(c.isdigit() for c in plate) and any(c.isalpha() for c in plate):
```

✔ Evita palabras largas
✔ Asegura formato de placa

---

# 🧱 Parte 2: Backend (Node + MongoDB)

## 📂 Nuevos componentes

```
models/
├── authorizedPlate.model.ts
├── plateDetection.model.ts

controllers/
├── plates.controller.ts

routes/
├── plates.routes.ts
```

---

## 🧠 Justificación

Se decidió:

- Guardar placas autorizadas en MongoDB
- Registrar cada detección para auditoría
- Separar lógica en controller + model

---

## 📌 Endpoint clave

```txt
POST /api/plates/validate
```

### Entrada

```json
{
  "plate": "P42GZC",
  "confidence": 0.56
}
```

### Salida

```json
{
  "authorized": true,
  "plate": "P42GZC",
  "status": "autorizada"
}
```

---

## 🔍 Lógica de validación

```ts
const authorized = await AuthorizedPlate.findActiveByPlate(normalizedPlate);
status = authorized ? 'autorizada' : 'no_autorizada';
```

✔ Consulta directa
✔ Alta eficiencia

---

# 🧪 Parte 3: Pruebas

## 🔹 1. Levantar proyecto

```bash
docker compose up -d
```

---

## 🔹 2. Ejecutar servicio ML

```bash
cd ml-plates
uvicorn app:app --reload
```

---

## 🔹 3. Probar OCR

```bash
curl -X POST http://localhost:8000/detect-plate -F "file=@test_images/placa1.jpg"
```

---

## 🔹 4. Registrar usuario

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/register" -Method POST -ContentType "application/json" -Body '{"name":"Admin","email":"admin@test.com","password":"123456"}'
```

---

## 🔹 5. Login

```powershell
$login = Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"admin@test.com","password":"123456"}'
$token = $login.token
```

---

## 🔹 6. Crear placa autorizada

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/plates/authorized" -Method POST -Headers @{ Authorization = "Bearer $token" } -ContentType "application/json" -Body '{"plate":"P42GZC"}'
```

---

## 🔹 7. Validar placa

```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/plates/validate" -Method POST -ContentType "application/json" -Body '{"plate":"P42GZC","confidence":0.56}'
```

---

# 🔗 Integración futura (Raspberry)

```python
if authorized:
    serial.send("talanquera_abierta,true")
else:
    serial.send("talanquera_alerta,true")
```

✔ Automatización completa
✔ Control físico del sistema

---

# ⚠️ Consideraciones

- No subir archivos `.env`
- Rotar credenciales expuestas
- MongoDB debe permitir acceso IP

---

# ✅ Estado actual

✔ OCR funcional
✔ Backend integrado
✔ Validación con MongoDB
✔ Registro de eventos

---

# 🚀 Próximos pasos

- Integrar Raspberry Pi
- Agregar interfaz en frontend
- Métricas en Grafana

---

# 👨‍💻 Conclusión

Este módulo cumple con los requerimientos de la Fase 3 al integrar visión computacional con el sistema distribuido existente, permitiendo automatización inteligente del acceso vehicular.

