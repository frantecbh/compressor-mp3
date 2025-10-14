# Use Node.js 18 Alpine
FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Instalar FFmpeg
RUN apk add --no-cache ffmpeg

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências
RUN npm ci

# Copiar todo o código do projeto
COPY . .

# Desabilitar telemetria do Next.js
ENV NEXT_TELEMETRY_DISABLED=1

# Build da aplicação
RUN npm run build

# Expor porta 3000
EXPOSE 3000

# Definir variáveis de ambiente
ENV PORT=3000
ENV NODE_ENV=production

# Iniciar aplicação
CMD ["npm", "start"]