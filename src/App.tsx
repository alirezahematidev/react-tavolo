import "./App.css";
import Tavolo from "./tavolo";

type MockData = {
  id: string;
  name: string;
  age: number;
};

const data: MockData[] = [
  { id: "1", name: "John", age: 30 },
  { id: "2", name: "Jane", age: 25 },
  { id: "3", name: "Bob", age: 35 },
];

function App() {
  return (
    <div>
      <Tavolo<MockData>
        datasource={data}
        rowIdentifier={(item) => item.id}
        expandOptions={{
          render(row) {
            return <div style={{ height: 100, background: "red" }}>{row.name}</div>;
          },
          expandable(row) {
            return row.name.startsWith("J");
          },
          onExpand(rows) {
            console.log(rows);
          },
        }}
      >
        <Tavolo.Column<MockData> dataIndex="name" title="Name" />
        <Tavolo.Column<MockData> dataIndex="age" title="Age" />
      </Tavolo>
    </div>
  );
}

export default App;
