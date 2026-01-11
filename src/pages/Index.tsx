import { useState } from "react";
import { Header } from "@/components/Header";
import { StepIndicator } from "@/components/StepIndicator";
import { InputStep } from "@/components/InputStep";
import { TocStep } from "@/components/TocStep";
import { ReportStep } from "@/components/ReportStep";
import { WorkflowStep, InputLink, DigestCategory } from "@/types/digest";

const Index = () => {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('input');
  const [links, setLinks] = useState<InputLink[]>([]);
  const [pdfFile, setPdfFile] = useState<File | undefined>();
  const [categories, setCategories] = useState<DigestCategory[]>([]);

  const handleInputNext = (inputLinks: InputLink[], pdf?: File) => {
    setLinks(inputLinks);
    setPdfFile(pdf);
    setCurrentStep('toc');
  };

  const handleTocNext = (generatedCategories: DigestCategory[]) => {
    setCategories(generatedCategories);
    setCurrentStep('report');
  };

  const handleReset = () => {
    setCurrentStep('input');
    setLinks([]);
    setPdfFile(undefined);
    setCategories([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <StepIndicator 
          currentStep={currentStep} 
          onStepClick={(step) => {
            // Only allow going back to previous steps
            const steps: WorkflowStep[] = ['input', 'toc', 'report'];
            const currentIndex = steps.indexOf(currentStep);
            const targetIndex = steps.indexOf(step);
            if (targetIndex < currentIndex) {
              setCurrentStep(step);
            }
          }}
        />
        
        <div className="mt-8">
          {currentStep === 'input' && (
            <InputStep onNext={handleInputNext} />
          )}
          
          {currentStep === 'toc' && (
            <TocStep
              links={links}
              pdfFile={pdfFile}
              onNext={handleTocNext}
              onBack={() => setCurrentStep('input')}
            />
          )}
          
          {currentStep === 'report' && (
            <ReportStep
              categories={categories}
              onBack={() => setCurrentStep('toc')}
              onReset={handleReset}
            />
          )}
        </div>
      </main>

      <footer className="border-t border-border py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 AI Daily Digest • Executive Intelligence Tool</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
