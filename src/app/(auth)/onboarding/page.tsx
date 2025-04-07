import { MultiStepForm } from '@/components/onboarding/multi-step-form';

export default function OnboardingPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-center text-2xl font-bold">Complete Your Profile</h1>
        <MultiStepForm />
      </div>
    </div>
  );
} 