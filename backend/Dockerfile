FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

ENV PORT=45218
ENV START=src/gateway/index.ts
EXPOSE 45218

CMD ["sh", "-c", "npx tsx $START"]
