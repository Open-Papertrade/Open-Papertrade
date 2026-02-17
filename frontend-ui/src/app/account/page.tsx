"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  User,
  Mail,
  Shield,
  Bell,
  Palette,
  TrendingUp,
  LogOut,
  ChevronRight,
  Check,
  Camera,
  Edit2,
  DollarSign,
  PieChart,
  History,
  Award,
  RotateCcw,
  AlertTriangle,
  Loader2,
  X,
  Sun,
  Moon,
  Monitor,
  Lock,
  Smartphone,
  Key,
  Coins,
  Globe,
  Copy,
  Plus,
  Trash2,
  Rocket,
  Flame,
  Briefcase,
  Gem,
  Sunrise,
  Layers,
  Activity,
  Crown,
  Trophy,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import { usePortfolio } from "@/context/PortfolioContext";
import { useAuth } from "@/context/AuthContext";
import { APP_CONFIG } from "@/config/app";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  userAPI,
  API_HOST,
  type UserProfile,
  type UserSettings,
  type UserStats,
  type Achievement,
  type APIKeyInfo,
  type RankInfo,
} from "@/lib/api";

// Modal Component
function Modal({ isOpen, onClose, title, children }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-primary)]">
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-[var(--bg-muted)] transition-colors"
          >
            <X size={20} className="text-[var(--text-muted)]" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// Available currencies for selection
const AVAILABLE_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
];

// Available markets for selection
const AVAILABLE_MARKETS = [
  { code: 'US', name: 'United States', flag: '🇺🇸', exchanges: ['NASDAQ', 'NYSE'], description: 'US stocks (AAPL, GOOGL, MSFT...)' },
  { code: 'IN', name: 'India', flag: '🇮🇳', exchanges: ['NSE', 'BSE'], description: 'Indian stocks (RELIANCE, TCS, INFY...)' },
];

export default function AccountPage() {
  const { refreshPrices, refreshUserData: refreshPortfolio, currency, currencySymbol, setCurrency, market, setMarket, totalPortfolioValue, totalReturns, returnsPercent, buyingPower, applyTheme, updateTradingSettings, updateNotificationSettings } = usePortfolio();
  const { logout } = useAuth();
  const router = useRouter();

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // User data from API
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementStats, setAchievementStats] = useState({ unlockedCount: 0, totalCount: 0 });

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Modal states
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Security modal state
  const [securityView, setSecurityView] = useState<'overview' | 'password' | '2fa-setup' | '2fa-disable' | 'api-keys' | 'api-key-created'>('overview');
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disablePassword, setDisablePassword] = useState("");
  const [apiKeys, setApiKeys] = useState<APIKeyInfo[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState("");
  const [keyCopied, setKeyCopied] = useState(false);

  // Fetch all user data
  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profileRes, statsRes, achievementsRes] = await Promise.all([
        userAPI.getProfile(),
        userAPI.getStats(),
        userAPI.getAchievements(),
      ]);

      setProfile(profileRes.profile);
      setSettings(profileRes.settings);
      setEditName(profileRes.profile.name);
      setEditUsername(profileRes.profile.username || '');
      setEditEmail(profileRes.profile.email);
      setStats(statsRes);
      setAchievements(achievementsRes.achievements);
      setAchievementStats({
        unlockedCount: achievementsRes.unlockedCount,
        totalCount: achievementsRes.totalCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load account data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Show success message
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Save profile changes
  const handleSaveProfile = async () => {
    if (!profile) return;

    // Validate username
    if (editUsername && !/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(editUsername)) {
      setUsernameError("3-30 chars, lowercase letters, numbers, and hyphens only");
      return;
    }
    setUsernameError("");

    setIsSaving(true);
    try {
      const updated = await userAPI.updateProfile({
        name: editName,
        email: editEmail,
        ...(editUsername ? { username: editUsername } : {}),
      } as any);
      setProfile({ ...profile, ...updated });
      setIsEditing(false);
      showSuccess("Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  // Upload avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Reset input so the same file can be re-selected
    e.target.value = "";

    setIsSaving(true);
    setError(null);
    try {
      const result = await userAPI.uploadAvatar(file);
      setProfile({ ...profile, avatarUrl: result.avatarUrl });
      await refreshPortfolio();
      showSuccess("Profile picture updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setIsSaving(false);
    }
  };

  // Remove avatar
  const handleAvatarRemove = async () => {
    if (!profile || !profile.avatarUrl) return;

    setIsSaving(true);
    setError(null);
    try {
      await userAPI.removeAvatar();
      setProfile({ ...profile, avatarUrl: null });
      await refreshPortfolio();
      showSuccess("Profile picture removed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove image");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationToggle = async (key: keyof UserSettings["notifications"]) => {
    if (!settings) return;
    const newValue = !settings.notifications[key];
    const newSettings = {
      ...settings,
      notifications: { ...settings.notifications, [key]: newValue },
    };

    // Sync tradeConfirmations with confirmTrades preference
    if (key === 'tradeConfirmations') {
      newSettings.preferences = { ...newSettings.preferences, confirmTrades: newValue };
    }

    setSettings(newSettings);
    updateNotificationSettings({ [key]: newValue });

    // Also sync confirmTrades preference when tradeConfirmations changes
    if (key === 'tradeConfirmations') {
      updateTradingSettings({ confirmTrades: newValue });
    }

    try {
      const updates: Record<string, unknown> = { notifications: { [key]: newValue } };
      if (key === 'tradeConfirmations') {
        updates.preferences = { confirmTrades: newValue };
      }
      await userAPI.updateSettings(updates as any);
    } catch (err) {
      setSettings(settings);
      updateNotificationSettings({ [key]: settings.notifications[key] });
      if (key === 'tradeConfirmations') {
        updateTradingSettings({ confirmTrades: settings.preferences.confirmTrades });
      }
      setError(err instanceof Error ? err.message : "Failed to update settings");
    }
  };

  // Update preference settings
  const handlePreferenceToggle = async (key: keyof UserSettings["preferences"]) => {
    if (!settings) return;
    const newValue = !settings.preferences[key];
    const newSettings = {
      ...settings,
      preferences: { ...settings.preferences, [key]: newValue },
    };

    // Sync confirmTrades with tradeConfirmations notification
    if (key === 'confirmTrades') {
      newSettings.notifications = { ...newSettings.notifications, tradeConfirmations: newValue as boolean };
    }

    setSettings(newSettings);
    updateTradingSettings({ [key]: newValue });

    if (key === 'confirmTrades') {
      updateNotificationSettings({ tradeConfirmations: newValue as boolean });
    }

    try {
      const updates: Record<string, unknown> = { preferences: { [key]: newValue } };
      if (key === 'confirmTrades') {
        updates.notifications = { tradeConfirmations: newValue };
      }
      await userAPI.updateSettings(updates as any);
    } catch (err) {
      setSettings(settings);
      updateTradingSettings({ [key]: settings.preferences[key] });
      if (key === 'confirmTrades') {
        updateNotificationSettings({ tradeConfirmations: settings.notifications.tradeConfirmations });
      }
      setError(err instanceof Error ? err.message : "Failed to update settings");
    }
  };

  // Update default order type
  const handleOrderTypeChange = async (type: string) => {
    if (!settings) return;
    const newSettings = {
      ...settings,
      preferences: { ...settings.preferences, defaultOrderType: type },
    };
    setSettings(newSettings);
    updateTradingSettings({ defaultOrderType: type });

    try {
      await userAPI.updateSettings({ preferences: { defaultOrderType: type } } as any);
    } catch (err) {
      setSettings(settings);
      updateTradingSettings({ defaultOrderType: settings.preferences.defaultOrderType });
      setError(err instanceof Error ? err.message : "Failed to update settings");
    }
  };

  // Reset account
  const handleResetAccount = async () => {
    setShowResetModal(false);
    setIsSaving(true);
    try {
      await userAPI.resetAccount();
      await fetchUserData();
      refreshPrices();
      refreshPortfolio();
      showSuccess("Account reset successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset account");
    } finally {
      setIsSaving(false);
    }
  };

  // Update theme
  const handleThemeChange = async (theme: 'DARK' | 'LIGHT' | 'AUTO') => {
    if (!settings) return;

    const newSettings = {
      ...settings,
      display: { ...settings.display, theme },
    };
    setSettings(newSettings);
    applyTheme(theme);

    try {
      await userAPI.updateTheme(theme);
      showSuccess(`Theme changed to ${theme.toLowerCase()}`);
    } catch (err) {
      setSettings(settings);
      setError(err instanceof Error ? err.message : "Failed to update theme");
    }
  };

  // Update currency
  const handleCurrencyChange = async (newCurrency: string) => {
    if (!settings) return;

    const oldCurrency = settings.display.currency;
    const newSettings = {
      ...settings,
      display: { ...settings.display, currency: newCurrency },
    };
    setSettings(newSettings);

    try {
      await setCurrency(newCurrency);
      const currencyInfo = AVAILABLE_CURRENCIES.find(c => c.code === newCurrency);
      showSuccess(`Currency changed to ${currencyInfo?.name || newCurrency}`);
    } catch (err) {
      setSettings({ ...settings, display: { ...settings.display, currency: oldCurrency } });
      setError(err instanceof Error ? err.message : "Failed to update currency");
    }
  };

  // Update market
  const handleMarketChange = async (newMarket: string) => {
    if (!settings) return;

    const oldMarket = settings.display.market;
    const newSettings = {
      ...settings,
      display: { ...settings.display, market: newMarket },
    };
    setSettings(newSettings);

    try {
      await setMarket(newMarket);
      const marketInfo = AVAILABLE_MARKETS.find(m => m.code === newMarket);
      showSuccess(`Market changed to ${marketInfo?.name || newMarket}`);
    } catch (err) {
      setSettings({ ...settings, display: { ...settings.display, market: oldMarket } });
      setError(err instanceof Error ? err.message : "Failed to update market");
    }
  };

  // Sign out
  const handleSignOut = async () => {
    await logout();
    router.push("/login");
  };

  // Security handlers
  const resetSecurityState = () => {
    setSecurityView('overview');
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setQrCode("");
    setTotpSecret("");
    setTotpCode("");
    setBackupCodes([]);
    setDisablePassword("");
    setNewKeyName("");
    setCreatedKey("");
    setKeyCopied(false);
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const result = await userAPI.changePassword(currentPassword, newPassword);
      if (profile) {
        setProfile({ ...profile, passwordChangedAt: result.passwordChangedAt });
      }
      setSecurityView('overview');
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSuccess("Password changed successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStart2FASetup = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await userAPI.setup2FA();
      setQrCode(result.qrCode);
      setTotpSecret(result.secret);
      setSecurityView('2fa-setup');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start 2FA setup");
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerify2FA = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await userAPI.verify2FA(totpCode);
      setBackupCodes(result.backupCodes);
      if (profile) {
        setProfile({ ...profile, is2faEnabled: true });
      }
      setTotpCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify 2FA code");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await userAPI.disable2FA(disablePassword);
      if (profile) {
        setProfile({ ...profile, is2faEnabled: false });
      }
      setSecurityView('overview');
      setDisablePassword("");
      showSuccess("Two-factor authentication disabled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable 2FA");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadAPIKeys = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const result = await userAPI.getAPIKeys();
      setApiKeys(result.keys);
      setSecurityView('api-keys');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAPIKey = async () => {
    if (!newKeyName.trim()) {
      setError("API key name is required");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const result = await userAPI.createAPIKey(newKeyName.trim());
      setCreatedKey(result.fullKey || "");
      setNewKeyName("");
      setSecurityView('api-key-created');
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeAPIKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to revoke this API key?")) return;
    setError(null);
    try {
      await userAPI.revokeAPIKey(keyId);
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
      showSuccess("API key revoked");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key");
    }
  };

  const handleCopyKey = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  // Format account age
  const formatAccountAge = (dateString: string) => {
    const created = new Date(dateString);
    const now = new Date();
    const days = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 1) return "Today";
    if (days === 1) return "1 day";
    if (days < 30) return `${days} days`;
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month" : `${months} months`;
  };

  // Format member since date
  const formatMemberSince = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex h-full bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
        </main>
      </div>
    );
  }

  if (!profile || !settings || !stats) {
    return (
      <div className="flex h-full bg-[var(--bg-primary)]">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[var(--text-muted)] mb-4">{error || "Failed to load account data"}</p>
            <button
              onClick={fetchUserData}
              className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[var(--bg-primary)]">
      <Sidebar />
      <main className="flex-1 flex flex-col gap-6 py-8 px-10 overflow-auto">
        <PageHeader
          title="Account"
          subtitle="Manage your profile and preferences"
        />

        {/* Success Message */}
        {successMessage && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[#22C55E20] text-[var(--accent-green)]">
            <Check size={18} />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-sm text-[var(--accent-red)]">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        <div className="flex gap-6">
          {/* Left Column - Profile & Stats */}
          <div className="flex-1 flex flex-col gap-5">
            {/* Profile Card */}
            <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)]">
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Profile
                </h2>
                <button
                  onClick={() => {
                    setIsEditing(!isEditing);
                    if (!isEditing) {
                      setEditName(profile.name);
                      setEditUsername(profile.username || '');
                      setEditEmail(profile.email);
                      setUsernameError("");
                    }
                  }}
                  className="flex items-center gap-2 text-[11px] font-medium text-[var(--accent-primary)] hover:underline"
                >
                  <Edit2 size={12} />
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              </div>

              <div className="flex items-start gap-6">
                {/* Avatar */}
                <div className="relative group/avatar">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl.startsWith('http') ? profile.avatarUrl : `${API_HOST}${profile.avatarUrl}`}
                      alt={profile.name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {profile.initials}
                      </span>
                    </div>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <button
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isSaving}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center justify-center hover:bg-[var(--bg-muted)] transition-colors disabled:opacity-50"
                  >
                    <Camera size={14} className="text-[var(--text-muted)]" />
                  </button>
                  {profile.avatarUrl && (
                    <button
                      onClick={handleAvatarRemove}
                      disabled={isSaving}
                      className="absolute top-0 right-0 w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border-primary)] flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 hover:bg-[var(--accent-red)]/10 hover:border-[var(--accent-red)]/50 transition-all disabled:opacity-50"
                      title="Remove profile picture"
                    >
                      <X size={12} className="text-[var(--accent-red)]" />
                    </button>
                  )}
                </div>

                {/* Profile Info */}
                <div className="flex-1">
                  {isEditing ? (
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1 block">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-muted)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1 block">
                          Username
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--text-dim)]">@</span>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => {
                              setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                              setUsernameError("");
                            }}
                            maxLength={30}
                            className="w-full pl-7 pr-3 py-2 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-muted)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                          />
                        </div>
                        {usernameError && (
                          <span className="text-[10px] text-[var(--accent-red)] mt-1 block">{usernameError}</span>
                        )}
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-[var(--text-muted)] mb-1 block">
                          Email
                        </label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-muted)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                        />
                      </div>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="self-start px-4 py-2 rounded-lg bg-[var(--accent-primary)] text-sm font-medium text-white hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-50"
                      >
                        {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                        {profile.name}
                      </h3>
                      {profile.username && (
                        <p className="text-sm text-[var(--text-muted)] mt-0.5">
                          @{profile.username}
                        </p>
                      )}
                      <p className="text-sm text-[var(--text-muted)] mt-1">
                        {profile.email}
                      </p>
                      <div className="flex items-center gap-2 mt-3">
                        <span className="px-2 py-1 rounded-md bg-purple-500/10 text-[10px] font-semibold text-purple-400">
                          Lv.{profile.level} {profile.rank}
                        </span>
                        <span className="px-2 py-1 rounded-md bg-[var(--bg-muted)] text-[10px] font-medium text-[var(--text-muted)]">
                          Member since {formatMemberSince(profile.createdAt)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Rank Progress */}
            {stats?.rank && (
              <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)]">
                <div className="flex items-center gap-3 mb-5">
                  <Trophy size={18} className="text-purple-400" />
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">Rank Progress</h2>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-1">
                    <span className="font-mono text-3xl font-bold text-purple-400">
                      {stats.rank.level}
                    </span>
                    <span className="text-xs font-semibold text-purple-400">
                      {stats.rank.rank}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[var(--text-muted)]">
                        {stats.rank.xp.toLocaleString()} XP
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        {stats.rank.nextRank
                          ? `${stats.rank.nextRank.xpRequired.toLocaleString()} XP for ${stats.rank.nextRank.rank}`
                          : 'Max Rank'}
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[var(--bg-card-inner)] border border-[var(--border-primary)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-[var(--accent-primary)] transition-all duration-500"
                        style={{
                          width: stats.rank.nextRank
                            ? `${Math.min(100, ((stats.rank.xp) / stats.rank.nextRank.xpRequired) * 100)}%`
                            : '100%',
                        }}
                      />
                    </div>
                    {stats.rank.nextRank && (
                      <span className="text-[10px] text-[var(--text-dim)] mt-1 block">
                        {stats.rank.nextRank.xpRemaining.toLocaleString()} XP to next rank
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Account Stats */}
            <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)]">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-5">
                Account Overview
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center">
                      <PieChart size={18} className="text-[var(--accent-primary)]" />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">Portfolio Value</span>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(totalPortfolioValue)}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[var(--accent-green)]/10 flex items-center justify-center">
                      <TrendingUp size={18} className="text-[var(--accent-green)]" />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">Total Returns</span>
                  </div>
                  <span className={`font-mono text-2xl font-bold ${totalReturns >= 0 ? "text-[var(--accent-green)]" : "text-[var(--accent-red)]"}`}>
                    {totalReturns >= 0 ? "+" : ""}{formatCurrency(totalReturns)}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] ml-2">
                    ({formatPercent(returnsPercent)})
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <DollarSign size={18} className="text-blue-500" />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">Buying Power</span>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                    {formatCurrency(buyingPower, false, { convertFromUSD: false })}
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                      <History size={18} className="text-purple-500" />
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">Total Trades</span>
                  </div>
                  <span className="font-mono text-2xl font-bold text-[var(--text-primary)]">
                    {stats.totalTrades}
                  </span>
                </div>
              </div>

              {/* Achievement Stats */}
              <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-[var(--border-primary)]">
                <div className="text-center">
                  <span className="text-xs text-[var(--text-muted)]">Holdings</span>
                  <div className="font-mono text-lg font-semibold text-[var(--text-primary)] mt-1">
                    {stats.holdingsCount}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-xs text-[var(--text-muted)]">Account Age</span>
                  <div className="font-mono text-lg font-semibold text-[var(--text-primary)] mt-1">
                    {formatAccountAge(stats.memberSince)}
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-xs text-[var(--text-muted)]">Win Rate</span>
                  <div className="font-mono text-lg font-semibold text-[var(--accent-green)] mt-1">
                    {stats.winRate}%
                  </div>
                </div>
                <div className="text-center">
                  <span className="text-xs text-[var(--text-muted)]">XP</span>
                  <div className="font-mono text-lg font-semibold text-purple-400 mt-1">
                    {stats.rank?.xp?.toLocaleString() ?? 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)]">
              {/* Header */}
              <div className="flex flex-col items-center gap-3 mb-8">
                <span className="font-mono text-[11px] font-semibold tracking-[3px] text-[var(--accent-primary)]">
                  [ACHIEVEMENTS]
                </span>
                <h2 className="text-xl font-bold tracking-[2px] text-[var(--text-primary)] uppercase">
                  Trader Milestones
                </h2>
                <div className="w-16 h-[3px] rounded-full bg-[var(--accent-primary)]" />
                <span className="text-[11px] font-mono text-[var(--text-dim)]">
                  {achievementStats.unlockedCount}/{achievementStats.totalCount} unlocked
                </span>
              </div>

              {/* Badge Grid */}
              <div className="grid grid-cols-5 gap-4">
                {achievements.slice(0, 10).map((achievement, idx) => {
                  const badgeConfig: Record<string, { icon: React.ReactNode; from: string; to: string; accent: string }> = {
                    first_trade:   { icon: <Rocket size={22} />,     from: '#FF5C00', to: '#FF8C00', accent: '#FF5C00' },
                    trader_10:     { icon: <Flame size={22} />,      from: '#22C55E', to: '#4ADE80', accent: '#22C55E' },
                    trader_50:     { icon: <Briefcase size={22} />,  from: '#3B82F6', to: '#60A5FA', accent: '#3B82F6' },
                    trader_100:    { icon: <Shield size={22} />,     from: '#A855F7', to: '#C084FC', accent: '#A855F7' },
                    profit_1000:   { icon: <Gem size={22} />,        from: '#06B6D4', to: '#22D3EE', accent: '#06B6D4' },
                    profit_10000:  { icon: <Sunrise size={22} />,    from: '#F59E0B', to: '#FBBF24', accent: '#F59E0B' },
                    diversified_5: { icon: <Layers size={22} />,     from: '#EC4899', to: '#F472B6', accent: '#EC4899' },
                    diversified_10:{ icon: <TrendingUp size={22} />, from: '#10B981', to: '#34D399', accent: '#10B981' },
                    watchlist_10:  { icon: <Activity size={22} />,   from: '#6366F1', to: '#818CF8', accent: '#6366F1' },
                    early_adopter: { icon: <Crown size={22} />,      from: '#FF5C00', to: '#FFD700', accent: '#FFD700' },
                  };

                  const fallbackColors = [
                    { from: '#FF5C00', to: '#FF8C00', accent: '#FF5C00' },
                    { from: '#22C55E', to: '#4ADE80', accent: '#22C55E' },
                    { from: '#3B82F6', to: '#60A5FA', accent: '#3B82F6' },
                    { from: '#A855F7', to: '#C084FC', accent: '#A855F7' },
                    { from: '#06B6D4', to: '#22D3EE', accent: '#06B6D4' },
                  ];

                  const config = badgeConfig[achievement.id];
                  const fb = fallbackColors[idx % fallbackColors.length];
                  const from = config?.from ?? fb.from;
                  const to = config?.to ?? fb.to;
                  const accent = config?.accent ?? fb.accent;
                  const icon = config?.icon ?? <Award size={22} />;
                  const hexClip = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';
                  const num = String(idx + 1).padStart(2, '0');

                  return (
                    <div
                      key={achievement.id}
                      title={achievement.description}
                      className={`flex flex-col items-center gap-4 p-5 rounded-lg border transition-all cursor-help ${
                        achievement.unlocked
                          ? 'bg-[#111115] border-[#2A2A2E]'
                          : 'bg-[#111115] border-[#1F1F23] opacity-40 grayscale'
                      }`}
                    >
                      {/* Hexagonal badge */}
                      <div className="relative w-[80px] h-[80px]">
                        <div
                          className="absolute inset-0"
                          style={{
                            clipPath: hexClip,
                            background: `linear-gradient(180deg, ${from}, ${to})`,
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div
                            className="w-[45px] h-[45px] rounded-full flex items-center justify-center"
                            style={{ backgroundColor: '#0D0D0F' }}
                          >
                            <div style={{ color: accent }}>{icon}</div>
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex flex-col items-center gap-1.5 text-center">
                        <span
                          className="font-mono text-[9px] font-semibold tracking-[2px]"
                          style={{ color: accent }}
                        >
                          [{num}]
                        </span>
                        <span className="text-[11px] font-bold tracking-[1px] text-[var(--text-primary)] uppercase leading-tight">
                          {achievement.name}
                        </span>
                        <span className="font-mono text-[10px] text-[#6B6B6B] leading-snug max-w-[140px]">
                          {achievement.description}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column - Settings */}
          <div className="w-[380px] flex flex-col gap-5">
            {/* Notifications */}
            <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)]">
              <div className="flex items-center gap-3 mb-5">
                <Bell size={18} className="text-[var(--text-muted)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Notifications
                </h2>
              </div>

              <div className="flex flex-col gap-4">
                {[
                  { key: "priceAlerts" as const, label: "Price Alerts", desc: "Get notified when prices hit your targets" },
                  { key: "tradeConfirmations" as const, label: "Trade Confirmations", desc: "Confirm before executing trades" },
                  { key: "weeklyReport" as const, label: "Weekly Report", desc: "Receive weekly performance summary" },
                  { key: "marketNews" as const, label: "Market News", desc: "Breaking news and market updates" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
                      <p className="text-[11px] text-[var(--text-muted)]">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => handleNotificationToggle(item.key)}
                      className={`w-11 h-6 rounded-full relative transition-colors ${
                        settings.notifications[item.key]
                          ? "bg-[var(--accent-primary)]"
                          : "bg-[var(--border-muted)]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full absolute top-0.5 transition-all ${
                          settings.notifications[item.key]
                            ? "left-[22px] bg-white"
                            : "left-0.5 bg-[var(--text-muted)]"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Trading Preferences */}
            <div className="bg-[var(--bg-card)] rounded-xl p-6 border border-[var(--border-primary)]">
              <div className="flex items-center gap-3 mb-5">
                <TrendingUp size={18} className="text-[var(--text-muted)]" />
                <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                  Trading Preferences
                </h2>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-xs font-medium text-[var(--text-muted)] mb-2 block">
                    Default Order Type
                  </span>
                  <div className="flex gap-2">
                    <div className="relative flex-1 group/market">
                      <button
                        onClick={() => handleOrderTypeChange("MARKET")}
                        className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
                          settings.preferences.defaultOrderType === "MARKET"
                            ? "bg-[var(--accent-primary)] text-white"
                            : "bg-[var(--bg-card-inner)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
                        }`}
                      >
                        MARKET
                      </button>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-xl text-xs text-[var(--text-secondary)] opacity-0 invisible group-hover/market:opacity-100 group-hover/market:visible pointer-events-none transition-all duration-150 z-50">
                        Executes immediately at the current market price. Guaranteed to fill.
                      </div>
                    </div>
                    <div className="relative flex-1 group/limit">
                      <button
                        onClick={() => handleOrderTypeChange("LIMIT")}
                        className={`w-full py-2 rounded-lg text-xs font-medium transition-colors ${
                          settings.preferences.defaultOrderType === "LIMIT"
                            ? "bg-[var(--accent-primary)] text-white"
                            : "bg-[var(--bg-card-inner)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)]"
                        }`}
                      >
                        LIMIT
                      </button>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-56 px-3 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-xl text-xs text-[var(--text-secondary)] opacity-0 invisible group-hover/limit:opacity-100 group-hover/limit:visible pointer-events-none transition-all duration-150 z-50">
                        Executes only when the price reaches your specified limit. May not fill if the price doesn&apos;t reach your target.
                      </div>
                    </div>
                  </div>
                </div>

                {[
                  { key: "confirmTrades" as const, label: "Confirm before trading" },
                  { key: "showProfitLoss" as const, label: "Show profit/loss on holdings" },
                  { key: "compactMode" as const, label: "Compact view mode" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
                    <button
                      onClick={() => handlePreferenceToggle(item.key)}
                      className={`w-11 h-6 rounded-full relative transition-colors ${
                        settings.preferences[item.key]
                          ? "bg-[var(--accent-primary)]"
                          : "bg-[var(--border-muted)]"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full absolute top-0.5 transition-all ${
                          settings.preferences[item.key]
                            ? "left-[22px] bg-white"
                            : "left-0.5 bg-[var(--text-muted)]"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
              <button
                onClick={() => setShowSecurityModal(true)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-muted)] transition-colors border-b border-[var(--border-primary)]"
              >
                <div className="flex items-center gap-3">
                  <Shield size={18} className="text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-primary)]">Security Settings</span>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </button>

              <button
                onClick={() => setShowAppearanceModal(true)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-muted)] transition-colors border-b border-[var(--border-primary)]"
              >
                <div className="flex items-center gap-3">
                  <Palette size={18} className="text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-primary)]">Appearance</span>
                </div>
                <ChevronRight size={16} className="text-[var(--text-muted)]" />
              </button>

              </div>

            {/* Danger Zone */}
            <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
              <div className="px-5 pt-4 pb-3">
                <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[var(--text-dim)]">Danger Zone</span>
              </div>

              <button
                onClick={() => setShowResetModal(true)}
                disabled={isSaving}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-yellow-500/5 transition-colors border-t border-[var(--border-primary)] group disabled:opacity-50"
              >
                <div className="w-9 h-9 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                  <RotateCcw size={16} className="text-yellow-500" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium text-[var(--text-primary)] block">
                    {isSaving ? "Resetting..." : "Reset Account"}
                  </span>
                  <span className="text-[11px] text-[var(--text-dim)]">
                    Clear all trades, holdings, and alerts
                  </span>
                </div>
                <ChevronRight size={16} className="text-[var(--text-dim)] group-hover:text-yellow-500 transition-colors" />
              </button>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--accent-red)]/5 transition-colors border-t border-[var(--border-primary)] group"
              >
                <div className="w-9 h-9 rounded-lg bg-[var(--accent-red)]/10 flex items-center justify-center group-hover:bg-[var(--accent-red)]/20 transition-colors">
                  <LogOut size={16} className="text-[var(--accent-red)]" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium text-[var(--text-primary)] block">Sign Out</span>
                  <span className="text-[11px] text-[var(--text-dim)]">
                    End your current session
                  </span>
                </div>
                <ChevronRight size={16} className="text-[var(--text-dim)] group-hover:text-[var(--accent-red)] transition-colors" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Security Settings Modal */}
      <Modal
        isOpen={showSecurityModal}
        onClose={() => {
          setShowSecurityModal(false);
          resetSecurityState();
        }}
        title="Security Settings"
      >
        <div className="flex flex-col gap-4">
          {securityView === 'overview' && (
            <>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Lock size={20} className="text-blue-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Password</span>
                  <p className="text-xs text-[var(--text-muted)]">
                    {profile?.passwordChangedAt
                      ? `Last changed ${Math.floor((Date.now() - new Date(profile.passwordChangedAt).getTime()) / (1000 * 60 * 60 * 24))} days ago`
                      : "Never changed"}
                  </p>
                </div>
                <button
                  onClick={() => setSecurityView('password')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[var(--border-muted)] transition-colors"
                >
                  Change
                </button>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Smartphone size={20} className="text-purple-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Two-Factor Auth</span>
                  <p className="text-xs text-[var(--text-muted)]">
                    {profile?.is2faEnabled ? "Enabled" : "Not enabled"}
                  </p>
                </div>
                {profile?.is2faEnabled ? (
                  <button
                    onClick={() => setSecurityView('2fa-disable')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-red)]/10 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20 transition-colors"
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    onClick={handleStart2FASetup}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-50"
                  >
                    {isSaving ? "..." : "Enable"}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Key size={20} className="text-green-500" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">API Keys</span>
                  <p className="text-xs text-[var(--text-muted)]">Manage API access</p>
                </div>
                <button
                  onClick={handleLoadAPIKeys}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-muted)] text-[var(--text-primary)] hover:bg-[var(--border-muted)] transition-colors disabled:opacity-50"
                >
                  Manage
                </button>
              </div>
            </>
          )}

          {securityView === 'password' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--text-muted)]">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-muted)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--text-muted)]">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-muted)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--text-muted)]">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-muted)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                className="w-full py-2.5 rounded-lg bg-[var(--accent-primary)] text-sm font-medium text-white hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-50"
              >
                {isSaving ? "Changing..." : "Change Password"}
              </button>
              <button
                onClick={() => { setSecurityView('overview'); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setError(null); }}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {securityView === '2fa-setup' && (
            <div className="flex flex-col gap-4">
              {backupCodes.length === 0 ? (
                <>
                  <p className="text-sm text-[var(--text-muted)]">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  {qrCode && (
                    <div className="flex justify-center p-4 bg-white rounded-lg">
                      <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                    </div>
                  )}
                  <div className="p-3 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                    <span className="text-[10px] text-[var(--text-muted)] block mb-1">Manual entry key</span>
                    <code className="text-xs font-mono text-[var(--text-primary)] break-all">{totpSecret}</code>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-[var(--text-muted)]">Enter 6-digit code</label>
                    <input
                      type="text"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value)}
                      maxLength={6}
                      placeholder="000000"
                      className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-muted)] text-center text-lg font-mono tracking-[4px] text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                  <button
                    onClick={handleVerify2FA}
                    disabled={isSaving || totpCode.length !== 6}
                    className="w-full py-2.5 rounded-lg bg-[var(--accent-primary)] text-sm font-medium text-white hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-50"
                  >
                    {isSaving ? "Verifying..." : "Verify & Enable"}
                  </button>
                  <button
                    onClick={() => { setSecurityView('overview'); setQrCode(""); setTotpSecret(""); setTotpCode(""); setError(null); }}
                    className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-[var(--accent-green)]">
                    <Check size={18} />
                    <span className="text-sm font-medium">Two-factor authentication enabled</span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    Save these backup codes in a safe place. Each code can only be used once.
                  </p>
                  <div className="grid grid-cols-2 gap-2 p-4 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                    {backupCodes.map((code, i) => (
                      <code key={i} className="text-xs font-mono text-[var(--text-primary)] text-center py-1">{code}</code>
                    ))}
                  </div>
                  <button
                    onClick={() => handleCopyKey(backupCodes.join('\n'))}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-[var(--bg-muted)] text-sm text-[var(--text-primary)] hover:bg-[var(--border-muted)] transition-colors"
                  >
                    <Copy size={14} />
                    {keyCopied ? "Copied!" : "Copy All"}
                  </button>
                  <button
                    onClick={() => { setSecurityView('overview'); setBackupCodes([]); setQrCode(""); setTotpSecret(""); }}
                    className="w-full py-2.5 rounded-lg bg-[var(--accent-primary)] text-sm font-medium text-white hover:bg-[var(--accent-secondary)] transition-colors"
                  >
                    Done
                  </button>
                </>
              )}
            </div>
          )}

          {securityView === '2fa-disable' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--text-muted)]">
                Enter your password to disable two-factor authentication.
              </p>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-[var(--text-muted)]">Password</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-muted)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <button
                onClick={handleDisable2FA}
                disabled={isSaving || !disablePassword}
                className="w-full py-2.5 rounded-lg bg-[var(--accent-red)] text-sm font-medium text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? "Disabling..." : "Disable 2FA"}
              </button>
              <button
                onClick={() => { setSecurityView('overview'); setDisablePassword(""); setError(null); }}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {securityView === 'api-keys' && (
            <div className="flex flex-col gap-4">
              {apiKeys.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                      <div>
                        <span className="text-sm font-medium text-[var(--text-primary)]">{key.name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[10px] font-mono text-[var(--text-muted)]">{key.keyPrefix}...</code>
                          <span className="text-[10px] text-[var(--text-dim)]">
                            Created {new Date(key.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeAPIKey(key.id)}
                        className="p-1.5 rounded-lg hover:bg-[var(--accent-red)]/10 text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">No API keys yet</p>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. Trading Bot)"
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-muted)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-primary)]"
                />
                <button
                  onClick={handleCreateAPIKey}
                  disabled={isSaving || !newKeyName.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent-primary)] text-sm font-medium text-white hover:bg-[var(--accent-secondary)] transition-colors disabled:opacity-50"
                >
                  <Plus size={14} />
                  Create
                </button>
              </div>

              <button
                onClick={() => { setSecurityView('overview'); setError(null); }}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                Back
              </button>
            </div>
          )}

          {securityView === 'api-key-created' && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-[var(--accent-green)]">
                <Check size={18} />
                <span className="text-sm font-medium">API key created</span>
              </div>
              <p className="text-sm text-yellow-500">
                This key will not be shown again. Copy it now.
              </p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--bg-card-inner)] border border-[var(--border-primary)]">
                <code className="flex-1 text-xs font-mono text-[var(--text-primary)] break-all">{createdKey}</code>
                <button
                  onClick={() => handleCopyKey(createdKey)}
                  className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)] transition-colors flex-shrink-0"
                >
                  {keyCopied ? <Check size={14} className="text-[var(--accent-green)]" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
                </button>
              </div>
              <button
                onClick={async () => {
                  const result = await userAPI.getAPIKeys();
                  setApiKeys(result.keys);
                  setCreatedKey("");
                  setKeyCopied(false);
                  setSecurityView('api-keys');
                }}
                className="w-full py-2.5 rounded-lg bg-[var(--accent-primary)] text-sm font-medium text-white hover:bg-[var(--accent-secondary)] transition-colors"
              >
                Done
              </button>
            </div>
          )}

          {/* Error display within modal */}
          {error && securityView !== 'overview' && (
            <div className="px-3 py-2 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-xs text-[var(--accent-red)]">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
            </div>
          )}
        </div>
      </Modal>

      {/* Appearance Modal */}
      <Modal
        isOpen={showAppearanceModal}
        onClose={() => setShowAppearanceModal(false)}
        title="Settings"
      >
        <div className="flex flex-col gap-4">
          {/* Market Selection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-[var(--text-muted)]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">Market</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_MARKETS.map((mkt) => (
                <button
                  key={mkt.code}
                  onClick={() => handleMarketChange(mkt.code)}
                  className={`flex flex-col items-start gap-1 p-4 rounded-lg border transition-all text-left ${
                    (settings.display.market || market) === mkt.code
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                      : "border-[var(--border-primary)] hover:border-[var(--accent-primary)] bg-[var(--bg-card-inner)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{mkt.flag}</span>
                    <span className={`text-sm font-medium ${
                      (settings.display.market || market) === mkt.code
                        ? "text-[var(--accent-primary)]"
                        : "text-[var(--text-primary)]"
                    }`}>
                      {mkt.name}
                    </span>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    {mkt.exchanges.join(' / ')}
                  </span>
                  <span className="text-[10px] text-[var(--text-dim)]">
                    {mkt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-[var(--border-primary)] pt-4">
            <span className="text-xs font-medium text-[var(--text-muted)]">Theme</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'DARK' as const, label: 'Dark', icon: Moon },
              { value: 'LIGHT' as const, label: 'Light', icon: Sun },
              { value: 'AUTO' as const, label: 'System', icon: Monitor },
            ].map((theme) => (
              <button
                key={theme.value}
                onClick={() => handleThemeChange(theme.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                  settings.display.theme === theme.value
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                    : "border-[var(--border-primary)] hover:border-[var(--accent-primary)] bg-[var(--bg-card-inner)]"
                }`}
              >
                <theme.icon
                  size={24}
                  className={
                    settings.display.theme === theme.value
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--text-muted)]"
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    settings.display.theme === theme.value
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--text-primary)]"
                  }`}
                >
                  {theme.label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[var(--border-primary)]">
            <div className="flex items-center gap-2 mb-3">
              <Coins size={16} className="text-[var(--text-muted)]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">Currency</span>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1">
              {AVAILABLE_CURRENCIES.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => handleCurrencyChange(curr.code)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                    (settings.display.currency || currency) === curr.code
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)]/10"
                      : "border-[var(--border-primary)] hover:border-[var(--accent-primary)] bg-[var(--bg-card-inner)]"
                  }`}
                >
                  <span className={`text-lg font-mono ${
                    (settings.display.currency || currency) === curr.code
                      ? "text-[var(--accent-primary)]"
                      : "text-[var(--text-muted)]"
                  }`}>
                    {curr.symbol}
                  </span>
                  <div className="text-left">
                    <div className={`text-xs font-medium ${
                      (settings.display.currency || currency) === curr.code
                        ? "text-[var(--accent-primary)]"
                        : "text-[var(--text-primary)]"
                    }`}>
                      {curr.code}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)]">{curr.name}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-[var(--text-dim)] text-center mt-2">
            Preferences are saved automatically.
          </p>
        </div>
      </Modal>

      {/* Reset Account Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowResetModal(false)} />
          <div className="relative bg-[var(--bg-card)] rounded-xl border border-[var(--border-primary)] w-full max-w-md mx-4 shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Reset Account?</h3>
              <p className="text-sm text-[var(--text-muted)] mb-5">
                This action cannot be undone. The following will be permanently deleted:
              </p>
              <div className="bg-[var(--bg-primary)] rounded-lg p-4 mb-5 text-left space-y-2">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-yellow-500">&#8226;</span> All trade history will be erased
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-yellow-500">&#8226;</span> All holdings will be removed
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-yellow-500">&#8226;</span> Watchlist and price alerts will be cleared
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-yellow-500">&#8226;</span> All achievements and XP will be reset
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-yellow-500">&#8226;</span> Pending limit orders will be cancelled
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="text-yellow-500">&#8226;</span> Buying power will reset to initial balance
                </div>
              </div>
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-4 py-3 mb-5">
                <p className="text-xs text-yellow-500 font-medium">
                  You can only reset your account once every 30 days.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border-primary)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetAccount}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-yellow-500 text-black text-sm font-medium hover:bg-yellow-400 transition-colors"
                >
                  Reset Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
