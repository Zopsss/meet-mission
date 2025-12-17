import { useEffect, useState, useContext } from "react";
import {
  Animate,
  Card,
  Table,
  useAPI,
  useLocation,
} from "components/lib";

export function WaitlistList() {
  const location = useLocation();
  const path = location?.pathname?.split("/");
  // Route is /event-management/waitlist/:id, so id is at index 3
  const id = path[3];

  const waitlistData = useAPI(`/api/event-management/${id}/waitlist`);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (waitlistData.data) {
      setData(
        waitlistData.data.map((item) => ({
          _id: item._id,
          email: item.user_id?.email,
          first_name: item.user_id?.first_name,
          last_name: item.user_id?.last_name,
          age_group: item.age_group,
          created_at: new Date(item.createdAt).toLocaleDateString(),
        }))
      );
    }
    setLoading(waitlistData.loading);
  }, [waitlistData.data, waitlistData.loading]);

  const downloadCSV = () => {
    if (!data || data.length === 0) return;
    const headers = ["First Name", "Last Name", "Email", "Age Group", "Date"];
    const csvContent = [
      headers.join(","),
      ...data.map((row) => {
        console.log("row: ", row.age_group);
        return [
          row.first_name,
          row.last_name,
          row.email,
          row.age_group,
          row.created_at,
        ].join(",");
      }),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `waitlist_${id}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Animate>
      <Card title="Waitlist">
        <div className="flex justify-end mb-4">
          <button
            onClick={downloadCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Export CSV
          </button>
        </div>
        <Table
          loading={loading}
          data={data}
          show={["first_name", "last_name", "email", "age_group", "created_at"]}
        />
      </Card>
    </Animate>
  );
}
