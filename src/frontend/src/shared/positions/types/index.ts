/**
 * Position Types
 * Matches backend ViewPositionDto
 */

export interface Position {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  color?: string;
  displayOrder: number;
}
