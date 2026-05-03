import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  titleClassName,
  descriptionClassName,
  children,
}: PageHeaderProps) {
  const inner = (
    <div>
      <h1 className={`${titleClassName ?? 'text-3xl'} font-semibold tracking-tight text-slate-950`}>
        {title}
      </h1>
      {description && (
        <p className={descriptionClassName ?? 'mt-2 text-sm text-slate-600'}>{description}</p>
      )}
    </div>
  );

  if (children) {
    return (
      <div className="flex items-center justify-between">
        {inner}
        {children}
      </div>
    );
  }

  return inner;
}
