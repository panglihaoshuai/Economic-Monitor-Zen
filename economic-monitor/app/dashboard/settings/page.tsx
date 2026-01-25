'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import useSWR from 'swr';
import { Check, Lock, Save, Loader2, TrendingUp, Globe } from 'lucide-react';
import { useLanguage } from '@/lib/language-context';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface UserConfig {
  id: string;
  email: string;
  name: string;
  deepseek_api_key: string | null;
  risk_tolerance?: 'conservative' | 'moderate' | 'aggressive';
  language?: 'en' | 'zh';
}

interface IndicatorConfig {
  series_id: string;
  enabled: boolean;
  z_threshold_warning: number;
  z_threshold_critical: number;
  analysis_mode: string;
  notify_frequency: string;
  info?: {
    id: string;
    title: string;
    frequency: string;
  };
}

export default function SettingsPage() {
  const { t, setLanguage: setLanguageContext } = useLanguage();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: userData, mutate: mutateUser } = useSWR<UserConfig>(
    '/api/user/config',
    fetcher
  );

  const { data: indicatorsData, mutate: mutateIndicators } = useSWR<{ indicators: IndicatorConfig[] }>(
    '/api/user/indicators',
    fetcher
  );

  const [apiKey, setApiKey] = useState('');
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [riskTolerance, setRiskTolerance] = useState<'conservative' | 'moderate' | 'aggressive'>('moderate');
  const [language, setLanguageState] = useState<'en' | 'zh'>('zh');

  // Initialize preferences from user data
  useEffect(() => {
    if (userData?.risk_tolerance) {
      setRiskTolerance(userData.risk_tolerance);
    }
    if (userData?.language) {
      setLanguageState(userData.language);
      setLanguageContext(userData.language);
    }
  }, [userData, setLanguageContext]);

  if (indicatorsData && indicators.length === 0) {
    setIndicators(indicatorsData.indicators);
  }

  const handleSaveUser = async () => {
    setSaving(true);
    try {
      await fetch('/api/user/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deepseek_api_key: apiKey || undefined,
          risk_tolerance: riskTolerance,
          language: language,
        }),
      });
      mutateUser();
      setLanguageContext(language);
      setApiKey('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIndicators = async () => {
    setSaving(true);
    try {
      await fetch('/api/user/indicators', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configs: indicators.map((i) => ({
            series_id: i.series_id,
            enabled: i.enabled,
            z_threshold_warning: i.z_threshold_warning,
            z_threshold_critical: i.z_threshold_critical,
            analysis_mode: i.analysis_mode,
            notify_frequency: i.notify_frequency,
          })),
        }),
      });
      mutateIndicators();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleIndicator = (seriesId: string) => {
    setIndicators((prev) =>
      prev.map((i) =>
        i.series_id === seriesId ? { ...i, enabled: !i.enabled } : i
      )
    );
  };

  const coreIndicators = indicators.filter((i) =>
    ['GDPC1', 'UNRATE', 'PCEPI', 'DGS10'].includes(i.series_id)
  );
  const otherIndicators = indicators.filter(
    (i) => !['GDPC1', 'UNRATE', 'PCEPI', 'DGS10'].includes(i.series_id)
  );

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto px-2 sm:px-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('settings.title')}</h1>
        <p className="text-slate-500 text-sm sm:text-base">{t('settings.profile')}</p>
      </div>

      {/* Profile Section */}
      <section className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">{t('settings.profile')}</h2>
        <div className="flex items-center gap-3 sm:gap-4">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={session.user.name || ''}
              className="w-12 h-12 sm:w-16 sm:h-16 rounded-full"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 text-lg sm:text-xl font-medium">
                {session?.user?.name?.charAt(0) || 'U'}
              </span>
            </div>
          )}
          <div>
            <div className="font-medium text-slate-900 text-sm sm:text-base">{session?.user?.name}</div>
            <div className="text-xs sm:text-sm text-slate-500 truncate max-w-[200px] sm:max-w-none">{session?.user?.email}</div>
          </div>
        </div>
      </section>

      {/* API Key Section */}
      <section className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">{t('settings.apiKeys')}</h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4">
          {t('settings.apiKeys')} API Key
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            placeholder="sk-..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSaveUser}
            disabled={!apiKey || saving}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common.save')}
          </button>
        </div>
        {saved && (
          <p className="text-green-600 text-xs sm:text-sm mt-2 flex items-center gap-1">
            <Check className="w-3 h-3 sm:w-4 sm:h-4" /> {t('settings.saveSuccess')}
          </p>
        )}
      </section>

      {/* Risk Tolerance Section */}
      <section className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">{t('settings.notifications')}</h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4">
          Set your investment risk tolerance to customize alert thresholds and recommendations.
        </p>

        {/* Mobile: single column; tablet+: 3 columns */}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3">
          <RiskToleranceOption
            type="conservative"
            title={t('risk.conservative')}
            description="Low risk tolerance"
            icon="🛡️"
            selected={riskTolerance === 'conservative'}
            onClick={() => setRiskTolerance('conservative')}
            details={[
              'Warning: Z-score 1.5',
              'Critical: Z-score 2.5',
              'Fewer alerts',
              'Capital preservation',
            ]}
          />
          <RiskToleranceOption
            type="moderate"
            title={t('risk.moderate')}
            description="Balanced"
            icon="⚖️"
            selected={riskTolerance === 'moderate'}
            onClick={() => setRiskTolerance('moderate')}
            details={[
              'Warning: Z-score 2.0',
              'Critical: Z-score 3.0',
              'Balanced alerts',
              'Growth focus',
            ]}
          />
          <RiskToleranceOption
            type="aggressive"
            title={t('risk.aggressive')}
            description="High risk"
            icon="🚀"
            selected={riskTolerance === 'aggressive'}
            onClick={() => setRiskTolerance('aggressive')}
            details={[
              'Warning: Z-score 2.5',
              'Critical: Z-score 3.5',
              'More alerts',
              'Max growth',
            ]}
          />
        </div>

        <button
          onClick={handleSaveUser}
          disabled={saving}
          className="mt-4 sm:mt-6 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('common.save')}
        </button>
      </section>

      {/* Language Section */}
      <section className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
          <h2 className="text-base sm:text-lg font-semibold text-slate-900">{t('settings.language')}</h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 mb-3 sm:mb-4">
          {t('settings.language')}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setLanguageState('zh')}
            className={`p-4 rounded-lg border transition-all ${
              language === 'zh'
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇨🇳</span>
              <div className="text-left">
                <div className="font-semibold text-slate-900">{t('common.chinese')}</div>
                <div className="text-xs text-slate-500">Chinese (Simplified)</div>
              </div>
              {language === 'zh' && <Check className="w-5 h-5 text-blue-600 ml-auto" />}
            </div>
          </button>

          <button
            onClick={() => setLanguageState('en')}
            className={`p-4 rounded-lg border transition-all ${
              language === 'en'
                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🇺🇸</span>
              <div className="text-left">
                <div className="font-semibold text-slate-900">{t('common.english')}</div>
                <div className="text-xs text-slate-500">English (US)</div>
              </div>
              {language === 'en' && <Check className="w-5 h-5 text-blue-600 ml-auto" />}
            </div>
          </button>
        </div>

        <button
          onClick={handleSaveUser}
          disabled={saving}
          className="mt-4 sm:mt-6 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('common.save')}
        </button>
      </section>

      {/* Indicators Section */}
      <section className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">{t('settings.indicators')}</h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-4 sm:mb-6">
          {t('indicators.manage')}
        </p>

        <div className="mb-4 sm:mb-6">
          <h3 className="font-medium text-slate-900 mb-2 sm:mb-3 text-sm sm:text-base">{t('dashboard.coreIndicators')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {coreIndicators.map((indicator) => (
              <IndicatorRow
                key={indicator.series_id}
                indicator={indicator}
                onToggle={() => toggleIndicator(indicator.series_id)}
                onChange={(field, value) =>
                  setIndicators((prev) =>
                    prev.map((i) =>
                      i.series_id === indicator.series_id
                        ? { ...i, [field]: value }
                        : i
                    )
                  )
                }
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-medium text-slate-900 mb-2 sm:mb-3 text-sm sm:text-base">{t('dashboard.allIndicators')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherIndicators.map((indicator) => (
              <IndicatorRow
                key={indicator.series_id}
                indicator={indicator}
                onToggle={() => toggleIndicator(indicator.series_id)}
                onChange={(field, value) =>
                  setIndicators((prev) =>
                    prev.map((i) =>
                      i.series_id === indicator.series_id
                        ? { ...i, [field]: value }
                        : i
                    )
                  )
                }
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleSaveIndicators}
          disabled={saving}
          className="mt-4 sm:mt-6 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('common.save')}
        </button>
      </section>
    </div>
  );
}

function IndicatorRow({
  indicator,
  onToggle,
  onChange,
}: {
  indicator: IndicatorConfig;
  onToggle: () => void;
  onChange: (field: string, value: unknown) => void;
}) {
  return (
    <div
      className={`p-3 sm:p-4 rounded-lg border transition ${
        indicator.enabled
          ? 'border-blue-200 bg-blue-50/30'
          : 'border-slate-200 bg-slate-50'
      }`}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={indicator.enabled}
            onChange={onToggle}
            className="w-4 h-4 sm:w-5 sm:h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <div className="font-medium text-slate-900 text-sm sm:text-base">{indicator.info?.title}</div>
            <div className="text-xs text-slate-500">{indicator.series_id}</div>
          </div>
        </label>
      </div>

      {indicator.enabled && (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
          <div>
            <label className="text-slate-500 block mb-1">Warning</label>
            <input
              type="number"
              step="0.5"
              value={indicator.z_threshold_warning}
              onChange={(e) => onChange('z_threshold_warning', parseFloat(e.target.value))}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="text-slate-500 block mb-1">Critical</label>
            <input
              type="number"
              step="0.5"
              value={indicator.z_threshold_critical}
              onChange={(e) => onChange('z_threshold_critical', parseFloat(e.target.value))}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RiskToleranceOption({
  type,
  title,
  description,
  icon,
  selected,
  onClick,
  details,
}: {
  type: 'conservative' | 'moderate' | 'aggressive';
  title: string;
  description: string;
  icon: string;
  selected: boolean;
  onClick: () => void;
  details: string[];
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3 sm:p-4 rounded-lg border text-left transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl sm:text-2xl">{icon}</span>
        <div>
          <div className="font-semibold text-slate-900 text-sm sm:text-base">{title}</div>
          <div className="text-xs text-slate-500">{description}</div>
        </div>
        {selected && <Check className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 ml-auto" />}
      </div>
      <ul className="text-xs text-slate-600 space-y-0.5 sm:space-y-1 mt-2 sm:mt-3">
        {details.map((detail, i) => (
          <li key={i} className="flex items-center gap-1">
            <span className="w-1 h-1 bg-slate-400 rounded-full flex-shrink-0" />
            <span className="truncate">{detail}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}
