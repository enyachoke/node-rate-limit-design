FROM node:latest

LABEL maintainer="achachiez@gmail.com"

WORKDIR /usr/src/app

VOLUME [ "/usr/src/app" ]

RUN npm install -g nodemon
RUN yarn install
ENV NODE_ENV=development
ENV PORT=8000

EXPOSE 8000

CMD [ "bash","./start.sh" ]