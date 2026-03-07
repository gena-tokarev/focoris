FROM node:20-alpine

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate --schema auth-api/prisma/schema.prisma
RUN pnpm exec nx run @focoris/auth-api:build:production

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "-c", "pnpm exec prisma migrate deploy --schema auth-api/prisma/schema.prisma && node dist/auth-api/main.js"]
