export type Color = string; // Hex color string like '#FFFFFF'

export type Alignment = 'left' | 'right' | 'center';

export interface LayoutOptions {
  width: number;
  height?: number;
  padding?: number;
  background?: Color;
}

export interface ColumnConfig {
  weight?: number;
  minWidth?: number;
  maxWidth?: number;
}
