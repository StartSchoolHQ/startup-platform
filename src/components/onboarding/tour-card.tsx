"use client";

import type { CardComponentProps } from "onborda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { useOnborda } from "onborda";
import { markTourCompleted } from "@/components/onboarding/tours";

export function TourCard({
  step,
  currentStep,
  totalSteps,
  nextStep,
  prevStep,
  arrow,
}: CardComponentProps) {
  const { closeOnborda, currentTour } = useOnborda();
  const isLastStep = currentStep === totalSteps - 1;

  function handleNext() {
    if (isLastStep) {
      if (currentTour) {
        markTourCompleted(currentTour);
      }
      closeOnborda();
    } else {
      nextStep();
    }
  }

  return (
    <Card className="w-[320px] shadow-lg border-primary/30">
      <CardHeader className="pb-2 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step.icon && <span className="text-lg">{step.icon}</span>}
            <CardTitle className="text-base font-semibold">
              {step.title}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => closeOnborda()}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-muted-foreground mb-4">{step.content}</div>
        <div className="flex items-center justify-between">
          <div>
            {currentStep > 0 && (
              <Button variant="ghost" size="sm" onClick={prevStep}>
                Back
              </Button>
            )}
          </div>
          <Button size="sm" onClick={handleNext}>
            {isLastStep ? "Got it!" : "Next"}
          </Button>
        </div>
      </CardContent>
      {arrow}
    </Card>
  );
}
