# Admin Credentials

## Working Credentials for Lovable Frontend

- **Email**: `lovable@statpedia.com`
- **Password**: `Admin123!@#Secure2025`
- **Role**: User/Admin
- **Status**: Active (Production Ready)

## Default Admin Account (Development)

- **Email**: `admin@statpedia.com`
- **Password**: `Admin123!@#Secure2025`
- **Role**: Admin/Owner
- **Status**: Active

## Authentication System

- **API Endpoint**: `http://localhost:3001` (development)
- **Production Endpoint**: `https://statpedia-player-props.statpedia.workers.dev`
- **Password Algorithm**: Argon2ID
- **Token Expiry**: 15 minutes (900 seconds)

## Database Tables

- **Users**: `auth_user` table
- **Credentials**: `auth_credential` table with `password_hash` and `password_algo`
- **Roles**: `user_roles` table

## Notes

- Password was updated on 2025-10-15 to meet security requirements
- Account has admin/owner role permissions
- Can access all player props and admin features
- JWT token includes Hasura claims for GraphQL access

## Security

- Password uses strong Argon2ID hashing
- Tokens are short-lived (15 minutes)
- Refresh tokens available for session management
- All authentication goes through secure API endpoints
