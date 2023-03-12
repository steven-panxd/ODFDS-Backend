until nc -z -v -w30 ${MYSQL_DB_HOST} ${MYSQL_DB_DOCKER_PORT}
do
  echo "Waiting a second until the database is receiving connections..."
  # wait for a second before checking again
  sleep 1
done
npx prisma db push --accept-data-loss
npm run dev