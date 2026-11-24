import type { Table } from "@/types";

export type TableLayout = { table: Table; x: number; y: number; radius: number };

export const SEAT_RADIUS = 16;
const SEAT_GAP = 26;
const COLUMN_MIN = 210;
const HEADER = 48;

/** Distribuye las mesas en una cuadrícula que se adapta al ancho disponible. */
export function layoutTables(tables: Table[], width: number) {
  const columns = Math.max(1, Math.min(tables.length || 1, Math.floor(width / COLUMN_MIN)));
  const base = Math.max(36, Math.min(62, width / columns / 4.6));
  // Las mesas grandes crecen para que los asientos no se solapen.
  const radiusOf = (table: Table) => Math.max(base, (table.capacity * (SEAT_RADIUS * 2 + 6)) / (2 * Math.PI) - SEAT_GAP);
  const largest = tables.reduce((max, table) => Math.max(max, radiusOf(table)), base);
  const rowHeight = largest * 2 + SEAT_GAP * 2 + SEAT_RADIUS * 2 + 44;
  const rows = Math.ceil(tables.length / columns);
  const layouts: TableLayout[] = tables.map((table, index) => ({
    table,
    x: (width * ((index % columns) + 0.5)) / columns,
    y: HEADER + rowHeight * (Math.floor(index / columns) + 0.5),
    radius: radiusOf(table)
  }));
  return { layouts, height: HEADER + rows * rowHeight + 56 };
}

export function seatPosition(layout: TableLayout, seat: number): [number, number] {
  const angle = -Math.PI / 2 + (seat * 2 * Math.PI) / Math.max(layout.table.capacity, 1);
  const distance = layout.radius + SEAT_GAP;
  return [layout.x + Math.cos(angle) * distance, layout.y + Math.sin(angle) * distance];
}

/** Radio dentro del cual se considera que algo se suelta sobre la mesa. */
export const dropRadius = (layout: TableLayout) => layout.radius + SEAT_GAP + SEAT_RADIUS + 14;
