# Use Node.js LTS version
FROM node:20-slim

# Set working directory
WORKDIR /app

# Install Vue CLI globally
RUN npm install -g @vue/cli @vue/cli-service

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy project files
COPY . .

# Expose development port
EXPOSE 8080

# Start development server
CMD ["npm", "run", "serve"]
