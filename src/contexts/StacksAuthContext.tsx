import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { connect, disconnect, isConnected } from "@stacks/connect";
import { supabase } from "@/integrations/supabase/client";

export interface StacksUserData {
  address: string;
  bnsName?: string;
}

interface StacksAuthContextValue {
  isAuthenticated: boolean;
  userData: StacksUserData | null;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  truncateAddress: (addr: string) => string;
}

const StacksAuthContext = createContext<StacksAuthContextValue | null>(null);

const STORAGE_KEYS = ["@stacks/connect", "blockstack-session", "stacks-session"];

/* ------------------------------ helpers ------------------------------ */

const isHex = (v: string) => v.length % 2 === 0 && /^[0-9a-f]+$/i.test(v);

const hexToUtf8 = (hex: string): string => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return new TextDecoder("utf-8").decode(bytes);
};

const extractAddress = (parsed: any): string | undefined => {
  if (!parsed || typeof parsed !== "object") return undefined;
  // Testnet-first: app is locked to Stacks testnet for now.
  return (
    parsed?.addresses?.testnet?.address ||
    parsed?.userData?.profile?.stxAddress?.testnet ||
    parsed?.addresses?.stx?.[0]?.address ||
    parsed?.addresses?.mainnet?.address ||
    parsed?.userData?.profile?.stxAddress?.mainnet ||
    undefined
  );
};

export const getAddressFromStorage = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  for (const key of STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let parsed: any;
      if (isHex(raw)) {
        try {
          parsed = JSON.parse(hexToUtf8(raw));
        } catch {
          continue;
        }
      } else {
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }
      }
      const addr = extractAddress(parsed);
      if (addr) return addr;
    } catch {
      // ignore and try next key
    }
  }
  return undefined;
};

const fetchBnsName = async (address: string): Promise<string | undefined> => {
  try {
    const res = await fetch(`https://api.bnsv2.com/names/address/${address}/valid`);
    if (!res.ok) return undefined;
    const data = await res.json();
    const names: any[] = data?.names ?? [];
    const active = names.filter((n) => !n?.revoked);
    const pickByNs = (ns: string) =>
      active.find((n) => n?.full_name?.toLowerCase().endsWith(`.${ns}`));
    const winner = pickByNs("btc") || pickByNs("stx") || pickByNs("id");
    return winner?.full_name;
  } catch {
    return undefined;
  }
};

const waitForAddress = async (maxMs = 8000, interval = 150): Promise<string | undefined> => {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const a = getAddressFromStorage();
    if (a) return a;
    await new Promise((r) => setTimeout(r, interval));
  }
  return undefined;
};

const truncateAddress = (addr: string): string => {
  if (!addr || addr.length < 10) return addr || "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

/* ----------------------- Supabase session bridge ----------------------- */

const ensureSupabaseSession = async (address: string, bnsName?: string) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    let userId = sessionData.session?.user?.id;

    if (!userId) {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.warn("[StacksAuth] anonymous sign-in failed", error);
        return;
      }
      userId = data.user?.id;
    }

    if (!userId) return;

    const username = bnsName ?? address.slice(0, 20);
    const profileRow: Record<string, any> = {
      user_id: userId,
      stacks_address: address,
      username,
      display_name: bnsName ?? username,
    };
    if (bnsName) profileRow.bns_name = bnsName;

    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert([profileRow] as any, { onConflict: "user_id" });

    if (upsertErr) {
      console.warn("[StacksAuth] profile upsert failed", upsertErr);
    }
  } catch (e) {
    console.warn("[StacksAuth] ensureSupabaseSession error", e);
  }
};

/* ------------------------------ provider ------------------------------ */

export const StacksAuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<StacksUserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const safety = setTimeout(() => {
      if (mounted.current) setIsLoading(false);
    }, 2000);

    (async () => {
      try {
        const connected = (() => {
          try {
            return isConnected();
          } catch {
            return false;
          }
        })();
        const address = getAddressFromStorage();
        if (connected && address) {
          if (!mounted.current) return;
          setUserData({ address });
          setIsAuthenticated(true);
          setIsLoading(false);
          // Background: fetch BNS + bridge to Supabase
          fetchBnsName(address).then((bnsName) => {
            if (!mounted.current) return;
            if (bnsName) setUserData({ address, bnsName });
            ensureSupabaseSession(address, bnsName);
          });
        } else {
          if (mounted.current) setIsLoading(false);
        }
      } catch {
        if (mounted.current) setIsLoading(false);
      }
    })();

    return () => {
      mounted.current = false;
      clearTimeout(safety);
    };
  }, []);

  const signIn = useCallback(async () => {
    try {
      await connect();
      const address = await waitForAddress();
      if (!address) return;

      const bnsName = await fetchBnsName(address);
      setUserData({ address, bnsName });
      setIsAuthenticated(true);
      await ensureSupabaseSession(address, bnsName);
      try {
        localStorage.setItem(`stacks_onboarded_${address}`, "true");
      } catch {
        // ignore
      }
      navigate("/");
    } catch (err: any) {
      const msg = String(err?.message || err || "").toLowerCase();
      if (
        msg.includes("wallet") ||
        msg.includes("extension") ||
        msg.includes("provider") ||
        msg.includes("canceled") ||
        msg.includes("cancelled")
      ) {
        // user closed popup or no extension — silent
        return;
      }
      console.error("[StacksAuth] signIn error", err);
    }
  }, [navigate]);

  const signOut = useCallback(async () => {
    try {
      disconnect();
    } catch {
      // ignore
    }
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUserData(null);
    setIsAuthenticated(false);
    navigate("/auth");
  }, [navigate]);

  return (
    <StacksAuthContext.Provider
      value={{
        isAuthenticated,
        userData,
        isLoading,
        signIn,
        signOut,
        truncateAddress,
      }}
    >
      {children}
    </StacksAuthContext.Provider>
  );
};

export const useStacksAuth = (): StacksAuthContextValue => {
  const ctx = useContext(StacksAuthContext);
  if (!ctx) {
    throw new Error("useStacksAuth must be used inside <StacksAuthProvider>");
  }
  return ctx;
};
