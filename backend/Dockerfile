FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

ENV PORT=45218
EXPOSE 45218

CMD ["npx", "tsx", "src/index.ts"]
