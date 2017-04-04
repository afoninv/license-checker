FROM ubuntu:16.04
LABEL Maintainer="Vitaly Afonin" Description="License checker backend, web-scraping based" Version="0.1.0"

RUN mkdir -p /opt/codifiedsecurity
WORKDIR /opt/codifiedsecurity

RUN apt-get update && apt-get install -y \
  git \
  curl
RUN curl -sL https://deb.nodesource.com/setup_6.x -o nodesource_setup.sh
RUN chmod +x ./nodesource_setup.sh 
RUN ./nodesource_setup.sh
RUN apt-get update && apt-get install -y \
  nodejs

ARG TAG="0.1.1"
RUN git clone --branch=$TAG --depth=1 https://github.com/afoninv/license-checker.git /opt/codifiedsecurity/license-checker

WORKDIR /opt/codifiedsecurity/license-checker
RUN npm install
ENTRYPOINT ["npm", "start"]

EXPOSE 3000