"use client";
import { Suspense } from "react";
import MessagesPanel from "@/components/app/messages-panel";

export default function AdminMessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesPanel basePath="/admin/messages" />
    </Suspense>
  );
}
