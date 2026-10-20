import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { KeyRound, User, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Send, ShieldCheck } from 'lucide-react';
import { supabase } from '../../../supabaseClient';
import LoadingSpinner from '../../components/LoadingSpinner';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * DoctorResetPassword — /doctor/reset-password
 * Lets a doctor (especially one just created by an admin) change their login
 * username and password. Reached via the welcome notification or profile.
 */
export default function DoctorResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromNotification =
    location.state?.fromNotification || new URLSearchParams(location.search).get('firstLogin') === '1';

  const [userId, setUserId] = useState(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState({ type: '', text: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) {
          setLoadError('You must be logged in to reset your password.');
          return;
        }
        setUserId(user.id);
        const response = await fetch(`${API_BASE_URL}/doctor/profile/${user.id}`);
        if (!response.ok) throw new Error(`Failed to load profile (${response.status})`);
        const data = await response.json();
        setEmail(data?.doctor?.email || user.email || '');
        setUsername(data?.doctor?.username || '');
      } catch (err) {
        setLoadError(err.message || 'Failed to load your account.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);


  const handleUsernameSave = async (e) => {
    e.preventDefault();
    setUsernameMsg({ type: '', text: '' });
    const trimmed = username.trim();
    if (!trimmed) {
      setUsernameMsg({ type: 'error', text: 'Username is required.' });
      return;
    }
    if (!userId) {
      setUsernameMsg({ type: 'error', text: 'You must be logged in to change your username.' });
      return;
    }
    setUsernameSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/doctor/profile/${userId}/credentials`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Failed to update username (${response.status})`);
      setUsername(data?.user?.username || trimmed);
      setUsernameMsg({ type: 'success', text: 'Username updated successfully!' });
    } catch (err) {
      setUsernameMsg({ type: 'error', text: err.message || 'Failed to update username.' });
    } finally {
      setUsernameSaving(false);
    }
  };

  const handlePasswordInput = (e) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
    if (pwError) setPwError('');
    if (pwSuccess) setPwSuccess('');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError('Please fill in all password fields.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPwError('New password must be different from the current password.');
      return;
    }
    if (!email) {
      setPwError('No account email found. Please contact support.');
      return;
    }
    setPwLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) {
        setPwError('Current password is incorrect.');
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwSuccess('Password updated successfully! Please use your new password next time you log in.');
    } catch (err) {
      setPwError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setPwLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setPwError('');
    setPwSuccess('');
    if (!email) {
      setPwError('No account email found. Please contact support.');
      return;
    }
    setResetSending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setResetSent(true);
      setPwSuccess(`Reset link sent to ${email}. Check your inbox.`);
    } catch (err) {
      setPwError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setResetSending(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading your account" />;

  const pwFields = [
    { key: 'currentPassword', label: 'Current Password', flag: 'current', autoComplete: 'current-password' },
    { key: 'newPassword', label: 'New Password', flag: 'next', autoComplete: 'new-password' },
    { key: 'confirmPassword', label: 'Confirm New Password', flag: 'confirm', autoComplete: 'new-password' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button
        type="button"
        onClick={() => navigate('/doctor/profile')}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-cyan-600 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Profile
      </button>
      {fromNotification && (
        <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-5 py-4 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-cyan-800">Welcome to MedSync!</p>
            <p className="text-cyan-700 mt-0.5">An admin created your account. Please reset your password and set your username below.</p>
          </div>
        </div>
      )}
      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{loadError}</div>
      )}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
        <div className="flex items-center gap-2.5 mb-1">
          <span className="w-9 h-9 rounded-full bg-cyan-50 flex items-center justify-center">
            <User className="w-4 h-4 text-cyan-600" />
          </span>
          <div>
            <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100">Change Username</h1>
            <p className="text-xs text-slate-500">Signed in as <span className="font-medium">{email || '—'}</span></p>
          </div>
        </div>
        {usernameMsg.text && (
          <div className={`mt-4 rounded-xl border px-4 py-3 text-xs ${usernameMsg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {usernameMsg.text}
          </div>
        )}
        <form onSubmit={handleUsernameSave} className="mt-4 flex flex-col sm:flex-row gap-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Choose a username"
            autoComplete="username"
            className="flex-1 px-3 py-2.5 rounded-lg border border-slate-200 text-sm"
          />
          <button
            type="submit"
            disabled={usernameSaving}
            className="px-5 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-medium hover:bg-cyan-600 disabled:opacity-60"
          >
            {usernameSaving ? 'Saving…' : 'Save Username'}
          </button>
        </form>
      </div>



      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900">Reset Password</h2>
        <p className="text-xs text-slate-500">Verify your current password to set a new one.</p>
        {pwError && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{pwError}</div>}
        {pwSuccess && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">{pwSuccess}</div>}
        <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
          {pwFields.map((field) => (
            <div key={field.key}>
              <label className="text-xs font-semibold text-slate-600">{field.label}</label>
              <div className="relative mt-1">
                <input
                  type={showPw[field.flag] ? 'text' : 'password'}
                  name={field.key}
                  required
                  autoComplete={field.autoComplete}
                  value={passwordForm[field.key]}
                  onChange={handlePasswordInput}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((prev) => ({ ...prev, [field.flag]: !prev[field.flag] }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
                  aria-label={showPw[field.flag] ? 'Hide' : 'Show'}
                >
                  {showPw[field.flag] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={pwLoading}
            className="w-full py-2.5 rounded-xl bg-cyan-500 text-white font-semibold text-sm hover:bg-cyan-600 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {pwLoading ? <><Loader2 size={15} className="animate-spin" /> Updating…</> : 'Update Password'}
          </button>
        </form>
        <div className="flex items-center gap-3 my-4">
          <span className="flex-1 h-px bg-slate-200" />
          <span className="text-[11px] font-semibold text-slate-400 uppercase">or</span>
          <span className="flex-1 h-px bg-slate-200" />
        </div>
        <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Forgot current password?</p>
        <p className="text-xs text-slate-500">Reset link goes to <span className="font-semibold text-slate-700">{email || 'your account email'}</span>.</p>
        <button
          type="button"
          onClick={handleSendResetEmail}
          disabled={resetSending || resetSent}
          className="mt-2 w-full py-2.5 rounded-xl border border-cyan-500/40 text-cyan-700 font-semibold text-sm hover:bg-cyan-50 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {resetSending ? 'Sending…' : resetSent ? 'Reset Link Sent — Check Inbox' : 'Send Reset Link'}
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">
          Done? <Link to="/doctor/profile" className="font-semibold text-cyan-600 hover:text-cyan-700">Back to profile</Link>
        </p>
      </div>
    </div>
  );
}
