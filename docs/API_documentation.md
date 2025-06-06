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
  - [Get Function Denominations](#get-function-denominations)
  - [Bulk Soft Delete Functions](#bulk-soft-delete-functions)
  - [Bulk Restore Functions](#bulk-restore-functions)
  - [Bulk Permanently Delete Functions](#bulk-permanently-delete-functions)
- [Function Search Endpoints](#function-search-endpoints)
  - [Base Search Endpoint](#base-search-endpoint)
  - [Query Parameters](#query-parameters)
  - [Searchable Fields](#searchable-fields)
  - [Search Types](#search-types)
    - [Partial Search](#1-partial-search-default)
    - [Exact Match](#2-exact-match)
    - [Starts With](#3-starts-with)
    - [Ends With](#4-ends-with)
    - [Fuzzy Search](#5-fuzzy-search)
  - [Special Field Searches](#special-field-searches)
    - [Phone Number Search](#phone-number-search)
    - [Amount Search](#amount-search)
    - [Date Search](#date-search)
  - [Advanced Search Examples](#advanced-search-examples)
    - [Search with Pagination](#search-with-pagination)
    - [Search with Custom Sorting](#search-with-custom-sorting)
  - [Response Format](#response-format)
  - [Error Responses](#error-responses)
  - [Performance Notes](#performance-notes)
  - [Use Cases](#use-cases)
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
  - [Bulk Soft Delete Payers](#bulk-soft-delete-payers)
  - [Bulk Restore Payers](#bulk-restore-payers)
  - [Bulk Permanently Delete Payers](#bulk-permanently-delete-payers)
- [Payer Search Endpoints](#payer-search-endpoints)
  - [Base Search Endpoints](#base-search-endpoints)
  - [Query Parameters](#query-parameters-1)
  - [Searchable Fields](#searchable-fields-1)
  - [Search Types](#search-types-1)
    - [Partial Search](#1-partial-search-default-1)
    - [Exact Match](#2-exact-match-1)
    - [Starts With](#3-starts-with-1)
    - [Ends With](#4-ends-with-1)
    - [Fuzzy Search](#5-fuzzy-search-1)
  - [Special Field Searches](#special-field-searches-1)
    - [Phone Number Search](#phone-number-search-1)
    - [Amount Search](#amount-search-1)
    - [Payment Method Search](#payment-method-search)
  - [Advanced Search Examples](#advanced-search-examples-1)
    - [Search with Pagination](#search-with-pagination-1)
    - [Search with Custom Sorting](#search-with-custom-sorting-1)
  - [Response Format](#response-format-1)
  - [Error Responses](#error-responses-1)
  - [Performance Notes](#performance-notes-1)
  - [Use Cases](#use-cases-1)
- [Visualization Endpoints](#visualization-endpoints)
  - [Get Payment Method Distribution](#get-payment-method-distribution)
  - [Get Relation Distribution](#get-relation-distribution)
  - [Get City Distribution](#get-city-distribution)
  - [Get Amount Distribution](#get-amount-distribution)
  - [Get Cash vs Gift Comparison](#get-cash-vs-gift-comparison)
  - [Get Top Contributors](#get-top-contributors)
- [Edit Logs Endpoints](#edit-logs-endpoints)
  - [Get All Edit Logs](#get-all-edit-logs)
  - [Get Edit Log by ID](#get-edit-log-by-id)
  - [Get Edit Logs by Target](#get-edit-logs-by-target)
  - [Get Edit Logs by User](#get-edit-logs-by-user)
- [MongoDB Express Access](#mongodb-express-access)

### API Endpoint Hierarchy

![API Endpoint Hierarchy](images/api_hierarchy.png)

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
  "function_amt_spent": 550000,
  "reason_for_edit": "Updated function name and increased budget allocation"
}
```

**Example Request**:

```bash
curl -X PUT http://localhost:5001/api/functions/683246abcd1234567890 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "function_name": "Wedding Reception - Updated",
    "function_amt_spent": 550000,
    "reason_for_edit": "Updated function name and increased budget allocation"
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

**Error Responses**:

```json
{
  "success": false,
  "error": "Not authorized as an admin"
}
```

```json
{
  "success": false,
  "error": "Reason for edit is required"
}
```

```json
{
  "success": false,
  "error": "Function not found"
}
```

**Notes**:

- The `reason_for_edit` field is required and must explain why the function is being updated
- All updates are logged in the edit history and can be viewed through the Edit Logs API
- The `function_id` field cannot be modified with this endpoint
- The cache is automatically invalidated after an update to ensure fresh data

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

### Get Function Denominations
Retrieves a summary of all cash denominations for a specific function.

- **URL**: `/functions/:functionId/denominations`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)

**Parameters**:
- `functionId` (required): The ID of the function to get denomination summary for

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/functions/683246abcd1234567890/denominations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "denominations_in_hand": {
      "2000": 25,
      "500": 10,
      "100": 5
    },
    "total_in_hand": 55500,
    "total_received": 75000,
    "total_returned": 19500,
    "cash_out_pay": 0,
    "special_handler_pay": 0,
    "total_final_amount": 55500,
    "computer_total": 55500,
    "difference": 0
  },
  "timestamp": "2025-05-12T14:30:00.000Z"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Failed to generate denomination summary"
}
```

**Notes**:
- Only includes cash payers (where `payer_given_object` is "Cash")
- Excludes deleted payers (`is_deleted: false`)
- Calculates net denominations by subtracting returned from received
- Only non-zero denominations are included in the response
- `total_in_hand` represents the actual cash amount based on denomination counts
- `cash_out_pay` and `special_handler_pay` are placeholder fields for future use
- The response includes a timestamp for tracking when the summary was generated

### Bulk Soft Delete Functions

Soft-deletes multiple functions at once. Admin only.

- **URL**: `/functions/bulk-delete`
- **Method**: `POST`
- **Auth Required**: Yes (JWT Token with Admin privileges)
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "function_ids": [
    "wedding-reception-john_doe-chennai-2025-06-15-10_00_am",
    "birthday-party-jane_smith-mumbai-2025-07-20-6_00_pm",
    "anniversary-celebration-kumar_family-delhi-2025-08-10-7_00_pm"
  ]
}
```

**Example Request**:

```bash
curl -X POST http://localhost:5001/api/functions/bulk-delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "function_ids": [
      "wedding-reception-john_doe-chennai-2025-06-15-10_00_am",
      "birthday-party-jane_smith-mumbai-2025-07-20-6_00_pm"
    ]
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "deleted": [
      "wedding-reception-john_doe-chennai-2025-06-15-10_00_am",
      "birthday-party-jane_smith-mumbai-2025-07-20-6_00_pm"
    ],
    "notFound": [],
    "deletedCount": 2
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Please provide an array of function_ids"
}
```

### Bulk Restore Functions

Restores multiple soft-deleted functions at once. Admin only.

- **URL**: `/functions/bulk-restore`
- **Method**: `POST`
- **Auth Required**: Yes (JWT Token with Admin privileges)
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "function_ids": [
    "wedding-reception-john_doe-chennai-2025-06-15-10_00_am",
    "birthday-party-jane_smith-mumbai-2025-07-20-6_00_pm"
  ]
}
```

**Example Request**:

```bash
curl -X POST http://localhost:5001/api/functions/bulk-restore \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "function_ids": [
      "wedding-reception-john_doe-chennai-2025-06-15-10_00_am",
      "birthday-party-jane_smith-mumbai-2025-07-20-6_00_pm"
    ]
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "restored": [
      "wedding-reception-john_doe-chennai-2025-06-15-10_00_am",
      "birthday-party-jane_smith-mumbai-2025-07-20-6_00_pm"
    ],
    "notFound": [],
    "restoredCount": 2
  }
}
```

### Bulk Permanently Delete Functions

Permanently deletes multiple soft-deleted functions from the database. This action cannot be undone. Admin only.

- **URL**: `/functions/bulk-permanent-delete`
- **Method**: `POST`
- **Auth Required**: Yes (JWT Token with Admin privileges)
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "function_ids": [
    "wedding-reception-john_doe-chennai-2025-06-15-10_00_am",
    "birthday-party-jane_smith-mumbai-2025-07-20-6_00_pm"
  ]
}
```

**Example Request**:

```bash
curl -X POST http://localhost:5001/api/functions/bulk-permanent-delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "function_ids": [
      "wedding-reception-john_doe-chennai-2025-06-15-10_00_am",
      "birthday-party-jane_smith-mumbai-2025-07-20-6_00_pm"
    ]
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "permanentlyDeleted": [
      "wedding-reception-john_doe-chennai-2025-06-15-10_00_am",
      "birthday-party-jane_smith-mumbai-2025-07-20-6_00_pm"
    ],
    "notFoundOrNotSoftDeleted": [],
    "deletedCount": 2
  },
  "message": "Functions permanently deleted"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "No soft-deleted functions found to permanently delete"
}
```

**Notes**:
- All bulk operations require admin privileges
- The operations are atomic - either all succeed or all fail for each function
- Functions must be soft-deleted before they can be permanently deleted
- Cache is automatically invalidated for all affected functions
- The response includes arrays showing which operations succeeded and which function_ids were not found

## Function Search Endpoints

The MOI Software API provides powerful search capabilities for functions with various search types and filters. All search endpoints require authentication via JWT token.

### Base Search Endpoint

```
GET /api/functions/search
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `searchParam` | string | Yes | - | The field to search in |
| `searchQuery` | string | Yes | - | The search value |
| `searchType` | string | No | `partial` | Type of search to perform |
| `page` | number | No | 1 | Page number for pagination |
| `limit` | number | No | 10 | Number of results per page |
| `sortBy` | string | No | `created_at` | Field to sort results by |
| `sortOrder` | string | No | `desc` | Sort order (`asc` or `desc`) |

### Searchable Fields

The following fields can be used as `searchParam`:

- `function_id` - Unique function identifier
- `function_name` - Name of the function/event
- `function_owner_name` - Name of the function owner
- `function_owner_city` - City of the function owner
- `function_owner_address` - Address of the function owner
- `function_owner_phno` - Phone number of the function owner
- `function_amt_spent` - Amount spent on the function
- `function_hero_name` - Hero/Groom name
- `function_heroine_name` - Heroine/Bride name
- `function_held_place` - Venue of the function
- `function_held_city` - City where function is held
- `function_start_date` - Start date of the function

### Search Types

The API supports five different search types via the `searchType` parameter:

#### 1. Partial Search (Default)
Finds matches containing the search query anywhere in the field.

```bash
# Find all functions with "Wedding" anywhere in the name
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_name&searchQuery=Wedding" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find functions in cities containing "Chen"
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_held_city&searchQuery=Chen" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Examples:**
- Query: "Wed" → Finds: "Wedding Reception", "Wednesday Event", "NewWedding"
- Query: "chen" → Finds: "Chennai", "Cochen", "Meenachendur"

#### 2. Exact Match
Finds only exact matches of the search query.

```bash
# Find functions with exact name "Wedding Reception"
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_name&searchQuery=Wedding Reception&searchType=exact" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find functions with exact phone number
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_owner_phno&searchQuery=9876543210&searchType=exact" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Starts With
Finds matches that begin with the search query.

```bash
# Find functions starting with "Wed"
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_name&searchQuery=Wed&searchType=startsWith" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find owner names starting with "Raj"
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_owner_name&searchQuery=Raj&searchType=startsWith" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Examples:**
- Query: "Wed" → Finds: "Wedding", "Wednesday" (NOT "NewWedding")
- Query: "Raj" → Finds: "Rajesh", "Rajan" (NOT "Sivaraj")

#### 4. Ends With
Finds matches that end with the search query.

```bash
# Find cities ending with "pur"
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_held_city&searchQuery=pur&searchType=endsWith" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find venues ending with "Hall"
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_held_place&searchQuery=Hall&searchType=endsWith" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Examples:**
- Query: "pur" → Finds: "Kanpur", "Jaipur" (NOT "Puri")
- Query: "Hall" → Finds: "Marriage Hall", "Community Hall"

#### 5. Fuzzy Search
Finds matches allowing characters between search query letters (useful for typos).

```bash
# Find "Wedding" even with typo "Wdng"
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_name&searchQuery=Wdng&searchType=fuzzy" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find "Chennai" with fuzzy match "Chni"
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_held_city&searchQuery=Chni&searchType=fuzzy" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Examples:**
- Query: "Wdng" → Finds: "Wedding" (W...d...n...g)
- Query: "Chni" → Finds: "Chennai" (Ch...n...i)

### Special Field Searches

#### Phone Number Search
Phone numbers default to "starts with" search for partial matching.

```bash
# Find all phone numbers starting with "987"
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_owner_phno&searchQuery=987" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find exact phone number
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_owner_phno&searchQuery=9876543210&searchType=exact" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Amount Search
Searches within ±10% range of the specified amount.

```bash
# Find functions with budget around 500000 (450000-550000)
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_amt_spent&searchQuery=500000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Date Search
Searches for functions on a specific date.

```bash
# Find functions on June 15, 2025
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_start_date&searchQuery=2025-06-15" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Advanced Search Examples

#### Search with Pagination

```bash
# Get page 2 with 20 results per page
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_held_city&searchQuery=Chennai&page=2&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Search with Custom Sorting

```bash
# Sort by function name in ascending order
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_held_city&searchQuery=Chennai&sortBy=function_name&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Sort by start date in descending order
curl -X GET "http://localhost:5001/api/functions/search?searchParam=function_name&searchQuery=Wedding&sortBy=function_start_date&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response Format

```json
{
  "success": true,
  "data": [
    {
      "_id": "683246abcd1234567890",
      "function_id": "wedding-reception-john_doe-chennai-2025-06-15-10_00_am",
      "function_name": "Wedding Reception",
      "function_owner_name": "John Doe",
      "function_owner_city": "Chennai",
      "function_held_city": "Chennai",
      "function_start_date": "2025-06-15T00:00:00.000Z",
      // ... other fields
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 45,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  },
  "search": {
    "field": "function_name",
    "query": "Wedding",
    "type": "partial",
    "resultCount": 10
  }
}
```

### Error Responses

```json
{
  "success": false,
  "error": "Both searchParam and searchQuery are required"
}
```

```json
{
  "success": false,
  "error": "Invalid searchParam. Allowed fields: function_id, function_name, ..."
}
```

```json
{
  "success": false,
  "error": "Invalid amount value"
}
```

### Performance Notes

- All searchable fields are indexed for optimal performance
- Results are paginated to limit data transfer
- Search results are lean queries for better performance
- Case-insensitive searches (except for exact match on phone numbers)
- Special regex characters are automatically escaped for safety

### Use Cases

1. **Finding Functions by Owner**: Search by `function_owner_name` with partial match
2. **Location-based Search**: Search by `function_held_city` or `function_owner_city`
3. **Date-based Search**: Find functions on specific dates using `function_start_date`
4. **Budget Search**: Find functions within a budget range using `function_amt_spent`
5. **Contact Search**: Find functions by phone number using `function_owner_phno`
6. **Venue Search**: Find functions at specific venues using `function_held_place`

## Payer Endpoints

### Create Payer
Creates a new payer (contributor) for a function with support for cash denomination tracking.

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
  "current_time": "2:00 PM",
  "denominations_received": {
    "2000": 10,
    "500": 10,
    "100": 0
  },
  "denominations_returned": {
    "500": 0,
    "100": 0
  }
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
    "current_time": "2:00 PM",
    "denominations_received": {
      "2000": 10,
      "500": 10
    },
    "denominations_returned": {}
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
    "payer_given_object": "Cash",
    "denominations_received": {
      "2000": 10,
      "500": 10
    },
    "denominations_returned": {},
    "total_received": 25000,
    "total_returned": 0,
    "net_amount": 25000,
    "created_at": "2025-05-12T12:00:00.000Z",
    "updated_at": "2025-05-12T12:00:00.000Z"
    // ... other fields
  }
}
```

**Error Responses**:

```json
{
  "success": false,
  "error": "Payer with this phone number already exists"
}
```

```json
{
  "success": false,
  "error": "Net amount from denominations does not match payer amount"
}
```

```json
{
  "success": false,
  "error": "Error processing denomination data"
}
```

**Notes**:
- Phone number validation ensures uniqueness (only if phone number is provided)
- For cash payments, denomination tracking is supported with automatic calculation of totals
- The system automatically calculates `total_received`, `total_returned`, and `net_amount` based on denominations
- If `payer_amount` is provided, it must match the calculated `net_amount`

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
Updates a specific payer by its ID with support for cash denomination updates and mandatory edit logging.

- **URL**: `/payers/:id`
- **Method**: `PUT`
- **Auth Required**: Yes (JWT Token)
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "payer_amount": 30000,
  "payer_cash_method": "Cash",
  "denominations_received": {
    "2000": 15,
    "500": 0,
    "100": 0
  },
  "denominations_returned": {
    "500": 0,
    "100": 0
  },
  "reason_for_edit": "Corrected payment amount and updated denominations"
}
```

**Example Request**:

```bash
curl -X PUT http://localhost:5001/api/payers/683247efgh5678901234 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "payer_amount": 30000,
    "payer_cash_method": "Cash",
    "denominations_received": {
      "2000": 15
    },
    "reason_for_edit": "Corrected payment amount and updated denominations"
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
    "denominations_received": {
      "2000": 15
    },
    "denominations_returned": {},
    "total_received": 30000,
    "total_returned": 0,
    "net_amount": 30000,
    "updated_at": "2025-05-12T13:00:00.000Z"
    // ... other fields
  },
  "_cache_cleared": true
}
```

**Error Responses**:

```json
{
  "success": false,
  "error": "Reason for edit is required"
}
```

```json
{
  "success": false,
  "error": "Net amount from denominations does not match payer amount"
}
```

```json
{
  "success": false,
  "error": "Payer not found"
}
```

```json
{
  "success": false,
  "error": "Invalid payer ID format"
}
```

**Notes**:
- The `reason_for_edit` field is **mandatory** for all updates
- All updates are logged with before/after values and changed fields
- The `function_id` field cannot be modified
- For cash payments, updating denominations automatically recalculates totals
- Enhanced cache invalidation ensures data consistency across all related endpoints
- The response includes `_cache_cleared: true` to confirm cache invalidation

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

### Bulk Soft Delete Payers

Soft-deletes multiple payers at once.

- **URL**: `/payers/bulk-delete`
- **Method**: `POST`
- **Auth Required**: Yes (JWT Token)
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "payer_ids": [
    "683247efgh5678901234",
    "683247efgh5678901235",
    "683247efgh5678901236"
  ]
}
```

**Example Request**:

```bash
curl -X POST http://localhost:5001/api/payers/bulk-delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "payer_ids": [
      "683247efgh5678901234",
      "683247efgh5678901235"
    ]
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "deleted": [
      "683247efgh5678901234",
      "683247efgh5678901235"
    ],
    "notFound": [],
    "deletedCount": 2
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Please provide an array of payer_ids"
}
```

### Bulk Restore Payers

Restores multiple soft-deleted payers at once.

- **URL**: `/payers/bulk-restore`
- **Method**: `POST`
- **Auth Required**: Yes (JWT Token)
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "payer_ids": [
    "683247efgh5678901234",
    "683247efgh5678901235"
  ]
}
```

**Example Request**:

```bash
curl -X POST http://localhost:5001/api/payers/bulk-restore \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "payer_ids": [
      "683247efgh5678901234",
      "683247efgh5678901235"
    ]
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "restored": [
      "683247efgh5678901234",
      "683247efgh5678901235"
    ],
    "notFound": [],
    "restoredCount": 2
  }
}
```

### Bulk Permanently Delete Payers

Permanently deletes multiple soft-deleted payers from the database. This action cannot be undone.

- **URL**: `/payers/bulk-permanent-delete`
- **Method**: `POST`
- **Auth Required**: Yes (JWT Token)
- **Content Type**: `application/json`

**Request Body**:

```json
{
  "payer_ids": [
    "683247efgh5678901234",
    "683247efgh5678901235"
  ]
}
```

**Example Request**:

```bash
curl -X POST http://localhost:5001/api/payers/bulk-permanent-delete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "payer_ids": [
      "683247efgh5678901234",
      "683247efgh5678901235"
    ]
  }'
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "permanentlyDeleted": [
      "683247efgh5678901234",
      "683247efgh5678901235"
    ],
    "notFoundOrNotSoftDeleted": [],
    "deletedCount": 2
  },
  "message": "Payers permanently deleted"
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "No soft-deleted payers found to permanently delete"
}
```

**Notes**:
- All bulk operations require authentication
- The operations process each payer individually to provide detailed feedback
- Payers must be soft-deleted before they can be permanently deleted
- Cache is automatically invalidated for all affected functions and payers
- The response includes arrays showing which operations succeeded and which payer IDs were not found
- For permanent deletion, admin privileges may be required (uncomment the admin check in the code if needed)

## Payer Search Endpoints

The MOI Software API provides powerful search capabilities for payers with various search types and filters. All search endpoints require authentication via JWT token.

### Base Search Endpoints

```
GET /api/payers/search                           # Search across all payers
GET /api/functions/:functionId/payers/search    # Search payers within a specific function
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `searchParam` | string | Yes | - | The field to search in |
| `searchQuery` | string | Yes | - | The search value |
| `searchType` | string | No | `partial` | Type of search to perform |
| `page` | number | No | 1 | Page number for pagination |
| `limit` | number | No | 10 | Number of results per page |
| `sortBy` | string | No | `created_at` | Field to sort results by |
| `sortOrder` | string | No | `desc` | Sort order (`asc` or `desc`) |

### Searchable Fields

The following fields can be used as `searchParam`:

- `function_id` - Function identifier the payer belongs to
- `payer_name` - Name of the payer/contributor
- `payer_phno` - Phone number of the payer
- `payer_work` - Occupation/Work of the payer
- `payer_cash_method` - Payment method used (Cash, GPay, Bank Transfer, etc.)
- `payer_amount` - Amount contributed by the payer
- `payer_relation` - Relationship with the function owner
- `payer_city` - City of the payer

### Search Types

The API supports five different search types via the `searchType` parameter:

#### 1. Partial Search (Default)
Finds matches containing the search query anywhere in the field.

```bash
# Find all payers with "Kumar" anywhere in the name
curl -X GET "http://localhost:5001/api/payers/search?searchParam=payer_name&searchQuery=Kumar" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find payers in a specific function with city containing "Chen"
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/payers/search?searchParam=payer_city&searchQuery=Chen" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Examples:**
- Query: "Raj" → Finds: "Rajesh Kumar", "Suraj Singh", "Rajeev"
- Query: "chen" → Finds: "Chennai", "Cochen", "Meenachendur"

#### 2. Exact Match
Finds only exact matches of the search query.

```bash
# Find payers with exact name "Rajesh Kumar"
curl -X GET "http://localhost:5001/api/payers/search?searchParam=payer_name&searchQuery=Rajesh Kumar&searchType=exact" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find payers with exact phone number in a function
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/payers/search?searchParam=payer_phno&searchQuery=9876543210&searchType=exact" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Starts With
Finds matches that begin with the search query.

```bash
# Find payers whose names start with "Raj"
curl -X GET "http://localhost:5001/api/payers/search?searchParam=payer_name&searchQuery=Raj&searchType=startsWith" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find payers whose work starts with "Soft" in a specific function
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/payers/search?searchParam=payer_work&searchQuery=Soft&searchType=startsWith" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Examples:**
- Query: "Raj" → Finds: "Rajesh", "Rajan" (NOT "Suraj")
- Query: "Soft" → Finds: "Software Engineer", "Software Developer" (NOT "Microsoft")

#### 4. Ends With
Finds matches that end with the search query.

```bash
# Find cities ending with "pur"
curl -X GET "http://localhost:5001/api/payers/search?searchParam=payer_city&searchQuery=pur&searchType=endsWith" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find relations ending with "ther" in a function
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/payers/search?searchParam=payer_relation&searchQuery=ther&searchType=endsWith" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Examples:**
- Query: "pur" → Finds: "Kanpur", "Jaipur" (NOT "Puri")
- Query: "ther" → Finds: "Brother", "Father", "Mother"

#### 5. Fuzzy Search
Finds matches allowing characters between search query letters (useful for typos).

```bash
# Find "Rajesh" even with typo "Rjsh"
curl -X GET "http://localhost:5001/api/payers/search?searchParam=payer_name&searchQuery=Rjsh&searchType=fuzzy" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find "Chennai" with fuzzy match "Chni" in a function
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/payers/search?searchParam=payer_city&searchQuery=Chni&searchType=fuzzy" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Examples:**
- Query: "Rjsh" → Finds: "Rajesh" (R...j...s...h)
- Query: "Chni" → Finds: "Chennai" (Ch...n...i)

### Special Field Searches

#### Phone Number Search
Phone numbers default to "starts with" search for partial matching.

```bash
# Find all phone numbers starting with "987" across all payers
curl -X GET "http://localhost:5001/api/payers/search?searchParam=payer_phno&searchQuery=987" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find exact phone number in a specific function
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/payers/search?searchParam=payer_phno&searchQuery=9876543210&searchType=exact" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Amount Search
Searches within ±5% range of the specified amount (exact match also available).

```bash
# Find payers who contributed around 25000 (23750-26250)
curl -X GET "http://localhost:5001/api/payers/search?searchParam=payer_amount&searchQuery=25000" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find exact amount in a specific function
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/payers/search?searchParam=payer_amount&searchQuery=25000&searchType=exact" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Payment Method Search
Case-insensitive search for payment methods.

```bash
# Find all GPay transactions
curl -X GET "http://localhost:5001/api/payers/search?searchParam=payer_cash_method&searchQuery=GPay" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Find cash transactions in a specific function
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/payers/search?searchParam=payer_cash_method&searchQuery=Cash&searchType=exact" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Advanced Search Examples

#### Search with Pagination

```bash
# Get page 2 with 20 results per page across all payers
curl -X GET "http://localhost:5001/api/payers/search?searchParam=payer_city&searchQuery=Chennai&page=2&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Paginated search within a function
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/payers/search?searchParam=payer_relation&searchQuery=Friend&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Search with Custom Sorting

```bash
# Sort by payer name in ascending order
curl -X GET "http://localhost:5001/api/payers/search?searchParam=payer_city&searchQuery=Chennai&sortBy=payer_name&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Sort by amount in descending order within a function
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/payers/search?searchParam=payer_relation&searchQuery=Family&sortBy=payer_amount&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response Format

```json
{
  "success": true,
  "data": [
    {
      "_id": "683247efgh5678901234",
      "function_id": "wedding-reception-john_doe-chennai-2025-06-15-10_00_am",
      "payer_name": "Rajesh Kumar",
      "payer_phno": "9876543210",
      "payer_work": "Software Engineer",
      "payer_cash_method": "GPay",
      "payer_amount": 25000,
      "payer_relation": "Friend",
      "payer_city": "Chennai",
      "created_at": "2025-05-12T12:00:00.000Z",
      // ... other fields
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 45,
    "itemsPerPage": 10,
    "hasNextPage": true,
    "hasPrevPage": false,
    "nextPage": 2,
    "prevPage": null
  },
  "search": {
    "field": "payer_name",
    "query": "Kumar",
    "type": "partial",
    "resultCount": 10,
    "functionId": "wedding-reception-john_doe-chennai-2025-06-15-10_00_am" // Only present in function-specific searches
  }
}
```

### Error Responses

```json
{
  "success": false,
  "error": "Both searchParam and searchQuery are required"
}
```

```json
{
  "success": false,
  "error": "Invalid searchParam. Allowed fields: function_id, payer_name, payer_phno, payer_work, payer_cash_method, payer_amount, payer_relation, payer_city"
}
```

```json
{
  "success": false,
  "error": "Invalid amount value"
}
```

### Performance Notes

- All searchable fields are indexed for optimal performance
- Compound indexes on `function_id` + other fields for function-specific searches
- Results are paginated to limit data transfer
- Search results use lean queries for better performance
- Case-insensitive searches (except for exact match on phone numbers)
- Special regex characters are automatically escaped for safety

### Use Cases

1. **Global Payer Search**: Find payers across all functions
   - Use `/api/payers/search` for system-wide searches
   - Useful for finding duplicate entries or tracking contributions across events

2. **Function-Specific Search**: Find payers within a specific function
   - Use `/api/functions/:functionId/payers/search` for targeted searches
   - Ideal for event-specific reporting and analysis

3. **Contact Management**: Search by phone number or name
   - Quickly find payer contact information
   - Identify repeat contributors

4. **Financial Analysis**: Search by amount or payment method
   - Analyze contribution patterns
   - Track payment method preferences

5. **Relationship Analysis**: Search by relation or city
   - Understand contributor demographics
   - Plan targeted communication

6. **Occupation-based Search**: Find payers by profession
   - Useful for networking and professional outreach

## Visualization Endpoints

![Recommended Chart Types](images/chart_types.png)

This section provides comprehensive information about the MOI Software Online API endpoints for data visualization.

### Get Payment Method Distribution

Returns the count and total amount of payers grouped by payment method for a specific function.

- **URL**: `/api/functions/:functionId/payment-methods`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Cache**: 5 minutes (300 seconds)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/payment-methods \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": [
    {
      "payment_method": "Cash",
      "count": 15,
      "total_amount": 150000
    },
    {
      "payment_method": "GPay",
      "count": 12,
      "total_amount": 120000
    },
    {
      "payment_method": "Bank Transfer",
      "count": 8,
      "total_amount": 240000
    },
    {
      "payment_method": "Check",
      "count": 3,
      "total_amount": 90000
    }
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Function not found with id of wedding-reception-john_doe-chennai-2025-06-15-10_00_am"
}
```

### Get Relation Distribution

Returns contribution data grouped by payer relation for a specific function.

- **URL**: `/api/functions/:functionId/relation-distribution`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Cache**: 5 minutes (300 seconds)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/relation-distribution \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": [
    {
      "relation": "Family",
      "count": 20,
      "total_amount": 300000,
      "average_amount": 15000
    },
    {
      "relation": "Friend",
      "count": 25,
      "total_amount": 250000,
      "average_amount": 10000
    },
    {
      "relation": "Colleague",
      "count": 15,
      "total_amount": 120000,
      "average_amount": 8000
    },
    {
      "relation": "Neighbor",
      "count": 8,
      "total_amount": 40000,
      "average_amount": 5000
    }
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Function not found with id of wedding-reception-john_doe-chennai-2025-06-15-10_00_am"
}
```

### Get City Distribution

Returns geographical distribution of contributions for a specific function.

- **URL**: `/api/functions/:functionId/city-distribution`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Cache**: 5 minutes (300 seconds)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/city-distribution \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": [
    {
      "city": "Chennai",
      "count": 25,
      "total_amount": 300000
    },
    {
      "city": "Bangalore",
      "count": 18,
      "total_amount": 200000
    },
    {
      "city": "Mumbai",
      "count": 12,
      "total_amount": 150000
    },
    {
      "city": "Delhi",
      "count": 8,
      "total_amount": 100000
    }
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Function not found with id of wedding-reception-john_doe-chennai-2025-06-15-10_00_am"
}
```

### Get Amount Distribution

Returns categorized contributions by amount ranges for a specific function.

- **URL**: `/api/functions/:functionId/amount-distribution`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Cache**: 5 minutes (300 seconds)
- **Query Parameters**:
  - `ranges`: Optional custom ranges (e.g., `0-5000,5001-10000,10001-25000,25001+`)

**Example Request**:

```bash
# Default ranges
curl -X GET http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/amount-distribution \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Custom ranges
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/amount-distribution?ranges=0-1000,1001-5000,5001-10000,10001+" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": [
    {
      "range": "0-5000",
      "count": 15,
      "total_amount": 45000
    },
    {
      "range": "5001-10000",
      "count": 25,
      "total_amount": 200000
    },
    {
      "range": "10001-25000",
      "count": 18,
      "total_amount": 300000
    },
    {
      "range": "25001+",
      "count": 10,
      "total_amount": 450000
    }
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Function not found with id of wedding-reception-john_doe-chennai-2025-06-15-10_00_am"
}
```

### Get Cash vs Gift Comparison

Returns a comparison between cash contributions and gift contributions for a specific function.

- **URL**: `/api/functions/:functionId/cash-vs-gifts`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Cache**: 5 minutes (300 seconds)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/cash-vs-gifts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "cash": {
      "count": 50,
      "total_amount": 750000
    },
    "gifts": {
      "count": 20,
      "gift_types": [
        {
          "gift_name": "Silver Plate",
          "count": 8
        },
        {
          "gift_name": "Gold Bracelet",
          "count": 5
        },
        {
          "gift_name": "Crystal Vase",
          "count": 4
        },
        {
          "gift_name": "Other Gifts",
          "count": 3
        }
      ]
    }
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Function not found with id of wedding-reception-john_doe-chennai-2025-06-15-10_00_am"
}
```

### Get Top Contributors

Returns the top N contributors for a specific function.

- **URL**: `/api/functions/:functionId/top-contributors`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Cache**: 5 minutes (300 seconds)
- **Query Parameters**:
  - `limit`: Number of top contributors to return (default: 10)

**Example Request**:

```bash
# Default limit (10)
curl -X GET http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/top-contributors \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Custom limit
curl -X GET "http://localhost:5001/api/functions/wedding-reception-john_doe-chennai-2025-06-15-10_00_am/top-contributors?limit=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "683247efgh5678901234",
      "payer_name": "Suresh Rajan",
      "payer_relation": "Family",
      "payer_city": "Chennai",
      "payer_amount": 100000,
      "payer_given_object": "Cash"
    },
    {
      "_id": "683247efgh5678901235",
      "payer_name": "Priya Malhotra",
      "payer_relation": "Family",
      "payer_city": "Mumbai",
      "payer_amount": 75000,
      "payer_given_object": "Cash"
    },
    {
      "_id": "683247efgh5678901236",
      "payer_name": "Rajesh Kumar",
      "payer_relation": "Friend",
      "payer_city": "Chennai",
      "payer_amount": 50000,
      "payer_given_object": "Cash"
    }
    // ... more contributors based on limit
  ]
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Function not found with id of wedding-reception-john_doe-chennai-2025-06-15-10_00_am"
}
```

### Data Visualization Usage

These endpoints are designed to provide data for charts and visualizations in the frontend application. Here are some recommended chart types for each endpoint:

#### Payment Method Distribution
- **Chart Type**: Pie chart or Donut chart
- **Visualization**: Show the proportion of different payment methods
- **Key Metrics**: Count and total amount for each payment method

#### Relation Distribution
- **Chart Type**: Bar chart
- **Visualization**: Compare contributions across different relation types
- **Key Metrics**: Count, total amount, and average amount per relation

#### City Distribution
- **Chart Type**: Map visualization or horizontal bar chart
- **Visualization**: Geographic distribution of contributions
- **Key Metrics**: Count and total amount per city

#### Amount Distribution
- **Chart Type**: Histogram or stacked bar chart
- **Visualization**: Distribution of contributions across amount ranges
- **Key Metrics**: Count and total amount per range

#### Cash vs Gift Comparison
- **Chart Type**: Pie chart with nested details
- **Visualization**: Compare cash vs. gift contributions
- **Key Metrics**: Count of cash/gift contributions, breakdown of gift types

#### Top Contributors
- **Chart Type**: Horizontal bar chart
- **Visualization**: Ranking of top contributors
- **Key Metrics**: Contribution amounts by contributor

These endpoints enable rich dashboards and reports for analyzing contribution patterns in functions (events), helping event organizers understand their financial support distribution.

## Edit Logs Endpoints

### Get All Edit Logs

Retrieves a list of all edit logs with pagination and filtering options. Admin only.

- **URL**: `/edit-logs`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token with Admin privileges)
- **Cache**: 5 minutes (300 seconds)

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `target_id` | String | Filter by target ID |
| `target_type` | String | Filter by target type (`Function` or `Payer`) |
| `action` | String | Filter by action type (`update`) |
| `created_by` | String | Filter by user ID who made the change |
| `user_email` | String | Filter by user email |
| `startDate` | Date | Filter by date range start (ISO format) |
| `endDate` | Date | Filter by date range end (ISO format) |
| `page` | Number | Page number (default: 1) |
| `limit` | Number | Results per page (default: 10) |

**Example Request**:

```bash
curl -X GET "http://localhost:5001/api/edit-logs?target_type=Function&action=update&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 2,
  "pagination": {
    "current": 1,
    "pages": 1,
    "total": 2
  },
  "data": [
    {
      "_id": "683247efgh5678901234",
      "target_id": "683246abcd1234567890",
      "target_type": "Function",
      "action": "update",
      "before_value": {
        "function_name": "Wedding Reception",
        "function_amt_spent": 500000
      },
      "after_value": {
        "function_name": "Wedding Reception - Updated",
        "function_amt_spent": 550000
      },
      "reason": "Updated function name and increased budget allocation",
      "changed_fields": ["function_name", "function_amt_spent"],
      "created_by": {
        "_id": "682235dbf95499dd50469312",
        "username": "adminuser",
        "email": "admin@example.com"
      },
      "user_email": "admin@example.com",
      "user_name": "Admin User",
      "created_at": "2025-05-12T13:00:00.000Z"
    },
    {
      "_id": "683247efgh5678901235",
      "target_id": "683247efgh5678901234",
      "target_type": "Payer",
      "action": "update",
      "before_value": {
        "payer_name": "Rahul Kumar",
        "payer_amount": 25000,
        "payer_cash_method": "Bank Transfer"
      },
      "after_value": {
        "payer_name": "Rahul Kumar",
        "payer_amount": 30000,
        "payer_cash_method": "Cash"
      },
      "reason": "Corrected payment amount and updated payment method",
      "changed_fields": ["payer_amount", "payer_cash_method"],
      "created_by": {
        "_id": "682235dbf95499dd50469312",
        "username": "adminuser",
        "email": "admin@example.com"
      },
      "user_email": "admin@example.com",
      "user_name": "Admin User",
      "created_at": "2025-05-12T14:00:00.000Z"
    }
  ]
}
```

### Get Edit Log by ID

Retrieves a specific edit log by its ID. Admin only.

- **URL**: `/edit-logs/:id`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token with Admin privileges)
- **Cache**: 5 minutes (300 seconds)

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/edit-logs/683247efgh5678901234 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "data": {
    "_id": "683247efgh5678901234",
    "target_id": "683246abcd1234567890",
    "target_type": "Function",
    "action": "update",
    "before_value": {
      "function_name": "Wedding Reception",
      "function_amt_spent": 500000
    },
    "after_value": {
      "function_name": "Wedding Reception - Updated",
      "function_amt_spent": 550000
    },
    "reason": "Updated function name and increased budget allocation",
    "changed_fields": ["function_name", "function_amt_spent"],
    "created_by": {
      "_id": "682235dbf95499dd50469312",
      "username": "adminuser",
      "email": "admin@example.com"
    },
    "user_email": "admin@example.com",
    "user_name": "Admin User",
    "created_at": "2025-05-12T13:00:00.000Z"
  }
}
```

**Error Response**:

```json
{
  "success": false,
  "error": "Edit log not found with id of 683247efgh5678901234"
}
```

### Get Edit Logs by Target

Retrieves edit logs for a specific Function or Payer.

- **URL**: `/edit-logs/:targetType/:targetId`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token)
- **Cache**: 5 minutes (300 seconds)

**URL Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetType` | String | Type of target (`Function` or `Payer`) |
| `targetId` | String | ID of the target |

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | Number | Page number (default: 1) |
| `limit` | Number | Results per page (default: 10) |

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/edit-logs/Function/683246abcd1234567890 \
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
      "target_id": "683246abcd1234567890",
      "target_type": "Function",
      "action": "update",
      "before_value": {
        "function_name": "Wedding Reception",
        "function_amt_spent": 500000
      },
      "after_value": {
        "function_name": "Wedding Reception - Updated",
        "function_amt_spent": 550000
      },
      "reason": "Updated function name and increased budget allocation",
      "changed_fields": ["function_name", "function_amt_spent"],
      "created_by": {
        "_id": "682235dbf95499dd50469312",
        "username": "adminuser",
        "email": "admin@example.com"
      },
      "user_email": "admin@example.com",
      "user_name": "Admin User",
      "created_at": "2025-05-12T13:00:00.000Z"
    }
  ]
}
```

### Get Edit Logs by User

Retrieves edit logs created by a specific user. Admin only.

- **URL**: `/edit-logs/user/:userId`
- **Method**: `GET`
- **Auth Required**: Yes (JWT Token with Admin privileges)
- **Cache**: 5 minutes (300 seconds)

**URL Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | String | ID of the user |

**Query Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | Number | Page number (default: 1) |
| `limit` | Number | Results per page (default: 10) |

**Example Request**:

```bash
curl -X GET http://localhost:5001/api/edit-logs/user/682235dbf95499dd50469312 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Success Response**:

```json
{
  "success": true,
  "count": 2,
  "pagination": {
    "current": 1,
    "pages": 1,
    "total": 2
  },
  "data": [
    {
      "_id": "683247efgh5678901234",
      "target_id": "683246abcd1234567890",
      "target_type": "Function",
      "action": "update",
      "before_value": {
        "function_name": "Wedding Reception",
        "function_amt_spent": 500000
      },
      "after_value": {
        "function_name": "Wedding Reception - Updated",
        "function_amt_spent": 550000
      },
      "reason": "Updated function name and increased budget allocation",
      "changed_fields": ["function_name", "function_amt_spent"],
      "created_by": "682235dbf95499dd50469312",
      "user_email": "admin@example.com",
      "user_name": "Admin User",
      "created_at": "2025-05-12T13:00:00.000Z"
    },
    {
      "_id": "683247efgh5678901235",
      "target_id": "683247efgh5678901234",
      "target_type": "Payer",
      "action": "update",
      "before_value": {
        "payer_name": "Rahul Kumar",
        "payer_amount": 25000,
        "payer_cash_method": "Bank Transfer"
      },
      "after_value": {
        "payer_name": "Rahul Kumar",
        "payer_amount": 30000,
        "payer_cash_method": "Cash"
      },
      "reason": "Corrected payment amount and updated payment method",
      "changed_fields": ["payer_amount", "payer_cash_method"],
      "created_by": "682235dbf95499dd50469312",
      "user_email": "admin@example.com",
      "user_name": "Admin User",
      "created_at": "2025-05-12T14:00:00.000Z"
    }
  ]
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