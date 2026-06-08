# syntax=docker/dockerfile:1
ARG BUILD_IMAGE="node:24-trixie-slim"
ARG EXPRESS_VERSION

FROM ${BUILD_IMAGE} AS tester
ARG EXPRESS_VERSION
ARG NPM_ARGS="--no-fund --no-audit --no-update-notifier"
ENV NPM_CONFIG_CACHE=/tmp/npm
WORKDIR /app
COPY --link . ./
RUN npm i express@${EXPRESS_VERSION} @types/express@${EXPRESS_VERSION}
RUN npm i

CMD ["npm", "run", "test:all"]
