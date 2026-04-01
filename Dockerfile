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

# Generar Prisma client
RUN cd backend && npx prisma generate

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "backend/src/index.js"]
