"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { refreshGa4 } from "@/app/actions";

export function RefreshButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await refreshGa4();
          router.refresh();
        });
      }}
    >
      {isPending ? "Refreshing…" : "Refresh"}
    </Button>
  );
}
