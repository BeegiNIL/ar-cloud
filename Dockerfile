FROM node:22-alpine
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./
RUN npm ci --omit=dev

# Self-host AR libraries (no CDN needed on client)
RUN npm install --no-save mind-ar@1.2.5 three@0.160.0 && \
    mkdir -p libs && \
    cp node_modules/three/build/three.min.js libs/ && \
    cp node_modules/mind-ar/dist/mindar-image.prod.js libs/ && \
    rm -rf node_modules/three node_modules/mind-ar

# Copy server code and static files
COPY server/index.js ./
COPY creator.html ./
COPY viewer.html ./

EXPOSE 3000
CMD ["node", "index.js"]
