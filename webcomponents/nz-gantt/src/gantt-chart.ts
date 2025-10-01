import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { GanttScheduler } from './scheduler.js';
import {
  TaskData,
  AnchorData,
  CalendarData,
  ScheduledTask,
  Scale,
  WEEKDAY_NAMES_JA,
} from './types.js';

/**
 * Child element: <depends-on>
 */
@customElement('depends-on')
export class DependsOnElement extends LitElement {
  @property({ type: String }) task = '';

  render() {
    return html``;
  }
}

/**
 * Child element: <gantt-task>
 */
@customElement('gantt-task')
export class GanttTaskElement extends LitElement {
  @property({ type: String }) id = '';
  @property({ type: String }) name = '';
  @property({ type: Number }) duration = 0;
  @property({ type: String }) assignee = '';
  @property({ type: String, attribute: 'bar-color' }) barColor = '';
  @property({ type: String, attribute: 'text-color' }) textColor = '';

  render() {
    return html`<slot></slot>`;
  }

  getTaskData(): TaskData {
    const dependsOnElements = Array.from(
      this.querySelectorAll('depends-on')
    ) as DependsOnElement[];

    return {
      id: this.id,
      name: this.name,
      duration: this.duration,
      assignee: this.assignee,
      dependsOn: dependsOnElements.map((el) => el.task).filter((t) => t),
      barColor: this.barColor || undefined,
      textColor: this.textColor || undefined,
    };
  }
}

/**
 * Child element: <gantt-holiday>
 */
@customElement('gantt-holiday')
export class HolidayElement extends LitElement {
  @property({ type: String }) date = '';
  @property({ type: String }) label = '';

  render() {
    return html``;
  }
}

/**
 * Child element: <gantt-closed>
 */
@customElement('gantt-closed')
export class ClosedElement extends LitElement {
  @property({ type: String }) from = '';
  @property({ type: String }) to = '';
  @property({ type: String }) label = '';

  render() {
    return html``;
  }
}

/**
 * Child element: <gantt-workday>
 */
@customElement('gantt-workday')
export class WorkdayElement extends LitElement {
  @property({ type: String }) date = '';
  @property({ type: String }) label = '';

  render() {
    return html``;
  }
}

/**
 * Child element: <gantt-calendar>
 */
@customElement('gantt-calendar')
export class GanttCalendarElement extends LitElement {
  render() {
    return html`<slot></slot>`;
  }

  getCalendarData(): CalendarData {
    const holidays = Array.from(this.querySelectorAll('gantt-holiday')) as HolidayElement[];
    const closedPeriods = Array.from(this.querySelectorAll('gantt-closed')) as ClosedElement[];
    const workdays = Array.from(this.querySelectorAll('gantt-workday')) as WorkdayElement[];

    return {
      holidays: holidays.map((h) => ({ date: h.date, label: h.label })),
      closedPeriods: closedPeriods.map((c) => ({ from: c.from, to: c.to, label: c.label })),
      workdays: workdays.map((w) => ({ date: w.date, label: w.label })),
    };
  }
}

/**
 * Child element: <gantt-anchor>
 */
@customElement('gantt-anchor')
export class AnchorElement extends LitElement {
  @property({ type: String }) task = '';
  @property({ type: Number }) day = 1;
  @property({ type: String }) date = '';

  render() {
    return html``;
  }
}

/**
 * Child element: <gantt-anchors>
 */
@customElement('gantt-anchors')
export class GanttAnchorsElement extends LitElement {
  render() {
    return html`<slot></slot>`;
  }

  getAnchors(): AnchorData[] {
    const anchors = Array.from(this.querySelectorAll('gantt-anchor')) as AnchorElement[];
    return anchors.map((a) => ({
      task: a.task,
      day: a.day,
      date: a.date,
    }));
  }
}

/**
 * Main component: <gantt-chart>
 */
@customElement('gantt-chart')
export class GanttChartElement extends LitElement {
  @property({ type: String }) scale: Scale = 'day';
  @property({ type: String, attribute: 'first-day' }) firstDay = '';
  @property({ type: String, attribute: 'working-days' }) workingDays = '月,火,水,木,金';
  @property({ type: String }) locale = 'ja-JP';
  @property({ type: String }) timezone = 'Asia/Tokyo';
  @property({ type: Boolean, attribute: 'show-non-working-days' }) showNonWorkingDays = false;

  @state() private scheduledTasks: ScheduledTask[] = [];
  @state() private error: string | null = null;
  @state() private displayDates: Date[] = [];
  @state() private scheduler: GanttScheduler | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: sans-serif;
      overflow-x: auto;
    }

    .error {
      color: red;
      padding: 16px;
      background: #fee;
      border: 1px solid red;
      border-radius: 4px;
      margin: 16px;
    }

    .gantt-container {
      display: inline-block;
      min-width: 100%;
    }

    .gantt-grid {
      display: grid;
      grid-template-columns: auto auto 1fr;
      border: 1px solid #ccc;
      background: white;
    }

    .header-row {
      display: contents;
    }

    .cell {
      border: 1px solid #ddd;
      padding: 4px 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      min-height: 32px;
      box-sizing: border-box;
    }

    .row-header-cell {
      background: #f5f5f5;
      font-weight: 600;
      justify-content: flex-start;
      padding: 4px 12px;
      white-space: nowrap;
    }

    .row-detail-cell {
      background: #f5f5f5;
      font-weight: normal;
      justify-content: flex-start;
      padding: 4px 12px;
      white-space: nowrap;
    }

    .col-header-cell {
      background: #e8f4f8;
      font-weight: 500;
      font-size: 0.9em;
    }

    .col-header-month {
      background: #d0e8f0;
      font-weight: 600;
    }

    .col-header-weekday {
      font-size: 0.85em;
    }

    .weekday-saturday {
      color: blue;
    }

    .weekday-sunday {
      color: red;
    }

    .weekend {
      background: #f9f9f9;
    }

    .holiday {
      background: #ffe0e0;
    }

    .task-grid {
      display: grid;
      position: relative;
      gap: 0;
    }

    .task-cell {
      border-right: 1px solid #eee;
      min-width: 32px;
      min-height: 32px;
      box-sizing: border-box;
      position: relative;
      overflow: visible;
    }

    .non-working-day {
      background: #f0f0f0;
      opacity: 0.6;
    }

    .task-bar {
      background: #4a90e2;
      height: 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      padding: 0 4px;
      color: white;
      font-size: 0.8em;
      white-space: nowrap;
      overflow: visible;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      position: relative;
      z-index: 10;
    }

    .milestone {
      width: 12px;
      height: 12px;
      background: #e74c3c;
      transform: rotate(45deg);
      margin: auto;
    }
  `;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);
    this.scheduleChart();
  }

  private scheduleChart() {
    try {
      // Collect tasks
      const taskElements = Array.from(
        this.querySelectorAll('gantt-task')
      ) as GanttTaskElement[];
      const tasks = taskElements.map((el) => el.getTaskData());

      // Collect calendar
      const calendarElement = this.querySelector('gantt-calendar') as GanttCalendarElement | null;
      const calendar: CalendarData = calendarElement
        ? calendarElement.getCalendarData()
        : { holidays: [], closedPeriods: [], workdays: [] };

      // Collect anchors
      const anchorsElement = this.querySelector('gantt-anchors') as GanttAnchorsElement | null;
      if (!anchorsElement) {
        throw new Error('Missing <gantt-anchors> element');
      }
      const anchors = anchorsElement.getAnchors();

      if (anchors.length === 0) {
        throw new Error('At least one anchor is required');
      }

      // Parse working days
      const workingDaysList = this.workingDays.split(',').map((d) => d.trim());

      // Create scheduler and schedule tasks
      this.scheduler = new GanttScheduler(workingDaysList, calendar);
      this.scheduledTasks = this.scheduler.schedule(tasks, anchors);

      // Calculate display range
      this.calculateDisplayRange(this.scheduler);

      this.error = null;
    } catch (err) {
      this.error = err instanceof Error ? err.message : String(err);
      console.error('Gantt chart error:', err);
    }
  }

  private calculateDisplayRange(scheduler: GanttScheduler) {
    if (this.scheduledTasks.length === 0) {
      this.displayDates = [];
      return;
    }

    // Find min and max dates
    let minDate = this.scheduledTasks[0].startDate;
    let maxDate = this.scheduledTasks[0].endDate;

    this.scheduledTasks.forEach((task) => {
      if (task.startDate < minDate) minDate = task.startDate;
      if (task.endDate > maxDate) maxDate = task.endDate;
    });

    // Add some padding (7 days before and after)
    const paddedStart = new Date(minDate);
    paddedStart.setDate(paddedStart.getDate() - 7);
    const paddedEnd = new Date(maxDate);
    paddedEnd.setDate(paddedEnd.getDate() + 7);

    // Generate dates in range
    const dates: Date[] = [];
    const current = new Date(paddedStart);
    while (current <= paddedEnd) {
      if (this.showNonWorkingDays || scheduler.isWorkingDay(current)) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    this.displayDates = dates;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getMonthLabel(date: Date): string {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }

  private renderColumnHeaders() {
    if (this.displayDates.length === 0) return html``;

    // Group by month for first row
    const monthGroups: { label: string; span: number }[] = [];
    let currentMonth = '';

    this.displayDates.forEach((date) => {
      const monthLabel = this.getMonthLabel(date);
      if (monthLabel !== currentMonth) {
        currentMonth = monthLabel;
        monthGroups.push({ label: monthLabel, span: 1 });
      } else {
        monthGroups[monthGroups.length - 1].span++;
      }
    });

    return html`
      <!-- Month row -->
      <div class="cell row-header-cell" style="grid-row: span 3;">担当者</div>
      <div class="cell row-header-cell" style="grid-row: span 3;">タスク名</div>
      <div style="display: grid; grid-template-columns: repeat(${this.displayDates.length}, 1fr);">
        ${monthGroups.map(
          (group) => html`
            <div
              class="cell col-header-cell col-header-month"
              style="grid-column: span ${group.span};"
            >
              ${group.span >= 4 ? group.label : ''}
            </div>
          `
        )}
      </div>

      <!-- Day row -->
      <div style="display: grid; grid-template-columns: repeat(${this.displayDates.length}, 1fr);">
        ${this.displayDates.map(
          (date) => {
            const isNonWorking = this.scheduler && !this.scheduler.isWorkingDay(date);
            return html`
              <div class="cell col-header-cell ${isNonWorking ? 'non-working-day' : ''}">
                ${String(date.getDate()).padStart(2, '0')}
              </div>
            `;
          }
        )}
      </div>

      <!-- Weekday row -->
      <div style="display: grid; grid-template-columns: repeat(${this.displayDates.length}, 1fr);">
        ${this.displayDates.map(
          (date) => {
            const isNonWorking = this.scheduler && !this.scheduler.isWorkingDay(date);
            const dayOfWeek = date.getDay();
            const weekdayClass = dayOfWeek === 6 ? 'weekday-saturday' : dayOfWeek === 0 ? 'weekday-sunday' : '';
            return html`
              <div class="cell col-header-cell col-header-weekday ${isNonWorking ? 'non-working-day' : ''} ${weekdayClass}">
                ${WEEKDAY_NAMES_JA[date.getDay()]}
              </div>
            `;
          }
        )}
      </div>
    `;
  }

  private renderTaskRow(task: ScheduledTask, assigneeRowSpan: number, showAssignee: boolean) {
    const dateToIndex = new Map<string, number>();
    this.displayDates.forEach((date, idx) => {
      dateToIndex.set(this.formatDate(date), idx);
    });

    const taskCells = this.displayDates.map((date) => {
      const dateStr = this.formatDate(date);
      const taskStart = this.formatDate(task.startDate);
      const taskEnd = this.formatDate(task.endDate);
      const isNonWorking = this.scheduler && !this.scheduler.isWorkingDay(date);

      let content = null;
      if (dateStr >= taskStart && dateStr <= taskEnd) {
        if (task.duration === 0) {
          // Milestone
          content = html`<div class="milestone"></div>`;
        } else if (dateStr === taskStart) {
          // Calculate span
          const startIdx = dateToIndex.get(taskStart)!;
          const endIdx = dateToIndex.get(taskEnd)!;
          const span = endIdx - startIdx + 1;

          // Build inline style for task bar with custom colors
          const barStyles = ['width: 100%;'];
          if (task.barColor) {
            barStyles.push(`background: ${task.barColor};`);
          }
          if (task.textColor) {
            barStyles.push(`color: ${task.textColor};`);
          }
          const barStyleString = barStyles.join(' ');

          return html`
            <div class="cell task-cell ${isNonWorking ? 'non-working-day' : ''}" style="grid-column: span ${span};">
              <div class="task-bar" style="${barStyleString}">${task.name}</div>
            </div>
          `;
        } else {
          // Skip cells covered by span
          return null;
        }
      }

      return html`
        <div class="cell task-cell ${isNonWorking ? 'non-working-day' : ''}">
          ${content}
        </div>
      `;
    });

    return html`
      ${showAssignee ? html`<div class="cell row-detail-cell" style="grid-row: span ${assigneeRowSpan};">${task.assignee || ''}</div>` : null}
      <div class="cell row-detail-cell">${task.name}</div>
      <div style="display: grid; grid-template-columns: repeat(${this.displayDates.length}, 1fr);">
        ${taskCells}
      </div>
    `;
  }

  render() {
    if (this.error) {
      return html`
        <div class="error">
          <strong>Error:</strong> ${this.error}
        </div>
      `;
    }

    if (this.scheduledTasks.length === 0) {
      return html`<div style="padding: 16px;">No tasks to display</div>`;
    }

    // Calculate assignee row spans
    const taskRowData: Array<{ task: ScheduledTask; assigneeRowSpan: number; showAssignee: boolean }> = [];

    for (let i = 0; i < this.scheduledTasks.length; i++) {
      const task = this.scheduledTasks[i];
      const assignee = task.assignee || '';

      // Check if this is the start of a new assignee group
      if (i === 0 || (this.scheduledTasks[i - 1].assignee || '') !== assignee) {
        // Count consecutive rows with same assignee
        let span = 1;
        for (let j = i + 1; j < this.scheduledTasks.length; j++) {
          if ((this.scheduledTasks[j].assignee || '') === assignee) {
            span++;
          } else {
            break;
          }
        }
        taskRowData.push({ task, assigneeRowSpan: span, showAssignee: true });
      } else {
        // This row is part of the previous assignee group
        taskRowData.push({ task, assigneeRowSpan: 1, showAssignee: false });
      }
    }

    return html`
      <div class="gantt-container">
        <div class="gantt-grid">
          ${this.renderColumnHeaders()}
          ${taskRowData.map((data) => this.renderTaskRow(data.task, data.assigneeRowSpan, data.showAssignee))}
        </div>
      </div>
      <slot></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gantt-chart': GanttChartElement;
    'gantt-task': GanttTaskElement;
    'gantt-calendar': GanttCalendarElement;
    'gantt-anchors': GanttAnchorsElement;
    'depends-on': DependsOnElement;
    'gantt-anchor': AnchorElement;
    'gantt-holiday': HolidayElement;
    'gantt-closed': ClosedElement;
    'gantt-workday': WorkdayElement;
  }
}
