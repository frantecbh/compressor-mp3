# ============================================
# STAGE 1: Dependências
# ============================================
FROM node:18-alpine AS deps

# Instalar dependências do sistema necessárias
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar TODAS as dependências (incluindo dev para o build)
RUN npm ci


# ============================================
# STAGE 2: Builder
# ============================================
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar dependências da stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar todo o código fonte
COPY . .

# Desabilitar telemetria do Next.js durante build
ENV NEXT_TELEMETRY_DISABLED 1

# Build da aplicação Next.js
RUN npm run build


# ============================================
# STAGE 3: Runner (Produção)
# ============================================
FROM node:18-alpine AS runner

WORKDIR /app

# Definir ambiente de produção
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# ============================================
# INSTALAR FFMPEG E DEPENDÊNCIAS
# ============================================
RUN apk add --no-cache \
  ffmpeg \
  && ffmpeg -version \
  && ffprobe -version

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Criar diretório temporário com permissões corretas
RUN mkdir -p /tmp/compressor && chown -R nextjs:nodejs /tmp/compressor

# Copiar arquivos públicos se existirem
COPY --from=builder /app/public ./public 2>/dev/null || true

# Definir permissões para o diretório .next
RUN mkdir -p .next && chown -R nextjs:nodejs .next

# Copiar arquivos de build do Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Mudar para usuário não-root
USER nextjs

# Expor porta
EXPOSE 3000

# Definir porta
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Comando para iniciar a aplicação
CMD ["node", "server.js"]