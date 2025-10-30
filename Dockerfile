FROM node:20

WORKDIR /app

# Copy only package files first (this enables build caching)
COPY package*.json ./

# Install dependencies inside Docker (this ensures cache-manager-ioredis-yet is included)
RUN npm install --legacy-peer-deps

# Copy the rest of the code
COPY . .

# Build your NestJS app
RUN npm run build

# Expose the NestJS port
EXPOSE 3001

# Start the app
CMD ["npm", "run", "start:prod"]
