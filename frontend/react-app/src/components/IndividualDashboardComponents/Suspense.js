import React, { useState, useEffect } from "react";
import HorizontalBarChart from "../charts/HorizontalBarChart";
import SuspensePieChart from "../charts/SuspensePieChart";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import DataTable from "./TableData";

const Suspense = () => {
  const [creditData, setCreditData] = useState([]);
  const [debitData, setDebitData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch both credit and debit data
        const creditTransactions =
          await window.electron.getTransactionsBySuspenseCredit();
        const debitTransactions =
          await window.electron.getTransactionsBySuspenseDebit();

        // Transform credit data
        const transformedCreditData = creditTransactions.map((item) => ({
          date: new Date(item.date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          Description: item.description,
          Credit: item.amount,
        }));

        // Transform debit data
        const transformedDebitData = debitTransactions.map((item) => ({
          date: new Date(item.date).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          Description: item.description,
          Debit: item.amount,
        }));

        setCreditData(transformedCreditData);
        setDebitData(transformedDebitData);
      } catch (error) {
        console.error("Error fetching suspense data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Chart configuration
  const chartConfig = {
    yAxis: {
      type: "String",
      ticks: ["Credit", "Debit"],
    },
    xAxis: {
      type: "Number",
      ticks: [0, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000],
    },
  };

  if (isLoading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="rounded-xl shadow-sm m-8 mt-2 bg-white space-y-6 dark:bg-slate-950">
      <Tabs defaultValue="credit">
        <TabsList className="grid w-[500px] grid-cols-2 pb-10">
          <TabsTrigger value="credit">Credit</TabsTrigger>
          <TabsTrigger value="debit">Debit</TabsTrigger>
        </TabsList>

        <TabsContent value="credit">
          <div className="grid grid-rows-[60vh_auto] gap-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="w-full h-full">
                <HorizontalBarChart
                  data={creditData}
                  title="Suspense Credit Chart"
                  xAxisKey="Description"
                  yAxisKey="Credit"
                  config={chartConfig}
                />
              </div>
              <div className="w-full h-full">
                <SuspensePieChart
                  data={creditData}
                  title="Suspense Credit Chart"
                />
              </div>
            </div>
            <div>
              <DataTable data={creditData} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="debit">
          <div className="grid grid-rows-[60vh_auto] gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="w-full h-full">
                <HorizontalBarChart
                  data={debitData}
                  title="Suspense Debit Chart"
                  xAxisKey="Description"
                  yAxisKey="Debit"
                  config={chartConfig}
                />
              </div>
              <div className="w-full h-full">
                <SuspensePieChart
                  data={debitData}
                  title="Suspense Debit Chart"
                />
              </div>
            </div>
            <div>
              <DataTable data={debitData} />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Suspense;
