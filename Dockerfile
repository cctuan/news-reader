
# Use the official lightweight Node.js 12 image.
# https://hub.docker.com/_/node
FROM node:18 AS builder

# Create and change to the app directory.
WORKDIR /usr/src/app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install on every code change.
COPY package.json package-lock.json ./

# Install production dependencies.
RUN npm install

COPY . .
RUN npm run build

FROM node:18
WORKDIR /usr/src/app
# Copy the package.json and package-lock.json files to the container
COPY package*.json ./

# Install only the production dependencies
RUN npm install --only=production

# Copy local code to the container image.
COPY --from=builder /usr/src/app/dist ./dist

# Run the web service on lscontainer startup.
CMD [ "npm", "run", "start" ]