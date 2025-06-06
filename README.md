# MOI Software Online
#### Visagan S

A comprehensive function and payer management system built with the MERN stack (MongoDB, Express, React, Node.js) with TypeScript.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation and Setup](#installation-and-setup)
- [Docker Setup](#docker-setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Redis Cache Management](#redis-cache-management)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Project Overview

MOI Software Online is a web application designed to manage functions (events) and payers (contributors). The system tracks function details, expenses, and contributions while providing a searchable and efficient interface for managing this data.

![Moi Software Backend Overview](./docs/images/overview.png)

## Features

- User authentication and authorization
- Function (event) management
- Payer and payment tracking
- Redis caching for improved performance
- RESTful API with TypeScript
- Docker containerization for easy setup and deployment

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/downloads)

### Installation and Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/moi-software-online.git
   cd moi-software-online
   ```

2. Start the Docker containers:
   ```bash
   docker-compose up -d
   ```

3. Access the application:
   - Backend API: [http://localhost:5001](http://localhost:5000)
   - MongoDB Express: [http://localhost:8081](http://localhost:8081)
     - Username: `admin`
     - Password: `pass`
   
## Docker Setup

This project uses Docker to containerize the application components:

- **MongoDB**: Database service
- **MongoDB Express**: Web-based MongoDB admin interface
- **Redis**: In-memory data structure store for caching
- **Node.js Server**: Backend API service

### Docker Commands

```bash
# Start all services
docker-compose up -d

# View running containers
docker ps

# View logs for a specific service
docker-compose logs -f server

# Open a shell in the server container
docker exec -it server /bin/sh

# Stop all services
docker-compose down

# Rebuild a specific service
docker-compose build server

# Restart a specific service
docker-compose restart server
```

## Environment Variables

Create a `.env` file in the server directory with the following variables:

```
# Environment
NODE_ENV=development
PORT=5000

# MongoDB
MONGO_URI=mongodb://admin:password@mongo:27017/moi_software_db?authSource=admin

# Redis
REDIS_URL=redis://:redispassword@redis:6379

# JWT
JWT_SECRET=your_jwt_secret_key_change_this_in_production
JWT_EXPIRE=30d
```

## API Endpoints

![Moi Software API Structure](./docs/images/api_structure.png)

### Authentication

- **Register**: `POST /api/auth/register`
- **Login**: `POST /api/auth/login`
- **Get Profile**: `GET /api/auth/me`

### Functions

- **Create Function**: `POST /api/functions`
- **Get Functions**: `GET /api/functions`
- **Get Function**: `GET /api/functions/:functionId`
- **Update Function**: `PUT /api/functions/:functionId`
- **Delete Function**: `DELETE /api/functions/:functionId`
- **Get Deleted Functions**: `GET /api/functions/deleted`
- **Restore Function**: `PUT /api/functions/:functionId/restore`
- **Get Functions by Date Range**: `GET /api/functions/date-range`
- **Permanently Delete Function**: `DELETE /api/functions/:functionId/permanent`
- **Get Function Denominations**: `GET /api/functions/:functionId/denominations`
- **Bulk Soft Delete Functions**: `POST /api/functions/bulk-delete`
- **Bulk Restore Functions**: `POST /api/functions/bulk-restore`
- **Bulk Permanently Delete Functions**: `POST /api/functions/bulk-permanent-delete`

### Function Search

- **Search Functions**: `GET /api/functions/search`

### Payers

- **Create Payer**: `POST /api/payers`
- **Get Payers**: `GET /api/payers`
- **Get Payer**: `GET /api/payers/:id`
- **Get Payer by Phone**: `GET /api/payers/phone/:phoneNumber`
- **Update Payer**: `PUT /api/payers/:id`
- **Delete Payer**: `DELETE /api/payers/:id`
- **Get Deleted Payers**: `GET /api/payers/deleted`
- **Restore Payer**: `PUT /api/payers/:id/restore`
- **Permanently Delete Payer**: `DELETE /api/payers/:id/permanent`
- **Get Payers by Function**: `GET /api/functions/:functionId/payers`
- **Get Total Payment by Function**: `GET /api/functions/:functionId/total-payment`
- **Get Unique Payer Names**: `GET /api/payers/unique/names`
- **Get Unique Payer Gifts**: `GET /api/payers/unique/gifts`
- **Get Unique Payer Relations**: `GET /api/payers/unique/relations`
- **Get Unique Payer Cities**: `GET /api/payers/unique/cities`
- **Get Unique Payer Work Types**: `GET /api/payers/unique/works`
- **Bulk Soft Delete Payers**: `POST /api/payers/bulk-delete`
- **Bulk Restore Payers**: `POST /api/payers/bulk-restore`
- **Bulk Permanently Delete Payers**: `POST /api/payers/bulk-permanent-delete`

### Payer Search

- **Search All Payers**: `GET /api/payers/search`
- **Search Payers in Function**: `GET /api/functions/:functionId/payers/search`

### Visualization

- **Get Payment Method Distribution**: `GET /api/functions/:functionId/payment-methods`
- **Get Relation Distribution**: `GET /api/functions/:functionId/relation-distribution`
- **Get City Distribution**: `GET /api/functions/:functionId/city-distribution`
- **Get Amount Distribution**: `GET /api/functions/:functionId/amount-distribution`
- **Get Cash vs Gift Comparison**: `GET /api/functions/:functionId/cash-vs-gifts`
- **Get Top Contributors**: `GET /api/functions/:functionId/top-contributors`

### Edit Logs

- **Get All Edit Logs**: `GET /api/edit-logs` (Admin only)
- **Get Edit Log by ID**: `GET /api/edit-logs/:id` (Admin only)
- **Get Edit Logs by Target**: `GET /api/edit-logs/:targetType/:targetId`
- **Get Edit Logs by User**: `GET /api/edit-logs/user/:userId` (Admin only)

## Project Structure

```
MOI_ONLINE/
├── server/                # Backend server
│   ├── api_docs/          # API documentation
│   ├── logs/              # Application logs
│   ├── node_modules/      # Node.js dependencies
│   ├── src/               # Source code
│   │   ├── config/        # Configuration files
│   │   ├── controllers/   # Request controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── models/        # Mongoose models
│   │   ├── routes/        # API routes
│   │   ├── types/         # TypeScript interfaces
│   │   └── utils/         # Utility functions
│   ├── server.ts          # Entry point
│   ├── .dockerignore      # Docker ignore file
│   ├── .env               # Environment variables
│   ├── .eslintrc.js       # ESLint configuration
│   ├── .prettierrc        # Prettier configuration
│   ├── docker-compose.yml # Docker Compose configuration
│   ├── Dockerfile         # Docker configuration
│   ├── Dockerfile.prod    # Production Docker configuration
│   ├── nodemon.json       # Nodemon configuration
│   ├── package-lock.json  # Locked dependencies
│   ├── package.json       # Node.js dependencies
│   ├── README.md          # Project documentation
│   ├── testing_tokens.txt # Testing tokens
│   └── tsconfig.json      # TypeScript configuration
```

## Technologies Used

- **Backend**:
  - Node.js with Express
  - TypeScript
  - MongoDB with Mongoose
  - Redis for caching
  - JWT Authentication

- **DevOps**:
  - Docker
  - Docker Compose

# Redis Cache Management

This section provides instructions on how to manually clear the Redis cache, which can be useful for troubleshooting or resetting the application state.

## Accessing Redis CLI

To manage the Redis cache, you'll need to access the Redis CLI (Command Line Interface):

### 1. Connect to the Redis container

```bash
docker exec -it redis sh
```

### 2. Start the Redis CLI with authentication

```bash
redis-cli -a redispassword
```

You should see a prompt like:
```
127.0.0.1:6379>
```

## Common Redis Commands

Once you're in the Redis CLI, you can use these commands to manage the cache:

### View all keys matching a pattern

```
KEYS "api:*"
```

### Delete specific keys

```
DEL key1 key2 key3
```

### Delete all keys matching a pattern

```
EVAL "for _,k in ipairs(redis.call('keys','api:*')) do redis.call('del',k) end" 0
```

### Clear the entire current database

```
FLUSHDB
```

### Clear all databases

```
FLUSHALL
```

## Using Docker Exec Directly

You can also run Redis commands without entering the container:

```bash
# List all keys matching a pattern
docker exec -it redis redis-cli -a redispassword KEYS "api:*"

# Clear all keys in the database
docker exec -it redis redis-cli -a redispassword FLUSHDB

# Clear specific keys (replace with actual key names)
docker exec -it redis redis-cli -a redispassword DEL "api:/payers" "api:/functions"
```

## When to Clear the Cache

You might need to clear the Redis cache in these situations:

1. **Stale Data**: When API responses don't reflect recent database changes
2. **Testing**: When testing new features and need a fresh start
3. **Troubleshooting**: When diagnosing issues with data consistency
4. **Performance Issues**: When the cache grows too large and impacts performance

## Security Note

Be careful when using `FLUSHALL` and `FLUSHDB` commands in production environments, as they will delete all cached data which could impact performance. For production systems, prefer targeted key deletion rather than clearing the entire cache.

## Troubleshooting

### Common Issues

1. **MongoDB Connection Errors**:
   - Check if MongoDB container is running
   - Verify MongoDB credentials in the `.env` file
   - Ensure the MongoDB URI format is correct

2. **Redis Connection Issues**:
   - Verify Redis container is running
   - Check Redis password in the Docker Compose and `.env` files

3. **Docker Errors**:
   - Ensure Docker and Docker Compose are properly installed
   - Check if ports 5000, 27017, 6379, and 8081 are available
   - Review Docker logs for specific error messages

4. **MongoDB Express Access Issues**:
   - If you can't login to MongoDB Express, ensure you're using:
     - Username: `admin`
     - Password: `pass`
   - Check that the mongo-express container is running properly
   - Verify the MongoDB connection settings in your docker-compose.yml

## Author

Visagan S

---
