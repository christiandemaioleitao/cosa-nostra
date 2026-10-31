/**
 * Entrada do bundle client-side do motor: expõe as MESMAS classes do servidor
 * (engine autoritativo + IA dos bots) no navegador, sem reescrever lógica.
 * Build: npx esbuild client/js/engine-entry.js --bundle --format=iife \
 *          --define:process.env.BOT_DELAY_MS='"1200"' \
 *          --outfile=client/js/engine.bundle.js
 */
import { Game } from '../../server/game/engine.js';
import * as bots from '../../server/game/bots.js';
import { FAMILIES } from '../../server/game/data.js';

globalThis.CosaServerGame = { Game, bots, FAMILIES };
