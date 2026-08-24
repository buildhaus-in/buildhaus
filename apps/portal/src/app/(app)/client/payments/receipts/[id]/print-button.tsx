"use client";
import { Button } from "@buildhaus/ui";

export function PrintButton() {
  return (
    <Button variant="primary" className="print:hidden" onClick={() => window.print()}>
      Print / Save as PDF
    </Button>
  );
}
