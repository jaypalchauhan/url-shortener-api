FROM node:20-slim

LABEL org.opencontainers.image.source="https://github.com/jaypalchauhan/url-shortener-api"
LABEL org.opencontainers.image.description="Minimal URL shortener REST API with click tracking - Express + SQLite"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# keep the SQLite file on a volume so links survive container restarts
ENV DB_PATH=/data/links.db
RUN mkdir /data && chown node:node /data
VOLUME /data

USER node
EXPOSE 3000
CMD ["node", "src/server.js"]
