# Development stage
FROM node:20-slim as development

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

# Test stage
FROM node:20-slim as test

# Set working directory
WORKDIR /app

# Install Vue CLI globally
RUN npm install -g @vue/cli @vue/cli-service

# Copy package files
COPY package*.json ./

# Install dependencies including dev dependencies
RUN npm install

# Copy project files
COPY . .

# Run tests
CMD ["npm", "run", "test:unit"]
