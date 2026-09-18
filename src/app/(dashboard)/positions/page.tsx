import { PositionList } from "./_components/PositionList";

export const metadata = {
  title: "Positions | FoundersEdge",
  description: "Manage open positions and recruitment requirements",
};

export default function PositionsPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PositionList />
    </div>
  );
}
