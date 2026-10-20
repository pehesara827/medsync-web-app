import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Star,
  Clock,
  UserCheck,
  Users,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  ShieldCheck,
  GraduationCap,
  FileText,
  Mail,
  BadgeCheck,
  Briefcase,
  Banknote,
  AlertTriangle,
  MessageSquare,
  Stethoscope,
} from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import AddNewDoctorModal from '../components/AddNewDoctorModal';
import EditDoctorModal from '../components/EditDoctorModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// ---- Fallback mock data (only used offline) ----
const mockDoctors = [
  {
    id: 'DOC-001',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SLMC-45872',
    specialty: 'Cardiology',
    experience: 8,
    consultationFee: 5000,
    rating: 4.8,
    reviewCount: 213,
    status: 'APPROVED',
    education: 'MBBS, University of Colombo · MD (Cardiology)',
    bio: 'Board-certified cardiologist with a focus on preventive cardiology and non-invasive diagnostics. Dedicated to patient education and long-term heart health management.',
  },
  {
    id: 'DOC-002',
    name: 'Dr. Marcus Chen',
    email: 'marcus.chen@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-36921',
    specialty: 'Neurology',
    experience: 12,
    consultationFee: 7000,
    rating: 4.9,
    reviewCount: 156,
    status: 'APPROVED',
    education: 'MBBS, University of Peradeniya · MRCP (Neurology)',
    bio: 'Senior neurologist specializing in stroke management and movement disorders. Published researcher with a focus on neuro-rehabilitation.',
  },
  {
    id: 'DOC-003',
    name: 'Dr. Emily Thorne',
    email: 'emily.thorne@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-41205',
    specialty: 'Pediatrics',
    experience: 6,
    consultationFee: 4500,
    rating: 4.7,
    reviewCount: 98,
    status: 'PENDING',
    education: 'MBBS, University of Jaffna · MD (Pediatrics)',
    bio: 'Child-friendly pediatrician passionate about preventative care, vaccinations, and adolescent health. Trusted by young families across the region.',
  },
  {
    id: 'DOC-004',
    name: 'Dr. Amal Fernando',
    email: 'amal.fernando@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-51290',
    specialty: 'Orthopedics',
    experience: 15,
    consultationFee: 6500,
    rating: 4.6,
    reviewCount: 74,
    status: 'PENDING',
    education: 'MBBS, University of Kelaniya · MS (Orthopedic Surgery)',
    bio: 'Orthopedic surgeon with 15+ years experience in joint replacement and sports injuries. Offers both surgical and non-surgical treatment pathways.',
  },
  {
    id: 'DOC-005',
    name: 'Dr. Nimal Perera',
    email: 'nimal.perera@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-61230',
    specialty: 'Dermatology',
    experience: 5,
    consultationFee: 4800,
    rating: 4.5,
    reviewCount: 61,
    status: 'APPROVED',
    education: 'MBBS, University of Ruhuna · MD (Dermatology)',
    bio: 'Dermatologist experienced in medical, surgical, and cosmetic dermatology with a patient-first approach to skin health.',
  },
  {
    id: 'DOC-006',
    name: 'Dr. Kavindi Jayawardena',
    email: 'kavindi.j@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-62201',
    specialty: 'Gynecology',
    experience: 9,
    consultationFee: 6000,
    rating: 4.8,
    reviewCount: 142,
    status: 'APPROVED',
    education: 'MD, University of Colombo · MRCOG',
    bio: 'Consultant gynecologist and obstetrician providing comprehensive women\u2019s health care across all life stages.',
  },
  {
    id: 'DOC-007',
    name: 'Dr. Ravi Silva',
    email: 'ravi.silva@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-63450',
    specialty: 'Pulmonology',
    experience: 11,
    consultationFee: 6500,
    rating: 4.7,
    reviewCount: 129,
    status: 'APPROVED',
    education: 'MBBS, University of Colombo · MD (Respiratory Medicine)',
    bio: 'Pulmonologist specializing in asthma, COPD, and sleep-disordered breathing with a focus on chronic disease management.',
  },
  {
    id: 'DOC-008',
    name: 'Dr. Tharindu Dias',
    email: 'tharindu.dias@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-64810',
    specialty: 'Gastroenterology',
    experience: 13,
    consultationFee: 7200,
    rating: 4.9,
    reviewCount: 187,
    status: 'APPROVED',
    education: 'MBBS, University of Peradeniya · MD (Gastroenterology)',
    bio: 'Gastroenterologist offering advanced endoscopic procedures and management of complex digestive disorders.',
  },
  {
    id: 'DOC-009',
    name: 'Dr. Sanduni Wickramasinghe',
    email: 'sanduni.w@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-65502',
    specialty: 'Pediatrics',
    experience: 7,
    consultationFee: 4700,
    rating: 4.6,
    reviewCount: 88,
    status: 'PENDING',
    education: 'MD, University of Kelaniya · MRCPCH',
    bio: 'Pediatric specialist committed to newborn care, immunization, and growth monitoring for children of all ages.',
  },
  {
    id: 'DOC-010',
    name: 'Dr. Lasith Gunaratne',
    email: 'lasith.g@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-66100',
    specialty: 'Cardiology',
    experience: 14,
    consultationFee: 7800,
    rating: 4.9,
    reviewCount: 231,
    status: 'APPROVED',
    education: 'MBBS, University of Colombo · MD (Cardiology)',
    bio: 'Interventional cardiologist specializing in coronary angioplasty, heart failure, and preventive cardiology.',
  },
  {
    id: 'DOC-011',
    name: 'Dr. Ishara Bandara',
    email: 'ishara.bandara@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-67220',
    specialty: 'Dermatology',
    experience: 4,
    consultationFee: 4400,
    rating: 4.4,
    reviewCount: 47,
    status: 'PENDING',
    education: 'MBBS, University of Ruhuna · MD (Dermatology)',
    bio: 'Young dermatology consultant focused on acne, eczema, and cosmetic laser treatments.',
  },
  {
    id: 'DOC-012',
    name: 'Dr. Mihira Senanayake',
    email: 'mihira.s@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-68005',
    specialty: 'Neurology',
    experience: 16,
    consultationFee: 8000,
    rating: 5.0,
    reviewCount: 205,
    status: 'APPROVED',
    education: 'MBBS, University of Peradeniya · MD (Neurology)',
    bio: 'Senior neurologist with expertise in epilepsy, stroke care, and dementia management.',
  },
  {
    id: 'DOC-013',
    name: 'Dr. Chathura Rathnayake',
    email: 'chathura.r@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-68933',
    specialty: 'Orthopedics',
    experience: 10,
    consultationFee: 6900,
    rating: 4.7,
    reviewCount: 118,
    status: 'APPROVED',
    education: 'MBBS, University of Jaffna · MS (Orthopedics)',
    bio: 'Orthopedic surgeon focused on arthroscopy, sports injuries, and trauma surgery.',
  },
  {
    id: 'DOC-014',
    name: 'Dr. Priyanka Kumari',
    email: 'priyanka.k@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-69710',
    specialty: 'Gynecology',
    experience: 8,
    consultationFee: 5800,
    rating: 4.6,
    reviewCount: 95,
    status: 'APPROVED',
    education: 'MD, University of Colombo · MRCOG',
    bio: 'Gynecologist dedicated to women\u2019s health, fertility care, and minimally invasive surgery.',
  },
  {
    id: 'DOC-015',
    name: 'Dr. Nuwan Herath',
    email: 'nuwan.herath@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-70400',
    specialty: 'Pulmonology',
    experience: 6,
    consultationFee: 5100,
    rating: 4.5,
    reviewCount: 72,
    status: 'PENDING',
    education: 'MBBS, University of Kelaniya · MD (Respiratory Medicine)',
    bio: 'Pulmonologist with interests in respiratory infections, TB programs, and lung function testing.',
  },
  {
    id: 'DOC-016',
    name: 'Dr. Dilini Fernando',
    email: 'dilini.f@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-71220',
    specialty: 'Dermatology',
    experience: 9,
    consultationFee: 5600,
    rating: 4.7,
    reviewCount: 134,
    status: 'APPROVED',
    education: 'MBBS, University of Colombo · MD (Dermatology)',
    bio: 'Consultant dermatologist with a specialization in pediatric dermatology and skin allergy.',
  },
  {
    id: 'DOC-017',
    name: 'Dr. Kasun Jayasinghe',
    email: 'kasun.j@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-72105',
    specialty: 'Gastroenterology',
    experience: 12,
    consultationFee: 7400,
    rating: 4.8,
    reviewCount: 160,
    status: 'APPROVED',
    education: 'MBBS, University of Ruhuna · MD (Gastroenterology)',
    bio: 'Gastroenterologist focusing on liver diseases, hepatitis management, and therapeutic endoscopy.',
  },
  {
    id: 'DOC-018',
    name: 'Dr. Menaka Siriwardana',
    email: 'menaka.s@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-73009',
    specialty: 'Cardiology',
    experience: 15,
    consultationFee: 7900,
    rating: 4.9,
    reviewCount: 176,
    status: 'APPROVED',
    education: 'MBBS, University of Peradeniya · MD (Cardiology)',
    bio: 'Cardiologist specializing in cardiac imaging, arrhythmia management, and women\u2019s heart health.',
  },
  {
    id: 'DOC-019',
    name: 'Dr. Sarath Weerasinghe',
    email: 'sarath.w@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-74111',
    specialty: 'Orthopedics',
    experience: 18,
    consultationFee: 8200,
    rating: 4.8,
    reviewCount: 98,
    status: 'APPROVED',
    education: 'MBBS, University of Colombo · MS (Orthopedics)',
    bio: 'Senior orthopedic consultant with extensive experience in joint replacement and spine surgery.',
  },
  {
    id: 'DOC-020',
    name: 'Dr. Gayani Abeysekera',
    email: 'gayani.a@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-75002',
    specialty: 'Neurology',
    experience: 9,
    consultationFee: 6700,
    rating: 4.7,
    reviewCount: 144,
    status: 'APPROVED',
    education: 'MBBS, University of Jaffna · MD (Neurology)',
    bio: 'Neurologist focused on headache medicine, neurophysiology, and multiple sclerosis care.',
  },
  {
    id: 'DOC-021',
    name: 'Dr. Nuwan Ranaweera',
    email: 'nuwan.r@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-75880',
    specialty: 'Pulmonology',
    experience: 7,
    consultationFee: 5300,
    rating: 4.5,
    reviewCount: 83,
    status: 'PENDING',
    education: 'MBBS, University of Kelaniya · MD (Respiratory Medicine)',
    bio: 'Pulmonologist interested in occupational lung disease, pulmonary rehab, and smoking cessation.',
  },
  {
    id: 'DOC-022',
    name: 'Dr. Chamodi Lakshika',
    email: 'chamodi.l@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-76610',
    specialty: 'Gynecology',
    experience: 6,
    consultationFee: 5200,
    rating: 4.6,
    reviewCount: 109,
    status: 'PENDING',
    education: 'MD, University of Ruhuna · MRCOG',
    bio: 'Gynecologist with special interest in adolescent health, family planning, and high-risk pregnancy.',
  },
  {
    id: 'DOC-023',
    name: 'Dr. Sujith Ranasinghe',
    email: 'sujith.r@medsync.io',
    avatar:
      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=200',
    licenseNo: 'SL-77400',
    specialty: 'Pediatrics',
    experience: 11,
    consultationFee: 6100,
    rating: 4.8,
    reviewCount: 178,
    status: 'APPROVED',
    education: 'MBBS, University of Colombo · MD (Pediatrics)',
    bio: 'Pediatric consultant experienced in neonatology, childhood asthma, and developmental pediatrics.',
  },
];
// -----------------------------------------------

// KPI card template — `values` are provided from the API stats in the component
const KPI_CARDS = [
  { id: 'totalDoctors', label: 'Count of Doctors', icon: Users, tone: 'cyan' },
  { id: 'scheduledThisWeek', label: 'Scheduled This Week', icon: UserCheck, tone: 'cyan' },
  { id: 'scheduledToday', label: 'Scheduled Today', icon: Clock, tone: 'amber' },
];

const SPECIALTIES = [
  'Cardiology',
  'Neurology',
  'Pediatrics',
  'Orthopedics',
  'Dermatology',
  'Gynecology',
  'Pulmonology',
  'Gastroenterology',
];

const STATUS_STYLES = {
  APPROVED: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  PENDING: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
};

const currency = (amount) =>
  `LKR ${Number(amount).toLocaleString('en-LK', { maximumFractionDigits: 0 })}`;

// -----------------------------------------------
// Doctor avatar with initials fallback
// (live data may have no doctor_image — rendering
// <img src=""> triggers a React empty-src warning)
// -----------------------------------------------
function DoctorAvatar({ name, src, className }) {
  if (src) {
    return <img src={src} alt={name || 'Doctor'} className={className} />;
  }
  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');
  return (
    <div
      role="img"
      aria-label={name || 'Doctor'}
      className={`${className} flex items-center justify-center bg-gradient-to-br from-[#00a8cc] to-[#00728f] font-semibold text-white select-none`}
    >
      {initials || <Stethoscope className="w-1/2 h-1/2 opacity-80" />}
    </div>
  );
}

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

export default function DoctorManagement() {
  const [doctors, setDoctors] = useState(mockDoctors);
  const [stats, setStats] = useState({
    totalDoctors: 0,
    scheduledThisWeek: 0,
    scheduledToday: 0,
  });
  const [error, setError] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('All');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  // Incremented each time the edit modal is opened so it remounts with fresh
  // form state (the form is lazy-initialised from the selected doctor).
  const [editModalKey, setEditModalKey] = useState(0);

  // Debounce search input so we don't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadDoctors = useCallback(
    async (signal) => {
      setError('');
      try {
        const params = new URLSearchParams();
        if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
        if (specialty !== 'All') params.set('specialty', specialty);
        if (date) params.set('date', date);
        params.set('page', String(Math.max(1, page)));
        params.set('pageSize', String(PAGE_SIZE));

        const res = await fetch(
          `${API_BASE_URL}/admin/doctors-management?${params.toString()}`,
          { signal }
        );
        if (!res.ok) {
          throw new Error('Failed to load doctor data.');
        }

        const docsData = await res.json();
        const rows = Array.isArray(docsData.doctors) ? docsData.doctors : [];
        setDoctors(rows);
        setTotal(Number(docsData.total) || rows.length);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Failed to load doctors.');
      } finally {
        setInitialLoading(false);
      }
    },
    [debouncedSearch, specialty, date, page]
  );

  const loadStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/doctors-management/stats`);
      if (!res.ok) return;
      const data = await res.json();
      setStats({
        totalDoctors: data.stats?.totalDoctors ?? 0,
        scheduledThisWeek: data.stats?.scheduledThisWeek ?? 0,
        scheduledToday: data.stats?.scheduledToday ?? 0,
      });
    } catch {
      /* stats are best-effort; leave existing values on failure */
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const loadReviews = useCallback(async (doctorId) => {
    setReviewsLoading(true);
    setReviewsError('');
    try {
      const res = await fetch(`${API_BASE_URL}/reviews/doctor/${doctorId}`);
      if (!res.ok) throw new Error('Failed to load reviews.');
      const data = await res.json();
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    } catch (err) {
      setReviewsError(err.message || 'Failed to load reviews.');
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  // When filters/pagination change, refetch from the server. Abort any
  // in-flight request so a stale response can't overwrite a newer one.
  useEffect(() => {
    const controller = new AbortController();
    loadDoctors(controller.signal);
    return () => controller.abort();
  }, [loadDoctors]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const deleteDoctor = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/doctors/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to delete doctor.');
      }
      setDoctors((prev) => prev.filter((d) => d.id !== id));
      if (selectedDoctor?.id === id) {
        setSelectedDoctor(null);
        setReviews([]);
      }
      // If we just deleted the only row on the last page, step back a page.
      if (doctors.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        loadStats();
        loadDoctors();
      }
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to delete doctor.');
    }
  };

  const clearFilters = () => {
    setSearch('');
    setSpecialty('All');
    setDate('');
    setPage(1);
  };

  // Refetch doctors + KPIs after a new doctor is created.
  const refreshDoctors = () => {
    loadStats();
    loadDoctors();
  };

  // Instantly patch the in-memory row with the edited doctor, then refetch
  // from the server to keep the list/state in sync (incl. name/specialty).
  const handleDoctorUpdated = (updatedDoctor) => {
    if (updatedDoctor && updatedDoctor.id) {
      setDoctors((prev) =>
        prev.map((d) => (d.id === updatedDoctor.id ? updatedDoctor : d))
      );
    }
    loadStats();
    loadDoctors();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {initialLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Loading doctors...</p>
        </div>
      ) : (
        <>
      {/* A. Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200">
            Doctor Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review, approve, and manage registered practitioners on the platform.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddDoctorModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#00a8cc] text-white hover:bg-[#0092b3]"
        >
          <UserCheck className="w-4 h-4" />
          Add New Doctor
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4" />
          <span>{error}</span>
          <button
            onClick={loadDoctors}
            className="ml-auto text-sm font-medium underline underline-offset-2 hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {KPI_CARDS.map(({ id, label, icon: Icon, tone, star }) => (
          <div
            key={id}
            className={`rounded-xl border p-5 ${
              tone === 'amber'
                ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  tone === 'amber'
                    ? 'bg-amber-100 dark:bg-amber-500/20'
                    : 'bg-[#e0f5f8] dark:bg-slate-800'
                }`}
              >
                <Icon
                  className={`w-4.5 h-4.5 ${
                    tone === 'amber'
                      ? 'text-amber-500'
                      : 'text-[#00a8cc] dark:text-cyan-400'
                  } ${star ? 'fill-current' : ''}`}
                />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-200 mt-2">
              {stats[id] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* B. Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name or license..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-[#00a8cc] text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        <select
          value={specialty}
          onChange={(e) => {
            setSpecialty(e.target.value);
            setPage(1);
          }}
          className="text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]"
        >
          <option value="All">All Specialties</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setPage(1);
          }}
          className="text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00a8cc]"
        />
        <button
          onClick={clearFilters}
          className="text-sm font-medium text-[#00a8cc] hover:text-[#0092b3] whitespace-nowrap"
        >
          Clear All
        </button>
      </div>

      {/* C. Main Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-xs text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-3 font-medium">Doctor</th>
                <th className="px-6 py-3 font-medium">License &amp; Specialty</th>
                <th className="px-6 py-3 font-medium">Fee</th>
                <th className="px-6 py-3 font-medium">Rating</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {doctors.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                    No doctors match your filters.
                  </td>
                </tr>
              ) : (
                doctors.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => {
                      setSelectedDoctor(doc);
                      loadReviews(doc.id);
                    }}
                    className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 cursor-pointer"
                  >
                    {/* Doctor */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <DoctorAvatar
                          name={doc.name}
                          src={doc.avatar}
                          className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 dark:text-slate-200 truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                            {doc.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* License & Specialty */}
                    <td className="px-6 py-4">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        {doc.licenseNo}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {doc.specialty} &middot; {doc.experience} yrs
                      </p>
                    </td>
                    {/* Fee */}
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                      {currency(doc.consultationFee)}
                    </td>
                    {/* Rating */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Star className="w-4 h-4 text-amber-400 fill-current" />
                        <span className="font-medium text-slate-900 dark:text-slate-200">
                          {doc.rating}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          ({doc.reviewCount})
                        </span>
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[doc.status]}`}
                      >
                        {doc.status === 'APPROVED' ? (
                          <BadgeCheck className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3.5 h-3.5" />
                        )}
                        {doc.status}
                      </span>
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDoctor(doc.id);
                          }}
                          aria-label="Delete doctor"
                          title="Delete doctor"
                          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingDoctor(doc);
                            setEditModalKey((k) => k + 1);
                          }}
                          aria-label="Edit profile"
                          title="Edit profile"
                          className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {total > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex-wrap gap-3">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} doctors
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                aria-label="Previous page"
                className={`w-8 h-8 flex items-center justify-center rounded-md border ${
                  page === 1
                    ? 'border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  aria-label={`Page ${p}`}
                  className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-semibold ${
                    p === page
                      ? 'bg-[#00a8cc] text-white'
                      : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                aria-label="Next page"
                className={`w-8 h-8 flex items-center justify-center rounded-md border ${
                  page === totalPages
                    ? 'border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    : 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* D. Doctor Details Modal */}
      {selectedDoctor &&
        createPortal(
          <div className="fixed inset-0 z-[100]">
            {/* Full-screen blurred backdrop (covers sidebar + header) */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setSelectedDoctor(null);
                setReviews([]);
              }}
              aria-hidden="true"
            />

            {/* Centered modal */}
            <div className="relative h-full w-full flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <DoctorAvatar
                        name={selectedDoctor.name}
                        src={selectedDoctor.avatar}
                        className="w-16 h-16 rounded-full border border-slate-200 dark:border-slate-700"
                      />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-slate-200 text-lg leading-tight">
                          {selectedDoctor.name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {selectedDoctor.specialty}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 mt-2 text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[selectedDoctor.status]}`}
                        >
                          {selectedDoctor.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDoctor(null);
                        setReviews([]);
                      }}
                      aria-label="Close"
                      className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-6">
              {/* Top row: Account Info + Medical Credentials side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Info */}
              <section>
                <p className="text-xs font-semibold text-[#00a8cc] dark:text-cyan-400 tracking-wide mb-3 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" /> ACCOUNT INFO
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300">{selectedDoctor.email}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {selectedDoctor.specialty}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Banknote className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {currency(selectedDoctor.consultationFee)} / consultation
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Star className="w-4 h-4 text-amber-400 fill-current" />
                    <span className="text-slate-700 dark:text-slate-300">
                      {selectedDoctor.rating} &middot; {selectedDoctor.reviewCount} reviews
                    </span>
                  </div>
                </div>
              </section>

              {/* Medical Credentials */}
              <section>
                <p className="text-xs font-semibold text-[#00a8cc] dark:text-cyan-400 tracking-wide mb-3 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> MEDICAL CREDENTIALS
                </p>
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="flex items-start gap-3 p-3.5">
                    <FileText className="w-4 h-4 text-[#00a8cc] mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500">License No.</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                        {selectedDoctor.licenseNo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3.5">
                    <GraduationCap className="w-4 h-4 text-[#00a8cc] mt-0.5" />
                    <div>
                      <p className="text-xs text-slate-400 dark:text-slate-500">Education</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                        {selectedDoctor.education}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
              </div>

              {/* Bio / Description */}
              <section>
                <p className="text-xs font-semibold text-[#00a8cc] dark:text-cyan-400 tracking-wide mb-3">
                  BIO / DESCRIPTION
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedDoctor.bio}
                </p>
              </section>

              {/* Reviews & Comments */}
              <section>
                <p className="text-xs font-semibold text-[#00a8cc] dark:text-cyan-400 tracking-wide mb-3 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> REVIEWS &amp; COMMENTS
                </p>
                {reviewsLoading ? (
                  <div className="text-sm text-slate-500 dark:text-slate-400">Loading reviews...</div>
                ) : reviewsError ? (
                  <div className="text-sm text-rose-500 dark:text-rose-400">{reviewsError}</div>
                ) : reviews.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    No reviews yet for this doctor.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div
                        key={review.id}
                        className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 p-4"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2.5">
                            {review.patientImage ? (
                              <img
                                src={review.patientImage}
                                alt={review.patientName}
                                className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-500 dark:text-slate-300">
                                {(review.patientName || 'A').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-slate-200">
                                {review.patientName || 'Anonymous'}
                              </p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">
                                {formatDate(review.createdAt)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= Math.round(review.rating)
                                    ? 'text-amber-400 fill-current'
                                    : 'text-slate-300 dark:text-slate-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.comment && (
                          <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {review.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSelectedDoctor(null);
                      setReviews([]);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#00a8cc] text-white text-sm font-medium hover:bg-[#0092b3]"
                  >
                    <X className="w-4 h-4" /> Close
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
        </>
      )}

      {/* Add New Doctor Modal */}
      <AddNewDoctorModal
        isOpen={showAddDoctorModal}
        onClose={() => setShowAddDoctorModal(false)}
        onCreated={refreshDoctors}
      />

      {/* Edit Doctor Modal */}
      <EditDoctorModal
        key={`${editingDoctor?.id || 'none'}-${editModalKey}`}
        isOpen={!!editingDoctor}
        doctor={editingDoctor}
        onClose={() => setEditingDoctor(null)}
        onUpdated={handleDoctorUpdated}
      />
    </div>
  );
}