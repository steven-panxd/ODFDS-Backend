FROM node:16

RUN apt-get update && apt-get install -y netcat

WORKDIR /app

COPY package.json .
RUN npm install
COPY . .
RUN npx prisma generate

CMD ["./start.sh"]