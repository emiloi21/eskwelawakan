import { cn } from '@/lib/utils';

interface WrapperProps {
  className?: string;
  children: React.ReactNode;
  id?: string;
}

export function Wrapper({ children, className, id }: WrapperProps) {
  return (
    <div id={id} className={cn('h-full mx-auto w-full max-w-screen-xl px-4 md:px-20', className)}>
      {children}
    </div>
  );
}
