import { useCallback, useEffect, useState } from 'react';
import { Fingerprint, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  addPasskeyToAccount,
  describePasskeyError,
  listPasskeys,
  removePasskey,
  type StoredPasskey,
} from '@/lib/passkeyAuth';

/** Profile-panel section: list existing passkeys and add or remove extras. */
const PasskeyManager = () => {
  const [passkeys, setPasskeys] = useState<StoredPasskey[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPasskeys(await listPasskeys());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not load passkeys');
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = async () => {
    setBusy(true);
    try {
      await addPasskeyToAccount();
      toast.success('Passkey added');
      await refresh();
    } catch (e) {
      toast.error(describePasskeyError(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (pk: StoredPasskey) => {
    if (passkeys.length === 1) {
      toast.error('This is your only passkey — add another before removing it.');
      return;
    }
    setBusy(true);
    try {
      await removePasskey(pk.id);
      toast.success('Passkey removed');
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove passkey');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rounded-[20px] p-6"
      style={{
        background: 'linear-gradient(145deg, rgba(20,20,40,0.9), rgba(13,13,26,0.95))',
        border: '1px solid var(--cf-border2)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Fingerprint size={18} style={{ color: 'var(--cf-gold)' }} />
          <h3 className="font-display text-lg font-bold text-gold-gradient">Passkeys</h3>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.65rem] font-ui uppercase tracking-wider disabled:opacity-40"
          style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-gold)' }}
        >
          <Plus size={13} /> Add passkey
        </button>
      </div>

      {passkeys.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--cf-muted)' }}>
          No passkeys on this account yet. Add one to sign in with Face ID, Touch ID, Windows Hello or a PIN.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {passkeys.map((pk) => (
            <li
              key={pk.id}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-xs"
              style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--cf-border2)' }}
            >
              <div>
                <div style={{ color: 'var(--cf-fg)' }}>{pk.label || 'Passkey'}</div>
                <div style={{ color: 'var(--cf-muted)' }}>
                  {pk.last_used_at
                    ? `Last used ${new Date(pk.last_used_at).toLocaleDateString()}`
                    : 'Never used to sign in'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(pk)}
                disabled={busy}
                className="p-1.5 rounded-md disabled:opacity-40"
                style={{ color: 'var(--cf-muted)' }}
                aria-label={`Remove passkey ${pk.label ?? pk.id}`}
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasskeyManager;
