"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ChangePasswordFormProps = {
  email: string;
};

export function ChangePasswordForm({ email }: ChangePasswordFormProps) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setMessage("New password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    });
    if (signInError) {
      setLoading(false);
      setMessage("Current password is incorrect.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setMessage("Password updated.");
    setCurrent("");
    setPassword("");
    setConfirm("");
  };

  return (
    <form className="space-y-4" onSubmit={(e) => void submit(e)}>
      <div className="space-y-2">
        <Label className="text-neutral-700">Current password</Label>
        <PasswordInput value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
      </div>
      <div className="space-y-2">
        <Label className="text-neutral-700">New password</Label>
        <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
      </div>
      <div className="space-y-2">
        <Label className="text-neutral-700">Confirm new password</Label>
        <PasswordInput value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
      </div>
      <Button type="submit" disabled={loading} className="rounded-full bg-neutral-900 text-white hover:bg-neutral-800">
        {loading ? "Updating…" : "Update password"}
      </Button>
      {message ? (
        <p className={`text-sm ${message.includes("updated") ? "text-neutral-600" : "text-red-600"}`}>{message}</p>
      ) : null}
    </form>
  );
}
