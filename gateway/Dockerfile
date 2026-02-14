FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm exec nx run @focoris/gateway:build:production

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/gateway/main.js"]
