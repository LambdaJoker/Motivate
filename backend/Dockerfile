# Dockerfile for NestJS application

# Base image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application source code
COPY . .

# The CMD should run the app in development mode for hot-reloading.
# The production build step will be handled by a multi-stage build later if needed.
CMD ["npm", "run", "start:dev"] 