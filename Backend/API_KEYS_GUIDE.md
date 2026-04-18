# API Keys System Guide

## Overview

Each company account can generate API keys for programmatic access to the Lyn CRM API. API keys replace the need for user authentication in automated systems and integrations.

## Features

- **Create API Keys**: Generate unique API keys per company
- **Regenerate Keys**: Safely rotate keys without losing functionality
- **Revoke Keys**: Immediately disable compromised keys
- **Usage Tracking**: See when each key was last used

## Setup

### 1. Migration

Run the database migration to create the `api_keys` table:

```bash
npx supabase migration up
```

This creates:
- `api_keys` table with company_id, key, name, and usage tracking
- RLS policies for secure access
- Indexes for fast lookups

### 2. Backend Integration

The API key authentication middleware is already integrated:

- **Middleware**: `Backend/src/middleware/auth.middleware.js`
- **Service**: `Backend/src/services/api-keys.service.js`
- **Routes**: `Backend/src/routes/api-keys/api-keys.routes.js`

### 3. Using API Keys

#### Creating a Key

```bash
curl -X POST http://localhost:3001/api/api-keys \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <existing-api-key>" \
  -d '{"name": "Production API"}'

# Response:
# {
#   "data": {
#     "id": "uuid",
#     "key": "lyn_...",  # Save this securely!
#     "name": "Production API",
#     "created_at": "2024-01-01T00:00:00Z"
#   }
# }
```

#### Using a Key in Requests

Pass the API key using either header:

```bash
# Method 1: X-API-Key header
curl http://localhost:3001/api/leads \
  -H "X-API-Key: lyn_your_key_here"

# Method 2: Authorization Bearer
curl http://localhost:3001/api/leads \
  -H "Authorization: Bearer lyn_your_key_here"
```

#### Listing Keys

```bash
curl http://localhost:3001/api/api-keys \
  -H "X-API-Key: <api-key>"

# Response shows all active keys (without exposing full key)
```

#### Regenerating a Key

```bash
curl -X POST http://localhost:3001/api/api-keys/<key-id>/regenerate \
  -H "X-API-Key: <existing-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production API v2"}'

# Old key is revoked, new key is returned
```

#### Revoking a Key

```bash
curl -X DELETE http://localhost:3001/api/api-keys/<key-id> \
  -H "X-API-Key: <api-key>"
```

## Authentication Flow

1. **Request arrives** with `X-API-Key` or `Authorization: Bearer` header
2. **Middleware verifies** the key exists and isn't revoked
3. **Company context** is attached to request (`req.companyId`)
4. **Endpoint processes** request within that company's context
5. **Last used timestamp** is updated

## Key Format

- Prefix: `lyn_` (for easy identification)
- Length: 64 character hex string (32 bytes)
- Example: `lyn_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6`

## Security Best Practices

1. **Never commit keys** to version control
2. **Rotate keys regularly** using the regenerate endpoint
3. **Use environment variables** to store keys
4. **Revoke immediately** if compromised
5. **Use descriptive names** to identify key purposes
6. **Monitor last_used_at** to detect unused keys

## Protected Routes

All API endpoints that require authentication support API key headers:

```
GET    /api/api-keys              - List keys
POST   /api/api-keys              - Create key
GET    /api/api-keys/:id          - Get key info
POST   /api/api-keys/:id/regenerate - Regenerate key
DELETE /api/api-keys/:id          - Revoke key

GET    /api/leads                 - List leads (requires API key or auth)
POST   /api/leads                 - Create lead
PUT    /api/leads/:id             - Update lead
DELETE /api/leads/:id             - Delete lead
...and other endpoints
```

## Environment Setup

Add to `.env`:

```
VITE_API_URL=http://localhost:3001
```

The frontend components use `VITE_API_URL` to communicate with the backend.

## Integration Examples

### JavaScript/Node.js

```javascript
const apiKey = "lyn_your_key_here";

// Create lead
const response = await fetch("http://localhost:3001/api/leads", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  },
  body: JSON.stringify({
    nome: "John Doe",
    company_id: "company-uuid",
    email: "john@example.com",
  }),
});

const lead = await response.json();
```

### Python

```python
import requests

api_key = "lyn_your_key_here"
headers = {"X-API-Key": api_key}

response = requests.post(
    "http://localhost:3001/api/leads",
    json={
        "nome": "John Doe",
        "company_id": "company-uuid",
        "email": "john@example.com"
    },
    headers=headers
)

lead = response.json()
```

### cURL

```bash
API_KEY="lyn_your_key_here"

curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "nome": "John Doe",
    "company_id": "company-uuid",
    "email": "john@example.com"
  }'
```

## Troubleshooting

### "API key required" Error

- Verify header is present: `X-API-Key` or `Authorization: Bearer`
- Check key format starts with `lyn_`

### "Invalid or revoked API key" Error

- Key may have been revoked - regenerate it
- Verify key hasn't expired (check `revoked_at` is null)
- Check you're using the correct key

### Key Not Showing in List

- Might be revoked (filtered out by default)
- Verify you're querying with a valid key from the same company

## Frontend Integration

The `ApiKeysManager` component provides a complete UI for managing keys:

```tsx
import { ApiKeysManager } from "@/components/settings/ApiKeysManager";

export function SettingsPage() {
  const [apiKey] = useState("lyn_...");

  return <ApiKeysManager apiKey={apiKey} />;
}
```

Features:
- Create new keys
- View key metadata
- Regenerate keys (with old key revocation)
- Revoke keys
- Copy keys to clipboard
- Track usage statistics
