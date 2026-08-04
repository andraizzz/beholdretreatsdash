"use server";

import { updateTag } from "next/cache";

export async function refreshGa4() {
  updateTag("ga4");
}
