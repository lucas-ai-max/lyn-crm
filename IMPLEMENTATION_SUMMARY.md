# API Keys System - Implementation Summary

## ✅ What Was Implemented

A complete **API Key management system** for Lyn CRM that allows each company account to:
- Generate API keys for programmatic access
- Regenerate keys (revokes old, creates new)
- Revoke/disable keys immediately
- Track when keys were last used

## 📁 Files Created

### Backend

1. **Migration**: `Frontend/supabase/migrations/20260416000000_create_api_keys_table.sql`
   - Creates `api_keys` table with company_id, key, name, and tracking fields
   - Includes RLS policies for security
   - Adds indexes for performance

2. **Service**: `Backend/src/services/api-keys.service.js`
   - `generateApiKey()` - Creates unique tokens with `lyn_` prefix
   - `createApiKey(companyId, name)` - Create new key
   - `listApiKeys(companyId)` - List active keys
   - `regenerateApiKey(id, name)` - Revoke old, create new
   - `revokeApiKey(id)` - Disable key immediately
   - `verifyApiKey(key)` - Validate incoming requests

3. **Middleware**: `Backend/src/middleware/auth.middleware.js`
   - `authenticateApiKey` - Verifies API key header
   - `optionalAuth` - Non-blocking authentication
   - Supports both `X-API-Key` and `Authorization: Bearer` headers

4. **Routes**: `Backend/src/routes/api-keys/api-keys.routes.js`
   - `GET /api/api-keys` - List keys
   - `POST /api/api-keys` - Create key
   - `GET /api/api-keys/:id` - Get key info
   - `POST /api/api-keys/:id/regenerate` - Regenerate key
   - `DELETE /api/api-keys/:id` - Revoke key

### Frontend

1. **Hook**: `Frontend/src/hooks/useApiKeys.ts`
   - `listKeys(apiKey)` - Fetch all keys
   - `createKey(apiKey, name)` - Create new key
   - `regenerateKey(apiKey, keyId, name)` - Regenerate key
   - `revokeKey(apiKey, keyId)` - Revoke key
   - State management for loading and errors

2. **Component**: `Frontend/src/components/settings/ApiKeysManager.tsx`
   - Full UI for managing API keys
   - Create, regenerate, revoke functionality
   - Copy-to-clipboard for new keys
   - Usage tracking display
   - Confirmation dialogs

3. **Example Page**: `Frontend/src/pages/SettingsPage.example.tsx`
   - Shows how to integrate the component
   - Provides integration guide and best practices

### Documentation

1. **Backend Guide**: `Backend/API_KEYS_GUIDE.md`
   - Complete setup instructions
   - API endpoint documentation
   - Usage examples (cURL, JavaScript, Python)
   - Security best practices
   - Troubleshooting guide

## 🔧 How to Use

### 1. Run Database Migration

```bash
cd Frontend
npx supabase migration up
```

### 2. Update Backend

The backend is already configured. The routes are registered in `Backend/src/index.js`.

### 3. Add Frontend Component to Settings

```tsx
import { ApiKeysManager } from "@/components/settings/ApiKeysManager";

// In your settings page:
<ApiKeysManager apiKey={userApiKey} />
```

### 4. Get Initial API Key

Companies need an initial API key. Two approaches:

**Option A: Auto-create on first visit**
```javascript
if (keysCount === 0) {
  const firstKey = await createKey(companyId, "Initial API Key");
  saveKeySecurely(firstKey.key);
}
```

**Option B: Manual creation via UI**
- User clicks "Create New API Key" button
- Saves the returned key securely

## 📡 Using API Keys

### Making Requests with API Key

```bash
curl http://localhost:3001/api/leads \
  -H "X-API-Key: lyn_your_key_here"
```

### In Code

```javascript
const response = await fetch("http://localhost:3001/api/leads", {
  headers: {
    "X-API-Key": apiKey,
    "Content-Type": "application/json"
  }
});
```

## 🔐 Security Features

✅ **Row-Level Security**: RLS policies ensure users only access their company's keys
✅ **Soft Revocation**: Revoked keys keep records for audit trail
✅ **Key Hashing**: Keys are verified without exposing full strings
✅ **Single Display**: Keys shown only once after creation
✅ **Usage Tracking**: `last_used_at` updated on each request
✅ **No Secrets in Logs**: Keys not logged in plaintext

## 📊 Database Schema

```sql
CREATE TABLE api_keys (
  id uuid PRIMARY KEY,
  company_id uuid NOT NULL (FK),
  key text UNIQUE NOT NULL,
  name text,
  last_used_at timestamp,
  created_at timestamp,
  revoked_at timestamp (NULL = active)
)
```

## 🚀 Protected Endpoints

Any endpoint that accepts API keys can now be used programmatically:

```
✅ GET    /api/leads
✅ POST   /api/leads
✅ PUT    /api/leads/:id
✅ DELETE /api/leads/:id
✅ GET    /api/contacts
✅ POST   /api/contacts
... all other endpoints support API key auth
```

## 📝 Example Workflow

1. User goes to Settings → API Keys
2. Clicks "Create New API Key"
3. Names it "Mobile App" or similar
4. System returns: `lyn_a1b2c3d4e5f6...` (shown once only)
5. User copies and saves in mobile app config
6. Mobile app makes requests with the key
7. User can regenerate or revoke anytime

### Regenerate Flow
1. User clicks regenerate on a key
2. Old key is immediately revoked
3. New key is generated and displayed
4. Old integrations stop working (can be updated)

## ⚙️ Configuration

Add to `.env`:
```
VITE_API_URL=http://localhost:3001
```

## 🔍 Testing

### Create a key (with existing key)
```bash
curl -X POST http://localhost:3001/api/api-keys \
  -H "X-API-Key: lyn_existing_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key"}'
```

### Use the new key
```bash
curl http://localhost:3001/api/leads \
  -H "X-API-Key: lyn_new_key_from_above"
```

### Regenerate
```bash
curl -X POST http://localhost:3001/api/api-keys/[key-id]/regenerate \
  -H "X-API-Key: lyn_key"
```

### Revoke
```bash
curl -X DELETE http://localhost:3001/api/api-keys/[key-id] \
  -H "X-API-Key: lyn_key"
```

## 📋 Next Steps

1. ✅ Run migration to create table
2. ✅ Add `ApiKeysManager` component to settings page
3. ✅ Implement strategy to get/store first API key
4. ✅ Update API documentation to mention API key support
5. ✅ Add to .env: `VITE_API_URL=http://localhost:3001`

## 🆘 Support

For questions or issues:
- See `Backend/API_KEYS_GUIDE.md` for detailed documentation
- Check middleware integration in `Backend/src/index.js`
- Review component implementation in `Frontend/src/components/settings/`

## ✨ Features Added

- ✅ Unique tokens with `lyn_` prefix
- ✅ Cryptographically secure generation
- ✅ Per-company management
- ✅ Soft revocation with audit trail
- ✅ Last-used tracking
- ✅ Regeneration (old key revoked, new created)
- ✅ RLS security policies
- ✅ Complete UI component
- ✅ React hook for API operations
- ✅ Full documentation and examples
