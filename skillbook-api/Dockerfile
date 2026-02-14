FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm exec nx run @focoris/skillbook-api:build:production

ENV NODE_ENV=production
EXPOSE 3002

CMD ["node", "dist/skillbook-api/main.js"]
