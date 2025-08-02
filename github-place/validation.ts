import { BOARD_SIZE, PALETTE } from "./main.tsx";

export function isValidColor(color: string): boolean {
  return PALETTE.includes(color.toLowerCase());
}

export function isValidCoordinate(coord: string): boolean {
  const num = parseInt(coord, 10);
  return !isNaN(num) && num >= 0 && num < BOARD_SIZE;
}