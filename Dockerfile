# Stage 1: Build
FROM node:22-alpine AS builder

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./
RUN printf 'node-linker=hoisted\n' > .npmrc

# Install all dependencies (including dev dependencies required for building)
RUN pnpm install --frozen-lockfile --dangerously-allow-all-builds

# Copy source code and build the application
COPY . .
RUN pnpm build

# Remove devDependencies to prepare for production image
RUN pnpm install --prod --frozen-lockfile --dangerously-allow-all-builds

# Stage 2: Production
FROM node:22-alpine AS production

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy built artifacts and production node_modules from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Run the application
CMD ["node", "dist/main.js"]