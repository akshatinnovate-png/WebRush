/**
 * Barrel for the hook layer.
 *
 * Every hook here is display-agnostic: none of them know about receipts,
 * eras or the constellation. They are the primitives the acts are built from.
 */
export { useReducedMotion } from './useReducedMotion';
export { useMediaQuery } from './useMediaQuery';
export { useSize, type Size } from './useSize';
export { useCanvas } from './useCanvas';
export { useInView } from './useInView';
export { useCountUp } from './useCountUp';
export { useHotkey } from './useHotkey';
export { useData, useDay, useDayIndex } from './useRecord';
export { useTheme } from './useTheme';
