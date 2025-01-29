import React, { useState, useCallback } from "react";
import { Bell, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import GenerateReportForm from "../Elements/ReportForm";
import RecentReports from "./RecentReports";
import { CircularProgress } from "../ui/circularprogress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog"; // Import shadcn/ui Dialog components
import { Button } from "../ui/button"; // Import shadcn/ui Button component
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation

export default function GenerateReport() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false); // State to control Dialog visibility
  const [failedStatements, setFailedStatements] = useState([]); // State to store failed statements
  const [caseId, setCaseId] = useState(null); // State to store caseId
  const navigate = useNavigate(); // Hook for navigation

  const handleSubmit = async (
    setProgress,
    setLoading,
    setToastId,
    selectedFiles,
    fileDetails,
    setSelectedFiles,
    setFileDetails,
    setCaseId,
    toast,
    progressIntervalRef,
    simulateProgress,
    convertDateFormat,
    caseId,
    caseName
  ) => {
    if (caseName === "") {
      toast({
        title: "Error",
        description: "Please enter a Case Name",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    const newToastId = toast({
      title: "Initializing Report Generation",
      description: (
        <div className="mt-2 w-full flex flex-col gap-2">
          <div className="flex items-center gap-4">
            <CircularProgress className="w-full" />
            {/* <span className="text-sm font-medium">0%</span> */}
//             <CircularProgress value={0} className="w-full" />
          </div>
          <p className="text-sm text-gray-500">Preparing to process files...</p>
        </div>
      ),
      duration: Infinity,
    });
    setToastId(newToastId);

    progressIntervalRef.current = simulateProgress();

    try {
      const filesWithContent = await Promise.all(
        selectedFiles.map(async (file, index) => {
          const fileContent = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsBinaryString(file);
          });

          const detail = fileDetails[index];

          return {
            fileContent,
            pdf_paths: file.name,
            bankName: detail.bankName,
            passwords: detail.password || "",
            start_date: convertDateFormat(detail.start_date), // Convert date format
            end_date: convertDateFormat(detail.end_date), // Convert date format
            ca_id: caseId,
          };
        })
      );

      const result = await window.electron.generateReportIpc(
        {
          files: filesWithContent,
        },
        caseName
      );
      // console.log("result", result.ca_id);

      if (result.success) {
        clearInterval(progressIntervalRef.current);
        setProgress(100);
        toast.dismiss(newToastId);
        toast({
          title: "Success",
          description: "Report generated successfully!",
          duration: 3000,
        });

        setFailedStatements(result.pdf_paths_not_extracted || []); // Store failed 
        setCaseId(result.caseId); // Store caseId
        setDialogOpen(true); // Open the Dialog

        setSelectedFiles([]);
        setFileDetails([]);

        // Trigger a page refresh
        refreshPage();
      } else {
        const errorMessage = result.error
          ? typeof result.error === "object"
            ? JSON.stringify(result.error, null, 2)
            : result.error
          : "Unknown error occurred";

        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Report generation failed:", error.message);

      if (typeof error === "object" && error !== null) {
        console.error("Detailed error:", JSON.stringify(error, null, 2));
      }

      if (error && error.message) {
        console.error("Error message:", error.message);
      }

      if (error && error.stack) {
        console.error("Error stack trace:", error.stack);
      }

      clearInterval(progressIntervalRef.current);
      toast.dismiss(newToastId);
      setProgress(0);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
        duration: 5000,
      });
      refreshPage();
    } finally {
      setLoading(false);
      refreshPage();
      progressIntervalRef.current = null;
    }
  };
  const viewAnalysis = (caseId) => {
    console.log("View Analysis clicked");
    navigate(`/case-dashboard/${caseId}/:defaultTab`);
  };
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const notifications = [
    { id: 1, message: "You have a new message." },
    { id: 2, message: "Your report is ready to download." },
    { id: 3, message: "New comment on your post." },
  ];

  // Function to trigger refresh
  const refreshPage = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  return (
    <div className="p-8 pt-0 space-y-8 bg-white dark:bg-black min-h-screen">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight dark:text-slate-300">
          Report Generator
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                     text-gray-600 dark:text-gray-300"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {notificationsOpen && (
            <div
              className="absolute right-14 mt-48 w-64 bg-white dark:bg-gray-800 
                          border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm z-50" // Reduced shadow
            >
              <ul className="max-h-60 overflow-y-auto p-2 space-y-2">
                {notifications.map((notification) => (
                  <li
                    key={notification.id}
                    className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 
                             dark:hover:bg-gray-700 rounded-lg"
                  >
                    {notification.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div>
        <GenerateReportForm
          key={refreshTrigger}
          handleReportSubmit={handleSubmit}
          onReportGenerated={refreshPage}
        />
      </div>

      <RecentReports key={refreshTrigger} />

      {/* Dialog for successful report generation */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Generated Successfully!</DialogTitle>
            <DialogDescription>
              Your report has been generated successfully.
              {failedStatements.length === 0 ? (
                <CheckCircle className="text-green-500 w-6 h-6 mt-2" />
              ) : failedStatements.length > 0 ? (
                <AlertTriangle className="text-yellow-500 w-6 h-6 mt-2" />
              ) : (
                <XCircle className="text-red-500 w-6 h-6 mt-2" />
              )}
            </DialogDescription>
          </DialogHeader>
          {failedStatements.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold">Failed Statements:</h3>
              <ul className="list-disc pl-5">
                {failedStatements.map((statement, index) => (
                  <li key={index}>{statement}</li>
                ))}
              </ul>
            </div>
          )}
          <Button
            onClick={() => viewAnalysis(caseId)}
            className="w-full"
          >
            View Analysis
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}