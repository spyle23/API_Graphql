FROM node:16-alpine

WORKDIR /spyle23Graphql

COPY package.json /spyle23Graphql/package.json

COPY package.json yarn.lock ./
COPY tsconfig.json ./
COPY .env ./
COPY prisma ./
RUN yarn --exact


COPY ["package.json", "./"]

COPY . .

EXPOSE 4200

CMD yarn start
