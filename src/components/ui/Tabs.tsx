'use client';

import { clsx } from 'clsx';
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  defaultTabId?: string;
  className?: string;
}

export function Tabs({ items, defaultTabId, className }: TabsProps) {
  const baseId = useId();
  const enabledItems = items.filter((item) => !item.disabled);
  const [activeId, setActiveId] = useState(defaultTabId ?? enabledItems[0]?.id);

  function focusTab(index: number) {
    const target = enabledItems[index];
    if (!target) return;
    setActiveId(target.id);
    document.getElementById(`${baseId}-tab-${target.id}`)?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = enabledItems.findIndex((item) => item.id === activeId);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusTab((currentIndex + 1) % enabledItems.length);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusTab((currentIndex - 1 + enabledItems.length) % enabledItems.length);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusTab(enabledItems.length - 1);
    }
  }

  return (
    <div className={className}>
      <div role="tablist" aria-orientation="horizontal" onKeyDown={handleKeyDown} className="flex gap-2 border-b border-line">
        {items.map((item) => {
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              id={`${baseId}-tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              onClick={() => setActiveId(item.id)}
              className={clsx(
                'px-4 py-2 text-sm font-medium transition-colors duration-[var(--motion-fast)]',
                selected ? 'border-b-2 border-patina text-obsidian' : 'text-graphite hover:text-obsidian',
                item.disabled && 'cursor-not-allowed text-graphite/40',
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          id={`${baseId}-panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== activeId}
          className="pt-4"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
