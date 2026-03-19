# Endpoints Grafana para proyecto EcoSort

A continuación se detallan los endpoints disponibles para integrar con Grafana. Todos los endpoints utilizan el mismo método, estructura de JSON en el cuerpo de la petición y encabezado de autenticación.


### JSON a enviar (Body)

```json
{
  "range": {
    "from": "2026-03-17T00:00:00.000Z",
    "to": "2026-03-18T23:59:59.999Z"
  },
  "intervalMs": 1000
}
```

### Encabezado (Header)
La clave API se puede configurar en el archivo `.env` del proyecto.

| Key | Value |
| :--- | :--- |
| `x-grafana-key` | `ecosort_grafana_key_2026` |

---

## Listado de Endpoints

### 1. Materiales por Línea
Obtiene el conteo de materiales aprobados y rechazados por tipo.

- **Método:** `POST`
- **URL:** `http://localhost:4000/api/grafana/materiales-por-linea`

**Respuesta:**
```json
[
    {
        "target": "plastico",
        "datapoints": [
            [
                1,
                1773788294000
            ],
            [
                1,
                1773800418000
            ]
        ]
    },
    {
        "target": "vidrio",
        "datapoints": []
    },
    {
        "target": "metal",
        "datapoints": []
    }
]
```

---

### 2. Ocupación de Parqueos
Muestra la cantidad de parqueos ocupados en el tiempo.

- **Método:** `POST`
- **URL:** `http://localhost:4000/api/grafana/parqueos-ocupacion`

**Respuesta:**
```json
[
    {
        "target": "parqueos_ocupados",
        "datapoints": [
            [
                2,
                1773788277149
            ],
            [
                2,
                1773800403814
            ],
            [
                2,
                1773803830127
            ],
            [
                2,
                1773804105470
            ]
        ]
    }
]
```

---

### 3. Eventos Críticos
Proporciona el historial de diferentes tipos de alarmas y eventos críticos.

- **Método:** `POST`
- **URL:** `http://localhost:4000/api/grafana/eventos-criticos`

**Respuesta:**
```json
[
    {
        "target": "alarmas_humo",
        "datapoints": [
            [
                1,
                1773788296000
            ],
            [
                1,
                1773800419000
            ],
            [
                1,
                1773803961000
            ]
        ]
    },
    {
        "target": "alertas_rfid",
        "datapoints": [
            [
                1,
                1773788286000
            ],
            [
                1,
                1773800410000
            ]
        ]
    },
    {
        "target": "alertas_parqueo_lleno",
        "datapoints": [
            [
                1,
                1773788282000
            ],
            [
                1,
                1773800407000
            ]
        ]
    },
    {
        "target": "paros_emergencia",
        "datapoints": [
            [
                1,
                1773788256000
            ],
            [
                1,
                1773800597000
            ]
        ]
    }
]
```

---

### 4. Throughput
Muestra la cantidad de materiales procesados (throughput) en el tiempo.

- **Método:** `POST`
- **URL:** `http://localhost:4000/api/grafana/throughput`

**Respuesta:**
```json
[
    {
        "target": "throughput",
        "datapoints": [
            [
                1,
                1773788294000
            ],
            [
                1,
                1773800417000
            ]
        ]
    }
]
```

---

### 5. KPIs de Producción
Tabla con indicadores clave de rendimiento por línea de producción.

- **Método:** `POST`
- **URL:** `http://localhost:4000/api/grafana/kpis-produccion`

**Respuesta:**
```json
[
    {
        "type": "table",
        "columns": [
            {
                "text": "Línea",
                "type": "string"
            },
            {
                "text": "Aprobados",
                "type": "number"
            },
            {
                "text": "Rechazados",
                "type": "number"
            },
            {
                "text": "Total procesados",
                "type": "number"
            },
            {
                "text": "Tasa aprobación",
                "type": "string"
            },
            {
                "text": "Bodegas llenas",
                "type": "number"
            }
        ],
        "rows": [
            [
                "plastico",
                2,
                0,
                2,
                "100.0%",
                0
            ],
            [
                "vidrio",
                0,
                0,
                0,
                "0%",
                0
            ],
            [
                "metal",
                0,
                0,
                0,
                "0%",
                0
            ]
        ]
    }
]
```

---

### 6. KPIs de Eventos Críticos
Tabla con el resumen de todos los eventos críticos registrados.

- **Método:** `POST`
- **URL:** `http://localhost:4000/api/grafana/kpis-eventos-criticos`

**Respuesta:**
```json
[
    {
        "type": "table",
        "columns": [
            {
                "text": "Evento crítico",
                "type": "string"
            },
            {
                "text": "Cantidad",
                "type": "number"
            }
        ],
        "rows": [
            [
                "Activaciones sensor de humo",
                3
            ],
            [
                "Paros de emergencia (activados)",
                2
            ],
            [
                "Alertas RFID (acceso inválido)",
                2
            ],
            [
                "Alertas parqueo lleno",
                2
            ],
            [
                "Bodega plástico llena (100%)",
                0
            ],
            [
                "Bodega vidrio llena (100%)",
                0
            ],
            [
                "Bodega metal llena (100%)",
                0
            ]
        ]
    }
]
```

---

### 7. Actividad del Sistema
Serie de datos sobre la actividad general del sistema, incluyendo sensores, clasificaciones y comandos.

- **Método:** `POST`
- **URL:** `http://localhost:4000/api/grafana/actividad-sistema`

**Respuesta:**
```json
[
    {
        "target": "eventos_sensores",
        "datapoints": [
            [
                1,
                1773788277000
            ],
            [
                1,
                1773788280000
            ],
            [
                1,
                1773788282000
            ],
            [
                1,
                1773788284000
            ],
            [
                1,
                1773788286000
            ],
            [
                1,
                1773788287000
            ],
            [
                1,
                1773788289000
            ],
            [
                1,
                1773788290000
            ],
            [
                1,
                1773788291000
            ],
            [
                1,
                1773788293000
            ],
            [
                1,
                1773788294000
            ],
            [
                1,
                1773788296000
            ],
            [
                1,
                1773800403000
            ],
            [
                1,
                1773800406000
            ],
            [
                1,
                1773800407000
            ],
            [
                1,
                1773800409000
            ],
            [
                1,
                1773800410000
            ],
            [
                1,
                1773800411000
            ],
            [
                1,
                1773800412000
            ],
            [
                1,
                1773800415000
            ],
            [
                1,
                1773800416000
            ],
            [
                1,
                1773800417000
            ],
            [
                1,
                1773800418000
            ],
            [
                1,
                1773800419000
            ],
            [
                1,
                1773803730000
            ],
            [
                1,
                1773803830000
            ],
            [
                1,
                1773803961000
            ],
            [
                1,
                1773804105000
            ]
        ]
    },
    {
        "target": "clasificaciones",
        "datapoints": [
            [
                1,
                1773788294000
            ],
            [
                1,
                1773800417000
            ]
        ]
    },
    {
        "target": "comandos_enviados",
        "datapoints": [
            [
                1,
                1773788198000
            ],
            [
                1,
                1773788217000
            ],
            [
                1,
                1773788219000
            ],
            [
                1,
                1773788221000
            ],
            [
                1,
                1773788230000
            ],
            [
                1,
                1773788231000
            ],
            [
                1,
                1773788232000
            ],
            [
                1,
                1773788234000
            ],
            [
                1,
                1773788236000
            ],
            [
                1,
                1773788246000
            ],
            [
                1,
                1773788248000
            ],
            [
                1,
                1773788250000
            ],
            [
                1,
                1773788251000
            ],
            [
                1,
                1773788252000
            ],
            [
                1,
                1773788256000
            ],
            [
                1,
                1773788258000
            ],
            [
                1,
                1773800597000
            ],
            [
                1,
                1773800599000
            ],
            [
                1,
                1773800600000
            ],
            [
                1,
                1773800601000
            ],
            [
                2,
                1773800602000
            ],
            [
                1,
                1773800603000
            ],
            [
                1,
                1773800606000
            ],
            [
                2,
                1773800607000
            ],
            [
                1,
                1773800608000
            ],
            [
                1,
                1773800609000
            ],
            [
                1,
                1773800611000
            ],
            [
                1,
                1773800614000
            ],
            [
                1,
                1773800615000
            ]
        ]
    }
]
```

---

### 8. Clasificacion de color
Serie de datos que muestran la clasificación de materiales a lo largo del tiempo.

- **Método:** `POST`
- **URL:** `http://localhost:4000/api/grafana/actividad-sistema`

**Respuesta:**
```json
[
    {
        "target": "plastico",
        "datapoints": []
    },
    {
        "target": "vidrio",
        "datapoints": []
    },
    {
        "target": "metal",
        "datapoints": [
            [
                1,
                1773788293000
            ],
            [
                1,
                1773800417000
            ]
        ]
    }
]
```
---