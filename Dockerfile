FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

# Start with POSIX shell (bash is not present on alpine images).
RUN printf "npm run seed\nnpm start\n" > batch.sh
RUN chmod +x batch.sh
ENTRYPOINT ["sh", "./batch.sh"]