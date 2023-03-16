FROM node:16-alpine

WORKDIR /spyle23Graphql

COPY package.json /spyle23Graphql/package.json

COPY package.json yarn.lock ./
COPY tsconfig.json ./
COPY prisma ./
RUN yarn --exact
RUN yarn types:generate

COPY ["package.json", "./"]

COPY . .

EXPOSE 4200

CMD yarn start
