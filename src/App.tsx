import "./App.css";
import Table from "./table";

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
      <Table<MockData> data={data} rowIdentifier={(item) => item.id}>
        <Table.Column<MockData> dataIndex="name" title="Name" />
        <Table.Column<MockData> dataIndex="age" title="Age" />
      </Table>
    </div>
  );
}

export default App;
