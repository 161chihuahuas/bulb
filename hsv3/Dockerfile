FROM debian:buster
LABEL maintainer "lily@tacticalchihuahua.lol"
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get -yq upgrade
RUN DEBIAN_FRONTEND=noninteractive apt-get -yq install wget apt-transport-https gnupg curl libssl-dev git python build-essential
RUN curl -sL https://deb.nodesource.com/setup_10.x | bash -
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
RUN git clone https://gitlab.com/deadcanaries/hsv3 /root/hsv3; \
    cd /root/hsv3; \
    git fetch --tags; \
    git checkout $(git describe --tags `git rev-list --tags --max-count=1`); \
    cd /root/hsv3 && npm install --unsafe-perm --production
ENTRYPOINT ["/root/hsv3/cli.js"]
CMD []
