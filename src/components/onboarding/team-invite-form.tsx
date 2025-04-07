'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FormData } from './multi-step-form';
import { X } from 'lucide-react';

const emailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

interface TeamInviteFormProps {
  data: FormData;
  onUpdate: (data: Partial<FormData>) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
}

export function TeamInviteForm({ data, onUpdate, onBack, onSubmit, isSubmitting }: TeamInviteFormProps) {
  const [emails, setEmails] = useState<string[]>(data.teamEmails || []);
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{ email: string }>({
    resolver: zodResolver(emailSchema),
  });

  const onSubmitForm = (formData: { email: string }) => {
    if (!emails.includes(formData.email)) {
      const newEmails = [...emails, formData.email];
      setEmails(newEmails);
      onUpdate({ teamEmails: newEmails });
      reset();
    }
  };

  const removeEmail = (email: string) => {
    const newEmails = emails.filter((e) => e !== email);
    setEmails(newEmails);
    onUpdate({ teamEmails: newEmails });
  };

  const handleFinish = async () => {
    await onSubmit();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium">Invite team members</h2>
        <p className="text-sm text-gray-500">
          Add team members to collaborate with you. You can skip this step if you want to add them later.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email address</Label>
          <div className="flex space-x-2">
            <Input
              id="email"
              type="email"
              placeholder="Enter email address"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
              disabled={isSubmitting}
            />
            <Button type="submit" disabled={isSubmitting}>
              Add
            </Button>
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>
      </form>

      {emails.length > 0 && (
        <div className="space-y-2">
          <Label>Added team members</Label>
          <div className="space-y-2">
            {emails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <span className="text-sm">{email}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEmail(email)}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <div className="space-x-2">
          <Button type="button" variant="outline" onClick={handleFinish} disabled={isSubmitting}>
            Skip
          </Button>
          <Button type="button" onClick={handleFinish} disabled={isSubmitting}>
            {isSubmitting ? 'Completing...' : 'Finish'}
          </Button>
        </div>
      </div>
    </div>
  );
} 