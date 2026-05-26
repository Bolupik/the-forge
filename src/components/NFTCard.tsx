import { NFTCard, Trade } from '@/lib/cardforge';
import ForgeCard from './card/ForgeCard';

interface NFTCardComponentProps {
  card: NFTCard;
  index: number;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
  trades?: Trade[];
}

/**
 * Thin wrapper — all visual presentation lives in ForgeCard.
 * Kept here so existing imports of `@/components/NFTCard` keep working.
 */
const NFTCardComponent = (props: NFTCardComponentProps) => <ForgeCard {...props} />;

export default NFTCardComponent;
