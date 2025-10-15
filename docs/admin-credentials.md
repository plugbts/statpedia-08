# Admin Credentials

## Default Admin Account

- **Email**: `admin@statpedia.com`
- **Password**: `admin123!456!?`
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

- Password was updated on 2025-10-15
- Account has admin/owner role permissions
- Can access all player props and admin features
- JWT token includes Hasura claims for GraphQL access

## Security

- Password uses strong Argon2ID hashing
- Tokens are short-lived (15 minutes)
- Refresh tokens available for session management
- All authentication goes through secure API endpoints
