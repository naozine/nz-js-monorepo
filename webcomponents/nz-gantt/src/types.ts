/**
 * Core types and interfaces for the Gantt chart component
 */

export type Scale = 'day' | 'week' | 'month';

export interface TaskData {
  id: string;
  name: string;
  duration: number;
  assignee?: string;
  dependsOn: string[];
  barColor?: string;
  textColor?: string;
}

export interface AnchorData {
  task: string;
  day: number;
  date: string; // YYYY-MM-DD
}

export interface HolidayData {
  date: string; // YYYY-MM-DD
  label?: string;
}

export interface ClosedPeriodData {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  label?: string;
}

export interface WorkdayData {
  date: string; // YYYY-MM-DD
  label?: string;
}

export interface CalendarData {
  holidays: HolidayData[];
  closedPeriods: ClosedPeriodData[];
  workdays: WorkdayData[];
}

export interface ScheduledTask {
  id: string;
  name: string;
  duration: number;
  assignee?: string;
  startDate: Date; // Calculated start date
  endDate: Date; // Calculated end date
  dependsOn: string[];
  barColor?: string;
  textColor?: string;
}

export interface DependencyGraph {
  nodes: Set<string>;
  edges: Map<string, Set<string>>; // task ID -> set of dependent task IDs
  reverseEdges: Map<string, Set<string>>; // task ID -> set of dependency task IDs
}

export interface GanttChartConfig {
  scale: Scale;
  firstDay?: string; // YYYY-MM-DD
  workingDays: string[]; // Japanese weekday names
  locale: string;
  timezone: string;
}

// Day of week mapping (Japanese to number)
export const JAPANESE_WEEKDAYS: { [key: string]: number } = {
  '日': 0,
  '月': 1,
  '火': 2,
  '水': 3,
  '木': 4,
  '金': 5,
  '土': 6,
};

export const WEEKDAY_NAMES_JA = ['日', '月', '火', '水', '木', '金', '土'];
