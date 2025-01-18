import React, { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../ui/tabs";
import BarLineChart from "../charts/BarLineChart";
import DataTable from "./TableData";

const Cash = () => {
  const [withdrawalData, setWithdrawalData] = useState([]);
  const [depositData, setDepositData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const withdrawalResponse =
          await window.electron.getTransactionsByCashWithdrawal();
        const depositResponse =
          await window.electron.getTransactionsByCashDeposit();

        // Transform withdrawal data
        const transformedWithdrawalData = withdrawalResponse.map((item) => ({
          date: new Date(item.date * 1000).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          Debit: Math.abs(item.amount) || 0, // Ensure positive value
          Balance: item.balance || 0,
        }));

        // Transform deposit data
        const transformedDepositData = depositResponse.map((item) => ({
          date: new Date(item.date * 1000).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }),
          Credit: item.amount || 0,
          Balance: item.balance || 0,
        }));

        setWithdrawalData(transformedWithdrawalData);
        setDepositData(transformedDepositData);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching cash transactions:", err);
        setError("Failed to fetch transaction data");
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const chartConfig = {
    yAxis: {
      min: 0,
      max: 40000,
      ticks: [0, 9000, 18000, 27000, 36000],
    },
  };

  const columnTypes = {
    Debit: "bar",
    Credit: "bar",
    Balance: "line",
  };

  if (isLoading) {
    return (
      <div className="rounded-xl shadow-sm m-8 mt-2 space-y-6">
        <div className="bg-gray-100 p-4 rounded-md w-full h-[10vh]">
          <p className="text-gray-800 text-center mt-3 font-medium text-lg">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl shadow-sm m-8 mt-2 space-y-6">
        <div className="bg-red-100 p-4 rounded-md w-full h-[10vh]">
          <p className="text-red-800 text-center mt-3 font-medium text-lg">
            {error}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl shadow-sm m-8 mt-2 space-y-6">
      <Tabs defaultValue="withdrawal">
        <TabsList className="grid w-[500px] grid-cols-2 pb-10">
          <TabsTrigger value="withdrawal">Withdrawal</TabsTrigger>
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
        </TabsList>

        <TabsContent value="withdrawal">
          {withdrawalData.length > 0 ? (
            <>
              <div className="mb-6 w-full h-[60vh]">
                <BarLineChart
                  data={withdrawalData}
                  xAxisKey="date"
                  columnTypes={columnTypes}
                  config={chartConfig}
                />
              </div>
              <div>
                <DataTable data={withdrawalData} />
              </div>
            </>
          ) : (
            <div className="text-center text-gray-600 dark:text-gray-400 my-6">
              No withdrawal data available
            </div>
          )}
        </TabsContent>

        <TabsContent value="deposit">
          {depositData.length > 0 ? (
            <>
              <div className="mb-6 w-full h-[60vh]">
                <BarLineChart
                  data={depositData}
                  xAxisKey="date"
                  columnTypes={columnTypes}
                  config={chartConfig}
                />
              </div>
              <div>
                <DataTable data={depositData} />
              </div>
            </>
          ) : (
            <div className="text-center text-gray-600 dark:text-gray-400 my-6">
              No deposit data available
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Cash;
