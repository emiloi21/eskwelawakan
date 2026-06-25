import { GraduationCap, Heart, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSchoolInfo } from '@/hooks/use-school-info';

const footerLinks = {
  Academics: [
    { label: 'Enrollment', to: '/login' },
    { label: 'School Calendar', to: '/calendar' },
  ],
  'Student Life': [
    { label: 'News & Updates', to: '/news' },
    { label: 'Photo Gallery', to: '/gallery' },
  ],
  Resources: [
    { label: 'Student Portal', to: '/login' },
  ],
  Info: [
    { label: 'Contact Us', to: '/contact' },
  ],
};

export function PublicFooter() {
  const { data: school } = useSchoolInfo();

  return (
    <footer className="relative mx-auto flex w-full max-w-6xl flex-col items-center justify-center border-t border-border px-6 pb-8 pt-16 lg:px-8 lg:pt-32">
      <div className="hidden lg:block absolute -top-1/3 -right-1/4 h-72 w-72 rounded-full bg-primary/30 -z-10 blur-[14rem]" />
      <div className="hidden lg:block absolute bottom-0 -left-1/4 h-72 w-72 rounded-full bg-primary/30 -z-10 blur-[14rem]" />

      <div className="grid w-full gap-8 xl:grid-cols-3 xl:gap-8">
        <div className="flex flex-col items-start md:max-w-[250px]">
          <Link to="/" className="flex items-center gap-2">
            {school?.logo ? (
              <img src={school.logo} alt={school.schoolName} className="h-7 w-7 rounded object-contain" />
            ) : (
              <GraduationCap className="h-7 w-7 text-primary" />
            )}
            <span className="text-lg font-semibold">{school?.schoolName ?? 'SVHS'}</span>
          </Link>

          {school?.address && (
            <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {school.address}
            </p>
          )}
          {school?.emailAddress && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              {school.emailAddress}
            </p>
          )}
          {school?.contactNumber && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              {school.contactNumber}
            </p>
          )}

          <span className="mt-4 flex items-center text-sm text-muted-foreground">
            Built with <Heart className="mx-1 h-3.5 w-3.5 fill-primary text-primary" /> for education
          </span>
        </div>

        <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-base font-medium">{category}</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="transition-colors duration-300 hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 w-full border-t border-border/40 pt-4 md:flex md:items-center md:justify-between md:pt-8">
        <p className="mt-8 text-sm text-muted-foreground md:mt-0">
          &copy; {new Date().getFullYear()} {school?.schoolName ?? 'SVHS'}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
