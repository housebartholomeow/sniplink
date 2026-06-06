FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source
COPY . .

# Expose the internal port
EXPOSE 3000

# Start the application
CMD ["npx", "tsx", "src/index.ts"]