FROM node:22-slim AS client-build

WORKDIR /build

COPY client/package.json client/package-lock.json ./
RUN npm ci

COPY client/ ./
RUN npm run build


FROM node:22-slim AS server-deps

WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev


FROM node:22-slim

WORKDIR /app

COPY --from=server-deps /app/node_modules ./node_modules
COPY server/package.json server/index.js ./
COPY server/src/ ./src/
COPY server/scripts/ ./scripts/
COPY --from=client-build /build/dist ./public/

CMD ["node", "index.js"]
