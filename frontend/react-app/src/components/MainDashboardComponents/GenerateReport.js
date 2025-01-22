import React, { useState } from "react";
import {
  Bell,
} from "lucide-react";
import GenerateReportForm from "../Elements/ReportForm";
import RecentReports from "./RecentReports";
import { CircularProgress } from "../ui/circularprogress";

export default function GenerateReport() {
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleSubmit = async (setProgress, setLoading, setToastId, selectedFiles, fileDetails, setSelectedFiles, setFileDetails, setCaseId, toast, progressIntervalRef, simulateProgress, convertDateFormat, caseName) => {
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
            <CircularProgress value={0} className="w-full" />
            <span className="text-sm font-medium">0%</span>
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
            ca_id: caseName,
          };
        })
      );

      const result = await window.electron.generateReportIpc({
        files: filesWithContent,
      });

      if (result.success) {
        clearInterval(progressIntervalRef.current);
        setProgress(100);
        toast.dismiss(newToastId);
        toast({
          title: "Success",
          description: "Report generated successfully!",
          duration: 3000,
        });

        // const newCaseId = generateNewCaseId();
        // setCaseId(newCaseId);

        setSelectedFiles([]);
        setFileDetails([]);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Report generation failed:", error);
      clearInterval(progressIntervalRef.current);
      toast.dismiss(newToastId);
      setProgress(0);
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setLoading(false);
      progressIntervalRef.current = null;
    }
  };


  const notifications = [
    { id: 1, message: "You have a new message." },
    { id: 2, message: "Your report is ready to download." },
    { id: 3, message: "New comment on your post." },
  ];

  return (
    <div className="p-8 pt-0 space-y-8 bg-white dark:bg-black min-h-screen">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight dark:text-slate-300">
          Report Generator
        </h2>
        <div className="flex items-center space-x-4">
          {/* <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reports..."
              className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div> */}
          {/* <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 
                     text-gray-600 dark:text-gray-300"
          >
            {darkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button> */}
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
                          border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
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
        <GenerateReportForm handleReportSubmit={handleSubmit} />
      </div>

      {/* Recent reports */}
      <RecentReports />
    </div>
  );
}
