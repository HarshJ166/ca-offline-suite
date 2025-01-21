import React from "react";
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
import { useState, useEffect } from "react";
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
import GenerateReportForm from "./ReportForm";

const RecentReports = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  // const [currentInfoIndex, setCurrentInfoIndex] = useState(0);
  const [isCategoryEditOpen, setIsCategoryEditOpen] = useState(false);
  const [isAddPdfModalOpen, setIsAddPdfModalOpen] = useState(false);
  const [isFirstInfo, setIsFirstInfo] = useState();
  const [isLastInfo, setIsLastInfo] = useState();
  const itemsPerPage = 10;

  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const result = await window.electron.getRecentReports();
        console.log("Fetched reports:", result);

        const formattedReports = result.map((report) => ({
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
        // toast({ title: "Success", description: "Reports loaded successfully." });
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

  const handleDetails = (statements_length) => {
    console.log("Clicked on details");
    if (statements_length > 0) {
      setIsFirstInfo(true);
      setIsLastInfo(statements_length - 1 === 0);
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
      report.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.id.toLowerCase().includes(searchQuery.toLowerCase())
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

  const handleDeleteReport = (reportName) => {
    setRecentReports(
      recentReports.filter((report) => report.reportName !== reportName)
    );
    if ((recentReports.length - 1) % 10 === 0) {
      if (currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
    toast({
      title: "Report Deleted",
      description: "The report has been removed from your list.",
      variant: "destructive",
    });
  };

  const handleView = (caseId) => {
    console.log("case", caseId);
    console.log({ isLoading });
    setIsLoading(true);
    navigate(`/case-dashboard/${caseId}/defaultTab`);
    setIsLoading(false);
  };

  const toggleEdit = (id) => {
    console.log("Clicked on edit");
    setIsCategoryEditOpen(!isCategoryEditOpen);
  };
  const handleAddReport = () => {
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
                <TableCell>{report.id}</TableCell>
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
                      onClick={() => handleAddReport()}
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
                        onClick={() => handleDetails(report.statements.length)}
                      >
                        <Info className="h-4 w-4 " />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-2xl bg-white shadow-lg border-0 dark:bg-slate-950">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-medium text-black bg-black/[0.03] -mx-6 -mt-6 p-4 border-b border-black/10 dark:bg-slate-900 dark:text-slate-300">
                          Report Information
                        </AlertDialogTitle>
                        <div className="py-6">
                          <h3 className="text-base font-medium text-black dark:text-slate-400">
                            {report.id}
                          </h3>
                          <div className="mt-6 space-y-4 ">
                            {report.statements.map((doc, idx) => (
                              <div
                                key={idx}
                                className="bg-black/[0.02] hover:bg-black/[0.04] transition-colors p-4 rounded-md border border-black/5 dark:bg-slate-800"
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-medium text-black/40 dark:text-white">
                                    Path:
                                  </span>
                                  <span className="text-sm text-black/70 dark:text-white">
                                    {doc.ifscCode}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="border-t border-black/10 pt-6">
                        <div className="flex justify-between w-full gap-3">
                          {/* <Button
                            variant="outline"
                            onClick={() => handlePrevInfo(report.statements.length, index)}
                            disabled={isFirstInfo}
                            className="px-6 bg-transparent border-black/10 text-black/70 hover:bg-black/[0.03] hover:border-black/20 hover:text-black disabled:opacity-30 dark:text-white dark:border-white/10 dark:bg-slate-900"
                          >
                            Previous
                          </Button> */}
                          <AlertDialogCancel className="px-8 bg-black text-white hover:bg-black/90 hover:text-white dark:bg-white dark:text-black">
                            Close
                          </AlertDialogCancel>
                          {/* <Button
                            variant="outline"
                            onClick={() => handleNextInfo(report.statements.length, index)}
                            disabled={isLastInfo}
                            className="px-6 bg-transparent border-black/10 text-black/70 hover:bg-black/[0.03] hover:border-black/20 hover:text-black disabled:opacity-30 dark:text-white dark:border-white/10 dark:bg-slate-900"
                          >
                            Next
                          </Button> */}
                        </div>
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
              <GenerateReportForm source="add pdf" />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default RecentReports;
