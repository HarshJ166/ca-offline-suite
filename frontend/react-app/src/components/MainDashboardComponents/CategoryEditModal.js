import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import CategoryEditTable from "../MainDashboardComponents/CategoryEditTable";

const CategoryEditModal = ({ open, onOpenChange, caseId }) => {
  const [categoryOptions, setCategoryOptions] = useState(null);
  const [transactionData, setTransactionData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sample entity options
  const categoryOptionsfixed = [
    "Bank Charges",
    "Bank Interest Received",
    "Bonus Paid",
    "Bonus Received",
    "Bounce",
    "Cash Deposits",
    "Cash Reversal",
    "Cash Withdrawal",
    "Closing Balance",
    "Credit Card Payment",
    "Debtor List",
    "Departmental Stores",
    "Donation",
    "Food Expense/Hotel",
    "General Insurance",
    "Gold Loan",
    "GST Paid",
    "Income Tax Paid",
    "Income Tax Refund",
    "Indirect tax",
    "Interest Debit",
    "Interest Received",
    "Investment",
    "Life insurance",
    "Loan",
    "Loan given",
    "Local Cheque Collection",
    "Online Shopping",
    "Opening Balance",
    "Other Expenses",
    "POS-Cr",
    "POS-Dr",
    "Probable Claim Settlement",
    "Property Tax",
    "Provident Fund",
    "Redemption, Dividend & Interest",
    "Refund/Reversal",
    "Rent Paid",
    "Rent Received",
    "Salary Paid",
    "Salary Received",
    "Subscription / Entertainment",
    "TDS Deducted",
    "Total Income Tax Paid",
    "Travelling Expense",
    "UPI-Cr",
    "UPI-Dr",
    "Utility Bills",
  ];

  useEffect(() => {
    setCategoryOptions(categoryOptionsfixed);
  }, []);

  // const handleEntityChange = (transactionId, newEntity) => {
  //   setTransactions(prevTransactions =>
  //     prevTransactions.map(transaction =>
  //       transaction.id === transactionId
  //         ? { ...transaction, entity: newEntity }
  //         : transaction
  //     )
  //   );
  // };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        console.log("Fetching transactions for statementId:", caseId);

        // Add this line to debug the electron call
        console.log("Before electron call");
        const data = await window.electron.getTransactions(caseId);
        console.log("After electron call, received data:", data);

        setTransactionData(data);
      } catch (err) {
        setError("Failed to fetch transactions");
        console.error("Error fetching transactions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (caseId) {
      // Add this check
      fetchTransactions();
    }
  }, [caseId]); // Add caseId to dependency array


  // process epoch date to human readable date in format dd-mm-yyyy
  //   const processDate = (epochDate) => {
  //     const date = new Date(epochDate);
  //     const day = date.getDate();
  //     const month = date.getMonth() + 1;
  //     const year = date.getFullYear();
  //     return `${day}-${month}-${year}`;
  //   };

  //   transactionData2.forEach((transaction) => {
  //     transaction["Value Date"] = processDate(transaction["Value Date"]);
  //     // remove entity month and date
  //     delete transaction["Entity"];
  //     delete transaction["Month"];
  //     delete transaction["Date"];
  //   });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Transactions</DialogTitle>
        </DialogHeader>
        <div className="overflow-auto flex-1">
          <CategoryEditTable
            data={transactionData}
            categoryOptions={categoryOptions}
            setCategoryOptions={setCategoryOptions}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryEditModal;
