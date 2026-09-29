import * as migration_20260929_030235_lawrence_initial from './20260929_030235_lawrence_initial';

export const migrations = [
  {
    up: migration_20260929_030235_lawrence_initial.up,
    down: migration_20260929_030235_lawrence_initial.down,
    name: '20260929_030235_lawrence_initial'
  },
];
