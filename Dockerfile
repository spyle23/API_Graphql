FROM node:16-alpine

WORKDIR /spyle23Graphql

COPY package.json .
COPY . .
RUN yarn --exact
RUN yarn types:generate

EXPOSE 4200

CMD yarn start
