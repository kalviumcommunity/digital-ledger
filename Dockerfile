# ==============================================================================
# Base image with system dependencies for Prisma & Alpine
# ==============================================================================
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ==============================================================================
# Dependencies stage
# ==============================================================================
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ==============================================================================
# Build stage
# ==============================================================================
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client for both native and musl target
RUN npx prisma generate

# Compile seed script to JavaScript for lightweight execution in runner
RUN npx tsc prisma/seed.ts --target ES2022 --module NodeNext --moduleResolution NodeNext --outDir prisma

# Disable telemetry and build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ==============================================================================
# Production Runner stage
# ==============================================================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"

# Install prisma CLI globally for automatic migrations/schema push in container
RUN npm install -g prisma@6.12.0

# Create dedicated non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy static assets and standalone bundle from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Ensure proper line endings and permissions on the entrypoint script
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000 10000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
