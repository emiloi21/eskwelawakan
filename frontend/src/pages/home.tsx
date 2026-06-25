import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Container } from '@/components/public/container';
import { Wrapper } from '@/components/public/wrapper';
import { SectionBadge } from '@/components/public/section-badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  GraduationCap,
  BookOpen,
  Users,
  Calendar,
  Newspaper,
  Image as ImageIcon,
  Phone,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────
interface Slider {
  id: number;
  title: string;
  subtitle: string | null;
  bg_image_url: string | null;
  bg_color: string;
  bg_overlay_color: string;
  bg_overlay_opacity: number;
  btn1_label: string | null;
  btn1_link: string | null;
  btn1_variant: string;
  btn2_label: string | null;
  btn2_link: string | null;
  btn2_variant: string;
  text_align: 'left' | 'center' | 'right';
}

interface CmsEvent {
  id: number;
  title: string;
  start_date: string;
  location: string | null;
}

interface CmsNews {
  id: number;
  title: string;
  excerpt: string | null;
  published_at: string;
  cover_image: string | null;
}

// ─── Quick Links ───────────────────────────────────────────────────────
const quickLinks = [
  { icon: Newspaper, label: 'News & Updates', to: '/news' },
  { icon: Calendar, label: 'School Calendar', to: '/calendar' },
  { icon: ImageIcon, label: 'Photo Gallery', to: '/gallery' },
  { icon: Phone, label: 'Contact Us', to: '/contact' },
  { icon: GraduationCap, label: 'Student Portal', to: '/portal-login' },
  { icon: BookOpen, label: 'Enroll Now', to: '/apply', highlight: true },
];

// ─── Button variant mapping ───────────────────────────────────────────
function sliderBtnClass(variant: string): string {
  if (variant === 'primary') return buttonVariants({ size: 'lg' });
  if (variant === 'secondary') return buttonVariants({ size: 'lg', variant: 'secondary' });
  if (variant === 'ghost') return cn(buttonVariants({ size: 'lg', variant: 'ghost' }), 'text-white');
  // outline — white border style on dark bg
  return cn(
    buttonVariants({ size: 'lg', variant: 'outline' }),
    'border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white',
  );
}

// ═══════════════════════════════════════════════════════════════════════
export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);

  const { data: sliders = [] } = useQuery<Slider[]>({
    queryKey: ['public-sliders'],
    queryFn: () => api.get('/public/sliders').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: events = [] } = useQuery<CmsEvent[]>({
    queryKey: ['public-events-home'],
    queryFn: () => api.get('/public/events').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: news = [] } = useQuery<CmsNews[]>({
    queryKey: ['public-news-home'],
    queryFn: () => api.get('/public/news').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const upcomingEvents = events.slice(0, 4);
  const latestNews = news.slice(0, 3);

  const activeSliders = sliders.length > 0 ? sliders : [{
    id: 0,
    title: 'Welcome to SVHS',
    subtitle: 'Nurturing minds, building futures.',
    bg_image_url: null,
    bg_color: '#1e40af',
    bg_overlay_color: '#000000',
    bg_overlay_opacity: 40,
    btn1_label: 'Enroll Now',
    btn1_link: '/apply',
    btn1_variant: 'secondary',
    btn2_label: 'Student Portal',
    btn2_link: '/portal-login',
    btn2_variant: 'outline',
    text_align: 'center' as const,
  }];

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % activeSliders.length);
  }, [activeSliders.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + activeSliders.length) % activeSliders.length);
  }, [activeSliders.length]);

  useEffect(() => {
    if (activeSliders.length <= 1) return;
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide, activeSliders.length]);

  return (
    <section className="relative flex w-full flex-col items-center justify-center">
      {/* ═══ Hero Image Slider ═══ */}
      <div className="relative w-full overflow-hidden min-h-[350px] sm:min-h-[420px] md:min-h-[520px]">
        {activeSliders.map((slide, idx) => {
          const overlayHex = `${slide.bg_overlay_color}${Math.round(
            (slide.bg_overlay_opacity / 100) * 255,
          ).toString(16).padStart(2, '0')}`;
          const alignClass =
            slide.text_align === 'left'
              ? 'text-left items-start'
              : slide.text_align === 'right'
              ? 'text-right items-end'
              : 'text-center items-center';
          const flexAlign =
            slide.text_align === 'left'
              ? 'justify-start'
              : slide.text_align === 'right'
              ? 'justify-end'
              : 'justify-center';

          return (
            <div
              key={slide.id}
              className={cn(
                'absolute inset-0 flex items-center justify-center transition-opacity duration-700',
                idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0',
              )}
            >
              {/* Background */}
              <div
                className="absolute inset-0"
                style={{ backgroundColor: slide.bg_color }}
              />
              {slide.bg_image_url && (
                <img
                  src={slide.bg_image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}
              {/* Overlay */}
              <div
                className="absolute inset-0"
                style={{ backgroundColor: overlayHex }}
              />

              {/* Content */}
              <div
                className={cn(
                  'relative z-10 mx-auto w-full max-w-screen-xl px-6 flex flex-col',
                  alignClass,
                )}
              >
                <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl lg:text-6xl">
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg md:text-xl">
                    {slide.subtitle}
                  </p>
                )}
                {(slide.btn1_label || slide.btn2_label) && (
                  <div className={cn('mt-8 flex flex-wrap gap-4', flexAlign)}>
                    {slide.btn1_label && slide.btn1_link && (
                      <Link to={slide.btn1_link} className={sliderBtnClass(slide.btn1_variant)}>
                        {slide.btn1_label} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    )}
                    {slide.btn2_label && slide.btn2_link && (
                      <Link to={slide.btn2_link} className={sliderBtnClass(slide.btn2_variant)}>
                        {slide.btn2_label}
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {activeSliders.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white backdrop-blur-sm transition hover:bg-black/50"
              aria-label="Next slide"
            >
              <ChevronRight className="h-6 w-6" />
            </button>

            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {activeSliders.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    idx === currentSlide ? 'w-8 bg-white' : 'w-2.5 bg-white/50',
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ═══ Quick Links ═══ */}
      <Wrapper className="py-12">
        <Container>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={cn(
                  'group flex flex-col items-center gap-3 rounded-xl border p-5 text-center transition-all hover:shadow-md',
                  link.highlight
                    ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                    : 'border-border bg-card hover:bg-accent',
                )}
              >
                <link.icon className={cn('h-7 w-7', link.highlight ? 'text-primary' : 'text-muted-foreground group-hover:text-primary')} />
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            ))}
          </div>
        </Container>
      </Wrapper>

      {/* ═══ Upcoming Events ═══ */}
      <Wrapper className="py-12" id="events">
        <Container>
          <div className="flex flex-col items-center text-center md:flex-row md:items-start md:justify-between md:text-left">
            <div>
              <SectionBadge title="Upcoming Events" />
              <h2 className="mt-4 text-3xl font-semibold lg:text-4xl">What's happening at SVHS</h2>
              <p className="mt-2 max-w-lg text-muted-foreground">Stay informed about important dates, events, and school activities.</p>
            </div>
            <Link to="/calendar" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4 md:mt-0')}>
              View Full Calendar <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </Container>
        <Container delay={0.3}>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {upcomingEvents.length === 0 ? (
              <p className="col-span-4 text-center text-muted-foreground text-sm py-8">No upcoming events.</p>
            ) : upcomingEvents.map((event) => (
              <Card key={event.id} className="border-none bg-gradient-to-br from-background to-muted/30 shadow-sm transition-all hover:shadow-md dark:to-muted/10">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <CardTitle className="text-base leading-snug">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {event.location ?? '—'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Wrapper>

      {/* ═══ Latest News ═══ */}
      <Wrapper className="relative py-12" id="news">
        <div className="hidden md:block absolute -right-1/3 top-0 -z-10 h-72 w-72 rounded-full bg-primary/20 blur-[10rem]" />
        <Container>
          <div className="flex flex-col items-center text-center md:flex-row md:items-start md:justify-between md:text-left">
            <div>
              <SectionBadge title="Latest News" />
              <h2 className="mt-4 text-3xl font-semibold lg:text-4xl">News & Announcements</h2>
              <p className="mt-2 max-w-lg text-muted-foreground">The latest updates from St. Vincent High School.</p>
            </div>
            <Link to="/news" className={cn(buttonVariants({ variant: 'outline' }), 'mt-4 md:mt-0')}>
              View All News <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </div>
        </Container>
        <Container delay={0.3}>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {latestNews.length === 0 ? (
              <p className="col-span-3 text-center text-muted-foreground text-sm py-8">No news published yet.</p>
            ) : latestNews.map((item) => (
              <Card key={item.id} className="border-none bg-gradient-to-br from-background to-muted/30 shadow-sm transition-all hover:shadow-md dark:to-muted/10">
                <div className="flex h-40 items-center justify-center rounded-t-lg bg-gradient-to-br from-muted to-muted/50 overflow-hidden">
                  {item.cover_image ? (
                    <img src={`http://localhost:8000/storage/${item.cover_image}`} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <Newspaper className="h-10 w-10 text-muted-foreground/40" />
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {item.published_at ? new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </div>
                  <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </Wrapper>

      {/* ═══ School Stats ═══ */}
      <Wrapper className="py-12">
        <Container>
          <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 p-8 ring-1 ring-border md:p-12">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {[
                { label: 'Students', value: '2,500+', icon: GraduationCap },
                { label: 'Faculty', value: '120+', icon: Users },
                { label: 'Programs', value: '15+', icon: BookOpen },
                { label: 'Years of Excellence', value: '25+', icon: Calendar },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-2 text-center">
                  <stat.icon className="h-8 w-8 text-primary" />
                  <span className="text-3xl font-bold">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Wrapper>

      {/* ═══ Enroll Now CTA ═══ */}
      <Wrapper className="py-16">
        <Container>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-8 text-center text-white md:p-16">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2260%22%20height%3D%2260%22%3E%3Cpath%20d%3D%22M0%200h60v60H0z%22%20fill%3D%22none%22%20stroke%3D%22rgba(255%2C255%2C255%2C0.08)%22%20stroke-width%3D%221%22%2F%3E%3C%2Fsvg%3E')] bg-repeat" />
            <div className="relative z-10">
              <GraduationCap className="mx-auto h-12 w-12" />
              <h2 className="mt-4 text-3xl font-bold md:text-4xl">Ready to Join SVHS?</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
                Enrollment for SY 2026–2027 is now open. Secure your slot today and be part of the Vincentian family!
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Link to="/apply" className={cn(buttonVariants({ size: 'lg', variant: 'secondary' }))}>
                  Enroll Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link to="/contact" className={cn(buttonVariants({ size: 'lg', variant: 'outline' }), 'border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white')}>
                  Contact Admissions
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </Wrapper>
    </section>
  );
}
