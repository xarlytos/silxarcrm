'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import {
  Share2,
  FileText,
  Video,
  Gift,
  Zap,
  Save,
  Check,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface ConfigForm {
  socialEnabled: boolean;
  linkedInToken: string;
  facebookToken: string;
  instagramToken: string;
  xToken: string;
  tiktokToken: string;
  seoEnabled: boolean;
  blogDomain: string;
  targetKeywords: string;
  videoEnabled: boolean;
  elevenLabsKey: string;
  referralsEnabled: boolean;
  referralReward: string;
  autoActivate: boolean;
  activationChannel: string;
}

export default function GrowthConfig() {
  const [softwareId, setSoftwareId] = useState('');
  const [softwares, setSoftwares] = useState<Array<{ id: string; nombre: string }>>([]);
  const [config, setConfig] = useState<ConfigForm>({
    socialEnabled: false,
    linkedInToken: '',
    facebookToken: '',
    instagramToken: '',
    xToken: '',
    tiktokToken: '',
    seoEnabled: false,
    blogDomain: '',
    targetKeywords: '',
    videoEnabled: false,
    elevenLabsKey: '',
    referralsEnabled: false,
    referralReward: '1 mes gratis',
    autoActivate: true,
    activationChannel: 'email',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSoftwares();
  }, []);

  useEffect(() => {
    if (softwareId) loadConfig();
  }, [softwareId]);

  async function loadSoftwares() {
    try {
      const res = await apiClient.getSoftwares();
      const list = res?.data || [];
      setSoftwares(list);
      if (list.length > 0) setSoftwareId(list[0].id);
    } catch {
      // error
    }
  }

  async function loadConfig() {
    setLoading(true);
    try {
      const data = await apiClient.getGrowthConfig(softwareId);
      setConfig({
        socialEnabled: data.socialEnabled,
        linkedInToken: '',
        facebookToken: '',
        instagramToken: '',
        xToken: '',
        tiktokToken: '',
        seoEnabled: data.seoEnabled,
        blogDomain: data.blogDomain || '',
        targetKeywords: (data.targetKeywords || []).join(', '),
        videoEnabled: data.videoEnabled,
        elevenLabsKey: '',
        referralsEnabled: data.referralsEnabled,
        referralReward: data.referralReward || '1 mes gratis',
        autoActivate: data.autoActivate,
        activationChannel: data.activationChannel,
      });
    } catch {
      // No hay config previa, usar defaults
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiClient.updateGrowthConfig(softwareId, {
        socialEnabled: config.socialEnabled,
        linkedInToken: config.linkedInToken || undefined,
        facebookToken: config.facebookToken || undefined,
        instagramToken: config.instagramToken || undefined,
        xToken: config.xToken || undefined,
        tiktokToken: config.tiktokToken || undefined,
        seoEnabled: config.seoEnabled,
        blogDomain: config.blogDomain || undefined,
        targetKeywords: config.targetKeywords.split(',').map((k) => k.trim()).filter(Boolean),
        videoEnabled: config.videoEnabled,
        elevenLabsKey: config.elevenLabsKey || undefined,
        referralsEnabled: config.referralsEnabled,
        referralReward: config.referralReward,
        autoActivate: config.autoActivate,
        activationChannel: config.activationChannel,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert('Error guardando: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const sections = [
    {
      title: 'Social Media',
      icon: Share2,
      enabled: config.socialEnabled,
      onToggle: () => setConfig({ ...config, socialEnabled: !config.socialEnabled }),
      fields: [
        { label: 'LinkedIn Token', key: 'linkedInToken', type: 'password' },
        { label: 'Facebook Token', key: 'facebookToken', type: 'password' },
        { label: 'Instagram Token', key: 'instagramToken', type: 'password' },
        { label: 'X (Twitter) Token', key: 'xToken', type: 'password' },
        { label: 'TikTok Token', key: 'tiktokToken', type: 'password' },
      ],
    },
    {
      title: 'SEO Engine',
      icon: FileText,
      enabled: config.seoEnabled,
      onToggle: () => setConfig({ ...config, seoEnabled: !config.seoEnabled }),
      fields: [
        { label: 'Dominio del blog', key: 'blogDomain', type: 'text', placeholder: 'https://blog.tusitio.com' },
        { label: 'Keywords objetivo', key: 'targetKeywords', type: 'text', placeholder: 'separadas, por, comas' },
      ],
    },
    {
      title: 'Video Engine',
      icon: Video,
      enabled: config.videoEnabled,
      onToggle: () => setConfig({ ...config, videoEnabled: !config.videoEnabled }),
      fields: [
        { label: 'ElevenLabs API Key', key: 'elevenLabsKey', type: 'password' },
      ],
    },
    {
      title: 'Referidos',
      icon: Gift,
      enabled: config.referralsEnabled,
      onToggle: () => setConfig({ ...config, referralsEnabled: !config.referralsEnabled }),
      fields: [
        { label: 'Recompensa', key: 'referralReward', type: 'text', placeholder: '1 mes gratis' },
      ],
    },
    {
      title: 'Activación Automática',
      icon: Zap,
      enabled: config.autoActivate,
      onToggle: () => setConfig({ ...config, autoActivate: !config.autoActivate }),
      fields: [
        {
          label: 'Canal de activación',
          key: 'activationChannel',
          type: 'select',
          options: ['email', 'whatsapp', 'llamada'],
        },
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración del Growth Engine</h1>
          <p className="text-muted-foreground mt-1">Activa y configura cada canal de adquisición.</p>
        </div>
        <select
          value={softwareId}
          onChange={(e) => setSoftwareId(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-card"
        >
          {softwares.map((s) => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="text-center py-8 text-muted-foreground">Cargando configuración...</div>
      )}

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="rounded-xl border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-muted/50">
              <div className="flex items-center gap-3">
                <section.icon className="w-5 h-5" />
                <h3 className="font-semibold">{section.title}</h3>
              </div>
              <button
                onClick={section.onToggle}
                className="flex items-center gap-2"
              >
                {section.enabled ? (
                  <ToggleRight className="w-6 h-6 text-green-500" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                )}
              </button>
            </div>

            {section.enabled && (
              <div className="p-4 space-y-4">
                {section.fields.map((field: any) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-1">{field.label}</label>
                    {field.type === 'select' ? (
                      <select
                        value={(config as any)[field.key]}
                        onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border bg-card"
                      >
                        {field.options.map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt.charAt(0).toUpperCase() + opt.slice(1)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={(config as any)[field.key]}
                        onChange={(e) => setConfig({ ...config, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 rounded-lg border bg-card"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? (
            <>Guardando...</>
          ) : saved ? (
            <>
              <Check className="w-4 h-4" />
              Guardado
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Guardar configuración
            </>
          )}
        </button>

        {saved && (
          <span className="text-sm text-green-500">Configuración guardada correctamente</span>
        )}
      </div>
    </div>
  );
}
