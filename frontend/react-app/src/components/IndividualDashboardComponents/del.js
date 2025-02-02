import React, { useState, useEffect } from "react";
import { Search, Loader2, Check } from "lucide-react";
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
  TableFooter,
} from "../ui/table";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../ui/pagination";
import { Label } from "../ui/label";

const DataTable = ({ data = [], source, title, subtitle }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredData, setFilteredData] = useState(data);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [currentFilterColumn, setCurrentFilterColumn] = useState(null);
  const [numericFilterModalOpen, setNumericFilterModalOpen] = useState(false);
  const [currentNumericColumn, setCurrentNumericColumn] = useState(null);
  const [minValue, setMinValue] = useState("");
  const [maxValue, setMaxValue] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showAllRows, setShowAllRows] = useState(false);

  // === NEW STATE FOR ENTITY EDITING ===
  // Keep track of any per-row edits for the "Entity" field.
  const [editedEntities, setEditedEntities] = useState({});
  // Keep track of rows (by global index) that have been selected for batch editing.
  const [selectedRows, setSelectedRows] = useState([]);
  // Batch edit modal state:
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchEntityValue, setBatchEntityValue] = useState("");

  // Get dynamic columns from first data item
  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  // Determine if one of the columns is "Entity"
  const hasEntity = columns.some(
    (column) => column.toLowerCase() === "entity"
  );

  // Determine which columns are numeric
  const numericColumns = columns.filter((column) =>
    data.some((row) => {
      const value = String(row[column]);
      return !isNaN(parseFloat(value)) && !value.includes("-");
    })
  );

  useEffect(() => {
    setFilteredData(data);
  }, [data]);

  const handleSearch = (searchValue) => {
    setSearchTerm(searchValue);
    if (searchValue === "") {
      setFilteredData(data);
      setCurrentPage(1);
      return;
    }

    // Calculate totals for numeric columns
    const totals = numericColumns.reduce((acc, column) => {
      const total = filteredData.reduce((sum, row) => {
        const value = parseFloat(String(row[column]).replace(/,/g, ""));
        return !isNaN(value) ? sum + value : sum;
      }, 0);
      return {
        ...acc,
        [column]: total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      };
    }, {});

    const columnsToReplace = ["amount", "balance", "debit", "credit"];
    const filtered = filteredData.filter((row) =>
      Object.entries(row).some(([key, value]) => {
        if (columnsToReplace.includes(key)) {
          return String(value)
            .replace(/,/g, "")
            .toLowerCase()
            .includes(searchValue.toLowerCase());
        }
        return String(value).toLowerCase().includes(searchValue.toLowerCase());
      })
    );

    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const handleCategorySelect = (category) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((cat) => cat !== category)
        : [...prev, category]
    );
  };

  const handleSelectAll = () => {
    const visibleCategories = getFilteredUniqueValues(currentFilterColumn);
    const allSelected = visibleCategories.every((cat) =>
      selectedCategories.includes(cat)
    );
    setSelectedCategories(allSelected ? [] : visibleCategories);
  };

  const handleColumnFilter = () => {
    if (selectedCategories.length === 0) {
      setFilteredData(data);
    } else {
      const filtered = data.filter((row) =>
        selectedCategories.includes(String(row[currentFilterColumn]))
      );
      setFilteredData(filtered);
    }
    setCurrentPage(1);
    setFilterModalOpen(false);
  };

  const handleNumericFilter = (columnName, min, max) => {
    const filtered = data.filter((row) => {
      const value = parseFloat(row[columnName]);
      if (isNaN(value)) return false;
      const meetsMin = min === "" || value >= parseFloat(min);
      const meetsMax = max === "" || value <= parseFloat(max);
      return meetsMin && meetsMax;
    });
    setFilteredData(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilteredData(data);
    setCurrentPage(1);
    setMinValue("");
    setMaxValue("");
    setSelectedCategories([]);
    setCategorySearchTerm("");
  };

  const getUniqueValues = (columnName) => {
    return [...new Set(data.map((row) => String(row[columnName])))];
  };

  const getFilteredUniqueValues = (columnName) => {
    const uniqueValues = getUniqueValues(columnName);
    if (!categorySearchTerm) return uniqueValues;
    return uniqueValues.filter((value) =>
      value.toLowerCase().includes(categorySearchTerm.toLowerCase())
    );
  };

  // Pagination calculations
  const totalPages = showAllRows
    ? 1
    : Math.ceil(filteredData.length / rowsPerPage);
  const startIndex = showAllRows ? 0 : (currentPage - 1) * rowsPerPage;
  const endIndex = showAllRows
    ? filteredData.length
    : startIndex + rowsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      pageNumbers.push(1);
      if (currentPage > 2) {
        pageNumbers.push("ellipsis");
      }
      if (currentPage !== 1 && currentPage !== totalPages) {
        pageNumbers.push(currentPage);
      }
      if (currentPage < totalPages - 1) {
        pageNumbers.push("ellipsis");
      }
      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  };

  // Calculate totals for numeric columns
  const totals = numericColumns.reduce((acc, column) => {
    const total = filteredData.reduce((sum, row) => {
      const value = parseFloat(row[column]);
      return !isNaN(value) ? sum + value : sum;
    }, 0);
    return { ...acc, [column]: total.toFixed(2) };
  }, {});

  // ===== Helper functions for inline & batch "Entity" editing =====

// Called when the user changes an "Entity" field inline.
  const handleEntityChange = (globalIndex, originalValue, newValue) => {
    setEditedEntities((prev) => ({ ...prev, [globalIndex]: newValue }));
  };

  // Called when the user clicks the check mark next to an inline "Entity" input.
  const handleEntityUpdateConfirm = (globalIndex, row) => {
    const newValue = editedEntities[globalIndex];
    if (
      window.confirm(
        "Are you sure you want to update the Entity for this transaction?"
      )
    ) {
      // Replace this console.log with your backend update call.
      console.log("Updating row", row, "to new entity:", newValue);
      // (e.g., updateEntityBackend(row, newValue);)

      // Clear the edit state for this row.
      setEditedEntities((prev) => {
        const newState = { ...prev };
        delete newState[globalIndex];
        return newState;
      });
    }
  };

  // Toggle selection for a given row (identified by its global index).
  const toggleRowSelection = (globalIndex) => {
    setSelectedRows((prev) => {
      if (prev.includes(globalIndex)) {
        return prev.filter((index) => index !== globalIndex);
      } else {
        return [...prev, globalIndex];
      }
    });
  };

  // Toggle select–all for the rows in the current page.
  const handleSelectAllRows = () => {
    const currentGlobalIndices = currentData.map((row, i) =>
      showAllRows ? i : startIndex + i
    );
    const allSelected = currentGlobalIndices.every((index) =>
      selectedRows.includes(index)
    );
    if (allSelected) {
      // Deselect all current page rows.
      setSelectedRows((prev) =>
        prev.filter((index) => !currentGlobalIndices.includes(index))
      );
    } else {
      // Add any missing indices.
      setSelectedRows((prev) =>
        Array.from(new Set([...prev, ...currentGlobalIndices]))
      );
    }
  };

  // Called when the user confirms a batch update from the modal.
  const handleBatchUpdate = () => {
    if (!batchEntityValue) return;
    if (
      window.confirm(
        "Are you sure you want to update the Entity for the selected transactions?"
      )
    ) {
      // For each selected row, find the row in filteredData (using its global index)
      selectedRows.forEach((globalIndex) => {
        const row = filteredData[globalIndex];
        // Replace this console.log with your backend call.
        console.log("Batch updating row", row, "to new entity:", batchEntityValue);
        // (e.g., updateEntityBackend(row, batchEntityValue);)
      });
      // Clear selections and close the modal.
      setSelectedRows([]);
      setBatchEntityValue("");
      setBatchModalOpen(false);
    }
  };

  // ===== Table rendering =====

  // If source is "LIFO" or "FIFO", render a different table.
  if (source === "LIFO" || source === "FIFO") {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-medium dark:text-slate-300">
                {source} Transaction
              </CardTitle>
              <CardDescription className="text-sm">
                View and manage your data
              </CardDescription>
            </div>
            <div className="relative flex items-center gap-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-10 w-[400px] text-sm"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <Button
                variant="default"
                className="text-sm"
                onClick={() => clearFilters()}
              >
                Clear Filters
              </Button>
              {/* Batch Edit Button (only if the "Entity" column exists) */}
              {hasEntity && (
                <Button
                  variant="default"
                  className="ml-2 text-sm"
                  disabled={selectedRows.length === 0}
                  onClick={() => setBatchModalOpen(true)}
                >
                  Batch Edit Entities
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-center text-sm">
              No data available for {source}.
            </div>
          ) : (
            <div className="relative">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    {/* Render selection column header if "Entity" exists */}
                    {hasEntity && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={currentData.every((_, i) =>
                            selectedRows.includes(
                              showAllRows ? i : startIndex + i
                            )
                          )}
                          onChange={handleSelectAllRows}
                        />
                      </TableHead>
                    )}
                    {columns.map((column) => (
                      <TableHead key={column} className="text-base">
                        <div className="flex items-center gap-2">
                          {column.charAt(0).toUpperCase() +
                            column.slice(1).toLowerCase()}
                          {column.toLowerCase() !== "description" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                if (numericColumns.includes(column)) {
                                  setCurrentNumericColumn(column);
                                  setNumericFilterModalOpen(true);
                                } else {
                                  setCurrentFilterColumn(column);
                                  setSelectedCategories([]);
                                  setCategorySearchTerm("");
                                  setFilterModalOpen(true);
                                }
                              }}
                            >
                              ▼
                            </Button>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={hasEntity ? columns.length + 1 : columns.length}
                        className="text-center text-sm"
                      >
                        No matching results found
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentData.map((row, i) => {
                      const globalIndex = showAllRows ? i : startIndex + i;
                      return (
                        <TableRow key={globalIndex}>
                          {/* Selection checkbox cell */}
                          {hasEntity && (
                            <TableCell className="w-10">
                              <Checkbox
                                checked={selectedRows.includes(globalIndex)}
                                onChange={() => toggleRowSelection(globalIndex)}
                              />
                            </TableCell>
                          )}
                          {columns.map((column) => {
                            if (column.toLowerCase() === "entity") {
                              return (
                                <TableCell
                                  key={column}
                                  className="max-w-[200px] relative"
                                >
                                  <div className="flex items-center">
                                    <Input
                                      type="text"
                                      value={
                                        editedEntities[globalIndex] !== undefined
                                          ? editedEntities[globalIndex]
                                          : row[column]
                                      }
                                      onChange={(e) =>
                                        handleEntityChange(
                                          globalIndex,
                                          row[column],
                                          e.target.value
                                        )
                                      }
                                      className="w-full"
                                    />
                                    {editedEntities[globalIndex] !== undefined &&
                                      editedEntities[globalIndex] !== row[column] && (
                                        <Check
                                          className="ml-2 cursor-pointer text-green-500"
                                          onClick={() =>
                                            handleEntityUpdateConfirm(
                                              globalIndex,
                                              row
                                            )
                                          }
                                        />
                                      )}
                                  </div>
                                </TableCell>
                              );
                            } else if (column.toLowerCase() === "description") {
                              return (
                                <TableCell
                                  key={column}
                                  className="max-w-[200px] relative group text-[15px]"
                                >
                                  <div className="truncate">{row[column]}</div>
                                  <div className="absolute left-0 top-10 hidden group-hover:block bg-black text-white text-xs rounded p-2 z-50 whitespace-normal min-w-[200px] max-w-[400px]">
                                    {row[column]}
                                  </div>
                                </TableCell>
                              );
                            } else {
                              return (
                                <TableCell
                                  key={column}
                                  className="max-w-[200px] relative text-[15px]"
                                >
                                  <div>{row[column]}</div>
                                </TableCell>
                              );
                            }
                          })}
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Total</TableCell>
                    {columns.slice(1).map((column) => (
                      <TableCell key={column}>
                        {numericColumns.includes(column) ? totals[column] : ""}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(prev - 1, 1))
                      }
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
                          onClick={() => setCurrentPage(pageNumber)}
                          isActive={currentPage === pageNumber}
                          className="cursor-pointer text-sm"
                        >
                          {pageNumber}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((prev) =>
                          Math.min(prev + 1, totalPages)
                        )
                      }
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
        {/* Batch Edit Modal */}
        {batchModalOpen && (
          <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Batch Update Entities</DialogTitle>
                <p className="text-sm text-gray-600">
                  Enter new Entity value for selected transactions:
                </p>
              </DialogHeader>
              <Input
                type="text"
                placeholder="New Entity value"
                value={batchEntityValue}
                onChange={(e) => setBatchEntityValue(e.target.value)}
                className="mb-4"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setBatchModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="default" onClick={handleBatchUpdate}>
                  Confirm
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex items-center justify-center">
            <Loader2 className="animate-spin h-8 w-8 text-[#3498db]" />
          </div>
        )}
      </Card>
    );
  }

  // ---- Non-LIFO/FIFO table rendering ----
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <CardTitle className="dark:text-slate-300">
              {title || "Data Table"}
            </CardTitle>
            <CardDescription>
              {subtitle || "View and manage your data"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center gap-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-10 w-[300px]"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              <select
                className="p-2 border rounded-md text-sm dark:bg-slate-800 dark:border-slate-700 w-[120px]"
                value={showAllRows ? "all" : rowsPerPage}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "all") {
                    setShowAllRows(true);
                    setCurrentPage(1);
                  } else {
                    setShowAllRows(false);
                    setRowsPerPage(Number(value));
                    setCurrentPage(1);
                  }
                }}
              >
                <option value="5">5 rows</option>
                <option value="10">10 rows</option>
                <option value="20">20 rows</option>
                <option value="50">50 rows</option>
                <option value="100">100 rows</option>
                <option value="all">Show all</option>
              </select>
              <Button
                className="dark:bg-slate-300 dark:hover:bg-slate-200"
                variant="default"
                onClick={() => clearFilters()}
              >
                Clear Filters
              </Button>
              {/* Batch Edit Button */}
              {hasEntity && (
                <Button
                  variant="default"
                  className="ml-2"
                  disabled={selectedRows.length === 0}
                  onClick={() => setBatchModalOpen(true)}
                >
                  Batch Edit Entities
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Selection header cell */}
                {hasEntity && (
                  <TableHead className="w-10">
                    <Checkbox
                      checked={currentData.every((_, i) =>
                        selectedRows.includes(showAllRows ? i : startIndex + i)
                      )}
                      onChange={handleSelectAllRows}
                    />
                  </TableHead>
                )}
                {columns.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {column.charAt(0).toUpperCase() +
                        column.slice(1).toLowerCase()}
                      {column.toLowerCase() !== "description" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            if (numericColumns.includes(column)) {
                              setCurrentNumericColumn(column);
                              setNumericFilterModalOpen(true);
                            } else {
                              setCurrentFilterColumn(column);
                              setSelectedCategories([]);
                              setCategorySearchTerm("");
                              setFilterModalOpen(true);
                            }
                          }}
                        >
                          ▼
                        </Button>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={hasEntity ? columns.length + 1 : columns.length}
                    className="text-center"
                  >
                    No matching results found
                  </TableCell>
                </TableRow>
              ) : (
                currentData.map((row, i) => {
                  const globalIndex = showAllRows ? i : startIndex + i;
                  return (
                    <TableRow key={globalIndex}>
                      {/* Selection checkbox cell */}
                      {hasEntity && (
                        <TableCell className="w-10">
                          <Checkbox
                            checked={selectedRows.includes(globalIndex)}
                            onChange={() => toggleRowSelection(globalIndex)}
                          />
                        </TableCell>
                      )}
                      {columns.map((column) => {
                        if (column.toLowerCase() === "entity") {
                          return (
                            <TableCell
                              key={column}
                              className="max-w-[200px] relative"
                            >
                              <div className="flex items-center">
                                <Input
                                  type="text"
                                  value={
                                    editedEntities[globalIndex] !== undefined
                                      ? editedEntities[globalIndex]
                                      : row[column]
                                  }
                                  onChange={(e) =>
                                    handleEntityChange(
                                      globalIndex,
                                      row[column],
                                      e.target.value
                                    )
                                  }
                                  className="w-full"
                                />
                                {editedEntities[globalIndex] !== undefined &&
                                  editedEntities[globalIndex] !== row[column] && (
                                    <Check
                                      className="ml-2 cursor-pointer text-green-500"
                                      onClick={() =>
                                        handleEntityUpdateConfirm(
                                          globalIndex,
                                          row
                                        )
                                      }
                                    />
                                  )}
                              </div>
                            </TableCell>
                          );
                        } else if (column.toLowerCase() === "description") {
                          return (
                            <TableCell
                              key={column}
                              className="max-w-[200px] group relative"
                            >
                              <div className="truncate">{row[column]}</div>
                              <div className="absolute left-0 top-10 hidden group-hover:block bg-black text-white text-sm rounded p-2 z-50 whitespace-normal min-w-[200px] max-w-[400px]">
                                {row[column]}
                              </div>
                            </TableCell>
                          );
                        } else {
                          return (
                            <TableCell key={column} className="max-w-[200px]">
                              <div>{row[column]}</div>
                            </TableCell>
                          );
                        }
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                {columns.slice(1).map((column) => (
                  <TableCell key={column}>
                    {numericColumns.includes(column) ? totals[column] : ""}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          </Table>
        </div>

        {/* Pagination */}
        {!showAllRows && totalPages > 1 && (
          <div className="mt-6">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
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
                        onClick={() => setCurrentPage(pageNumber)}
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
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
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

      {/* Batch Edit Modal */}
      {batchModalOpen && (
        <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Batch Update Entities</DialogTitle>
              <p className="text-sm text-gray-600">
                Enter new Entity value for selected transactions:
              </p>
            </DialogHeader>
            <Input
              type="text"
              placeholder="New Entity value"
              value={batchEntityValue}
              onChange={(e) => setBatchEntityValue(e.target.value)}
              className="mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setBatchModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleBatchUpdate}>
                Confirm
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};

export default DataTable;
