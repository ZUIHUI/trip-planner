import React from 'react';
import { ChevronRight, Circle } from 'lucide-react';

const TaskSummaryBody = ({ pendingTasks, emptyText, limit }) => (
  pendingTasks.length ? (
    <ul>
      {pendingTasks.slice(0, limit).map((item, index) => (
        <li key={item.id || `${item.text}-${index}`}>
          <Circle size={15} aria-hidden="true" />
          <span>{item.text || '未命名待辦'}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="tp-v4-panel-checklist-empty">{emptyText}</p>
  )
);

const TripTaskSummary = ({
  tasks = [],
  pendingTasks = tasks.filter((item) => !item.done),
  completedCount = tasks.filter((item) => item.done).length,
  title = '出發前待辦',
  eyebrow = 'PRE-TRIP',
  emptyText = '尚未建立行前待辦。',
  onViewAll,
  limit = 4,
  collapsible = false,
  className = ''
}) => {
  const percent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;
  const content = (
    <>
      <div
        className="tp-v4-panel-progress"
        role="progressbar"
        aria-label={`${title}完成度`}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>

      <TaskSummaryBody pendingTasks={pendingTasks} emptyText={emptyText} limit={limit} />

      {onViewAll && (
        <button type="button" className="tp-v4-panel-link" onClick={onViewAll}>
          查看全部
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      )}
    </>
  );

  if (collapsible) {
    return (
      <details className={`tp-trip-task-summary tp-v4-panel-checklist ${className}`.trim()}>
        <summary>
          <span><small>{eyebrow}</small><strong>{title}</strong></span>
          <b>{pendingTasks.length} 項未完成</b>
        </summary>
        <div className="tp-trip-task-summary-body">{content}</div>
      </details>
    );
  }

  return (
    <section className={`tp-trip-task-summary tp-v4-panel-checklist ${className}`.trim()} aria-label={`${title}摘要`}>
      <div className="tp-v4-panel-section-heading">
        <div>
          <span>{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        <strong>{completedCount} / {tasks.length}</strong>
      </div>
      {content}
    </section>
  );
};

export default TripTaskSummary;
