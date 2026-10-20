import { Phone, Mail, MapPin } from 'lucide-react';

export const CONTACT_INFO = [
  {
    id: 'phone',
    icon: Phone,
    title: 'Call Us',
    value: '+1 (800) 555-0199',
    subtext: 'Mon–Fri from 8am to 5pm.',
  },
  {
    id: 'email',
    icon: Mail,
    title: 'Email Us',
    value: 'support@medsync.care',
    subtext: 'We usually respond within 24 hours.',
  },
  {
    id: 'location',
    icon: MapPin,
    title: 'Visit Us',
    value: '123 Health Ave, Suite 400',
    subtext: 'San Francisco, CA 94103',
  },
];

export const OPERATING_HOURS = [
  { days: 'Mon - Fri', hours: '8:00 AM - 6:00 PM', closed: false },
  { days: 'Saturday', hours: '9:00 AM - 2:00 PM', closed: false },
  { days: 'Sunday', hours: 'Closed', closed: true },
];