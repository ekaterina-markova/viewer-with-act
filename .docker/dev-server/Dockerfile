FROM node:12.14.0

RUN git clone https://github.com/PencilML/Viewers.git /opt/PencilMLFrontend
WORKDIR /opt/PencilMLFrontend

RUN yarn config set workspaces-experimental true && yarn install

# expose web server port
EXPOSE 3000

ENTRYPOINT ["yarn", "dev"]
