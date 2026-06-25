import { Container } from '@/components/public/container';
import { Wrapper } from '@/components/public/wrapper';
import { SectionBadge } from '@/components/public/section-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSchoolInfo } from '@/hooks/use-school-info';
import { Clock, Mail, MapPin, Phone, Send } from 'lucide-react';

const officeHours = [
  { day: 'Monday – Friday', hours: '7:00 AM – 5:00 PM' },
  { day: 'Saturday', hours: '8:00 AM – 12:00 PM' },
  { day: 'Sunday', hours: 'Closed' },
];

export default function ContactPage() {
  const { data: school } = useSchoolInfo();

  return (
    <section className="flex w-full flex-col items-center justify-center">
      {/* Banner */}
      <div className="w-full bg-gradient-to-br from-primary/10 to-primary/5 py-16">
        <Wrapper>
          <Container>
            <div className="text-center">
              <SectionBadge title="Get in Touch" />
              <h1 className="mt-4 text-4xl font-bold lg:text-5xl">Contact Us</h1>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                Have questions? We'd love to hear from you. Reach out to us through any of the channels below.
              </p>
            </div>
          </Container>
        </Wrapper>
      </div>

      <Wrapper className="py-12">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Contact Info */}
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold">School Information</h2>

              {school?.address && (
                <Card className="border-none bg-gradient-to-br from-background to-muted/30 shadow-sm dark:to-muted/10">
                  <CardHeader className="flex-row items-center gap-4 pb-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Address</CardTitle>
                      <p className="text-sm text-muted-foreground">{school.address}</p>
                    </div>
                  </CardHeader>
                </Card>
              )}

              {school?.emailAddress && (
                <Card className="border-none bg-gradient-to-br from-background to-muted/30 shadow-sm dark:to-muted/10">
                  <CardHeader className="flex-row items-center gap-4 pb-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Email</CardTitle>
                      <p className="text-sm text-muted-foreground">{school.emailAddress}</p>
                    </div>
                  </CardHeader>
                </Card>
              )}

              {school?.contactNumber && (
                <Card className="border-none bg-gradient-to-br from-background to-muted/30 shadow-sm dark:to-muted/10">
                  <CardHeader className="flex-row items-center gap-4 pb-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Phone</CardTitle>
                      <p className="text-sm text-muted-foreground">{school.contactNumber}</p>
                    </div>
                  </CardHeader>
                </Card>
              )}

              <Card className="border-none bg-gradient-to-br from-background to-muted/30 shadow-sm dark:to-muted/10">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-sm">Office Hours</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 pl-16">
                  <ul className="space-y-1">
                    {officeHours.map((oh) => (
                      <li key={oh.day} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{oh.day}</span>
                        <span className="font-medium">{oh.hours}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-semibold">Send us a Message</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>

              <form
                className="mt-6 space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  // Mock — will hook up later
                  alert('Thank you! Your message has been received.');
                }}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="Juan Dela Cruz" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="juan@example.com" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Inquiry about enrollment" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <textarea
                    id="message"
                    rows={5}
                    placeholder="Write your message here..."
                    required
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
                <Button type="submit" className="w-full sm:w-auto">
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </Container>
      </Wrapper>
    </section>
  );
}
