import "./App.css";
import Table from "./table";

type MockData = {
  id: string;
  name: string;
  age: number;
  lastname: string;
  firstname: string;
  company: string;
};

const data: MockData[] = Array.from({ length: 10 }, (_, i) => ({
  age: i,
  id: i.toString(),
  name: `name-${i}`,
  lastname: `name-${i}`,
  firstname: `name-${i}`,
  company: `name-${i}`,
}));

function App() {
  return (
    <div style={{ width: 600, overflow: "hidden" }}>
      <Table<MockData> data={data} rowIdentifier={(item) => item.id}>
        <Table.Column<MockData> dataIndex="name" title="Name" width={200} fixed />
        <Table.Column<MockData> dataIndex="age" title="Age" width={200} />
        <Table.Column<MockData> dataIndex="firstname" title="Firstname" />
        <Table.Column<MockData> dataIndex="lastname" title="Lastname" />
        <Table.Column<MockData> dataIndex="lastname" title="Lastname" />
        <Table.Column<MockData> dataIndex="lastname" title="Lastname" />
        <Table.Column<MockData> dataIndex="lastname" title="Lastname" />
        <Table.Column<MockData> dataIndex="lastname" title="Lastname" fixed />
      </Table>
    </div>
  );
}

export default App;
