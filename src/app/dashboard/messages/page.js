"use client";
import { Suspense } from "react";
import MessagesPanel from "@/components/app/messages-panel";

export default function MemberMessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesPanel basePath="/dashboard/messages" />
    </Suspense>
  );
}
