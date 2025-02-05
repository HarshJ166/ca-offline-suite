import React, {useState, useEffect}from "react";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import RecentReports from "./RecentReports";
import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "../theme-provider";

import StatsMetricCard from "../Elements/StatsCard";

const MainDashboard = () => {
  
  const { theme, setTheme } = useTheme();

  const notifications = [
    {
      id: 1,
      title: "New Message",
      message: "You have a new message from the team.",
      time: "5m ago",
    },
    {
      id: 2,
      title: "Report Ready",
      message: "Your report is ready to download.",
      time: "10m ago",
    },
    {
      id: 3,
      title: "Update Available",
      message: "A new version is available.",
      time: "1h ago",
    },
  ];
  const [totalReports, setTotalReports] = useState(0);
  const [totalStatements, setTotalStatements] = useState(0);
  const [reportChartData, setReportChartData] = useState([]);
  const [statementChartData, setStatementChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reportStatus, setReportStatus] = useState({ success: 0, failed: 0 });

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const reports = await window.electron.getReportsProcessed();
        const statements = await window.electron.getStatementsProcessed();

        // Process reports status
        const reportSuccessCount = reports.statusCounts?.success|| 0;
        const reportFailedCount = reports.statusCounts?.failed || 0;
        

        console.log("reportSuccessCount", reportSuccessCount);
        console.log("reportFailedCount", reportFailedCount);

        // Process reports dates
        const reportData = reports.caseDates?.map(date => ({
          month: new Date(date).toLocaleString('default', { month: 'short' }),
          value: 1
        })) || [];
  
        // Group by month and sum values
        const reportsByMonth = reportData.reduce((acc, curr) => {
          const existing = acc.find(item => item.month === curr.month);
          if (existing) {
            existing.value += curr.value;
          } else {
            acc.push({ ...curr });
          }
          return acc;
        }, []);
  
        // Process statement dates
        const statementData = statements.statementDates?.map(date => ({
          month: new Date(date).toLocaleString('default', { month: 'short' }),
          value: 1
        })) || [];
  
        // Group by month and sum values
        const statementsByMonth = statementData.reduce((acc, curr) => {
          const existing = acc.find(item => item.month === curr.month);
          if (existing) {
            existing.value += curr.value;
          } else {
            acc.push({ ...curr });
          }
          return acc;
        }, []);

        setTotalReports(reports.totalCount || 0);
        setTotalStatements(statements.totalCount || 0);
        setReportChartData(reportsByMonth);
        setStatementChartData(statementsByMonth);
        setReportStatus({
          success: reportSuccessCount,
          failed: reportFailedCount
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchDashboardData();
  }, []);

  return (
    <ScrollArea className="h-full">
      <div className="p-8 pt-0 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight dark:text-slate-300">
              Cyphersol
            </h2>
            <p className="text-muted-foreground">
            Analytics Dashboard : 1.0.1-alpha , the update has been successfull
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-600 rounded-full" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[380px]">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="flex flex-col items-start p-4"
                  >
                    <div className="flex justify-between w-full">
                      <span className="font-medium">{notification.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {notification.time}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          <StatsMetricCard
            type="reports"
            title="Monthly Reports"
            mainValue={totalReports}
            mainValueLabel="Reports Generated"
            percentageChange={15}
            bottomStats={[
              { label: "Success", value: reportStatus.success },
              { label: "Failed", value: reportStatus.failed },
            ]}
            // chartData={[
            //   { month: "Jan", value: 30 },
            //   { month: "Feb", value: 50 },
            //   { month: "Mar", value: 40 },
            // ]}
            chartData={reportChartData}
            chartType="bar"
          />
          <StatsMetricCard
            type="statements"
            title="Monthly Statements"
            mainValue={totalStatements}
            mainValueLabel="Statements Processed"
            percentageChange={10}
            bottomStats={[
              { label: "Success", value: "-" },
              { label: "Failed", value: "-" },
            ]}
            // chartData={[
            //   { month: "Jan", value: 120 },
            //   { month: "Feb", value: 200 },
            //   { month: "Mar", value: 180 },
            //   { month: "Apr", value: 250 },
            // ]}
            chartData={statementChartData}
            chartType="line"
          />
          <StatsMetricCard
            type="timeSaved"
            title="Time Saved"
            mainValue="-"
            mainValueLabel="Minutes Saved"
            percentageChange={25}
            breakdownData={[
              { label: "Manual Processing", value: "- mins" },
              { label: "Automation", value: "- mins" },
              { label: "Optimization", value: "- mins" },
            ]}
            bottomStats={[
              { label: "Average Time Saved/Day", value: "- mins" },
              { label: "Peak Savings", value: "- mins" },
            ]}
          />
        </div>

        {/* <MetricCard {...timeMetric} /> */}

        {/* Recent reports */}
        <RecentReports />
        {/* <Card>
              <CardHeader>
                <CardTitle>Analytics Overview</CardTitle>
                <CardDescription>Report generation trends over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ReportChart chartData={dummyChartData} viewType={chartViewType} />
              </CardContent>
            </Card> */}
      </div>
    </ScrollArea>
  );
};

export default MainDashboard;
