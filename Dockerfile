FROM node:22-bookworm-slim AS client-build
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
COPY server/src/types ../server/src/types
RUN npm run build

FROM node:22-bookworm-slim AS server-build
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
COPY --from=client-build /app/client/dist ../client-dist
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app/server
ENV NODE_ENV=production
ENV PORT=3000
ENV SQLITE_DB_PATH=/app/data/life-simulator.sqlite

COPY --from=server-build /app/server/package*.json ./
COPY --from=server-build /app/server/node_modules ./node_modules
COPY --from=server-build /app/server/dist ./dist
COPY --from=server-build /app/client-dist ../client-dist

RUN mkdir -p /app/data

EXPOSE 3000
CMD ["node", "dist/main"]