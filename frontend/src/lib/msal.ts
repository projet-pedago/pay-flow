import { PublicClientApplication, type Configuration, type RedirectRequest } from "@azure/msal-browser";

const clientId = (import.meta.env.VITE_AZURE_CLIENT_ID ?? "").trim();
const tenantId = (import.meta.env.VITE_AZURE_TENANT_ID ?? "common").trim() || "common";

export function microsoftConfigured(): boolean {
  return Boolean(clientId);
}

const redirectUri =
  (import.meta.env.VITE_AZURE_REDIRECT_URI ?? "").trim() ||
  (typeof window !== "undefined" ? `${window.location.origin}/login` : "http://127.0.0.1:45217/login");

const config: Configuration = {
  auth: {
    clientId: clientId || "00000000-0000-0000-0000-000000000000",
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri,
    postLogoutRedirectUri: typeof window !== "undefined" ? `${window.location.origin}/login` : redirectUri,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

export const msalInstance = new PublicClientApplication(config);

export const loginRequest: RedirectRequest = {
  scopes: ["openid", "profile", "email"],
};

export async function clearMsalSession(): Promise<void> {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts[0]) {
      await msalInstance.logoutPopup({ account: accounts[0], mainWindowRedirectUri: "/login" }).catch(async () => {
        await msalInstance.clearCache();
      });
      return;
    }
    await msalInstance.clearCache();
  } catch {
    /* déjà déconnecté côté Entra */
  }
}
