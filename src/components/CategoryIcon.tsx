import {
  Briefcase,
  Circle,
  GraduationCap,
  Home,
  LucideIcon,
  Pin,
  ShoppingCart,
  User,
  Wallet,
} from 'lucide-react-native';

const icons: Record<string, LucideIcon> = {
  Briefcase,
  GraduationCap,
  Home,
  Pin,
  ShoppingCart,
  User,
  Wallet,
};

type CategoryIconProps = {
  color: string;
  name: string;
  size?: number;
};

export function CategoryIcon({ color, name, size = 18 }: CategoryIconProps) {
  const Icon = icons[name] ?? Circle;

  return <Icon color={color} size={size} strokeWidth={2.2} />;
}
