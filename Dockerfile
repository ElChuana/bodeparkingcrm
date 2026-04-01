FROM node:20-alpine

WORKDIR /app

# Instalar dependencias del frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

# Instalar dependencias del backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copiar código fuente
COPY frontend/ ./frontend/
COPY backend/ ./backend/

# Build del frontend
RUN cd frontend && npm run build

EXPOSE 3001

ENV NODE_ENV=production

# Generar Prisma client y arrancar (necesita DATABASE_URL en runtime)
CMD cd backend && npx prisma generate && npx prisma migrate deploy && node src/index.js
