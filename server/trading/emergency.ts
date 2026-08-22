import type { PositionSide } from "../../shared/trading";
import { calculatePaperPnl } from "./engine";

export type EmergencyCloseCandidate = {
  id: number;
  side: PositionSide;
  entryPrice: string | number;
  markPrice: string | number;
  quantity: string | number;
};

/** Normalizes every selected paper position to a single, auditable emergency-close outcome. */
export function createEmergencyCloseOutcomes(candidates: EmergencyCloseCandidate[]) {
  return candidates.map((position) => ({
    id: position.id,
    realizedPnl: calculatePaperPnl(
      position.side,
      Number(position.entryPrice),
      Number(position.markPrice),
      Number(position.quantity),
    ),
    closeReason: "manual_emergency_close" as const,
  }));
}
