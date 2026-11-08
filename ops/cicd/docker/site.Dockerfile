FROM node:24.18.0-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.23.0
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config ./packages/config
COPY packages/contracts ./packages/contracts
COPY packages/content ./packages/content
COPY packages/ui ./packages/ui
COPY apps/site ./apps/site
COPY scripts/ci/prepare-standalone.mjs ./scripts/ci/prepare-standalone.mjs
RUN pnpm install --frozen-lockfile --filter @daytrace/site... \
    && pnpm run build:packages \
    && pnpm --filter @daytrace/site build \
    && node scripts/ci/prepare-standalone.mjs

FROM node:24.18.0-bookworm-slim AS runtime
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
COPY --from=build /app/apps/site/.next/standalone ./
USER node
WORKDIR /app/apps/site
EXPOSE 3000
CMD ["node", "server.js"]
