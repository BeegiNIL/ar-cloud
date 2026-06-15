FROM node:22-alpine
WORKDIR /app

# Install dependencies
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy server code
COPY server/index.js ./

# Copy static HTML files served by the API
COPY creator.html ./
COPY viewer.html ./

EXPOSE 3000
CMD ["node", "index.js"]
