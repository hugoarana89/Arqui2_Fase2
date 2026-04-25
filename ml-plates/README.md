# EcoSort - Reconocimiento de Placas

Servicio HTTP para reconocimiento automático de placas vehiculares.

## Endpoint

POST /detect-plate

## Entrada

Imagen enviada como multipart/form-data con el campo `file`.

## Ejemplo de prueba

```bash
curl -X POST "http://localhost:8000/detect-plate" -F "file=@test_images/placa1.jpg"
```

Desde la carpeta de ml-plates