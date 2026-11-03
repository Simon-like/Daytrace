"use client";

import { MobileSearch } from "../../components/mobile-search";

export function OwnerSearch({ initialQuery = "" }: { readonly initialQuery?: string }) {
  return <MobileSearch initialQuery={initialQuery} scope="owner" />;
}
