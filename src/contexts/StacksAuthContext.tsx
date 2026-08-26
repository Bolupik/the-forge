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
import { signInWithPasskey, signUpWithPasskey } from "@/lib/passkeyAuth";
import { createWalletForPasskey, getVaultAddress, lockWallet } from "@/lib/walletVault";
import { getSelectedNetwork } from "@/lib/stacksMint";

export interface StacksUserData {
  address: string;
  bnsName?: string;
}

/** How the current session holds its keys. */
export type WalletKind = 'connect' | 'embedded';

interface StacksAuthContextValue {
  isAuthenticated: boolean;
  userData: StacksUserData | null;
  isLoading: boolean;
  walletKind: WalletKind | null;
  signIn: () => Promise<void>;
  /** Passkey sign-in for an account that already has an embedded wallet. */
  signInPasskey: () => Promise<void>;
  /** Passkey signup: creates the account + wallet, returns the phrase to back up. */
  signUpPasskey: (displayName?: string) => Promise<string>;
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

const extractAddress = (parsed: unknown): string | undefined => {
  if (!parsed || typeof parsed !== "object") return undefined;
  // Wallet storage blobs have no stable schema, so read through a loose shape.
  const p = parsed as {
    addresses?: {
      testnet?: { address?: string };
      mainnet?: { address?: string };
      stx?: Array<{ address?: string }>;
    };
    userData?: { profile?: { stxAddress?: { testnet?: string; mainnet?: string } } };
  };
  // Testnet-first: app is locked to Stacks testnet for now.
  return (
    p?.addresses?.testnet?.address ||
    p?.userData?.profile?.stxAddress?.testnet ||
    p?.addresses?.stx?.[0]?.address ||
    p?.addresses?.mainnet?.address ||
    p?.userData?.profile?.stxAddress?.mainnet ||
    undefined
  );
};

export const getAddressFromStorage = (): string | undefined => {
  if (typeof window === "undefined") return undefined;
  for (const key of STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      let parsed: unknown;
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
    const names: Array<{ full_name?: string; revoked?: boolean }> = data?.names ?? [];
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
    const profileRow: Record<string, unknown> = {
      user_id: userId,
      stacks_address: address,
      username,
      display_name: bnsName ?? username,
    };
    if (bnsName) profileRow.bns_name = bnsName;

    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert([profileRow] as never, { onConflict: "user_id" });

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
  const [walletKind, setWalletKind] = useState<WalletKind | null>(null);
  const navigate = useNavigate();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const safety = setTimeout(() => {
      if (mounted.current) setIsLoading(false);
    }, 2000);

    (async () => {
      try {
        // 1. Embedded passkey wallet: a vault on this device + a live session.
        const vaultAddress = getVaultAddress(getSelectedNetwork());
        if (vaultAddress) {
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            if (!mounted.current) return;
            setUserData({ address: vaultAddress });
            setWalletKind("embedded");
            setIsAuthenticated(true);
            setIsLoading(false);
            fetchBnsName(vaultAddress).then((bnsName) => {
              if (mounted.current && bnsName) setUserData({ address: vaultAddress, bnsName });
            });
            return;
          }
        }

        // 2. External wallet (Xverse / Leather) via @stacks/connect.
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
          setWalletKind("connect");
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
      setWalletKind("connect");
      setIsAuthenticated(true);
      await ensureSupabaseSession(address, bnsName);
      try {
        localStorage.setItem(`stacks_onboarded_${address}`, "true");
      } catch {
        // ignore
      }
      navigate("/");
    } catch (err: unknown) {
      const msg = String((err as { message?: string })?.message || err || "").toLowerCase();
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

  /** Link the embedded wallet address onto the profile row. */
  const syncEmbeddedProfile = useCallback(async (address: string, bnsName?: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;
      const username = bnsName ?? address.slice(0, 20);
      await supabase.from("profiles").upsert(
        [
          {
            user_id: userId,
            stacks_address: address,
            username,
            display_name: bnsName ?? username,
            auth_method: "passkey",
          },
        ] as never,
        { onConflict: "user_id" },
      );
    } catch (e) {
      console.warn("[StacksAuth] embedded profile sync failed", e);
    }
  }, []);

  /**
   * Passkey signup: verify the new passkey, create the auth account, then
   * generate a device-only wallet sealed to that passkey. The returned phrase is
   * shown once for backup and never persisted in plaintext.
   */
  const signUpPasskey = useCallback(
    async (displayName?: string): Promise<string> => {
      const { credentialId } = await signUpWithPasskey(displayName);
      const created = await createWalletForPasskey(credentialId);
      const address = created.address[getSelectedNetwork()];

      setUserData({ address });
      setWalletKind("embedded");
      setIsAuthenticated(true);
      await syncEmbeddedProfile(address);
      return created.seedPhrase;
    },
    [syncEmbeddedProfile],
  );

  const signInPasskey = useCallback(async () => {
    await signInWithPasskey();

    const address = getVaultAddress(getSelectedNetwork());
    if (!address) {
      // Signed in, but this device holds no vault — the wallet must be restored.
      setWalletKind("embedded");
      setIsAuthenticated(true);
      navigate("/wallet");
      return;
    }

    setUserData({ address });
    setWalletKind("embedded");
    setIsAuthenticated(true);
    const bnsName = await fetchBnsName(address);
    if (bnsName) setUserData({ address, bnsName });
    await syncEmbeddedProfile(address, bnsName);
    navigate("/gallery");
  }, [navigate, syncEmbeddedProfile]);

  const signOut = useCallback(async () => {
    try {
      disconnect();
    } catch {
      // ignore
    }
    // Wipe the decrypted seed from memory. The encrypted vault stays on the
    // device so the user can sign back in with their passkey.
    lockWallet();
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUserData(null);
    setWalletKind(null);
    setIsAuthenticated(false);
    navigate("/auth");
  }, [navigate]);

  return (
    <StacksAuthContext.Provider
      value={{
        isAuthenticated,
        userData,
        isLoading,
        walletKind,
        signIn,
        signInPasskey,
        signUpPasskey,
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

