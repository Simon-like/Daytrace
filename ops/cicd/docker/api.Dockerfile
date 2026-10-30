FROM node:24.22.1-bookworm-slim AS build
WORKDIR /app
RUN npm install --global pnpm@11.23.0
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config ./packages/config
COPY packages/contracts ./packages/contracts
COPY apps/api ./apps/api
COPY scripts/ci/export-public-content.mjs ./scripts/ci/export-public-content.mjs
RUN pnpm install --frozen-lockfile --filter @daytrace/api... \
    && pnpm run build:packages \
    && pnpm --filter @daytrace/api build \
    && node scripts/ci/export-public-content.mjs \
    && pnpm prune --prod

FROM node:24.22.1-bookworm-slim AS runtime
ENV NODE_ENV=production API_HOST=0.0.0.0 API_PORT=3001 CONTENT_ROOT=/data/content
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/config/package.json ./packages/config/package.json
COPY --from=build /app/packages/config/dist ./packages/config/dist
COPY --from=build /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/ops/cicd/.artifacts/public-content /data/content
RUN chown -R node:node /data/content
USER node
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
