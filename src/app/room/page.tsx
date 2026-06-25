import type { Metadata } from "next";
import { RoomApp } from "@/components/room/RoomApp";

export const metadata: Metadata = {
  title: "Coach Pulse — Role-Play Room",
};

export default function RoomPage() {
  return <RoomApp />;
}
