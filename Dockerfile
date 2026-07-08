# Smithery hosted deployment. dist/ is committed, so no build step is needed —
# just the single runtime dependency (@modelcontextprotocol/sdk).
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts
COPY dist ./dist
CMD ["node", "dist/index.js"]
