## Arqui2_Fase2
# Ecosort


## JSONs de ejemplo por endpoint de usuarios

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