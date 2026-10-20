FROM node:20-alpine
WORKDIR /app
COPY package.json ./

RUN npm config set strict-ssl false \
 && npm install --omit=dev

 COPY . ./
 EXPOSE 8080
 USER node
 CMD ["node", "server.js"]
