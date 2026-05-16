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
  }, []);

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
