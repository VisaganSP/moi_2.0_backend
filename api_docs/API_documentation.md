# MOI Software Online API Documentation
#### Visagan S

This document provides comprehensive information about the MOI Software Online API endpoints, including authentication, function management, and payer management.

## Table of Contents

- [Authentication Endpoints](#authentication-endpoints)
  - [Register User](#register-user)
  - [Login User](#login-user)
  - [Get Current User](#get-current-user)
- [Function Endpoints](#function-endpoints)
  - [Create Function](#create-function)
  - [Get All Functions](#get-all-functions)
  - [Get Function by ID](#get-function-by-id)
  - [Update Function](#update-function)
  - [Delete Function](#delete-function)
  - [Get Deleted Functions](#get-deleted-functions)
  - [Restore Function](#restore-function)
  - [Get Functions by Date Range](#get-functions-by-date-range)
  - [Delete Function Permanently](#permanently-delete-function)
- [Payer Endpoints](#payer-endpoints)
  - [Create Payer](#create-payer)
  - [Get All Payers](#get-all-payers)
  - [Get Payer by ID](#get-payer-by-id)
  - [Update Payer](#update-payer)
  - [Delete Payer](#delete-payer)
  - [Get Deleted Payers](#get-deleted-payers)
  - [Restore Payer](#restore-payer)
  - [Permanently Delete Payer](#permanently-delete-payer)
  - [Get Payers by Function](#get-payers-by-function)
  - [Get Total Payment by Function](#get-total-payment-by-function)
  - [Get Payer by Phone Number](#get-payer-by-phone-number)
  - [Get Unique Payer Names](#get-unique-payer-names)
  - [Get Unique Payer Gifts](#get-unique-payer-gifts)
  - [Get Unique Payer Relations](#get-unique-payer-relations)
  - [Get Unique Payer Cities](#get-unique-payer-cities)
  - [Get Unique Payer Work Types](#get-unique-payer-work-types)
- [MongoDB Express Access](#mongodb-express-access)

## Base URL

All endpoints are relative to the base URL:

```
http://localhost:5001/api
```

## Authentication Endpoints

### Register User

Creates a new user account.

- **URL**: `/auth/register`
- **Method**: `POST`
- **Auth Required**: No
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "username": "testuser",
  "email": "testuser@example.com",
  "password": "password123"
}
```

**Example Request**:

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "password123"
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "68223597f95499dd5046930f",
    "username": "testuser",
    "email": "testuser@example.com",
    "isAdmin": false,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MjIzNTk3Zjk1NDk5ZGQ1MDQ2OTMwZiIsImlhdCI6MTc0NzA3MjQwNywiZXhwIjoxNzQ5NjY0NDA3fQ.CVANSH6mcA3E0eV8I-UuGeuGyWWkbNL9fWZLxHZmfWA"
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "User already exists"
}
```

### Login User

Authenticates a user and returns a JWT token.

- **URL**: `/auth/login`
- **Method**: `POST`
- **Auth Required**: No
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "email": "admin@example.com",
  "password": "adminpassword"
}
```

**Example Request**:

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "adminpassword"
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "682235dbf95499dd50469312",
    "username": "adminuser",
    "email": "admin@example.com",
    "isAdmin": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MjIzNWRiZjk1NDk5ZGQ1MDQ2OTMxMiIsImlhdCI6MTc0NzA3Mjk3OCwiZXhwIjoxNzQ5NjY0OTc4fQ.Fc8FZpJnRAoN6v7d6eqNbRQFYugj1oh-3lLEh4kvYVk"
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### Get Current User

Retrieves the currently authenticated user's information.

- **URL**: `/auth/me`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4MjIzNWRiZjk1NDk5ZGQ1MDQ2OTMxMiIsImlhdCI6MTc0NzA3Mjk3OCwiZXhwIjoxNzQ5NjY0OTc4fQ.Fc8FZpJnRAoN6v7d6eqNbRQFYugj1oh-3lLEh4kvYVk"
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "682235dbf95499dd50469312",
    "username": "adminuser",
    "email": "admin@example.com",
    "isAdmin": true
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Not authorized to access this route"
}
```

## Function Endpoints

### Create Function

Creates a new function (event). Admin only.

- **URL**: `/functions`
- **Method**: `POST`
- **Auth Required**: Yes (JWT Token with Admin privileges)
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "function_name": "Wedding Reception",
  "function_owner_name": "John Doe",
  "function_owner_city": "Chennai",
  "function_owner_address": "123 Main St",
  "function_owner_phno": "9876543210",
  "function_amt_spent": 500000,
  "function_hero_name": "Groom Name",
  "function_heroine_name": "Bride Name",
  "function_held_place": "Golden Palace",
  "function_held_city": "Chennai",
  "function_start_date": "2025-06-15T00:00:00.000Z",
  "function_start_time": "10:00 AM",
  "function_end_date": "2025-06-15T00:00:00.000Z",
  "function_end_time": "10:00 PM",
  "function_total_days": 1,
  "function_bill_details": {
    "owner_name": "John Doe",
    "owner_occupation": "Software Engineer",
    "wife_name": "Jane Doe",
    "wife_occupation": "Doctor",
    "function_place": "Golden Palace",
    "function_city": "Chennai"
  }
}
```

**Example Request**:

```bash
curl -X POST http://localhost:5001/api/functions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "function_name": "Wedding Reception",
    "function_owner_name": "John Doe",
    "function_owner_city": "Chennai",
    "function_owner_address": "123 Main St",
    "function_owner_phno": "9876543210",
    "function_amt_spent": 500000,
    "function_hero_name": "Groom Name",
    "function_heroine_name": "Bride Name",
    "function_held_place": "Golden Palace",
    "function_held_city": "Chennai",
    "function_start_date": "2025-06-15T00:00:00.000Z",
    "function_start_time": "10:00 AM",
    "function_end_date": "2025-06-15T00:00:00.000Z",
    "function_end_time": "10:00 PM",
    "function_total_days": 1,
    "function_bill_details": {
      "owner_name": "John Doe",
      "owner_occupation": "Software Engineer",
      "wife_name": "Jane Doe",
      "wife_occupation": "Doctor",
      "function_place": "Golden Palace",
      "function_city": "Chennai"
    }
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "683246abcd1234567890",
    "function_name": "Wedding Reception",
    "function_owner_name": "John Doe",
    "created_at": "2025-05-12T12:00:00.000Z",
    "updated_at": "2025-05-12T12:00:00.000Z"
    // ... other fields
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Not authorized as an admin"
}
```

### Get All Functions

Retrieves a list of all functions.

- **URL**: `/functions`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)
  - `search`: Search term for function name

**Example Request**:

```bash
# Basic query
curl -X GET http://localhost:5001/api/functions \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# With pagination
curl -X GET http://localhost:5001/api/functions?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# With search
curl -X GET http://localhost:5001/api/functions?search=Wedding \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 1,
  "pagination": {
    "current": 1,
    "pages": 1,
    "total": 1
  },
  "data": [
    {
      "_id": "683246abcd1234567890",
      "function_name": "Wedding Reception",
      "function_owner_name": "John Doe",
      "function_held_place": "Golden Palace",
      "function_held_city": "Chennai",
      "function_start_date": "2025-06-15T00:00:00.000Z",
      "function_end_date": "2025-06-15T00:00:00.000Z",
      "function_amt_spent": 500000,
      "created_at": "2025-05-12T12:00:00.000Z"
      // ... other fields
    }
  ]
}
```

### Get Function by ID

Retrieves a specific function by its ID.

- **URL**: `/functions/:id`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/functions/683246abcd1234567890 \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "683246abcd1234567890",
    "function_name": "Wedding Reception",
    "function_owner_name": "John Doe",
    "function_owner_city": "Chennai",
    "function_owner_address": "123 Main St",
    "function_owner_phno": "9876543210",
    "function_amt_spent": 500000,
    "function_hero_name": "Groom Name",
    "function_heroine_name": "Bride Name",
    "function_held_place": "Golden Palace",
    "function_held_city": "Chennai",
    "function_start_date": "2025-06-15T00:00:00.000Z",
    "function_start_time": "10:00 AM",
    "function_end_date": "2025-06-15T00:00:00.000Z",
    "function_end_time": "10:00 PM",
    "function_total_days": 1,
    "function_bill_details": {
      "owner_name": "John Doe",
      "owner_occupation": "Software Engineer",
      "wife_name": "Jane Doe",
      "wife_occupation": "Doctor",
      "function_place": "Golden Palace",
      "function_city": "Chennai"
    },
    "created_by": "682235dbf95499dd50469312",
    "created_at": "2025-05-12T12:00:00.000Z",
    "updated_at": "2025-05-12T12:00:00.000Z"
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Function not found"
}
```

### Update Function

Updates a specific function by its ID. Admin only.

- **URL**: `/functions/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (JWT Token with Admin privileges)
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "function_name": "Wedding Reception - Updated",
  "function_amt_spent": 550000
}
```

**Example Request**:

```bash
curl -X PUT http://localhost:5001/api/functions/683246abcd1234567890 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "function_name": "Wedding Reception - Updated",
    "function_amt_spent": 550000
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "683246abcd1234567890",
    "function_name": "Wedding Reception - Updated",
    "function_amt_spent": 550000,
    // ... other fields (unchanged)
    "updated_at": "2025-05-12T13:00:00.000Z"
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Not authorized as an admin"
}
```

### Delete Function

Soft-deletes a function by setting `is_deleted` to true. Admin only.

- **URL**: `/functions/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (JWT Token with Admin privileges)

**Example Request**:

```bash
curl -X DELETE http://localhost:5001/api/functions/683246abcd1234567890 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {}
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Not authorized as an admin"
}
```

### Get Deleted Functions

Retrieves a list of all deleted functions. Admin only.

- **URL**: `/functions/deleted`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token with Admin privileges)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/functions/deleted \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# With pagination
curl -X GET http://localhost:5001/api/functions/deleted?page=1&limit=10 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 1,
  "pagination": {
    "current": 1,
    "pages": 1,
    "total": 1
  },
  "data": [
    {
      "_id": "683246abcd1234567890",
      "function_name": "Wedding Reception",
      "is_deleted": true,
      "deleted_at": "2025-05-13T10:00:00.000Z",
      // ... other fields
    }
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Not authorized as an admin"
}
```

### Restore Function

Restores a deleted function by setting `is_deleted` to false. Admin only.

- **URL**: `/functions/:id/restore`
- **Method**: `PUT`
- **Auth Required**: Yes (JWT Token with Admin privileges)

**Example Request**:

```bash
curl -X PUT http://localhost:5001/api/functions/683246abcd1234567890/restore \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "683246abcd1234567890",
    "function_name": "Wedding Reception",
    "is_deleted": false,
    "deleted_at": null,
    // ... other fields
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Not authorized as an admin"
}
```

### Get Functions by Date Range

Retrieves functions within a specified date range.

- **URL**: `/functions/date-range`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Query Parameters**:
  - `startDate`: Start date in ISO format (YYYY-MM-DD)
  - `endDate`: End date in ISO format (YYYY-MM-DD)

**Example Request**:

```bash
curl -X GET "http://localhost:5001/api/functions/date-range?startDate=2025-06-01&endDate=2025-06-30" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "683246abcd1234567890",
      "function_name": "Wedding Reception",
      "function_start_date": "2025-06-15T00:00:00.000Z",
      "function_end_date": "2025-06-15T00:00:00.000Z",
      // ... other fields
    }
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Please provide start and end dates"
}
```

### Permanently Delete Function

Permanently deletes a function from the database that has already been soft-deleted. This action cannot be undone. Admin only.

- **URL**: `/functions/:id/permanent`
- **Method**: `DELETE`
- **Auth Required**: Yes (JWT Token with Admin privileges)

**Example Request**:

```bash
curl -X DELETE http://localhost:5001/api/functions/683246abcd1234567890/permanent \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {},
  "message": "Function permanently deleted"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Function not found or is not soft-deleted"
}
```
This implementation ensures that only already soft-deleted functions can be permanently removed from the database, adding an extra layer of protection against accidental data loss.

## Payer Endpoints

### Create Payer

Creates a new payer (contributor) for a function.

- **URL**: `/payers`
- **Method**: `POST`
- **Auth Required**: Yes (JWT Token)
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "function_id": "683246abcd1234567890",
  "function_name": "Wedding Reception",
  "payer_name": "Rahul Kumar",
  "payer_phno": "9876543211",
  "payer_work": "Business",
  "payer_given_object": "Cash",
  "payer_cash_method": "Bank Transfer",
  "payer_amount": 25000,
  "payer_gift_name": "",
  "payer_relation": "Friend",
  "payer_city": "Bangalore",
  "payer_address": "456 Park Avenue",
  "current_date": "2025-05-12T12:00:00.000Z",
  "current_time": "2:00 PM"
}
```

**Example Request**:

```bash
curl -X POST http://localhost:5001/api/payers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "function_id": "683246abcd1234567890",
    "function_name": "Wedding Reception",
    "payer_name": "Rahul Kumar",
    "payer_phno": "9876543211",
    "payer_work": "Business",
    "payer_given_object": "Cash",
    "payer_cash_method": "Bank Transfer",
    "payer_amount": 25000,
    "payer_gift_name": "",
    "payer_relation": "Friend",
    "payer_city": "Bangalore",
    "payer_address": "456 Park Avenue",
    "current_date": "2025-05-12T12:00:00.000Z",
    "current_time": "2:00 PM"
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "683247efgh5678901234",
    "function_id": "683246abcd1234567890",
    "function_name": "Wedding Reception",
    "payer_name": "Rahul Kumar",
    "payer_phno": "9876543211",
    "payer_amount": 25000,
    "created_at": "2025-05-12T12:00:00.000Z",
    "updated_at": "2025-05-12T12:00:00.000Z"
    // ... other fields
  }
}
```

### Get All Payers

Retrieves a list of all payers, optionally filtered by function.

- **URL**: `/payers`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Query Parameters**:
  - `function_id`: Filter by function ID (optional)
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)
  - `search`: Search term for payer name or phone

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/payers?function_id=683246abcd1234567890&page=1&limit=10 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 1,
  "pagination": {
    "current": 1,
    "pages": 1,
    "total": 1
  },
  "data": [
    {
      "_id": "683247efgh5678901234",
      "function_id": "683246abcd1234567890",
      "function_name": "Wedding Reception",
      "payer_name": "Rahul Kumar",
      "payer_phno": "9876543211",
      "payer_amount": 25000,
      "payer_relation": "Friend",
      "created_at": "2025-05-12T12:00:00.000Z"
      // ... other fields
    }
  ]
}
```

### Get Payer by ID

Retrieves a specific payer by its ID.

- **URL**: `/payers/:id`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/payers/683247efgh5678901234 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "683247efgh5678901234",
    "function_id": "683246abcd1234567890",
    "function_name": "Wedding Reception",
    "payer_name": "Rahul Kumar",
    "payer_phno": "9876543211",
    "payer_work": "Business",
    "payer_given_object": "Cash",
    "payer_cash_method": "Bank Transfer",
    "payer_amount": 25000,
    "payer_gift_name": "",
    "payer_relation": "Friend",
    "payer_city": "Bangalore",
    "payer_address": "456 Park Avenue",
    "current_date": "2025-05-12T12:00:00.000Z",
    "current_time": "2:00 PM",
    "created_by": "682235dbf95499dd50469312",
    "created_at": "2025-05-12T12:00:00.000Z",
    "updated_at": "2025-05-12T12:00:00.000Z"
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Payer not found"
}
```

### Update Payer

Updates a specific payer by its ID.

- **URL**: `/payers/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (JWT Token)
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "payer_amount": 30000,
  "payer_cash_method": "Cash"
}
```

**Example Request**:

```bash
curl -X PUT http://localhost:5001/api/payers/683247efgh5678901234 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "payer_amount": 30000,
    "payer_cash_method": "Cash"
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "683247efgh5678901234",
    "payer_amount": 30000,
    "payer_cash_method": "Cash",
    // ... other fields (unchanged)
    "updated_at": "2025-05-12T13:00:00.000Z"
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Payer not found"
}
```

### Delete Payer

Soft-deletes a payer by setting `is_deleted` to true.

- **URL**: `/payers/:id`
- **Method**: `DELETE`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X DELETE http://localhost:5001/api/payers/683247efgh5678901234 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {}
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Payer not found"
}
```

### Get Deleted Payers

Retrieves a list of all soft-deleted payers.

- **URL**: `/payers/deleted`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Query Parameters**:
  - `function_id`: Filter by function ID (optional)
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/payers/deleted \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 1,
  "pagination": {
    "current": 1,
    "pages": 1,
    "total": 1
  },
  "data": [
    {
      "_id": "683247efgh5678901234",
      "function_id": "683246abcd1234567890",
      "function_name": "Wedding Reception",
      "payer_name": "Rahul Kumar",
      "is_deleted": true,
      "deleted_at": "2025-05-13T10:00:00.000Z",
      // ... other fields
    }
  ]
}
```

### Restore Payer

Restores a soft-deleted payer.

- **URL**: `/payers/:id/restore`
- **Method**: `PUT`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X PUT http://localhost:5001/api/payers/683247efgh5678901234/restore \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "683247efgh5678901234",
    "function_id": "683246abcd1234567890",
    "function_name": "Wedding Reception",
    "payer_name": "Rahul Kumar",
    "is_deleted": false,
    // ... other fields
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Payer not found or not deleted"
}
```

### Permanently Delete Payer

Permanently deletes a payer that has already been soft-deleted.

- **URL**: `/payers/:id/permanent`
- **Method**: `DELETE`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X DELETE http://localhost:5001/api/payers/683247efgh5678901234/permanent \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {},
  "message": "Payer permanently deleted"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Payer not found or is not soft-deleted"
}
```

### Get Payers by Function

Retrieves all payers associated with a specific function.

- **URL**: `/functions/:functionId/payers`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Results per page (default: 10)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/functions/683246abcd1234567890/payers \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 1,
  "pagination": {
    "current": 1,
    "pages": 1,
    "total": 1
  },
  "data": [
    {
      "_id": "683247efgh5678901234",
      "function_id": "683246abcd1234567890",
      "function_name": "Wedding Reception",
      "payer_name": "Rahul Kumar",
      "payer_amount": 25000,
      // ... other fields
    }
  ]
}
```

### Get Total Payment by Function

Retrieves the total payment amount and count of payers for a specific function.

- **URL**: `/functions/:functionId/total-payment`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/functions/683246abcd1234567890/total-payment \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "totalAmount": 75000,
    "count": 3
  }
}
```

### Get Payer by Phone Number

Retrieves payers based on a phone number.

- **URL**: `/payers/phone/:phoneNumber`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/payers/phone/9876543211 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "683247efgh5678901234",
      "function_id": "683246abcd1234567890",
      "function_name": "Wedding Reception",
      "payer_name": "Rahul Kumar",
      "payer_phno": "9876543211",
      "payer_work": "Business",
      "payer_given_object": "Cash",
      "payer_cash_method": "Bank Transfer",
      "payer_amount": 25000,
      "payer_relation": "Friend",
      "payer_city": "Bangalore",
      "created_at": "2025-05-12T12:00:00.000Z"
      // ... other fields
    }
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "message": "No payer found with this phone number"
}
```

or

```json
{
  "success": false,
  "error": "Phone number is required"
}
```

### Get Unique Payer Names

Retrieves a list of all unique payer names from non-deleted records.

- **URL**: `/payers/unique/names`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/payers/unique/names \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 3,
  "data": [
    "Rahul Kumar",
    "Priya Singh",
    "Amit Patel"
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Error fetching unique payer names"
}
```

### Get Unique Payer Gifts

Retrieves a list of all unique gift names from non-deleted records, excluding empty strings.

- **URL**: `/payers/unique/gifts`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/payers/unique/gifts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 3,
  "data": [
    "Silver Plate",
    "Gold Bracelet",
    "Crystal Vase"
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Error fetching unique payer gifts"
}
```

### Get Unique Payer Relations

Retrieves a list of all unique payer relation types from non-deleted records.

- **URL**: `/payers/unique/relations`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/payers/unique/relations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 4,
  "data": [
    "Friend",
    "Family",
    "Colleague",
    "Neighbor"
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Error fetching unique payer relations"
}
```

### Get Unique Payer Cities

Retrieves a list of all unique payer cities from non-deleted records.

- **URL**: `/payers/unique/cities`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/payers/unique/cities \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 4,
  "data": [
    "Bangalore",
    "Chennai",
    "Mumbai",
    "Delhi"
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Error fetching unique payer cities"
}
```

### Get Unique Payer Work Types

Retrieves a list of all unique payer work types from non-deleted records.

- **URL**: `/payers/unique/works`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/payers/unique/works \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 5,
  "data": [
    "Business",
    "Full Stack",
    "Doctor",
    "Engineer",
    "Teacher"
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Error fetching unique payer work types"
}
```

## MongoDB Express Access

MongoDB Express provides a web-based administrative interface for the MongoDB database.

- **URL**: [http://localhost:8081](http://localhost:8081)
- **Username**: `admin`
- **Password**: `pass`

Using MongoDB Express, you can:
- Browse and query collections
- View, insert, update, and delete documents
- Create and manage indexes
- Monitor database operations

---

This documentation covers the primary API endpoints of the MOI Software Online application. For additional functionality or custom queries, please refer to the source code or contact Visagan.