# API Keys - Quick Start (5 minutes)

## What You Get

Each company can now generate secure API keys for programmatic access. Users can create, regenerate, and revoke keys anytime.

## Setup (3 steps)

### 1. Run Database Migration

```bash
cd Frontend
npx supabase migration up
```

Creates the `api_keys` table in your Supabase database.

### 2. Restart Backend

```bash
cd Backend
npm start
```

The API key routes are already integrated.

### 3. Add Component to Frontend

In your settings page, add the API Key manager:

```tsx
import { ApiKeysManager } from "@/components/settings/ApiKeysManager";

// Inside your settings component:
<ApiKeysManager apiKey={userApiKey} />
```

## Create Your First API Key

### Via API (cURL)

Need a bootstrap key first? Contact your system admin to create your first one.

```bash
curl -X POST http://localhost:3001/api/api-keys \
  -H "X-API-Key: your_existing_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "My API Key"}'
```

Response:
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "key": "lyn_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
    "name": "My API Key",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

⚠️ **Save this key securely** - it won't be shown again!

## Use Your API Key

### In cURL

```bash
curl http://localhost:3001/api/leads \
  -H "X-API-Key: lyn_a1b2c3d4e5f6..."
```

### In JavaScript

```javascript
const apiKey = "lyn_a1b2c3d4e5f6...";

const response = await fetch("http://localhost:3001/api/leads", {
  headers: {
    "X-API-Key": apiKey
  }
});

const { data } = await response.json();
```

### In Python

```python
import requests

api_key = "lyn_a1b2c3d4e5f6..."
headers = {"X-API-Key": api_key}

response = requests.get(
    "http://localhost:3001/api/leads",
    headers=headers
)

data = response.json()
```

## Regenerate a Key (Rotate)

When you need to rotate a key:

```bash
curl -X POST http://localhost:3001/api/api-keys/550e8400-e29b-41d4-a716-446655440000/regenerate \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "My API Key v2"}'
```

✅ Old key is immediately revoked
✅ New key is returned and ready to use

## Revoke a Key

If a key is compromised:

```bash
curl -X DELETE http://localhost:3001/api/api-keys/550e8400-e29b-41d4-a716-446655440000 \
  -H "X-API-Key: your_api_key"
```

✅ Key immediately stops working

## List Your Keys

```bash
curl http://localhost:3001/api/api-keys \
  -H "X-API-Key: your_api_key"
```

Response shows all active keys (without exposing full key):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "My API Key",
      "created_at": "2024-01-01T00:00:00Z",
      "last_used_at": "2024-01-02T12:00:00Z"
    }
  ]
}
```

## Common Tasks

### Task: Get leads for my company

```bash
curl "http://localhost:3001/api/leads" \
  -H "X-API-Key: lyn_your_key"
```

### Task: Create a lead

```bash
curl -X POST "http://localhost:3001/api/leads" \
  -H "X-API-Key: lyn_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "John Doe",
    "email": "john@example.com",
    "company_id": "your-company-id"
  }'
```

### Task: Store key in environment

```bash
# .env
REACT_APP_API_KEY=lyn_your_key

# In code
const apiKey = process.env.REACT_APP_API_KEY;
```

Or use a backend environment variable:

```bash
# Backend .env
API_KEY=lyn_your_key

# In Node.js
const apiKey = process.env.API_KEY;
```

## Key Features

✅ **Secure**: Cryptographically generated unique tokens
✅ **Company-wide**: All team members share company keys
✅ **Traceable**: See when each key was last used
✅ **Rotatable**: Regenerate keys without breaking production
✅ **Revocable**: Immediately disable compromised keys
✅ **Simple**: Just add one header to your requests

## Best Practices

1. **Don't commit keys** to version control
2. **Rotate regularly** - use regenerate endpoint monthly
3. **Use environment variables** - never hardcode
4. **Monitor last_used_at** - revoke unused keys
5. **One key per service** - makes tracking easier
6. **Revoke immediately** if exposed

## Troubleshooting

**"API key required" error**
- Make sure you're sending the key: `-H "X-API-Key: your_key"`
- Check key starts with `lyn_`

**"Invalid or revoked API key"**
- Key might be revoked - regenerate it
- Copy the key exactly - no extra spaces

**Key not in list**
- Verify you're using a valid key to list keys
- Revoked keys aren't shown

## Need Help?

- Full API docs: `Backend/API_KEYS_GUIDE.md`
- Integration guide: `Backend/INTEGRATION_GUIDE.md`
- Implementation details: `IMPLEMENTATION_SUMMARY.md`

## What's Next?

1. ✅ Create your first API key
2. ✅ Try making a request with it
3. ✅ Integrate into your app/service
4. ✅ Save key securely in env
5. ✅ Monitor usage with `last_used_at`

---

You're all set! Start using API keys for secure programmatic access. 🎉
