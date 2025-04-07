'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FormData } from './multi-step-form';

const companyInfoSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string().min(5, 'ZIP code must be at least 5 digits'),
  description: z.string().min(1, 'Description is required'),
});

type CompanyInfoData = Pick<
  FormData,
  'companyName' | 'address1' | 'address2' | 'city' | 'state' | 'zipCode' | 'description'
>;

interface CompanyInfoFormProps {
  data: FormData;
  onUpdate: (data: Partial<FormData>) => void;
  onNext: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function CompanyInfoForm({ data, onUpdate, onNext, onBack, isSubmitting }: CompanyInfoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyInfoData>({
    resolver: zodResolver(companyInfoSchema),
    defaultValues: {
      companyName: data.companyName,
      address1: data.address1,
      address2: data.address2,
      city: data.city,
      state: data.state,
      zipCode: data.zipCode,
      description: data.description,
    },
  });

  const onSubmit = (formData: CompanyInfoData) => {
    onUpdate(formData);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="companyName">Company name</Label>
          <Input
            id="companyName"
            {...register('companyName')}
            className={errors.companyName ? 'border-red-500' : ''}
          />
          {errors.companyName && (
            <p className="mt-1 text-sm text-red-500">{errors.companyName.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address1">Address line 1</Label>
          <Input
            id="address1"
            {...register('address1')}
            className={errors.address1 ? 'border-red-500' : ''}
          />
          {errors.address1 && (
            <p className="mt-1 text-sm text-red-500">{errors.address1.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address2">Address line 2 (optional)</Label>
          <Input id="address2" {...register('address2')} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              {...register('city')}
              className={errors.city ? 'border-red-500' : ''}
            />
            {errors.city && (
              <p className="mt-1 text-sm text-red-500">{errors.city.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              {...register('state')}
              className={errors.state ? 'border-red-500' : ''}
            />
            {errors.state && (
              <p className="mt-1 text-sm text-red-500">{errors.state.message}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="zipCode">ZIP code</Label>
          <Input
            id="zipCode"
            {...register('zipCode')}
            className={errors.zipCode ? 'border-red-500' : ''}
          />
          {errors.zipCode && (
            <p className="mt-1 text-sm text-red-500">{errors.zipCode.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            className={errors.description ? 'border-red-500' : ''}
            rows={4}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save and continue'}
        </Button>
      </div>
    </form>
  );
} 