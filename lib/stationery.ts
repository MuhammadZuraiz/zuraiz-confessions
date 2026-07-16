export type StationeryId = "cream" | "rose" | "midnight";

export type Stationery = {
  id: StationeryId;
  label: string;
  /** Swatch colors for the picker button. */
  paper: string;
  ink: string;
  /** Class applied to a .sheet to retheme it (empty = default cream). */
  className: string;
};

export const STATIONERY: Stationery[] = [
  { id: "cream", label: "Cream", paper: "#fbf7ec", ink: "#2a3350", className: "" },
  { id: "rose", label: "Dusty rose", paper: "#f8e9e5", ink: "#4a2f38", className: "sheet--rose" },
  { id: "midnight", label: "Midnight", paper: "#252b45", ink: "#e9e4d8", className: "sheet--midnight" },
];

export function getStationery(id: string | null | undefined): Stationery {
  return STATIONERY.find((s) => s.id === id) ?? STATIONERY[0];
}
