FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

# For Local Development
# Keep the container running with a shell instead of starting the app
# CMD ["tail", "-f", "/dev/null"]

# For Production
CMD ["npm", "run", "dev"]