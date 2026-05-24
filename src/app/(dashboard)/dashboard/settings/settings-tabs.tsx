"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BillingSettingsPanel } from "@/components/billing/billing-settings-panel";
import { ChangeEmailForm } from "@/components/auth/change-email-form";
import { ChangePasswordForm } from "@/components/auth/change-password-form";

const tabs = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "billing", label: "Billing" },
  { id: "integrations", label: "Integrations" },
  { id: "notifications", label: "Notifications" },
];

function SettingsTabsInner({ initialName, initialEmail }: { initialName: string; initialEmail: string }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") ?? "profile";
  const [tab, setTab] = useState(
    ["profile", "security", "billing", "integrations", "notifications"].includes(initialTab) ? initialTab : "profile",
  );
  return (
    <Tabs.Root value={tab} onValueChange={setTab}>
      <Tabs.List className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3">
        {tabs.map((t) => (
          <Tabs.Trigger
            key={t.id}
            value={t.id}
            className="rounded-full px-4 py-2 text-sm font-medium text-neutral-600 data-[state=active]:bg-neutral-900 data-[state=active]:text-white"
          >
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="profile" className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label>Company / agency name</Label>
          <Input defaultValue={initialName} className="rounded-lg border-neutral-200" />
        </div>
        <div className="space-y-2">
          <Label>Email (read-only)</Label>
          <Input readOnly value={initialEmail} className="rounded-lg border-neutral-200 bg-neutral-50" />
        </div>
        <Button type="button" className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800">
          Save changes
        </Button>
      </Tabs.Content>
      <Tabs.Content value="security" className="mt-6 space-y-8">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-neutral-900">Change password</h3>
          <ChangePasswordForm email={initialEmail} />
        </section>
        <section className="space-y-3 border-t border-neutral-100 pt-8">
          <h3 className="text-sm font-semibold text-neutral-900">Change email</h3>
          <ChangeEmailForm currentEmail={initialEmail} />
        </section>
      </Tabs.Content>
      <Tabs.Content value="billing" className="mt-6">
        <Suspense fallback={<p className="text-sm text-neutral-500">Loading billing…</p>}>
          <BillingSettingsPanel />
        </Suspense>
      </Tabs.Content>
      <Tabs.Content value="integrations" className="mt-6 space-y-4 text-sm text-neutral-600">
        <p>Google Calendar and Twilio toggles can be wired here.</p>
      </Tabs.Content>
      <Tabs.Content value="notifications" className="mt-6 space-y-4 text-sm text-neutral-600">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="accent-blue-500" defaultChecked /> Daily summary
        </label>
      </Tabs.Content>
    </Tabs.Root>
  );
}

export function SettingsTabs(props: { initialName: string; initialEmail: string }) {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading settings…</p>}>
      <SettingsTabsInner {...props} />
    </Suspense>
  );
}
