# syntax=docker/dockerfile:1
#
# Two independent targets in this file:
#
#   web-build  — builds the Vite frontend. Not part of the running service;
#                only invoked by deploy.sh, which copies its output into
#                pb_public/ (bind-mounted into the `pocketbase` container).
#                This is what keeps Node off the host entirely: it only ever
#                runs inside a throwaway build container.
#
#   pocketbase — the actual runtime image: the official PocketBase binary,
#                nothing else. This is the target docker-compose builds.

FROM node:20-alpine AS web-build
WORKDIR /web
COPY apps/web/package*.json ./
RUN npm ci
COPY apps/web ./
RUN npm run build

FROM alpine:3.20 AS pocketbase
ARG PB_VERSION=0.39.11
RUN apk add --no-cache ca-certificates curl unzip \
  && curl -sSL -o /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" \
  && unzip -q /tmp/pb.zip -d /pb \
  && rm /tmp/pb.zip \
  && apk del curl unzip
WORKDIR /pb
EXPOSE 8090
ENTRYPOINT ["/pb/pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/pb/pb_data", "--publicDir=/pb/pb_public", "--migrationsDir=/pb/pb_migrations", "--hooksDir=/pb/pb_hooks"]
