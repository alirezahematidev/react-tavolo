import { TableContext } from ".";
import { Datasource, TableContextParams } from "../types/table.types";

interface InternalProviderProps<T extends Datasource> extends TableContextParams<T> {
  children: React.ReactNode;
}

const InternalProvider = <T extends Datasource>({ children, ...value }: InternalProviderProps<T>) => {
  return <TableContext.Provider value={value}>{children}</TableContext.Provider>;
};

export { InternalProvider };
