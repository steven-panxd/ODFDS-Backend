FROM node:16

WORKDIR /app

COPY package.json .
RUN npm install
COPY . .
RUN apt update && apt install -y netcat
RUN cat start.sh | tr -d '\r' >> start2.sh
RUN chmod +x ./start2.sh
RUN npx prisma generate

CMD ["./start2.sh"]