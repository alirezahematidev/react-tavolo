import "./App.css";
import Table from "./table";

type MockData = {
  id: string;
  name: string;
  age: number;
};

const data: MockData[] = Array.from({ length: 10 }, (_, i) => ({
  age: i,
  id: i.toString(),
  name: `name-${i}`,
}));

function App() {
  return (
    <div>
      <Table<MockData> data={data} rowIdentifier={(item) => item.id} selectOptions={{ dragAreaSelection: true }}>
        <Table.Column<MockData> dataIndex="name" title="Name" />
        <Table.Column<MockData> dataIndex="age" title="Age" />
      </Table>
    </div>
  );
}

export default App;
