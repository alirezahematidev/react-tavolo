import { version } from "../package.json";

export interface ColumnProps<T extends object> {
  title: string;
  dataIndex: keyof T;
  width?: number;
  align?: "start" | "center" | "end";
  render?: (record: T, rowIndex: number) => React.ReactNode;
}

function Column$<T extends object>(_props: ColumnProps<T>) {
  return null;
}

const v = version.split(".")[0];

Object.defineProperty(Column$, "$$", { value: `__tavolo__V${v}`, enumerable: false, writable: false });

export { Column$ };
