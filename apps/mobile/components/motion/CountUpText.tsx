import { Text, type TextProps } from '~/components/ui/Text';
import { useCountUp } from '~/hooks/useCountUp';

export const CountUpText = ({
  value,
  format,
  style,
  children,
  ...props
}: TextProps & { value: number; format: (value: number) => string }) => {
  const shown = useCountUp(value);
  return (
    <Text {...props} style={[{ fontVariant: ['tabular-nums'] }, style]}>
      {format(shown)}
      {children}
    </Text>
  );
};
