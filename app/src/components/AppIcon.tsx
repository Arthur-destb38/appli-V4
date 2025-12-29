import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { LucideIcon, LucideProps } from 'lucide-react-native';

import { useAppTheme } from '@/theme/ThemeProvider';

interface Props extends Partial<LucideProps> {
  icon: LucideIcon;
  color?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const AppIcon: React.FC<Props> = ({ icon: IconComponent, color, size = 20, style, ...rest }) => {
  const { theme } = useAppTheme();
  return <IconComponent color={color ?? theme.colors.textSecondary} size={size} style={style} {...rest} />;
};
