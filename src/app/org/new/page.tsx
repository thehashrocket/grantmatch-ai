'use client';

import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { createOrganizationSchema } from '@/lib/validations/organization';
import type { z } from 'zod';
import type { TRPCClientErrorLike } from '@trpc/client';
import { DefaultErrorShape } from '@trpc/server/unstable-core-do-not-import';
type FormData = z.infer<typeof createOrganizationSchema>;

export default function NewOrganizationPage() {
  const router = useRouter();
  const createOrganization = trpc.organization.create.useMutation({
    onSuccess: () => {
      toast.success('Organization created successfully');
      router.push('/dashboard');
    },
    onError: (error: TRPCClientErrorLike<{ input: { name: string; mission: string; focusAreas: string[]; location: string; }; output: { name: string; mission: string; focusAreas: string[]; location: string; id: string; createdAt: Date; updatedAt: Date; }; transformer: true; errorShape: DefaultErrorShape; }>) => {
      toast.error(error.message);
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      mission: '',
      focusAreas: [],
      location: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    // Convert comma-separated focus areas string to array
    const formattedData = {
      ...data,
      focusAreas: data.focusAreas.length ? data.focusAreas : data.focusAreas.toString().split(',').map(area => area.trim()).filter(Boolean),
    };
    
    createOrganization.mutate(formattedData);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Create New Organization</h1>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Organization Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter organization name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mission Statement</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Enter your organization's mission statement"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="focusAreas"
            render={({ field: { onChange, value, ...fieldProps } }) => (
              <FormItem>
                <FormLabel>Focus Areas</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter focus areas (comma-separated)"
                    onChange={(e) => onChange(e.target.value.split(',').map(area => area.trim()))}
                    value={Array.isArray(value) ? value.join(', ') : ''}
                    {...fieldProps}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="City, State" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            className="w-full"
            disabled={createOrganization.isPending}
          >
            {createOrganization.isPending ? 'Creating...' : 'Create Organization'}
          </Button>
        </form>
      </Form>
    </div>
  );
} 