# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install tmux for runtime (needed for type checking)
RUN apk add --no-cache tmux

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source code
COPY tsconfig.json ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/web ./apps/web

# Build shared package
RUN pnpm --filter @trinetra/shared build

# Build server
RUN pnpm --filter @trinetra/server build

# Build web
RUN pnpm --filter @trinetra/web build

# Production stage - Server
FROM node:20-alpine AS server

RUN corepack enable && corepack prepare pnpm@latest --activate

# Install tmux (required for session management)
RUN apk add --no-cache tmux

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# Copy built artifacts
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/apps/server/node_modules ./apps/server/node_modules

# Create data directory
RUN mkdir -p /data

ENV NODE_ENV=production
ENV TRINETRA_DATA_DIR=/data
ENV TRINETRA_HOST=0.0.0.0
ENV TRINETRA_PORT=3001

EXPOSE 3001

CMD ["node", "apps/server/dist/index.js"]

# Production stage - Web (nginx)
FROM nginx:alpine AS web

# Copy built web assets
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
