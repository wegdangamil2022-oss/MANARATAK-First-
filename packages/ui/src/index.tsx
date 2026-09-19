import { Slot } from '@radix-ui/react-slot';

export const Button = ({ asChild, ...props }: any) => {
  const Comp = asChild ? Slot : "button";
  return <Comp {...props} />;
};

export const ThemeProvider = ({children}: any) => <>{children}</>;
export const RTLProvider = ({children}: any) => <>{children}</>;
export const AppShell = ({header, children, footer}: any) => <div className="flex flex-col min-h-screen">{header}<main className="flex-1">{children}</main>{footer}</div>;
export const Container = ({children, className}: any) => <div className={className}>{children}</div>;
