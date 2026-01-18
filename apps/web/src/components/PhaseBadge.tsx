import { SessionPhase } from '@trinetra/shared';

interface PhaseBadgeProps {
  phase?: SessionPhase;
  size?: 'sm' | 'md' | 'lg';
}

const phaseConfig: Record<SessionPhase, { label: string; className: string }> = {
  [SessionPhase.BUILDING]: {
    label: 'Building',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  },
  [SessionPhase.TESTING]: {
    label: 'Testing',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  },
  [SessionPhase.CODING]: {
    label: 'Coding',
    className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
  [SessionPhase.IDLE]: {
    label: 'Idle',
    className: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  },
  [SessionPhase.WAITING]: {
    label: 'Waiting',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  [SessionPhase.ERROR]: {
    label: 'Error',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

export default function PhaseBadge({ phase, size = 'sm' }: PhaseBadgeProps) {
  if (!phase) return null;

  const config = phaseConfig[phase] || phaseConfig[SessionPhase.IDLE];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-lg font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.className} ${sizeClasses}`}
    >
      {config.label}
    </span>
  );
}
