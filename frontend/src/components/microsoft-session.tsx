import { InteractionStatus } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { loginRequest } from "@/lib/msal";

/** Après le retour Entra ID, échange le jeton Microsoft contre la session PayRollFlow. */
export function MicrosoftSessionBridge() {
  const { instance, accounts, inProgress } = useMsal();
  const { user, loading, loginMicrosoft } = useAuth();
  const navigate = useNavigate();
  const once = useRef(false);

  useEffect(() => {
    if (loading || user) return;
    if (inProgress !== InteractionStatus.None) return;
    const account = accounts[0];
    if (!account || once.current) return;
    once.current = true;

    void (async () => {
      try {
        const result = await instance.acquireTokenSilent({ ...loginRequest, account });
        if (!result.accessToken) throw new Error("Microsoft n’a pas renvoyé de jeton d’accès");
        const me = await loginMicrosoft({
          accessToken: result.accessToken,
          idToken: result.idToken || undefined,
        });
        navigate(me.role === "admin" ? "/admin" : "/espace", { replace: true });
      } catch (err) {
        once.current = false;
        toast.error(err instanceof Error ? err.message : "Connexion Microsoft impossible");
      }
    })();
  }, [accounts, inProgress, instance, loading, loginMicrosoft, navigate, user]);

  return null;
}
