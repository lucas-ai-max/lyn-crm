# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Copy built dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node

EXPOSE 3001

CMD ["npm", "start"]
