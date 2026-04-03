FROM node:22-alpine

WORKDIR /app

COPY package.json /app/package.json
COPY tsconfig.json /app/tsconfig.json
COPY vite.config.ts /app/vite.config.ts
COPY tailwind.config.ts /app/tailwind.config.ts
COPY postcss.config.js /app/postcss.config.js
COPY index.html /app/index.html
COPY src /app/src

RUN npm install

CMD ["npm", "run", "dev"]
