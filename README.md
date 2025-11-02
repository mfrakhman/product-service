# Event Driven Product & Order Microservices

A lightweight event-driven microservice system built with NestJS (Product-Service) and Golang (Order-Service), communicating asynchronously through RabbitMQ, with Redis caching and PostgreSQL persistence.

## Architecture Overview
### Component
| Service | Description |
| --- | --- |
| Product-Service (NestJS) | Handles product creation, stock management, and emits product.created events. Listens for order.created events to decrease product quantity. |
| Order-Service (Golang) | Processes incoming order requests asynchronously, stores them in PostgreSQL, and publishes order.created events. |
| RabbitMQ | Acts as the event bus between services for message-driven communication. |
| Redis | Provides caching for frequent reads (GET endpoints). |
| PostgreSQL | Stores products and orders persistently. |

### Tech Stack
#### Order Service (Go)
- Go 1.25.3
- Gin Web Framework
- pgx/v5 (PostgreSQL driver)
- RabbitMQ client
- Redis client

#### Product Service (Node.js)
- NestJS 11.x
- TypeORM
- Redis (via cache-manager)
- RabbitMQ integration
- TypeScript 5.x

#### Infrastructure
- PostgreSQL 17
- Redis 7
- RabbitMQ 3.x with Management Console
- Docker & Docker Compose

## Project Structure
```
root folder/
├── docker-compose.yml    # Container orchestration
├── order-service/        # Go-based order management service
│   ├── cmd/              # Application entrypoint
│   ├── config/           # Configuration management
│   └── internal/         # Internal packages
│       ├── cache/        # Redis cache implementation
│       ├── db/           # Database connectivity
│       ├── handlers/     # HTTP handlers
│       ├── models/       # Domain models
│       ├── rabbitmq/     # Message queue client
│       ├── repository/   # Data access layer
│       └── service/     # Business logic
└── product-service/    # NestJS-based product management
    ├── src/
    │   ├── products/  # Product module
    │   ├── rabbitmq/ # RabbitMQ integration
    │   └── main.ts   # Application entry point
    └── test/        # E2E tests
```
## Installation & Setup

1. Create new folder (example MrScrapperTest) 
2. Open the folder and bash
3. Clone both the repository:
   ```bash
   git clone <repository-url>
   ```
4. Open the root folder and add the docker-compose.yml
  or cut the docker-compose.yml file from product-service repo and put in root-folder
    ```yml
    services:
        postgres:
            image: postgres:17
            container_name: postgres_db
            environment:
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: postgres
            POSTGRES_DB: product_db
            ports:
            - "5432:5432"
            volumes:
            - pgdata:/var/lib/postgresql/data
            networks:
            - app-network

        redis:
            image: redis:7
            container_name: redis
            ports:
            - "6379:6379"
            networks:
            - app-network

        rabbitmq:
            image: rabbitmq:3-management
            container_name: rabbitmq
            healthcheck:
            test: rabbitmq-diagnostics -q ping
            interval: 30s
            timeout: 10s
            retries: 5
            ports:
            - "5672:5672"
            - "15672:15672"
            environment:
            RABBITMQ_DEFAULT_USER: guest
            RABBITMQ_DEFAULT_PASS: guest
            networks:
            - app-network

        product-service:
            build: ./product-service
            container_name: product-service
            depends_on:
            postgres:
                condition: service_started
            rabbitmq:
                condition: service_healthy
            redis:
                condition: service_started
            environment:
            DB_HOST: postgres
            DB_PORT: 5432
            DB_USER: postgres
            DB_PASS: postgres
            DB_NAME: product_db
            RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
            REDIS_HOST: redis
            REDIS_PORT: 6379
            PORT: 3001
            ports:
            - "3001:3001"
            deploy:
            resources:
                limits:
                cpus: "2.0"
                memory: 512M
            networks:
            - app-network

        order-service:
            build: ./order-service
            container_name: order-service
            depends_on:
            postgres:
                condition: service_started
            rabbitmq:
                condition: service_healthy
            redis:
                condition: service_started
            environment:
            DB_HOST: postgres
            DB_PORT: 5432
            DB_USER: postgres
            DB_PASS: postgres
            DB_NAME: product_db
            POSTGRES_MAX_IDLE_CONNS: 10
            POSTGRES_MAX_OPEN_CONNS: 1000
            POSTGRES_CONN_MAX_LIFETIME_MINUTES: 30
            RABBITMQ_URL: amqp://guest:guest@rabbitmq:5672
            PRODUCT_API_URL: http://product-service:3001/products
            REDIS_HOST: redis
            REDIS_PORt: 6379
            PORT: 3002
            ports:
            - "3002:3002"
            deploy:
            resources:
                limits:
                cpus: "2.0"
                memory: 512M
            networks:
            - app-network

    networks:
    app-network:
        driver: bridge

    volumes:
    pgdata:
    ```
5. Build and Start Services:
   ```bash
   //make sure you are on project-root
   docker compose up --build
   ```
   This will start:
   - PostgreSQL
   - Redis
   - RabbitMQ
   - Product-Service (port 3001)
   - Order-Service (port 3002)

## Full System Flow Diagram
```plain
           ┌────────────────────────┐
           │        Client          │
           │ (Frontend / Postman)   │
           └────────────┬───────────┘
                        │
                        │
      ┌─────────────────┴─────────────────┐
      │                                   │
      ▼                                   ▼    
  Product-Service                      Order-Service      
    (NestJS)                             (Golang)      
                             

```
#### Create Product — POST /products
```plain
Client
  │
  ▼
[ Product-Service ]
  │
  ├── Validate request (name, price, qty)
  ├── Insert product into PostgreSQL
  │       └── Table: products (id, name, price, qty, createdAt)
  ├── Store product info in Redis (cache)
  └── Emit event "product.created" → RabbitMQ
```
#### GET /products/:id
```plain
Client
  │
  ▼
[ Product-Service ]
  │
  ├── Check Redis cache for key: "product:{id}"
  │      ├── If found → Return cached product (fast)
  │      └── If not found:
  │             ├── Fetch from PostgreSQL
  │             ├── Save to Redis cache
  │             └── Return to client
  ▼
 Response → JSON { id, name, price, qty, createdAt }
```
#### Create Order — POST /orders
```plain
Client
  │
  ▼
[ Order-Service ]
  │
  ├── Fetch product info from Product-Service via HTTP (http://product-service:3001/products/:id)
  │      ├── Validate stock (qty >= request.qty)
  │      └── If not found → return 404 or 400
  │
  ├── Calculate totalPrice = product.price × quantity
  ├── Queue order into async worker channel
  │
  ├── Background Worker:
  │      ├── Insert order into PostgreSQL
  │      │       └── Table: orders (id, productId, totalPrice, status, createdAt)
  │      ├── Publish "order.created" event → RabbitMQ
  │      └── Log order creation success
  │
  └── Return immediate HTTP 201 (non-blocking)
```
#### Get Orders by Product ID — GET /orders?productId={id}
```plain
Client
  │
  ▼
[ Order-Service ]
  │
  ├── Check Redis cache for key: "orders:{productId}"
  │      ├── If found → Return cached orders list
  │      └── If not found:
  │             ├── Query PostgreSQL for orders
  │             ├── Cache result in Redis
  │             └── Return to client
  ▼
 Response → JSON array of orders
```
#### Event Flow Order.Created -> Product Quantity Update
```plain
[ Order-Service ]
  │
  └── Publish event → "order.exchange" → "order.created"
            │
            ▼
      [ RabbitMQ Broker ]
            │
            ▼
      [ Product-Service ]
            │
            ├── Consume "order.created" event
            ├── Update product.qty -= order.quantity
            ├── Save updated product in PostgreSQL
            └── Refresh Redis cache with new product data
```

1. **Product Service** (Port 3001)
   - Manages product inventory and pricing
   - Provides REST API for product operations
   - Listens for order events to update inventory
   - Uses Redis for product caching

2. **Order Service** (Port 3002)
   - Handles order creation and management
   - Publishes order events to RabbitMQ
   - Validates products via Product Service API
   - Uses Redis for order caching




## Summary Data Flow
| Operation | Origin | Destination | Communication | Description |
|--------|----------|-------------|--------|--------|
| POST /products | Client | Product-Service | HTTP | Create a new product |
| GET /products/:id | Client | Product-Service |HTTP + Redis | Retrieve product (cached) |
| POST /orders | Client | Order-service | HTTP + RabbitMQ | Create async order & emit event |
| GET /orders?productId= | Client | Order-service | HTTP + Redis | Retrieve cached orders |
| order.created | Order-service | Product-Service | RabbitMQ | Product stock update |

## Example API Request
Import MrScrapperTest.postman_collection.json from product-service repo to your postman, Or curl below
### Create Product
```bash
curl --location 'http://localhost:3001/products' \
--header 'Content-Type: application/json' \
--data '{
  "name": "G102 Mouse",
  "price": 190000,
  "qty": 10000
}'
```
### Get ProductById
```bash
curl --location 'http://localhost:3001/products/<product_id>'
```
### Create Order
```bash
curl --location 'http://localhost:3002/orders' \
--header 'Content-Type: application/json' \
--data '{
  "productId": "<product_id>",
  "quantity": 2
}'
```
### Get OrdersByProductId
```bash
curl --location 'http://localhost:3002/orders?productId=<product_id>'
```
## Load Test

### Insall k6
```bash
choco install k6    # Windows
brew install k6     # macOS

```

### Example script
```js
import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    create_orders: {
      executor: "constant-arrival-rate",
      rate: 1000, 
      timeUnit: "1s",
      duration: "60s", 
      preAllocatedVUs: 200, 
      maxVUs: 500,
    },
  },
};

const BASE_URL = "http://localhost:3002/orders";
const PRODUCT_ID = __ENV.PRODUCT_ID || "8f1ec8a2-67dc-436b-abcc-d77b8c8fa0ed"; // <- Change it to "ProductId"

export default function () {
  const payload = JSON.stringify({
    productId: PRODUCT_ID,
    quantity: 1,
  });

  const params = { headers: { "Content-Type": "application/json" } };

  const res = http.post(BASE_URL, payload, params);

  check(res, {
    "status is 201": r => r.status === 201,
  });
}

```

## Resource Management

The system is configured with resource limits:
- Each service: 2 CPU cores, 512MB RAM
- Optimized database connection pools
- Configurable Redis cache settings
- Monitored RabbitMQ queues with health checks

## Monitoring & Management

- RabbitMQ Management Console: http://localhost:15672
  - Default credentials: guest/guest
- PostgreSQL: localhost:5432
- Redis: localhost:6379
