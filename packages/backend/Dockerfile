FROM node:22.14.0-alpine
WORKDIR /usr/src/app

COPY package*.json ./
COPY packages/backend/package.json ./packages/backend/

RUN npm install

COPY packages/backend ./packages/backend

WORKDIR /usr/src/app/packages/backend

RUN npm run build
EXPOSE 3000
CMD ["node", "dist/src/main"]
