FROM node:alpine as app

RUN apk add --no-cache --virtual .gyp python make g++

COPY . ./

RUN npm install

EXPOSE 80

ENTRYPOINT [ "npm", "start" ]
