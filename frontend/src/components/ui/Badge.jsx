import clsx from 'clsx';

const VARIANTS = {
  published: 'badge-published',
  draft:     'badge-draft',
  closed:    'badge-closed',
  academic:  'badge-academic',
  simple:    'badge-simple',
  default:   'badge bg-surface-variant text-on-surface-variant',
};

export default function Badge({ variant = 'default', children, className }) {
  return (
    <span className={clsx(VARIANTS[variant] ?? VARIANTS.default, className)}>
      {children}
    </span>
  );
}
