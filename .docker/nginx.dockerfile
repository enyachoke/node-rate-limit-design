FROM nginx:latest

LABEL maintainer="achachiez@gmail.com"

COPY ./.docker/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80