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
import {
  Eye,
  Plus,
  Trash2,
  Info,
  Search,
  Edit2,
  X,
  CheckCircle,
  Loader2,
} from "lucide-react";
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

import PDFMarkerModal from "./PdfMarkerModal";

const RecentReports = () => {
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
  const [failedDatasOfCurrentReport, setFailedDatasOfCurrentReport] = useState(
    []
  );
  const [selectedFailedFile, setSelectedFailedFile] = useState(null);
  const [isMarkerModalOpen, setIsMarkerModalOpen] = useState(false);
  const [pdfEditLoading, setPdfEditLoading] = useState(false);

  const [reportToDelete, setReportToDelete] = useState(null);

  const handleSubmitEditPdf = async () => {
    setPdfEditLoading(true);
    const allRectified = failedDatasOfCurrentReport.every(
      (statement) => statement.resolved
    );

    if (allRectified) {
      // Call the API to update the statements
      const result = await window.electron.editPdf(
        failedDatasOfCurrentReport,
        currentCaseName
      );
      console.log("aiyaz react result", result);

      toast({
        title: "Success",
        description: "All statements have been rectified.",
        variant: "success",
      });
      setPdfEditLoading(false);
    } else {
      toast({
        title: "Error",
        description: "Please rectify all statements before submitting.",
        variant: "destructive",
      });
      setPdfEditLoading(false);
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const result = await window.electron.getRecentReports();
        console.log({ recentReports: result });
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
      Success:
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
      await window.electron.deleteReport(reportId);
      setRecentReports((prev) =>
        prev.filter((report) => report.id !== reportId)
      );

      toast({
        title: "Success",
        description: "Report deleted successfully.",
        variant: "success",
        className: "bg-white text-black opacity-100 shadow-lg",
      });
    } catch (error) {
      console.error("Error deleting report:", error);
      toast({
        title: "Error",
        description: `Failed to delete the report: ${
          error.message || "Unknown error"
        }`,
        variant: "destructive",
      });
    }
  };

  const handleView = (caseId) => {
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
    setLoading(true);
    const newToastId = toast({
      title: "Initializing Report Generation",
      description: (
        <div className="mt-2 w-full flex items-center gap-2">
          <div className="flex items-center gap-4">
            <CircularProgress className="w-full" />
            {/* <CircularProgress value={0} className="w-full" /> */}
            {/* <span className="text-sm font-medium">0%</span> */}
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
    setIsCategoryEditOpen(!isCategoryEditOpen);
    setCurrentCaseId(id);
  };
  const handleAddReport = (caseName, caseID) => {
    setCurrentCaseName(caseName);
    setCurrentCaseId(caseID);
    setIsAddPdfModalOpen(true);
  };

  const closeModal = () => {
    setIsAddPdfModalOpen(false);
  };

  const handleSaveMarkerData = (data) => {
    // Handle saving marker data here
    console.log("recent reports failed pdf handleSave data:", data);
    setIsMarkerModalOpen(false);
  };

  const handleDetails = async (reportId, reportName) => {
    setIsLoading(true);
    setCurrentCaseName(reportName);

    console.log("Opening recitfy modal for caseId:", reportId, reportName);

    try {
      const failedStatements = await window.electron.getFailedStatements(
        reportId
      );

      console.log("failedStatements", failedStatements);

      // Process failed statements with extensive error checking
      const processedFailedData = failedStatements
        .map((item) => {
          if (!item || !item.data) {
            return null;
          }

          try {
            const parsedData = JSON.parse(item.data);
            console.log("parsedData", parsedData);
            return {
              ...item,
              parsedContent: {
                paths: Array.isArray(parsedData.paths) ? parsedData.paths : [],

                passwords: Array.isArray(parsedData.passwords)
                  ? parsedData.passwords
                  : [],
                startDates: Array.isArray(parsedData.start_dates)
                  ? parsedData.start_dates
                  : [],

                bankName: Array.isArray(parsedData.bank_names)
                  ? parsedData.bank_names
                  : [],
                endDates: Array.isArray(parsedData.end_dates)
                  ? parsedData.end_dates
                  : [],
                columns: Array.isArray(parsedData.respective_list_of_columns)
                  ? parsedData.respective_list_of_columns
                  : [],
                respectiveReasonsForError: Array.isArray(
                  parsedData.respective_reasons_for_error
                )
                  ? parsedData.respective_reasons_for_error
                  : [],
              },
            };
          } catch (parseError) {
            console.error("Failed to parse data:", parseError);
            return null;
          }
        })
        .filter((item) => item !== null); // Remove null entries

      console.log({ processedFailedData });
      const tempFailedDataOfReport = [];
      for (
        let i = 0;
        i < processedFailedData[0].parsedContent.paths.length;
        i++
      ) {
        tempFailedDataOfReport.push({
          caseId: processedFailedData[0].caseId,
          id: processedFailedData[0].id,
          columns: processedFailedData[0].parsedContent.columns[i],
          endDate: processedFailedData[0].parsedContent.endDates[i],
          bankName: processedFailedData[0].parsedContent.bankName[i],
          startDate: processedFailedData[0].parsedContent.startDates[i],
          path: processedFailedData[0].parsedContent.paths[i],
          password: processedFailedData[0].parsedContent.passwords[i],
          resolved: false,
          pdfName: processedFailedData[0].parsedContent.paths[i]
            .split("\\")
            .pop(),
        });
      }

      console.log("tempFailedDataOfReport", tempFailedDataOfReport);

      // remove duplicate entries using pdfName
      const uniqueFailedDataOfReport = tempFailedDataOfReport.filter(
        (thing, index, self) =>
          index === self.findIndex((t) => t.pdfName === thing.pdfName)
      );

      setFailedDatasOfCurrentReport(uniqueFailedDataOfReport);
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

  return (
    <Card>
      <PDFMarkerModal
        isOpen={isMarkerModalOpen}
        onClose={() => setIsMarkerModalOpen(false)}
        // onSave={handleSaveMarkerData}
        selectedFailedFile={selectedFailedFile}
        setFailedDatasOfCurrentReport={setFailedDatasOfCurrentReport}
      />
      <CategoryEditModal
        open={isCategoryEditOpen}
        onOpenChange={toggleEdit}
        caseId={currentCaseId}
      />

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
        {recentReports.length > 0 ? (
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setReportToDelete(report.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white dark:bg-slate-950">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Report</AlertDialogTitle>
                          </AlertDialogHeader>
                          <div className="py-4">
                            Are you sure you want to delete this report? This
                            action cannot be undone.
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <Button
                              variant="destructive"
                              onClick={() => {
                                handleDeleteReport(report.id);
                                setReportToDelete(null);
                              }}
                            >
                              Delete
                            </Button>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-black/5"
                          onClick={() => handleDetails(report.id, report.name)}
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
                          {failedDatasOfCurrentReport &&
                          failedDatasOfCurrentReport.length > 0 ? (
                            <div>
                              {[...failedDatasOfCurrentReport]
                                .sort((a, b) => {
                                  // Sort by hasError (false comes first)
                                  const aHasError =
                                    a.respectiveReasonsForError &&
                                    a.respectiveReasonsForError.length > 0;
                                  const bHasError =
                                    b.respectiveReasonsForError &&
                                    b.respectiveReasonsForError.length > 0;
                                  return aHasError === bHasError
                                    ? 0
                                    : aHasError
                                    ? 1
                                    : -1;
                                })
                                .map((statement, index) => {
                                  const isDone = statement.resolved;
                                  const hasError =
                                    statement.respectiveReasonsForError &&
                                    statement.respectiveReasonsForError.length >
                                      0;

                                  return (
                                    <div
                                      key={index}
                                      className="mb-4 border-b pb-4"
                                    >
                                      <h3 className="font-semibold mb-2">
                                        Failed Statement {index + 1}
                                      </h3>
                                      <div className="flex gap-2 items-center">
                                        <p className="flex-[4.5]">
                                          <strong>File Name:</strong>{" "}
                                          {statement.pdfName}
                                        </p>

                                        {/* Conditionally render the Rectify or Done button */}
                                        {isDone ? (
                                          <Button
                                            size="sm"
                                            disabled
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors"
                                          >
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Done
                                          </Button>
                                        ) : (
                                          <Button
                                            variant="secondary"
                                            size="sm"
                                            className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                                            onClick={() => {
                                              setIsMarkerModalOpen(true);
                                              setSelectedFailedFile(statement);
                                            }}
                                          >
                                            Rectify
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          ) : (
                            <div className="text-center text-green-600 font-semibold">
                              Report Processed Successfully
                            </div>
                          )}
                        </div>
                        <AlertDialogFooter className="border-t border-black/10 pt-6">
                          {/* create a submit button */}
                          {failedDatasOfCurrentReport &&
                            failedDatasOfCurrentReport.length > 0 && (
                              <div className="flex justify-center ">
                                <Button
                                  type="submit"
                                  disabled={pdfEditLoading}
                                  onClick={handleSubmitEditPdf}
                                  className="relative inline-flex items-center px-4 py-2"
                                >
                                  {pdfEditLoading ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      <span>Processing...</span>
                                    </>
                                  ) : (
                                    "Submit"
                                  )}
                                </Button>
                              </div>
                            )}

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
        ) : (
          <div className="text-center text-grey-600 opacity-70 font-semibold">
            No Reports Found
          </div>
        )}
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
      {/* Modal for GenerateReportForm & its changes */}
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
