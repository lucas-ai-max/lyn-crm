import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ApiKeysManager } from "@/components/settings/ApiKeysManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialApiKey();
  }, []);

  const loadInitialApiKey = async () => {
    try {
      // If you want to get the first API key automatically
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // You could fetch the first API key here if one exists
      // Or let the user create their first one through the UI
      setApiKey(null); // Start with null, user will create their first key
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your account and API access</p>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">API Keys</h2>
            <p className="text-sm text-gray-600 mb-4">
              Use API keys for programmatic access to your data. Keep them secret and rotate them
              regularly.
            </p>
          </div>

          {apiKey ? (
            <ApiKeysManager apiKey={apiKey} />
          ) : (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Create your first API key to get started with programmatic access.
              </p>
              <div className="mt-4">
                {/* On first visit, we need to show a way to get an initial key */}
                <p className="text-sm text-gray-600">
                  Your first API key will be shown here once created. You'll need to provide an
                  existing key to manage additional keys.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Account Settings</h2>
            {/* Add account settings here */}
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Billing</h2>
            {/* Add billing settings here */}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/*
INTEGRATION GUIDE:

1. Add this route to your router:
   import SettingsPage from "@/pages/SettingsPage";

   <Route path="/settings" element={<SettingsPage />} />

2. Update the loadInitialApiKey function to fetch the user's current API key
   from your backend or local storage

3. The ApiKeysManager component will handle all API key management once
   you provide a valid API key

4. For the first-time user experience, you might want to:
   - Create an initial API key automatically when they first visit settings
   - Or show a prominent "Create First Key" button
   - Store the first key securely (e.g., in localStorage or a secure store)

EXAMPLE: Loading user's first API key

  const loadInitialApiKey = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch the user's first API key from your backend
      const response = await fetch("http://localhost:3001/api/api-keys", {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      const { data: keys } = await response.json();

      if (keys.length > 0) {
        // If we have keys, we need to get a valid one for the ApiKeysManager
        // You might want to create one programmatically or have it stored
        setApiKey(storedApiKey);
      }
    } finally {
      setLoading(false);
    }
  };

NOTES:
- The ApiKeysManager component requires a valid API key to function
- Securely store API keys - never expose them in localStorage without encryption
- Consider using a backend endpoint to handle API key creation for users
*/
