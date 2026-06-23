import { useState } from 'react';
import { getSelectedNetwork, setSelectedNetwork, getContractConfig, getTreasuryAddress, type StacksNetwork } from '@/lib/stacksMint';

interface NetworkSwitchProps {
  onChange?: (network: StacksNetwork) => void;
}

const NetworkSwitch = ({ onChange }: NetworkSwitchProps) => {
  const [network, setNetwork] = useState<StacksNetwork>(getSelectedNetwork());

  const handleSwitch = (next: StacksNetwork) => {
    if (next === network) return;
    setSelectedNetwork(next);
    setNetwork(next);
    onChange?.(next);
  };

  const cfg = getContractConfig();
  const treasury = getTreasuryAddress();
  const configured = !!cfg;

  return (
    <div
      className="w-full max-w-[860px] mx-auto mb-4 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      style={{ background: 'var(--cf-surface)', border: '1px solid var(--cf-border)' }}
    >
      <div className="flex items-center gap-3">
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
  );
};

export default NetworkSwitch;
