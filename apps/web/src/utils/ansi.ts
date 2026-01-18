// Strip ANSI escape codes from terminal output
export function stripAnsi(text: string): string {
  return text
    // Standard CSI sequences: ESC [ ... letter
    .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
    // CSI sequences ending with ~
    .replace(/\x1b\[[0-9;]*~/g, '')
    // OSC sequences: ESC ] ... (BEL or ESC \)
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)?/g, '')
    // DCS/SOS/PM/APC: ESC P/X/^/_ ... ESC \
    .replace(/\x1b[PX^_][^\x1b]*(?:\x1b\\)?/g, '')
    // Two-character sequences: ESC + single char
    .replace(/\x1b[()#][A-Z0-9]/gi, '')
    .replace(/\x1b[NOcn78=><]/g, '')
    // Catch-all for any remaining ESC sequences
    .replace(/\x1b[^[\]PX^_\x1b].{0,2}/g, '')
    .replace(/\x1b./g, '')

    // Handle sequences where ESC (\x1b) was already stripped or encoded differently
    // This catches [?2026h, [?2026l, [?1004h, [?2004h, etc.
    .replace(/\[\?[0-9;]*[hlsurm]/gi, '')
    // CSI-like sequences without ESC: [0m, [1;31m, [2J, etc.
    .replace(/\[[0-9;]*[ABCDEFGHJKSTfhlmnsu]/g, '')
    // Clear/erase sequences
    .replace(/\[[0-9]*[JK]/g, '')
    // Cursor sequences
    .replace(/\[[0-9;]*[Hf]/g, '')
    // SGR (color) sequences without ESC
    .replace(/\[[0-9;]*m/g, '')
    // Bracketed paste and focus sequences
    .replace(/\[<[uU]/g, '')
    .replace(/\[[<>][0-9;]*[mMuU]/g, '')

    // OSC without ESC: ]0;title (BEL)
    .replace(/\]\d+;[^\n\x07]*(?:\x07)?/g, '')

    // Control characters (except \n \r \t)
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '');
}
