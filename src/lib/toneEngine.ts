'use client';

// Centralized entrypoint that re-exports the modular engine implementations
import * as Engines from './engines';

export const toneSynthEngine = Engines.toneSynthEngine;
export const toneDrumMachine = Engines.toneDrumMachine;
export const toneBassEngine = Engines.toneBassEngine;
export const toneKeysEngine = Engines.toneKeysEngine;
export const toneFXEngine = Engines.toneFXEngine;
export const toneVocalEngine = Engines.toneVocalEngine;

export default {
  toneSynthEngine,
  toneDrumMachine,
  toneBassEngine,
  toneKeysEngine,
  toneFXEngine,
  toneVocalEngine,
};
