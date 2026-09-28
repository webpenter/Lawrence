import * as migration_20260928_072248_lawrence_initial from './20260928_072248_lawrence_initial';

export const migrations = [
  {
    up: migration_20260928_072248_lawrence_initial.up,
    down: migration_20260928_072248_lawrence_initial.down,
    name: '20260928_072248_lawrence_initial'
  },
];
