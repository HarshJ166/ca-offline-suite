import React, { useState, useMemo, useEffect } from "react";
import PieCharts from "../charts/PieCharts";
import TableData from "./TableData"; // Reusing the existing component
import { Card, CardHeader, CardTitle } from "../ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Maximize2, Minimize2 } from "lucide-react";
import ToggleStrip from "./ToggleStrip";
import { Button } from "../ui/button";

const MaximizableChart = ({ children, title, isMaximized, setIsMaximized }) => {
  const toggleMaximize = () => setIsMaximized(!isMaximized);

  if (isMaximized) {
    return (
      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent className="max-w-[100vw] w-[70vw] max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 w-full overflow-hidden">{children}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="w-full md:w-1/2 lg:w-1/3 p-2">
      <Card className="h-full">
        <CardHeader className="relative">
          <CardTitle className="dark:text-slate-300">{title}</CardTitle>
          <button
            onClick={toggleMaximize}
            className="absolute top-1 right-3 p-1 rounded-lg bg-slate-100 dark:bg-slate-800"
          >
            {isMaximized ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </CardHeader>
        {children}
      </Card>
    </div>
  );
};

const Summary = ({ caseId }) => {
  const [activeTable, setActiveTable] = useState("Income Receipts");
  const [summaryData, setSummaryData] = useState({
    "Income Receipts": [],
    "Important Expenses": [],
    "Other Expenses": [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const { "Income Receipts": incomeReceipts, "Important Expenses": importantExpenses, "Other Expenses": otherExpenses } = summaryData;
  const [incomeMaximized, setIncomeMaximized] = useState(false);
  const [importantExpensesMaximized, setImportantExpensesMaximized] = useState(false);
  const [otherExpensesMaximized, setOtherExpensesMaximized] = useState(false);

  useEffect(() => {
    const fetchSummaryData = async () => {
      if (!caseId) return;

      try {
        console.log("Fetching summary data for caseId:", caseId);
        const result = await window.electron.getSummary(caseId);
        const parsedData = result.length > 0 ? JSON.parse(result[0].data) : {};

        setSummaryData({
          "Income Receipts": parsedData.incomeReceipts || [],
          "Important Expenses": parsedData.importantExpenses || [],
          "Other Expenses": parsedData.otherExpenses || [],
        });
      } catch (error) {
        console.error("Error fetching summary data:", error);
        setError(error);
        setSummaryData({
          "Income Receipts": [],
          "Important Expenses": [],
          "Other Expenses": [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (caseId) fetchSummaryData();
  }, [caseId]);

  const monthOrder = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const [selectedMonths, setSelectedMonths] = useState([]);
  const months = useMemo(() => {
    const allMonths = new Set();
    [incomeReceipts, importantExpenses, otherExpenses].forEach((category) => {
      category.forEach((item) => {
        Object.keys(item).forEach((key) => {
          if (!["Total", "Income / Receipts", "Important Expenses / Payments", "Other Expenses / Payments"].includes(key)) {
            allMonths.add(key);
          }
        });
      });
    });

    return Array.from(allMonths).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  }, [incomeReceipts, importantExpenses, otherExpenses]);

  useEffect(() => {
    if (months.length > 0) {
      setSelectedMonths(months);
    }
  }, [months]);

  const transformData = (data, valueKey, nameKey, excludeName) => {
    if (selectedMonths.length === 0) {
      return data
        .filter((item) => item[nameKey] !== excludeName)
        .map((item) => ({
          name: item[nameKey],
          value: Number(parseFloat(item[valueKey] || 0).toFixed(2)),
        }))
        .filter((item) => item.value > 0);
    }

    return data
      .filter((item) => item[nameKey] !== excludeName)
      .map((item) => ({
        name: item[nameKey],
        value: Number(
          selectedMonths.reduce((sum, month) => sum + parseFloat(item[month] || 0), 0).toFixed(2)
        ),
      }))
      .filter((item) => item.value > 0);
  };

  const incomeData = transformData(incomeReceipts, "Total", "Income / Receipts", "Total Credit");
  const importantExpensesData = transformData(
    importantExpenses,
    "Total",
    "Important Expenses / Payments",
    "Total"
  );
  const otherExpensesData = transformData(
    otherExpenses,
    "Total",
    "Other Expenses / Payments",
    "Total Debit"
  );

  const renderChart = (data, title, isMaximized, setIsMaximized, tableType) => {
    return (
      <MaximizableChart
        title={title}
        isMaximized={isMaximized}
        setIsMaximized={setIsMaximized}
      >
        <div className="w-full p-4">
          {data.length > 0 ? (
            <>
            <PieCharts
              data={data}
              title=""
              valueKey="value"
              nameKey="name"
              showLegends={isMaximized}
            />
            {!isMaximized && (
              <Button
                onClick={() => setActiveTable(tableType)}
                variant={activeTable === tableType ? "default" : "outline"}
                className={`mt-4 w-full ${
                  activeTable === tableType ? "dark:bg-slate-300" : ""
                }`}
              >
                View Table
              </Button>
            )}
            </>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-gray-500 dark:text-gray-400">No Data Available</p>
            </div>
          )}
        </div>
      </MaximizableChart>
    );
  };

  return (
    <div className="bg-white rounded-lg space-y-6 m-8 mt-2 dark:bg-slate-950 w-[80vw]">
      {/* <ToggleStrip
        columns={months}
        selectedColumns={selectedMonths}
        setSelectedColumns={setSelectedMonths}
      />
      {selectedMonths.length === 0 ? (
        <div className="text-center text-gray-600 dark:text-gray-400 my-6">
          Select months to display the graphs
        </div>
      ) : (
        <> */}
          <div className="flex flex-wrap -mx-2">
          {renderChart(incomeData, "Income Receipts", incomeMaximized, setIncomeMaximized, "Income Receipts")}
          {renderChart(importantExpensesData, "Important Expenses", importantExpensesMaximized, setImportantExpensesMaximized, "Important Expenses")}
          {renderChart(otherExpensesData, "Other Expenses", otherExpensesMaximized, setOtherExpensesMaximized, "Other Expenses")}
          </div>
          {activeTable && (
            <TableData
              source="summary"
              data={
                activeTable === "Income Receipts"
                  ? incomeReceipts
                  : activeTable === "Important Expenses"
                  ? importantExpenses
                  : otherExpenses
              }
              title={activeTable}
              categoryKey={
                activeTable === "Income Receipts"
                  ? "Income / Receipts"
                  : activeTable === "Important Expenses"
                  ? "Important Expenses / Payments"
                  : "Other Expenses / Payments"
              }
            />
          )}
        {/* </>
      )} */}
    </div>
  );
};

export default Summary;
