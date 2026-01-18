import { SessionStatus } from '@trinetra/shared';

interface StatusBadgeProps {
  status: SessionStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<SessionStatus, { label: string; className: string }> = {
  [SessionStatus.RUNNING]: {
    label: 'Running',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  [SessionStatus.IDLE]: {
    label: 'Idle',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
  [SessionStatus.ERROR]: {
    label: 'Error',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  [SessionStatus.EXITED]: {
    label: 'Exited',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig[SessionStatus.IDLE];

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.className} ${sizeClasses}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === SessionStatus.RUNNING ? 'bg-green-400 animate-pulse' : 'bg-current'
        }`}
      />
      {config.label}
    </span>
  );
}
