FROM node:16

WORKDIR /app

COPY package.json .
RUN npm install
COPY . .
RUN apt update && apt install -y netcat
RUN chmod +x ./start.sh
RUN npx prisma generate

CMD ["./start.sh"]