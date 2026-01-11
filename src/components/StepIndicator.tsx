import { Check, FileText, List, Upload } from "lucide-react";
import { WorkflowStep } from "@/types/digest";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: WorkflowStep;
  onStepClick?: (step: WorkflowStep) => void;
}

const steps: { id: WorkflowStep; label: string; icon: React.ReactNode }[] = [
  { id: 'input', label: 'Input Sources', icon: <Upload className="w-4 h-4" /> },
  { id: 'toc', label: 'Table of Contents', icon: <List className="w-4 h-4" /> },
  { id: 'report', label: 'Generate Report', icon: <FileText className="w-4 h-4" /> },
];

export const StepIndicator = ({ currentStep, onStepClick }: StepIndicatorProps) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full py-6 px-4">
      <div className="flex items-center justify-center gap-4 md:gap-8">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isPending = index > currentIndex;
          const canClick = isCompleted && onStepClick;

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => canClick && onStepClick(step.id)}
                disabled={!canClick}
                className={cn(
                  "flex items-center gap-3 transition-all duration-300",
                  canClick && "cursor-pointer hover:opacity-80",
                  !canClick && "cursor-default"
                )}
              >
                <div
                  className={cn(
                    "step-indicator",
                    isCompleted && "completed",
                    isActive && "active",
                    isPending && "pending"
                  )}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : step.icon}
                </div>
                <span
                  className={cn(
                    "hidden md:block font-medium text-sm transition-colors",
                    isActive && "text-foreground",
                    isCompleted && "text-accent",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </button>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-12 md:w-20 h-0.5 mx-4 transition-colors duration-300",
                    index < currentIndex ? "bg-accent" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
