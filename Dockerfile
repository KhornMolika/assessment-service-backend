FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

RUN printf 'node-linker=hoisted\n' > .npmrc

RUN pnpm install --frozen-lockfile --dangerously-allow-all-builds

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["node", "dist/main.js"]