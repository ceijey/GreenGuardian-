import { useState } from 'react';

interface OnboardingModalProps {
  onClose: () => void;
}

export default function OnboardingModal({ onClose }: OnboardingModalProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to GreenGuardian! 🌱',
      description: 'Let us walk you through the main features of the app.',
    },
    {
      title: 'Track Your Impact',
      description: 'Scan products and track your environmental footprint in real-time.',
    },
    {
      title: 'Join Swap Challenges',
      description: 'Participate in local swap events and give items a second life.',
    },
    {
      title: 'Earn Badges',
      description: 'Complete eco-challenges and collect badges for your achievements.',
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-2">{steps[step].title}</h3>
          <p className="text-gray-600">{steps[step].description}</p>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index === step ? 'bg-green-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          
          <div className="flex gap-4">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {step === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}