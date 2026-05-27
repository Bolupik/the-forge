import { NFTCard, Trade } from '@/lib/cardforge';
import ForgeCard from './card/ForgeCard';

interface NFTCardComponentProps {
  card: NFTCard;
  index: number;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
  trades?: Trade[];
  staticMode?: boolean;
  assemble?: boolean;
}

const NFTCardComponent = (props: NFTCardComponentProps) => <ForgeCard {...props} />;

export default NFTCardComponent;
