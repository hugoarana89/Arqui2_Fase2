# -------- Etapa 1: Build --------
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluye dev para compilar)
RUN npm install

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build


# -------- Etapa 2: Runtime --------
FROM node:20-alpine

WORKDIR /app

# Copiar solo lo necesario del build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Exponer puerto (ajústalo si usas otro)
EXPOSE 3000

# Ejecutar aplicación
CMD ["node", "dist/index.js"]