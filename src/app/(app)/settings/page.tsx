"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  Key,
  ShieldCheck,
  Loader2,
  Trash2,
  CircleAlert,
  Zap,
  FileText,
  Link2,
  Link2Off,
} from "lucide-react";
import {
  type Provider,
  type ApiKeyConfig,
  validateApiKey,
  saveApiKey,
  loadApiKeys,
  removeApiKey,
  setActiveProvider,
} from "@/lib/ai";
import {
  startGoogleAuth,
  isGoogleConnected,
  removeGoogleToken,
  getClientId,
  saveClientId,
  removeClientId,
} from "@/lib/google";

interface ProviderState {
  key: string;
  model: string;
  show: boolean;
  status: "idle" | "validating" | "valid" | "invalid";
  error: string;
  saved: boolean;
}

const PROVIDER_META: Record<
  Provider,
  { label: string; placeholder: string; prefix: string; models: string[]; docsUrl: string }
> = {
  openai: {
    label: "OpenAI",
    placeholder: "sk-...",
    prefix: "sk-",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    docsUrl: "https://platform.openai.com/api-keys",
  },
  claude: {
    label: "Anthropic Claude",
    placeholder: "sk-ant-...",
    prefix: "sk-ant-",
    models: ["claude-sonnet-4-6", "claude-opus-4-7", "claude-haiku-4-5-20251001"],
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  openrouter: {
    label: "OpenRouter",
    placeholder: "sk-or-...",
    prefix: "sk-or-",
    models: ["openai/gpt-4o", "anthropic/claude-sonnet-4-5", "meta-llama/llama-3.3-70b-instruct", "google/gemini-2.0-flash-001"],
    docsUrl: "https://openrouter.ai/keys",
  },
  groq: {
    label: "Groq",
    placeholder: "gsk_...",
    prefix: "gsk_",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "meta-llama/llama-4-scout-17b-16e-instruct"],
    docsUrl: "https://console.groq.com/keys",
  },
};

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-4o",
  claude: "claude-sonnet-4-6",
  openrouter: "openai/gpt-4o",
  groq: "llama-3.3-70b-versatile",
};

function makeDefault(): ProviderState {
  return { key: "", model: "", show: false, status: "idle", error: "", saved: false };
}

export default function SettingsPage() {
  const [activeProvider, setActive] = useState<Provider>("openai");
  const [providers, setProviders] = useState<Record<Provider, ProviderState>>({
    openai: makeDefault(),
    claude: makeDefault(),
    openrouter: makeDefault(),
    groq: makeDefault(),
  });
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleConnecting, setGoogleConnecting] = useState(false);

  useEffect(() => {
    const saved = loadApiKeys();
    const ap = (localStorage.getItem("convoai_active_provider") as Provider) ?? "openai";
    setActive(ap);
    setProviders((prev) => {
      const next = { ...prev };
      for (const cfg of saved) {
        next[cfg.provider] = {
          ...makeDefault(),
          key: cfg.key,
          model: cfg.model ?? DEFAULT_MODELS[cfg.provider],
          status: "valid",
          saved: true,
        };
      }
      return next;
    });
    setGoogleClientId(getClientId());
    setGoogleConnected(isGoogleConnected());
  }, []);

  const handleGoogleConnect = () => {
    if (!googleClientId.trim()) return;
    saveClientId(googleClientId.trim());
    setGoogleConnecting(true);
    try {
      startGoogleAuth(); // redirects the page — no await needed
    } catch {
      setGoogleConnecting(false);
    }
  };

  const handleGoogleDisconnect = () => {
    removeGoogleToken();
    removeClientId();
    setGoogleConnected(false);
    setGoogleClientId("");
  };

  const update = (provider: Provider, patch: Partial<ProviderState>) =>
    setProviders((prev) => ({ ...prev, [provider]: { ...prev[provider], ...patch } }));

  const handleValidate = async (provider: Provider) => {
    const state = providers[provider];
    if (!state.key.trim()) return;
    update(provider, { status: "validating", error: "" });

    const result = await validateApiKey({
      provider,
      key: state.key.trim(),
      model: state.model || DEFAULT_MODELS[provider],
    });

    if (result.valid) {
      const cfg: ApiKeyConfig = {
        provider,
        key: state.key.trim(),
        model: state.model || DEFAULT_MODELS[provider],
      };
      saveApiKey(cfg);
      update(provider, { status: "valid", saved: true, error: "" });
    } else {
      update(provider, { status: "invalid", error: result.error ?? "Validation failed" });
    }
  };

  const handleRemove = (provider: Provider) => {
    removeApiKey(provider);
    update(provider, { key: "", model: "", status: "idle", saved: false, error: "" });
  };

  const handleSetActive = (provider: Provider) => {
    setActiveProvider(provider);
    setActive(provider);
  };

  const savedCount = Object.values(providers).filter((p) => p.saved).length;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">API Settings</h2>
          <p className="text-sm text-muted-foreground">
            {savedCount === 0
              ? "Add at least one API key to start generating"
              : `${savedCount} provider${savedCount > 1 ? "s" : ""} configured`}
          </p>
        </div>
        {savedCount > 0 && (
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Ready
          </Badge>
        )}
      </div>

      {/* Active provider selector */}
      {savedCount > 1 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-medium">Active Provider</CardTitle>
            </div>
            <CardDescription className="text-xs">Which provider is used for generation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {(Object.keys(PROVIDER_META) as Provider[])
                .filter((p) => providers[p].saved)
                .map((p) => (
                  <Button
                    key={p}
                    variant={activeProvider === p ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSetActive(p)}
                  >
                    {PROVIDER_META[p].label}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider cards */}
      {(Object.keys(PROVIDER_META) as Provider[]).map((provider) => {
        const meta = PROVIDER_META[provider];
        const state = providers[provider];
        const isActive = activeProvider === provider;

        return (
          <Card
            key={provider}
            className={`border-border/50 transition-all ${
              state.status === "valid" ? "border-emerald-500/30" : ""
            } ${isActive && state.saved ? "ring-1 ring-primary/30" : ""}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">{meta.label}</CardTitle>
                  {state.saved && isActive && (
                    <Badge variant="secondary" className="text-[10px] px-1.5">Active</Badge>
                  )}
                </div>
                {state.saved && (
                  <div className="flex items-center gap-2">
                    {!isActive && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => handleSetActive(provider)}
                      >
                        Set active
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive h-7 w-7 p-0"
                      onClick={() => handleRemove(provider)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <CardDescription className="text-xs">
                Get your key at{" "}
                <span className="text-primary font-mono text-[10px]">{meta.docsUrl}</span>
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* API Key input */}
              <div className="space-y-1.5">
                <Label className="text-xs">API Key</Label>
                <div className="relative">
                  <Input
                    type={state.show ? "text" : "password"}
                    placeholder={meta.placeholder}
                    value={state.key}
                    onChange={(e) => update(provider, { key: e.target.value, status: "idle", error: "", saved: false })}
                    className={`pr-10 font-mono text-sm ${
                      state.status === "valid"
                        ? "border-emerald-500/50 focus-visible:border-emerald-500"
                        : state.status === "invalid"
                        ? "border-destructive/50 focus-visible:border-destructive"
                        : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => update(provider, { show: !state.show })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {state.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {state.status === "invalid" && state.error && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <CircleAlert className="w-3 h-3" />
                    {state.error}
                  </p>
                )}
                {state.status === "valid" && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Key validated and saved
                  </p>
                )}
              </div>

              {/* Model selector */}
              <div className="space-y-1.5">
                <Label className="text-xs">Model</Label>
                <Select
                  value={state.model || DEFAULT_MODELS[provider]}
                  onValueChange={(v) => update(provider, { model: v ?? "" })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meta.models.map((m) => (
                      <SelectItem key={m} value={m} className="font-mono text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <Button
                onClick={() => handleValidate(provider)}
                disabled={!state.key.trim() || state.status === "validating"}
                className="w-full"
                variant={state.status === "valid" ? "outline" : "default"}
              >
                {state.status === "validating" ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Validating…</>
                ) : state.status === "valid" ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />Re-validate & Save</>
                ) : (
                  <><ShieldCheck className="w-4 h-4 mr-2" />Validate & Save</>
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {/* Google Docs */}
      <Card className={`border-border/50 ${googleConnected ? "border-emerald-500/30" : ""}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">Google Docs</CardTitle>
              {googleConnected && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5">
                  Connected
                </Badge>
              )}
            </div>
            {googleConnected && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7 text-xs"
                onClick={handleGoogleDisconnect}
              >
                <Link2Off className="w-3.5 h-3.5 mr-1" />
                Disconnect
              </Button>
            )}
          </div>
          <CardDescription className="text-xs">
            Export conversations directly to Google Docs with one click
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {googleConnected ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Google account connected. Use "Open in Google Docs" on the preview page.
            </p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Google OAuth Client ID</Label>
                <Input
                  placeholder="123456789-abc...apps.googleusercontent.com"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Get it from{" "}
                  <span className="font-mono text-primary">console.cloud.google.com</span>
                  {" "}→ APIs & Services → Credentials → OAuth 2.0 Client ID
                </p>
              </div>

              <div className="rounded-md bg-muted/50 border border-border/50 p-4 space-y-3">
                <p className="text-xs font-semibold">How to get your Google Client ID (one time setup)</p>

                <div className="space-y-2.5 text-[11px] text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px]">1</span>
                    <p>Go to <span className="font-mono text-primary">console.cloud.google.com</span> and sign in with your Google account.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px]">2</span>
                    <p>Click <strong className="text-foreground">Select a project</strong> at the top, then click <strong className="text-foreground">New Project</strong>. Give it any name and click Create.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px]">3</span>
                    <p>From the left menu go to <strong className="text-foreground">APIs & Services → Library</strong>. Search for <strong className="text-foreground">Google Docs API</strong> and click Enable. Then search for <strong className="text-foreground">Google Drive API</strong> and enable that too.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px]">4</span>
                    <p>Go to <strong className="text-foreground">APIs & Services → OAuth consent screen</strong>. Select <strong className="text-foreground">External</strong>, click Create. Fill in App name (anything), your email, and click Save and Continue through all steps.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px]">5</span>
                    <p>Go to <strong className="text-foreground">APIs & Services → Credentials</strong>. Click <strong className="text-foreground">Create Credentials → OAuth 2.0 Client ID</strong>. Choose <strong className="text-foreground">Web application</strong> as the application type.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px]">6</span>
                    <div className="space-y-2 flex-1">
                      <p>Under <strong className="text-foreground">Authorized JavaScript origins</strong> click Add URI and paste:</p>
                      <p className="font-mono text-primary bg-primary/5 rounded px-2 py-1 break-all select-all">
                        {typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app"}
                      </p>
                      <p className="mt-1">Then under <strong className="text-foreground">Authorized redirect URIs</strong> click Add URI and paste:</p>
                      <p className="font-mono text-primary bg-primary/5 rounded px-2 py-1 break-all select-all">
                        {typeof window !== "undefined" ? window.location.origin : "https://your-app.vercel.app"}/auth/callback
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-[10px]">7</span>
                    <p>Click <strong className="text-foreground">Create</strong>. Copy the <strong className="text-foreground">Client ID</strong> (looks like: 123456789-abc...apps.googleusercontent.com) and paste it in the field above.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center font-semibold text-[10px]">8</span>
                    <p>Click <strong className="text-foreground">Connect Google Account</strong> below. Sign in with Google and allow access. Done - you only need to do this once.</p>
                  </div>
                </div>
              </div>

              <Separator />

              <Button
                onClick={handleGoogleConnect}
                disabled={!googleClientId.trim() || googleConnecting}
                className="w-full"
              >
                {googleConnecting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting to Google...</>
                ) : (
                  <><Link2 className="w-4 h-4 mr-2" />Connect Google Account</>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Security note */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
        <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground">
          API keys are stored only in your browser&apos;s localStorage and are sent to AI providers via a local server proxy — never to any third-party service.
        </p>
      </div>
    </div>
  );
}
