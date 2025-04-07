'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PersonalInfoForm } from './personal-info-form';
import { CompanyInfoForm } from './company-info-form';
import { TeamInviteForm } from './team-invite-form';
import { toast } from 'sonner';

type OnboardingStep = 'personal' | 'company' | 'team';

export interface FormData {
  // Personal Info
  firstName: string;
  lastName: string;
  phone: string;
  avatar?: File;
  
  // Company Info
  companyName: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zipCode: string;
  description: string;
  
  // Team Members
  teamEmails: string[];
}

export function MultiStepForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('personal');
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    phone: '',
    companyName: '',
    address1: '',
    city: '',
    state: '',
    zipCode: '',
    description: '',
    teamEmails: []
  });

  const steps: { title: string; step: OnboardingStep }[] = [
    { title: 'Personal information', step: 'personal' },
    { title: 'Company information', step: 'company' },
    { title: 'Invite team member', step: 'team' }
  ];

  const updateFormData = (data: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep === 'personal') setCurrentStep('company');
    else if (currentStep === 'company') setCurrentStep('team');
  };

  const handleBack = () => {
    if (currentStep === 'company') setCurrentStep('personal');
    else if (currentStep === 'team') setCurrentStep('company');
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const submitData = new FormData();
      
      // Add all form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'teamEmails') {
          submitData.append(key, JSON.stringify(value));
        } else if (key === 'avatar' && value instanceof File) {
          submitData.append(key, value);
        } else if (value !== undefined && value !== null) {
          submitData.append(key, String(value));
        }
      });

      const response = await fetch('/api/onboarding', {
        method: 'POST',
        body: submitData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit form');
      }

      const result = await response.json();
      
      toast.success('Profile completed successfully!');
      router.push('/dashboard'); // Redirect to dashboard after successful submission
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('Failed to complete profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.step} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  currentStep === step.step
                    ? 'bg-green-500 text-white'
                    : steps.findIndex(s => s.step === currentStep) > index
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {index + 1}
              </div>
              <span className="ml-2 text-sm text-gray-600">{step.title}</span>
              {index < steps.length - 1 && (
                <div className="mx-4 h-px w-16 bg-gray-200" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Steps */}
      <div className="mt-8">
        {currentStep === 'personal' && (
          <PersonalInfoForm
            data={formData}
            onUpdate={updateFormData}
            onNext={handleNext}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 'company' && (
          <CompanyInfoForm
            data={formData}
            onUpdate={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
            isSubmitting={isSubmitting}
          />
        )}
        {currentStep === 'team' && (
          <TeamInviteForm
            data={formData}
            onUpdate={updateFormData}
            onBack={handleBack}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        )}
      </div>
    </div>
  );
} 