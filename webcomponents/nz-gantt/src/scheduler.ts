/**
 * Scheduler for Gantt chart tasks with anchor-based positioning
 */

import {
  TaskData,
  AnchorData,
  CalendarData,
  ScheduledTask,
  DependencyGraph,
  JAPANESE_WEEKDAYS,
} from './types.js';

export class GanttScheduler {
  private workingDayNumbers: Set<number>;
  private holidays: Set<string>; // YYYY-MM-DD format
  private workdays: Set<string>; // YYYY-MM-DD format (exception working days)

  constructor(
    workingDays: string[], // Japanese weekday names
    calendar: CalendarData
  ) {
    // Convert Japanese weekday names to day numbers
    this.workingDayNumbers = new Set(
      workingDays.map((day) => JAPANESE_WEEKDAYS[day]).filter((n) => n !== undefined)
    );

    // Build holiday set
    this.holidays = new Set();
    calendar.holidays.forEach((h) => this.holidays.add(h.date));

    // Add closed periods to holidays
    calendar.closedPeriods.forEach((period) => {
      const from = new Date(period.from);
      const to = new Date(period.to);
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        this.holidays.add(this.formatDate(d));
      }
    });

    // Build workday exception set (overrides holidays)
    this.workdays = new Set(calendar.workdays.map((w) => w.date));
  }

  /**
   * Check if a date is a working day
   */
  isWorkingDay(date: Date): boolean {
    const dateStr = this.formatDate(date);

    // Priority 1: Workday exception (forced working day)
    if (this.workdays.has(dateStr)) {
      return true;
    }

    // Priority 2: Holiday or closed period (forced non-working)
    if (this.holidays.has(dateStr)) {
      return false;
    }

    // Priority 3: Working days pattern
    const dayOfWeek = date.getDay();
    return this.workingDayNumbers.has(dayOfWeek);
  }

  /**
   * Add n working days to a date
   */
  addWorkingDays(date: Date, days: number): Date {
    const result = new Date(date);
    let remaining = days;

    if (days > 0) {
      while (remaining > 0) {
        result.setDate(result.getDate() + 1);
        if (this.isWorkingDay(result)) {
          remaining--;
        }
      }
    } else if (days < 0) {
      while (remaining < 0) {
        result.setDate(result.getDate() - 1);
        if (this.isWorkingDay(result)) {
          remaining++;
        }
      }
    }

    return result;
  }

  /**
   * Get the next working day (or the same day if it's already a working day)
   */
  getNextWorkingDay(date: Date): Date {
    const result = new Date(date);
    while (!this.isWorkingDay(result)) {
      result.setDate(result.getDate() + 1);
    }
    return result;
  }

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Parse YYYY-MM-DD date string
   */
  parseDate(dateStr: string): Date {
    return new Date(dateStr + 'T00:00:00');
  }

  /**
   * Build dependency graph
   */
  buildDependencyGraph(tasks: TaskData[]): DependencyGraph {
    const graph: DependencyGraph = {
      nodes: new Set(),
      edges: new Map(),
      reverseEdges: new Map(),
    };

    // Add all task nodes
    tasks.forEach((task) => {
      graph.nodes.add(task.id);
      graph.edges.set(task.id, new Set());
      graph.reverseEdges.set(task.id, new Set());
    });

    // Add edges (dependency -> dependent)
    tasks.forEach((task) => {
      task.dependsOn.forEach((depId) => {
        if (!graph.nodes.has(depId)) {
          throw new Error(`Task ${task.id} depends on unknown task ${depId}`);
        }
        graph.edges.get(depId)!.add(task.id);
        graph.reverseEdges.get(task.id)!.add(depId);
      });
    });

    return graph;
  }

  /**
   * Detect cycles in dependency graph using DFS
   */
  detectCycles(graph: DependencyGraph): string[] | null {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): boolean => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const children = graph.edges.get(node) || new Set();
      for (const child of children) {
        if (!visited.has(child)) {
          if (dfs(child)) {
            return true;
          }
        } else if (recStack.has(child)) {
          // Found cycle
          const cycleStart = path.indexOf(child);
          return true;
        }
      }

      path.pop();
      recStack.delete(node);
      return false;
    };

    for (const node of graph.nodes) {
      if (!visited.has(node)) {
        if (dfs(node)) {
          return path;
        }
      }
    }

    return null;
  }

  /**
   * Calculate start date from anchor
   * anchor.day is 1-based (1 = first working day of task)
   */
  calculateStartFromAnchor(anchor: AnchorData): Date {
    const anchorDate = this.parseDate(anchor.date);

    if (anchor.day === 1) {
      // The anchor date itself is the start date (must be working day)
      if (!this.isWorkingDay(anchorDate)) {
        throw new Error(
          `Anchor for task ${anchor.task} at day 1 points to non-working day ${anchor.date}`
        );
      }
      return anchorDate;
    } else if (anchor.day > 1) {
      // Go back (day - 1) working days
      return this.addWorkingDays(anchorDate, -(anchor.day - 1));
    } else {
      throw new Error(`Invalid anchor day ${anchor.day} for task ${anchor.task}. Must be >= 1`);
    }
  }

  /**
   * Calculate end date for a task (last working day of the task)
   */
  calculateEndDate(startDate: Date, duration: number): Date {
    if (duration === 0) {
      // Milestone: end date = start date
      return new Date(startDate);
    }
    // duration days: from day 1 to day duration
    return this.addWorkingDays(startDate, duration - 1);
  }

  /**
   * Schedule tasks based on anchors and dependencies
   */
  schedule(
    tasks: TaskData[],
    anchors: AnchorData[]
  ): ScheduledTask[] {
    // Build dependency graph
    const graph = this.buildDependencyGraph(tasks);

    // Detect cycles
    const cycle = this.detectCycles(graph);
    if (cycle) {
      throw new Error(`Circular dependency detected: ${cycle.join(' -> ')}`);
    }

    // Validate anchors
    for (const anchor of anchors) {
      if (!graph.nodes.has(anchor.task)) {
        throw new Error(`Anchor references unknown task: ${anchor.task}`);
      }
      const task = tasks.find((t) => t.id === anchor.task)!;
      if (task.duration === 0 && anchor.day !== 1) {
        throw new Error(
          `Milestone task ${anchor.task} can only have anchor at day 1, got day ${anchor.day}`
        );
      }
      if (anchor.day < 1 || anchor.day > task.duration) {
        throw new Error(
          `Anchor day ${anchor.day} is out of range for task ${anchor.task} (duration: ${task.duration})`
        );
      }
    }

    // Calculate start dates from anchors
    const startDates = new Map<string, Date>();
    const anchorsByTask = new Map<string, AnchorData[]>();

    anchors.forEach((anchor) => {
      if (!anchorsByTask.has(anchor.task)) {
        anchorsByTask.set(anchor.task, []);
      }
      anchorsByTask.get(anchor.task)!.push(anchor);
    });

    // Process anchors and check for conflicts
    anchorsByTask.forEach((taskAnchors, taskId) => {
      const calculatedStarts: Date[] = [];

      taskAnchors.forEach((anchor) => {
        const start = this.calculateStartFromAnchor(anchor);
        calculatedStarts.push(start);
      });

      // Check all anchors for this task produce the same start date
      const firstStart = this.formatDate(calculatedStarts[0]);
      for (let i = 1; i < calculatedStarts.length; i++) {
        if (this.formatDate(calculatedStarts[i]) !== firstStart) {
          throw new Error(
            `Conflicting anchors for task ${taskId}: produce different start dates`
          );
        }
      }

      startDates.set(taskId, calculatedStarts[0]);
    });

    // Topological sort for dependency propagation
    const sorted: string[] = [];
    const inDegree = new Map<string, number>();

    graph.nodes.forEach((node) => {
      inDegree.set(node, graph.reverseEdges.get(node)!.size);
    });

    const queue: string[] = [];
    inDegree.forEach((degree, node) => {
      if (degree === 0) {
        queue.push(node);
      }
    });

    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);

      graph.edges.get(node)!.forEach((child) => {
        const newDegree = inDegree.get(child)! - 1;
        inDegree.set(child, newDegree);
        if (newDegree === 0) {
          queue.push(child);
        }
      });
    }

    // Propagate constraints through dependencies
    sorted.forEach((taskId) => {
      const task = tasks.find((t) => t.id === taskId)!;
      const dependencies = graph.reverseEdges.get(taskId)!;

      if (dependencies.size === 0) {
        // No dependencies - must have anchor
        if (!startDates.has(taskId)) {
          throw new Error(
            `Task ${taskId} has no dependencies and no anchor - cannot determine position`
          );
        }
      } else {
        // Has dependencies - earliest start is the day after all dependencies finish
        let earliestStart: Date | undefined = undefined;

        for (const depId of dependencies) {
          if (!startDates.has(depId)) {
            throw new Error(`Dependency ${depId} has no start date`);
          }

          const depTask = tasks.find((t) => t.id === depId)!;
          const depStart = startDates.get(depId)!;
          const depEnd = this.calculateEndDate(depStart, depTask.duration);

          // Next working day after dependency ends (FS relationship)
          const nextDay = this.addWorkingDays(depEnd, 1);

          if (!earliestStart || nextDay > earliestStart) {
            earliestStart = nextDay;
          }
        }

        // Combine with anchor constraint if exists
        if (startDates.has(taskId)) {
          const anchorStart = startDates.get(taskId)!;
          if (earliestStart && earliestStart > anchorStart) {
            // Dependency constraint is later than anchor - conflict
            throw new Error(
              `Task ${taskId}: anchor requires start at ${this.formatDate(anchorStart)} ` +
              `but dependencies require start no earlier than ${this.formatDate(earliestStart)}`
            );
          }
          // Use anchor (it's later or equal)
        } else {
          // No anchor, use earliest start from dependencies
          if (!earliestStart) {
            throw new Error(`Task ${taskId} has dependencies but no earliest start could be calculated`);
          }
          startDates.set(taskId, earliestStart);
        }
      }
    });

    // Check all tasks have start dates (reachability)
    const unscheduled = tasks.filter((t) => !startDates.has(t.id));
    if (unscheduled.length > 0) {
      throw new Error(
        `Tasks not reachable from any anchor: ${unscheduled.map((t) => t.id).join(', ')}`
      );
    }

    // Build scheduled tasks
    return tasks.map((task) => {
      const startDate = startDates.get(task.id)!;
      const endDate = this.calculateEndDate(startDate, task.duration);

      return {
        id: task.id,
        name: task.name,
        duration: task.duration,
        assignee: task.assignee,
        startDate,
        endDate,
        dependsOn: task.dependsOn,
        barColor: task.barColor,
        textColor: task.textColor,
      };
    });
  }
}
