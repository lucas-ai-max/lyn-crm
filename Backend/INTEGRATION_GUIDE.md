# API Key Integration Guide

## Quick Start

The API key system is ready to use. Here's how to integrate it with existing endpoints.

## Option 1: Protect All Routes (Recommended for New APIs)

Update `Backend/src/index.js` to protect specific routes:

```javascript
import { authenticateApiKey } from "./middleware/auth.middleware.js";

// Apply middleware to routes that need API key authentication
app.use("/api/api-keys", apiKeysRoutes); // API key management
app.use("/api/leads", authenticateApiKey, leadsRoutes); // Protect leads
app.use("/api/contacts", authenticateApiKey, contactsRoutes); // Protect contacts
```

This requires an API key for all requests to these endpoints.

## Option 2: Optional Authentication (Recommended for Mixed Access)

Use optional auth to support both user sessions AND API keys:

```javascript
import { optionalAuth } from "./middleware/auth.middleware.js";

// API key is optional; endpoints can check req.companyId
app.use("/api/leads", optionalAuth, leadsRoutes);
```

Then in route handlers:

```javascript
router.get("/", async (req, res) => {
  // Get companyId from API key OR session
  const companyId = req.companyId || req.session?.company_id;

  if (!companyId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // ... rest of handler
});
```

## Option 3: Selective Protection

Protect specific endpoints:

```javascript
import { authenticateApiKey } from "./middleware/auth.middleware.js";

// Some endpoints need auth, others are public
router.post("/", authenticateApiKey, async (req, res) => {
  // Only accessible with API key
});

router.get("/public", async (req, res) => {
  // Publicly accessible
});
```

## Recommended Migration Path

### Phase 1: Deploy API Key System (Now ✓)
- ✓ Deploy migration
- ✓ Deploy backend changes
- ✓ Deploy frontend component
- Public APIs work as before
- API key endpoints available for new integrations

### Phase 2: Optional Auth on New Endpoints (Week 1-2)
- Add `optionalAuth` middleware to new endpoints
- Support both session and API key auth
- Existing frontend code continues working
- External integrations can use API keys

### Phase 3: Protect High-Value Endpoints (Week 3-4)
- Require auth on `/api/api-keys` (already done ✓)
- Add auth to `/api/leads` if sensitive
- Add auth to `/api/contacts` if sensitive
- Keep other endpoints open for now

### Phase 4: Full Enforcement (Optional, Future)
- Require auth on all endpoints
- Only authenticated users or valid API keys
- Breaking change - coordinate with clients

## Example: Adding Auth to Leads Endpoint

### Current (No Auth)
```javascript
// Backend/src/routes/leads/leads.routes.js
router.get("/", async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) return res.status(400).json({ error: "companyId required" });
  // ... logic
});
```

### With API Key Support
```javascript
import { optionalAuth } from "../../middleware/auth.middleware.js";

const router = Router();

// Apply optional auth
router.use(optionalAuth);

router.get("/", async (req, res) => {
  // Get company from API key or request
  const companyId = req.companyId || req.query.companyId;

  if (!companyId) {
    return res.status(400).json({ error: "companyId or API key required" });
  }

  // Rest of handler works as before
  const data = await leads.list(companyId, { /* ... */ });
  res.json({ data });
});
```

## How to Use in Your Application

### From Frontend (Existing Method)
```javascript
// Still works exactly as before
fetch("/api/leads?companyId=123", {
  headers: {
    "Authorization": `Bearer ${userToken}`
  }
});
```

### From External Integration (New Method)
```bash
#!/bin/bash
API_KEY="lyn_your_key_here"

curl http://localhost:3001/api/leads \
  -H "X-API-Key: $API_KEY"

# No need to pass companyId - it's derived from the API key!
```

## Comparing Authentication Methods

| Feature | User Session | API Key |
|---------|--------------|---------|
| **Source** | Logged-in user | Generated key |
| **Lifetime** | Session duration | Until revoked |
| **Scope** | Single user | Entire company |
| **Use Case** | Web/Mobile UI | External APIs |
| **Rotation** | Automatic (expiry) | Manual (regenerate) |
| **Tracking** | User ID | Key name + last_used_at |

## Complete Example: Migrate Leads API

### Step 1: Update Route Handler

```javascript
// Before
router.get("/", async (req, res) => {
  const { companyId, status, limit, offset } = req.query;
  if (!companyId) return res.status(400).json({ error: "companyId required" });

  const data = await leads.list(companyId, { status, limit, offset });
  res.json({ data });
});

// After
router.get("/", async (req, res) => {
  // Get company from API key OR request
  const companyId = req.companyId || req.query.companyId;
  if (!companyId) {
    return res.status(400).json({ error: "companyId or API key required" });
  }

  const { status, limit, offset } = req.query;
  const data = await leads.list(companyId, { status, limit, offset });
  res.json({ data });
});
```

### Step 2: Add Middleware at Top of File

```javascript
import { optionalAuth } from "../../middleware/auth.middleware.js";
import { Router } from "express";
import * as leads from "../../services/leads.service.js";

const router = Router();

// Optional auth - supports both session and API key
router.use(optionalAuth);

// All routes below get optional auth
```

## Testing Your Integration

### Test with API Key
```bash
API_KEY=$(curl -s -X POST http://localhost:3001/api/api-keys \
  -H "X-API-Key: bootstrap_key" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key"}' | jq -r '.data.key')

echo "Using API key: $API_KEY"

curl http://localhost:3001/api/leads \
  -H "X-API-Key: $API_KEY" \
  -v
```

### Test with Session (Original)
```bash
curl http://localhost:3001/api/leads?companyId=123 \
  -H "Authorization: Bearer $USER_TOKEN" \
  -v
```

## Troubleshooting

### "API key required" but I'm passing a valid key

1. **Check header name**: Use `X-API-Key` or `Authorization: Bearer`
2. **Check key format**: Should start with `lyn_`
3. **Check if revoked**: Query database to verify `revoked_at IS NULL`
4. **Check middleware**: Ensure `optionalAuth` or `authenticateApiKey` is applied

### "companyId required" when using API key

Make sure the middleware is applied BEFORE the handler:

```javascript
// Wrong - middleware applied after route definition
router.get("/", async (req, res) => { /* ... */ });
router.use(optionalAuth); // Too late!

// Right - middleware first
router.use(optionalAuth);
router.get("/", async (req, res) => { /* ... */ });
```

### Old API key still works after revocation

Check that the frontend/integration isn't caching the key. Revocation happens immediately in the database, but the client might have cached it.

## Security Considerations

1. **API Keys in Logs**: Don't log full API keys
2. **HTTPS Only**: Always use HTTPS in production
3. **Key Rotation**: Regenerate periodically
4. **Scope**: API keys are company-wide, not user-specific
5. **Audit Trail**: Monitor `last_used_at` for usage patterns

## Next Steps

1. Choose your migration path (1-4 above)
2. Update routes gradually
3. Test with both auth methods
4. Document API key usage for external integrations
5. Monitor key usage and security

## API Documentation

Update your Swagger/API docs to mention API key support:

```yaml
components:
  securitySchemes:
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
    BearerAuth:
      type: http
      scheme: bearer

security:
  - ApiKeyAuth: []
  - BearerAuth: []
```

## Questions?

See `Backend/API_KEYS_GUIDE.md` for detailed documentation.
