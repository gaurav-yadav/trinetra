// Phase Detector - Detect session phase from terminal output

import { SessionPhase } from '@trinetra/shared';

interface PhasePattern {
  phase: SessionPhase;
  patterns: RegExp[];
  priority: number; // Higher priority takes precedence
}

const phasePatterns: PhasePattern[] = [
  {
    phase: SessionPhase.WAITING,
    patterns: [
      /\[y\/n\]/i,
      /\[Y\/n\]/,
      /\[yes\/no\]/i,
      /continue\?/i,
      /proceed\?/i,
      /Press Enter/i,
      /Press any key/i,
      /\(y\/n\)/i,
      /Confirm\?/i,
      /Are you sure\?/i,
      /Overwrite\?/i,
      /: $/,
      /\? $/,
    ],
    priority: 100,
  },
  {
    phase: SessionPhase.ERROR,
    patterns: [
      /\bFAIL\b/,
      /\bERROR\b/,
      /\berror:/i,
      /\bfailed\b/i,
      /AssertionError/,
      /TypeError/,
      /ReferenceError/,
      /SyntaxError/,
      /ENOENT/,
      /EACCES/,
      /ECONNREFUSED/,
      /Exception/,
      /Traceback/,
      /panic:/,
      /fatal:/i,
      /npm ERR!/,
      /yarn error/i,
    ],
    priority: 90,
  },
  {
    phase: SessionPhase.TESTING,
    patterns: [
      /\btest\b/i,
      /\bjest\b/i,
      /\bpytest\b/i,
      /\bmocha\b/i,
      /\bvitest\b/i,
      /\bPASS\b/,
      /\bFAILED\b/,
      /running tests/i,
      /test suite/i,
      /\bspecs?\b/i,
      /\d+ passing/,
      /\d+ failing/,
      /Test Results/i,
      /===== test session starts =====/,
    ],
    priority: 80,
  },
  {
    phase: SessionPhase.BUILDING,
    patterns: [
      /\bbuild\b/i,
      /\bcompil/i,
      /\bwebpack\b/i,
      /\bvite\b/i,
      /\besbuild\b/i,
      /\brollup\b/i,
      /\btsc\b/,
      /\bparcel\b/i,
      /\bbundl/i,
      /Building\.\.\./i,
      /Compiling\.\.\./i,
      /Starting production build/i,
      /Build succeeded/i,
      /Build failed/i,
      /Generating\.\.\./i,
    ],
    priority: 70,
  },
  {
    phase: SessionPhase.CODING,
    patterns: [
      /\bclaude\b/i,
      /\bcodex\b/i,
      /\bcursor\b/i,
      /\bcopilot\b/i,
      /\bcodewhisperer\b/i,
      /\baider\b/i,
      /\bgpt-4\b/i,
      /\bopenai\b/i,
      /AI assistant/i,
      /Thinking\.\.\./i,
      /Generating code/i,
    ],
    priority: 60,
  },
];

/**
 * Detect the session phase from terminal output
 * Analyzes the last N lines of output
 */
export function detectPhase(output: string, lastNLines: number = 50): SessionPhase {
  // Get the last N lines
  const lines = output.split('\n');
  const relevantLines = lines.slice(-lastNLines).join('\n');

  let detectedPhase: SessionPhase = SessionPhase.IDLE;
  let highestPriority = -1;

  for (const patternSet of phasePatterns) {
    for (const pattern of patternSet.patterns) {
      if (pattern.test(relevantLines)) {
        if (patternSet.priority > highestPriority) {
          highestPriority = patternSet.priority;
          detectedPhase = patternSet.phase;
        }
        break; // Move to next pattern set
      }
    }
  }

  return detectedPhase;
}

/**
 * Detect phase from a chunk of output (for real-time updates)
 * Returns null if no specific phase is detected
 */
export function detectPhaseFromChunk(chunk: string): SessionPhase | null {
  for (const patternSet of phasePatterns) {
    for (const pattern of patternSet.patterns) {
      if (pattern.test(chunk)) {
        return patternSet.phase;
      }
    }
  }
  return null;
}

/**
 * Check if output indicates the process is waiting for input
 */
export function isWaitingForInput(output: string): boolean {
  const lastLines = output.split('\n').slice(-5).join('\n');
  return phasePatterns
    .find((p) => p.phase === SessionPhase.WAITING)!
    .patterns.some((pattern) => pattern.test(lastLines));
}

/**
 * Check if output indicates an error occurred
 */
export function hasError(output: string): boolean {
  return phasePatterns
    .find((p) => p.phase === SessionPhase.ERROR)!
    .patterns.some((pattern) => pattern.test(output));
}
