FROM ubuntu:18.04

RUN apt-get update && apt-get install -y \
    wget \
    xz-utils \
    firefox \
    xdotool \
    nginx \
    nodejs \
    npm \
    xvfb

RUN npm install n -g
RUN n 12.19.0
RUN apt purge -y nodejs npm
ADD ./nginx.conf /etc/nginx/conf.d/
RUN rm /etc/nginx/sites-enabled/default
ADD ./setup.sh .
RUN chmod 777 ./setup.sh

RUN sh -c ./setup.sh

RUN apt-get install -y ffmpeg

RUN apt-get install -y language-pack-ja
ENV LC_ALL=ja_JP.utf8
RUN apt-get install -y fonts-takao