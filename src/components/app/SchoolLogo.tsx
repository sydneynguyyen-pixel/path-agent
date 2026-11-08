import bayview from "@/assets/bayview-logo.png";
import northgate from "@/assets/northgate-logo.png";
import { cn } from "@/lib/utils";

export function SchoolLogo({ school, className }: { school: "bayview" | "northgate"; className?: string }) {
  return (
    <img
      src={school === "bayview" ? bayview : northgate}
      alt={school === "bayview" ? "Bayview Community College logo (fictional)" : "Northgate State University logo (fictional)"}
      width={160}
      height={160}
      className={cn("size-8 object-contain", className)}
    />
  );
}
