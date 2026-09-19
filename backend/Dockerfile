FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production

CMD ["sh", "-c", "npx tsx ${START:-src/gateway/index.ts}"]
