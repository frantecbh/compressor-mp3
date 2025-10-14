# ============================================
# Dockerfile Simplificado e Robusto
# ============================================
FROM node:18-alpine

WORKDIR /app

# Instalar FFmpeg e dependências do sistema
RUN apk add --no-cache \
  ffmpeg \
  python3 \
  make \
  g++ \
  && ffmpeg -version

# Copiar arquivos de package
COPY package.json package-lock.json* ./

# Limpar cache do npm e instalar dependências
RUN npm cache clean --force && \
  npm install && \
  echo "✅ Dependências instaladas com sucesso"

# Copiar todo o código
COPY . .

# Verificar arquivos copiados
RUN echo "📁 Verificando estrutura:" && \
  ls -la && \
  echo "📁 Conteúdo de src/app:" && \
  ls -la src/app/ || ls -la app/ || echo "Nenhum diretório app encontrado"

# Desabilitar telemetria
ENV NEXT_TELEMETRY_DISABLED=1

# Build com logs detalhados
RUN echo "🔨 Iniciando build do Next.js..." && \
  npm run build && \
  echo "✅ Build concluído com sucesso!" && \
  ls -la .next/

# Limpar cache de build para reduzir tamanho
RUN npm prune --production && \
  rm -rf .next/cache

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nextjs -u 1001 && \
  chown -R nextjs:nodejs /app

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Comando de inicialização
CMD ["npm", "start"]