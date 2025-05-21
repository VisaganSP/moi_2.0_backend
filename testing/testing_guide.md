# MOI Software Testing Guide
#### Visagan S

This guide explains how to use the testing files and API endpoints for the MOI Software Online application.

## Overview of Testing Files

Your testing folder contains the following files:

1. **100functionPayers.ts** - Script to generate 100 unique payers for a specific function
2. **seedDatabase.ts** - Script to seed the database with initial data (users, functions, payers)
3. **testing_tokens.txt** - Contains authentication tokens for testing

## Prerequisites

Before running the tests, make sure you have:

1. Node.js and npm installed
2. MongoDB running at `mongodb://admin:password@localhost:27017/moi_software_db?authSource=admin`
3. MOI Software Online API server running at `http://localhost:5001/api`

## Step 1: Setting Up the Testing Environment

First, install the required dependencies:

```bash
npm install mongodb bcryptjs typescript ts-node @types/mongodb @types/bcryptjs
```

## Step 2: Seeding the Database

The `seedDatabase.ts` file is used to populate the database with initial test data. This includes users, functions, and some basic payers.

To run the seed script:

```bash
npx ts-node seedDatabase.ts
```

This will:
- Create admin and regular users
- Create several Tamil function entries (events)
- Add initial payers for these functions

## Step 3: Adding More Test Data

After seeding the database, you can add more test data using the `100functionPayers.ts` script. This script creates 100 unique Tamil payers for a specific function.

To run this script:

```bash
npx ts-node 100functionPayers.ts
```

This will generate 100 unique payers with randomized:
- Names (Tamil first and last names)
- Occupations (in Tamil)
- Payment methods (Cash or GPay)
- Payment amounts or gift items
- Relations (in Tamil)
- Cities (Tamil cities)
- Phone numbers
- Transaction dates

## Step 4: Using Authentication Tokens

The `testing_tokens.txt` file contains JWT tokens that can be used for testing the API endpoints. There are two types of tokens:

1. **Admin Tokens** - For endpoints that require admin privileges
2. **Regular User Tokens** - For standard user operations

These tokens can be used in the Authorization header of your HTTP requests.

## Step 5: Testing API Endpoints

### Authentication Endpoints

#### Register a New User

```bash
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "testuser@example.com",
    "password": "password123"
  }'
```

#### Login with a User

```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tamiluser@example.com",
    "password": "password123"
  }'
```

#### Get Current User Details

```bash
# Replace TOKEN with a valid token from testing_tokens.txt
curl -X GET http://localhost:5001/api/auth/me \
  -H "Authorization: Bearer TOKEN"
```

### Function Endpoints

#### Get All Functions

```bash
# Replace TOKEN with a valid token from testing_tokens.txt
curl -X GET http://localhost:5001/api/functions \
  -H "Authorization: Bearer TOKEN"
```

#### Search for Functions

```bash
# Replace TOKEN with a valid token from testing_tokens.txt
curl -X GET "http://localhost:5001/api/functions?search=திருமண" \
  -H "Authorization: Bearer TOKEN"
```

#### Get Functions by Date Range

```bash
# Replace TOKEN with a valid token from testing_tokens.txt
curl -X GET "http://localhost:5001/api/functions/date-range?startDate=2025-06-01&endDate=2025-06-30" \
  -H "Authorization: Bearer TOKEN"
```

#### Create a New Function (Admin only)

```bash
# Replace ADMIN_TOKEN with an admin token from testing_tokens.txt
curl -X POST http://localhost:5001/api/functions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "function_name": "புதிய விழா",
    "function_owner_name": "ராஜேஷ் குமார்",
    "function_owner_city": "சென்னை",
    "function_owner_address": "123 அண்ணா சாலை",
    "function_owner_phno": "9876543210",
    "function_amt_spent": 500000,
    "function_hero_name": "ராஜேஷ்",
    "function_heroine_name": "லக்ஷ்மி",
    "function_held_place": "ராஜ மண்டபம்",
    "function_held_city": "சென்னை",
    "function_start_date": "2025-07-15T00:00:00.000Z",
    "function_start_time": "10:00 AM",
    "function_end_date": "2025-07-15T00:00:00.000Z",
    "function_end_time": "10:00 PM",
    "function_total_days": 1,
    "function_bill_details": {
      "owner_name": "ராஜேஷ் குமார்",
      "owner_occupation": "தொழிலதிபர்",
      "wife_name": "லக்ஷ்மி ராஜேஷ்",
      "wife_occupation": "மருத்துவர்",
      "function_place": "ராஜ மண்டபம்",
      "function_city": "சென்னை"
    }
  }'
```

### Payer Endpoints

#### Get All Payers for a Function

```bash
# Replace TOKEN with a valid token from testing_tokens.txt
# Replace FUNCTION_ID with an actual function ID from your database
curl -X GET "http://localhost:5001/api/functions/FUNCTION_ID/payers" \
  -H "Authorization: Bearer TOKEN"
```

#### Get Total Payment by Function

```bash
# Replace TOKEN with a valid token from testing_tokens.txt
# Replace FUNCTION_ID with an actual function ID from your database
curl -X GET "http://localhost:5001/api/functions/FUNCTION_ID/total-payment" \
  -H "Authorization: Bearer TOKEN"
```

#### Create a New Payer

```bash
# Replace TOKEN with a valid token from testing_tokens.txt
# Replace FUNCTION_ID with an actual function ID from your database
curl -X POST http://localhost:5001/api/payers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "function_id": "FUNCTION_ID",
    "function_name": "திருமண விழா",
    "payer_name": "அருண் கிருஷ்ணமூர்த்தி",
    "payer_phno": "9876543299",
    "payer_work": "மென்பொருள் பொறியாளர்",
    "payer_given_object": "பணம்",
    "payer_cash_method": "Cash",
    "payer_amount": 15000,
    "payer_gift_name": "",
    "payer_relation": "நண்பர்",
    "payer_city": "சென்னை",
    "payer_address": "45, காந்தி சாலை, சென்னை",
    "current_date": "2025-06-14T10:00:00.000Z",
    "current_time": "10:00 AM"
  }'
```

#### Get Payer by Phone Number

```bash
# Replace TOKEN with a valid token from testing_tokens.txt
curl -X GET http://localhost:5001/api/payers/phone/9876543211 \
  -H "Authorization: Bearer TOKEN"
```

#### Get Unique Payer Data

You can get unique values for various payer attributes:

```bash
# Replace TOKEN with a valid token from testing_tokens.txt

# Get unique payer names
curl -X GET http://localhost:5001/api/payers/unique/names \
  -H "Authorization: Bearer TOKEN"

# Get unique payer gifts
curl -X GET http://localhost:5001/api/payers/unique/gifts \
  -H "Authorization: Bearer TOKEN"

# Get unique payer relations
curl -X GET http://localhost:5001/api/payers/unique/relations \
  -H "Authorization: Bearer TOKEN"

# Get unique payer cities
curl -X GET http://localhost:5001/api/payers/unique/cities \
  -H "Authorization: Bearer TOKEN"

# Get unique payer work types
curl -X GET http://localhost:5001/api/payers/unique/works \
  -H "Authorization: Bearer TOKEN"
```

## Step 6: Testing Pagination and Search

Most of the GET endpoints support pagination and search. For example:

```bash
# Replace TOKEN with a valid token from testing_tokens.txt

# Get functions with pagination
curl -X GET "http://localhost:5001/api/functions?page=1&limit=10" \
  -H "Authorization: Bearer TOKEN"

# Search for payers
curl -X GET "http://localhost:5001/api/payers?search=அருண்" \
  -H "Authorization: Bearer TOKEN"

# Get payers for a specific function with pagination
curl -X GET "http://localhost:5001/api/payers?function_id=FUNCTION_ID&page=1&limit=20" \
  -H "Authorization: Bearer TOKEN"
```

## Step 7: Testing Soft Delete and Restore (Admin Only)

The API supports soft deletion of records, which can be later restored:

### For Functions

```bash
# Replace ADMIN_TOKEN with an admin token from testing_tokens.txt
# Replace FUNCTION_ID with an actual function ID from your database

# Soft delete a function
curl -X DELETE http://localhost:5001/api/functions/FUNCTION_ID \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Get all deleted functions
curl -X GET http://localhost:5001/api/functions/deleted \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Restore a deleted function
curl -X PUT http://localhost:5001/api/functions/FUNCTION_ID/restore \
  -H "Authorization: Bearer ADMIN_TOKEN"

# Permanently delete a function (can only be done on already soft-deleted functions)
curl -X DELETE http://localhost:5001/api/functions/FUNCTION_ID/permanent \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### For Payers

```bash
# Replace TOKEN with a valid token from testing_tokens.txt
# Replace PAYER_ID with an actual payer ID from your database

# Soft delete a payer
curl -X DELETE http://localhost:5001/api/payers/PAYER_ID \
  -H "Authorization: Bearer TOKEN"

# Get all deleted payers
curl -X GET http://localhost:5001/api/payers/deleted \
  -H "Authorization: Bearer TOKEN"

# Restore a deleted payer
curl -X PUT http://localhost:5001/api/payers/PAYER_ID/restore \
  -H "Authorization: Bearer TOKEN"

# Permanently delete a payer (can only be done on already soft-deleted payers)
curl -X DELETE http://localhost:5001/api/payers/PAYER_ID/permanent \
  -H "Authorization: Bearer TOKEN"
```

## Step 8: Modifying Test Data

If you need to modify existing test data:

### Update a Function (Admin Only)

```bash
# Replace ADMIN_TOKEN with an admin token from testing_tokens.txt
# Replace FUNCTION_ID with an actual function ID from your database
curl -X PUT http://localhost:5001/api/functions/FUNCTION_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "function_name": "திருமண விழா - புதுப்பிக்கப்பட்டது",
    "function_amt_spent": 700000
  }'
```

### Update a Payer

```bash
# Replace TOKEN with a valid token from testing_tokens.txt
# Replace PAYER_ID with an actual payer ID from your database
curl -X PUT http://localhost:5001/api/payers/PAYER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "payer_amount": 20000,
    "payer_cash_method": "GPay"
  }'
```

## Step 9: Using MongoDB Express for Visual Testing

MongoDB Express provides a web-based interface to visually inspect and modify the database contents:

- URL: http://localhost:8081
- Username: admin
- Password: pass

This can be useful for:
- Verifying that test data was correctly inserted
- Manually modifying records for testing
- Creating custom queries

## Troubleshooting

If you encounter issues when running the tests:

1. **Connection errors**: Ensure MongoDB is running and accessible with the provided credentials
2. **Authentication errors**: Verify that the tokens in testing_tokens.txt are valid and not expired
3. **TypeScript errors**: Make sure all required dependencies are installed
4. **Function ID errors**: For payer-related endpoints, ensure you're using valid function IDs from your database

## Conclusion

This testing guide provides instructions for using the testing files and API endpoints for the MOI Software Online application. By following these instructions, you can thoroughly test all aspects of the application, including authentication, function management, and payer management.