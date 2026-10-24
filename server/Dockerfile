FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
COPY src/uploads/property-images/ /app/seed-property-images/
RUN sed -i 's/\r$//' docker-entrypoint.sh

RUN DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rental_db" npx prisma generate

ENV NODE_ENV=development

EXPOSE 7000

CMD ["sh", "./docker-entrypoint.sh"]