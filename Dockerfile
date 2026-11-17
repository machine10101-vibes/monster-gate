FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server ./server
COPY src/data/portals.js ./src/data/portals.js
COPY PROTOCOL.md ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server/index.js"]
