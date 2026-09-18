import {
  PublicClientApplication,
  type Configuration,
} from "@azure/msal-browser";

const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;
const apiClientId = import.meta.env.VITE_AZURE_API_CLIENT_ID;

if (!clientId || !tenantId) {
  throw new Error(
    "Microsoft Entra ID n’est pas configuré (VITE_AZURE_CLIENT_ID / VITE_AZURE_TENANT_ID).",
  );
}

if (!apiClientId) {
  throw new Error(
    "VITE_AZURE_API_CLIENT_ID n’est pas configuré.",
  );
}

const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
  },
};

export const loginRequest = {
  scopes: [
    "openid",
    "profile",
    `api://${apiClientId}/access_as_user`,
  ],
};

export const msalInstance = new PublicClientApplication(msalConfig);

export async function clearMsalSession(): Promise<void> {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts[0]) {
      await msalInstance.logoutPopup({
        account: accounts[0],
        mainWindowRedirectUri: window.location.origin,
      }).catch(async () => {
        await msalInstance.clearCache();
      });
      return;
    }
    await msalInstance.clearCache();
  } catch {
    /* déjà déconnecté côté Entra */
  }
}
