# syntax=docker/dockerfile:1
ARG BUILD_IMAGE="node:22-bookworm-slim"
ARG RUNTIME_IMAGE="gcr.io/distroless/nodejs22-debian12"

FROM ${BUILD_IMAGE} AS builder-base
ENV NPM_CONFIG_NO_AUDIT=true
ENV NPM_CONFIG_NO_FUND=true
ENV NPM_CONFIG_CACHE=/tmp/npm
WORKDIR /app
COPY --link package*.json ./
RUN --mount=type=tmpfs,target=/tmp npm ci

FROM builder-base AS builder
WORKDIR /app
COPY --link . ./
RUN npm run build

FROM builder-base AS deps
WORKDIR /app
RUN npm prune --omit=dev

FROM ${RUNTIME_IMAGE} AS final
ENV NODE_OPTIONS=--enable-source-maps
WORKDIR /app
COPY --link --from=deps ./app/node_modules ./node_modules
COPY --link --from=builder /app/dist ./dist
CMD ["dist/app.js"]
