import { ClientList } from "./_components/ClientList";

export const metadata = {
  title: "Clients | FoundersEdge",
};

export default function ClientsPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <ClientList />
    </div>
  );
}
