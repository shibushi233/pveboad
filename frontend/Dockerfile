FROM node:22-alpine

WORKDIR /app

COPY package.json /app/package.json
COPY tsconfig.json /app/tsconfig.json
COPY vite.config.ts /app/vite.config.ts
COPY index.html /app/index.html
COPY src /app/src

RUN npm install

CMD ["npm", "run", "dev"]
