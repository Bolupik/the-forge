import { useState } from 'react';
import {
  getSelectedNetwork,
  setSelectedNetwork,
  getContractConfig,
  getTreasuryAddress,
  setContractAddress,
  setContractName,
  getContractName,
  type StacksNetwork,
} from '@/lib/stacksMint';

interface NetworkSwitchProps {
  onChange?: (network: StacksNetwork) => void;
}

const NetworkSwitch = ({ onChange }: NetworkSwitchProps) => {
  const [network, setNetwork] = useState<StacksNetwork>(getSelectedNetwork());
  const [editing, setEditing] = useState(false);
  const [addrInput, setAddrInput] = useState(getContractConfig()?.address ?? '');
  const [nameInput, setNameInput] = useState(getContractName());
  const [tick, setTick] = useState(0);

  const handleSwitch = (next: StacksNetwork) => {
    if (next === network) return;
    setSelectedNetwork(next);
    setNetwork(next);
    setAddrInput(getContractConfig()?.address ?? '');
    onChange?.(next);
  };

  const handleSave = () => {
    setContractAddress(network, addrInput);
    if (nameInput.trim()) setContractName(nameInput);
    setEditing(false);
    setTick((t) => t + 1);
    onChange?.(network);
  };

  const cfg = getContractConfig();
  const treasury = getTreasuryAddress();
  const configured = !!cfg;
  void tick;

  return (
    <div
      className="w-full max-w-[860px] mx-auto mb-4 p-3 rounded-xl flex flex-col gap-3"
      style={{ background: 'var(--cf-surface)', border: '1px solid var(--cf-border)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-ui text-[0.6rem] uppercase tracking-wider" style={{ color: 'var(--cf-muted)' }}>
            Chain
          </span>
          <div
            className="inline-flex rounded-lg p-1"
            style={{ background: 'var(--cf-surface2)', border: '1px solid var(--cf-border2)' }}
          >
            {(['testnet', 'mainnet'] as StacksNetwork[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => handleSwitch(n)}
                className="font-ui text-[0.65rem] uppercase tracking-wider px-3 py-1 rounded-md transition-all"
                style={{
                  background: network === n ? 'var(--cf-gold)' : 'transparent',
                  color: network === n ? 'var(--cf-bg)' : 'var(--cf-muted2)',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          {!configured && (
            <span className="font-body text-[0.6rem]" style={{ color: '#f87171' }}>
              Contract address not set
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className="font-ui text-[0.55rem] uppercase tracking-wider px-2 py-1 rounded-md"
            style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-muted2)' }}
          >
            {editing ? 'Close' : configured ? 'Edit contract' : 'Set contract'}
          </button>
        </div>

        <div className="flex flex-col sm:items-end gap-0.5">
          {cfg && (
            <span className="font-mono text-[0.55rem] truncate max-w-[260px]" style={{ color: 'var(--cf-muted)' }}>
              {cfg.address}.{cfg.name}
            </span>
          )}
          {treasury && (
            <span className="font-mono text-[0.55rem] truncate max-w-[260px]" style={{ color: 'var(--cf-muted)' }}>
              Treasury: {treasury}
            </span>
          )}
        </div>
      </div>

      {editing && (
        <div className="flex flex-col gap-2 pt-2" style={{ borderTop: '1px solid var(--cf-border2)' }}>
          <label className="font-ui text-[0.55rem] uppercase tracking-wider" style={{ color: 'var(--cf-muted)' }}>
            Contract address ({network})
          </label>
          <input
            type="text"
            spellCheck={false}
            value={addrInput}
            onChange={(e) => setAddrInput(e.target.value)}
            placeholder={network === 'testnet' ? 'ST…' : 'SP…'}
            className="font-mono text-xs px-3 py-2 rounded-md"
            style={{ background: 'var(--cf-bg)', border: '1px solid var(--cf-border2)', color: 'var(--cf-text)' }}
          />
          <label className="font-ui text-[0.55rem] uppercase tracking-wider" style={{ color: 'var(--cf-muted)' }}>
            Contract name
          </label>
          <input
            type="text"
            spellCheck={false}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="cardforge-nft"
            className="font-mono text-xs px-3 py-2 rounded-md"
            style={{ background: 'var(--cf-bg)', border: '1px solid var(--cf-border2)', color: 'var(--cf-text)' }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="font-ui text-[0.6rem] uppercase tracking-wider px-3 py-2 rounded-md"
              style={{ background: 'var(--cf-gold)', color: 'var(--cf-bg)' }}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setAddrInput(''); setContractAddress(network, ''); setTick((t) => t + 1); onChange?.(network); }}
              className="font-ui text-[0.6rem] uppercase tracking-wider px-3 py-2 rounded-md"
              style={{ border: '1px solid var(--cf-border2)', color: 'var(--cf-muted2)' }}
            >
              Clear
            </button>
          </div>
          <p className="font-body text-[0.6rem]" style={{ color: 'var(--cf-muted)' }}>
            Paste the address you deployed <code>{nameInput || 'cardforge-nft'}</code> under on Stacks {network}. It's saved locally so mint transactions can be signed.
          </p>
        </div>
      )}
    </div>
  );
};

export default NetworkSwitch;
