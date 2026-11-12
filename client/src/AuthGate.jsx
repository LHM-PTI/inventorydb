import { useEffect, useLayoutEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { apiFetch, setAccessTokenProvider } from "./api.js";
import { loginRequest } from "./authConfig.js";

const LOGIN_RECORDED_KEY = "inventorydb.loginRecorded";

function LoginScreen() {
  const { instance, inProgress } = useMsal();
  const [error, setError] = useState(null);
  const busy = inProgress !== InteractionStatus.None;

  async function signIn() {
    setError(null);
    try {
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      setError(err.message || "Sign-in failed");
    }
  }

  return (
    <div className="app signin">
      <header className="signin-header">
        <img
          className="signin-logo"
          src="/lhm-pti-logo-color.png"
          alt="LHM Physical Therapy Institute"
        />
        <h1>InventoryDB</h1>
      </header>
      {error && <div className="banner error">{error}</div>}
      <nav className="home-nav" aria-label="Sign in">
        <button type="button" onClick={signIn} disabled={busy}>
          {busy ? "Signing in…" : "Sign in with your LHM Account"}
        </button>
      </nav>
    </div>
  );
}

function AuthenticatedApp({ children }) {
  const { instance, accounts } = useMsal();
  const account = instance.getActiveAccount() || accounts[0] || null;
  const [tokenReady, setTokenReady] = useState(false);

  // Register the provider before children mount/fetch so /api calls get a token.
  useLayoutEffect(() => {
    setAccessTokenProvider(async () => {
      if (!account) return null;
      try {
        const result = await instance.acquireTokenSilent({
          ...loginRequest,
          account,
        });
        return result.accessToken;
      } catch {
        await instance.acquireTokenRedirect(loginRequest);
        return null;
      }
    });
    setTokenReady(true);

    return () => {
      setTokenReady(false);
      setAccessTokenProvider(async () => null);
    };
  }, [account, instance]);

  useEffect(() => {
    if (!tokenReady || !account) return;
    if (sessionStorage.getItem(LOGIN_RECORDED_KEY)) return;

    sessionStorage.setItem(LOGIN_RECORDED_KEY, "1");
    apiFetch("/api/logins", { method: "POST" }).catch((err) => {
      console.error("Failed to record login:", err);
      sessionStorage.removeItem(LOGIN_RECORDED_KEY);
    });
  }, [tokenReady, account]);

  if (!tokenReady) return null;
  return children;
}

function SetupRequired() {
  return (
    <div className="app home">
      <header className="header">
        <h1>InventoryDB</h1>
        <p>
          Microsoft SSO is not configured. Add{" "}
          <code>VITE_AZURE_CLIENT_ID</code> and{" "}
          <code>VITE_AZURE_TENANT_ID</code> to <code>client/.env</code>.
        </p>
      </header>
    </div>
  );
}

// Once a session is established, keep the app mounted if MSAL briefly reports
// no accounts. Otherwise the sign-in screen flashes between hash routes.
let sessionEstablished = false;

function currentAccount(instance, accounts) {
  return (
    instance.getActiveAccount() ||
    accounts[0] ||
    instance.getAllAccounts()[0] ||
    null
  );
}

function AuthSwitch({ children }) {
  const { instance, accounts, inProgress } = useMsal();
  const account = currentAccount(instance, accounts);
  if (account) sessionEstablished = true;

  if (account || sessionEstablished) {
    return <AuthenticatedApp>{children}</AuthenticatedApp>;
  }

  if (inProgress !== InteractionStatus.None) {
    return null;
  }

  return <LoginScreen />;
}

export function AuthGate({ enabled, children }) {
  if (!enabled) {
    return <SetupRequired />;
  }

  return <AuthSwitch>{children}</AuthSwitch>;
}

export function useAuthUser() {
  const { instance, accounts } = useMsal();
  const account = instance.getActiveAccount() || accounts[0] || null;

  async function signOut() {
    await instance.logoutRedirect({
      account,
      postLogoutRedirectUri: window.location.origin,
    });
  }

  return {
    account,
    name: account?.name || account?.username || null,
    signOut,
  };
}
