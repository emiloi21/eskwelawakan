import { Link } from 'react-router-dom';
import { GraduationCap, Menu, X, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button';
import { Container } from '@/components/public/container';
import { useSchoolInfo } from '@/hooks/use-school-info';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navLinks = [
  { label: 'News', to: '/news' },
  { label: 'Calendar', to: '/calendar' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'Contact', to: '/contact' },
];

export function PublicNavbar() {
  const { data: school } = useSchoolInfo();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/40 backdrop-blur-lg">
      <Container reverse delay={0.1}>
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            {school?.logo ? (
              <img src={school.logo} alt={school.schoolName} className="h-8 w-8 rounded object-contain" />
            ) : (
              <GraduationCap className="h-7 w-7 text-primary" />
            )}
            <span className="text-lg font-semibold">{school?.schoolName ?? 'SVHS'}</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <ul className="flex items-center gap-8">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="/kiosk"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'hidden md:flex gap-1.5')}
              title="Open Kiosk Time-In screen"
            >
              <ScanLine className="h-4 w-4" />
              Kiosk
            </a>
            <Link to="/portal-login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Login
            </Link>
            <Link to="/portal-login" className={cn(buttonVariants({ size: 'sm' }), 'hidden md:flex')}>
              Portal Access
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              className="md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </Container>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-background/95 backdrop-blur-lg md:hidden">
          <nav className="mx-auto max-w-screen-xl px-4 py-3">
            <ul className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="/kiosk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  <ScanLine className="h-4 w-4" />
                  Kiosk
                </a>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </header>
  );
}
