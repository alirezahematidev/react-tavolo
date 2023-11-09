import { signal } from "@preact/signals-react";

const table$ = { rows: signal<any[]>([]), page: signal<number>(1) };

export { table$ };
