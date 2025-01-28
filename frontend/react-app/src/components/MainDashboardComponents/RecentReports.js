import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useToast } from "../../hooks/use-toast";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { useNavigate } from "react-router-dom";
import { Eye, Plus, Trash2, Info, Search, Edit2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import CategoryEditModal from "./CategoryEditModal";
import GenerateReportForm from "../Elements/ReportForm";
import { CircularProgress } from "../ui/circularprogress";

const RecentReports = ({ key }) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCategoryEditOpen, setIsCategoryEditOpen] = useState(false);
  const [isAddPdfModalOpen, setIsAddPdfModalOpen] = useState(false);
  const itemsPerPage = 10;
  const [currentCaseName, setCurrentCaseName] = useState("");
  const [currentCaseId, setCurrentCaseId] = useState("");
  const [recentReports, setRecentReports] = useState([]);
  const [selectedReportFailedData, setSelectedReportFailedData] = useState(null);

  const [isFirstInfo, setIsFirstInfo] = useState(true);
  const [isLastInfo, setIsLastInfo] = useState(false);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const result = await window.electron.getRecentReports();
        const formattedReports = result
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .map((report) => ({
            ...report,
            createdAt: new Date(report.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }),
            statements: report.statements.map((statement) => ({
              ...statement,
              createdAt: new Date(statement.createdAt).toLocaleDateString(
                "en-GB",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }
              ),
            })),
          }));

        setRecentReports(formattedReports);
      } catch (error) {
        toast({
          title: "Error",
          description: `Failed to load reports: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);
  const handleDetails = async (reportId) => {
    setIsLoading(true);
  
    try {
      const failedStatements = await window.electron.getFailedStatements(reportId);
      
      // Process failed statements with extensive error checking
      const processedFailedData = failedStatements.map(item => {
        if (!item || !item.data) {
          return null;
        }

        try {
          const parsedData = JSON.parse(item.data);
          return {
            ...item,
            parsedContent: {
              paths: Array.isArray(parsedData.paths) ? parsedData.paths : [],
              passwords: Array.isArray(parsedData.passwords) ? parsedData.passwords : [],
              startDates: Array.isArray(parsedData.start_dates) ? parsedData.start_dates : [],
              endDates: Array.isArray(parsedData.end_dates) ? parsedData.end_dates : [],
              columns: Array.isArray(parsedData.respective_list_of_columns) 
                ? parsedData.respective_list_of_columns 
                : []
            }
          };
        } catch (parseError) {
          console.error('Failed to parse data:', parseError);
          return null;
        }
      }).filter(item => item !== null); // Remove null entries

      setSelectedReportFailedData(processedFailedData);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to load details: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handlePrevInfo = (statements_length, currentInfoIndex) => {
    console.log(
      "Clicked on prev",
      "statements_length",
      statements_length,
      "currentInfoIndex",
      currentInfoIndex
    );

    if (currentInfoIndex === 0) {
      setIsFirstInfo(true);
    }

    if (currentInfoIndex < statements_length - 1) {
      setIsLastInfo(false);
    }
  };

  const handleNextInfo = (statements_length, currentInfoIndex) => {
    console.log(
      "Clicked on next",
      "statements_length",
      statements_length,
      "currentInfoIndex",
      currentInfoIndex
    );

    if (currentInfoIndex === statements_length - 1) {
      setIsLastInfo(true);
    }
    if (currentInfoIndex > 0) {
      setIsFirstInfo(false);
    }
  };

  // Filter reports based on search query
  const filteredReports = recentReports.filter(
    (report) =>
      report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredReports.length / itemsPerPage);
  const currentReports = filteredReports.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total pages are less than or equal to maxVisiblePages
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);

      // Show current page and surrounding pages
      if (currentPage > 2) {
        pageNumbers.push("ellipsis");
      }

      if (currentPage !== 1 && currentPage !== totalPages) {
        pageNumbers.push(currentPage);
      }

      if (currentPage < totalPages - 1) {
        pageNumbers.push("ellipsis");
      }

      // Always show last page
      pageNumbers.push(totalPages);
    }

    return pageNumbers;
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const StatusBadge = ({ status }) => {
    const variants = {
      Completed:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      "In Progress":
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      Failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
    };

    return (
      <Badge
        variant="outline"
        className={cn("px-2.5 py-0.5 text-xs font-semibold", variants[status])}
      >
        {status}
      </Badge>
    );
  };

  // const handleAddReport = () => {
  //     console.log('Clicked on add report');
  // };

  const handleDeleteReport = async (reportId) => {
    try {
      // Optimistically update the state before confirming deletion
      const updatedReports = recentReports.filter(
        (report) => report.id !== reportId
      );
      setRecentReports(updatedReports);

      // Call the API to delete the report
      await window.electron.deleteReport(reportId);

      toast({
        title: "Success",
        description: "Report deleted successfully.",
        variant: "success",
      });
    } catch (error) {
      // Roll back the state if the deletion fails
      setRecentReports((prev) => [
        ...prev,
        recentReports.find((r) => r.id === reportId),
      ]);
      toast({
        title: "Error",
        description: `Failed to delete the report: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleView = (caseId) => {
    console.log("case", caseId);
    console.log({ isLoading });
    setIsLoading(true);
    navigate(`/case-dashboard/${caseId}/defaultTab`);
    setIsLoading(false);
  };

  const handleAddPdfSubmit = async (
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
    if (selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one file",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    console.log("CASEEEE IDDDDD : ", caseId);
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
            ca_id: "test",
          };
        })
      );

      const result = await window.electron.addPdfIpc(
        {
          files: filesWithContent,
        },
        currentCaseId
      );

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
        setIsAddPdfModalOpen(false);
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

  const toggleEdit = (id) => {
    console.log("Clicked on edit");
    setIsCategoryEditOpen(!isCategoryEditOpen);
  };
  const handleAddReport = (caseName, caseID) => {
    console.log("Case name clicked on add report:", caseName);
    setCurrentCaseName(caseName);
    setCurrentCaseId(caseID);
    setIsAddPdfModalOpen(true);
  };

  const closeModal = () => {
    setIsAddPdfModalOpen(false);
  };

  return (
    <Card>
      <CategoryEditModal open={isCategoryEditOpen} onOpenChange={toggleEdit} />

      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Recent Reports</CardTitle>
            <CardDescription className="py-3">
              A list of recent reports from all projects
            </CardDescription>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reports..."
              className="pl-10 w-[400px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="align-">
              <TableHead>Date</TableHead>
              <TableHead>Report Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
              <TableHead>Details</TableHead>
              {/* <TableHead>Details</TableHead> */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentReports.map((report, index) => (
              <TableRow key={report.id}>
                <TableCell>{report.createdAt}</TableCell>
                <TableCell>{report.name}</TableCell>
                <TableCell>
                  <StatusBadge status={report.status} />
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleView(report.id)}
                      className="h-8 w-8"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleAddReport(report.name, report.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => toggleEdit(report.id)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDeleteReport(report.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-black/5"
              onClick={() => handleDetails(report.id)}
            >
              <Info className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-2xl bg-white shadow-lg border-0 dark:bg-slate-950">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-medium text-black bg-black/[0.03] -mx-6 -mt-6 p-4 border-b border-black/10 dark:bg-slate-900 dark:text-slate-300">
                Report Details
              </AlertDialogTitle>
            </AlertDialogHeader>
            <div className="p-6 overflow-auto max-h-[400px]">
              {selectedReportFailedData && selectedReportFailedData.some(item => item.parsedContent && (
                item.parsedContent.paths.length > 0 || 
                item.parsedContent.passwords.length > 0 || 
                item.parsedContent.startDates.length > 0 || 
                item.parsedContent.endDates.length > 0 || 
                (item.parsedContent.columns && item.parsedContent.columns.length > 0)
              )) ? (
                <div>
                  {selectedReportFailedData.map((failedItem, index) => (
                    <div key={index} className="mb-4 border-b pb-4">
                      <h3 className="font-semibold mb-2">Failed Statement {index + 1}</h3>
                      {failedItem.parsedContent ? (
                        <div>
                          <p><strong>Paths:</strong> {failedItem.parsedContent.paths.length > 0 ? failedItem.parsedContent.paths.join(', ') : 'N/A'}</p>
                          <p><strong>Passwords:</strong> {failedItem.parsedContent.passwords.length > 0 ? failedItem.parsedContent.passwords.join(', ') : 'N/A'}</p>
                          <p><strong>Start Dates:</strong> {failedItem.parsedContent.startDates.length > 0 ? failedItem.parsedContent.startDates.join(', ') : 'N/A'}</p>
                          <p><strong>End Dates:</strong> {failedItem.parsedContent.endDates.length > 0 ? failedItem.parsedContent.endDates.join(', ') : 'N/A'}</p>
                          {failedItem.parsedContent.columns && failedItem.parsedContent.columns.length > 0 && (
                            <p><strong>Columns:</strong> {failedItem.parsedContent.columns[0].join(', ')}</p>
                          )}
                        </div>
                      ) : (
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(failedItem, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-green-600 font-semibold">
                  Report Processed Successfully
                </div>
              )}
            </div>
            <AlertDialogFooter className="border-t border-black/10 pt-6">
              <AlertDialogCancel className="px-8 bg-black text-white hover:bg-black/90 hover:text-white dark:bg-white dark:text-black">
                Close
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>

              </TableRow>
            ))}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(currentPage - 1)}
                    className={cn(
                      "cursor-pointer",
                      currentPage === 1 && "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>

                {getPageNumbers().map((pageNumber, index) => (
                  <PaginationItem key={index}>
                    {pageNumber === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => handlePageChange(pageNumber)}
                        isActive={currentPage === pageNumber}
                        className="cursor-pointer"
                      >
                        {pageNumber}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                    className={cn(
                      "cursor-pointer",
                      currentPage === totalPages &&
                        "pointer-events-none opacity-50"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
      {/* Modal for GenerateReportForm */}
      {isAddPdfModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full p-6">
            <header className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                Add Additional Statements
              </h2>
              <button
                onClick={closeModal}
                className="text-2xl text-gray-500 hover:text-gray-700"
              >
                <X />
              </button>
            </header>
            <div className="mt-4">
              <GenerateReportForm
                source="add pdf"
                handleReportSubmit={handleAddPdfSubmit}
                currentCaseName={currentCaseName}
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default RecentReports;
