// Shared SVG icons. Sized via Tailwind classes passed as props.
// Each icon is a tiny presentational component — keeps feature components clean.

type IconProps = { className?: string };

const baseProps = {
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
} as const;

export const PlusIcon = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg className={className} {...baseProps}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

export const CloseIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg className={className} {...baseProps}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export const CheckIcon = ({ className = 'w-5 h-5' }: IconProps) => (
  <svg className={className} {...baseProps}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export const TrashIcon = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg className={className} {...baseProps}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export const EditIcon = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg className={className} {...baseProps}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);

export const PauseIcon = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg className={className} {...baseProps}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
  </svg>
);

export const PlayIcon = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg className={className} {...baseProps}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
    />
  </svg>
);

export const HistoryIcon = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg className={className} {...baseProps}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export const MicIcon = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg className={className} {...baseProps}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 11a7 7 0 01-14 0m7 7v3m-3 0h6m-3-6a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z"
    />
  </svg>
);

export const KeyboardIcon = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg className={className} {...baseProps}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm4 2h.01M11 10h.01M15 10h.01M17 10h.01M7 14h10"
    />
  </svg>
);

export const TouchIcon = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg className={className} {...baseProps}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122"
    />
  </svg>
);

export const ErrorIcon = ({ className = 'w-4 h-4' }: IconProps) => (
  <svg className={className} fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

export const Spinner = ({ className = 'w-5 h-5 border-2 border-slate-600 border-t-blue-500' }: IconProps) => (
  <div className={`${className} rounded-full animate-spin`} />
);

// How a task/completion/command entered the system.
export const SourceIcon = ({ via, className }: { via: 'voice' | 'text' | 'ui'; className?: string }) => {
  if (via === 'voice') return <MicIcon className={className} />;
  if (via === 'text') return <KeyboardIcon className={className} />;
  return <TouchIcon className={className} />;
};
