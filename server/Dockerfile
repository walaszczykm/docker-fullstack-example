FROM node:14.15.0

WORKDIR /app

COPY package*.json .
RUN npm install

COPY src ./src

CMD npm start