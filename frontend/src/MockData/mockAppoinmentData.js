// Mock appointment data covering all filter labels:
// All, Upcoming (Upcoming + Scheduled), Completed, Waitlist, Cancelled

export const MOCK_APPOINTMENTS = [
  // --- Upcoming / Scheduled (Upcoming filter) ---
  {
    id: 'MS-8824',
    status: 'Upcoming',
    day: 'Today',
    time: '14:30 PM (IST)',
    doctorName: 'Dr. Sarah Jenkins',
    specialty: 'Cardiology Specialist',
    patientsAhead: 3,
    doctorImage: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=300',
    hasBadge: true,
  },
  {
    id: 'MS-9012',
    status: 'Scheduled',
    day: 'Tomorrow',
    time: '10:00 AM (IST)',
    doctorName: 'Dr. Alan Turing',
    specialty: 'Neurology',
    patientsAhead: 1,
    doctorImage: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=300',
    hasBadge: false,
  },
  {
    id: 'MS-9401',
    status: 'Scheduled',
    day: 'Jul 28',
    time: '11:15 AM (IST)',
    doctorName: 'Dr. Emily Carter',
    specialty: 'Dermatology',
    patientsAhead: 2,
    doctorImage: 'https://images.unsplash.com/photo-1594824813566-88855ce783d1?auto=format&fit=crop&q=80&w=300',
    hasBadge: false,
  },
  {
    id: 'MS-3367',
    status: 'Upcoming',
    day: 'Today',
    time: '16:45 PM (IST)',
    doctorName: 'Dr. Marcus Webb',
    specialty: 'Orthopedics',
    patientsAhead: 5,
    doctorImage: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=300',
    hasBadge: true,
  },

  // --- Completed ---
  {
    id: 'MS-7531',
    status: 'Completed',
    day: 'Jun 15',
    time: '09:00 AM (IST)',
    doctorName: 'Dr. Lisa Ray',
    specialty: 'Ophthalmology',
    patientsAhead: null,
    doctorImage: 'https://images.unsplash.com/photo-1594824813566-88855ce783d1?auto=format&fit=crop&q=80&w=300',
    hasBadge: false,
  },
  {
    id: 'MS-6204',
    status: 'Completed',
    day: 'May 22',
    time: '15:30 PM (IST)',
    doctorName: 'Dr. James Wilson',
    specialty: 'General Medicine',
    patientsAhead: null,
    doctorImage: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300',
    hasBadge: false,
  },

  // --- Waitlist ---
  {
    id: 'MS-1189',
    status: 'Waitlist',
    day: 'Aug 5',
    time: '16:00 PM (IST)',
    doctorName: 'Dr. Robert Chen',
    specialty: 'Dentistry',
    patientsAhead: 7,
    doctorImage: 'https://images.unsplash.com/photo-1594824813566-88855ce783d1?auto=format&fit=crop&q=80&w=300',
    hasBadge: false,
  },

  // --- Cancelled ---
  {
    id: 'MS-4477',
    status: 'Cancelled',
    day: 'Jul 10',
    time: '11:00 AM (IST)',
    doctorName: 'Dr. Sophia Martinez',
    specialty: 'Pediatrics',
    patientsAhead: null,
    doctorImage: 'https://images.unsplash.com/photo-1594824813566-88855ce783d1?auto=format&fit=crop&q=80&w=300',
    hasBadge: false,
  },
];

/**
 * Computes appointment counts for each filter tab label.
 * 'Upcoming' includes both 'Upcoming' and 'Scheduled' statuses.
 *
 * @param {Array} appointments - The appointments array (defaults to MOCK_APPOINTMENTS)
 * @returns {Object} Counts keyed by filter label
 */
export const getAppointmentCounts = (appointments = MOCK_APPOINTMENTS) => {
  // Helper: resolve the display status (badgeStatus takes priority, falls back to status)
  // Normalize to lowercase for case-insensitive comparison
  const getDisplayStatus = (a) => (a.badgeStatus || a.status || '').toLowerCase();
  // Only count non-waitlist items for the appointment-based tabs, since
  // waitlist entries are displayed separately (as cards) only in the Waitlist tab.
  const nonWaitlist = appointments.filter((a) => !a.isWaitlist);
  const waitlist = appointments.filter((a) => a.isWaitlist);
  const counts = {
    All: nonWaitlist.length,
    Upcoming: nonWaitlist.filter(
      (a) => getDisplayStatus(a) === 'upcoming' || getDisplayStatus(a) === 'scheduled'
    ).length,
    Completed: nonWaitlist.filter((a) => getDisplayStatus(a) === 'completed').length,
    Waitlist: waitlist.length,
    Cancelled: nonWaitlist.filter((a) => getDisplayStatus(a) === 'cancelled').length,
  };
  return counts;
};
