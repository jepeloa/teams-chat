FROM node:20-alpine

# Crear directorio de la app
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY src/ ./src/

# Puerto del bot
EXPOSE 3978

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3978

# Comando de inicio
CMD ["node", "src/index.js"]
